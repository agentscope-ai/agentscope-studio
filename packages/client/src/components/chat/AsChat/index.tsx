import { ContentBlocks, Reply } from '@shared/types';
import { memo, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowDownToLineIcon,
    MoreHorizontalIcon,
    UsersIcon,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button.tsx';
import AsBubble from '@/components/chat/AsChat/bubble.tsx';
import AsTextarea from '@/components/chat/AsChat/textarea.tsx';
import { ButtonGroup } from '@/components/ui/button-group.tsx';
import DiceData from '@/assets/lottie/dice.json';
import { useTranslation } from 'react-i18next';
import AsLottieButton from '@/components/buttons/AsLottieButton';
import AsToggleButton from '@/components/buttons/AsToggleButton';
import MarkdownIcon from '@/assets/svgs/markdown.svg?react';
import MessagesIcon from '@/assets/svgs/messages.svg?react';
import FrogIcon from '@/assets/svgs/avatar/fairytale/001-frog.svg?react';
import FairyIcon from '@/assets/svgs/avatar/fairytale/008-fairy.svg?react';
import OgreIcon from '@/assets/svgs/avatar/fairytale/017-ogre.svg?react';
import Pokemon1Icon from '@/assets/svgs/avatar/pokemon/022-avatar.svg?react';
import Pokemon2Icon from '@/assets/svgs/avatar/pokemon/029-avatar.svg?react';
import Pokemon3Icon from '@/assets/svgs/avatar/pokemon/011-avatar.svg?react';
import MotherIcon from '@/assets/svgs/avatar/family-members/011-mother.svg?react';
import GirlIcon from '@/assets/svgs/avatar/family-members/027-girl.svg?react';
import CousinIcon from '@/assets/svgs/avatar/family-members/047-cousin.svg?react';
import Superhero1Icon from '@/assets/svgs/avatar/superhero/016-superhero.svg?react';
import Superhero2Icon from '@/assets/svgs/avatar/superhero/040-superhero.svg?react';
import Superhero3Icon from '@/assets/svgs/avatar/superhero/025-superhero.svg?react';
import Character1Icon from '@/assets/svgs/avatar/character/018-waiter.svg?react';
import Character2Icon from '@/assets/svgs/avatar/character/035-daughter.svg?react';
import Character3Icon from '@/assets/svgs/avatar/character/050-woman.svg?react';
import { Avatar } from '@/components/ui/avatar.tsx';
import { AsAvatar, AvatarSet } from '@/components/chat/AsChat/avatar.tsx';

interface Props {
    /** List of chat replies to display */
    replies: Reply[];
    /** Whether the agent is currently replying */
    isReplying: boolean;
    /** Callback function when user sends a message */
    onSendClick: (
        blocksInput: ContentBlocks,
        structuredInput: Record<string, unknown> | null,
    ) => void;
    /** Whether the send button is disabled */
    disableSendBtn: boolean;
    /** Whether interrupting the reply is allowed */
    allowInterrupt: boolean;
    /** Callback function to interrupt the ongoing reply */
    onInterruptClick?: () => void;
    /** Callback function when user clicks on a bubble */
    onBubbleClick: (reply: Reply) => void;
    /** Additional action buttons or components */
    actions?: ReactNode;
    /** Placeholder text for the input area */
    placeholder: string;
    /** Tooltip texts */
    tooltips: {
        sendButton: string;
        interruptButton?: string;
        attachButton: string;
        expandTextarea: string;
    };
    /** Maximum file size for attachments in bytes */
    attachMaxFileSize: number;
    /** Callback function when there is an error */
    onError: (error: string) => void;
    /** Accepted file types for attachments */
    attachAccept: string[];
    /** Whether to display user avatar on the right side */
    userAvatarRight?: boolean;
}

/**
 * Chat interface component for interacting in AgentScope, supporting multimodal
 * messages and interrupting.
 *
 * @param messages
 * @param isReplying
 * @param onSendClick
 * @param allowInterrupt
 * @param onInterruptClick
 * @param onBubbleClick
 * @param actions
 * @param placeholder
 * @param tooltips
 * @param attachAccept
 * @param attachMaxFileSize
 * @param onError
 * @param userAvatarRight
 * @constructor
 */
const AsChat = ({
    replies,
    isReplying,
    onSendClick,
    disableSendBtn,
    allowInterrupt,
    onInterruptClick,
    onBubbleClick,
    actions,
    placeholder,
    tooltips,
    attachAccept,
    attachMaxFileSize,
    onError,
    userAvatarRight = false,
}: Props) => {
    // TODO: use a context to manage these settings globally

    // Load renderMarkdown from localStorage or use default
    const [renderMarkdown, setRenderMarkdown] = useState<boolean>(() => {
        const saved = localStorage.getItem('chat-render-markdown');
        return saved !== null ? saved === 'true' : true;
    });

    // Load byReplyId from localStorage or use default
    const [byReplyId, setByReplyId] = useState<boolean>(() => {
        const saved = localStorage.getItem('chat-by-reply-id');
        return saved !== null ? saved === 'true' : true;
    });

    // Load avatarSet from localStorage or use default
    const [avatarSet, setAvatarSet] = useState<AvatarSet>(() => {
        const saved = localStorage.getItem('chat-avatar-set');
        return (saved as AvatarSet) || AvatarSet.CHARACTER;
    });

    // Load randomSeed from localStorage or use default
    const [randomSeed, setRandomSeed] = useState<number>(() => {
        const saved = localStorage.getItem('chat-random-seed');
        return saved ? parseInt(saved, 10) : 510;
    });

    const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
    const { t } = useTranslation();

    const bubbleListRef = useRef<HTMLDivElement>(null);

    // Save renderMarkdown to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('chat-render-markdown', renderMarkdown.toString());
    }, [renderMarkdown]);

    // Save byReplyId to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('chat-by-reply-id', byReplyId.toString());
    }, [byReplyId]);

    // Save avatarSet to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('chat-avatar-set', avatarSet);
    }, [avatarSet]);

    // Save randomSeed to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('chat-random-seed', randomSeed.toString());
    }, [randomSeed]);

    // Organize replies based on user preference (by reply ID or flattened messages)
    const organizedReplies = useMemo(() => {
        if (replies.length === 0) return [];

        if (byReplyId) {
            return replies;
        }

        const flattedReplies: Reply[] = [];
        replies.forEach((reply) => {
            reply.messages.forEach((msg) => {
                flattedReplies.push({
                    replyId: msg.id,
                    replyName: msg.name,
                    replyRole: msg.role,
                    createdAt: msg.timestamp,
                    finishedAt: msg.timestamp,
                    messages: [msg],
                } as Reply);
            });
        });
        return flattedReplies;
    }, [replies, byReplyId]);

    // When new replies arrive, auto-scroll to bottom if user is at bottom
    useEffect(() => {
        if (bubbleListRef.current && isAtBottom) {
            bubbleListRef.current.scrollTop =
                bubbleListRef.current.scrollHeight;
        }
    }, [organizedReplies, isAtBottom]);

    /*
     * Listen to scroll events to determine if user is at bottom
     */
    const handleScroll = () => {
        if (bubbleListRef.current) {
            const { scrollTop, scrollHeight, clientHeight } =
                bubbleListRef.current;
            // if the distance to bottom is less than 50px, consider it at bottom
            const atBottom = scrollHeight - scrollTop - clientHeight < 50;
            setIsAtBottom(atBottom);
        }
    };

    /*
     * The candidate avatar sets data
     */
    const candidateAvatarSets = [
        {
            label: t('chat.avatar-set.random'),
            icons: [],
            key: AvatarSet.RANDOM,
        },
        {
            label: t('chat.avatar-set.character'),
            icons: [
                <Character1Icon className="size-full" />,
                <Character2Icon className="size-full" />,
                <Character3Icon className="size-full" />,
            ],
            key: AvatarSet.CHARACTER,
        },
        {
            label: t('chat.avatar-set.pokemon'),
            icons: [
                <Pokemon1Icon className="size-full" />,
                <Pokemon2Icon className="size-full" />,
                <Pokemon3Icon className="size-full" />,
            ],
            key: AvatarSet.POKEMON,
        },
        {
            label: t('chat.avatar-set.fairytale'),
            icons: [
                <FairyIcon className="size-full" />,
                <OgreIcon className="size-full" />,
                <FrogIcon className="size-full" />,
            ],
            key: AvatarSet.FAIRYTALE,
        },
        {
            label: t('chat.avatar-set.family-members'),
            icons: [
                <MotherIcon className="size-full" />,
                <GirlIcon className="size-full" />,
                <CousinIcon className="size-full" />,
            ],
            key: AvatarSet.FAMILY_MEMBERS,
        },
        {
            label: t('chat.avatar-set.superhero'),
            icons: [
                <Superhero1Icon className="size-full" />,
                <Superhero2Icon className="size-full" />,
                <Superhero3Icon className="size-full" />,
            ],
            key: AvatarSet.SUPERHERO,
        },
        {
            label: t('chat.avatar-set.letter'),
            icons: ['LJ', 'KB', 'MJ'].map((initials) => (
                <div className="size-7 bg-primary-500 flex items-center justify-center text-primary-foreground">
                    {initials}
                </div>
            )),
            key: AvatarSet.LETTER,
        },
    ];

    return (
        <div className="flex flex-col w-full max-w-[800px] h-full p-4 pt-2">
            {/*The bubble list*/}
            <div className="relative flex-1 w-full overflow-hidden">
                <div
                    ref={bubbleListRef}
                    onScroll={handleScroll}
                    className="flex flex-col gap-y-5 w-full h-full overflow-auto"
                >
                    {organizedReplies.map((reply) => (
                        <AsBubble
                            avatar={
                                <AsAvatar
                                    name={reply.replyName}
                                    role={reply.replyRole}
                                    avatarSet={avatarSet}
                                    seed={randomSeed}
                                />
                            }
                            key={reply.replyId}
                            reply={reply}
                            markdown={renderMarkdown}
                            onClick={onBubbleClick}
                            userAvatarRight={userAvatarRight}
                        />
                    ))}
                </div>
                <Button
                    size="icon-sm"
                    variant="outline"
                    className={`rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2 ${isAtBottom ? 'hidden' : ''}`}
                    onClick={() => {
                        if (bubbleListRef.current) {
                            bubbleListRef.current.scrollTop =
                                bubbleListRef.current.scrollHeight;
                        }
                    }}
                >
                    <ArrowDownToLineIcon />
                </Button>
            </div>

            <div className="flex flex-col w-full space-y-2 mt-2">
                {/*The component list above the textarea component*/}
                <div className="flex flex-row justify-end w-full space-x-4">
                    <ButtonGroup>
                        {actions}
                        <AsLottieButton
                            size="icon-sm"
                            variant="outline"
                            aria-label={t('tooltip.button.randomize-avatar')}
                            animationData={DiceData}
                            tooltip={t('tooltip.button.randomize-avatar')}
                            onClick={() => {
                                setRandomSeed(
                                    Math.floor(Math.random() * 10000),
                                );
                            }}
                        />
                        <AsToggleButton
                            size="icon-sm"
                            variant="outline"
                            active={renderMarkdown}
                            tooltip={t('tooltip.button.render-markdown')}
                            onClick={() => {
                                setRenderMarkdown((prev) => !prev);
                            }}
                        >
                            <MarkdownIcon className="size-5.5 group-data-[active=false]:grayscale group-data-[active=false]:opacity-60" />
                        </AsToggleButton>

                        <AsToggleButton
                            size="icon-sm"
                            variant="outline"
                            active={byReplyId}
                            tooltip={t('tooltip.button.group-by-reply')}
                            onClick={() => {
                                setByReplyId((prev) => !prev);
                            }}
                        >
                            <MessagesIcon className="size-4 group-data-[active=false]:grayscale group-data-[active=false]:opacity-60" />
                        </AsToggleButton>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="icon-sm"
                                    variant="outline"
                                    aria-label="More options"
                                >
                                    <MoreHorizontalIcon />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56"
                                align="end"
                                side="top"
                            >
                                <DropdownMenuLabel>Display</DropdownMenuLabel>
                                <DropdownMenuGroup>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <UsersIcon />
                                            <div className="flex w-full justify-between truncate gap-x-2">
                                                Avatar sets
                                                <div className="text-muted-foreground/70 truncate">
                                                    {t(
                                                        `chat.avatar-set.${avatarSet}`,
                                                    )}
                                                </div>
                                            </div>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent>
                                                {candidateAvatarSets.map(
                                                    (set) => (
                                                        <DropdownMenuCheckboxItem
                                                            className="flex justify-between gap-x-5"
                                                            checked={
                                                                avatarSet ===
                                                                set.key
                                                            }
                                                            onCheckedChange={(
                                                                checked,
                                                            ) => {
                                                                if (checked) {
                                                                    setAvatarSet(
                                                                        set.key,
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            {set.label}
                                                            <div className="*:data-[slot=avatar]:ring-background flex items-center -space-x-2 *:data-[slot=avatar]:ring-2">
                                                                {set.icons.map(
                                                                    (icon) => {
                                                                        return (
                                                                            <Avatar className="size-7">
                                                                                {
                                                                                    icon
                                                                                }
                                                                            </Avatar>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        </DropdownMenuCheckboxItem>
                                                    ),
                                                )}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </ButtonGroup>
                </div>

                <AsTextarea
                    placeholder={placeholder}
                    actionType={
                        isReplying && allowInterrupt ? 'interrupt' : 'send'
                    }
                    onActionClick={(blocksInput, structuredInput) => {
                        if (isReplying && allowInterrupt && onInterruptClick) {
                            onInterruptClick();
                        } else {
                            onSendClick(blocksInput, structuredInput);
                        }
                    }}
                    disableSendBtn={disableSendBtn}
                    tooltips={tooltips}
                    expandable
                    attachAccept={attachAccept}
                    attachMaxFileSize={attachMaxFileSize}
                    onError={onError}
                />
            </div>
        </div>
    );
};

export default memo(AsChat);
