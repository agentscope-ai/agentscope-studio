import { ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import './App.css';
import { I18nProvider } from './context/I18Context.tsx';
import { MessageApiContextProvider } from './context/MessageApiContext.tsx';
import { NotificationContextProvider } from './context/NotificationContext.tsx';
import { SocketContextProvider } from './context/SocketContext.tsx';
import HomePage from './pages/HomePage';

function App() {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorText: 'var(--foreground)',
                    colorTextSecondary: 'var(--muted-foreground)',
                    colorInfo: 'var(--primary)',
                    colorPrimary: 'var(--primary)',
                    colorPrimaryBorder: 'var(--border)',
                    colorPrimaryHover: 'var(--primary)',
                    fontFamily:
                        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFon, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif',

                    // For Button
                    colorBgSolidActive: 'var(--primary-700)',
                    colorBgSolidHover: 'var(--primary-800)',
                },
                components: {
                    Table: {
                        headerBg: 'var(--muted)',
                        headerColor: 'var(--muted-foreground)',
                        headerBorderRadius: 5,
                    },
                    Tabs: {
                        titleFontSizeSM: 12,
                    },
                    Tree: {
                        nodeSelectedColor: 'white',
                    },
                    Menu: {
                        itemSelectedColor: 'var(--sidebar-primary-foreground)',
                        itemSelectedBg: 'var(--sidebar-primary)',
                        itemColor: 'var(--sidebar-foreground)',
                        groupTitleColor: 'var(--muted-foreground)',
                        groupTitleFontSize: 12,
                        itemBg: 'transparent',
                    },
                    Layout: {
                        headerBg: 'var(--background)',
                        siderBg: 'var(--sidebar)',
                        bodyBg: 'var(--background)',
                    },
                    Collapse: {
                        headerBg: 'var(--primary-800)',
                        colorTextHeading: 'var(--primary-50)',
                        contentPadding: '0 !important',
                    },
                    Input: {
                        activeShadow: 'none',
                    },
                    InputNumber: {
                        activeShadow: 'none',
                    },
                    Select: {
                        activeOutlineColor: 'none',
                    },
                    Tooltip: {
                        colorBgSpotlight: 'var(--popover)',
                        colorText: 'var(--popover-foreground)',
                        colorTextLightSolid: 'var(--popover-foreground)',
                    },
                    Button: {
                        // primaryColor: 'var(--primary-foreground)',
                        primaryShadow: 'none',
                        contentFontSize: 12,
                        contentFontSizeLG: 13,
                        contentFontSizeSM: 11,
                        borderColorDisabled: 'var(--border)',
                        solidTextColor: 'var(--primary-foreground)',

                        defaultBg: 'var(--secondary)',
                        defaultColor: 'var(--secondary-foreground)',

                        defaultHoverBg: 'var(--secondary-hover)',
                        defaultHoverColor: 'var(--secondary-hover-foreground)',

                        defaultActiveBg: 'var(--secondary-active)',
                        defaultActiveColor:
                            'var(--secondary-active-foreground)',

                        defaultBorderColor: 'var(--border)',
                        defaultHoverBorderColor: 'var(--border)',
                        defaultActiveBorderColor: 'var(--border)',

                        fontWeight: 500,

                        // with icon and text
                        paddingInline: 13,
                    },
                    Statistic: {
                        contentFontSize: 14,
                        titleFontSize: 12,
                    },
                },
            }}
        >
            <MessageApiContextProvider>
                <NotificationContextProvider>
                    <SocketContextProvider>
                        <I18nProvider>
                            <BrowserRouter>
                                <HomePage />
                            </BrowserRouter>
                        </I18nProvider>
                    </SocketContextProvider>
                </NotificationContextProvider>
            </MessageApiContextProvider>
        </ConfigProvider>
    );
}

export default App;
