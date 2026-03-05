import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SubTask, SubTaskStatus } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

interface EditSubtaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subtask: SubTask | null;
    onSave: (subtask: SubTask) => void;
    mode?: 'edit' | 'add';
    customTitle?: string;
}

export function EditSubtaskDialog({
    open,
    onOpenChange,
    subtask,
    onSave,
    mode = 'edit',
    customTitle,
}: EditSubtaskDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [expectedOutcome, setExpectedOutcome] = useState('');

    useEffect(() => {
        if (subtask) {
            setName(subtask.name);
            setDescription(subtask.description);
            setExpectedOutcome(subtask.expected_outcome || '');
        } else {
            // Reset for add mode
            setName('');
            setDescription('');
            setExpectedOutcome('');
        }
    }, [subtask, open]);

    const handleSave = () => {
        if (!name.trim() || !description.trim()) {
            return;
        }

        const updatedSubtask: SubTask = {
            ...(subtask || {}),
            name: name.trim(),
            description: description.trim(),
            expected_outcome: expectedOutcome.trim(),
            created_at: subtask?.created_at || new Date().toISOString(),
            state: subtask?.state || SubTaskStatus.TODO,
            outcome: subtask?.outcome || null,
            finished_at: subtask?.finished_at || null,
        };

        onSave(updatedSubtask);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {customTitle ||
                            (mode === 'edit'
                                ? t('plan.edit_subtask')
                                : t('plan.add_subtask'))}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            {t('plan.subtask_name_required')}
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('plan.subtask_name_placeholder')}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            {t('plan.subtask_desc_required')}
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('plan.subtask_desc_placeholder')}
                            className="w-full min-h-[100px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            {t('plan.expected_outcome')}
                        </label>
                        <Textarea
                            value={expectedOutcome}
                            onChange={(e) => setExpectedOutcome(e.target.value)}
                            placeholder={t('plan.expected_outcome_placeholder')}
                            className="w-full min-h-[80px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('action.cancel')}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim() || !description.trim()}
                    >
                        {mode === 'edit' ? t('action.save') : t('action.add')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
