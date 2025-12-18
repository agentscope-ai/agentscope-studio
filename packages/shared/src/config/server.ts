import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { APP_INFO, DEFAULT_CONFIG } from './common';

// Load environment variables
dotenv.config();

export const ENV = {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    platform: process.platform,
    homeDir: process.env.HOME || process.env.USERPROFILE || '',
} as const;

export const PATHS = {
    getAppDataDir: () => {
        switch (process.platform) {
            case 'win32':
                return path.join(process.env.APPDATA || '', APP_INFO.name);
            case 'linux':
                return path.join(process.env.HOME || '', APP_INFO.name);
            case 'darwin':
                return path.join(
                    process.env.HOME || '',
                    'Library',
                    'Application Support',
                    APP_INFO.name,
                );
            default:
                throw new Error(`Unsupported platform: ${process.platform}`);
        }
    },
    getLogsDir: () => path.join(PATHS.getAppDataDir(), 'logs'),
    getUserConfigPath: () => path.join(PATHS.getAppDataDir(), 'config.json'),
    getFridayDir: () => path.join(PATHS.getAppDataDir(), 'Friday'),
    getFridayConfigPath: () =>
        path.join(PATHS.getAppDataDir(), 'Friday', 'config.json'),
    getFridayDialogHistoryPath: () =>
        path.join(PATHS.getAppDataDir(), 'Friday', 'session.json'),
} as const;

export const ServerConfig = {
    port: parseInt(process.env.PORT || DEFAULT_CONFIG.server.port.toString()),
    otelGrpcPort: parseInt(
        process.env.OTEL_GRPC_PORT ||
            DEFAULT_CONFIG.server.otelGrpcPort.toString(),
    ),
    database: {
        type: 'sqlite' as const,
        database: path.join(PATHS.getAppDataDir(), 'database.sqlite'),
    },
} as const;

// 服务器端的配置管理
export class ConfigManager {
    private static instance: ConfigManager;
    private config: typeof ServerConfig;

    private constructor() {
        this.config = ServerConfig;
        this.loadUserConfig();
    }

    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private loadUserConfig() {
        const userConfigPath = PATHS.getUserConfigPath();
        try {
            if (fs.existsSync(userConfigPath)) {
                const userConfig = JSON.parse(
                    fs.readFileSync(userConfigPath, 'utf8'),
                );
                this.config = { ...this.config, ...userConfig };
            }
        } catch (error) {
            console.error('Failed to load user config:', error);
        }
    }

    getConfig() {
        return this.config;
    }

    saveConfig() {
        try {
            const userConfigPath = PATHS.getUserConfigPath();
            fs.mkdirSync(path.dirname(userConfigPath), { recursive: true });
            fs.writeFileSync(
                userConfigPath,
                JSON.stringify(this.config, null, 2),
            );
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    }

    async setPort(port: number) {
        this.config = {
            ...this.config,
            port: port,
        };
    }
    async setOtelGrpcPort(otelGrpcPort: number) {
        this.config = {
            ...this.config,
            otelGrpcPort: otelGrpcPort,
        };
    }
}
