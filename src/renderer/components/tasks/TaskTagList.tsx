/**
 * Task Tag List component
 * Displays task tags as badges
 */

import React from 'react';
import { Badge } from '../ui';
import { Tag } from '../../types';

interface TaskTagListProps {
  tags?: Tag[];
  maxVisible?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const TaskTagList: React.FC<TaskTagListProps> = ({
  tags = [],
  maxVisible,
  size = 'sm',
  className = ''
}) => {
  if (!tags || tags.length === 0) {
    return null;
  }
  
  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags;
  const hiddenCount = maxVisible && tags.length > maxVisible ? tags.length - maxVisible : 0;
  
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
  
  return (
    <div className={`task-tag-list ${className}`}>
      {visibleTags.map(tag => (
        <Badge
          key={tag.id}
          variant="tag"
          color={tag.color}
          textColor={tag.textColor || tag.text_color || getContrastColor(tag.color)}
          size={size}
        >
          {tag.name}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge
          variant="default"
          size={size}
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
};