/**
 * Reusable Badge component
 * For status, priority, and tag displays
 */

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'priority' | 'tag' | 'default';
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  color,
  textColor,
  size = 'sm',
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };
  
  const variantClasses = {
    status: 'border',
    priority: 'border',
    tag: '',
    default: 'bg-gray-100 text-gray-800'
  };
  
  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  
  const style: React.CSSProperties = {};
  if (color) {
    style.backgroundColor = color;
  }
  if (textColor) {
    style.color = textColor;
  }
  
  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
};