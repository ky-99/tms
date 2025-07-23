import React from 'react';
import { useLocation } from 'wouter';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Task } from '../../types';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onTasksChange: () => void;
  onAddSubTask?: (parentId: number) => void;
  onTaskClick?: (taskId: number) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: number) => Promise<void>;
  onToggleExpand?: (taskId: number) => void;
  onTaskSelectForTagging?: (task: Task) => void;
  isDetailView?: boolean;
  onTaskReorder?: (taskId: number, newParentId: number | null, newPosition: number) => Promise<void>;
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  onTasksChange, 
  onAddSubTask, 
  onTaskClick, 
  onEditTask, 
  onDeleteTask, 
  onToggleExpand, 
  onTaskSelectForTagging, 
  isDetailView = false,
  onTaskReorder
}) => {
  const [, setLocation] = useLocation();
  const [dragOverTaskId, setDragOverTaskId] = React.useState<number | null>(null);
  const [draggingTaskId, setDraggingTaskId] = React.useState<number | null>(null);

  // ドラッグアンドドロップのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ開始時のハンドラー
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeTaskId = parseInt(active.id.toString());
    setDraggingTaskId(activeTaskId);
  };

  // ドラッグオーバー時のハンドラー
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDragOverTaskId(null);
      return;
    }
    
    const activeTaskId = parseInt(active.id.toString());
    const overTaskId = parseInt(over.id.toString());
    
    if (activeTaskId === overTaskId) {
      setDragOverTaskId(null);
      return;
    }
    
    const overTask = tasks.find(t => t.id === overTaskId);
    const isOverTaskParent = overTask && overTask.children && overTask.children.length > 0;
    
    // 親タスクの場合のみハイライト
    setDragOverTaskId(isOverTaskParent ? overTaskId : null);
  };

  // ドラッグ終了時のハンドラー
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // ドラッグ状態をリセット
    setDragOverTaskId(null);
    setDraggingTaskId(null);
    
    if (!over || !onTaskReorder) return;
    
    const activeTaskId = parseInt(active.id.toString());
    const overTaskId = parseInt(over.id.toString());
    
    if (activeTaskId === overTaskId) return;
    
    const activeTask = tasks.find(t => t.id === activeTaskId);
    const overTask = tasks.find(t => t.id === overTaskId);
    
    if (!activeTask || !overTask) return;
    
    try {
      // 親タスクかどうかを判定
      const isOverTaskParent = overTask.children && overTask.children.length > 0;
      
      if (isOverTaskParent) {
        // 親タスクにドロップした場合 - 子タスクとして移動
        // 元の位置を保持しつつ新しい親の子として追加
        const parentTask = tasks.find(t => t.id === overTaskId);
        const originalPosition = activeTask.position ?? 0;
        
        // 新しい親の子タスクとして、元の位置情報を可能な限り保持
        await onTaskReorder(activeTaskId, overTaskId, originalPosition);
        console.log('Moved task into parent:', { activeTaskId, newParentId: overTaskId, originalPosition });
      } else {
        // 通常のタスクにドロップした場合 - 同じレベルで順序変更
        const oldIndex = tasks.findIndex(task => task.id === activeTaskId);
        const newIndex = tasks.findIndex(task => task.id === overTaskId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          // 実際のposition値を使用（インデックスの代わりに）
          const targetTask = tasks[newIndex];
          const newPosition = targetTask.position ?? newIndex;
          
          await onTaskReorder(activeTaskId, null, newPosition);
          console.log('Reordered tasks:', { activeTaskId, oldIndex, newIndex, newPosition });
        }
      }
    } catch (error) {
      console.error('Failed to reorder task:', error);
    }
  };

  const handleReturnToHome = () => {
    setLocation('/tasks');
  };

  if (tasks.length === 0) {
    return (
      <div className="task-list">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            タスクがありません
          </p>
          <button 
            onClick={handleReturnToHome}
            style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
          >
            タスクホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="task-list">
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task, index) => (
            <div key={task.id}>
              <TaskItem
                task={task}
                level={0}
                onTasksChange={onTasksChange}
                onAddSubTask={onAddSubTask}
                onTaskClick={onTaskClick}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onToggleExpand={onToggleExpand}
                onTaskSelectForTagging={onTaskSelectForTagging}
                isDetailView={isDetailView}
                isDragEnabled={!!onTaskReorder}
                isDragOver={dragOverTaskId === task.id}
                isExternalDragging={draggingTaskId === task.id}
                showGhost={draggingTaskId === task.id}
              />
              {index < tasks.length - 1 && <div className="task-list__divider" />}
            </div>
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
};

export default React.memo(TaskList, (prevProps, nextProps) => {
  return (
    prevProps.tasks === nextProps.tasks &&
    prevProps.onTasksChange === nextProps.onTasksChange &&
    prevProps.onTaskClick === nextProps.onTaskClick &&
    prevProps.onEditTask === nextProps.onEditTask &&
    prevProps.onDeleteTask === nextProps.onDeleteTask &&
    prevProps.onToggleExpand === nextProps.onToggleExpand &&
    prevProps.isDetailView === nextProps.isDetailView
  );
});