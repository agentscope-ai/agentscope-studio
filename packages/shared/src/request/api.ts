/**
 * API 相关类型定义
 */

// 通用分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  total?: number;
}

// 通用分页响应
export interface PaginationResponse<T> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 通用列表查询参数
export interface ListParams extends PaginationParams {
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

// 项目相关类型
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectParams {
  name: string;
  description?: string;
}

export interface UpdateProjectParams {
  name?: string;
  description?: string;
  status?: Project['status'];
}

// 运行相关类型
export interface Run {
  id: string;
  projectId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  duration?: number;
  logs?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRunParams {
  projectId: string;
  name: string;
}

export interface UpdateRunParams {
  name?: string;
  status?: Run['status'];
}

// 消息相关类型
export interface Message {
  id: string;
  runId: string;
  content: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SendMessageParams {
  runId: string;
  content: string;
  type?: Message['type'];
  metadata?: Record<string, any>;
}

// 评估相关类型
export interface Evaluation {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvaluationParams {
  projectId: string;
  name: string;
  description?: string;
}

// 文件上传相关类型
export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// 统计相关类型
export interface DashboardStats {
  totalProjects: number;
  totalRuns: number;
  activeRuns: number;
  totalMessages: number;
  recentActivity: Array<{
    id: string;
    type: 'project' | 'run' | 'message';
    action: string;
    timestamp: string;
  }>;
}

// 错误相关类型
export interface ApiError {
  code: number;
  message: string;
  details?: string;
  field?: string;
}

// 请求状态类型
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

// 通用响应类型
export interface BaseResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  code: number;
}

// 导出所有类型
export type {
  PaginationParams,
  PaginationResponse,
  ListParams,
  User,
  LoginParams,
  LoginResponse,
  Project,
  CreateProjectParams,
  UpdateProjectParams,
  Run,
  CreateRunParams,
  UpdateRunParams,
  Message,
  SendMessageParams,
  Evaluation,
  CreateEvaluationParams,
  UploadResponse,
  DashboardStats,
  ApiError,
  RequestStatus,
  BaseResponse,
};
