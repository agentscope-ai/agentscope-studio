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
    BackendResponse,
    InputRequestData,
    ModelInvocationData,
    Reply,
    RunData,
    SocketEvents,
    SpeechData,
} from '../../../shared/src/types/trpc';
import { useSocket } from './SocketContext';

import { useParams } from 'react-router-dom';
import { AudioBlock, ContentBlocks } from '../../../shared/src/types/messageForm';
import {
    SpanData,
    TraceData,
    TraceStatus,
} from '../../../shared/src/types/trace';
import { getTimeDifferenceNano } from '../../../shared/src/utils/timeUtils';
import { ProjectNotFoundPage } from '../pages/DefaultPage';
import { useMessageApi } from './MessageApiContext.tsx';

// Speech state for each reply
interface ReplySpeechState {
    // Full accumulated audio data (base64 string)
    fullAudioData: string;
    // Media type of the audio
    mediaType: string;
    // Whether audio is currently playing
    isPlaying: boolean;
    // Whether still receiving streaming data
    isStreaming: boolean;
}

// Use Record instead of Map for better React change detection
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
    // Speech related
    speechStates: SpeechStatesRecord;
    playSpeech: (replyId: string) => void;
    stopSpeech: (replyId: string) => void;
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
    const audioContextRef = useRef<AudioContext | null>(null);
    // Store current playing audio source for each reply
    const currentSourceRef = useRef<Record<string, AudioBufferSourceNode | null>>({});
    // Store decoded audio buffers (for replay)
    const audioBufferRef = useRef<Record<string, AudioBuffer | null>>({});
    // Timer for detecting streaming end
    const streamingEndTimeoutRef = useRef<Record<string, NodeJS.Timeout | null>>({});
    // Track already processed data length for incremental playback
    const processedLengthRef = useRef<Record<string, number>>({});
    // Audio queue for each reply
    const audioQueueRef = useRef<Record<string, string[]>>({});
    // Track if queue is being processed
    const isProcessingQueueRef = useRef<Record<string, boolean>>({});

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

    // Decode base64 PCM to AudioBuffer
    const decodeAudioData = useCallback((base64Data: string): AudioBuffer | null => {
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
            const audioBuffer = audioContext.createBuffer(1, floatSamples.length, 24000);
            audioBuffer.getChannelData(0).set(floatSamples);
            
            return audioBuffer;
        } catch (error) {
            console.error('Error decoding audio:', error);
            return null;
        }
    }, [ensureAudioContext]);

    // Play a single audio chunk and return a promise
    const playAudioChunk = useCallback((base64Data: string, replyId: string): Promise<void> => {
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
                source.connect(audioContext.destination);
                
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
    }, [decodeAudioData, ensureAudioContext]);

    // Process audio queue for a reply
    const processAudioQueue = useCallback(async (replyId: string) => {
        if (isProcessingQueueRef.current[replyId]) return;
        
        const queue = audioQueueRef.current[replyId] || [];
        if (queue.length === 0) return;

        isProcessingQueueRef.current[replyId] = true;
        
        setSpeechStates(prev => {
            const state = prev[replyId];
            if (state) {
                return { ...prev, [replyId]: { ...state, isPlaying: true } };
            }
            return prev;
        });

        while (queue.length > 0) {
            const chunk = queue.shift()!;
            await playAudioChunk(chunk, replyId);
        }

        isProcessingQueueRef.current[replyId] = false;
        
        setSpeechStates(prev => {
            const state = prev[replyId];
            if (state) {
                return { ...prev, [replyId]: { ...state, isPlaying: false } };
            }
            return prev;
        });
    }, [playAudioChunk]);

    // Play full audio from beginning (for replay)
    const playAudio = useCallback((replyId: string) => {
        const audioBuffer = audioBufferRef.current[replyId];
        if (!audioBuffer) return;
        
        const audioContext = ensureAudioContext();
        
        // Stop current playback if any
        if (currentSourceRef.current[replyId]) {
            try {
                currentSourceRef.current[replyId]!.stop();
            } catch (e) {
                // Ignore
            }
        }
        
        // Clear any pending queue
        audioQueueRef.current[replyId] = [];
        isProcessingQueueRef.current[replyId] = false;
        
        // Create new source
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        currentSourceRef.current[replyId] = source;
        
        source.onended = () => {
            currentSourceRef.current[replyId] = null;
            
            setSpeechStates(prev => {
                const state = prev[replyId];
                if (state) {
                    return { ...prev, [replyId]: { ...state, isPlaying: false } };
                }
                return prev;
            });
        };
        
        source.start(0);
        
        setSpeechStates(prev => {
            const state = prev[replyId];
            if (state) {
                return { ...prev, [replyId]: { ...state, isPlaying: true } };
            }
            return prev;
        });
    }, [ensureAudioContext]);

    // Handle incoming speech data (streaming)
    const handleSpeechData = useCallback((speechData: SpeechData) => {
        const { replyId, speech } = speechData;
        
        // Normalize to array
        const speechBlocks: AudioBlock[] = Array.isArray(speech) ? speech : [speech];
        
        for (const block of speechBlocks) {
            if (block.source.type !== 'base64') continue;
            
            const fullData = block.source.data;
            const mediaType = block.source.media_type;
            
            // Store full audio buffer for replay
            const audioBuffer = decodeAudioData(fullData);
            if (audioBuffer) {
                audioBufferRef.current[replyId] = audioBuffer;
            }

            // Calculate incremental data (new data since last time)
            const alreadyProcessed = processedLengthRef.current[replyId] || 0;
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
            setSpeechStates(prev => {
                const currentState = prev[replyId];
                
                return {
                    ...prev,
                    [replyId]: {
                        fullAudioData: fullData,
                        mediaType: mediaType,
                        isPlaying: currentState?.isPlaying || false,
                        isStreaming: true,
                    },
                };
            });

            // Reset streaming end timeout - if no new data for 1.5 seconds, mark streaming as complete
            if (streamingEndTimeoutRef.current[replyId]) {
                clearTimeout(streamingEndTimeoutRef.current[replyId]!);
            }
            streamingEndTimeoutRef.current[replyId] = setTimeout(() => {
                setSpeechStates(prev => {
                    const state = prev[replyId];
                    if (state) {
                        return { ...prev, [replyId]: { ...state, isStreaming: false } };
                    }
                    return prev;
                });
                streamingEndTimeoutRef.current[replyId] = null;
            }, 1500);
        }
    }, [decodeAudioData, processAudioQueue]);

    // Play audio for a reply
    const playSpeech = useCallback((replyId: string) => {
        const state = speechStates[replyId];
        if (!state || state.fullAudioData.length === 0) return;
        if (state.isPlaying) return;
        
        // Decode audio buffer if not cached (for historical messages)
        if (!audioBufferRef.current[replyId]) {
            const audioBuffer = decodeAudioData(state.fullAudioData);
            if (audioBuffer) {
                audioBufferRef.current[replyId] = audioBuffer;
            }
        }
        
        playAudio(replyId);
    }, [speechStates, playAudio, decodeAudioData]);

    // Stop playing audio for a reply
    const stopSpeech = useCallback((replyId: string) => {
        // Stop the currently playing audio source
        const currentSource = currentSourceRef.current[replyId];
        if (currentSource) {
            try {
                currentSource.stop();
            } catch (e) {
                // Ignore errors if already stopped
            }
            currentSourceRef.current[replyId] = null;
        }
        
        // Update state
        setSpeechStates(prev => {
            const state = prev[replyId];
            if (state) {
                return { ...prev, [replyId]: { ...state, isPlaying: false } };
            }
            return prev;
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
            (response: BackendResponse) => {
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
                        const firstBlock = speechBlocks[speechBlocks.length - 1]; // Use latest
                        if (firstBlock?.source?.type === 'base64') {
                            const fullData = firstBlock.source.data;
                            const mediaType = firstBlock.source.media_type;
                            
                            // Only save the data, decode later when user clicks play
                            setSpeechStates(prev => ({
                                ...prev,
                                [reply.replyId]: {
                                    fullAudioData: fullData,
                                    mediaType: mediaType,
                                    isPlaying: false,
                                    isStreaming: false,
                                },
                            }));
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
    }, [socket, runId, roomName, handleSpeechData, decodeAudioData]);

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
