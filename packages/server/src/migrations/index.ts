/**
 * 迁移管理中心
 *
 * 所有迁移文件在这里统一管理和导出
 * 添加新迁移时，按时间戳顺序添加到数组中
 */

import { MigrationInterface } from 'typeorm';
import { AddMessageReplyForeignKey1730000000000 } from './1730000000000-AddMessageReplyForeignKey';
import { MigrateSpanTable1740000000000 } from './1740000000000-MigrateSpanTable';

/**
 * 所有迁移列表（按时间戳顺序）
 */
export const migrations: (new () => MigrationInterface)[] = [
    AddMessageReplyForeignKey1730000000000,
    MigrateSpanTable1740000000000,
    // 未来的迁移在这里添加
];
