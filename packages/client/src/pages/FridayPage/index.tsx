import { memo } from 'react';
import { Layout } from 'antd';
import { Route, Routes } from 'react-router-dom';

import ChatPage from '@/pages/FridayPage/ChatPage';
import SettingPage from '@/pages/FridayPage/SettingPage';
import TitleBar from '@/components/titlebar/TitleBar.tsx';

import { RouterPath } from '@/pages/RouterPath.ts';
import { FridayAppRoomContextProvider } from '@/context/FridayAppRoomContext.tsx';
import { FridaySettingRoomContextProvider } from '@/context/FridaySettingRoomContext.tsx';

const FridayPage = () => {
    const { Content } = Layout;

    return (
        <Layout style={{ width: '100%', height: '100%' }}>
            <TitleBar title="AgentScope Friday" />
            <Content>
                <Routes>
                    <Route
                        path={RouterPath.FRIDAY_CHAT}
                        element={
                            <FridayAppRoomContextProvider>
                                <ChatPage />
                            </FridayAppRoomContextProvider>
                        }
                    />
                    <Route
                        path={RouterPath.FRIDAY_SETTING}
                        element={
                            <FridaySettingRoomContextProvider>
                                <SettingPage />
                            </FridaySettingRoomContextProvider>
                        }
                    />
                </Routes>
            </Content>
        </Layout>
    );
};

export default memo(FridayPage);
