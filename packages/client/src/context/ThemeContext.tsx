import { createContext, useCallback, useContext, useState } from 'react';

import { ThemeColors } from '../theme/color.ts';
import { updateCSSVariables } from '../theme/utils.ts';

const defaultTheme: ThemeColors = {
    primary: '#',
};

interface ThemeContextType {
    colors: ThemeColors;
    setThemeColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    colors: defaultTheme,
    setThemeColor: () => {},
});

export function ThemeContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [colors, setColors] = useState<ThemeColors>(defaultTheme);

    const setThemeColor = useCallback(
        (newPrimaryColor: string) => {
            const newColors = {
                ...colors,
                primary: newPrimaryColor,
            };
            setColors(newColors);
            updateCSSVariables(newColors);
        },
        [colors],
    );

    return (
        <ThemeContext.Provider value={{ colors, setThemeColor }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
