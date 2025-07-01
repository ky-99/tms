import React from 'react';

interface CircularProgressProps {
  title: string;
  completed: number;
  total: number;
  size?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ 
  title, 
  completed, 
  total, 
  size = 320 
}) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="circular-progress">
      <h3 className="circular-progress-title">{title}</h3>
      <div className="circular-progress-container">
        <svg width={size} height={size} className="circular-progress-svg">
          {/* 背景の円 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* 進捗の円 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="circular-progress-bar"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          {/* グラデーション定義 */}
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>
        <div className="circular-progress-content">
          <div className="circular-progress-percentage">
            {Math.round(percentage)}%
          </div>
          <div className="circular-progress-stats">
            {completed}/{total}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircularProgress;