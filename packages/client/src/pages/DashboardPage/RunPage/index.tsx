import { Splitter } from 'antd';
import { memo, useCallback, useEffect, useState } from 'react';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';

import ProjectRunSider from './ProjectRunSider';
import TracingComponent from './TracingComponent';

import AsChat from '@/components/chat/AsChat';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { ProjectRoomContextProvider } from '@/context/ProjectRoomContext';
import { RunRoomContextProvider, useRunRoom } from '@/context/RunRoomContext';
import { ContentBlocks } from '@shared/types';
import { InputRequestData, Reply } from '@shared/types/trpc';
import { isMacOs } from 'react-device-detect';
import { useTranslation } from 'react-i18next';
import { EmptyRunPage, ProjectNotFoundPage } from '../../DefaultPage';

const RunContentPage = () => {
    const [displayedReply, setDisplayedReply] = useState<Reply | null>(null);
    const [activateTab, setActiveTab] = useState<string>('statistics');
    const { replies, sendUserInputToServer, inputRequests } = useRunRoom();
    const [currentInputRequest, setCurrentInputRequest] =
        useState<InputRequestData | null>(null);
    const { t } = useTranslation();
    const { messageApi } = useMessageApi();

    // Handle the case when the displayed reply is changed
    useEffect(() => {
        setDisplayedReply((prevReply) => {
            if (!prevReply) {
                return prevReply;
            }
            if (
                !replies
                    .map((reply) => reply.replyId)
                    .includes(prevReply.replyId)
            ) {
                return null;
            } else {
                return prevReply;
            }
        });
    }, [replies]);

    // Pop the first input request to receive user input
    useEffect(() => {
        if (inputRequests.length > 0) {
            setCurrentInputRequest(inputRequests[0]);
        } else {
            setCurrentInputRequest(null);
        }
    }, [inputRequests]);

    /*
     * Callback when user clicks on a chat bubble
     *
     * @param reply - The reply associated with the clicked bubble
     *
     * @return void
     */
    const onBubbleClick = (reply: Reply) => {
        setDisplayedReply((prevReply) => {
            setActiveTab('message');
            if (prevReply?.replyId === reply.replyId) {
                return prevReply;
            }
            return reply;
        });
    };

    /*
     * Callback when user sends input in the chat component
     *
     * @param blocksInput - The content blocks input by the user
     * @param structuredInput - The structured input by the user, if any
     *
     * @return void
     */
    const onSendClick = useCallback(
        (
            blocksInput: ContentBlocks,
            structuredInput: Record<string, unknown> | null,
        ) => {
            if (currentInputRequest) {
                sendUserInputToServer(
                    currentInputRequest.requestId,
                    blocksInput,
                    structuredInput,
                );
            }
        },
        [currentInputRequest],
    );

    const placeholder = currentInputRequest
        ? t('placeholder.input-as-user', {
              name: currentInputRequest.agentName,
          })
        : t('placeholder.input-disable');

    const shortcutKeys = isMacOs ? 'Command + Enter' : 'fCtrl + Enter';

    return (
        <div
            className="flex flex-col flex-1 gap-4"
            style={{ minHeight: 0, height: 0 }}
        >
            <Splitter style={{ width: '100%' }}>
                <Splitter.Panel className="flex w-full justify-center bg-[rgb(246,247,248)]">
                    <AsChat
                        replies={replies}
                        isReplying={true}
                        onSendClick={onSendClick}
                        onBubbleClick={onBubbleClick}
                        disableSendBtn={inputRequests.length === 0}
                        allowInterrupt={false}
                        placeholder={placeholder}
                        tooltips={{
                            sendButton: currentInputRequest
                                ? t('tooltip.button.send-message', {
                                      shortcutKeys,
                                  })
                                : t('tooltip.button.send-message-disable'),
                            attachButton: t('tooltip.button.attachment-add'),
                            expandTextarea: t('tooltip.button.expand-textarea'),
                        }}
                        attachMaxFileSize={20 * 1024 * 1024} // 20 MB
                        attachAccept={['image/*', 'video/*', 'audio/*']}
                        onError={async (error) => {
                            messageApi.error(error);
                        }}
                    />
                </Splitter.Panel>
                <Splitter.Panel
                    collapsible={true}
                    defaultSize={400}
                    max={600}
                    min={400}
                >
                    <TracingComponent
                        activateTab={activateTab}
                        onTabChange={(key) => setActiveTab(key)}
                        reply={displayedReply}
                    />
                </Splitter.Panel>
            </Splitter>
        </div>
    );
};

const RunPage = () => {
    const { projectName } = useParams<{ projectName: string }>();
    const navigate = useNavigate();

    if (!projectName) {
        return <ProjectNotFoundPage />;
    }

    return (
        <ProjectRoomContextProvider project={projectName}>
            <div className="flex h-full w-full">
                <ProjectRunSider
                    onRunClick={(runId) =>
                        navigate(`/projects/${projectName}/runs/${runId}`, {
                            replace: true,
                        })
                    }
                />
                <main className="flex flex-col flex-1 h-full min-h-0 min-w-0">
                    <Routes>
                        <Route index element={<EmptyRunPage />} />
                        <Route path="runs" element={<EmptyRunPage />} />
                        <Route
                            path="runs/:runId"
                            element={
                                <RunRoomContextProvider>
                                    <RunContentPage />
                                </RunRoomContextProvider>
                            }
                        />
                    </Routes>
                </main>
            </div>
        </ProjectRoomContextProvider>
    );
};

export default memo(RunPage);
