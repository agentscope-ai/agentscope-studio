import { DataSource, DataSourceOptions } from 'typeorm';
import { InputRequestDao } from './dao/InputRequest';
import { RunDao } from './dao/Run';
import { migrations } from './migrations';
import { FridayAppMessageTable, FridayAppReplyTable } from './models/FridayApp';
import { FridayAppReplyView } from './models/FridayAppView';
import { InputRequestTable } from './models/InputRequest';
import { MessageTable } from './models/Message';
import { ModelInvocationView } from './models/ModelInvocationView';
import { ReplyTable } from './models/Reply';
import { RunTable } from './models/Run';
import { RunView } from './models/RunView';
import { SpanTable } from './models/Trace';
import { RuntimeConfig } from '../../shared/src';

export const initializeDatabase = async (
    databaseConfig: DataSourceOptions,
): Promise<void> => {
    try {
        const isSqlite = databaseConfig.type === 'better-sqlite3';

        // Portable tables (work on both sqlite and mysql).
        const baseEntities = [
            RunTable,
            MessageTable,
            ReplyTable,
            InputRequestTable,
            SpanTable,
            FridayAppMessageTable,
            FridayAppReplyTable,
        ];

        // These ViewEntities use SQLite-only SQL (strftime, recursive date(),
        // json_group_array, ...). They power dashboard/analytics only and are
        // NOT on the delivery path, so they are registered for sqlite only.
        // On MySQL they are skipped so the server can boot.
        const sqliteOnlyViews = [
            RunView,
            ModelInvocationView,
            FridayAppReplyView,
        ];

        const entities = isSqlite
            ? [...baseEntities, ...sqliteOnlyViews]
            : baseEntities;

        const options = {
            ...databaseConfig,
            entities,
            // synchronize/migrations are driven by RuntimeConfig. The bundled
            // migrations are SQLite-oriented, so they run for sqlite only.
            synchronize: RuntimeConfig.dbSynchronize,
            migrations: RuntimeConfig.dbRunMigrations ? migrations : [],
            migrationsRun: RuntimeConfig.dbRunMigrations,
            logging: false,
        };

        const dataSource = new DataSource(options as DataSourceOptions);
        await dataSource.initialize();

        const printingOptions = {
            ...options,
            entities: undefined,
            migrations: undefined,
            // Never expose database credentials in terminal or service logs.
            password:
                'password' in options && options.password
                    ? '<redacted>'
                    : undefined,
        };
        console.debug(
            `Database initialized with options: ${JSON.stringify(printingOptions, null, 2)}`,
        );
        console.debug('Refresh the database ...');
        await RunDao.updateRunStatusAtBeginning();
        await InputRequestDao.updateInputRequests();
        console.debug('Done');
    } catch (error) {
        console.error('Error initializing database', error);
        throw error;
    }
};
