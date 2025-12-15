import { memo, useEffect, useRef, useState } from 'react';
import {
    PauseIcon,
    PlayIcon,
    Volume2Icon,
    VolumeXIcon,
    GaugeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Props {
    /** Whether audio is currently playing */
    isPlaying: boolean;
    /** Whether still receiving streaming data */
    isStreaming: boolean;
    /** Whether there is any audio data available */
    hasAudio: boolean;
    /** Current playback rate (0.25 to 4.0) */
    playbackRate: number;
    /** Current volume (0.0 to 1.0) */
    volume: number;
    /** Callback to play audio */
    onPlay: () => void;
    /** Callback to pause audio */
    onPause: () => void;
    /** Callback to set playback rate */
    onPlaybackRateChange: (rate: number) => void;
    /** Callback to set volume */
    onVolumeChange: (volume: number) => void;
}

/**
 * A speech bar component that displays audio playback status and play/pause button.
 * Shown below chat bubbles when speech audio is available.
 */
const SpeechBar = ({
    isPlaying,
    isStreaming,
    hasAudio,
    playbackRate,
    volume,
    onPlay,
    onPause,
    onPlaybackRateChange,
    onVolumeChange,
}: Props) => {
    const [animationBars, setAnimationBars] = useState<number[]>([
        3, 5, 4, 6, 3,
    ]);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    // Animate the audio visualization bars when playing
    useEffect(() => {
        if (isPlaying) {
            animationRef.current = setInterval(() => {
                setAnimationBars(
                    Array.from(
                        { length: 5 },
                        () => Math.floor(Math.random() * 8) + 2,
                    ),
                );
            }, 150);
        } else {
            if (animationRef.current) {
                clearInterval(animationRef.current);
                animationRef.current = null;
            }
            setAnimationBars([3, 5, 4, 6, 3]);
        }

        return () => {
            if (animationRef.current) {
                clearInterval(animationRef.current);
            }
        };
    }, [isPlaying]);

    if (!hasAudio && !isStreaming) {
        return null;
    }

    const playbackRateOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const volumeOptions = [0, 0.25, 0.5, 0.75, 1.0];

    return (
        <div
            className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full',
                'bg-gradient-to-r from-primary-50 to-primary-100',
                'border border-primary-200',
                'shadow-sm',
                'transition-all duration-300',
                isPlaying && 'ring-2 ring-primary-300 ring-opacity-50',
            )}
        >
            {/* Audio visualization bars */}
            <div className="flex items-end gap-0.5 h-4">
                {animationBars.map((height, index) => (
                    <div
                        key={index}
                        className={cn(
                            'w-0.5 bg-primary-500 rounded-full transition-all duration-150',
                            isPlaying ? 'opacity-100' : 'opacity-50',
                        )}
                        style={{ height: `${height * 2}px` }}
                    />
                ))}
            </div>

            {/* Streaming indicator */}
            {isStreaming && (
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                </div>
            )}

            {/* Controls - only show when not streaming */}
            {hasAudio && !isStreaming && (
                <>
                    {/* Playback rate selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-full hover:bg-primary-200"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <GaugeIcon className="size-3 text-primary-600" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {playbackRateOptions.map((rate) => (
                                <DropdownMenuItem
                                    key={rate}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPlaybackRateChange(rate);
                                    }}
                                    className={cn(
                                        playbackRate === rate &&
                                            'bg-primary-50',
                                    )}
                                >
                                    {rate}x{playbackRate === rate && ' ✓'}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Volume control */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-full hover:bg-primary-200"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {volume === 0 ? (
                                    <VolumeXIcon className="size-3 text-primary-600" />
                                ) : (
                                    <Volume2Icon className="size-3 text-primary-600" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {volumeOptions.map((v) => (
                                <DropdownMenuItem
                                    key={v}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onVolumeChange(v);
                                    }}
                                    className={cn(
                                        Math.abs(volume - v) < 0.01 &&
                                            'bg-primary-50',
                                    )}
                                >
                                    {v === 0
                                        ? 'Mute'
                                        : `${Math.round(v * 100)}%`}
                                    {Math.abs(volume - v) < 0.01 && ' ✓'}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Play/Pause button */}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 rounded-full hover:bg-primary-200"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isPlaying) {
                                onPause();
                            } else {
                                onPlay();
                            }
                        }}
                    >
                        {isPlaying ? (
                            <PauseIcon className="size-3 text-primary-600" />
                        ) : (
                            <PlayIcon className="size-3 text-primary-600" />
                        )}
                    </Button>
                </>
            )}
        </div>
    );
};

export default memo(SpeechBar);
