import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OptionsEditorProps {
    value?: Record<string, unknown>;
    onChange?: (values: Record<string, unknown>) => void;
    onClose?: () => void;
}

/** Get a nested value from an object using a dot-separated path */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((o, k) => {
        if (o && typeof o === 'object')
            return (o as Record<string, unknown>)[k];
        return undefined;
    }, obj);
}

/** Set a nested value on a cloned object using a dot-separated path */
function setNestedValue(
    obj: Record<string, unknown>,
    path: string,
    value: unknown,
): Record<string, unknown> {
    const clone = structuredClone(obj);
    const keys = path.split('.');
    let current: Record<string, unknown> = clone;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
            current[keys[i]] = {};
        }
        current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
    return clone;
}

/** A thin wrapper around a form field */
function FormField({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {children}
        </div>
    );
}

const OptionsEditor: React.FC<OptionsEditorProps> = ({
    value,
    onChange,
    onClose,
}) => {
    const [formData, setFormData] = useState<Record<string, unknown>>(() =>
        structuredClone(value ?? {}),
    );

    useEffect(() => {
        if (value) setFormData(structuredClone(value));
    }, [value]);

    const update = useCallback((path: string, v: unknown) => {
        setFormData((prev) => setNestedValue(prev, path, v));
    }, []);

    const handleSave = () => {
        onChange?.(formData);
        onClose?.();
    };

    const handleReset = () => {
        if (value) setFormData(structuredClone(value));
    };

    // --- prompts helpers ---
    const prompts =
        (getNestedValue(formData, 'welcome.prompts') as
            | { value: string }[]
            | undefined) ?? [];

    const addPrompt = () => {
        update('welcome.prompts', [...prompts, { value: '' }]);
    };

    const removePrompt = (idx: number) => {
        update(
            'welcome.prompts',
            prompts.filter((_, i) => i !== idx),
        );
    };

    const updatePrompt = (idx: number, v: string) => {
        const next = [...prompts];
        next[idx] = { value: v };
        update('welcome.prompts', next);
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 min-h-0 px-4 py-4">
                <div className="grid gap-5">
                    {/* ---- Theme ---- */}
                    <div className="flex items-center gap-2">
                        <Separator className="flex-1" />
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                            Theme
                        </span>
                        <Separator className="flex-1" />
                    </div>

                    <FormField label="colorPrimary">
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={
                                    (getNestedValue(
                                        formData,
                                        'theme.colorPrimary',
                                    ) as string) || '#615CED'
                                }
                                onChange={(e) =>
                                    update('theme.colorPrimary', e.target.value)
                                }
                                className="h-9 w-12 rounded border cursor-pointer"
                            />
                            <Input
                                className="flex-1"
                                value={
                                    (getNestedValue(
                                        formData,
                                        'theme.colorPrimary',
                                    ) as string) || ''
                                }
                                onChange={(e) =>
                                    update('theme.colorPrimary', e.target.value)
                                }
                            />
                        </div>
                    </FormField>

                    <FormField label="colorBgBase">
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={
                                    (getNestedValue(
                                        formData,
                                        'theme.colorBgBase',
                                    ) as string) || '#ffffff'
                                }
                                onChange={(e) =>
                                    update('theme.colorBgBase', e.target.value)
                                }
                                className="h-9 w-12 rounded border cursor-pointer"
                            />
                            <Input
                                className="flex-1"
                                value={
                                    (getNestedValue(
                                        formData,
                                        'theme.colorBgBase',
                                    ) as string) || ''
                                }
                                onChange={(e) =>
                                    update('theme.colorBgBase', e.target.value)
                                }
                            />
                        </div>
                    </FormField>

                    <FormField label="colorTextBase">
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={
                                    (getNestedValue(
                                        formData,
                                        'theme.colorTextBase',
                                    ) as string) || '#000000'
                                }
                                onChange={(e) =>
                                    update(
                                        'theme.colorTextBase',
                                        e.target.value,
                                    )
                                }
                                className="h-9 w-12 rounded border cursor-pointer"
                            />
                            <Input
                                className="flex-1"
                                value={
                                    (getNestedValue(
                                        formData,
                                        'theme.colorTextBase',
                                    ) as string) || ''
                                }
                                onChange={(e) =>
                                    update(
                                        'theme.colorTextBase',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                    </FormField>

                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                            darkMode
                        </Label>
                        <Switch
                            checked={
                                !!getNestedValue(formData, 'theme.darkMode')
                            }
                            onCheckedChange={(v) => update('theme.darkMode', v)}
                        />
                    </div>

                    <FormField label="leftHeader.logo">
                        <Input
                            value={
                                (getNestedValue(
                                    formData,
                                    'theme.leftHeader.logo',
                                ) as string) || ''
                            }
                            onChange={(e) =>
                                update('theme.leftHeader.logo', e.target.value)
                            }
                        />
                    </FormField>

                    <FormField label="leftHeader.title">
                        <Input
                            value={
                                (getNestedValue(
                                    formData,
                                    'theme.leftHeader.title',
                                ) as string) || ''
                            }
                            onChange={(e) =>
                                update('theme.leftHeader.title', e.target.value)
                            }
                        />
                    </FormField>

                    {/* ---- Sender ---- */}
                    <div className="flex items-center gap-2">
                        <Separator className="flex-1" />
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                            Sender
                        </span>
                        <Separator className="flex-1" />
                    </div>

                    <FormField label="disclaimer">
                        <Input
                            value={
                                (getNestedValue(
                                    formData,
                                    'sender.disclaimer',
                                ) as string) || ''
                            }
                            onChange={(e) =>
                                update('sender.disclaimer', e.target.value)
                            }
                        />
                    </FormField>

                    <FormField label="maxLength">
                        <Input
                            type="number"
                            min={1000}
                            value={
                                (getNestedValue(
                                    formData,
                                    'sender.maxLength',
                                ) as number) || 10000
                            }
                            onChange={(e) =>
                                update(
                                    'sender.maxLength',
                                    Number(e.target.value),
                                )
                            }
                        />
                    </FormField>

                    {/* ---- Welcome ---- */}
                    <div className="flex items-center gap-2">
                        <Separator className="flex-1" />
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                            Welcome
                        </span>
                        <Separator className="flex-1" />
                    </div>

                    <FormField label="greeting">
                        <Input
                            value={
                                (getNestedValue(
                                    formData,
                                    'welcome.greeting',
                                ) as string) || ''
                            }
                            onChange={(e) =>
                                update('welcome.greeting', e.target.value)
                            }
                        />
                    </FormField>

                    <FormField label="description">
                        <Input
                            value={
                                (getNestedValue(
                                    formData,
                                    'welcome.description',
                                ) as string) || ''
                            }
                            onChange={(e) =>
                                update('welcome.description', e.target.value)
                            }
                        />
                    </FormField>

                    <FormField label="avatar">
                        <Input
                            value={
                                (getNestedValue(
                                    formData,
                                    'welcome.avatar',
                                ) as string) || ''
                            }
                            onChange={(e) =>
                                update('welcome.avatar', e.target.value)
                            }
                        />
                    </FormField>

                    <FormField label="prompts">
                        <div className="grid gap-2">
                            {prompts.map((p, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-1.5"
                                >
                                    <Input
                                        className="flex-1"
                                        value={p.value}
                                        onChange={(e) =>
                                            updatePrompt(idx, e.target.value)
                                        }
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        onClick={() => addPrompt()}
                                    >
                                        <PlusIcon className="size-3.5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        onClick={() => removePrompt(idx)}
                                    >
                                        <TrashIcon className="size-3.5" />
                                    </Button>
                                </div>
                            ))}
                            {prompts.length === 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addPrompt}
                                >
                                    <PlusIcon className="size-3.5 mr-1" />
                                    Add Prompt
                                </Button>
                            )}
                        </div>
                    </FormField>

                    {/* ---- API ---- */}
                    <div className="flex items-center gap-2">
                        <Separator className="flex-1" />
                        <span className="text-xs font-medium text-muted-foreground shrink-0">
                            API
                        </span>
                        <Separator className="flex-1" />
                    </div>

                    <FormField label="baseURL">
                        <Input
                            value={
                                (getNestedValue(
                                    formData,
                                    'api.baseURL',
                                ) as string) || ''
                            }
                            onChange={(e) =>
                                update('api.baseURL', e.target.value)
                            }
                        />
                    </FormField>

                    <FormField label="token">
                        <Input
                            value={
                                (getNestedValue(
                                    formData,
                                    'api.token',
                                ) as string) || ''
                            }
                            onChange={(e) =>
                                update('api.token', e.target.value)
                            }
                        />
                    </FormField>
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t px-4 py-3">
                <Button variant="outline" size="sm" onClick={handleReset}>
                    Reset
                </Button>
                <Button size="sm" onClick={handleSave}>
                    Save
                </Button>
            </div>
        </div>
    );
};

export default OptionsEditor;
