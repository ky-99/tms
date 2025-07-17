export interface WorkSpace {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastUsed: string;
  isActive: boolean;
  taskCount: number;
  completedTaskCount?: number;
  tagCount?: number;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}

export interface WorkspaceStats {
  taskCount: number;
  completedTaskCount: number;
  tagCount: number;
}

class WorkspaceService {
  // Get all workspaces
  async getAllWorkspaces(): Promise<WorkSpace[]> {
    try {
      const workspaces = await window.electronAPI.workspace.getAll();
      return workspaces;
    } catch (error) {
      throw error;
    }
  }

  // Get active workspace
  async getActiveWorkspace(): Promise<WorkSpace | null> {
    try {
      return await window.electronAPI.workspace.getActive();
    } catch (error) {
      throw error;
    }
  }

  // Create new workspace
  async createWorkspace(workspaceData: CreateWorkspaceInput): Promise<WorkSpace> {
    try {
      const workspace = await window.electronAPI.workspace.create(workspaceData);
      return workspace;
    } catch (error) {
      throw error;
    }
  }

  // Switch to workspace
  async switchToWorkspace(workspaceId: string): Promise<boolean> {
    try {
      const success = await window.electronAPI.workspace.switch(workspaceId);
      if (success) {
        // Note: Page reload is handled by the calling component
        // to avoid infinite reload loops
      }
      return success;
    } catch (error) {
      throw error;
    }
  }

  // Delete workspace
  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    try {
      return await window.electronAPI.workspace.delete(workspaceId);
    } catch (error) {
      throw error;
    }
  }

  // Get workspace by ID
  async getWorkspaceById(workspaceId: string): Promise<WorkSpace | null> {
    try {
      return await window.electronAPI.workspace.getById(workspaceId);
    } catch (error) {
      throw error;
    }
  }

  // Get workspace stats
  async getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats | null> {
    try {
      return await window.electronAPI.workspace.getStats(workspaceId);
    } catch (error) {
      throw error;
    }
  }

  // Export workspace
  async exportWorkspace(workspaceId: string): Promise<string | null> {
    try {
      return await window.electronAPI.workspace.export(workspaceId);
    } catch (error) {
      throw error;
    }
  }

  // Select file for import
  async selectFileForImport(): Promise<string | null> {
    try {
      return await window.electronAPI.workspace.selectFileForImport();
    } catch (error) {
      throw error;
    }
  }

  // Validate import file
  async validateImportFile(filePath: string): Promise<boolean> {
    try {
      return await window.electronAPI.workspace.validateImportFile(filePath);
    } catch (error) {
      throw error;
    }
  }

  // Import workspace from file data
  async importFromFileData(fileData: Uint8Array, fileName: string): Promise<{ tempPath: string } | null> {
    try {
      return await window.electronAPI.workspace.importFromFileData(fileData, fileName);
    } catch (error) {
      throw error;
    }
  }

  // Import workspace
  async importWorkspace(sourceDbPath: string, name: string, description?: string): Promise<WorkSpace> {
    try {
      return await window.electronAPI.workspace.import(sourceDbPath, name, description);
    } catch (error) {
      throw error;
    }
  }

  // Listen for workspace changes
  onWorkspaceChanged(callback: (workspaceId: string) => void): () => void {
    const listener = (workspaceId: string) => {
      callback(workspaceId);
    };
    
    window.electronAPI.workspace.onChanged(listener);
    
    // Return cleanup function
    return () => {
      window.electronAPI.workspace.offChanged(listener);
    };
  }
}

export const workspaceService = new WorkspaceService();
export default workspaceService;