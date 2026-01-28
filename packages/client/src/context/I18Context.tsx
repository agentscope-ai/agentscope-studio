import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import i18n from 'i18next';

const I18nContext = createContext({
    changeLanguage: () => {},
    currentLanguage: 'en',
});

export const I18nProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
        const savedLanguage = localStorage.getItem('language');
        return savedLanguage || 'en';
    });

    useEffect(() => {
        i18n.changeLanguage(currentLanguage).then();
        localStorage.setItem('language', currentLanguage);
    }, [currentLanguage]);

    const changeLanguage = () => {
        const newLanguage = currentLanguage === 'en' ? 'zh' : 'en';
        i18n.changeLanguage(newLanguage).then();
        setCurrentLanguage(newLanguage);
        localStorage.setItem('language', newLanguage);
    };

    return (
        <I18nContext.Provider
            value={{ changeLanguage, currentLanguage }}
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
