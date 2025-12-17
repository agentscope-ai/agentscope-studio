import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, List, Modal } from 'antd';
import { EmptyPage } from '@/pages/DefaultPage';
import { SecondaryButton } from '@/components/buttons/ASButton';
import ImportIcon from '@/assets/svgs/import.svg?react';
import LocalFilePicker from '@/components/picker/LocalFilePicker';
import { useEvaluationRoom } from '@/context/EvaluationRoomContext.tsx';
import { useMessageApi } from '@/context/MessageApiContext.tsx';

interface Props {
    selectedBenchmark: string | null;
    onSelect: (benchmark: string) => void;
    benchmarkNames: string[];
}

const Sider = ({ selectedBenchmark, onSelect, benchmarkNames }: Props) => {
    const { t } = useTranslation();
    const [searchText, setSearchText] = useState<string>('');
    const { importBenchmark } = useEvaluationRoom();
    const [open, setOpen] = useState<boolean>(false);
    const [importDir, setImportDir] = useState<string | null>(null);
    const [importing, setImporting] = useState<boolean>(false);
    const { messageApi } = useMessageApi();

    const onImport = useCallback(async () => {
        if (importDir === null) {
            messageApi.error('Please select a directory first');
        } else {
            setImporting(true);
            importBenchmark(importDir)
                .then((success) => {
                    if (success) {
                        setOpen(false);
                    }
                })
                .catch((error) => messageApi.error(`Error: ${error.message}`))
                .finally(() => {
                    setImporting(false);
                });
        }
    }, [importDir]);

    return (
        <div className="flex flex-col min-w-[240px] h-full border-r border-r-border p-8 pl-4 pr-4">
            <Modal
                className="h-[calc(100vh-200px)]"
                classNames={{
                    content: 'max-h-[calc(100vh-200px)] overflow-hidden',
                    body: 'max-h-[calc(100vh-40px-200px-76px)] h-[calc(100vh-40px-200px-76px)]',
                }}
                title="Select a directory to import evaluation"
                open={open}
                onOk={onImport}
                loading={importing}
                onCancel={() => setOpen(false)}
            >
                <LocalFilePicker type="directory" onSelect={setImportDir} />
            </Modal>

            <div className="font-bold text-xl truncate mb-6 h-fit">
                {t('common.benchmark')}
            </div>

            <Input
                className="w-full"
                variant="filled"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('placeholder.search-benchmark')}
            />

            <SecondaryButton
                className="mt-2"
                tooltip={t('tooltip.button.import-evaluation')}
                icon={<ImportIcon width={13} height={13} className="mb-1" />}
                variant="outlined"
                placement="right"
                onClick={() => setOpen(true)}
            >
                {t('action.import-evaluation')}
            </SecondaryButton>

            <div className="flex-1 overflow-auto mt-4">
                <List<string>
                    locale={{
                        emptyText: (
                            <EmptyPage size={100} title="No benchmarks" />
                        ),
                    }}
                    className="h-full"
                    dataSource={benchmarkNames.filter((name) =>
                        name.toLowerCase().includes(searchText.toLowerCase()),
                    )}
                    renderItem={(benchmark) => {
                        const isSelected = selectedBenchmark === benchmark;
                        return (
                            <div
                                className="group ml-1 border-l border-l-zinc-200 active:text-primary-foreground p-2 pl-0 pr-3 text-[14px]"
                                onClick={() => onSelect(benchmark)}
                            >
                                <div
                                    className={`truncate group-hover:border-l-zinc-400 border-l ${isSelected ? 'border-l-primary font-medium' : 'border-l-zinc-200'} ml-[-1px] pl-2`}
                                >
                                    {benchmark}
                                </div>
                            </div>
                        );
                    }}
                />
            </div>
        </div>
    );
};

export default memo(Sider);
