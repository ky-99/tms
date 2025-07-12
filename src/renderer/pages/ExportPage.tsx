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

  // Toggle all include options
  const toggleAllIncludes = (enable: boolean) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      includeDescription: enable,
      includeStatus: enable,
      includePriority: enable,
      includeDueDate: enable,
      includeCreatedDate: enable,
      includeCompletedDate: enable,
      includeTags: enable
    }));
  };

  // Toggle all status filters
  const toggleAllStatus = (enable: boolean) => {
    const allStatuses = ['pending', 'in_progress', 'completed'];
    setSettings(prevSettings => ({
      ...prevSettings,
      statusFilter: enable ? allStatuses : []
    }));
  };

  // Toggle all priority filters
  const toggleAllPriorities = (enable: boolean) => {
    const allPriorities = ['low', 'medium', 'high', 'urgent'];
    setSettings(prevSettings => ({
      ...prevSettings,
      priorityFilter: enable ? allPriorities : []
    }));
  };

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
        'completed': '完了'
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
      const matchesSearch = 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower));
      if (matchesSearch) {
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
    return taskList.map(task => (
      <React.Fragment key={task.id}>
        <option value={task.id}>
          {'　'.repeat(level)}{level > 0 ? '└ ' : ''}{task.title}
        </option>
        {task.children && renderTaskOptions(task.children, level + 1)}
      </React.Fragment>
    ));
  };

  if (loading) {
    return <div className="loading">データを読み込んでいます...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="export-page">
        <div className="empty-state">
          <h2>エクスポートできるタスクがありません。タスクを作成してからエクスポートしてください</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="export-page">
      <div className="export-container">
        <div className="export-settings">
          <div className="settings-section">
            <div className="section-header">
              <h3>含める情報</h3>
              <div className="bulk-actions">
                <button 
                  className="bulk-icon-button"
                  onClick={() => toggleAllIncludes(true)}
                  title="すべて選択"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 12 2 2 4-4"/>
                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                  </svg>
                </button>
                <button 
                  className="bulk-icon-button"
                  onClick={() => toggleAllIncludes(false)}
                  title="すべて解除"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m15 9-6 6"/>
                    <path d="m9 9 6 6"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="include-options-grid">
              <div 
                className={`include-option-card ${settings.includeDescription ? 'active' : ''}`}
                onClick={() => {
                  const newSettings = {...settings, includeDescription: !settings.includeDescription};
                  setSettings(newSettings);
                }}
              >
                <div className="include-option-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                </div>
                <span className="include-option-text">説明</span>
              </div>
              
              <div 
                className={`include-option-card ${settings.includeStatus ? 'active' : ''}`}
                onClick={() => {
                  const newSettings = {...settings, includeStatus: !settings.includeStatus};
                  setSettings(newSettings);
                }}
              >
                <div className="include-option-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A2,2 0 0,1 14,4C14,5.11 13.1,6 12,6C10.89,6 10,5.1 10,4A2,2 0 0,1 12,2M21,9V7L15,1H5C3.89,1 3,1.89 3,3V21A2,2 0 0,0 5,23H19A2,2 0 0,0 21,21V9M19,21H5V3H13V9H19V21Z" />
                  </svg>
                </div>
                <span className="include-option-text">ステータス</span>
              </div>
              
              <div 
                className={`include-option-card ${settings.includePriority ? 'active' : ''}`}
                onClick={() => {
                  const newSettings = {...settings, includePriority: !settings.includePriority};
                  setSettings(newSettings);
                }}
              >
                <div className="include-option-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17,4H22L20,7L22,10H17V15A3,3 0 0,1 14,18H10A3,3 0 0,1 7,15V10H2L4,7L2,4H7V1A1,1 0 0,1 8,0A1,1 0 0,1 9,1V4H15V1A1,1 0 0,1 16,0A1,1 0 0,1 17,1V4M9,9V15A1,1 0 0,0 10,16H14A1,1 0 0,0 15,15V9H9Z" />
                  </svg>
                </div>
                <span className="include-option-text">重要度</span>
              </div>
              
              <div 
                className={`include-option-card ${settings.includeDueDate ? 'active' : ''}`}
                onClick={() => {
                  const newSettings = {...settings, includeDueDate: !settings.includeDueDate};
                  setSettings(newSettings);
                }}
              >
                <div className="include-option-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,3H18V1H16V3H8V1H6V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19M5,6V5H19V6H5Z" />
                  </svg>
                </div>
                <span className="include-option-text">期限</span>
              </div>
              
              <div 
                className={`include-option-card ${settings.includeCreatedDate ? 'active' : ''}`}
                onClick={() => {
                  const newSettings = {...settings, includeCreatedDate: !settings.includeCreatedDate};
                  setSettings(newSettings);
                }}
              >
                <div className="include-option-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
                  </svg>
                </div>
                <span className="include-option-text">作成日</span>
              </div>
              
              <div 
                className={`include-option-card ${settings.includeCompletedDate ? 'active' : ''}`}
                onClick={() => {
                  const newSettings = {...settings, includeCompletedDate: !settings.includeCompletedDate};
                  setSettings(newSettings);
                }}
              >
                <div className="include-option-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                  </svg>
                </div>
                <span className="include-option-text">完了日</span>
              </div>
              
              <div 
                className={`include-option-card ${settings.includeTags ? 'active' : ''}`}
                onClick={() => {
                  const newSettings = {...settings, includeTags: !settings.includeTags};
                  setSettings(newSettings);
                }}
              >
                <div className="include-option-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.5,7A1.5,1.5 0 0,1 4,5.5A1.5,1.5 0 0,1 5.5,4A1.5,1.5 0 0,1 7,5.5A1.5,1.5 0 0,1 5.5,7M21.41,11.58L12.41,2.58C12.05,2.22 11.55,2 11,2H4C2.89,2 2,2.89 2,4V11C2,11.55 2.22,12.05 2.59,12.41L11.58,21.41C11.95,21.78 12.45,22 13,22C13.55,22 14.05,21.78 14.41,21.41L21.41,14.41C21.78,14.05 22,13.55 22,13C22,12.45 21.78,11.95 21.41,11.58Z" />
                  </svg>
                </div>
                <span className="include-option-text">タグ</span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>フィルター</h3>
            
            <div className="filter-group">
              <div className="filter-header">
                <label>ステータス:</label>
                <div className="bulk-actions">
                  <button 
                    className="bulk-icon-button small"
                    onClick={() => toggleAllStatus(true)}
                    title="すべて選択"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 12 2 2 4-4"/>
                      <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                    </svg>
                  </button>
                  <button 
                    className="bulk-icon-button small"
                    onClick={() => toggleAllStatus(false)}
                    title="すべて解除"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="m15 9-6 6"/>
                      <path d="m9 9 6 6"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="button-group">
                {[
                  { key: 'pending', label: '未着手' },
                  { key: 'in_progress', label: '進行中' },
                  { key: 'completed', label: '完了' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className={`status-filter-badge status ${key} ${settings.statusFilter.includes(key) ? 'active' : ''}`}
                    onClick={() => {
                      let newStatusFilter;
                      if (settings.statusFilter.includes(key)) {
                        newStatusFilter = settings.statusFilter.filter(s => s !== key);
                      } else {
                        newStatusFilter = [...settings.statusFilter, key];
                      }
                      const newSettings = {...settings, statusFilter: newStatusFilter};
                      setSettings(newSettings);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-header">
                <label>重要度:</label>
                <div className="bulk-actions">
                  <button 
                    className="bulk-icon-button small"
                    onClick={() => toggleAllPriorities(true)}
                    title="すべて選択"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 12 2 2 4-4"/>
                      <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                    </svg>
                  </button>
                  <button 
                    className="bulk-icon-button small"
                    onClick={() => toggleAllPriorities(false)}
                    title="すべて解除"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="m15 9-6 6"/>
                      <path d="m9 9 6 6"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="button-group">
                {[
                  { key: 'low', label: '低' },
                  { key: 'medium', label: '中' },
                  { key: 'high', label: '高' },
                  { key: 'urgent', label: '緊急' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className={`priority-filter-badge priority ${key} ${settings.priorityFilter.includes(key) ? 'active' : ''}`}
                    onClick={() => {
                      let newPriorityFilter;
                      if (settings.priorityFilter.includes(key)) {
                        newPriorityFilter = settings.priorityFilter.filter(p => p !== key);
                      } else {
                        newPriorityFilter = [...settings.priorityFilter, key];
                      }
                      const newSettings = {...settings, priorityFilter: newPriorityFilter};
                      setSettings(newSettings);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>期限範囲:</label>
              <div className="date-range">
                <input
                  type="date"
                  value={settings.dateRangeStart}
                  onChange={(e) => {
                  const newSettings = {...settings, dateRangeStart: e.target.value};
                  setSettings(newSettings);
                }}
                />
                <span>から</span>
                <input
                  type="date"
                  value={settings.dateRangeEnd}
                  onChange={(e) => {
                  const newSettings = {...settings, dateRangeEnd: e.target.value};
                  setSettings(newSettings);
                }}
                />
                <span>まで</span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>出力形式</h3>
            <div className="toggle-option">
              <span>階層構造を保持する</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.hierarchical}
                  onChange={(e) => {
                    const newSettings = {...settings, hierarchical: e.target.checked};
                    setSettings(newSettings);
                    if (!e.target.checked) {
                      setSelectedParentId(null);
                    }
                  }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            {settings.hierarchical && (
              <div className="parent-task-selector">
                <label>親タスクを選択（オプション）:</label>
                <div className="parent-task-search">
                  {selectedParentId && (
                    <div className="selected-parent-card">
                      <div className="selected-parent-info">
                        <div className="selected-parent-title">
                          {findTaskById(tasks, selectedParentId)?.title || '不明なタスク'}
                        </div>
                        {findTaskById(tasks, selectedParentId)?.description && (
                          <div className="selected-parent-description">
                            {findTaskById(tasks, selectedParentId)?.description}
                          </div>
                        )}
                      </div>
                      <button
                        className="remove-parent-btn"
                        onClick={() => setSelectedParentId(null)}
                        title="親タスクを解除"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {!selectedParentId && (
                    <>
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
                      {parentSearchQuery.trim() && (
                        <div className="parent-task-suggestions">
                          {filterTasksForSearch(flattenTasks(tasks), parentSearchQuery).slice(0, 10).map(task => (
                            <div
                              key={task.id}
                              className="parent-task-suggestion-item"
                              onClick={() => {
                                setSelectedParentId(task.id);
                                setParentSearchQuery('');
                              }}
                            >
                              <div className="suggestion-title">{task.title}</div>
                              {task.description && (
                                <div className="suggestion-description">{task.description}</div>
                              )}
                            </div>
                          ))}
                          {filterTasksForSearch(flattenTasks(tasks), parentSearchQuery).length === 0 && (
                            <div className="parent-task-suggestion-item no-results">
                              検索結果がありません
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
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