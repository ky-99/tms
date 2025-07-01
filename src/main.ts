import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initializeDatabase } from './database/init';
import { TaskRepository } from './database/taskRepository';
import { createSampleData } from './database/sampleData';

let mainWindow: BrowserWindow | null = null;
let taskRepository: TaskRepository | null = null;

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
    console.log('Initializing database...');
    initializeDatabase();
    console.log('Database initialized successfully');
    
    taskRepository = new TaskRepository();
    console.log('TaskRepository created successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Show error dialog to user
    const { dialog } = require('electron');
    const errorMessage = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Database Error', `Failed to initialize database: ${errorMessage}\n\nPlease check permissions and try again.`);
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
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  try {
    const tasks = taskRepository.getAllTasksAsTree();
    
    // If no tasks exist, create sample data
    if (tasks.length === 0) {
      createSampleData(taskRepository);
      return taskRepository.getAllTasksAsTree();
    }
    
    return tasks;
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
});

ipcMain.handle('create-task', async (_, taskData) => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  return taskRepository.createTask(taskData);
});

ipcMain.handle('update-task', async (_, { id, updates }) => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  return taskRepository.updateTask(id, updates);
});

ipcMain.handle('delete-task', async (_, id) => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  return taskRepository.deleteTask(id);
});

ipcMain.handle('create-tag', async (_, name, color, textColor) => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  return taskRepository.createTag(name, color, textColor);
});

ipcMain.handle('get-all-tags', async () => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  try {
    return taskRepository.getAllTags();
  } catch (error) {
    console.error('Error getting tags:', error);
    return [];
  }
});

ipcMain.handle('add-tag-to-task', async (_, taskId, tagId) => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  return taskRepository.addTagToTask(taskId, tagId);
});

ipcMain.handle('remove-tag-from-task', async (_, taskId, tagId) => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  return taskRepository.removeTagFromTask(taskId, tagId);
});

ipcMain.handle('update-tag', async (_, id, name, color, textColor) => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  return taskRepository.updateTag(id, name, color, textColor);
});

ipcMain.handle('delete-tag', async (_, id) => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  return taskRepository.deleteTag(id);
});

ipcMain.handle('get-tags-by-task-id', async (_, taskId) => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  return taskRepository.getTagsByTaskId(taskId);
});

ipcMain.handle('get-routine-tasks', async () => {
  if (!taskRepository) {
    throw new Error('Database not initialized');
  }
  return taskRepository.getRoutineTasks();
});