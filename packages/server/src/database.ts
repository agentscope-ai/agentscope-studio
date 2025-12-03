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

export const initializeDatabase = async (
    databaseConfig: DataSourceOptions,
): Promise<void> => {
    try {
        const options = {
            ...databaseConfig,
            entities: [
                RunTable,
                RunView,
                MessageTable,
                ReplyTable,
                InputRequestTable,
                SpanTable,
                ModelInvocationView,
                FridayAppMessageTable,
                FridayAppReplyTable,
                FridayAppReplyView,
            ],
            synchronize: true,
            migrations: migrations,
            migrationsRun: true, // Run migrations automatically
            logging: false,
        };

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        const printingOptions = {
            ...options,
            entities: undefined,
            migrations: undefined,
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
