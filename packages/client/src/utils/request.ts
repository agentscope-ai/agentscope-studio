import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG, API_STATUS } from '@/config/api';

/**
 * 请求响应接口
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  success: boolean;
}

/**
 * 请求错误接口
 */
export interface RequestError {
  code: number;
  message: string;
  data?: any;
}

/**
 * 创建 axios 实例
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: API_CONFIG.HEADERS,
  });

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      // 可以在这里添加 token 等认证信息
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // 打印请求信息（开发环境）
      if (import.meta.env.DEV) {
        console.log('🚀 Request:', {
          url: config.url,
          method: config.method,
          data: config.data,
          params: config.params,
        });
      }
      
      return config;
    },
    (error) => {
      console.error('❌ Request Error:', error);
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      // 打印响应信息（开发环境）
      if (import.meta.env.DEV) {
        console.log('✅ Response:', {
          url: response.config.url,
          status: response.status,
          data: response.data,
        });
      }
      
      return response;
    },
    (error: AxiosError) => {
      // 处理响应错误
      const requestError: RequestError = {
        code: error.response?.status || 500,
        message: error.message || '请求失败',
        data: error.response?.data,
      };
      
      // 根据状态码处理不同错误
      switch (error.response?.status) {
        case API_STATUS.UNAUTHORIZED:
          // 未授权，清除 token 并跳转到登录页
          localStorage.removeItem('token');
          // window.location.href = '/login';
          break;
        case API_STATUS.FORBIDDEN:
          requestError.message = '没有权限访问该资源';
          break;
        case API_STATUS.NOT_FOUND:
          requestError.message = '请求的资源不存在';
          break;
        case API_STATUS.INTERNAL_SERVER_ERROR:
          requestError.message = '服务器内部错误';
          break;
        default:
          requestError.message = error.message || '网络错误';
      }
      
      console.error('❌ Response Error:', requestError);
      return Promise.reject(requestError);
    }
  );

  return instance;
};

// 创建 axios 实例
export const request = createAxiosInstance();

/**
 * 通用请求方法
 */
export class RequestUtils {
  /**
   * GET 请求
   */
  static async get<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await request.get<ApiResponse<T>>(url, {
      params,
      ...config,
    });
    return response.data;
  }

  /**
   * POST 请求
   */
  static async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await request.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * PUT 请求
   */
  static async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await request.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * DELETE 请求
   */
  static async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await request.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * PATCH 请求
   */
  static async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await request.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * 上传文件
   */
  static async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await request.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  }

  /**
   * 下载文件
   */
  static async download(
    url: string,
    filename?: string
  ): Promise<void> {
    const response = await request.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

// 导出默认实例
export default request;
