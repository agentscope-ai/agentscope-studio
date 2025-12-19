import { memo, useEffect, useState, useCallback } from 'react';
import { Tree, TreeDataNode, Input } from 'antd';
import { FolderOutlined, FileOutlined } from '@ant-design/icons';
import type { Key } from 'react';
import { FileItem } from '@shared/types/file.ts';

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
    return '/home';
};

const LocalFilePicker = ({ type, onSelect, ...resetProps }: Props) => {
    const [currentPath, setCurrentPath] = useState<string>(getInitialPath());
    const [treeData, setTreeData] = useState<CustomTreeDataNode[]>([]);

    // Obtain directory from local file system
    const fetchDirData = useCallback(
        async (path: string): Promise<CustomTreeDataNode[]> => {
            try {
                const response = await fetch('/trpc/listDir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path }),
                });
                console.log(response);
                const data = await response.json();
                if (
                    data.result.data.success &&
                    Array.isArray(data.result.data.data)
                ) {
                    return data.result.data.data.map((item: FileItem) => {
                        return {
                            title: item.name,
                            key: item.path,
                            children: item.isDirectory ? [] : undefined,
                            isLeaf: !item.isDirectory,
                            icon: item.isDirectory ? (
                                <FolderOutlined />
                            ) : (
                                <FileOutlined />
                            ),
                            selectable: item.isDirectory,
                            isDirectory: item.isDirectory,
                        } as CustomTreeDataNode;
                    });
                }
                return [];
            } catch (error) {
                console.error('Failed to fetch directory data:', error);
                return [];
            }
        },
        [],
    );

    // 初始化根目录
    useEffect(() => {
        const initializeTree = async () => {
            const items = await fetchDirData(currentPath);
            setTreeData(items);
        };

        initializeTree();
    }, [currentPath, fetchDirData]);

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
            {...resetProps}
        >
            <Input
                variant={'filled'}
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                placeholder="输入目录路径"
            />

            <Tree
                className={'flex flex-1 overflow-auto'}
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
