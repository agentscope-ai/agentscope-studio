export enum RouterPath {
    HOME = '/home',
    DASHBOARD = '/dashboard',

    FRIDAY = '/as-friday',
    FRIDAY_CHAT = 'chat',
    FRIDAY_SETTING = 'setting',

    EVAL = '/eval',
    EVAL_EVALUATION = ':benchmarkName/:evalId',
    EVAL_TASK = ':benchmarkName/:evalId/task/:taskId',
}
