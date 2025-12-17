import React, { createContext, useContext, useState, ReactNode } from 'react';
import i18n from 'i18next';

const I18nContext = createContext({
    changeLanguage: () => {},
    currentLanguage: 'en',
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
            value={{ changeLanguage, currentLanguage: english ? 'en' : 'zh' }}
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
