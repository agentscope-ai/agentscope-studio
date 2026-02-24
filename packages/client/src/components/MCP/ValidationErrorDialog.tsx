import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface ValidationErrorDialogProps {
    isOpen: boolean;
    errorMessage: string;
    onClose: () => void;
}

export const ValidationErrorDialog: React.FC<ValidationErrorDialogProps> = ({
    isOpen,
    errorMessage,
    onClose,
}) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-[400px] mx-4">
                <div className="p-6">
                    <h2 className="text-base font-semibold mb-2">
                        {t('mcp.validation-error')}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        {errorMessage}
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button variant="default" size="sm" onClick={onClose}>
                            {t('button.ok')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
