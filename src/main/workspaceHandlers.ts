import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getWorkspaceManager, WorkSpaceMetadata } from '../database/workspaceManager';

export function registerWorkspaceHandlers(): void {
  const workspaceManager = getWorkspaceManager();

  // Get all workspaces
  ipcMain.handle('workspace:getAll', async (): Promise<WorkSpaceMetadata[]> => {
    try {
      const workspaces = workspaceManager.getAllWorkspaces();
      
      // Get stats for each workspace
      const workspacesWithStats = await Promise.all(
        workspaces.map(async (workspace) => {
          const stats = workspaceManager.getWorkspaceStats(workspace.id);
          return {
            ...workspace,
            taskCount: stats?.taskCount || 0,
            completedTaskCount: stats?.completedTaskCount || 0,
            tagCount: stats?.tagCount || 0
          };
        })
      );
      
      return workspacesWithStats;
    } catch (error) {
      console.error('Error getting workspaces:', error);
      throw error;
    }
  });

  // Get active workspace
  ipcMain.handle('workspace:getActive', async (): Promise<WorkSpaceMetadata | null> => {
    try {
      const activeWorkspace = workspaceManager.getActiveWorkspace();
      if (!activeWorkspace) return null;
      
      const stats = workspaceManager.getWorkspaceStats(activeWorkspace.id);
      return {
        ...activeWorkspace,
        taskCount: stats?.taskCount || 0,
        completedTaskCount: stats?.completedTaskCount || 0,
        tagCount: stats?.tagCount || 0
      };
    } catch (error) {
      console.error('Error getting active workspace:', error);
      throw error;
    }
  });

  // Create workspace
  ipcMain.handle('workspace:create', async (
    event: IpcMainInvokeEvent,
    workspaceData: {
      name: string;
      description?: string;
    }
  ): Promise<WorkSpaceMetadata> => {
    try {
      const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const workspace = workspaceManager.createWorkspace({
        id: workspaceId,
        name: workspaceData.name,
        description: workspaceData.description || '',
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        isActive: false
      });
      
      const stats = workspaceManager.getWorkspaceStats(workspace.id);
      return {
        ...workspace,
        taskCount: stats?.taskCount || 0,
        completedTaskCount: stats?.completedTaskCount || 0,
        tagCount: stats?.tagCount || 0
      };
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  });

  // Switch to workspace
  ipcMain.handle('workspace:switch', async (
    event: IpcMainInvokeEvent,
    workspaceId: string
  ): Promise<boolean> => {
    try {
      const success = workspaceManager.switchToWorkspace(workspaceId);
      if (success) {
        // Reset TaskRepository to use new workspace
        if ((global as any).resetTaskRepository) {
          (global as any).resetTaskRepository();
        }
        // Notify renderer of workspace change
        event.sender.send('workspace:changed', workspaceId);
      }
      return success;
    } catch (error) {
      console.error('Error switching workspace:', error);
      throw error;
    }
  });

  // Delete workspace
  ipcMain.handle('workspace:delete', async (
    event: IpcMainInvokeEvent,
    workspaceId: string
  ): Promise<boolean> => {
    try {
      return workspaceManager.deleteWorkspace(workspaceId);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  });

  // Get workspace by ID
  ipcMain.handle('workspace:getById', async (
    event: IpcMainInvokeEvent,
    workspaceId: string
  ): Promise<WorkSpaceMetadata | null> => {
    try {
      const workspace = workspaceManager.getWorkspaceById(workspaceId);
      if (!workspace) return null;
      
      const stats = workspaceManager.getWorkspaceStats(workspace.id);
      return {
        ...workspace,
        taskCount: stats?.taskCount || 0,
        completedTaskCount: stats?.completedTaskCount || 0,
        tagCount: stats?.tagCount || 0
      };
    } catch (error) {
      console.error('Error getting workspace by ID:', error);
      throw error;
    }
  });

  // Get workspace stats
  ipcMain.handle('workspace:getStats', async (
    event: IpcMainInvokeEvent,
    workspaceId: string
  ) => {
    try {
      return workspaceManager.getWorkspaceStats(workspaceId);
    } catch (error) {
      console.error('Error getting workspace stats:', error);
      throw error;
    }
  });

  // Export workspace
  ipcMain.handle('workspace:export', async (
    event: IpcMainInvokeEvent,
    workspaceId: string
  ): Promise<string | null> => {
    try {
      return await workspaceManager.exportWorkspace(workspaceId);
    } catch (error) {
      console.error('Error exporting workspace:', error);
      throw error;
    }
  });

  // Select file for import
  ipcMain.handle('workspace:selectFileForImport', async (): Promise<string | null> => {
    try {
      return await workspaceManager.selectFileForImport();
    } catch (error) {
      console.error('Error selecting file for import:', error);
      throw error;
    }
  });

  // Validate import file
  ipcMain.handle('workspace:validateImportFile', async (
    event: IpcMainInvokeEvent,
    filePath: string
  ): Promise<boolean> => {
    try {
      workspaceManager.validateImportFile(filePath);
      return true;
    } catch (error) {
      console.error('Error validating import file:', error);
      throw error;
    }
  });

  // Import workspace from file data
  ipcMain.handle('workspace:importFromFileData', async (
    event: IpcMainInvokeEvent,
    fileData: Uint8Array,
    fileName: string
  ): Promise<{ tempPath: string } | null> => {
    try {
      return await workspaceManager.importFromFileData(fileData, fileName);
    } catch (error) {
      console.error('Error importing from file data:', error);
      throw error;
    }
  });

  // Import workspace
  ipcMain.handle('workspace:import', async (
    event: IpcMainInvokeEvent,
    sourceDbPath: string,
    name: string,
    description?: string
  ): Promise<WorkSpaceMetadata> => {
    try {
      return await workspaceManager.importWorkspace(sourceDbPath, name, description);
    } catch (error) {
      console.error('Error importing workspace:', error);
      throw error;
    }
  });
}

export function unregisterWorkspaceHandlers(): void {
  ipcMain.removeAllListeners('workspace:getAll');
  ipcMain.removeAllListeners('workspace:getActive');
  ipcMain.removeAllListeners('workspace:create');
  ipcMain.removeAllListeners('workspace:switch');
  ipcMain.removeAllListeners('workspace:delete');
  ipcMain.removeAllListeners('workspace:getById');
  ipcMain.removeAllListeners('workspace:getStats');
  ipcMain.removeAllListeners('workspace:export');
  ipcMain.removeAllListeners('workspace:selectFileForImport');
  ipcMain.removeAllListeners('workspace:validateImportFile');
  ipcMain.removeAllListeners('workspace:importFromFileData');
  ipcMain.removeAllListeners('workspace:import');
}