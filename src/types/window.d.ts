export interface TaskAPI {
  getAllTasks: () => Promise<any[]>;
  createTask: (taskData: any) => Promise<any>;
  updateTask: (id: number, updates: any) => Promise<any>;
  deleteTask: (id: number) => Promise<void>;
  createTag: (name: string, color: string, textColor?: string) => Promise<any>;
  getAllTags: () => Promise<any[]>;
  addTagToTask: (taskId: number, tagId: number) => Promise<void>;
  removeTagFromTask: (taskId: number, tagId: number) => Promise<void>;
  updateTag: (id: number, name: string, color: string, textColor: string) => Promise<any>;
  deleteTag: (id: number) => Promise<void>;
  getTagsByTaskId: (taskId: number) => Promise<any[]>;
  generateDailyRoutineTasks: () => Promise<boolean>;
  getRoutineTasks: () => Promise<any[]>;
}

declare global {
  interface Window {
    taskAPI: TaskAPI;
  }
}