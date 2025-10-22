import { memo, useEffect, useState } from 'react';
import { Flex, Layout, Splitter } from 'antd';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';

import TracingComponent from './TracingComponent';
import ProjectRunSider from './ProjectRunSider';
import ChatComponent from '@/components/chat/ChatComponent';

import { MessageData } from '@shared/types/trpc';
import { ProjectRoomContextProvider } from '@/context/ProjectRoomContext';
import { EmptyRunPage, ProjectNotFoundPage } from '../../DefaultPage';
import { RunRoomContextProvider, useRunRoom } from '@/context/RunRoomContext';

const RunContentPage = () => {
    const [displayedMsg, setDisplayedMsg] = useState<MessageData | null>(null);
    const [activateTab, setActiveTab] = useState<string>('statistics');
    const { messages, inputRequests, sendUserInputToServer } = useRunRoom();

    useEffect(() => {
        setDisplayedMsg((prevDisplayedMsg) => {
            if (!prevDisplayedMsg) {
                return prevDisplayedMsg;
            }
            if (!messages.map((msg) => msg.id).includes(prevDisplayedMsg.id)) {
                return null;
            } else {
                return prevDisplayedMsg;
            }
        });
    }, [messages]);

    const onMsgBubbleClick = (msg: MessageData) => {
        setDisplayedMsg((prevMsg) => {
            setActiveTab('message');
            if (prevMsg?.id === msg.id) {
                return prevMsg;
            }
            return msg;
        });
    };

    return (
        <Flex
            style={{
                minHeight: 0,
                height: 0,
            }}
            flex={1}
            vertical={true}
            gap="middle"
        >
            <Splitter style={{ width: '100%' }}>
                <Splitter.Panel className="flex w-full justify-center">
                    <ChatComponent
                        messages={messages}
                        onMsgBubbleClick={onMsgBubbleClick}
                        inputRequests={inputRequests}
                        onUserInput={sendUserInputToServer}
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
                        msg={displayedMsg}
                    />
                </Splitter.Panel>
            </Splitter>
        </Flex>
    );
};

const RunPage = () => {
    const { Content } = Layout;
    const { projectName } = useParams<{ projectName: string }>();
    const navigate = useNavigate();

    if (!projectName) {
        return <ProjectNotFoundPage />;
    }

    return (
        <ProjectRoomContextProvider project={projectName}>
            <Layout>
                <ProjectRunSider
                    onRunClick={(runId) =>
                        navigate(
                            `/dashboard/projects/${projectName}/runs/${runId}`,
                            {
                                replace: true,
                            },
                        )
                    }
                />
                <Content>
                    <Flex
                        flex={1}
                        style={{
                            height: '100%',
                            minHeight: 0,
                        }}
                        vertical={true}
                    >
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
                    </Flex>
                </Content>
            </Layout>
        </ProjectRoomContextProvider>
    );
};

export default memo(RunPage);
