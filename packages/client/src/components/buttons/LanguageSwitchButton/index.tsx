import { memo } from 'react';
import { Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

import EnglishIcon from '@/assets/svgs/lang-en.svg?react';
import ChineseIcon from '@/assets/svgs/lang-zh.svg?react';

import { useI18n } from '@/context/I18Context.tsx';

/**
 * Language switcher button that toggles between English and Chinese.
 * Displays the current language icon and allows users to switch languages.
 */
const LanguageSwitchButton = () => {
    const { changeLanguage, currentLanguage } = useI18n();
    const { t } = useTranslation();

    // Circular button styling for the language switcher
    const buttonStyle: React.CSSProperties = {
        border: 'none',
        borderRadius: '50%',
    };

    return (
        <Tooltip title={t('common.changeLanguage')}>
            <Button
                style={buttonStyle}
                icon={
                    currentLanguage === 'en' ? (
                        <EnglishIcon width={20} height={20} />
                    ) : (
                        <ChineseIcon width={20} height={20} />
                    )
                }
                onClick={changeLanguage}
            />
        </Tooltip>
    );
};

export default memo(LanguageSwitchButton);
