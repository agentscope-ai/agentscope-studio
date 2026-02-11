import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import './i18n/config';

// Suppress known harmless warnings from third-party libraries (antd-style/emotion, React/antd)
// 1. emotion `:first-child` SSR warning — irrelevant for this client-side SPA
// 2. React `flushSync` lifecycle warning — triggered internally by antd components
const _origConsoleError = console.error;
console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
        msg.includes(':first-child') &&
        msg.includes('potentially unsafe')
    ) {
        return;
    }
    if (
        msg.includes('flushSync') &&
        msg.includes('lifecycle')
    ) {
        return;
    }
    _origConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
