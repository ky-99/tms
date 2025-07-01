import React, { useState, useEffect } from 'react';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  due_date?: string;
  createdAt?: string;
  created_at?: string;
  completedAt?: string;
  completed_at?: string;
  children?: Task[];
}

interface Tag {
  id: number;
  name: string;
  color: string;
  textColor?: string;
  text_color?: string;
}

interface ExportSettings {
  includeDescription: boolean;
  includeStatus: boolean;
  includePriority: boolean;
  includeDueDate: boolean;
  includeCreatedDate: boolean;
  includeCompletedDate: boolean;
  includeTags: boolean;
  statusFilter: string[];
  priorityFilter: string[];
  dateRangeStart: string;
  dateRangeEnd: string;
  hierarchical: boolean;
}

const ExportPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTags, setTaskTags] = useState<Map<number, Tag[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [exportedText, setExportedText] = useState<string>('');
  const [copiedAnimation, setCopiedAnimation] = useState(false);
  const [downloadedAnimation, setDownloadedAnimation] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [parentSearchQuery, setParentSearchQuery] = useState<string>('');
  const [settings, setSettings] = useState<ExportSettings>({
    includeDescription: true,
    includeStatus: true,
    includePriority: true,
    includeDueDate: true,
    includeCreatedDate: false,
    includeCompletedDate: false,
    includeTags: true,
    statusFilter: ['pending', 'in_progress', 'completed'],
    priorityFilter: ['low', 'medium', 'high', 'urgent'],
    dateRangeStart: '',
    dateRangeEnd: '',
    hierarchical: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allTasks = await window.taskAPI.getAllTasks();
      setTasks(allTasks);

      await window.taskAPI.getAllTags();

      // Load tags for all tasks
      const flatTasks = flattenTasks(allTasks);
      const taskTagsMap = new Map<number, Tag[]>();
      
      for (const task of flatTasks) {
        try {
          const taskTagList = await window.taskAPI.getTagsByTaskId(task.id);
          taskTagsMap.set(task.id, taskTagList);
        } catch (error) {
          console.error(`Failed to load tags for task ${task.id}:`, error);
        }
      }
      
      setTaskTags(taskTagsMap);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const flattenTasks = (taskList: Task[]): Task[] => {
    const result: Task[] = [];
    
    const addTask = (task: Task) => {
      result.push(task);
      if (task.children) {
        task.children.forEach(addTask);
      }
    };
    
    taskList.forEach(addTask);
    return result;
  };

  const findTaskById = (taskList: Task[], id: number): Task | null => {
    for (const task of taskList) {
      if (task.id === id) {
        return task;
      }
      if (task.children) {
        const found = findTaskById(task.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getTaskSubtree = (parentId: number): Task[] => {
    const parentTask = findTaskById(tasks, parentId);
    if (!parentTask) return [];
    return [parentTask];
  };

  const filterTasks = (taskList: Task[]): Task[] => {
    const filtered = taskList.filter(task => {
      // Status filter
      if (!settings.statusFilter.includes(task.status)) {
        return false;
      }

      // Priority filter
      if (!settings.priorityFilter.includes(task.priority)) {
        return false;
      }

      // Date range filter
      if (settings.dateRangeStart || settings.dateRangeEnd) {
        const dueDateValue = task.dueDate || task.due_date;
        if (dueDateValue) {
          const dueDate = new Date(dueDateValue);
          if (settings.dateRangeStart) {
            const startDate = new Date(settings.dateRangeStart);
            if (dueDate < startDate) return false;
          }
          if (settings.dateRangeEnd) {
            const endDate = new Date(settings.dateRangeEnd);
            if (dueDate > endDate) return false;
          }
        } else if (settings.dateRangeStart || settings.dateRangeEnd) {
          return false; // Exclude tasks without due date when date filter is applied
        }
      }

      return true;
    });

    return filtered;
  };

  const generateMarkdown = () => {
    let baseTasks = tasks;
    
    // If hierarchical and parent is selected, get subtree
    if (settings.hierarchical && selectedParentId !== null) {
      baseTasks = getTaskSubtree(selectedParentId);
    }
    
    const processedTasks = settings.hierarchical ? baseTasks : flattenTasks(baseTasks);
    const filteredTasks = settings.hierarchical 
      ? filterTasksHierarchical(processedTasks)
      : filterTasks(flattenTasks(baseTasks));

    let markdown = '';

    if (settings.hierarchical) {
      markdown += generateHierarchicalMarkdown(filteredTasks);
    } else {
      markdown += generateFlatMarkdown(filteredTasks);
    }

    return markdown;
  };

  const filterTasksHierarchical = (taskList: Task[]): Task[] => {
    return taskList.map(task => {
      const shouldInclude = settings.statusFilter.includes(task.status) &&
                           settings.priorityFilter.includes(task.priority);
      
      const filteredChildren = task.children ? filterTasksHierarchical(task.children) : undefined;
      
      if (shouldInclude || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...task,
          children: filteredChildren
        };
      }
      return null;
    }).filter(task => task !== null) as Task[];
  };

  const generateHierarchicalMarkdown = (taskList: Task[], level: number = 0): string => {
    let markdown = '';
    
    taskList.forEach(task => {
      const indent = '  '.repeat(level);
      markdown += `${indent}- **${task.title}**\n`;
      
      // Add task details with proper indentation
      const details = generateTaskDetails(task);
      if (details.trim()) {
        const detailLines = details.split('\n');
        detailLines.forEach(line => {
          if (line.trim()) {
            markdown += `${indent}  ${line}\n`;
          }
        });
      }
      
      if (task.children && task.children.length > 0) {
        markdown += generateHierarchicalMarkdown(task.children, level + 1);
      }
    });
    
    return markdown;
  };

  const generateFlatMarkdown = (taskList: Task[]): string => {
    let markdown = '';
    
    taskList.forEach((task, index) => {
      markdown += `## ${index + 1}. ${task.title}\n\n`;
      markdown += generateTaskDetails(task);
    });
    
    return markdown;
  };

  const generateTaskDetails = (task: Task): string => {
    let details = '';
    
    if (settings.includeDescription && task.description) {
      details += `**説明:** ${task.description}\n\n`;
    }
    
    if (settings.includeStatus) {
      const statusMap: { [key: string]: string } = {
        'pending': '未着手',
        'in_progress': '進行中',
        'completed': '完了',
        'cancelled': 'キャンセル'
      };
      details += `**ステータス:** ${statusMap[task.status] || task.status}\n\n`;
    }
    
    if (settings.includePriority) {
      const priorityMap: { [key: string]: string } = {
        'low': '低',
        'medium': '中',
        'high': '高',
        'urgent': '緊急'
      };
      details += `**重要度:** ${priorityMap[task.priority] || task.priority}\n\n`;
    }
    
    if (settings.includeDueDate && (task.dueDate || task.due_date)) {
      const dueDate = new Date(task.dueDate || task.due_date || '');
      details += `**期限:** ${dueDate.toLocaleDateString('ja-JP')}\n\n`;
    }
    
    if (settings.includeCreatedDate && (task.createdAt || task.created_at)) {
      const createdDate = new Date(task.createdAt || task.created_at || '');
      details += `**作成日:** ${createdDate.toLocaleDateString('ja-JP')}\n\n`;
    }
    
    if (settings.includeCompletedDate && (task.completedAt || task.completed_at)) {
      const completedDate = new Date(task.completedAt || task.completed_at || '');
      details += `**完了日:** ${completedDate.toLocaleDateString('ja-JP')}\n\n`;
    }
    
    if (settings.includeTags) {
      const tags = taskTags.get(task.id) || [];
      if (tags.length > 0) {
        const tagText = tags.map(tag => `\`${tag.name}\``).join(' ');
        details += `**タグ:** ${tagText}\n\n`;
      }
    }
    
    return details;
  };

  const handleExport = () => {
    const markdown = generateMarkdown();
    setExportedText(markdown);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportedText);
    setCopiedAnimation(true);
    setTimeout(() => setCopiedAnimation(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportedText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedAnimation(true);
    setTimeout(() => setDownloadedAnimation(false), 2000);
  };

  const filterTasksForSearch = (taskList: Task[], query: string): Task[] => {
    if (!query.trim()) return taskList;
    
    const searchLower = query.toLowerCase();
    const result: Task[] = [];
    
    const checkTask = (task: Task) => {
      const matches = task.title.toLowerCase().includes(searchLower);
      if (matches) {
        result.push(task);
      }
      if (task.children) {
        task.children.forEach(checkTask);
      }
    };
    
    taskList.forEach(checkTask);
    return result;
  };

  const renderTaskOptions = (taskList: Task[], level: number = 0): React.ReactNode => {
    const filteredTasks = filterTasksForSearch(taskList, parentSearchQuery);
    if (parentSearchQuery.trim() && filteredTasks.length === 0) {
      return <option value="" disabled>検索結果がありません</option>;
    }
    
    return filteredTasks.map(task => (
      <React.Fragment key={task.id}>
        <option value={task.id}>
          {'　'.repeat(level)}{level > 0 ? '└ ' : ''}{task.title}
        </option>
        {task.children && !parentSearchQuery.trim() && renderTaskOptions(task.children, level + 1)}
      </React.Fragment>
    ));
  };

  if (loading) {
    return <div className="loading">データを読み込んでいます...</div>;
  }

  return (
    <div className="export-page">
      <div className="export-container">
        <div className="export-settings">
          <div className="settings-section">
            <h3>含める情報</h3>
            <div className="settings-grid">
              <label>
                <input
                  type="checkbox"
                  checked={settings.includeDescription}
                  onChange={(e) => setSettings({...settings, includeDescription: e.target.checked})}
                />
                説明
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.includeStatus}
                  onChange={(e) => setSettings({...settings, includeStatus: e.target.checked})}
                />
                ステータス
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.includePriority}
                  onChange={(e) => setSettings({...settings, includePriority: e.target.checked})}
                />
                重要度
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.includeDueDate}
                  onChange={(e) => setSettings({...settings, includeDueDate: e.target.checked})}
                />
                期限
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.includeCreatedDate}
                  onChange={(e) => setSettings({...settings, includeCreatedDate: e.target.checked})}
                />
                作成日
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.includeCompletedDate}
                  onChange={(e) => setSettings({...settings, includeCompletedDate: e.target.checked})}
                />
                完了日
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.includeTags}
                  onChange={(e) => setSettings({...settings, includeTags: e.target.checked})}
                />
                タグ
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>フィルター</h3>
            
            <div className="filter-group">
              <label>ステータス:</label>
              <div className="checkbox-group">
                {['pending', 'in_progress', 'completed'].map(status => (
                  <label key={status}>
                    <input
                      type="checkbox"
                      checked={settings.statusFilter.includes(status)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSettings({...settings, statusFilter: [...settings.statusFilter, status]});
                        } else {
                          setSettings({...settings, statusFilter: settings.statusFilter.filter(s => s !== status)});
                        }
                      }}
                    />
                    {status === 'pending' ? '未着手' : status === 'in_progress' ? '進行中' : '完了'}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>重要度:</label>
              <div className="checkbox-group">
                {['low', 'medium', 'high', 'urgent'].map(priority => (
                  <label key={priority}>
                    <input
                      type="checkbox"
                      checked={settings.priorityFilter.includes(priority)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSettings({...settings, priorityFilter: [...settings.priorityFilter, priority]});
                        } else {
                          setSettings({...settings, priorityFilter: settings.priorityFilter.filter(p => p !== priority)});
                        }
                      }}
                    />
                    {priority === 'low' ? '低' : priority === 'medium' ? '中' : priority === 'high' ? '高' : '緊急'}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>期限範囲:</label>
              <div className="date-range">
                <input
                  type="date"
                  value={settings.dateRangeStart}
                  onChange={(e) => setSettings({...settings, dateRangeStart: e.target.value})}
                />
                <span>から</span>
                <input
                  type="date"
                  value={settings.dateRangeEnd}
                  onChange={(e) => setSettings({...settings, dateRangeEnd: e.target.value})}
                />
                <span>まで</span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>出力形式</h3>
            <label>
              <input
                type="checkbox"
                checked={settings.hierarchical}
                onChange={(e) => {
                  setSettings({...settings, hierarchical: e.target.checked});
                  if (!e.target.checked) {
                    setSelectedParentId(null);
                  }
                }}
              />
              階層構造を保持する
            </label>
            {settings.hierarchical && (
              <div className="parent-task-selector">
                <label>親タスクを選択（オプション）:</label>
                <div className="parent-task-search">
                  <input
                    type="text"
                    placeholder="タスクを検索..."
                    value={parentSearchQuery}
                    onChange={(e) => setParentSearchQuery(e.target.value)}
                    className="parent-task-search-input"
                  />
                  {parentSearchQuery && (
                    <button
                      className="search-clear-btn"
                      onClick={() => setParentSearchQuery('')}
                      title="検索をクリア"
                    >
                      ×
                    </button>
                  )}
                </div>
                <select
                  value={selectedParentId || ''}
                  onChange={(e) => setSelectedParentId(e.target.value ? Number(e.target.value) : null)}
                  className="parent-task-select"
                >
                  <option value="">すべてのタスク</option>
                  {renderTaskOptions(tasks)}
                </select>
              </div>
            )}
          </div>

          <div className="export-actions">
            <button className="export-btn" onClick={handleExport}>
              エクスポート
            </button>
          </div>
        </div>

        {exportedText && (
          <div className="export-result">
            <div className="result-header">
              <h3>エクスポート結果</h3>
              <div className="result-actions">
                <button 
                  className={`icon-button copy-button ${copiedAnimation ? 'copied' : ''}`}
                  onClick={handleCopyToClipboard}
                  title="クリップボードにコピー"
                >
                  {copiedAnimation ? (
                    <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                      <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                      <rect x="5" y="7" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 7V5a1 1 0 011-1h6a1 1 0 011 1v8a1 1 0 01-1 1h-1" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                </button>
                <button 
                  className={`icon-button download-button ${downloadedAnimation ? 'downloaded' : ''}`}
                  onClick={handleDownload}
                  title="ファイルダウンロード"
                >
                  {downloadedAnimation ? (
                    <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                      <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                      <path d="M10 3v10m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 17h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="export-preview">
              <textarea
                value={exportedText}
                readOnly
                rows={20}
                cols={80}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportPage;