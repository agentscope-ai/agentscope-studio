import { ReactNode } from 'react';

import QwenLogo from '@/assets/svgs/qwen.svg?react';
import OpenAILogo from '@/assets/svgs/logo-openai.svg?react';
import OllamaLogo from '@/assets/svgs/logo-ollama.svg?react';
import GoogleLogo from '@/assets/svgs/logo-google.svg?react';
import AnthropicLogo from '@/assets/svgs/logo-anthropic.svg?react';

interface InputTypeOption {
    label: string;
    value: string;
}

interface LlmProviderOption {
    label: React.ReactNode;
    value: string;
}

interface ModelOptionProps {
    logo: ReactNode;
    name: string;
}

interface BooleanOption {
    label: string;
    value: string;
}

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
