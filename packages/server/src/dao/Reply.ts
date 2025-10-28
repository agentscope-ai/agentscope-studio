import { RegisterReplyParams } from '../../../shared/src';
import { ReplyTable } from '../models/Reply';

export class ReplyDao {
    static async getReply(replyId: string) {
        try {
            return await ReplyTable.findOne({
                where: {
                    replyId,
                },
            });
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    static async saveReply(data: RegisterReplyParams) {
        try {
            await ReplyTable.create({ ...data }).save();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    static async doesReplyExist(replyId: string) {
        try {
            const reply = await ReplyTable.findOne({
                where: {
                    replyId,
                },
            });
            return reply !== null;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    static async finishReply(replyId: string, finishedAt: string) {
        try {
            const reply = await ReplyTable.findOne({
                where: {
                    replyId,
                },
            });
            if (reply) {
                reply.finishedAt = finishedAt;
                await reply.save();
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}
