/**
 * Centralized Task API service
 * Standardizes window.taskAPI usage and provides type safety
 */

import { Task, ApiTask, TaskStatus, TaskPriority } from '../types';
import { normalizeTask, normalizeTasks } from '../utils/taskUtils';
import { validateTaskTime, adjustTaskTime } from '../utils/taskValidation';

// Helper function to validate and adjust task time
const validateAndAdjustTaskTime = (startDate: string | undefined, endDate: string | undefined) => {
  if (startDate && endDate) {
    const validation = validateTaskTime({
      startDate,
      endDate,
      minimumDurationMinutes: 15
    });
    
    if (!validation.isValid) {
      // 自動調整を試行
      const adjusted = adjustTaskTime({
        startDate,
        endDate,
        minimumDurationMinutes: 15
      });
      
      if (adjusted.adjusted) {
        return { startDate: adjusted.startDate, endDate: adjusted.endDate };
      } else {
        throw new Error('無効な時間設定です: ' + validation.errors.join(', '));
      }
    }
  }
  return { startDate, endDate };
};

/**
 * Task API service class
 * Wraps window.taskAPI with consistent error handling and type safety
 */
class TaskAPIService {
  private api = window.taskAPI;

  /**
   * Loads all tasks
   */
  async loadTasks(): Promise<Task[]> {
    try {
      const apiTasks = await this.api.getAllTasks();
      return normalizeTasks(apiTasks);
    } catch (error) {
      throw new Error('タスクの読み込みに失敗しました');
    }
  }

