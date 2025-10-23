/**
 * API 配置文件
 * 统一管理 API 基础配置
 */

// API 基础配置
export const API_CONFIG = {
  // 开发环境 API 地址
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5173',
  
  // 请求超时时间（毫秒）
  TIMEOUT: 10000,
  
  // 请求头配置
  HEADERS: {
    'Content-Type': 'application/json',
  },
  
  // 重试配置
  RETRY: {
    // 重试次数
    RETRIES: 3,
    // 重试延迟（毫秒）
    RETRY_DELAY: 1000,
  },
} as const;

// 环境变量类型
export interface ApiEnv {
  VITE_API_BASE_URL?: string;
}

// API 响应状态码
export const API_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// 导出类型
export type ApiStatus = typeof API_STATUS[keyof typeof API_STATUS];
