import { DataSource, DataSourceOptions } from 'typeorm';
import { InputRequestDao } from './dao/InputRequest';
import { RunDao } from './dao/Run';
import { migrateSpanTable } from './database/migrateSpanTable';
import { FridayAppMessageTable, FridayAppReplyTable } from './models/FridayApp';
import { FridayAppReplyView } from './models/FridayAppView';
import { InputRequestTable } from './models/InputRequest';
import { MessageTable } from './models/Message';
import { ModelInvocationView } from './models/ModelInvocationView';
import { RunTable } from './models/Run';
import { RunView } from './models/RunView';
import { SpanTable } from './models/Trace';

export const initializeDatabase = async (databaseConfig: DataSourceOptions) => {
    try {
        console.log(
            '[Migration] Starting data migration before synchronize...',
        );
        await migrateSpanTable(databaseConfig);
        console.log('[Migration] Data migration completed successfully.');
    } catch (error) {
        console.error('[Migration] Error during data migration:', error);
        throw error;
    }

    try {
        const options = {
            ...databaseConfig,
            entities: [
                RunTable,
                RunView,
                MessageTable,
                InputRequestTable,
                SpanTable,
                ModelInvocationView,
                FridayAppMessageTable,
                FridayAppReplyTable,
                FridayAppReplyView,
            ],
            synchronize: true,
            logging: false,
        };
        const AppDataBase = new DataSource(options);

        await AppDataBase.initialize();

        const printingOptions = {
            ...options,
            entities: undefined,
        };
        console.log(
            `Database initialized with options: ${JSON.stringify(printingOptions, null, 2)}`,
        );

        console.log('Refresh the database ...');
        await RunDao.updateRunStatusAtBeginning();
        await InputRequestDao.updateInputRequests();
        console.log('Done');
    } catch (error) {
        console.error('Error initializing database', error);
        throw error;
    }
};