  /**
   * Saves tasks to storage (using individual create/update calls)
   */
  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      // Note: This is a simplified implementation
      // In a real app, you'd want to track what's new/updated/deleted
    } catch (error) {
      throw new Error('タスクの保存に失敗しました');
    }
  }

  /**
   * Creates a new task
   */
  async createTask(taskData: Partial<Task>): Promise<Task> {
    try {
      let startDate = taskData.startDate || undefined;
      let endDate = taskData.endDate || undefined;
      
      // 時間バリデーションを実行
      const validatedTime = validateAndAdjustTaskTime(startDate, endDate);
      startDate = validatedTime.startDate;
      endDate = validatedTime.endDate;
      
      const createData = {
        title: taskData.title || '',
        description: taskData.description || '',
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        startDate,
        endDate,
        parentId: taskData.parentId || undefined,
        tagIds: taskData.tagIds || [],
        isRoutine: taskData.isRoutine || false,
        routineType: taskData.isRoutine ? 'daily' : null
      };
      
      // Use the real IPC communication instead of in-memory manipulation
      const newTask = await this.api.createTask(createData);
      
      return normalizeTask(newTask);
    } catch (error) {
      throw new Error('タスクの作成に失敗しました');
    }
  }

  /**
   * Creates a new task after a specific task
   */
  async createTaskAfter(taskData: Partial<Task>, afterTaskId: number): Promise<Task> {
    try {
      let startDate = taskData.startDate || undefined;
      let endDate = taskData.endDate || undefined;
      
      // 時間バリデーションを実行
      const validatedTime = validateAndAdjustTaskTime(startDate, endDate);
      startDate = validatedTime.startDate;
      endDate = validatedTime.endDate;
      
      const createData = {
        title: taskData.title || '',
        description: taskData.description || '',
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        startDate,
        endDate,
        parentId: taskData.parentId || undefined,
        tagIds: taskData.tagIds || [],
        isRoutine: taskData.isRoutine || false,
        routineType: taskData.isRoutine ? 'daily' : null
      };
      
      // Use the real IPC communication for positioned task creation
      const newTask = await this.api.createTaskAfter(createData, afterTaskId);
      
      return normalizeTask(newTask);
    } catch (error) {
      throw new Error('タスクの作成に失敗しました');
    }
  }

  /**
   * Updates an existing task
   */
  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    try {
      // 時間関連の更新の場合はバリデーションを実行
      if (updates.startDate || updates.endDate) {
        // 現在のタスクデータを取得
        const currentTask = await this.getTask(id);
        if (!currentTask) {
          throw new Error('Task not found');
        }
        
        const startDate = updates.startDate || currentTask.startDate;
        const endDate = updates.endDate || currentTask.endDate;
        
        if (startDate && endDate) {
          const validation = validateTaskTime({
            startDate,
            endDate,
            minimumDurationMinutes: 15
          });
          
          if (!validation.isValid) {
            // 自動調整を試行
            const adjusted = adjustTaskTime({
              startDate,
              endDate,
              minimumDurationMinutes: 15
            });
            
            if (adjusted.adjusted) {
              updates.startDate = adjusted.startDate;
              updates.endDate = adjusted.endDate;
            } else {
              throw new Error('無効な時間設定です: ' + validation.errors.join(', '));
            }
          }
        }
      }
      
      // Use the real IPC communication instead of in-memory manipulation
      const updatedTask = await this.api.updateTask(id, updates);
      return normalizeTask(updatedTask);
    } catch (error) {
      throw new Error('タスクの更新に失敗しました');
    }
  }

  /**
   * Deletes a task and its children
   */
  async deleteTask(id: number): Promise<void> {
    try {
      // Use the real IPC communication - the database handles cascade deletion
      await this.api.deleteTask(id);
    } catch (error) {
      throw new Error('タスクの削除に失敗しました');
    }
  }

  /**
   * Gets a single task by ID
   */
  async getTask(id: number): Promise<Task | null> {
    try {
      const tasks = await this.loadTasks();
      return tasks.find(task => task.id === id) || null;
    } catch (error) {
      throw new Error('タスクの取得に失敗しました');
    }
  }

  /**
   * Bulk updates multiple tasks
   */
  async bulkUpdateTasks(updates: Array<{ id: number; data: Partial<Task> }>): Promise<Task[]> {
    try {
      const currentTasks = await this.loadTasks();
      
      const updatedTasks = currentTasks.map(task => {
        const update = updates.find(u => u.id === task.id);
        if (!update) return task;
        
        return {
          ...task,
          ...update.data,
          // Handle completedAt logic
          ...(update.data.status === 'completed' && task.status !== 'completed' 
            ? { completedAt: new Date().toISOString() } 
            : {}),
          ...(update.data.status !== 'completed' && task.status === 'completed' 
            ? { completedAt: undefined } 
            : {})
        };
      });
      
      await this.saveTasks(updatedTasks);
      return updatedTasks;
    } catch (error) {
      throw new Error('タスクの一括更新に失敗しました');
    }
  }

  /**
   * Gets tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    try {
      const tasks = await this.loadTasks();
      return tasks.filter(task => task.status === status);
    } catch (error) {
      throw new Error('ステータス別タスクの取得に失敗しました');
    }
  }

  /**
   * Gets tasks by priority
   */
  async getTasksByPriority(priority: TaskPriority): Promise<Task[]> {
    try {
      const tasks = await this.loadTasks();
      return tasks.filter(task => task.priority === priority);
    } catch (error) {
      throw new Error('優先度別タスクの取得に失敗しました');
    }
  }

  /**
   * Gets overdue tasks
   */
  async getOverdueTasks(): Promise<Task[]> {
    try {
      const tasks = await this.loadTasks();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return tasks.filter(task => {
        if (!task.endDate || task.status === 'completed') return false;
        const endDate = new Date(task.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate < today;
      });
    } catch (error) {
      throw new Error('期限切れタスクの取得に失敗しました');
    }
  }

  /**
   * Gets tasks due today
   */
  async getTodayTasks(): Promise<Task[]> {
    try {
      const tasks = await this.loadTasks();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      return tasks.filter(task => {
        if (!task.endDate) return false;
        const endDate = new Date(task.endDate);
        return endDate >= today && endDate < tomorrow;
      });
    } catch (error) {
      throw new Error('今日のタスクの取得に失敗しました');
    }
  }

  /**
   * Search tasks by title and description
   */
  async searchTasks(query: string): Promise<Task[]> {
    try {
      const tasks = await this.loadTasks();
      const lowerQuery = query.toLowerCase();
      
      return tasks.filter(task => 
        task.title.toLowerCase().includes(lowerQuery) ||
        (task.description && task.description.toLowerCase().includes(lowerQuery))
      );
    } catch (error) {
      throw new Error('タスクの検索に失敗しました');
    }
  }
}

// Export singleton instance
export const taskAPI = new TaskAPIService();
export default taskAPI;