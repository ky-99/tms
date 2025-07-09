import React from 'react';
import '../styles/dump-page.css';

const DumpPage: React.FC = () => {
  return (
    <div className="dump-page">
      <div className="page-header">
        <h1>データベースダンプ</h1>
        <p>DBファイルのインポート・エクスポート機能</p>
      </div>
      
      <div className="dump-content">
        <div className="dump-section">
          <h2>データベースのインポート</h2>
          <p>既存のDBファイルを読み込んでタスク管理システムに反映します。</p>
          <div className="import-area">
            <button className="btn btn-primary" disabled>
              DBファイルを選択
            </button>
            <p className="help-text">※ 実装予定</p>
          </div>
        </div>
        
        <div className="dump-section">
          <h2>データベースのエクスポート</h2>
          <p>現在のタスクデータをDBファイルとして保存します。</p>
          <div className="export-area">
            <button className="btn btn-secondary" disabled>
              DBファイルをダウンロード
            </button>
            <p className="help-text">※ 実装予定</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DumpPage;