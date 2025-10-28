import { ContentBlocks, Message, MessageData, Reply } from '@shared/types';
import { memo, ReactNode, useMemo, useState } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupTextarea,
} from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import {
    PlayIcon,
    SettingsIcon,
    MonitorIcon,
    PaperclipIcon,
    MessageSquareIcon,
    DicesIcon,
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
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
    disableSendBtn: boolean
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
    };
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
}: Props) => {
    const [renderMarkdown, setRenderMarkdown] = useState<boolean>(true);
    const [byReplyId, setByReplyId] = useState<boolean>(true);
    const [inputText, setInputText] = useState<string>('');
    const [randomAvatar, setRandomAvatar] = useState<boolean>(true);

    const organizedReplies = useMemo(
        () => {
            if (replies.length === 0) return [];

            if (byReplyId) {
                return replies;
            }

            const flattedReplies: Reply[] = [];
            replies.forEach(reply => {
                reply.messages.forEach(
                    msg=> {
                        flattedReplies.push(
                            {
                                replyId: msg.id,
                                replyName: msg.name,
                                replyRole: msg.role,
                                createdAt: msg.timestamp,
                                finishedAt: msg.timestamp,
                                messages: [msg],
                            } as Reply,
                        )
                    }
                );
            });
            return flattedReplies;
        }, [replies, byReplyId]
    );

    return (
        <div className="flex flex-col w-full h-full p-4">
            {/*The bubble list*/}
            <div className="flex flex-1 flex-col gap-y-5 w-full overflow-auto">
                {
                    organizedReplies.map(
                        reply => <AsBubble
                            reply={reply}
                            markdown={renderMarkdown}
                            onClick={onBubbleClick}
                        />
                    )
                }
            </div>

            <div className="flex flex-col w-full space-y-2">
                {/*The component list above the textarea component*/}
                <div className="flex flex-row w-full space-x-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                                <SettingsIcon />
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
                </div>

                <InputGroup>
                    <InputGroupTextarea
                        rows={2}
                        value={inputText}
                        placeholder={placeholder}
                        onChange={(e) => setInputText(e.target.value)}
                    />
                    <InputGroupAddon align="block-end">
                        <Tooltip>
                            <TooltipTrigger>
                                <InputGroupButton
                                    variant="outline"
                                    className="rounded-full"
                                    size="icon-sm"
                                >
                                    <PaperclipIcon />
                                </InputGroupButton>
                            </TooltipTrigger>
                            <TooltipContent>
                                {tooltips.attachButton}
                            </TooltipContent>
                        </Tooltip>
                        <InputGroupText className="ml-auto">
                            5 characters
                        </InputGroupText>
                        <Separator orientation="vertical" className="!h-4" />
                        <Tooltip>
                            <TooltipTrigger>
                                <InputGroupButton
                                    variant="default"
                                    className="rounded-full"
                                    size="icon-sm"
                                    disabled={disableSendBtn}
                                >
                                    <PlayIcon />
                                    <span className="sr-only">Send</span>
                                </InputGroupButton>
                            </TooltipTrigger>
                            <TooltipContent>
                                {tooltips.sendButton}
                            </TooltipContent>
                        </Tooltip>
                    </InputGroupAddon>
                </InputGroup>
            </div>
        </div>
    );
};

export default memo(AsChat);
