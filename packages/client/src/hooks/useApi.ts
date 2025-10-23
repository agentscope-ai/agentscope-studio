/**
 * API 相关 React Hooks
 * 提供便捷的 API 调用和状态管理
 */

import { useState, useCallback, useEffect } from 'react';
import type { RequestStatus } from '@/types/api';

/**
 * API 调用状态
 */
interface UseApiState<T> {
  data: T | null;
  status: RequestStatus;
  error: string | null;
}

/**
 * API 调用返回值
 */
interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * 通用 API Hook
 * @param apiFunction API 函数
 * @param immediate 是否立即执行
 */
export function useApi<T = any, P extends any[] = any[]>(
  apiFunction: (...args: P) => Promise<T>,
  immediate = false
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    status: 'idle',
    error: null,
  });

  const execute = useCallback(
    async (...args: P) => {
      setState(prev => ({ ...prev, status: 'loading', error: null }));
      
      try {
        const data = await apiFunction(...args);
        setState({ data, status: 'success', error: null });
        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '请求失败';
        setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
        throw error;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, status: 'idle', error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as P));
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
}

/**
 * 分页数据 Hook
 */
interface UsePaginationState<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  status: RequestStatus;
  error: string | null;
}

interface UsePaginationReturn<T> extends UsePaginationState<T> {
  loadData: (params?: any) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * 分页数据 Hook
 * @param apiFunction 获取分页数据的 API 函数
 * @param initialParams 初始参数
 */
export function usePagination<T = any>(
  apiFunction: (params?: any) => Promise<{ list: T[]; pagination: any }>,
  initialParams?: any
): UsePaginationReturn<T> {
  const [state, setState] = useState<UsePaginationState<T>>({
    data: [],
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    },
    status: 'idle',
    error: null,
  });

  const loadData = useCallback(
    async (params?: any) => {
      setState(prev => ({ ...prev, status: 'loading', error: null }));
      
      try {
        const response = await apiFunction(params);
        setState({
          data: response.list,
          pagination: response.pagination,
          status: 'success',
          error: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '请求失败';
        setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      }
    },
    [apiFunction]
  );

  const refresh = useCallback(() => {
    return loadData();
  }, [loadData]);

  const reset = useCallback(() => {
    setState({
      data: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
      status: 'idle',
      error: null,
    });
  }, []);

  useEffect(() => {
    loadData(initialParams);
  }, [loadData, initialParams]);

  return {
    ...state,
    loadData,
    refresh,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
}
