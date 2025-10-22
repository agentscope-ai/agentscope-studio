import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import react from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
    { ignores: ['dist'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: './tsconfig.app.json',
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            react: react,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            'jsx-quotes': ['error', 'prefer-double'],
            quotes: ['error', 'single'],
            // Force string literals to be enclosed in double quotes instead of curly braces
            'react/jsx-curly-brace-presence': [
                'error',
                {
                    props: 'never', // Do not use curly braces to wrap string literals in attribute values
                    children: 'never', // Do not use curly braces to wrap string literals in child elements
                },
            ],
        },
    },
);
