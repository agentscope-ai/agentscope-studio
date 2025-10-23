import { Button } from 'antd';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import SettingIcon from '@/assets/svgs/setting.svg?react';
import AppChatComponent from '@/components/chat/AppChatComponent';

import { RouterPath } from '@/pages/RouterPath';
import { useFridayAppRoom } from '@/context/FridayAppRoomContext.tsx';

const ChatPage = () => {
    const {
        replies,
        isReplying,
        handleUserInput,
        moreReplies,
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
                moreReplies={moreReplies}
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
                    type="text"
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
