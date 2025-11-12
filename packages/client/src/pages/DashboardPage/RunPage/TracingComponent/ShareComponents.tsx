import { memo, ReactNode } from 'react';
import { Col, Flex, Row } from 'antd';

import NumberCounter from '@/components/numbers/NumberCounter';

interface MetaDataSectionProps {
    title: string;
    data: Record<string, string | number | undefined | ReactNode>;
}

export const PanelTitle = memo(({ title }: { title: string }) => {
    return (
        <span className="font-medium text-[12px] text-muted-foreground">
            {title.toUpperCase()}
        </span>
    );
});

export const MetaDataSection = memo(({ title, data }: MetaDataSectionProps) => {
    const renderRow = (
        title: string,
        value: string | number | undefined | ReactNode,
    ) => {
        return (
            <Row key={title} gutter={0}>
                <Col span={1} />
                <Col
                    span={7}
                    style={{
                        height: '100%',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                    }}
                >
                    {title}
                </Col>
                <Col
                    span={16}
                    style={{
                        height: '100%',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                        color: 'var(--primary)',
                    }}
                >
                    {typeof value === 'number' ? (
                        <NumberCounter number={value} />
                    ) : (
                        value
                    )}
                </Col>
            </Row>
        );
    };

    return (
        <Flex vertical={true} gap="small">
            <PanelTitle title={title} />
            {Object.entries(data).map(([key, value]) => {
                return renderRow(key, value);
            })}
        </Flex>
    );
});
