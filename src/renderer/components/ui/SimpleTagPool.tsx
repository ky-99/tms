import React from 'react';
import ReactDOM from 'react-dom';

interface SimpleTagPoolProps {
  isOpen: boolean;
  onClose: () => void;
}

const SimpleTagPool: React.FC<SimpleTagPoolProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    console.log('SimpleTagPool: not open');
    return null;
  }

  console.log('SimpleTagPool: rendering');

  const content = (
    <div
      style={{
        position: 'fixed',
        top: '50px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '320px',
        height: '200px',
        background: '#ff0000',
        border: '2px solid #000000',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        zIndex: 99999,
        padding: '16px',
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: 'bold'
      }}
      onClick={e => e.stopPropagation()}
    >
      <div>Simple Tag Pool Test</div>
      <div>Width: 320px</div>
      <div>Height: 200px</div>
      <div>Background: Red</div>
      <button
        onClick={onClose}
        style={{
          background: '#ffffff',
          color: '#000000',
          border: '1px solid #000000',
          padding: '4px 8px',
          marginTop: '8px',
          cursor: 'pointer'
        }}
      >
        Close
      </button>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default SimpleTagPool;