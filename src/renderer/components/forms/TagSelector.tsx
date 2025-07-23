import React, { useState, useEffect, forwardRef, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Tag } from '../../types/tag';

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTagIds: number[];
  onTagsChange: (tagIds: number[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxHeight?: string;
}

// カスタムボタンコンポーネント（GoogleDatePickerと同様のデザイン）
const CustomTagButton = forwardRef<HTMLDivElement, {
  selectedTags: Tag[];
  onClick: () => void;
  placeholder: string;
  disabled: boolean;
  getContrastColor: (color: string) => string;
  onTagRemove: (tagId: number) => void;
}>(({ selectedTags, onClick, placeholder, disabled, getContrastColor, onTagRemove }, ref) => (
  <div 
    ref={ref}
    className={`google-date-input tag-selector-button ${disabled ? 'disabled' : ''}`}
    onClick={disabled ? undefined : onClick}
    tabIndex={disabled ? -1 : 0}
    role="button"
    aria-label="タグを選択"
    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
  >
    {selectedTags.length === 0 ? (
      <span className="google-date-value tag-selector-placeholder">
        {placeholder}
      </span>
    ) : (
      <div className="tag-selector-selected-tags">
        {selectedTags.map(tag => (
          <div
            key={tag.id}
            className="tag-selector-badge"
            style={{
              backgroundColor: tag.color,
              color: tag.textColor || tag.text_color || getContrastColor(tag.color)
            }}
          >
            <span className="tag-selector-badge-text">{tag.name}</span>
            <button
              className="tag-selector-badge-remove"
              onClick={(e) => {
                e.stopPropagation();
                onTagRemove(tag.id);
              }}
              disabled={disabled}
              aria-label={`${tag.name}を削除`}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
));

CustomTagButton.displayName = 'CustomTagButton';

// タグ選択モーダル
const TagSelectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  availableTags: Tag[];
  selectedTagIds: number[];
  onTagToggle: (tagId: number) => void;
  getContrastColor: (color: string) => string;
  maxHeight: string;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}> = ({ isOpen, onClose, availableTags, selectedTagIds, onTagToggle, getContrastColor, maxHeight, triggerRef }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // フィルタリングされたタグ（メモ化）
  const filteredTags = useMemo(() => {
    if (!searchTerm.trim()) return availableTags;
    const searchLower = searchTerm.toLowerCase();
    return availableTags.filter(tag =>
      tag.name.toLowerCase().includes(searchLower)
    );
  }, [availableTags, searchTerm]);

  // モーダルの位置を計算（レスポンシブ対応とスクロール対応）
  useEffect(() => {
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
      const modalWidth = window.innerWidth < 480 ? Math.min(320, window.innerWidth - 32) : 320;
      const modalHeight = Math.min(400, window.innerHeight - 40);
      
      // レスポンシブ対応：モバイルでは中央表示
      if (window.innerWidth < 640) {
        setModalPosition({
          top: Math.max(20, (window.innerHeight - modalHeight) / 2),
          left: (window.innerWidth - modalWidth) / 2
        });
        return;
      }
      
      // デスクトップ：右横に表示（垂直位置はボタンと同じ高さ）
      let left = correctedRect.right + 8;
      let top = correctedRect.top;
      
      // 右側に収まらない場合は左側に
      if (left + modalWidth > window.innerWidth - 16) {
        left = correctedRect.left - modalWidth - 8;
        
        // 左側にも収まらない場合は画面内に収める
        if (left < 16) {
          left = Math.min(16, window.innerWidth - modalWidth - 16);
        }
      }
      
      // 上下の位置調整：画面内に収まるように調整
      if (top + modalHeight > window.innerHeight - 20) {
        // 下にはみ出る場合は上にずらす
        top = Math.max(20, window.innerHeight - modalHeight - 20);
      }
      
      // 上にはみ出る場合は下にずらす
      if (top < 20) {
        top = 20;
      }
      
      setModalPosition({ top, left });
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
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.tag-selection-modal-content') && !target.closest('.tag-selector-button')) {
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

  // 検索をクリア
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    searchInputRef.current?.focus();
  }, []);

  // タグトグルハンドラー
  const handleTagToggle = useCallback((tagId: number) => {
    onTagToggle(tagId);
  }, [onTagToggle]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="tag-selection-modal-content" 
      style={{ 
        position: 'fixed',
        maxHeight, 
        top: modalPosition.top, 
        left: modalPosition.left,
        zIndex: 2000
      }}
    >
      {/* 検索ボックス */}
      <div className="tag-selection-search">
        <div className="tag-selection-search-wrapper">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="タグを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tag-selection-search-input"
            aria-label="タグを検索"
          />
          {searchTerm && (
            <button
              type="button"
              className="tag-selection-search-clear"
              onClick={clearSearch}
              aria-label="検索をクリア"
              tabIndex={-1}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* タグリスト */}
      <div className="tag-selection-list">
        {filteredTags.length === 0 ? (
          <div className="tag-selection-empty">
            {searchTerm ? '該当するタグがありません' : 'タグがありません'}
          </div>
        ) : (
          filteredTags.map((tag, index) => (
            <div
              key={tag.id}
              className={`tag-selection-item ${selectedTagIds.includes(tag.id) ? 'selected' : ''}`}
              onClick={() => handleTagToggle(tag.id)}
            >
              <span 
                className="tag-name"
                style={{
                  backgroundColor: tag.color,
                  color: tag.textColor || tag.text_color || getContrastColor(tag.color),
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'inline-block',
                  maxWidth: '100%',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                {tag.name}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

const TagSelector: React.FC<TagSelectorProps> = ({
  availableTags,
  selectedTagIds,
  onTagsChange,
  placeholder = 'タグを選択',
  className = '',
  disabled = false,
  maxHeight = '300px'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // 選択されたタグの情報を取得（メモ化）
  const selectedTags = useMemo(() => 
    availableTags.filter(tag => selectedTagIds.includes(tag.id)), 
    [availableTags, selectedTagIds]
  );

  // タグの選択/解除（メモ化）
  const handleTagToggle = useCallback((tagId: number) => {
    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    
    onTagsChange(newSelectedIds);
  }, [selectedTagIds, onTagsChange]);

  // コントラストカラーの計算（メモ化）
  const getContrastColor = useCallback((hexColor: string): string => {
    if (!hexColor || !hexColor.startsWith('#') || hexColor.length !== 7) {
      return '#ffffff';
    }
    
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }, []);

  const handleButtonClick = useCallback(() => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  }, [disabled, isOpen]);

  const handleCloseModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  // タグ削除ハンドラー
  const handleTagRemove = useCallback((tagId: number) => {
    const newSelectedIds = selectedTagIds.filter(id => id !== tagId);
    onTagsChange(newSelectedIds);
  }, [selectedTagIds, onTagsChange]);

  return (
    <div className={`tag-selector ${className}`}>
      <CustomTagButton
        ref={buttonRef}
        selectedTags={selectedTags}
        onClick={handleButtonClick}
        placeholder={placeholder}
        disabled={disabled}
        getContrastColor={getContrastColor}
        onTagRemove={handleTagRemove}
      />
      
      <TagSelectionModal
        isOpen={isOpen}
        onClose={handleCloseModal}
        availableTags={availableTags}
        selectedTagIds={selectedTagIds}
        onTagToggle={handleTagToggle}
        getContrastColor={getContrastColor}
        maxHeight={maxHeight}
        triggerRef={buttonRef}
      />
    </div>
  );
};

export default TagSelector;