import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { APP_INFO, DEFAULT_CONFIG } from './common';

// npm workspace scripts run from the workspace directory (packages/server),
// while the project's .env file lives at the repository/package root. Resolve
// the file explicitly instead of relying only on process.cwd().
const envCandidates = [
    process.env.DOTENV_CONFIG_PATH
        ? path.resolve(process.env.DOTENV_CONFIG_PATH)
        : undefined,
    process.env.INIT_CWD
        ? path.resolve(process.env.INIT_CWD, '.env')
        : undefined,
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../../.env'),
].filter((candidate): candidate is string => Boolean(candidate));

const envPath = [...new Set(envCandidates)].find((candidate) =>
    fs.existsSync(candidate),
);

dotenv.config(envPath ? { path: envPath } : undefined);

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

// ---------------------------------------------------------------------------
// Database selection (production change)
//
// Default behaviour is unchanged: a local better-sqlite3 file. Set DB_TYPE=mysql
// (plus the DB_* vars below) to point Studio at a physical MySQL server for a
// horizontally-scalable deployment. A connection pool is configured for MySQL.
// ---------------------------------------------------------------------------
export type DbType = 'better-sqlite3' | 'mysql';

export const DB_TYPE: DbType =
    process.env.DB_TYPE === 'mysql' ? 'mysql' : 'better-sqlite3';

const buildDatabaseConfig = () => {
    if (DB_TYPE === 'mysql') {
        return {
            type: 'mysql' as const,
            host: process.env.DB_HOST || '127.0.0.1',
            port: parseInt(process.env.DB_PORT || '3306'),
            username: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'agentscope_studio',
            charset: 'utf8mb4',
            // Connection pool. The default TypeORM/mysql2 pool is ~10, which is
            // far too small for many concurrent runs. Tune via DB_POOL_SIZE.
            extra: {
                connectionLimit: parseInt(process.env.DB_POOL_SIZE || '50'),
            },
        };
    }
    return {
        type: 'better-sqlite3' as const,
        database: path.join(PATHS.getAppDataDir(), 'database.sqlite'),
    };
};

export const ServerConfig = {
    port: parseInt(process.env.PORT || DEFAULT_CONFIG.server.port.toString()),
    otelGrpcPort: parseInt(
        process.env.OTEL_GRPC_PORT ||
            DEFAULT_CONFIG.server.otelGrpcPort.toString(),
    ),
    database: buildDatabaseConfig(),
};

// ---------------------------------------------------------------------------
// Runtime knobs for production (production change)
// ---------------------------------------------------------------------------
export const RuntimeConfig = {
    // Schema sync. TypeORM's synchronize must NOT be used as a long-term
    // production strategy. We keep it on for sqlite (dev) and let MySQL default
    // to off unless explicitly enabled for first-boot bootstrap.
    dbSynchronize:
        process.env.DB_SYNCHRONIZE !== undefined
            ? process.env.DB_SYNCHRONIZE === 'true'
            : DB_TYPE === 'better-sqlite3',

    // Only the bundled migrations are SQLite-oriented, so they are run for
    // sqlite only. For MySQL, manage schema with your own migrations.
    dbRunMigrations: DB_TYPE === 'better-sqlite3',

    // Socket.IO: cap the per-message buffer (was Infinity) to avoid trivial
    // memory-exhaustion. Default 25 MB; tune via SOCKET_MAX_BUFFER_BYTES.
    socketMaxHttpBufferSize: parseInt(
        process.env.SOCKET_MAX_BUFFER_BYTES || String(25 * 1024 * 1024),
    ),

    // Force websocket-only by default so a multi-instance deployment behind a
    // load balancer does not require sticky sessions. Set to
    // "websocket,polling" if you must keep the long-polling fallback (then you
    // DO need sticky sessions at the LB).
    socketTransports: (process.env.SOCKET_TRANSPORTS || 'websocket').split(','),

    // Redis adapter for Socket.IO. When set, room broadcasts fan out across
    // every Studio instance, enabling horizontal scaling. e.g.
    // redis://localhost:6379
    redisUrl: process.env.REDIS_URL || '',

    // CORS origin for Socket.IO. Defaults to '*' (assumes an auth gateway sits
    // in front). Lock down with CORS_ORIGIN in production.
    corsOrigin: process.env.CORS_ORIGIN || '*',
};

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

    getDatabasePath(): string {
        return this.config.database.database;
    }

    getDatabaseSize(): number {
        try {
            const dbPath = this.getDatabasePath();
            if (fs.existsSync(dbPath)) {
                const stats = fs.statSync(dbPath);
                return stats.size;
            } else {
                return 0;
            }
        } catch (error) {
            console.error('Failed to get database size:', error);
            return 0;
        }
    }

    getFormattedDatabaseSize(): string {
        const sizeInBytes = this.getDatabaseSize();
        if (sizeInBytes === 0) {
            return '0 B';
        }
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = sizeInBytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        const decimalPlaces = unitIndex === 0 ? 0 : 2;
        const formattedSize = size.toFixed(decimalPlaces);

        return `${formattedSize} ${units[unitIndex]}`;
    }

    getDataStats(): {
        fridayConfigPath: string;
        path: string;
        size: number; // in bytes
        formattedSize: string; // formatted size with appropriate unit
        fridayHistoryPath: string;
    } {
        const dbPath = this.getDatabasePath();
        const size = this.getDatabaseSize();
        const formattedSize = this.getFormattedDatabaseSize();
        return {
            path: dbPath,
            size,
            formattedSize,
            fridayConfigPath: PATHS.getFridayConfigPath(),
            fridayHistoryPath: PATHS.getFridayDialogHistoryPath(),
        };
    }
}
