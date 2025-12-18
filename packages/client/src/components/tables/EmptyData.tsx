import { Flex } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import PageEmptyIcon from '@/assets/svgs/page-empty.svg?react';

/**
 * Lightweight placeholder for empty table states.
 * Renders a centered illustration and a localized message.
 */
const EmptyData = () => {
    const { t } = useTranslation();
    return (
        <Flex
            vertical={true}
            style={{ height: '100%', width: '100%', background: 'transparent' }}
            align="center"
            justify="center"
        >
            <PageEmptyIcon width={250} height={250} />
            <span style={{ marginTop: -10 }}>
                {t('default-page.no-data-available')}
            </span>
        </Flex>
    );
};

export default memo(EmptyData);
