import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Task } from '../../types';

interface TaskTreeOverviewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

interface TaskNode {
  task: Task;
  x: number;
  y: number;
  children: TaskNode[];
}

interface Connection {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

const TaskTreeOverview: React.FC<TaskTreeOverviewProps> = React.memo(({ tasks, onTaskClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  
  // パンとズームの状態
  const [viewState, setViewState] = useState({
    x: 0,
    y: 0,
    scale: 1,
    isDragging: false,
    dragStart: { x: 0, y: 0 }
  });

  // タスクノードの位置を計算
  const taskNodes = useMemo(() => {
    // まず、全てのタスクを平坦化
    const allTasks: Task[] = [];
    const flattenTasks = (tasks: Task[]) => {
      tasks.forEach(task => {
        allTasks.push(task);
        if (task.children) {
          flattenTasks(task.children);
        }
      });
    };
    flattenTasks(tasks);
    
    // parentIdがnullまたは未定義のタスクをルートタスクとする
    const rootTasks = allTasks.filter(task => !task.parentId);
    
    // 各タスクの子タスクを構築
    const getChildren = (parentId: number): Task[] => {
      return allTasks.filter(task => task.parentId === parentId);
    };
    
    const nodes: TaskNode[] = [];
    
    const createNode = (task: Task, x: number, y: number, level: number): TaskNode => {
      const children = getChildren(task.id);
      
      const node: TaskNode = {
        task,
        x,
        y,
        children: []
      };
      
      if (children.length > 0) {
        // 子ノードを扇状に配置
        const childSpacing = Math.max(80, 120 - level * 15);
        const startY = y - (children.length - 1) * childSpacing / 2;
        
        children.forEach((child, index) => {
          const childX = x + 250; // 固定間隔で配置
          const childY = startY + index * childSpacing + Math.random() * 30 - 15;
          const childNode = createNode(child, childX, childY, level + 1);
          node.children.push(childNode);
        });
      }
      
      nodes.push(node);
      return node;
    };

    const rootSpacing = 100;
    const rootNodes = rootTasks.map((task, index) => 
      createNode(task, 50, 50 + index * rootSpacing, 0)
    );
    
    return rootNodes;
  }, [tasks]);


  // 接続線を計算
  const calculateConnections = useMemo(() => {
    const connections: Connection[] = [];
    
    const addConnections = (node: TaskNode) => {
      node.children.forEach(child => {
        // カードの実際のサイズに基づいて接続点を計算
        // タスクカードは楕円形で、max-width: 180px, padding: 4px 12px, height: 24px
        const cardHeight = 24;
        const cardCenterY = cardHeight / 2;
        
        connections.push({
          from: { x: node.x + 180, y: node.y + cardCenterY }, // カードの右端中央から
          to: { x: child.x, y: child.y + cardCenterY }        // 子カードの左端中央へ
        });
        addConnections(child);
      });
    };
    
    taskNodes.forEach(addConnections);
    
    
    return connections;
  }, [taskNodes]);

  // SVGパスを生成（ベジェ曲線）
  const createPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const controlPointOffset = Math.min(dx * 0.5, 100);
    
    return `M ${from.x} ${from.y} C ${from.x + controlPointOffset} ${from.y}, ${to.x - controlPointOffset} ${to.y}, ${to.x} ${to.y}`;
  };

  // 全ノードを平坦化
  const allNodes = useMemo(() => {
    const result: TaskNode[] = [];
    const collectNodes = (node: TaskNode) => {
      result.push(node);
      node.children.forEach(collectNodes);
    };
    taskNodes.forEach(collectNodes);
    return result;
  }, [taskNodes]);

  // SVGのサイズと境界を計算
  const svgDimensions = useMemo(() => {
    if (allNodes.length === 0) return { width: 800, height: 600, minX: 0, minY: 0 };
    
    // 全ての要素（ノードと接続線）の境界を計算
    let minX = Math.min(...allNodes.map(node => node.x));
    let maxX = Math.max(...allNodes.map(node => node.x + 180));
    let minY = Math.min(...allNodes.map(node => node.y));
    let maxY = Math.max(...allNodes.map(node => node.y + 24));
    
    // 接続線も考慮
    calculateConnections.forEach(connection => {
      minX = Math.min(minX, connection.from.x, connection.to.x);
      maxX = Math.max(maxX, connection.from.x, connection.to.x);
      minY = Math.min(minY, connection.from.y, connection.to.y);
      maxY = Math.max(maxY, connection.from.y, connection.to.y);
    });
    
    // パディングを追加
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    return {
      width: maxX - minX,
      height: maxY - minY,
      minX,
      minY
    };
  }, [allNodes, calculateConnections]);

  // マウスイベントハンドラー
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // 左クリックのみ
      setViewState(prev => ({
        ...prev,
        isDragging: true,
        dragStart: { x: e.clientX - prev.x, y: e.clientY - prev.y }
      }));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (viewState.isDragging) {
      setViewState(prev => ({
        ...prev,
        x: e.clientX - prev.dragStart.x,
        y: e.clientY - prev.dragStart.y
      }));
    }
  };

  const handleMouseUp = () => {
    setViewState(prev => ({
      ...prev,
      isDragging: false
    }));
  };

  // キーボードズーム（Cmd +/-）
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setViewState(prev => ({
          ...prev,
          scale: Math.min(3, prev.scale * 1.1)
        }));
      } else if (e.key === '-') {
        e.preventDefault();
        setViewState(prev => ({
          ...prev,
          scale: Math.max(0.1, prev.scale * 0.9)
        }));
      }
    }
  };
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 全体表示にリセット
  const handleResetView = () => {
    setViewState({
      x: 0,
      y: 0,
      scale: 1,
      isDragging: false,
      dragStart: { x: 0, y: 0 }
    });
  };

  // 全体を表示する
  const handleFitView = () => {
    if (allNodes.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    const padding = 50;
    
    const minX = Math.min(...allNodes.map(node => node.x)) - padding;
    const maxX = Math.max(...allNodes.map(node => node.x + 180)) + padding;
    const minY = Math.min(...allNodes.map(node => node.y)) - padding;
    const maxY = Math.max(...allNodes.map(node => node.y + 24)) + padding;
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const scaleX = canvasRect.width / contentWidth;
    const scaleY = canvasRect.height / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    
    const centerX = (canvasRect.width - contentWidth * scale) / 2;
    const centerY = (canvasRect.height - contentHeight * scale) / 2;
    
    setViewState({
      x: centerX - minX * scale,
      y: centerY - minY * scale,
      scale: scale,
      isDragging: false,
      dragStart: { x: 0, y: 0 }
    });
  };

  return (
    <div className="task-tree-overview">
      <div className="tree-header">
        <h3 className="tree-title">タスク概要</h3>
        <div className="tree-controls">
          <button 
            className="tree-control-button"
            onClick={handleFitView}
            title="全体表示"
          >
            全体表示
          </button>
          <button 
            className="tree-control-button"
            onClick={handleResetView}
            title="リセット"
          >
            リセット
          </button>
          <span className="tree-zoom-info">
            {Math.round(viewState.scale * 100)}%
          </span>
        </div>
      </div>

      <div 
        ref={canvasRef}
        className="tree-canvas" 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '400px', 
          overflow: 'hidden',
          cursor: viewState.isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {allNodes.length > 0 ? (
          <div 
            style={{
              position: 'absolute',
              transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`,
              transformOrigin: '0 0',
              transition: viewState.isDragging ? 'none' : 'transform 0.1s ease'
            }}
          >
            {/* SVG接続線 */}
            <svg
              ref={svgRef}
              width={svgDimensions.width}
              height={svgDimensions.height}
              viewBox={`${svgDimensions.minX} ${svgDimensions.minY} ${svgDimensions.width} ${svgDimensions.height}`}
              style={{ 
                position: 'absolute', 
                top: svgDimensions.minY, 
                left: svgDimensions.minX, 
                zIndex: 1 
              }}
            >
              {calculateConnections.map((connection, index) => (
                <path
                  key={index}
                  d={createPath(connection.from, connection.to)}
                  stroke="#000000"
                  strokeWidth="1"
                  fill="none"
                />
              ))}
            </svg>

            {/* タスクカード */}
            {allNodes.map(node => (
              <div
                key={node.task.id}
                className={`tree-task-card ${node.task.status}`}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  zIndex: 2
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskClick?.(node.task);
                }}
              >
                <span className="tree-task-title">
                  {node.task.title}
                </span>
                {node.task.endDate && (
                  <span className="tree-due-date">
                    {new Date(node.task.endDate).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="tree-empty">
            タスクが登録されていません
          </div>
        )}
      </div>
    </div>
  );
});

export default TaskTreeOverview;