import { contextBridge, ipcRenderer } from 'electron';

const taskAPI = {
  getAllTasks: () => ipcRenderer.invoke('get-all-tasks'),
  createTask: (taskData: any) => ipcRenderer.invoke('create-task', taskData),
  createTaskAfter: (taskData: any, afterTaskId: number) => ipcRenderer.invoke('create-task-after', taskData, afterTaskId),
  updateTask: (id: number, updates: any) => ipcRenderer.invoke('update-task', { id, updates }),
  deleteTask: (id: number) => ipcRenderer.invoke('delete-task', id),
  createTag: (name: string, color: string, textColor?: string) => ipcRenderer.invoke('create-tag', name, color, textColor),
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  addTagToTask: (taskId: number, tagId: number) => ipcRenderer.invoke('add-tag-to-task', taskId, tagId),
  removeTagFromTask: (taskId: number, tagId: number) => ipcRenderer.invoke('remove-tag-from-task', taskId, tagId),
  updateTag: (id: number, name: string, color: string, textColor: string) => ipcRenderer.invoke('update-tag', id, name, color, textColor),
  deleteTag: (id: number) => ipcRenderer.invoke('delete-tag', id),
  getTagsByTaskId: (taskId: number) => ipcRenderer.invoke('get-tags-by-task-id', taskId),
  generateDailyRoutineTasks: () => ipcRenderer.invoke('generate-daily-routine-tasks'),
  getRoutineTasks: () => ipcRenderer.invoke('get-routine-tasks')
};

contextBridge.exposeInMainWorld('electronAPI', {
  task: taskAPI,
  workspace: {
    getAll: () => ipcRenderer.invoke('workspace:getAll'),
    getActive: () => ipcRenderer.invoke('workspace:getActive'),
    create: (workspaceData: { name: string; description?: string }) => ipcRenderer.invoke('workspace:create', workspaceData),
    switch: (workspaceId: string) => ipcRenderer.invoke('workspace:switch', workspaceId),
    delete: (workspaceId: string) => ipcRenderer.invoke('workspace:delete', workspaceId),
    getById: (workspaceId: string) => ipcRenderer.invoke('workspace:getById', workspaceId),
    getStats: (workspaceId: string) => ipcRenderer.invoke('workspace:getStats', workspaceId),
    export: (workspaceId: string) => ipcRenderer.invoke('workspace:export', workspaceId),
    selectFileForImport: () => ipcRenderer.invoke('workspace:selectFileForImport'),
    validateImportFile: (filePath: string) => ipcRenderer.invoke('workspace:validateImportFile', filePath),
    importFromFileData: (fileData: Uint8Array, fileName: string) => ipcRenderer.invoke('workspace:importFromFileData', fileData, fileName),
    import: (sourceDbPath: string, name: string, description?: string) => ipcRenderer.invoke('workspace:import', sourceDbPath, name, description),
    onChanged: (callback: (workspaceId: string) => void) => {
      const listener = (_: any, workspaceId: string) => callback(workspaceId);
      ipcRenderer.on('workspace:changed', listener);
      return listener;
    },
    offChanged: (listener: any) => {
      ipcRenderer.removeListener('workspace:changed', listener);
    }
  },
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
  }
});

// Backward compatibility
contextBridge.exposeInMainWorld('taskAPI', taskAPI);