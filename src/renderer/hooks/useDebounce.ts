/**
 * useDebounce hook - Now using optimized library implementation
 * Better performance and memory management
 */

import { useDebounce as useDebounceLib, useDebouncedCallback } from 'use-debounce';

// Re-export the library's useDebounce with same interface
export function useDebounce<T>(value: T, delay: number): T {
  return useDebounceLib(value, delay)[0];
}

// Re-export the library's debounced callback with same interface
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  return useDebouncedCallback(callback, delay) as unknown as T;
}