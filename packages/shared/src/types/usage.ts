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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ChatUsage extends BaseUsage<UsageType.CHAT, ChatTokens> {}

export type Usage = ChatUsage;
