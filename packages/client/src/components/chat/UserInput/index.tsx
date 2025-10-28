import { Flex, Input } from 'antd';
import { memo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isMacOs } from 'react-device-detect';

import AttachmentIcon from '@/assets/svgs/attach.svg?react';
import InterruptIcon from '@/assets/svgs/interrupt.svg?react';
import EnterIcon from '@/assets/svgs/enter.svg?react';

import { PrimaryButton, SecondaryButton } from '@/components/buttons/ASButton';

/**
 * Props for the user input component with text area and action buttons.
 */
interface Props {
    value: string;
    onChange: (value: string) => void;
    attachmentChildren: ReactNode;
    sendBtnLoading: boolean;
    sendBtnDisabled: boolean;
    onSendClick: () => void;
    onAttachClick: () => void;
}

/**
 * User input component with text area, attachment support, and send/interrupt functionality.
 * Supports keyboard shortcuts and dynamic button states based on loading/disabled props.
 */
const UserInputComponent = ({
    value,
    onChange,
    attachmentChildren,
    sendBtnLoading,
    sendBtnDisabled,
    onSendClick,
    onAttachClick,
}: Props) => {
    const { t } = useTranslation();

    // Platform-specific keyboard shortcut display
    const shortcutKeys = isMacOs ? 'Command + Enter' : 'fCtrl + Enter';

    return (
        <Flex
            vertical={true}
            style={{
                width: '100%',
                border: '1px solid var(--border)',
                boxShadow: 'var(--box-shadow)',
                padding: 8,
                borderRadius: 8,
                background: 'white',
                marginTop: 'auto',
            }}
        >
            {attachmentChildren}
            <Flex vertical={true} gap="small">
                <Input.TextArea
                    variant={'borderless'}
                    placeholder={t('placeholder.input-friday-app', {
                        shortcutKeys,
                    })}
                    draggable={false}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        // Send on Cmd+Enter (Mac) or Ctrl+Enter
                        if (e.key === 'Enter' && e.metaKey) {
                            onSendClick();
                        }
                    }}
                />
            </Flex>
            <Flex
                style={{ marginTop: 8 }}
                vertical={false}
                gap={'small'}
                justify={'end'}
                align={'center'}
            >
                <SecondaryButton
                    tooltip={t('tooltip.button.attachment-add')}
                    icon={<AttachmentIcon width={15} height={15} />}
                    onClick={onAttachClick}
                />
                <PrimaryButton
                    tooltip={
                        sendBtnLoading
                            ? t('tooltip.button.interrupt-reply')
                            : t('tooltip.button.send-message', { shortcutKeys })
                    }
                    icon={
                        sendBtnLoading ? (
                            <InterruptIcon width={13} height={13} />
                        ) : (
                            <EnterIcon width={15} height={15} />
                        )
                    }
                    // Disable when not loading and explicitly disabled
                    disabled={!sendBtnLoading && sendBtnDisabled}
                    onClick={onSendClick}
                />
            </Flex>
        </Flex>
    );
};

export default memo(UserInputComponent);
