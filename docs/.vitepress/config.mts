import { defineConfig } from 'vitepress';

// Shared configuration
const sharedThemeConfig = {
    socialLinks: [
        {
            icon: 'github',
            link: 'https://github.com/agentscope-ai/agentscope-studio',
        },
    ],
};

// https://vitepress.dev/reference/site-config
export default defineConfig({
    srcDir: 'tutorial',

    title: 'AgentScope-Studio',
    description: 'A development-oriented visualization toolkit for AgentScope',

    rewrites: {
        'en/:rest*': ':rest*',
    },

    locales: {
        root: {
            label: 'English',
            lang: 'en',
            themeConfig: {
                ...sharedThemeConfig,
                nav: [
                    { text: 'Home', link: '/' },
                    { text: 'Tutorial', link: '/src/overview' },
                ],
                sidebar: [
                    {
                        text: 'Tutorial',
                        items: [
                            { text: 'Overview', link: '/src/overview' },
                            { text: 'Quick Start', link: '/src/quick_start' },
                            { text: 'Protocol', link: '/src/protocol' },
                            { text: 'Contributing', link: '/src/contributing' },
                        ],
                    },
                ],
            },
        },
        zh_CN: {
            label: '简体中文',
            lang: 'zh-CN',
            link: '/zh_CN/',
            themeConfig: {
                ...sharedThemeConfig,
                nav: [
                    { text: '首页', link: '/zh_CN/' },
                    { text: '教程', link: '/zh_CN/src/overview' },
                ],
                sidebar: [
                    {
                        text: '教程',
                        items: [
                            { text: '概览', link: '/zh_CN/src/overview' },
                            {
                                text: '快速开始',
                                link: '/zh_CN/src/quick_start',
                            },
                            { text: '协议', link: '/zh_CN/src/protocol' },
                            {
                                text: '贡献指南',
                                link: '/zh_CN/src/contributing',
                            },
                        ],
                    },
                ],
            },
        },
    },
});
