import React, { useState, useRef, useCallback, useMemo } from 'react';

interface ParentTaskSelectorProps {
  availableTasks: { id: number; title: string; depth: number }[];
  selectedParentId?: number;
  onParentSelect: (parentId?: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const ParentTaskSelector: React.FC<ParentTaskSelectorProps> = ({ 
  availableTasks, 
  selectedParentId, 
  onParentSelect,
  placeholder = '親タスクを入力',
  className = '',
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isComposing, setIsComposing] = useState(false); // 日本語入力中フラグ
  const [errorMessage, setErrorMessage] = useState(''); // エラーメッセージ
  const inputRef = useRef<HTMLInputElement>(null);

  // 選択されたタスクの情報を取得（メモ化）
  const selectedTask = useMemo(() => 
    availableTasks.find(task => task.id === selectedParentId), 
    [availableTasks, selectedParentId]
  );

  // フィルタリングされた候補（メモ化）
  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const searchLower = inputValue.toLowerCase();
    return availableTasks.filter(task =>
      task.title.toLowerCase().startsWith(searchLower) // 前方一致のみに限定
    );
  }, [availableTasks, inputValue]);

  // 現在の候補
  const currentSuggestion = suggestions[suggestionIndex] || null;

  // 補完テキスト（前方一致の場合のみ）
  const completionText = useMemo(() => {
    if (!currentSuggestion || !inputValue.trim()) return '';
    const completion = currentSuggestion.title.slice(inputValue.length);
    console.log('Completion Debug:', {
      inputValue,
      suggestionTitle: currentSuggestion.title,
      completion,
      suggestionsCount: suggestions.length
    });
    return completion;
  }, [currentSuggestion, inputValue, suggestions.length]);

  // 表示値を計算 - シンプル化
  const displayValue = useMemo(() => {
    if (isEditing) return inputValue;
    return selectedTask ? selectedTask.title : '';
  }, [isEditing, inputValue, selectedTask]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSuggestionIndex(0); // 候補をリセット
    setErrorMessage(''); // エラーメッセージをクリア
  }, []);

  // 日本語入力開始
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  // 日本語入力終了
  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isEditing) return;

    switch (e.key) {
      case 'Enter':
        // 日本語入力中は何もしない（変換確定を優先）
        if (isComposing) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation(); // イベントの伝播を停止
        if (currentSuggestion) {
          // 現在の候補を確定
          onParentSelect(currentSuggestion.id);
          setInputValue('');
          setIsEditing(false);
          setSuggestionIndex(0);
          setErrorMessage('');
          // フォーカスを外す
          inputRef.current?.blur();
        } else if (inputValue.trim() === '') {
          // 空の場合は「なし」を選択
          onParentSelect(undefined);
          setInputValue('');
          setIsEditing(false);
          setSuggestionIndex(0);
          setErrorMessage('');
          // フォーカスを外す
          inputRef.current?.blur();
        } else {
          // 完全一致検索
          const matchingTask = availableTasks.find(task => 
            task.title.toLowerCase() === inputValue.toLowerCase()
          );
          if (matchingTask) {
            onParentSelect(matchingTask.id);
            setInputValue('');
            setIsEditing(false);
            setSuggestionIndex(0);
            setErrorMessage('');
            // フォーカスを外す
            inputRef.current?.blur();
          } else {
            // 一致しない場合はエラーメッセージを表示（編集状態を維持）
            setErrorMessage('この親タスクは存在しません');
          }
        }
        break;
      case 'ArrowDown':
        if (suggestions.length > 0) {
          e.preventDefault();
          setSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        if (suggestions.length > 0) {
          e.preventDefault();
          setSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
        }
        break;
      case 'Escape':
        setInputValue('');
        setIsEditing(false);
        setSuggestionIndex(0);
        break;
      case 'Backspace':
      case 'Delete':
        // バックスペース/削除キーは通常通り動作させる
        break;
    }
  }, [isEditing, currentSuggestion, onParentSelect, inputValue, suggestions.length, availableTasks, isComposing]);

  const handleFocus = useCallback(() => {
    if (!disabled) {
      setIsEditing(true);
      setErrorMessage(''); // エラーメッセージをクリア
      // 既に選択されているタスクがある場合は、そのタイトルから編集開始
      if (selectedTask) {
        setInputValue(selectedTask.title);
        // カーソルを文末に配置（次のフレームで実行）
        setTimeout(() => {
          if (inputRef.current) {
            const length = selectedTask.title.length;
            inputRef.current.setSelectionRange(length, length);
          }
        }, 0);
      } else {
        setInputValue('');
      }
    }
  }, [disabled, selectedTask]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsEditing(false);
      setInputValue('');
      setSuggestionIndex(0);
    }, 150);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !isEditing) {
      setIsEditing(true);
      setErrorMessage(''); // エラーメッセージをクリア
      // 既に選択されているタスクがある場合は、そのタイトルから編集開始
      if (selectedTask) {
        setInputValue(selectedTask.title);
        inputRef.current?.focus();
        // カーソルを文末に配置（次のフレームで実行）
        setTimeout(() => {
          if (inputRef.current) {
            const length = selectedTask.title.length;
            inputRef.current.setSelectionRange(length, length);
          }
        }, 0);
      } else {
        setInputValue('');
        inputRef.current?.focus();
      }
    }
  }, [disabled, isEditing, selectedTask]);

  return (
    <div className={`parent-task-selector ${className}`}>
      <div className="parent-task-input-container" onClick={handleClick}>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          className={`parent-task-selector-input ${isEditing ? 'is-editing' : ''}`}
          disabled={disabled}
        />
        {/* Copilot風インライン補完オーバーレイ */}
        {isEditing && completionText && (
          <div 
            className="parent-task-completion-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              padding: '10px 14px',
              fontSize: '15px',
              fontFamily: 'Google Sans, system-ui, -apple-system, sans-serif',
              zIndex: 5 // 入力フィールドより上に
            }}
          >
            {/* 入力済み文字分のスペース（透明） */}
            <span style={{
              color: 'transparent',
              whiteSpace: 'pre'
            }}>{inputValue}</span>
            {/* 補完文字（グレー） */}
            <span style={{
              color: '#999999',
              whiteSpace: 'pre'
            }}>{completionText}</span>
          </div>
        )}
        
        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="parent-task-error-message">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentTaskSelector;