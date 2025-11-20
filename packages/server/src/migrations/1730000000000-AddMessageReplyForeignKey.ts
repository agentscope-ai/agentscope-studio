import {
    MigrationInterface,
    QueryRunner,
    Table,
    TableColumn,
    TableForeignKey,
} from 'typeorm';

/**
 * 迁移：添加 Reply 表并建立 Message 的外键关系
 *
 * 任务：
 * 1. 创建 reply_table
 * 2. 迁移历史数据：为所有 replyId 创建对应的 Reply 记录
 * 3. 将 message_table.replyId 改为不可空的外键
 */
export class AddMessageReplyForeignKey1730000000000
    implements MigrationInterface
{
    name = 'AddMessageReplyForeignKey1730000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('开始迁移：添加 Reply 表并建立外键关系...');

        // ========================================
        // 步骤 1: 创建 reply_table
        // ========================================
        console.log('步骤 1: 创建 reply_table...');

        await queryRunner.createTable(
            new Table({
                name: 'reply_table',
                columns: [
                    {
                        name: 'replyId', // 保持驼峰，与 message_table 一致
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
                        name: 'run_id', // 保持下划线，与其他表一致
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

        // 添加 run_id 的外键
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

        console.log('reply_table 创建成功');

        // ========================================
        // 步骤 2: 迁移历史数据
        // ========================================
        console.log('步骤 2: 迁移历史数据到 reply_table...');

        // 查询所有消息（注意：列名是 replyId 驼峰）
        const allMessages = await queryRunner.query(
            `SELECT id, run_id, msg, replyId FROM message_table ORDER BY id`,
        );

        console.log(`找到 ${allMessages.length} 条消息需要处理`);

        // 收集所有唯一的 Reply 信息
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
            `需要创建 ${replyMap.size} 个 Reply 记录，更新 ${nullReplyCount} 条消息`,
        );

        // 批量插入 Reply 记录
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
                    `进度：已插入 ${insertedCount}/${replyMap.size} 个 Reply`,
                );
            }
        }

        console.log(`已创建 ${insertedCount} 个 Reply 记录`);

        // 批量更新 replyId 为 NULL 的消息
        if (nullReplyCount > 0) {
            console.log(`开始更新 ${nullReplyCount} 条消息的 replyId...`);
            await queryRunner.query(
                `UPDATE message_table SET replyId = id WHERE replyId IS NULL OR replyId = ''`,
            );
            console.log(`已更新 ${nullReplyCount} 条消息`);
        }

        // ========================================
        // 步骤 3: 验证数据完整性
        // ========================================
        console.log('步骤 3: 验证数据...');

        const nullCount = await queryRunner.query(
            `SELECT COUNT(*) as count FROM message_table WHERE replyId IS NULL OR replyId = ''`,
        );

        const count = nullCount[0].count || nullCount[0].COUNT;
        if (count > 0) {
            throw new Error(
                `数据迁移失败：仍有 ${count} 条消息的 replyId 为空`,
            );
        }

        console.log('验证通过：所有消息都有 replyId');

        // ========================================
        // 步骤 4: 添加外键约束
        // ========================================
        console.log('步骤 4: 添加外键约束...');

        // 先将列改为不可空
        await queryRunner.changeColumn(
            'message_table',
            'replyId', // 注意：保持驼峰命名
            new TableColumn({
                name: 'replyId',
                type: 'varchar',
                isNullable: false,
            }),
        );

        // 添加外键约束
        await queryRunner.createForeignKey(
            'message_table',
            new TableForeignKey({
                name: 'FK_message_reply',
                columnNames: ['replyId'], // message_table 中的列名（驼峰）
                referencedTableName: 'reply_table',
                referencedColumnNames: ['replyId'], // reply_table 中的列名（驼峰）
                onDelete: 'CASCADE',
            }),
        );

        console.log('外键约束添加成功');
        console.log('✅ 迁移完成！');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('开始回滚迁移...');

        // 删除外键约束
        const messageTable = await queryRunner.getTable('message_table');
        const foreignKey = messageTable?.foreignKeys.find((fk) =>
            fk.columnNames.includes('replyId'),
        );

        if (foreignKey) {
            await queryRunner.dropForeignKey('message_table', foreignKey);
        }

        // 将列改回可空
        await queryRunner.changeColumn(
            'message_table',
            'replyId',
            new TableColumn({
                name: 'replyId',
                type: 'varchar',
                isNullable: true,
            }),
        );

        // 将 Message 的 replyId 设为 NULL
        await queryRunner.query(`UPDATE message_table SET replyId = NULL`);

        // 删除 reply_table
        await queryRunner.dropTable('reply_table', true);

        console.log('✅ 回滚完成');
    }
}
