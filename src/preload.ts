import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('taskAPI', {
  getAllTasks: () => ipcRenderer.invoke('get-all-tasks'),
  createTask: (taskData: any) => ipcRenderer.invoke('create-task', taskData),
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
});