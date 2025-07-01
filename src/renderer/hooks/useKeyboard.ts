/**
 * useKeyboard hook
 * Handles keyboard events and shortcuts
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

export function useKeyboard(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    for (const shortcut of shortcuts) {
      const {
        key,
        ctrlKey = false,
        metaKey = false,
        shiftKey = false,
        altKey = false,
        callback,
        preventDefault = true
      } = shortcut;

      // Check if the key matches
      if (event.key.toLowerCase() !== key.toLowerCase()) continue;

      // Check modifier keys
      if (event.ctrlKey !== ctrlKey) continue;
      if (event.metaKey !== metaKey) continue;
      if (event.shiftKey !== shiftKey) continue;
      if (event.altKey !== altKey) continue;

      // Execute callback
      callback(event);

      if (preventDefault) {
        event.preventDefault();
      }
      
      break; // Stop checking other shortcuts
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

/**
 * useEscapeKey hook
 * Simplified hook for handling escape key
 */
export function useEscapeKey(callback: () => void, enabled = true) {
  useKeyboard([
    {
      key: 'Escape',
      callback: callback
    }
  ], enabled);
}