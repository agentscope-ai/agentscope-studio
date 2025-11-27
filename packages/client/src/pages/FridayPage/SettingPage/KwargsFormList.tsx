import { Form, Select, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { MinusCircleIcon, PlusCircleIcon } from 'lucide-react';
import { inputTypeOptions, booleanOptions } from '../config';
import { Button } from '@/components/ui/button.tsx';

const KwargsFormList = ({ name }: { name: string }) => {
    const { t } = useTranslation();

    const label = name === 'clientKwargs' ? 'Client Kwargs' : 'Generate Kwargs';
    const help =
        name === 'clientKwargs'
            ? t('help.friday.client-kwargs')
            : t('help.friday.generate-kwargs');

    return (
        <Form.Item label={label} shouldUpdate help={help}>
            {({ getFieldValue, setFieldValue }) => (
                <Form.List name={name}>
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(
                                ({ key, name: fieldName, ...restField }) => (
                                    <div
                                        key={key}
                                        className="flex flex-row items-start gap-x-2 justify-center"
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
                                                    message:
                                                        'Missing type name',
                                                },
                                            ]}
                                        >
                                            <Select
                                                placeholder="Type Name"
                                                popupMatchSelectWidth={false}
                                                options={inputTypeOptions}
                                                onChange={() => {
                                                    // Clear value when switching types
                                                    setFieldValue(
                                                        [
                                                            name,
                                                            fieldName,
                                                            'value',
                                                        ],
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
                                                              pattern:
                                                                  /^[0-9]+$/,
                                                              whitespace: true,
                                                              message:
                                                                  'Only numbers can be entered.',
                                                          },
                                                      ]
                                                    : [
                                                          {
                                                              required: true,
                                                              whitespace: true,
                                                              message:
                                                                  'Missing value name',
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

                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => remove(fieldName)}
                                        >
                                            <MinusCircleIcon className="size-3" />
                                        </Button>
                                    </div>
                                ),
                            )}
                            <Form.Item>
                                <Button
                                    className="w-full text-muted-foreground font-normal"
                                    variant="outline"
                                    onClick={() => add()}
                                >
                                    <PlusCircleIcon className="size-3" />
                                    Add keyword argument
                                </Button>
                            </Form.Item>
                        </>
                    )}
                </Form.List>
            )}
        </Form.Item>
    );
};

export default KwargsFormList;
