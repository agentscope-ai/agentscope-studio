import { DataSource, DataSourceOptions } from 'typeorm';
import { MessageTable } from './models/Message';
import { RunTable } from './models/Run';
import { RunView } from './models/RunView';
import { SpanTable } from './models/Trace';
import { InputRequestTable } from './models/InputRequest';
import { RunDao } from './dao/Run';
import { InputRequestDao } from './dao/InputRequest';
import { ModelInvocationView } from './models/ModelInvocationView';
import { FridayAppMessageTable, FridayAppReplyTable } from './models/FridayApp';
import { FridayAppReplyView } from './models/FridayAppView';
import { ReplyTable } from './models/Reply';
import { migrations } from './migrations';

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
            synchronize: true, // 可以改回 true 了，因为表由 Migration 创建
            migrations: migrations,
            migrationsRun: true, // 自动运行迁移
            logging: false,
        };

        const dataSource = new DataSource(options);
        await dataSource.initialize();

        const printingOptions = {
            ...options,
            entities: undefined,
            migrations: undefined,
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
