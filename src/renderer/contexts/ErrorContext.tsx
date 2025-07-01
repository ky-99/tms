/**
 * Error Context - Centralized error handling and user notifications
 * Manages global error states and user feedback
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Error types
export type ErrorType = 'error' | 'warning' | 'info' | 'success';

export interface AppError {
  id: string;
  type: ErrorType;
  title: string;
  message: string;
  timestamp: Date;
  autoHide?: boolean;
  duration?: number; // in milliseconds
}

// Action types
type ErrorAction =
  | { type: 'ADD_ERROR'; payload: AppError }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'SET_GLOBAL_LOADING'; payload: boolean };

// State interface
interface ErrorState {
  errors: AppError[];
  globalLoading: boolean;
}

// Context interface
interface ErrorContextType extends ErrorState {
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  removeError: (id: string) => void;
  clearAllErrors: () => void;
  clearError: () => void; // Alias for clearAllErrors
  setGlobalLoading: (loading: boolean) => void;
  
  // Convenience methods
  showError: (title: string, message?: string, autoHide?: boolean) => void;
  showWarning: (title: string, message?: string, autoHide?: boolean) => void;
  showInfo: (title: string, message?: string, autoHide?: boolean) => void;
  showSuccess: (title: string, message?: string, autoHide?: boolean) => void;
}

// Initial state
const initialState: ErrorState = {
  errors: [],
  globalLoading: false,
};

// Generate unique ID
const generateId = () => `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Reducer
const errorReducer = (state: ErrorState, action: ErrorAction): ErrorState => {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    
    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload),
      };
    
    case 'CLEAR_ALL_ERRORS':
      return {
        ...state,
        errors: [],
      };
    
    case 'SET_GLOBAL_LOADING':
      return {
        ...state,
        globalLoading: action.payload,
      };
    
    default:
      return state;
  }
};

// Create context
const ErrorContext = createContext<ErrorContextType | null>(null);

// Provider component
interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  const addError = (error: Omit<AppError, 'id' | 'timestamp'>) => {
    const errorId = generateId();
    const newError: AppError = {
      ...error,
      id: errorId,
      timestamp: new Date(),
    };
    
    dispatch({ type: 'ADD_ERROR', payload: newError });
    
    // Auto-hide if specified
    if (error.autoHide !== false) {
      const duration = error.duration || 5000; // Default 5 seconds
      setTimeout(() => {
        // Remove the specific error using its actual ID
        dispatch({ type: 'REMOVE_ERROR', payload: errorId });
      }, duration);
    }
  };

  const removeError = (id: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: id });
  };

  const clearAllErrors = () => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' });
  };

  const setGlobalLoading = (loading: boolean) => {
    dispatch({ type: 'SET_GLOBAL_LOADING', payload: loading });
  };

  // Convenience methods
  const showError = (title: string, message = '', autoHide = false) => {
    addError({
      type: 'error',
      title,
      message,
      autoHide,
      duration: autoHide ? 7000 : undefined, // Errors stay longer
    });
  };

  const showWarning = (title: string, message = '', autoHide = true) => {
    addError({
      type: 'warning',
      title,
      message,
      autoHide,
      duration: 5000,
    });
  };

  const showInfo = (title: string, message = '', autoHide = true) => {
    addError({
      type: 'info',
      title,
      message,
      autoHide,
      duration: 4000,
    });
  };

  const showSuccess = (title: string, message = '', autoHide = true) => {
    addError({
      type: 'success',
      title,
      message,
      autoHide,
      duration: 3000,
    });
  };

  const contextValue: ErrorContextType = {
    ...state,
    addError,
    removeError,
    clearAllErrors,
    clearError: clearAllErrors, // Alias
    setGlobalLoading,
    showError,
    showWarning,
    showInfo,
    showSuccess,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
};

// Custom hook to use the error context
export const useErrorContext = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
};