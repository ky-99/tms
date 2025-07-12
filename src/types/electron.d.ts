export interface TaskAPI {
  getAllTasks: () => Promise<any[]>;
  createTask: (taskData: any) => Promise<any>;
  createTaskAfter: (taskData: any, afterTaskId: number) => Promise<any>;
  updateTask: (id: number, updates: any) => Promise<any>;
  deleteTask: (id: number) => Promise<boolean>;
  createTag: (name: string, color: string, textColor?: string) => Promise<any>;
  getAllTags: () => Promise<any[]>;
  addTagToTask: (taskId: number, tagId: number) => Promise<void>;
  removeTagFromTask: (taskId: number, tagId: number) => Promise<void>;
  updateTag: (id: number, name: string, color: string, textColor: string) => Promise<any>;
  deleteTag: (id: number) => Promise<boolean>;
  getTagsByTaskId: (taskId: number) => Promise<any[]>;
}

declare global {
  interface Window {
    taskAPI: TaskAPI;
  }
}