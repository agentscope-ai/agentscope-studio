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
    base: '/agentscope-studio/',

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
                    { text: 'Tutorial', link: '/tutorial/overview' },
                ],
                sidebar: [
                    {
                        text: 'Tutorial',
                        items: [
                            {
                                text: 'Overview',
                                link: '/tutorial/overview',
                            },
                            {
                                text: 'Quick Start',
                                link: '/tutorial/quick_start',
                            },
                            {
                                text: 'Contributing',
                                link: '/tutorial/contributing',
                            },
                        ],
                    },
                    {
                        text: 'Develop',
                        items: [
                            { text: 'Project', link: '/develop/project' },
                            { text: 'Tracing', link: '/develop/tracing' },
                            {
                                text: 'Evaluation',
                                link: '/develop/evaluation',
                            },
                        ],
                    },
                    {
                        text: 'Agent',
                        items: [{ text: 'Friday', link: '/agent/friday' }],
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
                    { text: '教程', link: '/zh_CN/tutorial/overview' },
                ],
                sidebar: [
                    {
                        text: '教程',
                        items: [
                            {
                                text: '概览',
                                link: '/zh_CN/tutorial/overview',
                            },
                            {
                                text: '快速开始',
                                link: '/zh_CN/tutorial/quick_start',
                            },
                            {
                                text: '贡献指南',
                                link: '/zh_CN/tutorial/contributing',
                            },
                        ],
                    },
                    {
                        text: '开发',
                        items: [
                            {
                                text: '项目管理',
                                link: '/zh_CN/develop/project',
                            },
                            {
                                text: '运行追踪',
                                link: '/zh_CN/develop/tracing',
                            },
                            {
                                text: '应用评测',
                                link: '/zh_CN/develop/evaluation',
                            },
                        ],
                    },
                    {
                        text: '智能体',
                        items: [
                            { text: 'Friday', link: '/zh_CN/agent/friday' },
                        ],
                    },
                ],
            },
        },
    },
});
