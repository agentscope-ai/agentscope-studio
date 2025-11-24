import { ReactNode } from 'react';
import { Flex } from 'antd';

import QwenLogo from '@/assets/svgs/qwen.svg?react';
import OpenAILogo from '@/assets/svgs/logo-openai.svg?react';
import OllamaLogo from '@/assets/svgs/logo-ollama.svg?react';
import GoogleLogo from '@/assets/svgs/logo-google.svg?react';
import AnthropicLogo from '@/assets/svgs/logo-anthropic.svg?react';

interface InputTypeOption {
    label: string;
    value: string;
}

interface llmProviderOption {
    label: React.ReactNode;
    value: string;
}

interface ModelOptionProps {
    logo: ReactNode;
    name: string;
}

interface booleanOption {
    label: string;
    value: string;
}

const ModelOption = ({ logo, name }: ModelOptionProps) => {
    return (
        <Flex gap="small" align="center">
            {logo}
            {name}
        </Flex>
    );
};

export const inputTypeOptions: InputTypeOption[] = [
    { label: 'String', value: 'string' },
    { label: 'Number', value: 'number' },
    { label: 'Boolean', value: 'boolean' },
];

export const llmProviderOptions: llmProviderOption[] = [
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

export const booleanOptions: booleanOption[] = [
    { label: 'True', value: 'true' },
    { label: 'False', value: 'false' },
];
