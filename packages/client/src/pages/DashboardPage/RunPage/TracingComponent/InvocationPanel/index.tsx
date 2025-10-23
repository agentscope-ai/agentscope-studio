import { memo } from 'react';
import { Collapse, Flex } from 'antd';
import { useTranslation } from 'react-i18next';

import { RemoveScrollBarStyle } from '@/styles.ts';
import { MetaDataSection, renderSectionTitle } from '../ShareComponents.tsx';

const InvocationPanel = () => {
    const { t } = useTranslation();
    return (
        <Flex
            vertical={true}
            style={{
                width: '100%',
                overflow: 'auto',
                padding: 16,
                height: '100%',
                ...RemoveScrollBarStyle,
            }}
            gap="large"
        >
            <MetaDataSection
                title={t('common.arguments')}
                data={{
                    model: 'gpt-4o',
                    stream: 'false',
                }}
            />
            {renderSectionTitle('MESSages')}
            <Collapse
                size="small"
                items={[
                    {
                        label: 'Bob (user)',
                        children: '你好！',
                    },
                    {
                        label: 'Friday (assistant)',
                        children: '你好，我能帮你什么？',
                    },
                    {
                        label: 'Bob (user)',
                        children: '请给我一个关于如何使用Python的简单示例。',
                    },
                ]}
            />
        </Flex>
    );
};

export default memo(InvocationPanel);
