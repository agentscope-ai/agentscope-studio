import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useEffect,
} from 'react';
import i18n from 'i18next';

type Language = 'en' | 'zh';
interface I18nContextType {
    currentLanguage: Language;
    setCurrentLanguage: (lang: Language) => void;
}
const I18nContext = createContext<I18nContextType | undefined>(undefined);
export const I18nProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
        const savedLanguage = localStorage.getItem('language');
        return (savedLanguage as Language) || 'en';
    });

    useEffect(() => {
        i18n.changeLanguage(currentLanguage).then();
        localStorage.setItem('language', currentLanguage);
    }, [currentLanguage]);

    return (
        <I18nContext.Provider value={{ currentLanguage, setCurrentLanguage }}>
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
