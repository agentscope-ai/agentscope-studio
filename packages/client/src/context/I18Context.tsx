import React, { createContext, useContext, useState, ReactNode } from 'react';
import i18n from 'i18next';
import type { Locale } from 'antd/es/locale';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';

interface I18nContextType {
    changeLanguage: () => void;
    currentLanguage: 'en' | 'zh';
    antdLocale: Locale;
}

const I18nContext = createContext<I18nContextType>({
    changeLanguage: () => {},
    currentLanguage: 'en',
    antdLocale: enUS,
});

export const I18nProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [english, setEnglish] = useState<boolean>(true);

    const changeLanguage = () => {
        if (english) {
            i18n.changeLanguage('zh').then();
        } else {
            i18n.changeLanguage('en').then();
        }
        setEnglish(!english);
    };

    return (
        <I18nContext.Provider
            value={{
                changeLanguage,
                currentLanguage: english ? 'en' : 'zh',
                antdLocale: english ? enUS : zhCN,
            }}
        >
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};
