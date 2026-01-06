import { memo, useEffect, useRef, useState } from 'react';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
    /** Whether audio is currently playing */
    isPlaying: boolean;
    /** Whether still receiving streaming data */
    isStreaming: boolean;
    /** Whether there is any audio data available */
    hasAudio: boolean;
    /** Callback to play audio */
    onPlay: () => void;
    /** Callback to pause audio */
    onPause: () => void;
}

/**
 * A speech bar component that displays audio playback status and play/pause button.
 * Shown below chat bubbles when speech audio is available.
 */
const SpeechBar = ({
    isPlaying,
    isStreaming,
    hasAudio,
    onPlay,
    onPause,
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
