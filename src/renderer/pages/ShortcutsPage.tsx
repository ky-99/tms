import React from 'react';
import '../styles/shortcuts-page.css';

const ShortcutsPage: React.FC = () => {
  return (
    <div className="shortcuts-page">
      <div className="page-header">
        <h1>ショートカット設定</h1>
        <p>キーボードショートカットをカスタマイズできます</p>
      </div>
      
      <div className="shortcuts-content">
        <div className="shortcuts-section">
          <h2>基本操作</h2>
          <div className="shortcut-items">
            <div className="shortcut-item">
              <div className="shortcut-action">新しいタスクを作成</div>
              <div className="shortcut-key">
                <kbd>Ctrl</kbd> + <kbd>N</kbd>
              </div>
              <button className="btn-edit" disabled>編集</button>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-action">タスクを削除</div>
              <div className="shortcut-key">
                <kbd>Delete</kbd>
              </div>
              <button className="btn-edit" disabled>編集</button>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-action">検索</div>
              <div className="shortcut-key">
                <kbd>Ctrl</kbd> + <kbd>F</kbd>
              </div>
              <button className="btn-edit" disabled>編集</button>
            </div>
          </div>
        </div>

        <div className="shortcuts-section">
          <h2>ナビゲーション</h2>
          <div className="shortcut-items">
            <div className="shortcut-item">
              <div className="shortcut-action">ダッシュボードに移動</div>
              <div className="shortcut-key">
                <kbd>Ctrl</kbd> + <kbd>1</kbd>
              </div>
              <button className="btn-edit" disabled>編集</button>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-action">タスク管理に移動</div>
              <div className="shortcut-key">
                <kbd>Ctrl</kbd> + <kbd>2</kbd>
              </div>
              <button className="btn-edit" disabled>編集</button>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-action">分析ページに移動</div>
              <div className="shortcut-key">
                <kbd>Ctrl</kbd> + <kbd>3</kbd>
              </div>
              <button className="btn-edit" disabled>編集</button>
            </div>
          </div>
        </div>

        <div className="shortcuts-section">
          <h2>タスク編集</h2>
          <div className="shortcut-items">
            <div className="shortcut-item">
              <div className="shortcut-action">タスクを完了</div>
              <div className="shortcut-key">
                <kbd>Space</kbd>
              </div>
              <button className="btn-edit" disabled>編集</button>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-action">優先度を変更</div>
              <div className="shortcut-key">
                <kbd>Ctrl</kbd> + <kbd>P</kbd>
              </div>
              <button className="btn-edit" disabled>編集</button>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-action">期限を設定</div>
              <div className="shortcut-key">
                <kbd>Ctrl</kbd> + <kbd>D</kbd>
              </div>
              <button className="btn-edit" disabled>編集</button>
            </div>
          </div>
        </div>

        <div className="shortcuts-actions">
          <button className="btn btn-primary" disabled>
            設定を保存
          </button>
          <button className="btn btn-secondary" disabled>
            デフォルトに戻す
          </button>
          <p className="help-text">※ 実装予定</p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsPage;