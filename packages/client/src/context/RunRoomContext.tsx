import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    ResponseBody,
    InputRequestData,
    ModelInvocationData,
    Reply,
    RunData,
    SocketEvents,
    SpeechData,
} from '../../../shared/src/types/trpc';
import { useSocket } from './SocketContext';

import { useParams, useLocation } from 'react-router-dom';
import {
    AudioBlock,
    ContentBlocks,
} from '../../../shared/src/types/messageForm';
import {
    SpanData,
    TraceData,
    TraceStatus,
} from '../../../shared/src/types/trace';
import { getTimeDifferenceNano } from '../../../shared/src/utils/timeUtils';
import { ProjectNotFoundPage } from '../pages/DefaultPage';
import { useMessageApi } from './MessageApiContext.tsx';

/**
 * Speech state for each reply.
 * Tracks audio data, playback status, and user preferences.
 */
export interface ReplySpeechState {
    /** Full accumulated audio data (base64 string) */
    fullAudioData: string;
    /** Media type of the audio (e.g., "audio/pcm") */
    mediaType: string;
    /** Whether audio is currently playing */
    isPlaying: boolean;
    /** Whether still receiving streaming data */
    isStreaming: boolean;
}

/**
 * Record of speech states keyed by reply ID.
 * Uses Record instead of Map for better React change detection.
 */
export type SpeechStatesRecord = Record<string, ReplySpeechState>;

interface RunRoomContextType {
    replies: Reply[];
    trace: TraceData | null;
    spans: SpanData[];
    inputRequests: InputRequestData[];
    runData: RunData | null;
    runId: string;
    modelInvocationData: ModelInvocationData | null;
    sendUserInputToServer: (
        requestId: string,
        blocksInput: ContentBlocks,
        structuredInput: Record<string, unknown> | null,
    ) => void;
    /** Speech states for each reply (keyed by replyId) */
    speechStates: SpeechStatesRecord;
    /** Play audio for a specific reply */
    playSpeech: (replyId: string) => void;
    /** Stop/pause audio for a specific reply */
    stopSpeech: (replyId: string) => void;
    /** Set playback rate for all replies */
    setPlaybackRate: (rate: number) => void;
    /** Set volume for all replies */
    setVolume: (volume: number) => void;
    /** Global playback rate for all messages */
    globalPlaybackRate: number;
    /** Global volume for all messages */
    globalVolume: number;
    /** Automatically play speech */
    autoPlayNext: boolean;
    /** Set automatically play speech */
    setAutoPlayNext: (value: boolean) => void;
}

const RunRoomContext = createContext<RunRoomContextType | null>(null);

interface Props {
    children: ReactNode;
}

const calculateTraceData = (spans: SpanData[]) => {
    if (!spans.length) return null;

    // Find earliest start time and latest end time by comparing nanosecond timestamps directly
    const startTimes = spans.map((span) => parseInt(span.startTimeUnixNano));
    const endTimes = spans.map((span) => parseInt(span.endTimeUnixNano));

    const earliestStartNano = Math.min(...startTimes);
    const latestEndNano = Math.max(...endTimes);

    // Convert to Date objects for display
    const earliestStart = new Date(earliestStartNano / 1000000).toISOString();
    const latestEnd = new Date(latestEndNano / 1000000).toISOString();

    const status = spans.some((span) => span.status.code === 2) // ERROR status code
        ? TraceStatus.ERROR
        : TraceStatus.OK;

    // Calculate duration directly from nanosecond timestamps
    const durationNano = getTimeDifferenceNano(
        earliestStartNano,
        latestEndNano,
    );

    const data = {
        startTime: earliestStart,
        endTime: latestEnd,
        duration: durationNano,
        status: status,
    };
    return data;
};

