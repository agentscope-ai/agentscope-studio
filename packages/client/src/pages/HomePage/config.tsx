import { GlobeIcon, DatabaseIcon } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface SettingsMenuItem {
    value: string;
    labelKey: string;
    descriptionKey: string;
    icon: LucideIcon;
}

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
];
