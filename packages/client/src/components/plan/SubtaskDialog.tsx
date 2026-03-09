import { memo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SubTask, SubTaskStatus } from '@shared/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SubtaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subtask?: SubTask | null;
    mode: 'add' | 'edit';
    onSave: (subtask: Partial<SubTask>) => void;
}

const SubtaskDialog = ({
    open,
    onOpenChange,
    subtask,
    mode,
    onSave,
}: SubtaskDialogProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [expectedOutcome, setExpectedOutcome] = useState('');

    useEffect(() => {
        if (open && subtask && mode === 'edit') {
            setName(subtask.name);
            setDescription(subtask.description);
            setExpectedOutcome(subtask.expected_outcome || '');
        } else if (open && mode === 'add') {
            setName('');
            setDescription('');
            setExpectedOutcome('');
        }
    }, [open, subtask, mode]);

    const handleSave = () => {
        onSave({
            name,
            description,
            expected_outcome: expectedOutcome,
            state: SubTaskStatus.TODO,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'add'
                            ? t('plan.add_subtask')
                            : t('plan.edit_subtask')}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t('plan.subtask_name')}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('plan.subtask_name_placeholder2')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">
                            {t('plan.subtask_desc')}
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('plan.subtask_desc_placeholder2')}
                            rows={3}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="expectedOutcome">
                            {t('plan.expected_outcome')}
                        </Label>
                        <Textarea
                            id="expectedOutcome"
                            value={expectedOutcome}
                            onChange={(e) => setExpectedOutcome(e.target.value)}
                            placeholder={t(
                                'plan.expected_outcome_placeholder2',
                            )}
                            rows={2}
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
                        {t('action.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default memo(SubtaskDialog);
