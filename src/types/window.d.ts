export interface TaskAPI {
  getAllTasks: () => Promise<any[]>;
  createTask: (taskData: any) => Promise<any>;
  createTaskAfter: (taskData: any, afterTaskId: number) => Promise<any>;
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

export interface WorkspaceAPI {
  getAll: () => Promise<any[]>;
  getActive: () => Promise<any>;
  create: (workspaceData: { name: string; description?: string }) => Promise<any>;
  switch: (workspaceId: string) => Promise<boolean>;
  delete: (workspaceId: string) => Promise<boolean>;
  getById: (workspaceId: string) => Promise<any>;
  getStats: (workspaceId: string) => Promise<any>;
  export: (workspaceId: string) => Promise<string | null>;
  selectFileForImport: () => Promise<string | null>;
  validateImportFile: (filePath: string) => Promise<boolean>;
  importFromFileData: (fileData: Uint8Array, fileName: string) => Promise<{ tempPath: string } | null>;
  import: (sourceDbPath: string, name: string, description?: string) => Promise<any>;
  onChanged: (callback: (workspaceId: string) => void) => any;
  offChanged: (listener: any) => void;
}

export interface ElectronAPI {
  task: TaskAPI;
  workspace: WorkspaceAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    taskAPI: TaskAPI; // Keep for backward compatibility
  }
}