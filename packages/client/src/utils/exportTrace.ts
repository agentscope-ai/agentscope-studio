import {
    BlockType,
    ContentBlock,
    ContentType,
    Reply,
    SourceType,
} from '@shared/types';
import { formatDateTime } from '@/utils/common.ts';

const blockToMarkdown = (block: ContentBlock): string => {
    switch (block.type) {
        case BlockType.TEXT:
            return block.text;
        case BlockType.THINKING:
            return `> _thinking: ${block.thinking}_`;
        case BlockType.IMAGE:
            return block.source.type === SourceType.URL
                ? `![image](${block.source.url})`
                : '*[image attachment omitted]*';
        case BlockType.AUDIO:
            return '*[audio attachment omitted]*';
        case BlockType.VIDEO:
            return '*[video attachment omitted]*';
        case BlockType.TOOL_USE:
            return `**Tool call:** \`${block.name}\`\n\`\`\`json\n${JSON.stringify(block.input, null, 2)}\n\`\`\``;
        case BlockType.TOOL_RESULT: {
            const output =
                typeof block.output === 'string'
                    ? block.output
                    : JSON.stringify(block.output, null, 2);
            return `**Tool result:** \`${block.name}\`\n\`\`\`\n${output}\n\`\`\``;
        }
    }
};

const contentToMarkdown = (content: ContentType): string => {
    if (typeof content === 'string') {
        return content;
    }
    return content.map(blockToMarkdown).join('\n\n');
};

/**
 * Render a run's replies as a Markdown transcript.
 */
export const repliesToMarkdown = (
    replies: Reply[],
    runName?: string,
): string => {
    const lines: string[] = [`# ${runName ?? 'Run'} Trace`, ''];

    for (const reply of replies) {
        lines.push(`## ${reply.replyName} (${reply.replyRole})`);
        lines.push(`_${formatDateTime(reply.createdAt)}_`);
        lines.push('');
        for (const message of reply.messages) {
            lines.push(`### ${message.name} (${message.role})`);
            lines.push(contentToMarkdown(message.content));
            lines.push('');
        }
    }

    return lines.join('\n');
};

/**
 * Trigger a browser download of the given text content as a file.
 */
export const downloadTextFile = (filename: string, content: string): void => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
};
