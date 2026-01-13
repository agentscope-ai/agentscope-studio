import {
    GlobeIcon,
    DatabaseIcon,
    BookOpenIcon,
    BotIcon,
    ChartColumnStackedIcon,
    FolderGit2Icon,
    RouteIcon,
    UnplugIcon,
    Package,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { ComponentType, SVGProps } from 'react';

import DingTalkIcon from '@/assets/svgs/dingtalk.svg?react';
import GitHubIcon from '@/assets/svgs/github.svg?react';
import DiscordIcon from '@/assets/svgs/discord.svg?react';

import { RouterPath } from '@/pages/RouterPath.ts';

export interface SettingsMenuItem {
    value: string;
    labelKey: string;
    descriptionKey: string;
    icon: LucideIcon;
}

/**
 * Settings menu items configuration for the settings dialog
 * Each item contains the tab value, i18n keys for label and description, and the icon component
 */
export const settingsMenuItems: SettingsMenuItem[] = [
    {
        value: 'language',
        labelKey: 'settings.language',
        descriptionKey: 'settings.language-description',
        icon: GlobeIcon,
    },
    {
        value: 'data',
        labelKey: 'settings.data-management',
        descriptionKey: 'settings.data-management-description',
        icon: DatabaseIcon,
    },
    {
        value: 'version',
        labelKey: 'settings.version',
        descriptionKey: 'settings.version-description',
        icon: Package,
    },
];

/**
 * Sidebar menu item interface
 * Represents a single menu item in the sidebar navigation
 */
export interface SidebarSubItem {
    title: string;
    icon: LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;
    url: string;
}

/**
 * Sidebar group interface
 * Represents a group of related menu items with a title
 */
export interface SidebarGroup {
    title: string;
    items: SidebarSubItem[];
}

/**
 * Sidebar navigation items configuration
 * Defines the main navigation structure for the application sidebar
 * Groups include: Develop, Agent, Document, and Contact sections
 * Note: titleKey is the i18n translation key that will be resolved at runtime using t(titleKey)
 */
export const getSidebarItems = (t: (key: string) => string): SidebarGroup[] => [
    {
        title: t('common.develop'),
        items: [
            {
                title: t('common.overview'),
                icon: ChartColumnStackedIcon,
                url: RouterPath.OVERVIEW,
            },
            {
                title: t('common.projects'),
                icon: FolderGit2Icon,
                url: RouterPath.PROJECTS,
            },
            {
                title: t('common.traces'),
                icon: RouteIcon,
                url: RouterPath.TRACING,
            },
        ],
    },
    {
        title: t('common.agent'),
        items: [
            {
                title: t('common.friday'),
                icon: BotIcon,
                url: RouterPath.FRIDAY,
            },
        ],
    },
    {
        title: t('common.document'),
        items: [
            {
                title: t('common.tutorial'),
                icon: BookOpenIcon,
                url: RouterPath.TUTORIAL,
            },
            {
                title: t('common.api'),
                icon: UnplugIcon,
                url: RouterPath.API,
            },
        ],
    },
    {
        title: t('common.contact'),
        items: [
            {
                title: t('common.github'),
                icon: GitHubIcon,
                url: RouterPath.GITHUB,
            },
            {
                title: t('common.dingtalk'),
                icon: DingTalkIcon,
                url: RouterPath.DINGTALK,
            },
            {
                title: t('common.discord'),
                icon: DiscordIcon,
                url: RouterPath.DISCORD,
            },
        ],
    },
];
