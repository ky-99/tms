/**
 * Reusable Input components
 * Standardizes form inputs across the app
 */

import React from 'react';

interface BaseInputProps {
  label?: string;
  error?: string;
  className?: string;
}

interface TextInputProps extends BaseInputProps, React.InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'email' | 'password' | 'search' | 'date' | 'datetime-local';
}

interface TextAreaProps extends BaseInputProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

interface SelectProps extends BaseInputProps, React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  className = '',
  type = 'text',
  ...props
}) => {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label>
          {label}
        </label>
      )}
      <input
        type={type}
        className={error ? 'error' : ''}
        {...props}
      />
      {error && (
        <span className="error-message">{error}</span>
      )}
    </div>
  );
};

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label>
          {label}
        </label>
      )}
      <textarea
        className={error ? 'error' : ''}
        {...props}
      />
      {error && (
        <span className="error-message">{error}</span>
      )}
    </div>
  );
};

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  placeholder,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label>
          {label}
        </label>
      )}
      <select className={error ? 'error' : ''} {...props}>
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="error-message">{error}</span>
      )}
    </div>
  );
};