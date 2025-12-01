export const APP_INFO = {
    name: 'AgentScope-Studio',
    version: '1.0.0',
    description: 'Your app description',
} as const;

export const DEFAULT_CONFIG = {
    server: {
        port: 3000,
        grpcPort: 4317,
        host: 'localhost',
    },
} as const;
