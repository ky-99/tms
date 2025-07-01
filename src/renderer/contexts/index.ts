/**
 * Context exports
 * Provides centralized access to all application contexts
 */

export { TaskProvider, useTaskContext } from './TaskContext';
export { ErrorProvider, useErrorContext } from './ErrorContext';
export type { AppError, ErrorType } from './ErrorContext';