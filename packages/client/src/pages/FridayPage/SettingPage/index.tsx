import { memo, ReactNode, useEffect, useMemo, useState } from 'react';
import { Button, Flex, Form, Input, Select, Spin, Switch, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import CheckSvg from '@/assets/svgs/check-circle.svg?react';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';

import { FridayConfig } from '@shared/config/friday.ts';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { RouterPath } from '@/pages/RouterPath.ts';
import { useFridaySettingRoom } from '@/context/FridaySettingRoomContext.tsx';
import { inputTypeOptions, llmProviderOptions, booleanOptions } from '../config';

// Form format for kwargs
interface KwargsFormItem {
    type: string;
    key: string;
    value: string;
}

// Backend format for kwargs
type KwargsBackendItem = { [key: string]: string | number | boolean };

// Convert kwargs from form format [{type, key, value}] to backend format [{key: value}]
const convertKwargsToBackendFormat = (
    kwargs: KwargsFormItem[] | undefined,
): KwargsBackendItem[] | undefined => {
    if (!kwargs || !Array.isArray(kwargs)) {
        return undefined;
    }
    return kwargs.map((item) => {
        let convertedValue: string | number | boolean = item.value;
        // Convert value based on type
        if (item.type === 'number') {
            convertedValue = Number(item.value);
        } else if (item.type === 'boolean') {
            convertedValue = item.value === 'true';
        }
        return { [item.key]: convertedValue };
    });
};

// Convert kwargs from backend format [{key: value}] to form format [{type, key, value}]
const convertKwargsFromBackendFormat = (
    kwargs: KwargsBackendItem[] | undefined,
): KwargsFormItem[] | undefined => {
    if (!kwargs || !Array.isArray(kwargs)) {
        return undefined;
    }
    return kwargs.map((item) => {
        const entries = Object.entries(item);
        if (entries.length === 0) {
            return { type: 'string', key: '', value: '' };
        }
        const [key, value] = entries[0];
        // Infer type from value
        let type = 'string';
        let stringValue = String(value);
        if (typeof value === 'boolean') {
            type = 'boolean';
            stringValue = value ? 'true' : 'false';
        } else if (typeof value === 'number') {
            type = 'number';
            stringValue = String(value);
        } else if (value === 'true' || value === 'false') {
            type = 'boolean';
        } else if (/^[0-9]+$/.test(String(value))) {
            // If it's a numeric string, we keep it as string by default
            // User can manually change to number type if needed
            type = 'string';
        }
        return { type, key, value: stringValue };
    });
};

// Extended FridayConfig for form (includes kwargs in form format)
interface FridayConfigForm extends FridayConfig {
    clientKwargs?: KwargsFormItem[];
    generateKwargs?: KwargsFormItem[];
}

// Extended FridayConfig for backend (includes kwargs in backend format)
interface FridayConfigBackend extends FridayConfig {
    clientKwargs?: KwargsBackendItem[];
    generateKwargs?: KwargsBackendItem[];
}

// Reusable component for kwargs form list
const KwargsFormList = ({ name }: { name: string }) => {
    return (
        <Form.Item
            label={name === 'clientKwargs' ? 'Client Kwargs' : 'Generate Kwargs'}
            className="-mb-[15px]!"
            shouldUpdate
        >
            {({ getFieldValue, setFieldValue }) => (
                <Form.List name={name}>
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(
                                ({ key, name: fieldName, ...restField }) => (
                                    <Space
                                        key={key}
                                        className="flex mb-2"
                                        align="baseline"
                                    >
                                        <Form.Item
                                            {...restField}
                                            name={[fieldName, 'key']}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Missing key name',
                                                },
                                            ]}
                                        >
                                            <Input placeholder="Key Name" />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[fieldName, 'type']}
                                            initialValue="string"
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Missing type name',
                                                },
                                            ]}
                                        >
                                            <Select
                                                placeholder="Type Name"
                                                popupMatchSelectWidth={false}
                                                options={inputTypeOptions}
                                                className="w-[94px]!"
                                                onChange={() => {
                                                    // Clear value when switching types
                                                    setFieldValue(
                                                        [name, fieldName, 'value'],
                                                        undefined,
                                                    );
                                                }}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[fieldName, 'value']}
                                            rules={
                                                getFieldValue([
                                                    name,
                                                    fieldName,
                                                    'type',
                                                ]) === 'number'
                                                    ? [
                                                          {
                                                              pattern: /^[0-9]+$/,
                                                              whitespace: true,
                                                              message: 'Only numbers can be entered.',
                                                          },
                                                      ]
                                                    : [
                                                          {
                                                              required: true,
                                                              whitespace: true,
                                                              message: 'Missing value name',
                                                          },
                                                      ]
                                            }
                                        >
                                            {getFieldValue([
                                                name,
                                                fieldName,
                                                'type',
                                            ]) === 'boolean' ? (
                                                <Select
                                                    placeholder="Value Name"
                                                    className="w-[150px]!"
                                                    options={booleanOptions}
                                                />
                                            ) : (
                                                <Input placeholder="Value Name" />
                                            )}
                                        </Form.Item>
                                        <MinusCircleOutlined
                                            onClick={() => remove(fieldName)}
                                        />
                                    </Space>
                                ),
                            )}
                            <Form.Item>
                                <Button
                                    type="dashed"
                                    onClick={() => add()}
                                    block
                                    icon={<PlusOutlined />}
                                >
                                    Add field
                                </Button>
                            </Form.Item>
                        </>
                    )}
                </Form.List>
            )}
        </Form.Item>
    );
};

