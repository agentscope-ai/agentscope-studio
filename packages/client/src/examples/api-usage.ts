// /**
//  * API 使用示例
//  * 展示如何在组件中使用配置好的 API
//  */

// import { API } from '@/services/api';
// import { useApi, usePagination, useUpload } from '@/hooks/useApi';
// import type { Project, CreateProjectParams, User } from '@/types/api';

// // ==================== 基础 API 调用示例 ====================

// /**
// /**
//  * 示例 1: 基础 API 调用
//  */
// export async function basicApiExample() {
//   try {
//     // 获取项目列表
//     const projects = await API.project.getProjects({ page: 1, pageSize: 10 });
//     console.log('项目列表:', projects);

//     // 创建新项目
//     const newProject = await API.project.createProject({
//       name: '新项目',
//       description: '这是一个新项目',
//     });
//     console.log('创建的项目:', newProject);

//     // 获取用户信息
//     const user = await API.user.getCurrentUser();
//     console.log('当前用户:', user);
//   } catch (error) {
//     console.error('API 调用失败:', error);
//   }
// }

// // ==================== React Hook 使用示例 ====================

// /**
//  * 示例 2: 在 React 组件中使用 useApi Hook
//  */
// export function ProjectListComponent() {
//   // 使用 useApi Hook 获取项目列表
//   const {
//     data: projects,
//     status,
//     error,
//     execute: loadProjects,
//     isLoading,
//   } = useApi(API.project.getProjects);

//   // 组件挂载时加载数据
//   React.useEffect(() => {
//     loadProjects({ page: 1, pageSize: 10 });
//   }, [loadProjects]);

//   if (isLoading) return <div>加载中...</div>;
//   if (error) return <div>错误: {error}</div>;

//   return (
//     <div>
//       <h2>项目列表</h2>
//       {projects?.list.map(project => (
//         <div key={project.id}>
//           <h3>{project.name}</h3>
//           <p>{project.description}</p>
//         </div>
//       ))}
//     </div>
//   );
// }

// /**
//  * 示例 3: 使用分页 Hook
//  */
// export function PaginatedProjectList() {
//   const {
//     data: projects,
//     pagination,
//     loadData,
//     refresh,
//     isLoading,
//     isError,
//     error,
//   } = usePagination(API.project.getProjects);

//   const handlePageChange = (page: number) => {
//     loadData({ page, pageSize: pagination.pageSize });
//   };

//   return (
//     <div>
//       <h2>分页项目列表</h2>
//       {isLoading && <div>加载中...</div>}
//       {isError && <div>错误: {error}</div>}
      
//       {projects.map(project => (
//         <div key={project.id}>
//           <h3>{project.name}</h3>
//           <p>{project.description}</p>
//         </div>
//       ))}
      
//       <div>
//         <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
//           上一页
//         </button>
//         <span>第 {pagination.page} 页，共 {pagination.totalPages} 页</span>
//         <button 
//           onClick={() => handlePageChange(pagination.page + 1)} 
//           disabled={pagination.page >= pagination.totalPages}
//         >
//           下一页
//         </button>
//       </div>
//     </div>
//   );
// }

// /**
//  * 示例 4: 文件上传
//  */
// export function FileUploadComponent() {
//   const {
//     progress,
//     status,
//     error,
//     result,
//     upload,
//     reset,
//     isUploading,
//     isSuccess,
//   } = useUpload(API.file.uploadFile);

//   const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file) {
//       upload(file);
//     }
//   };

//   return (
//     <div>
//       <h2>文件上传</h2>
//       <input type="file" onChange={handleFileSelect} disabled={isUploading} />
      
//       {isUploading && (
//         <div>
//           <div>上传进度: {progress}%</div>
//           <div style={{ width: '100%', backgroundColor: '#f0f0f0' }}>
//             <div 
//               style={{ 
//                 width: `${progress}%`, 
//                 height: '20px', 
//                 backgroundColor: '#4CAF50' 
//               }}
//             />
//           </div>
//         </div>
//       )}
      
//       {isSuccess && result && (
//         <div>
//           <p>上传成功!</p>
//           <p>文件 URL: {result.url}</p>
//           <button onClick={reset}>重新上传</button>
//         </div>
//       )}
      
//       {error && (
//         <div>
//           <p>上传失败: {error}</p>
//           <button onClick={reset}>重试</button>
//         </div>
//       )}
//     </div>
//   );
// }

// // ==================== 高级用法示例 ====================

// /**
//  * 示例 5: 组合多个 API 调用
//  */
// export function DashboardComponent() {
//   const [stats, setStats] = React.useState(null);
//   const [recentProjects, setRecentProjects] = React.useState([]);

//   React.useEffect(() => {
//     const loadDashboardData = async () => {
//       try {
//         // 并行加载多个数据
//         const [statsData, projectsData] = await Promise.all([
//           API.dashboard.getStats(),
//           API.project.getProjects({ page: 1, pageSize: 5 }),
//         ]);
        
//         setStats(statsData);
//         setRecentProjects(projectsData.list);
//       } catch (error) {
//         console.error('加载仪表板数据失败:', error);
//       }
//     };

//     loadDashboardData();
//   }, []);

//   return (
//     <div>
//       <h2>仪表板</h2>
//       {stats && (
//         <div>
//           <p>总项目数: {stats.totalProjects}</p>
//           <p>总运行数: {stats.totalRuns}</p>
//           <p>活跃运行数: {stats.activeRuns}</p>
//         </div>
//       )}
      
//       <h3>最近项目</h3>
//       {recentProjects.map(project => (
//         <div key={project.id}>
//           <h4>{project.name}</h4>
//           <p>{project.description}</p>
//         </div>
//       ))}
//     </div>
//   );
// }

// /**
//  * 示例 6: 错误处理和重试
//  */
// export function RobustApiComponent() {
//   const [retryCount, setRetryCount] = React.useState(0);
//   const maxRetries = 3;

//   const {
//     data,
//     status,
//     error,
//     execute,
//     isLoading,
//   } = useApi(API.project.getProjects);

//   const handleRetry = () => {
//     if (retryCount < maxRetries) {
//       setRetryCount(prev => prev + 1);
//       execute({ page: 1, pageSize: 10 });
//     }
//   };

//   React.useEffect(() => {
//     execute({ page: 1, pageSize: 10 });
//   }, [execute]);

//   return (
//     <div>
//       <h2>健壮的 API 调用</h2>
//       {isLoading && <div>加载中...</div>}
      
//       {error && (
//         <div>
//           <p>错误: {error}</p>
//           <p>重试次数: {retryCount}/{maxRetries}</p>
//           {retryCount < maxRetries && (
//             <button onClick={handleRetry}>重试</button>
//           )}
//         </div>
//       )}
      
//       {data && (
//         <div>
//           <p>加载成功! 共 {data.list.length} 个项目</p>
//           {data.list.map(project => (
//             <div key={project.id}>{project.name}</div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ==================== 环境变量配置示例 ====================

// /**
//  * 在 .env 文件中配置 API 基础地址
//  * VITE_API_BASE_URL=http://localhost:3001
//  */

// // ==================== 导出所有示例 ====================
// export {
//   basicApiExample,
//   ProjectListComponent,
//   PaginatedProjectList,
//   FileUploadComponent,
//   DashboardComponent,
//   RobustApiComponent,
// };
