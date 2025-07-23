import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Tag } from '../../types';
import { useTaskContext } from '../../contexts';

interface TagPoolProps {
  isOpen: boolean;
  onClose: () => void;
  onTagSelect: (tag: Tag) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  className?: string;
  selectedTaskForTagging?: {
    id: number;
    title: string;
  } | null;
}

const TagPool: React.FC<TagPoolProps> = ({
  isOpen,
  onClose,
  onTagSelect,
  triggerRef,
  className = '',
  selectedTaskForTagging
}) => {
  const { tags, createTag, deleteTag } = useTaskContext();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showExistingTags, setShowExistingTags] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // コンテキストからタグを取得するため、個別の読み込み処理は不要

  // Calculate position based on trigger button
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.right - 320 // 320px is the width of the tag pool
      });
    }
  }, [isOpen, triggerRef]);

  // 新しいタグ作成モードの際のフォーカス
  useEffect(() => {
    if (isCreating && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isCreating]);

  // フィルタリングされたタグ
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // コントラストカラーの計算
  const getContrastColor = (hexColor: string): string => {
    if (!hexColor || !hexColor.startsWith('#') || hexColor.length !== 7) {
      return '#ffffff';
    }
    
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // 新しいタグを作成
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const textColor = getContrastColor(newTagColor);
      const newTag = await createTag(newTagName.trim(), newTagColor, textColor);
      
      // 作成後に選択（コンテキストが自動的にタグリストを更新）
      onTagSelect(newTag);
      
      // フォームをリセット（作成モードは維持）
      setNewTagName('');
      setNewTagColor('#3b82f6');
      // setIsCreating(false); // 作成モードを維持してモーダルを開いたまま
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  // タグを削除
  const handleDeleteTag = async (tag: Tag, event: React.MouseEvent) => {
    event.stopPropagation(); // タグ選択を防ぐ
    
    try {
      await deleteTag(tag.id);
      // コンテキストが自動的にタグリストを更新
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  // エスケープキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isCreating) {
          setIsCreating(false);
          setNewTagName('');
          setNewTagColor('#3b82f6');
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isCreating, onClose]);

  // 外部クリックでモーダルを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (modalRef.current && !modalRef.current.contains(target) &&
          triggerRef.current && !triggerRef.current.contains(target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  // タグ作成フォームのキー処理（Enterでの作成を無効化）
  const handleCreateKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Enterキーでの作成を防ぐ
    }
  };

  if (!isOpen) return null;

  const tagPoolContent = (
    <div 
      className={`tag-pool ${className}`} 
      ref={modalRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 99999
      }}
    >
      <div className="tag-pool-header">
        <h3>タグプール</h3>
        <div className="tag-pool-header-actions">
          <button
            className={`tag-pool-toggle ${showExistingTags ? 'active' : ''}`}
            onClick={() => setShowExistingTags(!showExistingTags)}
            type="button"
            title={showExistingTags ? '既存タグを隠す' : '既存タグを表示'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z"/>
            </svg>
            {filteredTags.length}
          </button>
          <button
            className="tag-pool-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
      </div>

      {/* タスク選択状態の表示 */}
      {selectedTaskForTagging && (
        <div className="tag-pool-selected-task">
          <div className="selected-task-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            <span>「{selectedTaskForTagging.title}」にタグを追加</span>
          </div>
        </div>
      )}

      {/* 新しいタグ作成 */}
      <div className="tag-pool-create">
        {!isCreating ? (
          <button
            className="tag-pool-create-button"
            onClick={() => setIsCreating(true)}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            新しいタグを作成
          </button>
        ) : (
          <div className="tag-pool-create-form">
            <div className="tag-create-inputs">
              <input
                ref={nameInputRef}
                type="text"
                placeholder="タグ名"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                className="tag-name-input"
              />
              <div className="tag-color-section">
                <label className="tag-color-label">カラー</label>
                <div className="tag-color-input-wrapper">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="tag-color-input"
                    title="タグの色を選択"
                  />
                  <div 
                    className="tag-color-preview"
                    style={{ 
                      backgroundColor: newTagColor,
                      color: getContrastColor(newTagColor)
                    }}
                  >
                    {newTagName || 'プレビュー'}
                  </div>
                </div>
              </div>
            </div>
            <div className="tag-create-actions">
              <button
                className="tag-create-save"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
                type="button"
              >
                作成
              </button>
              <button
                className="tag-create-cancel"
                onClick={() => {
                  setIsCreating(false);
                  setNewTagName('');
                  setNewTagColor('#3b82f6');
                }}
                type="button"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 検索バー */}
      {showExistingTags && (
        <div className="tag-pool-search">
          <input
            type="text"
            placeholder="タグを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tag-pool-search-input"
          />
        </div>
      )}

      {/* タグリスト */}
      {showExistingTags && (
        <div className="tag-pool-list">
          {filteredTags.length === 0 ? (
            <div className="tag-pool-empty">
              {searchTerm ? '該当するタグがありません' : 'タグがありません'}
            </div>
          ) : (
            <div className="tag-pool-items">
              {filteredTags.map(tag => (
                <div
                  key={tag.id}
                  className="tag-pool-item"
                  onClick={() => onTagSelect(tag)}
                >
                  <div 
                    className="tag-pool-badge"
                    style={{
                      backgroundColor: tag.color,
                      color: tag.textColor || tag.text_color || getContrastColor(tag.color)
                    }}
                  >
                    {tag.name}
                  </div>
                  <button
                    className="tag-pool-delete"
                    onClick={(e) => handleDeleteTag(tag, e)}
                    type="button"
                    title={`「${tag.name}」を削除`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return ReactDOM.createPortal(tagPoolContent, document.body);
};

export default TagPool;