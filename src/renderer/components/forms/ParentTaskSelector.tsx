import React, { useState, useRef, forwardRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';

interface ParentTaskSelectorProps {
  availableTasks: { id: number; title: string; depth: number }[];
  selectedParentId?: number;
  onParentSelect: (parentId?: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxHeight?: string;
}

// インライン検索入力コンポーネント
const InlineSearchInput = forwardRef<HTMLInputElement, {
  selectedTask?: { id: number; title: string; depth: number };
  placeholder: string;
  disabled: boolean;
  isOpen: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}>(({ selectedTask, placeholder, disabled, isOpen, searchTerm, onSearchChange, onFocus, onBlur }, ref) => (
  <input
    ref={ref}
    type="text"
    value={isOpen ? searchTerm : (selectedTask ? selectedTask.title : '')}
    onChange={(e) => onSearchChange(e.target.value)}
    onFocus={onFocus}
    onBlur={onBlur}
    placeholder={isOpen ? "親タスクを検索..." : placeholder}
    className="parent-task-selector-input"
    disabled={disabled}
    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
  />
));

InlineSearchInput.displayName = 'InlineSearchInput';

// 親タスク選択モーダル
const ParentTaskSelectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  availableTasks: { id: number; title: string; depth: number }[];
  selectedParentId?: number;
  onParentSelect: (parentId?: number) => void;
  maxHeight: string;
  triggerRef: React.RefObject<HTMLInputElement | null>;
  searchTerm: string;
}> = ({ isOpen, onClose, availableTasks, selectedParentId, onParentSelect, maxHeight, triggerRef, searchTerm }) => {
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0, width: 0 });

  // フィルタリングされたタスク（メモ化）
  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return availableTasks;
    const searchLower = searchTerm.toLowerCase();
    return availableTasks.filter(task =>
      task.title.toLowerCase().includes(searchLower)
    );
  }, [availableTasks, searchTerm]);

  // モーダルの位置を計算（入力欄の上に表示）
  React.useEffect(() => {
    const calculatePosition = () => {
      if (!isOpen || !triggerRef.current) return;
      
      const rect = triggerRef.current.getBoundingClientRect();
      
      // BaseTaskModalのbody変形を考慮した位置補正
      const bodyStyle = document.body.style;
      const bodyTop = bodyStyle.position === 'fixed' ? 
        parseInt(bodyStyle.top || '0', 10) : 0;
      
      const correctedRect = {
        ...rect,
        top: rect.top - bodyTop,
        bottom: rect.bottom - bodyTop,
        left: rect.left,
        right: rect.right
      };
      const modalWidth = correctedRect.width; // 入力欄と同じ幅
      const modalHeight = Math.min(280, window.innerHeight - 40);
      
      // 入力欄の真上に表示
      let left = correctedRect.left;
      let top = correctedRect.top - modalHeight - 8; // 入力欄の上に8px余白
      
      // 左右の位置調整：画面からはみ出ないように
      if (left + modalWidth > window.innerWidth - 16) {
        left = window.innerWidth - modalWidth - 16;
      }
      if (left < 16) {
        left = 16;
      }
      
      // 上にはみ出る場合は入力欄の下に表示
      if (top < 20) {
        top = correctedRect.bottom + 8;
        // 下にもはみ出る場合は上下中央に
        if (top + modalHeight > window.innerHeight - 20) {
          top = Math.max(20, (window.innerHeight - modalHeight) / 2);
        }
      }
      
      setModalPosition({ top, left, width: modalWidth });
    };

    if (isOpen) {
      calculatePosition();
      
      // スクロールやリサイズ時に位置を再計算
      const handleResize = () => calculatePosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize, true);
      };
    }
  }, [isOpen, triggerRef]);

  // 外部クリックでモーダルを閉じる
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.parent-task-selection-modal-content') && !target.closest('.parent-task-selector-input')) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);


  // 親タスク選択ハンドラー
  const handleParentSelect = useCallback((parentId?: number) => {
    onParentSelect(parentId);
    onClose();
  }, [onParentSelect, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="parent-task-selection-modal-content" 
      style={{ 
        position: 'fixed',
        maxHeight, 
        top: modalPosition.top, 
        left: modalPosition.left,
        width: modalPosition.width || 'auto',
        zIndex: 2000
      }}
    >
      {/* タスクリスト */}
      <div className="parent-task-selection-list">
        {/* なし（ルートタスク）オプション */}
        <div
          className={`parent-task-selection-item ${!selectedParentId ? 'selected' : ''}`}
          onClick={() => handleParentSelect(undefined)}
        >
          <span className="parent-task-name">なし（ルートタスク）</span>
        </div>
        
        {filteredTasks.length === 0 && searchTerm ? (
          <div className="parent-task-selection-empty">
            該当するタスクがありません
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`parent-task-selection-item ${task.id === selectedParentId ? 'selected' : ''}`}
              onClick={() => handleParentSelect(task.id)}
              style={{ paddingLeft: `${16 + task.depth * 16}px` }}
            >
              <span className="parent-task-name">{task.title}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

const ParentTaskSelector: React.FC<ParentTaskSelectorProps> = ({ 
  availableTasks, 
  selectedParentId, 
  onParentSelect,
  placeholder = '親タスクを選択',
  className = '',
  disabled = false,
  maxHeight = '300px'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 選択されたタスクの情報を取得（メモ化）
  const selectedTask = useMemo(() => 
    availableTasks.find(task => task.id === selectedParentId), 
    [availableTasks, selectedParentId]
  );

  const handleFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  const handleBlur = useCallback(() => {
    // 少し遅延させてモーダル内のクリックを可能にする
    setTimeout(() => {
      setIsOpen(false);
      setSearchTerm('');
    }, 200);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleParentSelect = useCallback((parentId?: number) => {
    onParentSelect(parentId);
    setIsOpen(false);
    setSearchTerm('');
  }, [onParentSelect]);

  return (
    <div className={`parent-task-selector ${className}`}>
      <InlineSearchInput
        ref={inputRef}
        selectedTask={selectedTask}
        placeholder={placeholder}
        disabled={disabled}
        isOpen={isOpen}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      
      <ParentTaskSelectionModal
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setSearchTerm(''); }}
        availableTasks={availableTasks}
        selectedParentId={selectedParentId}
        onParentSelect={handleParentSelect}
        maxHeight={maxHeight}
        triggerRef={inputRef}
        searchTerm={searchTerm}
      />
    </div>
  );
};

export default ParentTaskSelector;