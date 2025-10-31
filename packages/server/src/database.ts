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
        // Step 1: Create a temporary connection to check if migration is needed
        const tempOptions = {
            ...databaseConfig,
            entities: [],
            synchronize: false,
            logging: false,
        };
        const tempDataSource = new DataSource(tempOptions);
        await tempDataSource.initialize();

        // Step 2: Check if data migration is needed BEFORE synchronize
        let needsMigration = false;
        try {
            const queryRunner = tempDataSource.createQueryRunner();
            await queryRunner.connect();

            const tableExists = await queryRunner.hasTable('span_table');
            if (tableExists) {
                const table = await queryRunner.getTable('span_table');
                const hasInstrumentationVersion = table?.findColumnByName('instrumentationVersion') !== undefined;
                needsMigration = !hasInstrumentationVersion;
            }

            await queryRunner.release();
        } catch (error) {
            console.error('[Migration] Error checking migration status:', error);
        } finally {
            await tempDataSource.destroy();
        }

        // Step 3: If migration is needed, do it BEFORE synchronize
        if (needsMigration) {
            console.log('[Migration] Starting data migration before synchronize...');
            const migrationDataSource = new DataSource({
                ...databaseConfig,
                entities: [SpanTable],
                synchronize: false,
                logging: false,
            });
            await migrationDataSource.initialize();

            try {
                await migrateSpanTable(migrationDataSource);
                console.log('[Migration] Data migration completed successfully.');
            } catch (error) {
                console.error('[Migration] Error during data migration:', error);
                await migrationDataSource.destroy();
                throw error; // Fail if migration fails
            } finally {
                await migrationDataSource.destroy();
            }
        }

        // Step 4: Now initialize with synchronize (will only adjust schema, data is already migrated)
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
