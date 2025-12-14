import { readFileSync } from 'fs';
import path from 'path';

const getVersion = (): string => {
    let version = '';
    try {
        const packageJsonPath = path.join(
            __dirname,
            '../../../../',
            'package.json',
        );
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        version = packageJson.version || '';
    } catch (error) {
        console.warn('Failed to read version from package.json:', error);
    }
    return version;
};

export const APP_INFO = {
    name: 'AgentScope-Studio',
    version: getVersion(),
    description: 'Your app description',
} as const;

export const DEFAULT_CONFIG = {
    server: {
        port: 3000,
        otelGrpcPort: 4317,
        host: 'localhost',
    },
} as const;
