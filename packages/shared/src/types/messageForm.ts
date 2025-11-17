export enum BlockType {
    TEXT = 'text',
    THINKING = 'thinking',
    IMAGE = 'image',
    AUDIO = 'audio',
    VIDEO = 'video',
    TOOL_USE = 'tool_use',
    TOOL_RESULT = 'tool_result',
}

export enum SourceType {
    BASE64 = 'base64',
    URL = 'url',
}

export interface TextBlock {
    text: string;
    type: BlockType.TEXT;
}

export interface ThinkingBlock {
    thinking: string;
    type: BlockType.THINKING;
}

export interface Base64Source {
    type: SourceType.BASE64;
    media_type: string;
    data: string;
}

export interface URLSource {
    type: SourceType.URL;
    url: string;
}

export interface ImageBlock {
    type: BlockType.IMAGE;
    source: Base64Source | URLSource;
}

export interface AudioBlock {
    type: BlockType.AUDIO;
    source: Base64Source | URLSource;
}

export interface VideoBlock {
    type: BlockType.VIDEO;
    source: Base64Source | URLSource;
}

export interface ToolUseBlock {
    type: BlockType.TOOL_USE;
    id: string;
    name: string;
    input: Record<string, unknown>;
}

export interface ToolResultBlock {
    type: BlockType.TOOL_RESULT;
    id: string;
    name: string;
    output: string | (TextBlock | ImageBlock | AudioBlock)[];
}

export type ContentBlock =
    | TextBlock
    | ThinkingBlock
    | ImageBlock
    | AudioBlock
    | VideoBlock
    | ToolUseBlock
    | ToolResultBlock;

export type ContentBlocks = ContentBlock[];

export type ContentType = string | ContentBlocks;

export enum Status {
    RUNNING = 'running',
    PENDING = 'pending',
    DONE = 'done',
    UNKNOWN = 'unknown',
}

export interface MessageForm {
    id: string;
    runId: string;
    replyId: string;
    // In case the msg data change in the future, we use a generic type here
    msg: {
        name: string;
        role: string;
        content: ContentType;
        metadata: object;
        timestamp: string;
    };
}
