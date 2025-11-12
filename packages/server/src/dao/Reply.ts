import { RegisterReplyParams, Reply, Message } from '../../../shared/src';
import { ReplyTable } from '../models/Reply';

export class ReplyDao {
    static async getReply(replyId: string) {
        try {
            const reply = await ReplyTable.findOne({
                where: {
                    replyId,
                },
                relations: ['messages'],
            });

            if (reply) {
                return {
                    replyId: reply.replyId,
                    replyName: reply.replyName,
                    replyRole: reply.replyRole,
                    createdAt: reply.createdAt,
                    finishedAt: reply.finishedAt,
                    messages: reply.messages.map(
                        (msg) =>
                            ({
                                id: msg.id,
                                name: msg.msg.name,
                                role: msg.msg.role,
                                content: msg.msg.content,
                                timestamp: msg.msg.timestamp,
                                metadata: msg.msg.metadata,
                            }) as Message,
                    ),
                } as Reply;
            }
            return null;
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
