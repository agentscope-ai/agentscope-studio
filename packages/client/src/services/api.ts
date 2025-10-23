/**
 * API 服务层
 * 统一管理所有 API 接口调用
 */

import { RequestUtils } from '@/utils/request';
import type {
    Project,
    DashboardStats,
    ListParams,
    PaginationResponse,
} from '@shared/request/api';

/**
 * 项目相关 API
 */
export class ProjectAPI {
    /**
     * 获取项目列表
     */
    static async getProjects(
        params?: ListParams,
    ): Promise<PaginationResponse<Project>> {
        const response = await RequestUtils.get<PaginationResponse<Project>>(
            '/api/projects',
            params,
        );
        return response.data;
    }

    /**
     * 获取项目详情
     */
    static async getProject(id: string): Promise<Project> {
        const response = await RequestUtils.get<Project>(`/api/projects/${id}`);
        return response.data;
    }
}

/**
 * 仪表板 API
 */
export class DashboardAPI {
    /**
     * 获取仪表板统计数据
     */
    static async getStats(): Promise<DashboardStats> {
        const response = await RequestUtils.get<DashboardStats>(
            '/api/dashboard/stats',
        );
        return response.data;
    }
}

/**
 * 统一导出所有 API
 */
export const API = {
    project: ProjectAPI,
    dashboard: DashboardAPI,
};

// 默认导出
export default API;
