import React from 'react';

interface WeeklyData {
  day: string;
  date: number;
  total: number;
  completed: number;
  completionRate: number;
}

interface WeeklyProgressChartProps {
  data: WeeklyData[];
}

const WeeklyProgressChart: React.FC<WeeklyProgressChartProps> = ({ data }) => {
  const maxTasks = Math.max(...data.map(d => d.total), 1); // 最小値1で割り算エラーを防ぐ

  return (
    <div className="weekly-progress-chart">
      <div className="chart-container">
        <div className="chart-bars">
          {data.map((dayData, index) => (
            <div key={index} className="chart-day">
              <div className="chart-bar-container">
                <div className="chart-bar-bg">
                  <div 
                    className="chart-bar-completed"
                    style={{ 
                      height: `${dayData.total > 0 ? (dayData.completed / maxTasks) * 100 : 0}%`
                    }}
                  />
                  <div 
                    className="chart-bar-remaining"
                    style={{ 
                      height: `${dayData.total > 0 ? ((dayData.total - dayData.completed) / maxTasks) * 100 : 0}%`
                    }}
                  />
                </div>
                <div className="chart-percentage">
                  {dayData.total > 0 ? `${dayData.completionRate}%` : '-'}
                </div>
              </div>
              <div className="chart-day-info">
                <div className="chart-day-name">{dayData.day}</div>
                <div className="chart-day-date">{dayData.date}</div>
                <div className="chart-task-count">
                  {dayData.completed}/{dayData.total}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color completed"></div>
            <span>完了</span>
          </div>
          <div className="legend-item">
            <div className="legend-color remaining"></div>
            <span>未完了</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyProgressChart;