import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface DeleteConfirmDialogProps {
    isOpen: boolean;
    serverName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
    isOpen,
    serverName,
    onConfirm,
    onCancel,
}) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-[400px] mx-4">
                <div className="p-6">
                    <h2 className="text-base font-semibold mb-2">
                        {t('mcp.delete-confirm-title')}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        {t('mcp.delete-confirm-message')}
                        <span className="font-medium text-foreground">
                            {' "'}
                            {serverName}
                            {'"'}
                        </span>
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={onCancel}>
                            {t('button.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={onConfirm}
                        >
                            {t('button.delete')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