export function RunRoomContextProvider({ children }: Props) {
    const { runId } = useParams<{ runId: string }>();
    const { messageApi } = useMessageApi();
    const location = useLocation();
    const socket = useSocket();
    const roomName = `run-${runId}`;
    const [replies, setReplies] = useState<Reply[]>([]);

    const [spans, setSpans] = useState<SpanData[]>([]);
    const [trace, setTrace] = useState<TraceData | null>(null);

    const [inputRequests, setInputRequests] = useState<InputRequestData[]>([]);
    const [runData, setRunData] = useState<RunData | null>(null);
    const [modelInvocationData, setModelInvocationData] =
        useState<ModelInvocationData | null>(null);

    // Speech state management - use Record for better React change detection
    const [speechStates, setSpeechStates] = useState<SpeechStatesRecord>({});
    // Global playback settings for all messages
    const globalPlaybackRateRef = useRef<number>(1.0);
    const globalVolumeRef = useRef<number>(1.0);
    const [globalPlaybackRate, setGlobalPlaybackRate] = useState<number>(1.0);
    const [globalVolume, setGlobalVolume] = useState<number>(1.0);
    const audioContextRef = useRef<AudioContext | null>(null);
    // Store current playing audio source for each reply (for streaming)
    const currentSourceRef = useRef<
        Record<string, AudioBufferSourceNode | null>
    >({});
    // Store HTML Audio elements for replay (supports preservesPitch)
    const audioElementRef = useRef<Record<string, HTMLAudioElement | null>>({});
    // Store gain nodes for volume control for each reply
    const gainNodeRef = useRef<Record<string, GainNode | null>>({});
    // Store WAV blob URLs for replay with Audio element
    const wavBlobUrlRef = useRef<Record<string, string | null>>({});
    // Timer for detecting streaming end
    const streamingEndTimeoutRef = useRef<
        Record<string, NodeJS.Timeout | null>
    >({});
    // Track already processed data length for incremental playback
    const processedLengthRef = useRef<Record<string, number>>({});
    // Audio queue for each reply
    const audioQueueRef = useRef<Record<string, string[]>>({});
    // Track if queue is being processed
    const isProcessingQueueRef = useRef<Record<string, boolean>>({});
    // Add auto-playing next speech
    const [autoPlayNext, setAutoPlayNext] = useState<boolean>(true);
    // The ReplyId that was just played in the message list
    const currentReplyIdRef = useRef<string>('');
    const repliesRef = useRef<Reply[]>([]);
    const speechStatesRef = useRef<SpeechStatesRecord>({});
    const autoPlayNextRef = useRef<boolean>(autoPlayNext);

    useEffect(() => {
        repliesRef.current = replies;
        speechStatesRef.current = speechStates;
    }, [replies, speechStates]);

    // Update refs when global state changes
    useEffect(() => {
        globalPlaybackRateRef.current = globalPlaybackRate;
        globalVolumeRef.current = globalVolume;
        autoPlayNextRef.current = autoPlayNext;
    }, [globalPlaybackRate, globalVolume, autoPlayNext]);

    const inputRequestsRef = useRef<InputRequestData[]>([]);
    useEffect(() => {
        inputRequestsRef.current = inputRequests;
    }, [inputRequests]);

    const stopAllSpeech = () => {
        // Stop all playing audio
        Object.keys(speechStatesRef.current).forEach((replyId) => {
            stopSpeech(replyId);
        });

        // Clean up all audio resources
        Object.keys(audioElementRef.current).forEach((replyId) => {
            if (audioElementRef.current[replyId]) {
                audioElementRef.current[replyId]!.pause();
                audioElementRef.current[replyId] = null;
            }
        });

        // Stop all audio sources
        Object.keys(currentSourceRef.current).forEach((replyId) => {
            if (currentSourceRef.current[replyId]) {
                try {
                    currentSourceRef.current[replyId]!.stop();
                } catch {
                    // Ignore errors if already stopped
                }
                currentSourceRef.current[replyId] = null;
            }
        });

        // Clean up WAV blob URLs
        Object.keys(wavBlobUrlRef.current).forEach((replyId) => {
            if (wavBlobUrlRef.current[replyId]) {
                URL.revokeObjectURL(wavBlobUrlRef.current[replyId]!);
                wavBlobUrlRef.current[replyId] = null;
            }
        });

        // Suspend AudioContext
        if (
            audioContextRef.current &&
            audioContextRef.current.state !== 'closed'
        ) {
            try {
                audioContextRef.current.close();
            } catch (error) {
                console.error('Error closing AudioContext:', error);
            }
            audioContextRef.current = null;
        }
    };
    // Cleanup effect - stops all playing audio when component unmounts or route changes
    useEffect(() => {
        return () => {
            currentReplyIdRef.current = '';
            stopAllSpeech();
        };
    }, [location.pathname]); // Trigger cleanup when path changes
    // Initialize AudioContext on first user interaction
    const ensureAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    // Convert base64 PCM data to WAV blob URL (for HTML Audio element playback with preservesPitch)
    const createWavBlobUrl = useCallback(
        (base64Data: string): string | null => {
            try {
                // Decode base64 to binary
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                // PCM parameters
                const sampleRate = 24000;
                const numChannels = 1;
                const bitsPerSample = 16;
                const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
                const blockAlign = numChannels * (bitsPerSample / 8);
                const dataSize = bytes.length;

                // Create WAV header
                const headerSize = 44;
                const wavBuffer = new ArrayBuffer(headerSize + dataSize);
                const view = new DataView(wavBuffer);

                // RIFF header
                const writeString = (offset: number, str: string) => {
                    for (let i = 0; i < str.length; i++) {
                        view.setUint8(offset + i, str.charCodeAt(i));
                    }
                };

                writeString(0, 'RIFF');
                view.setUint32(4, 36 + dataSize, true);
                writeString(8, 'WAVE');

                // fmt chunk
                writeString(12, 'fmt ');
                view.setUint32(16, 16, true); // fmt chunk size
                view.setUint16(20, 1, true); // audio format (PCM)
                view.setUint16(22, numChannels, true);
                view.setUint32(24, sampleRate, true);
                view.setUint32(28, byteRate, true);
                view.setUint16(32, blockAlign, true);
                view.setUint16(34, bitsPerSample, true);

                // data chunk
                writeString(36, 'data');
                view.setUint32(40, dataSize, true);

                // Copy PCM data
                const wavBytes = new Uint8Array(wavBuffer);
                wavBytes.set(bytes, headerSize);

                // Create blob and URL
                const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                return URL.createObjectURL(blob);
            } catch (error) {
                console.error('Error creating WAV blob URL:', error);
                return null;
            }
        },
        [],
    );

    // Decode base64 PCM to AudioBuffer
    const decodeAudioData = useCallback(
        (base64Data: string): AudioBuffer | null => {
            try {
                const audioContext = ensureAudioContext();

                // Decode base64 to binary
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                // Convert to 16-bit PCM samples
                const samples = new Int16Array(bytes.buffer);
                const floatSamples = new Float32Array(samples.length);
                for (let i = 0; i < samples.length; i++) {
                    floatSamples[i] = samples[i] / 32768.0;
                }

                // Create audio buffer
                const audioBuffer = audioContext.createBuffer(
                    1,
                    floatSamples.length,
                    24000,
                );
                audioBuffer.getChannelData(0).set(floatSamples);

                return audioBuffer;
            } catch (error) {
                console.error('Error decoding audio:', error);
                return null;
            }
        },
        [ensureAudioContext],
    );

    // Get or create gain node for a reply
    const getOrCreateGainNode = useCallback(
        (replyId: string, audioContext: AudioContext): GainNode => {
            if (!gainNodeRef.current[replyId]) {
                const gainNode = audioContext.createGain();
                gainNode.connect(audioContext.destination);
                gainNodeRef.current[replyId] = gainNode;

                // Set initial volume from settings ref
                gainNode.gain.value = globalVolumeRef.current;
            }
            return gainNodeRef.current[replyId]!;
        },
        [],
    );

    // Play a single audio chunk and return a promise
    const playAudioChunk = useCallback(
        (base64Data: string, replyId: string): Promise<void> => {
            return new Promise((resolve) => {
                try {
                    const audioBuffer = decodeAudioData(base64Data);
                    if (!audioBuffer) {
                        resolve();
                        return;
                    }

                    const audioContext = ensureAudioContext();
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;

                    // Get playback rate from settings ref (avoids stale closure)
                    // const settings = playbackSettingsRef.current[replyId];
                    // const playbackRate = settings?.playbackRate ?? 1.0;
                    source.playbackRate.value = globalPlaybackRateRef.current;

                    // Connect through gain node for volume control
                    const gainNode = getOrCreateGainNode(replyId, audioContext);
                    source.connect(gainNode);

                    currentSourceRef.current[replyId] = source;

                    source.onended = () => {
                        currentSourceRef.current[replyId] = null;
                        resolve();
                    };

                    source.start(0);
                } catch (error) {
                    console.error('Error playing audio chunk:', error);
                    resolve();
                }
            });
        },
        [decodeAudioData, ensureAudioContext, getOrCreateGainNode],
    );
    // Play next speech in the sequence
    const playNextSpeech = (currentReplyId: string) => {
        if (!autoPlayNextRef.current) return;
        const currentReplies = repliesRef.current;
        const currentSpeechStates = speechStatesRef.current;
        // Find current reply in the replies array
        const currentIndex = currentReplies.findIndex(
            (reply) => reply.replyId === currentReplyId,
        );
        if (currentIndex === -1) return;
        // Find the next reply with speech to play
        for (let i = currentIndex + 1; i < currentReplies.length; i++) {
            const nextReply = currentReplies[i];
            const hasSpeech = nextReply.messages.some(
                (msg) =>
                    msg.speech &&
                    msg.speech.length > 0 &&
                    msg.speech.some((block) => block.source?.type === 'base64'),
            );

            if (hasSpeech) {
                // Check if the reply has completed audio data
                const speechState = currentSpeechStates[nextReply.replyId];
                if (speechState && !speechState.isPlaying) {
                    playSpeech(nextReply.replyId);
                    return;
                }
            }
        }
    };
    // Process audio queue for a reply
    const processAudioQueue = useCallback(
        async (replyId: string) => {
            if (isProcessingQueueRef.current[replyId]) return;

            const queue = audioQueueRef.current[replyId] || [];
            if (queue.length === 0) return;

            isProcessingQueueRef.current[replyId] = true;

            setSpeechStates((prev) => {
                const state = prev[replyId];
                if (state) {
                    return {
                        ...prev,
                        [replyId]: {
                            ...state,
                            isPlaying: true,
                            isStreaming: true,
                        },
                    };
                }
                return prev;
            });

            while (queue.length > 0) {
                const chunk = queue.shift()!;
                await playAudioChunk(chunk, replyId);
            }

            isProcessingQueueRef.current[replyId] = false;

            let isStillStreaming = speechStates[replyId]?.isStreaming || false;
            const isStillPlaying = speechStates[replyId]?.isPlaying || false;
            if (
                inputRequestsRef.current.length === 0 &&
                speechStates[replyId] === undefined &&
                audioContextRef.current
            ) {
                isStillStreaming = true;
            }
            setSpeechStates((prev) => {
                const state = prev[replyId];
                if (state) {
                    return {
                        ...prev,
                        [replyId]: {
                            ...state,
                            isPlaying: isStillPlaying,
                            isStreaming: isStillStreaming,
                        },
                    };
                }
                return prev;
            });
            if (
                inputRequestsRef.current.length > 0 &&
                audioContextRef.current &&
                autoPlayNextRef.current &&
                currentReplyIdRef.current
            ) {
                setTimeout(() => {
                    playNextSpeech(currentReplyIdRef.current);
                }, 300);
            }
        },
        [playAudioChunk],
    );

    // Play full audio from beginning (for replay) using HTML Audio element
    // This supports preservesPitch to keep the voice tone unchanged when changing speed
    const playAudio = useCallback(
        (replyId: string, base64Data?: string) => {
            // Stop current playback if any
            if (audioElementRef.current[replyId]) {
                audioElementRef.current[replyId]!.pause();
                audioElementRef.current[replyId] = null;
            }
            if (currentSourceRef.current[replyId]) {
                try {
                    currentSourceRef.current[replyId]!.stop();
                } catch {
                    // Ignore
                }
                currentSourceRef.current[replyId] = null;
            }

            // Clear any pending queue
            audioQueueRef.current[replyId] = [];
            isProcessingQueueRef.current[replyId] = false;

            // Get or create WAV blob URL
            if (!wavBlobUrlRef.current[replyId] && base64Data) {
                wavBlobUrlRef.current[replyId] = createWavBlobUrl(base64Data);
            }

            const wavUrl = wavBlobUrlRef.current[replyId];
            if (!wavUrl) return;

            // Create HTML Audio element for playback (supports preservesPitch)
            const audio = new Audio(wavUrl);
            audio.playbackRate = globalPlaybackRateRef.current;
            audio.volume = globalVolumeRef.current;
            // @ts-expect-error - preservesPitch is not in TypeScript types but supported by browsers
            audio.preservesPitch = true;
            // @ts-expect-error - webkitPreservesPitch for older Safari
            audio.webkitPreservesPitch = true;

            audioElementRef.current[replyId] = audio;
            currentReplyIdRef.current = replyId;
            audio.onended = () => {
                audioElementRef.current[replyId] = null;

                setSpeechStates((prev) => {
                    const state = prev[replyId];
                    if (state) {
                        return {
                            ...prev,
                            [replyId]: { ...state, isPlaying: false },
                        };
                    }
                    return prev;
                });
                // Auto-play next speech if enabled
                if (autoPlayNextRef.current) {
                    setTimeout(() => {
                        playNextSpeech(replyId);
                    }, 300);
                }
            };

            audio.onerror = (e) => {
                console.error('Audio playback error:', e);
                audioElementRef.current[replyId] = null;

                setSpeechStates((prev) => {
                    const state = prev[replyId];
                    if (state) {
                        return {
                            ...prev,
                            [replyId]: { ...state, isPlaying: false },
                        };
                    }
                    return prev;
                });
            };

            audio.play().catch(console.error);

            setSpeechStates((prev) => {
                const state = prev[replyId];
                if (state) {
                    return {
                        ...prev,
                        [replyId]: { ...state, isPlaying: true },
                    };
                }
                return prev;
            });
        },
        [createWavBlobUrl],
    );

    // Handle incoming speech data (streaming)
    const handleSpeechData = useCallback(
        (speechData: SpeechData) => {
            const { replyId, speech } = speechData;

            // Normalize to array
            const speechBlocks: AudioBlock[] = Array.isArray(speech)
                ? speech
                : [speech];

            for (const block of speechBlocks) {
                if (block.source.type !== 'base64') continue;

                const fullData = block.source.data;
                const mediaType = block.source.media_type;

                // Calculate incremental data (new data since last time)
                const alreadyProcessed =
                    processedLengthRef.current[replyId] || 0;
                const deltaData = fullData.slice(alreadyProcessed);

                if (deltaData.length > 0) {
                    // Update processed length
                    processedLengthRef.current[replyId] = fullData.length;

                    // Add incremental data to queue
                    if (!audioQueueRef.current[replyId]) {
                        audioQueueRef.current[replyId] = [];
                    }
                    audioQueueRef.current[replyId].push(deltaData);

                    // Start processing queue
                    processAudioQueue(replyId);
                }
                // Update state
                setSpeechStates((prev) => {
                    return {
                        ...prev,
                        [replyId]: {
                            fullAudioData: fullData,
                            mediaType: mediaType,
                            isPlaying: true,
                            isStreaming: true,
                            playbackRate: globalPlaybackRateRef.current,
                            volume: globalVolumeRef.current,
                        },
                    };
                });

                // Reset streaming end timeout - if no new data for 1.5 seconds, mark streaming as complete
                if (streamingEndTimeoutRef.current[replyId]) {
                    clearTimeout(streamingEndTimeoutRef.current[replyId]!);
                }
                streamingEndTimeoutRef.current[replyId] = setTimeout(() => {
                    // setSpeechStates((prev) => {
                    //     const state = prev[replyId];
                    //     if (state) {
                    //         return {
                    //             ...prev,
                    //             [replyId]: { ...state, isStreaming: false },
                    //         };
                    //     }
                    //     return prev;
                    // });
                    streamingEndTimeoutRef.current[replyId] = null;
                }, 1500);
            }
        },
        [processAudioQueue],
    );

    // Play audio for a reply
    const playSpeech = useCallback(
        (replyId: string) => {
            const state =
                speechStates[replyId] || speechStatesRef?.current[replyId];
            if (!state || state.fullAudioData.length === 0) return;
            if (state.isPlaying) return;

            // Create WAV blob URL if not cached
            if (!wavBlobUrlRef.current[replyId]) {
                wavBlobUrlRef.current[replyId] = createWavBlobUrl(
                    state.fullAudioData,
                );
            }
            if (audioContextRef.current) {
                audioContextRef.current.suspend();
            }
            playAudio(replyId, state.fullAudioData);

            // If currently playing other speeches, stop them to ensure only one plays at a time
            Object.keys(speechStates).forEach((id) => {
                if (id !== replyId && speechStates[id]?.isPlaying) {
                    stopSpeech(id);
                }
            });
        },
        [speechStates, playAudio, createWavBlobUrl],
    );
    // Stop playing audio for a reply
    const stopSpeech = useCallback((replyId: string) => {
        // Stop HTML Audio element if playing
        const audioElement = audioElementRef.current[replyId];
        if (audioElement) {
            audioElement.pause();
            audioElementRef.current[replyId] = null;
        }

        // Stop the currently playing audio source (for streaming)
        const currentSource = currentSourceRef.current[replyId];
        if (currentSource) {
            try {
                currentSource.stop();
            } catch {
                // Ignore errors if already stopped
            }
            currentSourceRef.current[replyId] = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.resume();
        }
        // Update state
        setSpeechStates((prev) => {
            const state = prev[replyId];
            if (state) {
                return {
                    ...prev,
                    [replyId]: {
                        ...state,
                        isPlaying: false,
                        isStreaming: false,
                    },
                };
            }
            return prev;
        });
    }, []);
    // Set playback rate for all replies
    const setPlaybackRate = useCallback((rate: number) => {
        // Clamp rate between 0.25 and 4.0
        const clampedRate = Math.max(0.25, Math.min(4.0, rate));

        // Update ref to avoid re-rendering
        globalPlaybackRateRef.current = clampedRate;

        // Update state to trigger any necessary context updates
        setGlobalPlaybackRate(clampedRate);

        // Update all HTML Audio elements if playing
        Object.keys(audioElementRef.current).forEach((id) => {
            const audioElement = audioElementRef.current[id];
            if (audioElement) {
                audioElement.playbackRate = clampedRate;
            }
        });

        // Update all current sources if playing (for streaming)
        Object.keys(currentSourceRef.current).forEach((id) => {
            const currentSource = currentSourceRef.current[id];
            if (currentSource) {
                currentSource.playbackRate.value = clampedRate;
            }
        });
    }, []);

    // Set volume for all replies
    const setVolume = useCallback((volume: number) => {
        // Clamp volume between 0.0 and 1.0
        const clampedVolume = Math.max(0.0, Math.min(1.0, volume));

        // Update ref to avoid re-rendering
        globalVolumeRef.current = clampedVolume;

        // Update state to trigger any necessary context updates
        setGlobalVolume(clampedVolume);

        // Update all HTML Audio elements if playing
        Object.keys(audioElementRef.current).forEach((id) => {
            const audioElement = audioElementRef.current[id];
            if (audioElement) {
                audioElement.volume = clampedVolume;
            }
        });

        // Update all gain nodes if exists (for streaming)
        Object.keys(gainNodeRef.current).forEach((id) => {
            const gainNode = gainNodeRef.current[id];
            if (gainNode) {
                gainNode.gain.value = clampedVolume;
            }
        });
    }, []);

    useEffect(() => {
        if (spans.length > 0) {
            const traceData = calculateTraceData(spans);

            if (traceData) {
                setTrace({
                    startTime: traceData.startTime,
                    endTime: traceData.endTime,
                    latencyNs: traceData.duration,
                    status: traceData.status,
                    runId: runId,
                } as TraceData);
            }
        }
    }, [spans]);

    useEffect(() => {
        if (!socket) {
            // TODO: 通过message提示用户
            return;
        }

        // Clear the data first
        setInputRequests([]);
        setReplies([]);
        setSpans([]);
        setRunData(null);
        setModelInvocationData(null);

        socket.emit(
            SocketEvents.client.joinRunRoom,
            runId,
            (response: ResponseBody) => {
                if (!response.success) {
                    messageApi.error(response.message);
                }
            },
        );

        // New messages
        socket.on(SocketEvents.server.pushMessages, (newReplies: Reply[]) => {
            setReplies((prev) => {
                const updatedReplies: Reply[] = [...prev];
                newReplies.forEach((newReply) => {
                    const index = updatedReplies.findIndex(
                        (reply) => reply.replyId === newReply.replyId,
                    );

                    if (index === -1) {
                        // New reply, add it
                        updatedReplies.push(newReply);
                    } else {
                        // Existing reply, update messages
                        updatedReplies[index] = newReply;
                    }
                });
                return updatedReplies;
            });

            // Restore speech states from messages (don't decode yet to avoid AudioContext warning)
            newReplies.forEach((reply) => {
                reply.messages.forEach((msg) => {
                    if (msg.speech && msg.speech.length > 0) {
                        const speechBlocks = msg.speech;
                        const firstBlock =
                            speechBlocks[speechBlocks.length - 1]; // Use latest
                        if (firstBlock?.source?.type === 'base64') {
                            const fullData = firstBlock.source.data;
                            const mediaType = firstBlock.source.media_type;

                            // Only save the data, decode later when user clicks play
                            setSpeechStates((prev) => {
                                const currentState = prev[reply.replyId];
                                return {
                                    ...prev,
                                    [reply.replyId]: {
                                        fullAudioData: fullData,
                                        mediaType: mediaType,
                                        isPlaying:
                                            currentState?.isPlaying || false,
                                        isStreaming:
                                            currentState?.isStreaming || false,
                                        playbackRate:
                                            globalPlaybackRateRef.current,
                                        volume: globalVolumeRef.current,
                                    },
                                };
                            });
                        }
                    }
                });
            });
        });

        socket.on(SocketEvents.server.pushSpans, (newSpans: SpanData[]) => {
            setSpans((prevSpans) => {
                const updatedSpans = [...prevSpans];
                newSpans.forEach((newSpan) => {
                    const index = updatedSpans.findIndex(
                        (span) => span.spanId === newSpan.spanId,
                    );
                    if (index === -1) {
                        updatedSpans.push(newSpan);
                    } else {
                        updatedSpans[index] = newSpan;
                    }
                });

                return updatedSpans.sort((a, b) => {
                    return (
                        parseInt(a.startTimeUnixNano) -
                        parseInt(b.startTimeUnixNano)
                    );
                });
            });
        });

        socket.on(
            SocketEvents.server.pushModelInvocationData,
            (newModelInvocationData: ModelInvocationData) => {
                setModelInvocationData(newModelInvocationData);
            },
        );

        // New user input requests
        socket.on(
            SocketEvents.server.pushInputRequests,
            (newInputRequests: InputRequestData[]) => {
                setInputRequests((prevRequests) => {
                    return [...prevRequests, ...newInputRequests];
                });
            },
        );

        // Run data updates
        socket.on(SocketEvents.server.pushRunData, (newRunData: RunData) => {
            setRunData(newRunData);
        });

        // Clear input requests
        socket.on(SocketEvents.server.clearInputRequests, () => {
            setInputRequests([]);
        });

        // Speech data for real-time audio playback
        socket.on(SocketEvents.server.pushSpeech, (speechData: SpeechData) => {
            handleSpeechData(speechData);
        });

        return () => {
            if (socket) {
                // Clear the listeners and leave the room
                socket.off(SocketEvents.server.pushMessages);
                socket.off(SocketEvents.server.pushSpans);
                socket.off(SocketEvents.server.pushInputRequests);
                socket.off(SocketEvents.server.pushRunData);
                socket.off(SocketEvents.server.clearInputRequests);
                socket.off(SocketEvents.server.pushModelInvocationData);
                socket.off(SocketEvents.server.pushSpeech);
                socket.emit(SocketEvents.client.leaveRoom, roomName);
            }
        };
    }, [socket, runId, roomName, handleSpeechData]);

    if (!runId) {
        return <ProjectNotFoundPage />;
    }

    /**
     * Send the user input to the server
     *
     * @param requestId
     * @param blocksInput
     * @param structuredInput
     */
    const sendUserInputToServer = (
        requestId: string,
        blocksInput: ContentBlocks,
        structuredInput: Record<string, unknown> | null,
    ) => {
        if (!socket) {
            messageApi.error(
                'Server is not connected, please refresh the page.',
            );
        } else {
            setTimeout(() => {
                stopAllSpeech();
            }, 1000);
            socket.emit(
                SocketEvents.client.sendUserInputToServer,
                requestId,
                blocksInput,
                structuredInput,
            );
            // Update the request queue
            setInputRequests((prevRequests) =>
                prevRequests.filter(
                    (request) => request.requestId !== requestId,
                ),
            );
        }
    };

    return (
        <RunRoomContext.Provider
            value={{
                runId,
                replies,
                trace,
                spans,
                inputRequests,
                runData,
                sendUserInputToServer,
                modelInvocationData,
                speechStates,
                playSpeech,
                stopSpeech,
                setPlaybackRate,
                setVolume,
                globalPlaybackRate,
                globalVolume,
                autoPlayNext,
                setAutoPlayNext,
            }}
        >
            {children}
        </RunRoomContext.Provider>
    );
}

export function useRunRoom() {
    const context = useContext(RunRoomContext);
    if (!context) {
        throw new Error('useRunRoom must be used within a RunRoomProvider');
    }
    return context;
}
