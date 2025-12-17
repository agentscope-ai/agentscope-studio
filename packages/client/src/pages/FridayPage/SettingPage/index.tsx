import { memo, ReactNode, useEffect, useMemo, useState } from 'react';
import { Button, Flex, Form, Input, Select, Spin, Switch } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';

import KwargsFormList from './KwargsFormList.tsx';
import PageTitleSpan from '@/components/spans/PageTitleSpan.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { FridayConfig } from '@shared/config/friday.ts';
import { useMessageApi } from '@/context/MessageApiContext.tsx';
import { RouterPath } from '@/pages/RouterPath.ts';
import { useFridaySettingRoom } from '@/context/FridaySettingRoomContext.tsx';
import {
    llmProviderOptions,
    embeddingModelOptions,
    KwargsFormItem,
    KwargsBackendItem,
    convertKwargsToBackendFormat,
    convertKwargsFromBackendFormat,
} from '../config';

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
            sm: { span: 6 },
        },
        wrapperCol: {
            xs: { span: 22 },
            sm: { span: 16 },
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
                offset: 11,
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
                    {/* Run Settings */}
                    <Card className="w-3/5 mx-auto">
                        <CardHeader>
                            <CardTitle>Run Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                            const result =
                                                await verifyPythonEnv(value);
                                            if (!result.success) {
                                                throw new Error(result.message);
                                            }
                                        },
                                    },
                                ]}
                            >
                                <Input
                                    placeholder={t('help.friday.python-env')}
                                />
                            </Form.Item>
                        </CardContent>
                    </Card>
                    {/* Model Settings */}
                    <Card className="w-3/5 mx-auto">
                        <CardHeader>
                            <CardTitle>Model</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form.Item
                                name="llmProvider"
                                label="LLM Provider"
                                required
                            >
                                <Select options={llmProviderOptions} />
                            </Form.Item>

                            <Form.Item
                                name="modelName"
                                label="Model Name"
                                required
                                help={t('help.friday.model-name', {
                                    llmProvider,
                                })}
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
                        </CardContent>
                    </Card>
                    {/* Tool Settings */}
                    <Card className="w-3/5 mx-auto">
                        <CardHeader>
                            <CardTitle>Tool</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form.Item
                                name="enableMetaTool"
                                label="Meta Tool"
                                valuePropName="checked"
                                help={t('help.friday.write-permission')}
                            >
                                <Switch size="small" />
                            </Form.Item>

                            <Form.Item
                                name="enablePlan"
                                label="Plan Tool"
                                valuePropName="checked"
                                help={t('help.friday.write-permission')}
                            >
                                <Switch size="small" />
                            </Form.Item>

                            <Form.Item
                                name="enableDynamicMCP"
                                label="Dynamically add MCP"
                                valuePropName="checked"
                                help={t('help.friday.write-permission')}
                            >
                                <Switch size="small" />
                            </Form.Item>

                            <Form.Item
                                name="enableAgentScopeTool"
                                label="Add AgentScope Tool"
                                valuePropName="checked"
                                help={t('help.friday.write-permission')}
                            >
                                <Switch size="small" />
                            </Form.Item>

                            <Form.Item
                                name="enableFileWritten"
                                label="Write Permission"
                                valuePropName="checked"
                                help={t('help.friday.write-permission')}
                            >
                                <Switch size="small" />
                            </Form.Item>

                            <Form.Item
                                name="enableShell"
                                label="Enable Shell"
                                valuePropName="checked"
                                help={t('help.friday.write-permission')}
                            >
                                <Switch size="small" />
                            </Form.Item>

                            <Form.Item
                                name="enablePython"
                                label="Enable Python"
                                valuePropName="checked"
                                help={t('help.friday.write-permission')}
                            >
                                <Switch size="small" />
                            </Form.Item>
                        </CardContent>
                    </Card>
                    {/* Agent Skill Settings */}
                    <Card className="w-3/5 mx-auto">
                        <CardHeader>
                            <CardTitle>Agent Skill</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form.Item
                                name="enableAgentSkill"
                                label="Enable"
                                valuePropName="checked"
                                // help={t('help.friday.write-permission')}
                            >
                                <Switch size="small" />
                            </Form.Item>

                            <Form.Item shouldUpdate noStyle>
                                {({ getFieldValue }) => {
                                    const enableAgentSkill =
                                        getFieldValue('enableAgentSkill');
                                    return (
                                        <>
                                            {enableAgentSkill ? (
                                                <Form.Item
                                                    name="agentSkillDir"
                                                    label="Storage Directory"
                                                    help={t(
                                                        'help.friday.write-permission',
                                                    )}
                                                >
                                                    <Input />
                                                </Form.Item>
                                            ) : null}
                                        </>
                                    );
                                }}
                            </Form.Item>
                        </CardContent>
                    </Card>
                    {/* Long-term Memory Settings */}
                    <Card className="w-3/5 mx-auto">
                        <CardHeader>
                            <CardTitle>Long-term Memory</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form.Item
                                name="enableLongTermMemory"
                                label="Enable"
                                valuePropName="checked"
                                // help={t('help.friday.write-permission')}
                            >
                                <Switch size="small" />
                            </Form.Item>

                            <Form.Item shouldUpdate noStyle>
                                {({ getFieldValue }) => {
                                    const enableLongTermMemory = getFieldValue(
                                        'enableLongTermMemory',
                                    );
                                    return (
                                        <>
                                            {enableLongTermMemory ? (
                                                <Form.Item
                                                    name="embeddingModel"
                                                    label="Embedding Model"
                                                    help={t(
                                                        'help.friday.write-permission',
                                                    )}
                                                >
                                                    <Select
                                                        options={
                                                            embeddingModelOptions
                                                        }
                                                    />
                                                </Form.Item>
                                            ) : null}
                                        </>
                                    );
                                }}
                            </Form.Item>
                        </CardContent>
                    </Card>

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