const SettingPage = () => {
    const navigate = useNavigate();
    const { messageApi } = useMessageApi();
    const { t } = useTranslation();
    const formItemLayout = {
        labelCol: {
            xs: { span: 24 },
            sm: { span: 8 },
        },
        wrapperCol: {
            xs: { span: 24 },
            sm: { span: 8 },
        },
    };
    const {
        loadingConfig,
        verifyPythonEnv,
        fridayConfig,
        saveFridayConfig,
        installFridayRequirements,
    } = useFridaySettingRoom();
    const [loading, setLoading] = useState<boolean>(false);
    const [form] = Form.useForm();
    const [btnText, setBtnText] = useState<string>('Let\'s Go!');
    const [btnIcon, setBtnIcon] = useState<ReactNode>(null);

    // Load the existing Friday config if it exists
    useEffect(() => {
        if (fridayConfig) {
            // Convert backend format to form format
            const backendConfig = fridayConfig as unknown as FridayConfigBackend;
            const formData: FridayConfigForm = {
                ...fridayConfig,
                clientKwargs: convertKwargsFromBackendFormat(
                    backendConfig.clientKwargs,
                ),
                generateKwargs: convertKwargsFromBackendFormat(
                    backendConfig.generateKwargs,
                ),
            };
            form.setFieldsValue(formData);
        }
    }, [fridayConfig, form]);

    const tailFormItemLayout = {
        wrapperCol: {
            xs: {
                span: 24,
                offset: 0,
            },
            sm: {
                span: 16,
                offset: 8,
            },
        },
    };

    const llmProvider = Form.useWatch('llmProvider', form);
    const requiredAPIKey = useMemo(() => {
        return llmProvider ? llmProvider !== 'ollama' : false;
    }, [llmProvider]);

    const disabledAPIKey = useMemo(() => {
        return !llmProvider || llmProvider.startsWith('ollama');
    }, [llmProvider]);

    return (
        <div className="flex flex-col w-full h-full pl-12 pr-12 pt-8 pb-8 gap-13">
            <div className="flex flex-col w-full gap-2">
                <PageTitleSpan title="Friday" />
                <Flex className="text-[var(--muted-foreground)]">
                    {t('description.friday')}
                </Flex>
            </div>

            <Spin spinning={loadingConfig}>
                <Form
                    className="flex flex-col gap-y-6"
                    variant="filled"
                    form={form}
                    initialValues={{
                        writePermission: false,
                    }}
                    onFinish={async (config: FridayConfigForm) => {
                        // Convert form format to backend format
                        const backendConfig: FridayConfigBackend = {
                            ...config,
                            clientKwargs: convertKwargsToBackendFormat(
                                config.clientKwargs,
                            ),
                            generateKwargs: convertKwargsToBackendFormat(
                                config.generateKwargs,
                            ),
                        };
                        setLoading(true);
                        setBtnText(
                            t('message.friday.info-install-requirements'),
                        );
                        setBtnIcon(null);
                        const installFridayRequirementsRes =
                            await installFridayRequirements(config.pythonEnv);
                        if (installFridayRequirementsRes.success) {
                            setBtnIcon(
                                <CheckSvg
                                    width={14}
                                    height={14}
                                    fill="#04b304"
                                />,
                            );
                            setBtnText(
                                t(
                                    'message.friday.success-install-requirements',
                                ),
                            );
                            // Wait for 2 seconds to show the success message
                            await new Promise((resolve) =>
                                setTimeout(resolve, 2000),
                            );

                            // Save the config
                            setBtnIcon(null);
                            setBtnText(t('message.friday.info-save-config'));
                            const saveFridayConfigRes =
                                await saveFridayConfig(backendConfig);
                            if (saveFridayConfigRes.success) {
                                // wait for 1 second
                                setBtnIcon(
                                    <CheckSvg
                                        width={14}
                                        height={14}
                                        fill="#04b304"
                                    />,
                                );
                                setBtnText(
                                    t('message.friday.success-save-config'),
                                );

                                await new Promise((resolve) =>
                                    setTimeout(resolve, 2000),
                                );

                                setLoading(false);
                                navigate(
                                    `${RouterPath.FRIDAY}/${RouterPath.FRIDAY_CHAT}`,
                                );
                            } else {
                                messageApi.error(saveFridayConfigRes.message);
                                setLoading(false);
                            }
                        } else {
                            messageApi.error(
                                installFridayRequirementsRes.message,
                            );
                            setLoading(false);
                        }
                    }}
                    validateTrigger={['onBlur']}
                    {...formItemLayout}
                >
                    <Form.Item
                        name="pythonEnv"
                        label="Python Environment"
                        hasFeedback={true}
                        rules={[
                            {
                                required: true,
                                message: 'Input the Python env',
                            },
                            {
                                validator: async (_, value) => {
                                    if (!value) return;
                                    const result = await verifyPythonEnv(value);
                                    if (!result.success) {
                                        throw new Error(result.message);
                                    }
                                },
                            },
                        ]}
                    >
                        <Input placeholder={t('help.friday.python-env')} />
                    </Form.Item>

                    <Form.Item name="llmProvider" label="LLM Provider" required>
                        <Select options={llmProviderOptions} />
                    </Form.Item>

                    <Form.Item
                        name="modelName"
                        label="Model Name"
                        required
                        help={t('help.friday.model-name', { llmProvider })}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="apiKey"
                        label="API Key"
                        required={requiredAPIKey}
                        dependencies={['model']}
                        help={t('help.friday.api-key', { llmProvider })}
                    >
                        <Input type="password" disabled={disabledAPIKey} />
                    </Form.Item>

                    {!['dashscope', 'gemini', 'anthropic'].includes(
                        llmProvider,
                    ) && (
                        <Form.Item
                            name="baseUrl"
                            label="Base URL"
                            help={t('help.friday.base-url')}
                        >
                            <Input
                                placeholder={t( 'help.friday.base-url-placeholder')}
                            />
                        </Form.Item>
                    )}

                    <KwargsFormList name="clientKwargs" />
                    
                    <KwargsFormList name="generateKwargs" />

                    <Form.Item
                        name="writePermission"
                        label="Write Permission"
                        help={t('help.friday.write-permission')}
                    >
                        <Switch size="small" />
                    </Form.Item>

                    <Form.Item {...tailFormItemLayout}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={
                                loading
                                    ? btnIcon
                                        ? { icon: btnIcon }
                                        : true
                                    : false
                            }
                        >
                            {btnText}
                        </Button>
                    </Form.Item>
                </Form>
            </Spin>
        </div>
    );
};

export default memo(SettingPage);
