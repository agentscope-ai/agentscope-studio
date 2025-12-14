import { useRef } from 'react';
import { Form, Select, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { MinusCircleIcon, PlusCircleIcon } from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import { inputTypeOptions, booleanOptions } from '../config';

const KwargsFormList = ({ name }: { name: string }) => {
    const { t } = useTranslation();
    const form = Form.useFormInstance();
    const newlyAddedRef = useRef<Set<number>>(new Set());

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
                                ({ key, name: fieldName, ...restField }) => {
                                    const isNewlyAdded =
                                        newlyAddedRef.current.has(fieldName);
                                    return (
                                        <div
                                            key={key}
                                            className="flex flex-row items-start gap-x-2"
                                        >
                                            <Form.Item
                                                {...restField}
                                                name={[fieldName, 'key']}
                                                className="flex-1 min-w-0"
                                                validateTrigger={
                                                    isNewlyAdded
                                                        ? ['onSubmit']
                                                        : ['onBlur', 'onChange']
                                                }
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: t(
                                                            'help.friday.missing-key-name',
                                                        ),
                                                    },
                                                ]}
                                            >
                                                <Input
                                                    placeholder={t(
                                                        'help.friday.key-name',
                                                    )}
                                                    className="w-full"
                                                    onFocus={() => {
                                                        newlyAddedRef.current.delete(
                                                            fieldName,
                                                        );
                                                    }}
                                                />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[fieldName, 'type']}
                                                initialValue="string"
                                                className="flex-1 min-w-0"
                                                validateTrigger={
                                                    isNewlyAdded
                                                        ? ['onSubmit']
                                                        : ['onBlur', 'onChange']
                                                }
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: t(
                                                            'help.friday.missing-type-name',
                                                        ),
                                                    },
                                                ]}
                                            >
                                                <Select
                                                    placeholder={t(
                                                        'help.friday.type-name',
                                                    )}
                                                    className="w-full"
                                                    popupMatchSelectWidth={
                                                        false
                                                    }
                                                    options={inputTypeOptions}
                                                    onFocus={() => {
                                                        newlyAddedRef.current.delete(
                                                            fieldName,
                                                        );
                                                    }}
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
                                                        newlyAddedRef.current.delete(
                                                            fieldName,
                                                        );
                                                    }}
                                                />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[fieldName, 'value']}
                                                className="flex-1 min-w-0"
                                                validateTrigger={
                                                    isNewlyAdded
                                                        ? ['onSubmit']
                                                        : ['onBlur', 'onChange']
                                                }
                                                rules={
                                                    getFieldValue([
                                                        name,
                                                        fieldName,
                                                        'type',
                                                    ]) === 'number'
                                                        ? [
                                                              {
                                                                  pattern:
                                                                      /^-?\d+(\.\d+)?$/,
                                                                  required: true,
                                                                  whitespace: true,
                                                                  message: t(
                                                                      'help.friday.check-only-number',
                                                                  ),
                                                              },
                                                          ]
                                                        : [
                                                              {
                                                                  required: true,
                                                                  whitespace: true,
                                                                  message: t(
                                                                      'help.friday.missing-value-name',
                                                                  ),
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
                                                        placeholder={t(
                                                            'help.friday.value-name',
                                                        )}
                                                        className="w-full"
                                                        options={booleanOptions}
                                                        onFocus={() => {
                                                            newlyAddedRef.current.delete(
                                                                fieldName,
                                                            );
                                                        }}
                                                    />
                                                ) : (
                                                    <Input
                                                        placeholder={t(
                                                            'help.friday.value-name',
                                                        )}
                                                        className="w-full"
                                                        onFocus={() => {
                                                            newlyAddedRef.current.delete(
                                                                fieldName,
                                                            );
                                                        }}
                                                    />
                                                )}
                                            </Form.Item>

                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => {
                                                    newlyAddedRef.current.delete(
                                                        fieldName,
                                                    );
                                                    remove(fieldName);
                                                }}
                                            >
                                                <MinusCircleIcon className="size-3" />
                                            </Button>
                                        </div>
                                    );
                                },
                            )}
                            <Form.Item noStyle>
                                <Button
                                    className="w-full text-muted-foreground font-normal"
                                    variant="outline"
                                    onClick={() => {
                                        const index = fields.length;
                                        add({
                                            key: '',
                                            type: 'string',
                                            value: '',
                                        });
                                        // Mark this field as newly added to prevent immediate validation
                                        newlyAddedRef.current.add(index);
                                        // Clear any validation errors that might have been triggered
                                        requestAnimationFrame(() => {
                                            form.setFields([
                                                {
                                                    name: [name, index, 'key'],
                                                    errors: [],
                                                },
                                                {
                                                    name: [
                                                        name,
                                                        index,
                                                        'value',
                                                    ],
                                                    errors: [],
                                                },
                                            ]);
                                        });
                                    }}
                                >
                                    <PlusCircleIcon className="size-3" />
                                    {t('help.friday.add-form-list-btn')}
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
