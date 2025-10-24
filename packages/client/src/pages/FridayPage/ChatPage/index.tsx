import { Button } from 'antd';
import AppChatComponent from '@/components/chat/AppChatComponent';
import { memo } from 'react';
import { useFridayAppRoom } from '@/context/FridayAppRoomContext.tsx';
import SettingIcon from '@/assets/svgs/setting.svg?react';
import { useNavigate } from 'react-router-dom';
import { RouterPath } from '@/pages/RouterPath';

const ChatPage = () => {
    const {
        replies,
        isReplying,
        handleUserInput,
        interruptReply,
        cleaningHistory,
        cleanCurrentHistory,
    } = useFridayAppRoom();
    const navigate = useNavigate();

    return (
        <div className="flex flex-row w-full h-full justify-center flex-1">
            <AppChatComponent
                replies={replies}
                isReplying={isReplying}
                onUserInput={(contentBlocks) => {
                    handleUserInput('user', 'user', contentBlocks);
                }}
                onInterruptReply={interruptReply}
                onCleanHistory={cleanCurrentHistory}
                isCleaningHistory={cleaningHistory}
            />
            <div className="flex w-[48px] h-full border-l border-l-border py-2 justify-center gap-y-2">
                <Button
                    icon={<SettingIcon width={15} height={15} />}
                    type={'text'}
                    onClick={() => {
                        navigate(
                            `${RouterPath.FRIDAY}/${RouterPath.FRIDAY_SETTING}`,
                            {
                                state: {
                                    autoNavigateToChat: false,
                                },
                            },
                        );
                    }}
                />
            </div>
        </div>
    );
};

export default memo(ChatPage);
