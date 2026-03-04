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
    name: string; // Name of the subtask
    description: string; // Description of the subtask
    expected_outcome: string; // Expected outcome
    outcome: string | null; // Actual outcome
    state: SubTaskStatus; // State
    created_at: string; // Creation timestamp
    finished_at: string | null; // Finish timestamp
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
