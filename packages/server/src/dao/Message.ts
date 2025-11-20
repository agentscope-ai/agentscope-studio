import { MessageTable } from '../models/Message';
import { MessageForm } from '../../../shared/src/types/messageForm';

export class MessageDao {
    static async saveMessage(data: MessageForm) {
        try {
            // 判断当前的 Message 是否存在，如果存在，覆盖旧的，如果不存在，创建新的
            const message = await MessageTable.findOne({
                where: {
                    id: data.id,
                },
            });
            if (message) {
                // Cover the old one
                message.msg = data.msg;
                await message.save();
            } else {
                // Create a new one
                const newMessage = MessageTable.create({ ...data });
                await newMessage.save();
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}
