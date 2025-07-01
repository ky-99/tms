/**
 * Toast Container component
 * Manages and displays multiple toast notifications
 */

import React from 'react';
import { useErrorContext } from '../../contexts';
import { Toast } from './Toast';

export const ToastContainer: React.FC = () => {
  const { errors, removeError } = useErrorContext();

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {errors.map((error) => (
        <div
          key={error.id}
          className="toast-item"
        >
          <Toast error={error} onClose={removeError} />
        </div>
      ))}
    </div>
  );
};