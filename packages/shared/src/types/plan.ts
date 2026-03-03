/**
 * SubTask status (matching backend states)
 */
export enum SubTaskStatus {
    TODO = 'todo',
    IN_PROGRESS = 'in_progress',
    DONE = 'done',
    ABANDONED = 'abandoned',
}

/**
 * SubTask interface (matching backend SubTask model)
 */
export interface SubTask {
    name: string; // 子任务名称
    description: string; // 子任务描述
    expected_outcome: string; // 预期结果
    outcome: string | null; // 实际结果
    state: SubTaskStatus; // 状态
    created_at: string; // 创建时间
    finished_at: string | null; // 完成时间
}

/**
 * Plan status (matching backend states)
 */
export enum PlanStatus {
    TODO = 'todo',
    IN_PROGRESS = 'in_progress',
    DONE = 'done',
    ABANDONED = 'abandoned',
}

/**
 * Plan interface (matching backend Plan model)
 */
export interface Plan {
    id: string; // 计划ID
    name: string; // 计划名称
    description: string; // 计划描述
    expected_outcome: string; // 预期结果
    subtasks: SubTask[]; // 子任务列表
    created_at: string; // 创建时间
    state: PlanStatus; // 状态
    finished_at: string | null; // 完成时间
    outcome: string | null; // 实际结果
}
