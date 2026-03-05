import { memo, useEffect, useRef, useState } from 'react';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
    /** Whether audio is currently playing */
    isPlaying: boolean;
    /** Whether still receiving streaming data */
    isStreaming: boolean;
    /** Callback to play audio */
    onPlay: () => void;
    /** Callback to pause audio */
    onPause: () => void;
}

/**
 * A speech bar component that displays audio playback status and play/pause button.
 * Shown below chat bubbles when speech audio is available.
 */
const SpeechBar = ({ isPlaying, isStreaming, onPlay, onPause }: Props) => {
    const defaultBars = [3, 5, 4, 6, 3];
    const [animationBars, setAnimationBars] = useState<number[]>(defaultBars);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    // Animate the audio visualization bars when playing
    useEffect(() => {
        if (isPlaying) {
            animationRef.current = setInterval(() => {
                setAnimationBars(
                    Array.from(
                        { length: defaultBars.length },
                        () => Math.floor(Math.random() * 8) + 2,
                    ),
                );
            }, 150);
        } else {
            if (animationRef.current) {
                clearInterval(animationRef.current);
                animationRef.current = null;
            }
            setAnimationBars([...defaultBars]);
        }

        return () => {
            if (animationRef.current) {
                clearInterval(animationRef.current);
            }
        };
    }, [isPlaying]);

    return (
        <div className="ml-2 mr-4 py-2">
            <div
                className={cn(
                    'flex items-center justify-center gap-1 px-3 py-1 rounded-full h-8 w-16',
                    'bg-gradient-to-r from-primary-50 to-primary-100',
                    'border border-primary-200',
                    'shadow-sm',
                    'transition-all duration-300',
                    isPlaying && 'border-2 border-primary-500 shadow-md',
                )}
            >
                {/* Audio visualization bars */}
                <div className="flex items-end gap-0.5 h-4 -mt-1">
                    {animationBars.map((height, index) => (
                        <div
                            key={index}
                            className={cn(
                                'w-0.5 bg-primary-500 rounded-full transition-all duration-150',
                                isPlaying ? 'opacity-100' : 'opacity-50',
                            )}
                            style={{ height: `${height * 1.5}px` }}
                        />
                    ))}
                </div>

                {/* Streaming indicator */}
                {isStreaming && (
                    <div className="flex items-center gap-1 ml-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    </div>
                )}

                {/* Controls - only show when not streaming */}
                {!isStreaming && (
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
                )}
            </div>
        </div>
    );
};

export default memo(SpeechBar);
