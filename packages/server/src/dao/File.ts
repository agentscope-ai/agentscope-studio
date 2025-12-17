import fs from 'fs/promises';

export class FileDao {
    static async getJSONFile<T>(filePath: string): Promise<T> {
        // 从文件路径上读取对应的 JSON 文件，并解析为对象返回
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data) as T;
    }
}
