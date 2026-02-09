import { FileOutlined, FolderOutlined } from '@ant-design/icons';
import { FileItem } from '@shared/types/file.ts';
import { Input, Tree, TreeDataNode } from 'antd';
import type { Key } from 'react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { trpc } from '@/api/trpc';

interface Props {
    type: 'file' | 'directory' | 'both';
    onSelect: (path: string | null) => void;
}

interface CustomTreeDataNode extends TreeDataNode {
    isDirectory: boolean;
    loaded?: boolean;
    children?: CustomTreeDataNode[];
}

const getInitialPath = () => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('win')) {
        return 'C:\\Users\\';
    }
    if (userAgent.includes('mac')) {
        return '/Users/';
    }
    // Linux and BSD systems
    if (userAgent.includes('linux') || userAgent.includes('bsd')) {
        return '/home/';
    }
    // Default
    return '/';
};

const LocalFilePicker = ({ onSelect, ...restProps }: Props) => {
    const { t } = useTranslation();
    const [currentPath, setCurrentPath] = useState<string>(getInitialPath());
    const [treeData, setTreeData] = useState<CustomTreeDataNode[]>([]);

    const listDirMutation = trpc.listDir.useMutation();

    // Convert FileItem to CustomTreeDataNode
    const mapToTreeNode = useCallback((item: FileItem): CustomTreeDataNode => {
        return {
            title: item.name,
            key: item.path,
            children: item.isDirectory ? [] : undefined,
            isLeaf: !item.isDirectory,
            icon: item.isDirectory ? <FolderOutlined /> : <FileOutlined />,
            selectable: item.isDirectory,
            isDirectory: item.isDirectory,
        };
    }, []);

    const fetchDirData = useCallback(
        async (path: string): Promise<CustomTreeDataNode[]> => {
            try {
                const result = await listDirMutation.mutateAsync({ path });
                if (
                    result.success &&
                    'data' in result &&
                    Array.isArray(result.data)
                ) {
                    return result.data.map(mapToTreeNode);
                }
                return [];
            } catch (error) {
                console.error('Failed to fetch directory data:', error);
                return [];
            }
        },
        [listDirMutation, mapToTreeNode],
    );

    // Initialize root directory
    useEffect(() => {
        const initializeTree = async () => {
            const items = await fetchDirData(currentPath);
            setTreeData(items);
        };

        initializeTree();
    }, [currentPath]);

    const updateNodeChildren = (
        nodes: CustomTreeDataNode[],
        key: Key,
        children: CustomTreeDataNode[],
    ): CustomTreeDataNode[] => {
        return nodes.map((node) => {
            if (node.key === key) {
                return {
                    ...node,
                    children,
                };
            }
            if (node.children) {
                return {
                    ...node,
                    children: updateNodeChildren(node.children, key, children),
                };
            }
            return node;
        });
    };

    const onLoadData = async (node: CustomTreeDataNode) => {
        console.info('Loading data for node:', node.key);
        if (!node.isDirectory) {
            return;
        }

        const newNodes = await fetchDirData(node.key.toString());
        setTreeData((origin) => updateNodeChildren(origin, node.key, newNodes));
    };

    return (
        <div
            className="flex flex-col h-[100%] max-h-[100%] gap-y-2"
            {...restProps}
        >
            <Input
                variant="filled"
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                placeholder={t('placeholder.input-directory-path')}
            />

            <Tree
                className="flex flex-1 overflow-auto"
                showLine={true}
                showIcon={true}
                defaultExpandAll={true}
                onSelect={(selectedKey) => {
                    if (selectedKey.length === 0) {
                        onSelect(null);
                    } else {
                        for (const key of selectedKey) {
                            onSelect(key.toString());
                        }
                    }
                }}
                treeData={treeData}
                loadData={onLoadData}
            />
        </div>
    );
};

export default memo(LocalFilePicker);
