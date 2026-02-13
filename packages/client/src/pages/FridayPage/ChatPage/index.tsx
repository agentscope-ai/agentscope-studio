import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SettingsIcon, Trash2Icon, Plug2Icon } from 'lucide-react';

import { RouterPath } from '@/pages/RouterPath';
import { useFridayAppRoom } from '@/context/FridayAppRoomContext.tsx';
import { useFridaySettingRoom } from '@/context/FridaySettingRoomContext.tsx';
import AsChat from '@/components/chat/AsChat';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Message, Reply } from '@shared/types';
import { useTranslation } from 'react-i18next';
import MCPManagementSheet from './MCPManagementSheet';
import { MCPServer } from '@shared/config/friday';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip.tsx';

const ChatPage = () => {
    const { t } = useTranslation();
    const {
        replies,
        isReplying,
        handleUserInput,
        interruptReply,
        cleaningHistory,
        cleanCurrentHistory,
    } = useFridayAppRoom();
    const { fridayConfig, saveFridayConfig } = useFridaySettingRoom();
    const navigate = useNavigate();
    const { messageApi } = useMessageApi();
    const [mcpSheetOpen, setMcpSheetOpen] = useState(false);

    // 判断下当前是早上、晚上、还是下午，获取morning，afternoon，evening 字段
    const hour = new Date().getHours();
    let timeOfDay = 'afternoon';
    if (hour < 12) {
        timeOfDay = 'morning';
    } else if (hour >= 18) {
        timeOfDay = 'evening';
    }

    // 做个转化，从FridayReply[]到Reply[]

    const convertedReplies = replies.map((reply) => {
        return {
            replyId: reply.id,
            replyName: reply.name,
            replyRole: reply.role,
            createdAt: reply.startTimeStamp,
            finishedAt: reply.endTimeStamp,
            messages: [
                {
                    id: reply.id,
                    name: reply.name,
                    role: reply.role,
                    content: reply.content,
                    timestamp: reply.startTimeStamp,
                    metadata: {},
                } as Message,
            ],
        } as Reply;
    });

    const handleMcpSave = async (servers: MCPServer[]) => {
        if (fridayConfig) {
            const updatedConfig = {
                ...fridayConfig,
                mcpServers: servers,
            };
            const result = await saveFridayConfig(updatedConfig);
            if (result.success) {
                messageApi.success(t('message.friday.success-save-config'));
            } else {
                messageApi.error(result.message);
            }
        }
    };

    return (
        <div className="flex flex-row w-full h-full flex-1 bg-[rgb(246,247,248)]">
            <div className="flex flex-1 h-full justify-center">
                <AsChat
                    replies={convertedReplies}
                    isReplying={isReplying}
                    onSendClick={(blocksInput) => {
                        handleUserInput('You', 'user', blocksInput);
                    }}
                    disableSendBtn={cleaningHistory}
                    allowInterrupt={true}
                    onInterruptClick={interruptReply}
                    onBubbleClick={() => {}}
                    actions={
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={cleanCurrentHistory}
                        >
                            <Trash2Icon className="max-h-3 max-w-3" />
                            Clean history
                        </Button>
                    }
                    placeholder={t(`placeholder.input-friday-${timeOfDay}`)}
                    tooltips={{
                        sendButton: isReplying
                            ? t('tooltip.button.interrupt-reply')
                            : t('tooltip.button.send-message'),
                        interruptButton: t('tooltip.button.interrupt-reply'),
                        attachButton: t('tooltip.button.attachment-add'),
                        expandTextarea: t('tooltip.button.expand-textarea'),
                        voiceButton: t('tooltip.button.voice-button'),
                    }}
                    attachMaxFileSize={20 * 1024 * 1024}
                    onError={(error) => {
                        messageApi.error(error);
                    }}
                    attachAccept={['image/*', 'audio/*']}
                    userAvatarRight={false}
                />
            </div>
            <div className="flex w-[48px] h-full border-l border-l-border py-2 items-start gap-y-2 bg-white flex-col">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                        navigate(
                            `${RouterPath.FRIDAY}${RouterPath.FRIDAY_SETTING}`,
                            {
                                state: {
                                    autoNavigateToChat: false,
                                },
                            },
                        );
                    }}
                >
                    <SettingsIcon width={15} height={15} />
                </Button>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setMcpSheetOpen(true)}
                            className="flex flex-col items-center justify-center gap-0 hover:bg-accent p-1"
                        >
                            <Plug2Icon className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] font-semibold tracking-tight text-foreground leading-none">
                                MCP
                            </span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>{t('tooltip.button.mcp-management')}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            <MCPManagementSheet
                open={mcpSheetOpen}
                onOpenChange={setMcpSheetOpen}
                mcpServers={fridayConfig?.mcpServers || []}
                onSave={handleMcpSave}
            />
        </div>
    );
};

export default memo(ChatPage);
