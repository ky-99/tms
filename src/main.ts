import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initializeDatabase } from './database/init';
import { TaskRepository } from './database/taskRepository';
import { registerWorkspaceHandlers } from './main/workspaceHandlers';
import { getWorkspaceManager } from './database/workspaceManager';

let mainWindow: BrowserWindow | null = null;
let taskRepository: TaskRepository | null = null;

function getTaskRepository(): TaskRepository {
  if (!taskRepository) {
    const workspaceManager = getWorkspaceManager();
    taskRepository = new TaskRepository(workspaceManager);
  }
  return taskRepository;
}

function resetTaskRepository(): void {
  taskRepository = null;
}

// Export for use in workspace handlers
(global as any).resetTaskRepository = resetTaskRepository;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Task Management System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const workspaceManager = getWorkspaceManager();
    
    // Register workspace handlers
    registerWorkspaceHandlers();
  } catch (error) {
    // Show error dialog to user
    const { dialog } = require('electron');
    const errorMessage = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Database Error', `Failed to initialize workspace manager: ${errorMessage}\n\nPlease check permissions and try again.`);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-all-tasks', async () => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.getAllTasksAsTree();
  } catch (error) {
    return [];
  }
});

ipcMain.handle('create-task', async (_, taskData) => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.createTask(taskData);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('create-task-after', async (_, taskData, afterTaskId) => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.createTaskAfter(taskData, afterTaskId);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('update-task', async (_, { id, updates }) => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.updateTask(id, updates);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('delete-task', async (_, id) => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.deleteTask(id);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('create-tag', async (_, name, color, textColor) => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.createTag(name, color, textColor);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('get-all-tags', async () => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.getAllTags();
  } catch (error) {
    return [];
  }
});

ipcMain.handle('add-tag-to-task', async (_, taskId, tagId) => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.addTagToTask(taskId, tagId);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('remove-tag-from-task', async (_, taskId, tagId) => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.removeTagFromTask(taskId, tagId);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('update-tag', async (_, id, name, color, textColor) => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.updateTag(id, name, color, textColor);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('delete-tag', async (_, id) => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.deleteTag(id);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('get-tags-by-task-id', async (_, taskId) => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.getTagsByTaskId(taskId);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('get-routine-tasks', async () => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.getRoutineTasks();
  } catch (error) {
    return [];
  }
});

ipcMain.handle('generate-daily-routine-tasks', async () => {
  try {
    const taskRepo = getTaskRepository();
    return taskRepo.generateDailyRoutineTasks();
  } catch (error) {
    console.error('Error generating daily routine tasks:', error);
    return false;
  }
});