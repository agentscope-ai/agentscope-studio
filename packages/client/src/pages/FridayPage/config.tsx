import { ReactNode } from 'react';

import QwenLogo from '@/assets/svgs/qwen.svg?react';
import OpenAILogo from '@/assets/svgs/logo-openai.svg?react';
import OllamaLogo from '@/assets/svgs/logo-ollama.svg?react';
import GoogleLogo from '@/assets/svgs/logo-google.svg?react';
import AnthropicLogo from '@/assets/svgs/logo-anthropic.svg?react';

// General option type
interface Option<T = string> {
    label: T;
    value: string;
}

// Model Options Props
interface ModelOptionProps {
    logo: ReactNode;
    name: string;
}

// Specific option type aliases
type InputTypeOption = Option<string>;
type LlmProviderOption = Option<React.ReactNode>;
type BooleanOption = Option<string>;
type EmbeddingModelOption = Option<React.ReactNode>;

const ModelOption = ({ logo, name }: ModelOptionProps) => {
    return (
        <div className="flex flex-row items-center gap-x-2">
            {logo}
            {name}
        </div>
    );
};

export const inputTypeOptions: InputTypeOption[] = [
    { label: 'string', value: 'string' },
    { label: 'number', value: 'number' },
    { label: 'bool', value: 'boolean' },
];

export const llmProviderOptions: LlmProviderOption[] = [
    {
        label: (
            <ModelOption
                logo={<QwenLogo width={17} height={17} />}
                name="DashScope"
            />
        ),
        value: 'dashscope',
    },
    {
        label: (
            <ModelOption
                logo={<OpenAILogo width={17} height={17} />}
                name="OpenAI"
            />
        ),
        value: 'openai',
    },
    {
        label: (
            <ModelOption
                logo={<OllamaLogo width={17} height={17} />}
                name="Ollama"
            />
        ),
        value: 'ollama',
    },
    {
        label: (
            <ModelOption
                logo={<AnthropicLogo width={20} height={20} />}
                name="Anthropic"
            />
        ),
        value: 'anthropic',
    },
    {
        label: (
            <ModelOption
                logo={<GoogleLogo width={17} height={17} />}
                name="Google Gemini"
            />
        ),
        value: 'gemini',
    },
];

export const booleanOptions: BooleanOption[] = [
    { label: 'True', value: 'true' },
    { label: 'False', value: 'false' },
];

export const embeddingModelOptions: EmbeddingModelOption[] = [
    { label: 'provider', value: 'embeddingProvider' },
    { label: 'model name', value: 'embeddingModelName' },
    { label: 'API key', value: 'embeddingAPIKey' },
    { label: 'client_kwargs', value: 'embeddingClientKwargs' },
    { label: 'generate_kwargs', value: 'embeddingGenerateKwargs' },
];

// Form format for kwargs
export interface KwargsFormItem {
    type: string;
    key: string;
    value: string;
}

// Backend format for kwargs
export type KwargsBackendItem = { [key: string]: string | number | boolean };

// Convert kwargs from form format [{type, key, value}] to backend format {key1: value1, key2: value2}
export const convertKwargsToBackendFormat = (
    kwargs: KwargsFormItem[] | undefined,
): KwargsBackendItem | undefined => {
    if (!kwargs || !Array.isArray(kwargs) || kwargs.length === 0) {
        return undefined;
    }
    const result: KwargsBackendItem = {};
    kwargs.forEach((item) => {
        if (!item.key) return; // Skip items without key
        let convertedValue: string | number | boolean = item.value;
        // Convert value based on type
        if (item.type === 'number') {
            convertedValue = Number(item.value);
        } else if (item.type === 'boolean') {
            convertedValue = item.value === 'true';
        }
        result[item.key] = convertedValue;
    });
    return Object.keys(result).length > 0 ? result : undefined;
};

// Convert kwargs from backend format {key1: value1, key2: value2} to form format [{type, key, value}]
export const convertKwargsFromBackendFormat = (
    kwargs: KwargsBackendItem | undefined,
): KwargsFormItem[] | undefined => {
    if (!kwargs || typeof kwargs !== 'object' || Array.isArray(kwargs)) {
        return undefined;
    }
    return Object.entries(kwargs).map(([key, value]) => {
        // Infer type from value
        let type = 'string';
        let stringValue = String(value);
        if (typeof value === 'boolean') {
            type = 'boolean';
            stringValue = value ? 'true' : 'false';
        } else if (typeof value === 'number') {
            type = 'number';
            stringValue = String(value);
        } else if (value === 'true' || value === 'false') {
            type = 'boolean';
        } else if (/^[0-9]+$/.test(String(value))) {
            // If it's a numeric string, we keep it as string by default
            // User can manually change to number type if needed
            type = 'string';
        }
        return { type, key, value: stringValue };
    });
};
