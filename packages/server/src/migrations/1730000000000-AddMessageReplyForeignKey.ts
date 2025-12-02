import {
    MigrationInterface,
    QueryRunner,
    Table,
    TableColumn,
    TableForeignKey,
} from 'typeorm';

/**
 * Migration: Add Reply table and establish foreign key relationship with Message
 *
 * Tasks:
 * 1. Create reply_table
 * 2. Migrate historical data: create Reply records for all replyIds
 * 3. Change message_table.replyId to a non-nullable foreign key
 */
export class AddMessageReplyForeignKey1730000000000
    implements MigrationInterface
{
    name = 'AddMessageReplyForeignKey1730000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log(
            'Starting migration: Adding Reply table and establishing foreign key relationship...',
        );

        // ========================================
        // Step 0: Check current database state
        // ========================================
        const messageTableExists = await queryRunner.hasTable('message_table');

        console.log(`Database state check:`);
        console.log(`  - message_table exists: ${messageTableExists}`);

        // Scenario 1: First-time installation - message_table does not exist
        // TypeORM will create all tables from entity definitions, including foreign key relationships
        if (!messageTableExists) {
            console.log(
                '⏭️  message_table does not exist. Skipping migration (first-time installation).',
            );
            console.log(
                '   TypeORM will create all tables from entity definitions.',
            );
            return;
        }

        // Scenario 2: Check if migration is already completed
        // If foreign key constraint exists, migration has already been completed
        const messageTable = await queryRunner.getTable('message_table');
        const hasForeignKey = messageTable?.foreignKeys.some(
            (fk) =>
                fk.columnNames.includes('replyId') &&
                fk.referencedTableName === 'reply_table',
        );

        if (hasForeignKey) {
            console.log(
                '✅ Foreign key constraint already exists. Migration already completed.',
            );
            return;
        }

        // ========================================
        // Step 1: Create reply_table
        // ========================================
        console.log('Step 1: Creating reply_table...');

        await queryRunner.createTable(
            new Table({
                name: 'reply_table',
                columns: [
                    {
                        name: 'replyId', // Keep camelCase, consistent with message_table
                        type: 'varchar',
                        isPrimary: true,
                    },
                    {
                        name: 'replyRole',
                        type: 'varchar',
                    },
                    {
                        name: 'replyName',
                        type: 'varchar',
                    },
                    {
                        name: 'run_id', // Keep underscore, consistent with other tables
                        type: 'varchar',
                    },
                    {
                        name: 'createdAt',
                        type: 'varchar',
                    },
                    {
                        name: 'finishedAt',
                        type: 'varchar',
                        isNullable: true,
                    },
                ],
            }),
            true, // ifNotExists
        );

        // Add foreign key for run_id
        await queryRunner.createForeignKey(
            'reply_table',
            new TableForeignKey({
                name: 'FK_reply_run',
                columnNames: ['run_id'],
                referencedTableName: 'run_table',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        console.log('reply_table created successfully');

        // ========================================
        // Step 2: Migrate historical data
        // ========================================
        console.log('Step 2: Migrating historical data to reply_table...');

        // Query all messages (Note: column name is replyId in camelCase)
        const allMessages = await queryRunner.query(
            `SELECT id, run_id, msg, replyId FROM message_table ORDER BY id`,
        );

        console.log(`Found ${allMessages.length} messages to process`);

        // Collect all unique Reply information
        const replyMap = new Map<
            string,
            {
                replyId: string;
                role: string;
                name: string;
                runId: string;
                createdAt: string;
                finishedAt: string;
            }
        >();

        let nullReplyCount = 0;

        for (const message of allMessages) {
            const msgData =
                typeof message.msg === 'string'
                    ? JSON.parse(message.msg)
                    : message.msg;

            const role = msgData.role || 'unknown';
            const name = msgData.name || role;
            const timestamp = msgData.timestamp || new Date().toISOString();

            const hasReplyId = message.replyId && message.replyId !== '';
            const replyIdToUse = hasReplyId ? message.replyId : message.id;

            if (!replyMap.has(replyIdToUse)) {
                replyMap.set(replyIdToUse, {
                    replyId: replyIdToUse,
                    role,
                    name,
                    runId: message.run_id,
                    createdAt: timestamp,
                    finishedAt: timestamp,
                });
            } else {
                const existing = replyMap.get(replyIdToUse)!;
                if (timestamp > existing.finishedAt) {
                    existing.finishedAt = timestamp;
                    existing.role = role;
                    existing.name = name;
                }
            }

            if (!hasReplyId) {
                nullReplyCount++;
            }
        }

        console.log(
            `Need to create ${replyMap.size} Reply records, update ${nullReplyCount} messages`,
        );

        // Batch insert Reply records
        let insertedCount = 0;
        for (const reply of replyMap.values()) {
            await queryRunner.query(
                `INSERT INTO reply_table (replyId, replyRole, replyName, run_id, createdAt, finishedAt) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    reply.replyId,
                    reply.role,
                    reply.name,
                    reply.runId,
                    reply.createdAt,
                    reply.finishedAt,
                ],
            );
            insertedCount++;

            if (insertedCount % 100 === 0) {
                console.log(
                    `Progress: Inserted ${insertedCount}/${replyMap.size} Replies`,
                );
            }
        }

        console.log(`Created ${insertedCount} Reply records`);

        // Batch update messages with NULL replyId
        if (nullReplyCount > 0) {
            console.log(
                `Starting to update replyId for ${nullReplyCount} messages...`,
            );
            await queryRunner.query(
                `UPDATE message_table SET replyId = id WHERE replyId IS NULL OR replyId = ''`,
            );
            console.log(`Updated ${nullReplyCount} messages`);
        }

        // ========================================
        // Step 3: Validate data integrity
        // ========================================
        console.log('Step 3: Validating data...');

        const nullCount = await queryRunner.query(
            `SELECT COUNT(*) as count FROM message_table WHERE replyId IS NULL OR replyId = ''`,
        );

        const count = nullCount[0].count || nullCount[0].COUNT;
        if (count > 0) {
            throw new Error(
                `Data migration failed: ${count} messages still have empty replyId`,
            );
        }

        console.log('Validation passed: All messages have replyId');

        // ========================================
        // Step 4: Add foreign key constraint
        // ========================================
        console.log('Step 4: Adding foreign key constraint...');

        // First change column to non-nullable
        await queryRunner.changeColumn(
            'message_table',
            'replyId', // Note: Keep camelCase naming
            new TableColumn({
                name: 'replyId',
                type: 'varchar',
                isNullable: false,
            }),
        );

        // Add foreign key constraint
        await queryRunner.createForeignKey(
            'message_table',
            new TableForeignKey({
                name: 'FK_message_reply',
                columnNames: ['replyId'], // Column name in message_table (camelCase)
                referencedTableName: 'reply_table',
                referencedColumnNames: ['replyId'], // Column name in reply_table (camelCase)
                onDelete: 'CASCADE',
            }),
        );

        console.log('Foreign key constraint added successfully');
        console.log('✅ Migration completed!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('Starting migration rollback...');

        // Drop foreign key constraint
        const messageTable = await queryRunner.getTable('message_table');
        const foreignKey = messageTable?.foreignKeys.find((fk) =>
            fk.columnNames.includes('replyId'),
        );

        if (foreignKey) {
            await queryRunner.dropForeignKey('message_table', foreignKey);
        }

        // Change column back to nullable
        await queryRunner.changeColumn(
            'message_table',
            'replyId',
            new TableColumn({
                name: 'replyId',
                type: 'varchar',
                isNullable: true,
            }),
        );

        // Set Message replyId to NULL
        await queryRunner.query(`UPDATE message_table SET replyId = NULL`);

        // Drop reply_table
        await queryRunner.dropTable('reply_table', true);

        console.log('✅ Rollback completed');
    }
}
