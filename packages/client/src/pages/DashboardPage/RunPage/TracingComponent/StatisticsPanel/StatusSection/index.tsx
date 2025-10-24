import { memo } from 'react';
import { Col, Flex, Row } from 'antd';
import { useTranslation } from 'react-i18next';

import { SingleLineEllipsisStyle } from '@/styles.ts';
import { Status } from '@shared/types/messageForm';
import NumberCounter from '@/components/numbers/NumberCounter';

interface Props {
    status: string | undefined;
    invocations: number | undefined;
    tokens: number | undefined;
}

const StatusSection = ({ status, invocations, tokens }: Props) => {
    const { t } = useTranslation();

    const renderStatusTitleRow = (
        title1: string,
        title2: string,
        title3: string,
    ) => {
        const titleStyle = {
            fontWeight: 550,
            fontSize: 12,
            color: 'var(--muted-foreground)',
            width: '100%',
            ...SingleLineEllipsisStyle,
        };
        return (
            <Row>
                <Col span={8}>
                    <div style={titleStyle}>{title1.toUpperCase()}</div>
                </Col>
                <Col span={8}>
                    <div style={titleStyle}>{title2.toUpperCase()}</div>
                </Col>
                <Col span={8}>
                    <div style={titleStyle}>{title3.toUpperCase()}</div>
                </Col>
            </Row>
        );
    };

    const renderStatusValueRow = (
        value1: string | undefined,
        value2: number | undefined,
        value3: number | undefined,
    ) => {
        const valueStyle = {
            height: 24,
            fontWeight: 'bold',
            fontSize: 13,
            color: 'var(--foreground)',
            width: '100%',
            ...SingleLineEllipsisStyle,
        };

        const status = value1 ? t(`status.${value1}`) : Status.UNKNOWN;

        const unitString2 =
            value2 && value2 > 1 ? t('unit.times') : t('unit.time');
        const unitString3 =
            value3 && value3 > 1 ? t('unit.tokens') : t('unit.token');

        return (
            <Row>
                <Col span={8} style={{ overflow: 'hidden', height: 24 }}>
                    <Flex style={valueStyle} align="center">
                        {status.toUpperCase()}
                    </Flex>
                </Col>
                <Col span={8} style={{ overflow: 'hidden' }}>
                    <Flex style={valueStyle} align="center">
                        <NumberCounter number={value2 ? value2 : 0} />
                        &nbsp;{unitString2}
                    </Flex>
                </Col>
                <Col span={8} style={{ overflow: 'hidden' }}>
                    {
                        <Flex style={valueStyle} align="center">
                            <NumberCounter number={value3 ? value3 : 0} />
                            &nbsp;{unitString3}
                        </Flex>
                    }
                </Col>
            </Row>
        );
    };

    return (
        <Flex
            vertical={true}
            style={{
                width: '100%',
                border: '2px solid var(--primary)',
                boxShadow: 'var(--box-shadow)',
                borderRadius: 6,
                padding: '1rem',
                // background: 'linear-gradient(to bottom, var(--primary-300), var(--primary-50) 20%, var(--primary-50) 80%, var(--primary-300))'
            }}
            gap="small"
        >
            {renderStatusTitleRow(
                t('common.status'),
                t('common.llm-invocations'),
                t('common.total-tokens'),
            )}
            {renderStatusValueRow(status, invocations, tokens)}
        </Flex>
    );
};

export default memo(StatusSection);
