/**
 * TasksPage - Refactored with new state management
 * Displays tasks with filtering and management capabilities
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useRoute, useLocation } from 'wouter';
import { Task, Tag, TaskStatus, TaskPriority } from '../types';
import { useTaskContext, useShortcut } from '../contexts';
import { useLocalStorage, useDebounce } from '../hooks';
import { flattenTasks, isParentTask } from '../utils/taskUtils';
import { sortTasksMultiple } from '../utils/sortUtils';
import { Button, TextInput, Modal, TagPool } from '../components/ui';
import NotionLikeFilterModal from '../components/tasks/NotionLikeFilterModal';
import NotionLikeSortModal, { SortOption } from '../components/tasks/NotionLikeSortModal';
import TaskList from '../components/tasks/TaskList';
import TaskCreateModal from '../components/modals/TaskCreateModal';
import TaskEditModal from '../components/modals/TaskEditModal';
import TaskMergeModal from '../components/modals/TaskMergeModal';
import TaskItem from '../components/tasks/TaskItem';

const TasksPage: React.FC = () => {
  const { 
    tasks, 
    tags,
    loading,
    initialized,
    error, 
    loadTasks,
    deleteTask,
    expandedTasks,
    toggleTaskExpansion,
    setExpandedTasks
  } = useTaskContext();
  const { setCurrentContext, currentContext } = useShortcut();
  const [match, params] = useRoute('/tasks/:rootId');
  const [, setLocation] = useLocation();
  const rootId = params?.rootId;
  
  // Force load tasks if they're not loaded yet (初回のみ)
  useEffect(() => {
    loadTasks();
  }, []); // 初回のみ実行
  
  const setTasksPageContext = useCallback(() => {
    setCurrentContext('tasksPage');
  }, [setCurrentContext]);
  
  // より確実にコンテキストを設定
  React.useEffect(() => {
    setCurrentContext('tasksPage');
  }, [setCurrentContext]);

  // Task Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createParentId, setCreateParentId] = useState<number | undefined>(undefined);
  const [stableSelectedTask, setStableSelectedTask] = useState<Task | null>(null);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  // TaskMergeModal state
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Filter state with localStorage persistence
  const [searchQuery, setSearchQuery] = useLocalStorage('taskSearch', '');
  const [selectedTagIds, setSelectedTagIds] = useLocalStorage<number[]>('selectedTags', []);
  const [selectedStatuses, setSelectedStatuses] = useLocalStorage<TaskStatus[]>('selectedStatuses', []);
  const [selectedPriorities, setSelectedPriorities] = useLocalStorage<TaskPriority[]>('selectedPriorities', []);
  const [dateFilterFrom, setDateFilterFrom] = useLocalStorage('dateFilterFrom', '');
  const [includeParentTasks, setIncludeParentTasks] = useLocalStorage('includeParentTasks', true);
  const [maintainHierarchy, setMaintainHierarchy] = useLocalStorage('maintainHierarchy', false);
  const [dateFilterTo, setDateFilterTo] = useLocalStorage('dateFilterTo', '');
  const [sortOptions, setSortOptions] = useLocalStorage<SortOption[]>('taskSortOptions', []);
  
  // UI state
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showTagPool, setShowTagPool] = useState(false);
  const [isClearingFilters, setIsClearingFilters] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const tagPoolButtonRef = useRef<HTMLButtonElement>(null);
  

  // Debounced search - shorter delay for better responsiveness
  const debouncedSearch = useDebounce(searchQuery, 150);

  // タグプールから選択されたタグをタスクに追加する状態
  const [selectedTaskForTagging, setSelectedTaskForTagging] = useState<Task | null>(null);

  // 共通のタスク検索関数（メモ化）
  const findTaskById = useCallback((taskList: Task[], targetId: number): Task | null => {
    for (const task of taskList) {
      if (task.id === targetId) return task;
      if (task.children) {
        const found = findTaskById(task.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Get tasks for current view
  const currentTasks = useMemo(() => {
    if (!rootId) return tasks;
    
    const targetId = parseInt(rootId);
    const targetTask = findTaskById(tasks, targetId);
    return targetTask?.children || [];
  }, [tasks, rootId, findTaskById]);

  // Get the current target task for leaf node display
  const currentTargetTask = useMemo(() => {
    if (!rootId) return null;
    
    const targetId = parseInt(rootId);
    return findTaskById(tasks, targetId);
  }, [tasks, rootId, findTaskById]);

  // Check if current task is a leaf node (no children)
  const isLeafNode = currentTargetTask && (!currentTargetTask.children || currentTargetTask.children.length === 0);

  // Helper function to check if a task matches all active filters
  const doesTaskMatchFilters = useCallback((task: Task): boolean => {
    // Search filter
    if (debouncedSearch.trim() !== '') {
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status)) {
      return false;
    }
    
    // Priority filter
    if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) {
      return false;
    }
    
    // Tag filter (if implemented)
    if (selectedTagIds.length > 0) {
      const hasMatchingTag = task.tagIds && task.tagIds.some(tagId => selectedTagIds.includes(tagId));
      if (!hasMatchingTag) return false;
    }
    
    // Date filter (if implemented)
    if (dateFilterFrom || dateFilterTo) {
      if (!task.endDate) return false;
      const taskDate = new Date(task.endDate);
      if (dateFilterFrom && taskDate < new Date(dateFilterFrom)) return false;
      if (dateFilterTo && taskDate > new Date(dateFilterTo)) return false;
    }
    
    return true;
  }, [debouncedSearch, selectedStatuses, selectedPriorities, selectedTagIds, dateFilterFrom, dateFilterTo]);

  // Hierarchical filtering function
  const filterTasksHierarchically = useCallback((tasks: Task[]): Task[] => {
    const filterTaskRecursively = (task: Task): Task | null => {
      // First, recursively filter children
      const filteredChildren = task.children 
        ? task.children.map(filterTaskRecursively).filter((child): child is Task => child !== null)
        : [];

      // Check if this task itself matches the filters
      const taskMatches = doesTaskMatchFilters(task);

      // Include this task if:
      // 1. The task itself matches the filters, OR
      // 2. It has children that match (and we want to preserve hierarchy)
      const shouldInclude = taskMatches || filteredChildren.length > 0;

      if (!shouldInclude) {
        return null;
      }

      // Return the task with filtered children
      return {
        ...task,
        children: filteredChildren,
        expanded: expandedTasks.has(task.id) || filteredChildren.length > 0 // Auto-expand if has matching children
      };
    };

    return tasks
      .map(filterTaskRecursively)
      .filter((task): task is Task => task !== null);
  }, [expandedTasks, doesTaskMatchFilters]);

  // Flat filtering function (original logic)
  const filterTasksFlat = useCallback((tasks: Task[]): Task[] => {
    // Flatten all tasks from current position downward to include all descendants
    const allDescendantTasks = flattenTasks(tasks);
    
    // Apply filters to the flattened list
    const matchingTasks = allDescendantTasks.filter(task => {
      // Parent task filter - exclude parent tasks if not included
      if (includeParentTasks === false && isParentTask(task)) {
        return false;
      }
      
      return doesTaskMatchFilters(task);
    });
    
    // Convert matching tasks back to a flat list with parent information preserved
    return matchingTasks.map(task => {
      // Check if this task originally had children (is a parent task)
      const originalTask = allDescendantTasks.find(t => t.id === task.id);
      const hadChildren = originalTask && originalTask.children && originalTask.children.length > 0;
      
      return {
        ...task,
        children: [], // Remove children to show as flat list
        expanded: false,
        isParentInFilter: hadChildren // Flag to indicate this was originally a parent
      };
    });
  }, [includeParentTasks, doesTaskMatchFilters]);

  // Apply filters to all tasks under current position (including all descendants)
  const filteredTasks = useMemo(() => {
    if (!currentTasks.length) return [];
    
    // If no filters are applied, return the original tree structure
    const hasFilters = debouncedSearch.trim() !== '' || 
                      selectedStatuses.length > 0 || 
                      selectedPriorities.length > 0 ||
                      selectedTagIds.length > 0 ||
                      dateFilterFrom !== '' ||
                      dateFilterTo !== '' ||
                      includeParentTasks === false ||
                      maintainHierarchy === true;
    
    if (!hasFilters) {
      return currentTasks;
    }

    // Two different filtering modes
    if (maintainHierarchy) {
      // Hierarchical filtering: preserve structure and include parents when children match
      return filterTasksHierarchically(currentTasks);
    } else {
      // Flat filtering: convert to flat list
      return filterTasksFlat(currentTasks);
    }
  }, [currentTasks, debouncedSearch, selectedStatuses, selectedPriorities, selectedTagIds, dateFilterFrom, dateFilterTo, includeParentTasks, maintainHierarchy, filterTasksHierarchically, filterTasksFlat]);

  // Apply sorting to filtered tasks
  const sortedTasks = useMemo(() => {
    if (sortOptions.length === 0) return filteredTasks;
    
    // For flat filtered tasks, apply sorting directly
    if (filteredTasks.length > 0 && !filteredTasks[0].children) {
      return sortTasksMultiple(filteredTasks, sortOptions);
    }
    
    // For hierarchical tasks, apply sorting to each level
    const sortHierarchical = (tasks: Task[]): Task[] => {
      const sorted = sortTasksMultiple(tasks, sortOptions);
      return sorted.map((task: Task) => ({
        ...task,
        children: task.children ? sortHierarchical(task.children) : undefined
      }));
    };
    
    return sortHierarchical(filteredTasks);
  }, [filteredTasks, sortOptions]);

  // Apply expansion state
  const displayedTasks = useMemo(() => {
    const applyExpansion = (taskList: Task[]): Task[] => {
      return taskList.map(task => ({
        ...task,
        expanded: expandedTasks.has(task.id),
        children: task.children ? applyExpansion(task.children) : undefined
      }));
    };
    
    return applyExpansion(sortedTasks);
  }, [sortedTasks, expandedTasks]);



  // パスを構築する効率的な関数（メモ化）
  const buildTaskPath = useCallback((targetId: number): Task[] => {
    const path: Task[] = [];
    
    const findPath = (taskList: Task[], currentPath: Task[]): boolean => {
      for (const task of taskList) {
        const newPath = [...currentPath, task];
        
        if (task.id === targetId) {
          path.push(...newPath);
          return true;
        }
        
        if (task.children && task.children.length > 0) {
          if (findPath(task.children, newPath)) {
            return true;
          }
        }
      }
      return false;
    };
    
    findPath(tasks, []);
    return path;
  }, [tasks]);

  // Get breadcrumb path
  const breadcrumbPath = useMemo(() => {
    // Don't calculate if we're still loading or don't have a rootId
    if (!rootId || loading || tasks.length === 0) {
      return [];
    }
    
    const targetId = parseInt(rootId);
    return buildTaskPath(targetId);
  }, [rootId, loading, tasks.length, buildTaskPath]);


  // Set shortcut context when component mounts or when rootId changes
  useEffect(() => {
    setTasksPageContext();
    // クリーンアップ関数を削除 - TasksPageがアンマウントされるときのみリセット
  }, [setTasksPageContext, rootId]);
  
  // コンポーネントがアンマウントされるときのみコンテキストをリセット
  useEffect(() => {
    return () => {
      setCurrentContext('global');
    };
  }, [setCurrentContext]);

  // ステータス変更の検出とモーダル保護
  useEffect(() => {
    if (isStatusChanging) {
      // ステータス変更中は一定時間後にフラグをリセット
      const timer = setTimeout(() => {
        setIsStatusChanging(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isStatusChanging]);

  // モーダルが開いているときは、選択されたタスクの最新情報を保持
  // stableSelectedTaskを基準にして、モーダルの安定性を保証
  const currentSelectedTask = useMemo(() => {
    if (!stableSelectedTask || !isDetailModalOpen) return null;
    
    const foundTask = findTaskById(tasks, stableSelectedTask.id);
    
    // ステータス変更中は、タスクが見つからなくてもstableSelectedTaskを返す
    // これにより、ステータス変更中の一瞬の空白期間でもモーダルが落ちない
    if (isStatusChanging && !foundTask) {
      return stableSelectedTask;
    }
    
    // 最新のタスクが見つからない場合でも、stableSelectedTaskを返してモーダルを維持
    return foundTask || stableSelectedTask;
  }, [stableSelectedTask, isDetailModalOpen, tasks, isStatusChanging, findTaskById]);

  // Task Modal handlers
  const openDetailModal = (task: Task) => {
    setStableSelectedTask(task);
    setIsCreatingTask(false);
    setCreateParentId(undefined);
    setIsDetailModalOpen(true);
  };
  
  const openCreateModal = (parentId?: number) => {
    setStableSelectedTask(null);
    setIsCreatingTask(true);
    setCreateParentId(parentId);
    setIsDetailModalOpen(true);
  };
  
  const openSubTaskModal = (parentId: number) => {
    openCreateModal(parentId);
  };
  
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setIsCreatingTask(false);
    setCreateParentId(undefined);
    // モーダルが完全に閉じるまで少し待ってからstableSelectedTaskをクリア
    setTimeout(() => {
      setStableSelectedTask(null);
    }, 300);
  };
  


  // Check if any filters are active - use immediate searchQuery for instant button visibility
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== '' ||
      selectedStatuses.length > 0 ||
      selectedPriorities.length > 0 ||
      selectedTagIds.length > 0 ||
      dateFilterFrom !== '' ||
      dateFilterTo !== '' ||
      includeParentTasks === false ||
      maintainHierarchy === true
    );
  }, [searchQuery, selectedStatuses, selectedPriorities, selectedTagIds, dateFilterFrom, dateFilterTo, includeParentTasks, maintainHierarchy]);

  // Clear the clearing flag when debounced search clears and we have no active filters
  useEffect(() => {
    if (isClearingFilters && !hasActiveFilters && debouncedSearch === '') {
      setIsClearingFilters(false);
    }
  }, [isClearingFilters, hasActiveFilters, debouncedSearch]);


  // Filter handlers
  const handleClearFilters = useCallback(() => {
    // React 18のautomatic batchingを利用した同期バッチ更新
    unstable_batchedUpdates(() => {
      setIsClearingFilters(true);
      setSearchQuery('');
      setSelectedTagIds([]);
      setSelectedStatuses([]);
      setSelectedPriorities([]);
      setDateFilterFrom('');
      setDateFilterTo('');
      setIncludeParentTasks(true);
      setMaintainHierarchy(false);
    });
  }, [setSearchQuery, setSelectedTagIds, setSelectedStatuses, setSelectedPriorities, setDateFilterFrom, setDateFilterTo, setIncludeParentTasks, setMaintainHierarchy]);

  // タグプールからタグを選択した際のハンドラー
  const handleTagPoolSelect = async (tag: Tag) => {
    if (selectedTaskForTagging) {
      try {
        // タスクの現在のタグIDを取得
        const currentTagIds = selectedTaskForTagging.tagIds || [];
        
        // タグが既に追加されているかチェック
        if (!currentTagIds.includes(tag.id)) {
          const updatedTagIds = [...currentTagIds, tag.id];
          
          // タスクを更新
          await window.taskAPI.updateTask(selectedTaskForTagging.id, {
            tagIds: updatedTagIds
          });
          
          // タスク一覧を再読み込み
          loadTasks();
        }
        
        // 選択状態をリセット
        setSelectedTaskForTagging(null);
        setShowTagPool(false);
      } catch (error) {
        console.error('Failed to add tag to task:', error);
      }
    } else {
      // タスクが選択されていない場合は、モーダルを開いたまま（何もしない）
      // setShowTagPool(false); // 新規作成時はモーダルを開いたまま
    }
  };

  // Sort handlers
  const handleSortChange = useCallback((newSortOptions: SortOption[]) => {
    setSortOptions(newSortOptions);
  }, [setSortOptions]);

  const handleClearSort = useCallback(() => {
    setSortOptions([]);
  }, [setSortOptions]);


  // Navigate to task
  const handleTaskClick = useCallback((taskId: number) => {
    setLocation(`/tasks/${taskId}`);
  }, [setLocation]);

  // Navigation shortcut handlers
  const handleNavigateToParent = useCallback(() => {
    if (breadcrumbPath.length > 1) {
      // We have a parent, navigate to it
      const parentTask = breadcrumbPath[breadcrumbPath.length - 2];
      setLocation(`/tasks/${parentTask.id}`);
    } else if (breadcrumbPath.length === 1) {
      // We're at a root task, navigate to home
      setLocation('/tasks');
    }
    // No error message needed - silent operation
  }, [breadcrumbPath, setLocation]);

  // ショートカットイベントリスナー（最適化）
  useEffect(() => {
    const eventTypes = [
      'openTaskEditModal',
      'openFilterModal', 
      'openSortModal',
      'openTaskCreateModal',
      'openMergeModal',
      'navigateToParent',
      'toggleTaskExpansion'
    ];

    const handleShortcutEvents = (event: CustomEvent) => {
      switch (event.type) {
        case 'openTaskEditModal':
          if (event.detail?.task) openDetailModal(event.detail.task);
          break;
        case 'openFilterModal':
          setShowTagFilter(true);
          break;
        case 'openSortModal':
          setShowSortModal(true);
          break;
        case 'openTaskCreateModal':
          openCreateModal(event.detail?.parentId);
          break;
        case 'openMergeModal':
          setIsMergeModalOpen(true);
          break;
        case 'navigateToParent':
          handleNavigateToParent();
          break;
        case 'toggleTaskExpansion':
          if (event.detail?.task) toggleTaskExpansion(event.detail.task.id);
          break;
      }
    };

    // 全イベントリスナーを一括登録
    eventTypes.forEach(type => {
      window.addEventListener(type, handleShortcutEvents as EventListener);
    });

    // 一括削除
    return () => {
      eventTypes.forEach(type => {
        window.removeEventListener(type, handleShortcutEvents as EventListener);
      });
    };
  }, [toggleTaskExpansion, handleNavigateToParent]);

  const handleDeleteTask = async (taskId: number) => {
    try {
      // 削除前に必要な情報を保存
      const taskToDelete = findTaskById(tasks, taskId);
      const currentTaskId = rootId ? parseInt(rootId) : null;
      const isCurrentTask = currentTaskId === taskId;
      
      // Handle navigation immediately if it's the current task
      if (isCurrentTask && taskToDelete) {
        if (taskToDelete.parentId) {
          setLocation(`/tasks/${taskToDelete.parentId}`);
        } else {
          setLocation('/tasks');
        }
      }
      
      // Delete task immediately
      await deleteTask(taskId);
      
      // Show success message
      
    } catch (error) {
    }
  };

  // タスクの順序変更処理
  const handleTaskReorder = async (taskId: number, newParentId: number | null, newPosition: number) => {
    try {
      console.log('Task reorder:', { taskId, newParentId, newPosition });
      
      // タスクの親IDと位置を更新
      const updateData: { parentId?: number | null; position?: number } = {};
      
      if (newParentId !== null) {
        // 親タスクへの移動
        updateData.parentId = newParentId;
        updateData.position = newPosition;
      } else {
        // 同じレベルでの順序変更
        updateData.position = newPosition;
      }
      
      await window.taskAPI.updateTask(taskId, updateData);
      
      // タスクリストを再読み込み
      await loadTasks();
      
      console.log('Task reorder completed successfully');
    } catch (error) {
      console.error('Failed to reorder task:', error);
      throw error;
    }
  };


  return (
    <div className="tasks-page">
      {/* Search and Filter Controls */}
      <div className="search-filter-container">
        <div className="search-input-wrapper">
          <TextInput
            type="search"
            placeholder="タスクを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button
          ref={filterButtonRef}
          className={`search-filter-icon ${hasActiveFilters ? 'has-filters' : ''} ${showTagFilter ? 'active' : ''}`}
          onClick={() => setShowTagFilter(!showTagFilter)}
          title={hasActiveFilters ? "フィルター適用中" : "フィルター"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
          </svg>
        </button>
        
        <button
          ref={sortButtonRef}
          className={`search-sort-icon ${sortOptions.length > 0 ? 'has-sort' : ''} ${showSortModal ? 'active' : ''}`}
          onClick={() => setShowSortModal(!showSortModal)}
          title={sortOptions.length > 0 ? "ソート適用中" : "ソート"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h6v-2H3v2zM3 6v2h6V6H3zm0 7h6v-2H3v2zm7-7v2h11V6H10zm0 7h11v-2H10v2zm0 5h11v-2H10v2z"/>
          </svg>
          {sortOptions.length > 0 && <span className="sort-count">{sortOptions.length}</span>}
        </button>
        
        <button
          className="merge-task-icon"
          onClick={() => setIsMergeModalOpen(true)}
          title="タスクを統合"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zM17 17H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
          </svg>
        </button>
        
        <div style={{ position: 'relative' }}>
          <button
            ref={tagPoolButtonRef}
            className={`tag-pool-trigger ${showTagPool ? 'active' : ''}`}
            onClick={() => setShowTagPool(!showTagPool)}
            title="タグプール"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.5,7A1.5,1.5 0 0,1 4,5.5A1.5,1.5 0 0,1 5.5,4A1.5,1.5 0 0,1 7,5.5A1.5,1.5 0 0,1 5.5,7M21.41,11.58L12.41,2.58C12.05,2.22 11.55,2 11,2H4C2.89,2 2,2.89 2,4V11C2,11.55 2.22,12.05 2.59,12.41L11.58,21.41C11.95,21.78 12.45,22 13,22C13.55,22 14.05,21.78 14.41,21.41L21.41,14.41C21.78,14.05 22,13.55 22,13C22,12.45 21.78,11.95 21.41,11.58Z"/>
            </svg>
          </button>
          
          {showTagPool && (
            <TagPool
              isOpen={showTagPool}
              onClose={() => {
                setShowTagPool(false);
                setSelectedTaskForTagging(null);
              }}
              onTagSelect={handleTagPoolSelect}
              triggerRef={tagPoolButtonRef}
              selectedTaskForTagging={selectedTaskForTagging}
            />
          )}
        </div>
        
        <button
          className="create-task-icon"
          onClick={() => openCreateModal(rootId ? parseInt(rootId) : undefined)}
          title="タスクを作成"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>

      {/* Filter Modal */}
      <NotionLikeFilterModal
        isOpen={showTagFilter}
        onClose={() => setShowTagFilter(false)}
        triggerRef={filterButtonRef}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
        selectedPriorities={selectedPriorities}
        onPriorityChange={setSelectedPriorities}
        selectedTagIds={selectedTagIds}
        onTagChange={setSelectedTagIds}
        allTags={tags}
        dateFilterFrom={dateFilterFrom}
        dateFilterTo={dateFilterTo}
        onDateFromChange={setDateFilterFrom}
        onDateToChange={setDateFilterTo}
        includeParentTasks={includeParentTasks}
        onIncludeParentTasksChange={setIncludeParentTasks}
        maintainHierarchy={maintainHierarchy}
        onMaintainHierarchyChange={setMaintainHierarchy}
        onClearFilters={handleClearFilters}
      />


      {/* Sort Modal */}
      <NotionLikeSortModal
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        triggerRef={sortButtonRef}
        currentSort={sortOptions}
        onSortChange={handleSortChange}
        onClearSort={handleClearSort}
      />

      {/* Breadcrumb */}
      {breadcrumbPath.length > 0 && (
        <nav className="breadcrumb">
          <ol>
            <li>
              <button
                onClick={() => setLocation('/tasks')}
                className="breadcrumb-link"
              >
                ホーム
              </button>
            </li>
            {breadcrumbPath.map((task, index) => (
              <li key={task.id}>
                <span className="breadcrumb-separator">/</span>
                {index === breadcrumbPath.length - 1 ? (
                  <span className="breadcrumb-current">{task.title}</span>
                ) : (
                  <button
                    onClick={() => setLocation(`/tasks/${task.id}`)}
                    className="breadcrumb-link"
                  >
                    {task.title}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Task List */}
      <div className="task-list-container">
        {error && (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        )}

        {isLeafNode && currentTargetTask ? (
          <div className="task-detail-view-simple">
            <TaskItem
              task={currentTargetTask}
              level={0}
              onTasksChange={loadTasks}
              onAddSubTask={openSubTaskModal}
              onTaskClick={handleTaskClick}
              onEditTask={openDetailModal}
              onDeleteTask={handleDeleteTask}
              onToggleExpand={toggleTaskExpansion}
              isDetailView={true}
            />
          </div>
        ) : !initialized ? (
          <div className="loading-placeholder">
            {/* 初期化中は何も表示しない */}
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="empty-state">
            <p className="empty-message">
              {(() => {
                // フィルタークリア中または条件に一致しない場合のメッセージ
                const shouldShowFilterMessage = hasActiveFilters || isClearingFilters || (currentTasks.length > 0 && displayedTasks.length === 0);
                
                return shouldShowFilterMessage
                  ? 'フィルター条件に一致するタスクがありません'
                  : 'タスクが登録されていません';
              })()}
            </p>
            {(() => {
              // フィルタークリア中またはフィルターがある場合はクリアボタンを表示
              const shouldShowClearButton = hasActiveFilters || isClearingFilters || (currentTasks.length > 0 && displayedTasks.length === 0);
              
              return shouldShowClearButton ? (
                <Button
                  variant="secondary"
                  onClick={handleClearFilters}
                >
                  フィルターをクリア
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => openCreateModal()}
                >
                  最初のタスクを作成
                </Button>
              );
            })()}
            {rootId && displayedTasks.length === 0 && (
              <Button
                variant="secondary"
                onClick={() => setLocation('/tasks')}
              >
                タスクホームに戻る
              </Button>
            )}
          </div>
        ) : (
          <TaskList
            tasks={displayedTasks}
            onTasksChange={loadTasks}
            onAddSubTask={openSubTaskModal}
            onTaskClick={handleTaskClick}
            onEditTask={openDetailModal}
            onDeleteTask={handleDeleteTask}
            onToggleExpand={toggleTaskExpansion}
            onTaskSelectForTagging={(task) => {
              setSelectedTaskForTagging(task);
              setShowTagPool(true);
            }}
            isDetailView={!!rootId}
            onTaskReorder={handleTaskReorder}
          />
        )}
      </div>

      {/* Task Detail Modal (統一) */}
      {(stableSelectedTask || isCreatingTask) && (
        isCreatingTask ? (
          <TaskCreateModal
            isOpen={isDetailModalOpen}
            onClose={closeDetailModal}
            defaultValues={{
              parentId: createParentId
            }}
          />
        ) : (
          <TaskEditModal
            isOpen={isDetailModalOpen}
            onClose={closeDetailModal}
            task={currentSelectedTask || stableSelectedTask || undefined}
            onStatusChange={() => setIsStatusChanging(true)}
          />
        )
      )}

      {/* Task Merge Modal */}
      <TaskMergeModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        allTasks={tasks}
      />
    </div>
  );
};

export default TasksPage;