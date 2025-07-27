import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useGlobalAlert } from '../hooks';
import '../styles/workspace-page.css';
import { workspaceService, WorkSpace } from '../services/workspaceService';

const WorkSpacePage: React.FC = () => {
  const { showAlert } = useGlobalAlert();
  const [workspaces, setWorkspaces] = useState<WorkSpace[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importWorkspaceName, setImportWorkspaceName] = useState('');
  const [importWorkspaceDescription, setImportWorkspaceDescription] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Load workspaces from the API
  useEffect(() => {
    loadWorkspaces();
    
    // WorkSpace切り替え時の自動更新を監視（ローディング表示なし）
    const handleWorkspaceChange = async () => {
      try {
        // ワークスペース切り替え時はローディング表示せずにサイレント更新
        const allWorkspaces = await workspaceService.getAllWorkspaces();
        setWorkspaces(allWorkspaces);
      } catch (error) {
      }
    };
    
    const cleanup = workspaceService.onWorkspaceChanged(handleWorkspaceChange);
    
    return cleanup;
  }, []);

  const loadWorkspaces = async () => {
    try {
      const allWorkspaces = await workspaceService.getAllWorkspaces();
      setWorkspaces(allWorkspaces);
    } catch (error) {
    }
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;

    const createData = {
      name: newWorkspaceName,
      description: newWorkspaceDescription
    };

    // 即座にモーダルを閉じる
    flushSync(() => {
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
      setIsCreateModalOpen(false);
    });

    // 重い処理を次のイベントループで実行
    setTimeout(async () => {
      try {
        await workspaceService.createWorkspace(createData);
        
        // ワークスペースリストを更新
        const allWorkspaces = await workspaceService.getAllWorkspaces();
        setWorkspaces(allWorkspaces);
        
        // 成功トーストを表示
        showAlert(`ワークスペース「${createData.name}」を作成しました`, {
          type: 'success',
        });
      } catch (error) {
        showAlert('ワークスペースの作成に失敗しました。再度お試しください。', {
          type: 'error',
          title: 'エラー'
        });
      }
    }, 0);
  };

  const handleActivateWorkspace = async (id: string) => {
    try {
      const success = await workspaceService.switchToWorkspace(id);
      if (!success) {
        showAlert('ワークスペースの切り替えに失敗しました。再度お試しください。', {
          type: 'error',
          title: 'エラー',
        });
      }
      // workspace:changedイベントで自動的にUIが更新されるため、手動でloadWorkspaces()を呼ぶ必要なし
    } catch (error) {
      showAlert('ワークスペースの切り替えに失敗しました。再度お試しください。', {
        type: 'error',
        title: 'エラー'
      });
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    const workspace = workspaces.find(ws => ws.id === id);
    if (workspace?.isActive) {
      showAlert('アクティブなワークスペースは削除できません', {
        type: 'prohibition',
        title: '削除不可',
      });
      return;
    }
    
    showAlert('このワークスペースを削除してもよろしいですか？この操作は元に戻せません。', {
      type: 'danger',
      title: '確認',
      showCancel: true,
      confirmText: '削除',
      cancelText: 'キャンセル',
      onConfirm: async () => {
      try {
        const workspace = workspaces.find(ws => ws.id === id);
        const workspaceName = workspace?.name || 'ワークスペース';
        
        const success = await workspaceService.deleteWorkspace(id);
        if (success) {
          // Show success message
          showAlert(`ワークスペース「${workspaceName}」を削除しました`, {
            type: 'success',
          });
          
          // Reload workspaces to get updated list
          const allWorkspaces = await workspaceService.getAllWorkspaces();
          setWorkspaces(allWorkspaces);
        } else {
          showAlert('ワークスペースの削除に失敗しました。再度お試しください。', {
            type: 'error',
            title: 'エラー'
          });
        }
      } catch (error) {
        showAlert('ワークスペースの削除に失敗しました。再度お試しください。', {
          type: 'error',
          title: 'エラー'
        });
      }
      },
      onCancel: () => {
        // キャンセル時は何もしない
      }
    });
  };

  const handleImportWorkspace = () => {
    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.db';
    fileInput.style.display = 'none';
    
    const cleanup = () => {
      try {
        document.body.removeChild(fileInput);
      } catch (e) {
        // Input already removed
      }
    };
    
    // Handle file selection
    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      
      // Always cleanup first
      cleanup();
      
      if (!file) {
        return;
      }
      
      // 即座にモーダルを表示（ファイル検証は後で行う）
      const fileName = file.name.replace(/\.db$/, '') || 'Imported Workspace';
      
      // flushSyncを使って同期的に状態を更新
      flushSync(() => {
        setImportWorkspaceName(fileName);
        setImportWorkspaceDescription('');
        setSelectedFilePath(file.path || file.name);
        setIsImportModalOpen(true);
      });
      
      // バックグラウンドでファイル検証を行う
      setTimeout(async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const result = await workspaceService.importFromFileData(
            uint8Array,
            file.name
          );
          
          if (result) {
            setSelectedFilePath(result.tempPath);
          } else {
            setIsImportModalOpen(false);
            showAlert('有効な.dbファイルではありません', {
              type: 'error',
              title: 'エラー'
            });
          }
        } catch (error) {
          setIsImportModalOpen(false);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          showAlert(`ファイルの処理に失敗しました: ${errorMessage}`, {
            type: 'error',
            title: 'エラー'
          });
        }
      }, 0);
    };
    
    // Handle dialog cancellation
    fileInput.oncancel = () => {
      cleanup();
    };
    
    // Add focus event to handle cancellation more reliably
    const handleWindowFocus = () => {
      setTimeout(() => {
        // Check if input still has no files after a short delay
        if (fileInput.files && fileInput.files.length === 0) {
          cleanup();
        }
        window.removeEventListener('focus', handleWindowFocus);
      }, 200);
    };
    
    window.addEventListener('focus', handleWindowFocus);
    
    // Trigger file dialog
    document.body.appendChild(fileInput);
    fileInput.click();
  };

  const handleConfirmImport = async () => {
    if (!selectedFilePath || !importWorkspaceName.trim()) {
      return;
    }

    const importData = {
      filePath: selectedFilePath,
      name: importWorkspaceName,
      description: importWorkspaceDescription
    };

    // モーダルを即座に閉じる
    setIsImportModalOpen(false);
    setImportWorkspaceName('');
    setImportWorkspaceDescription('');
    setSelectedFilePath(null);

    try {
      await workspaceService.importWorkspace(
        importData.filePath,
        importData.name,
        importData.description
      );
      
      // ワークスペースリストを更新
      const allWorkspaces = await workspaceService.getAllWorkspaces();
      setWorkspaces(allWorkspaces);
      
      // 成功トーストを表示
      showAlert(`ワークスペース「${importData.name}」をインポートしました`, {
        type: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      showAlert(`ワークスペースのインポートに失敗しました: ${errorMessage}`, {
        type: 'error',
        title: 'エラー'
      });
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer.files);
    const dbFile = files.find(file => file.name.endsWith('.db'));
    
    if (!dbFile) {
      showAlert('有効な.dbファイルをドロップしてください', {
        type: 'warning',
        title: '警告'
      });
      return;
    }
    
    try {
      // Convert File to file path by saving to temp location
      const arrayBuffer = await dbFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Send file data to main process for validation and saving
      const result = await workspaceService.importFromFileData(
        uint8Array,
        dbFile.name
      );
      
      if (result) {
        // Extract filename without extension as default name
        const fileName = dbFile.name.replace(/\.db$/, '') || 'Imported Workspace';
        setImportWorkspaceName(fileName);
        setImportWorkspaceDescription('');
        setSelectedFilePath(result.tempPath);
        setIsImportModalOpen(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showAlert(`ファイルの処理に失敗しました: ${errorMessage}`, {
        type: 'error',
        title: 'エラー'
      });
    }
  };

  const handleExportWorkspace = async (workspaceId: string) => {
    try {
      const filePath = await workspaceService.exportWorkspace(workspaceId);
      if (filePath) {
        showAlert(`ワークスペースを正常にエクスポートしました: ${filePath}`, {
          type: 'success',
          title: '成功'
        });
      }
      // キャンセル時は何も表示しない
    } catch (error) {
      showAlert('ワークスペースのエクスポートに失敗しました。再度お試しください。', {
        type: 'error',
        title: 'エラー'
      });
    }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-header-section">
        <div className="workspace-create-section">
          <button 
            className="create-workspace-btn"
            onClick={() => setIsCreateModalOpen(true)}
            title="新しいワークスペースを作成"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
          <div 
            className="drop-zone-clickable"
            onClick={handleImportWorkspace}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('drag-over');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('drag-over');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('drag-over');
              handleFileDrop(e);
            }}
            title="クリックでファイルを選択するか、.dbファイルをドラッグ&ドロップ"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12,19L8,15H10.5V12H13.5V15H16L12,19Z"/>
            </svg>
            <span>.dbファイルをインポート</span>
          </div>
        </div>
      </div>

      <div className="workspace-grid">
        {workspaces.length === 0 ? (
          <div className="empty-message">
            <p>ワークスペースが見つかりません。最初のワークスペースを作成して開始してください。</p>
          </div>
        ) : (
          workspaces.map(workspace => (
            <div 
              key={workspace.id} 
              className={`workspace-card ${workspace.isActive ? 'active' : 'clickable'}`}
              onClick={() => !workspace.isActive && handleActivateWorkspace(workspace.id)}
              style={{ cursor: workspace.isActive ? 'default' : 'pointer' }}
            >
              <div className="workspace-header">
                <h3>{workspace.name}</h3>
                <span className={workspace.isActive ? "active-badge" : "badge-placeholder"}>
                  {workspace.isActive ? "Active" : "\u00A0"}
                </span>
              </div>
              <p className="workspace-description">{workspace.description || "\u00A0"}</p>
              <div className="workspace-stats">
                <span className="stat">
                  <strong>{workspace.taskCount}</strong> タスク
                </span>
                <span className="stat">
                  最終使用: {new Date(workspace.lastUsed).toLocaleDateString()}
                </span>
              </div>
              <div className="workspace-actions">
                <button 
                  className="workspace-action-btn export-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportWorkspace(workspace.id);
                  }}
                  title="エクスポート"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,1L8,5H11V14H13V5H16M18,23H6C4.89,23 4,22.1 4,21V9A2,2 0 0,1 6,7H9V9H6V21H18V9H15V7H18A2,2 0 0,1 20,9V21A2,2 0 0,1 18,23Z"/>
                  </svg>
                </button>
                {workspace.id !== 'default' && (
                  <button 
                    className="workspace-action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkspace(workspace.id);
                    }}
                    title="削除"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Workspace Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="workspace-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workspace-modal-header">
              <button 
                className="modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="workspace-modal-body">
              <div className="form-group">
                <label>ワークスペース名</label>
                <input
                  type="text"
                  className="workspace-name-input"
                  placeholder="例: 個人プロジェクト"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>説明（任意）</label>
                <textarea
                  className="workspace-description-input"
                  placeholder="このワークスペースの説明"
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="workspace-modal-footer">
              <button 
                className="btn btn-cancel"
                onClick={() => setIsCreateModalOpen(false)}
              >
                キャンセル
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim()}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Workspace Modal */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
          <div className="workspace-modal" onClick={(e) => e.stopPropagation()}>
            <div className="workspace-modal-header">
              <button 
                className="modal-close-btn"
                onClick={() => setIsImportModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="workspace-modal-body">
              <div className="form-group">
                <label>ワークスペース名</label>
                <input
                  type="text"
                  className="workspace-name-input"
                  placeholder="例: 個人プロジェクト"
                  value={importWorkspaceName}
                  onChange={(e) => setImportWorkspaceName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>説明（任意）</label>
                <textarea
                  className="workspace-description-input"
                  placeholder="このワークスペースの説明"
                  value={importWorkspaceDescription}
                  onChange={(e) => setImportWorkspaceDescription(e.target.value)}
                />
              </div>
              {selectedFilePath && (
                <div className="form-group">
                  <label>選択されたファイル</label>
                  <div className="selected-file-path">
                    {selectedFilePath.split('/').pop()}
                  </div>
                </div>
              )}
            </div>
            <div className="workspace-modal-footer">
              <button 
                className="btn btn-cancel"
                onClick={() => setIsImportModalOpen(false)}
              >
                キャンセル
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleConfirmImport}
                disabled={!importWorkspaceName.trim()}
              >
                インポート
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkSpacePage;