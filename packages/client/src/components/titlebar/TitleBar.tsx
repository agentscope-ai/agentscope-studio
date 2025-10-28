import { memo } from 'react';
import { Flex, Layout } from 'antd';

import LanguageSwitchButton from '../buttons/LanguageSwitchButton';

import './TitleBar.css';

interface Props {
    title: string;
}

/**
 * App title bar with language switcher, using Ant Design Layout.Header.
 */
const TitleBar = ({ title }: Props) => {
    const { Header } = Layout;
    return (
        <Header
            style={{
                zIndex: 2,
                height: 'var(--header-height)',
                borderBottom: '1px solid var(--border)',
            }}
        >
            <Flex
                className="title-bar"
                vertical={false}
                align="center"
                justify="space-between"
            >
                <span style={{ fontSize: 16, fontWeight: 500 }}>{title}</span>
                <LanguageSwitchButton />
            </Flex>
        </Header>
    );
};

export default memo(TitleBar);
