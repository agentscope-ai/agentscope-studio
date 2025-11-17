import {
    FridayAppMessageTable,
    FridayAppReplyTable,
} from '../models/FridayApp';
import { ContentBlocks, FridayReply } from '../../../shared/src';
import { FridayAppReplyView } from '../models/FridayAppView';
import { LessThan } from 'typeorm';
import dayjs from 'dayjs';

export class FridayAppMessageDao {
    static async finishReply(replyId: string) {
        try {
            const reply = await FridayAppReplyTable.findOne({
                where: { id: replyId },
            });
            if (!reply) {
                throw new Error(`Reply with id ${replyId} not found`);
            }
            reply.finished = true;
            reply.endTimeStamp = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
            await reply.save();

            // Return the updated reply data
            return (await FridayAppReplyView.findOne({
                where: { id: replyId },
            })) as FridayReply;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    static async saveReplyMessage(
        replyId: string,
        msg: {
            id: string;
            name: string;
            role: string;
            content: ContentBlocks;
            metadata: object;
            timestamp: string;
        },
        finished: boolean,
    ) {
        await FridayAppReplyTable.createQueryBuilder()
            .insert()
            .into(FridayAppReplyTable)
            .values({
                id: replyId,
                startTimeStamp: msg.timestamp,
                finished: finished,
            })
            .orIgnore()
            .execute();

        await FridayAppMessageTable.createQueryBuilder()
            .insert()
            .into(FridayAppMessageTable)
            .values({
                id: msg.id,
                replyId: replyId,
                name: msg.name,
                role: msg.role,
                content: msg.content as never,
                timestamp: msg.timestamp,
            })
            .orUpdate(['name', 'role', 'content', 'timestamp'], ['id'])
            .execute();

        return (await FridayAppReplyView.findOne({
            where: { id: replyId },
        })) as FridayReply;
    }

    static async getRepliesBefore(timestamp?: string, limit: number = 100) {
        const conditions: Record<string, unknown> = {
            order: { startTimeStamp: 'ASC' },
            limit: limit,
        };

        if (timestamp) {
            conditions.where = { startTimeStamp: LessThan(timestamp) };
        }
        const replies = await FridayAppReplyView.find(conditions);

        return {
            replies,
            hasMore: true,
        };
    }

    static async cleanHistoryMessages() {
        try {
            await FridayAppMessageTable.clear();
            await FridayAppReplyTable.clear();
        } catch (error) {
            console.error('Error cleaning history messages:', error);
            throw new Error('Failed to clean history messages.');
        }
    }
}
