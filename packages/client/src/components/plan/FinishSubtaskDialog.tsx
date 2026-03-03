import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SubTask } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

interface FinishSubtaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subtask: SubTask | null;
    onFinish: (outcome: string) => void;
}

export function FinishSubtaskDialog({
    open,
    onOpenChange,
    subtask,
    onFinish,
}: FinishSubtaskDialogProps) {
    const { t } = useTranslation();
    const [outcome, setOutcome] = useState('');

    useEffect(() => {
        if (subtask && open) {
            // Pre-fill with existing outcome or empty
            setOutcome(subtask.outcome || '');
        } else {
            setOutcome('');
        }
    }, [subtask, open]);

    const handleFinish = () => {
        if (!outcome.trim()) {
            return;
        }

        onFinish(outcome.trim());
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('plan.finish_subtask')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {subtask && (
                        <div className="space-y-2 pb-4 border-b">
                            <div className="text-sm">
                                <span className="font-medium text-gray-700">
                                    {t('plan.subtask_name')}:{' '}
                                </span>
                                <span className="text-gray-900">
                                    {subtask.name}
                                </span>
                            </div>
                            {subtask.expected_outcome && (
                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">
                                        {t('plan.expected_outcome')}:{' '}
                                    </span>
                                    <span className="text-gray-600">
                                        {subtask.expected_outcome}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            {t('plan.actual_outcome_required')}
                        </label>
                        <Textarea
                            value={outcome}
                            onChange={(e) => setOutcome(e.target.value)}
                            placeholder={t('plan.actual_outcome_placeholder')}
                            className="w-full min-h-[120px]"
                            autoFocus
                        />
                        <p className="text-xs text-gray-500">
                            {t('plan.actual_outcome_hint')}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('action.cancel')}
                    </Button>
                    <Button onClick={handleFinish} disabled={!outcome.trim()}>
                        {t('plan.finish_action')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
