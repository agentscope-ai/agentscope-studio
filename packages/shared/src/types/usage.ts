export enum UsageType {
    CHAT = 'token',
}

interface ChatTokens {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

interface BaseUsage<T extends UsageType, U> {
    type: T;
    usage: U;
}

type ChatUsage = BaseUsage<UsageType.CHAT, ChatTokens>;

export type Usage = ChatUsage;
