import {
    AgentScopeRuntimeWebUI,
    IAgentScopeRuntimeWebUIOptions,
} from '@agentscope-ai/chat';
import OptionsPanel from './OptionsPanel';
import { useMemo, useState, useEffect } from 'react';
import sessionApi from './sessionApi';
import defaultConfig from './defaultConfig';

/** Custom left header element with controllable logo & title sizes */
function LeftHeader({ logo, title }: { logo?: string; title?: string }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 54,
                padding: '0 20px',
                flexShrink: 0,
            }}
        >
            {logo && (
                <img
                    src={logo}
                    alt="logo"
                    style={{ height: 28, width: 28, objectFit: 'contain' }}
                />
            )}
            {title && (
                <span
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {title}
                </span>
            )}
        </div>
    );
}

export default function RuntimeChatPage() {
    const LS_KEY = 'as-studio-runtime-chat-options';

    const [optionsConfig, setOptionsConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            return saved ? JSON.parse(saved) : defaultConfig;
        } catch {
            return defaultConfig;
        }
    });

    useEffect(() => {
        localStorage.setItem(LS_KEY, JSON.stringify(optionsConfig));
    }, [optionsConfig]);

    const options = useMemo(() => {
        const rightHeader = (
            <OptionsPanel
                value={optionsConfig}
                onChange={(v: typeof optionsConfig) => {
                    setOptionsConfig((prev: typeof optionsConfig) => ({
                        ...prev,
                        ...v,
                    }));
                }}
            />
        );

        // Build a custom leftHeader React element so we can control logo/title size
        const leftHeaderConfig = (optionsConfig as Record<string, any>)?.theme
            ?.leftHeader as { logo?: string; title?: string } | undefined;

        const leftHeader = (
            <LeftHeader
                logo={leftHeaderConfig?.logo}
                title={leftHeaderConfig?.title}
            />
        );

        return {
            ...optionsConfig,
            session: {
                multiple: true,
                api: sessionApi,
            },
            theme: {
                ...optionsConfig.theme,
                leftHeader,
                rightHeader,
            },
        } as unknown as IAgentScopeRuntimeWebUIOptions;
    }, [optionsConfig]);

    return (
        <div className="h-full w-full">
            <AgentScopeRuntimeWebUI options={options} />
        </div>
    );
}
