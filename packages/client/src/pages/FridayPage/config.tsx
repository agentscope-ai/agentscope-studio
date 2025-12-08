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
