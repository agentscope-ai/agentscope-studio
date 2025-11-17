import { ContentBlocks, Reply } from '@shared/types';
import { memo, ReactNode, useEffect, useMemo, useState, useRef } from 'react';
import {
    SettingsIcon,
    MonitorIcon,
    MessageSquareIcon,
    DicesIcon,
    ArrowDownToLineIcon,
    MoreHorizontalIcon,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button.tsx';
import AsBubble from '@/components/chat/AsChat/bubble.tsx';
import AsTextarea from '@/components/chat/AsChat/textarea.tsx';
import { ButtonGroup } from '@/components/ui/button-group.tsx';

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
    /** A render function for custom avatar rendering */
    renderAvatar?: (name: string, role: string) => ReactNode;
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
 * @param renderAvatar
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
    renderAvatar,
    userAvatarRight = false,
}: Props) => {
    const [renderMarkdown, setRenderMarkdown] = useState<boolean>(true);
    const [byReplyId, setByReplyId] = useState<boolean>(true);
    const [randomAvatar, setRandomAvatar] = useState<boolean>(true);
    const [isAtBottom, setIsAtBottom] = useState<boolean>(true);

    const bubbleListRef = useRef<HTMLDivElement>(null);

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
                            key={reply.replyId}
                            reply={reply}
                            randomAvatar={randomAvatar}
                            markdown={renderMarkdown}
                            onClick={onBubbleClick}
                            renderAvatar={renderAvatar}
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="icon-sm"
                                    variant="outline"
                                    aria-label="More options"
                                >
                                    {actions ? (
                                        <MoreHorizontalIcon />
                                    ) : (
                                        <SettingsIcon />
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56"
                                align="start"
                                side="top"
                            >
                                <DropdownMenuLabel>Display</DropdownMenuLabel>
                                <DropdownMenuGroup>
                                    <DropdownMenuCheckboxItem
                                        checked={renderMarkdown}
                                        onCheckedChange={setRenderMarkdown}
                                    >
                                        <MonitorIcon />
                                        Render Markdown
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={byReplyId}
                                        onCheckedChange={setByReplyId}
                                    >
                                        <MessageSquareIcon />
                                        By reply Id
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={randomAvatar}
                                        onCheckedChange={setRandomAvatar}
                                    >
                                        <DicesIcon />
                                        Use random avatar
                                    </DropdownMenuCheckboxItem>
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
