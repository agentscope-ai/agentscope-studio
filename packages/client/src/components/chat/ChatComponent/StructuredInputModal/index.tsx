import { memo } from 'react';
import Form from '@rjsf/antd';
import { Flex, Modal } from 'antd';
import validator from '@rjsf/validator-ajv8';

import { RemoveScrollBarStyle } from '@/styles.ts';

import './index.css';

/**
 * Props for structured input modal rendered via react-jsonschema-form (RJSF).
 */
interface Props {
    open: boolean;
    structuredInputSchema: Record<string, unknown>;
    onOk: (data: Record<string, unknown>) => void;
    onCancel: () => void;
}

/**
 * Modal dialog that collects structured input from user based on a JSON schema.
 * Uses RJSF (AJV8 validator) to render the form; submit button is hidden and
 */
const StructuredInputModal = ({
    open,
    structuredInputSchema,
    onOk,
    onCancel,
}: Props) => {
    if (!open) {
        return null;
    }
    return (
        <Modal
            onOk={() => {
                onOk({});
            }}
            onCancel={onCancel}
            centered
            width={800}
            title="Structured Input"
            styles={{
                content: {
                    height: 500,
                    width: 800,
                    boxSizing: 'border-box',
                },
                header: {
                    flex: 'none',
                    height: 24,
                },
                body: {
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    width: 'calc(100%)',
                    height: 'calc(100% - 32px - 44px)',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                },
                footer: {
                    height: 32,
                },
            }}
            open={open}
        >
            <div
                style={{
                    color: 'var(--muted-foreground)',
                    flexShrink: 0,
                }}
            >
                The required structured input from the user agent named 'x'
            </div>
            <Flex
                style={{
                    width: '100%',
                    minHeight: 0,
                    overflowY: 'auto', // Scrollable container for long forms
                    ...RemoveScrollBarStyle,
                }}
                flex={1}
            >
                <Form
                    uiSchema={{
                        'ui:submitButtonOptions': {
                            norender: true,
                        },
                        'ui:options': {
                            label: false,
                        },
                    }}
                    showErrorList="bottom"
                    className="as-structured-input-form"
                    schema={structuredInputSchema}
                    validator={validator}
                />
            </Flex>
        </Modal>
    );
};

export default memo(StructuredInputModal);
