import { memo, ReactNode, useEffect, useMemo, useState } from 'react';
import { Button, Flex, Form, Input, Select, Spin, Switch } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';

import KwargsFormList from './KwargsFormList.tsx';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';

import { FridayConfig } from '@shared/config/friday.ts';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { RouterPath } from '@/pages/RouterPath.ts';
import { useFridaySettingRoom } from '@/context/FridaySettingRoomContext.tsx';
import { llmProviderOptions } from '../config';

// Form format for kwargs
interface KwargsFormItem {
    type: string;
    key: string;
    value: string;
}

// Backend format for kwargs
type KwargsBackendItem = { [key: string]: string | number | boolean };

// Convert kwargs from form format [{type, key, value}] to backend format {key1: value1, key2: value2}
const convertKwargsToBackendFormat = (
    kwargs: KwargsFormItem[] | undefined,
): KwargsBackendItem | undefined => {
    if (!kwargs || !Array.isArray(kwargs) || kwargs.length === 0) {
        return undefined;
    }
    const result: KwargsBackendItem = {};
    kwargs.forEach((item) => {
        if (!item.key) return; // Skip items without key
        let convertedValue: string | number | boolean = item.value;
        // Convert value based on type
        if (item.type === 'number') {
            convertedValue = Number(item.value);
        } else if (item.type === 'boolean') {
            convertedValue = item.value === 'true';
        }
        result[item.key] = convertedValue;
    });
    return Object.keys(result).length > 0 ? result : undefined;
};

// Convert kwargs from backend format {key1: value1, key2: value2} to form format [{type, key, value}]
const convertKwargsFromBackendFormat = (
    kwargs: KwargsBackendItem | undefined,
): KwargsFormItem[] | undefined => {
    if (!kwargs || typeof kwargs !== 'object' || Array.isArray(kwargs)) {
        return undefined;
    }
    return Object.entries(kwargs).map(([key, value]) => {
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
    clientKwargs?: KwargsBackendItem;
    generateKwargs?: KwargsBackendItem;
}

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
    const [btnText, setBtnText] = useState<string>("Let's Go!");
    const [btnIcon, setBtnIcon] = useState<ReactNode>(null);

    // Load the existing Friday config if it exists
    useEffect(() => {
        if (fridayConfig) {
            // Convert backend format to form format
            const backendConfig =
                fridayConfig as unknown as FridayConfigBackend;
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
        return !llmProvider || !llmProvider.startsWith('ollama');
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
                                <CheckCircle
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
                                    <CheckCircle
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
                        <Input type="password" />
                    </Form.Item>

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
