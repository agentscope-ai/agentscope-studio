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
import { EvaluationTable } from '@/models/evaluation/evaluation';
import { BenchmarkTable } from '@/models/evaluation/benchmark';

export const initializeDatabase = async (databaseConfig: DataSourceOptions) => {
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
                EvaluationTable,
                BenchmarkTable,
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
