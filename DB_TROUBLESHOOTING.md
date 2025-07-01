# データベース問題のトラブルシューティング

## 問題：CRUD操作ができない

### 原因
- schema.sqlファイルが見つからない
- データベース作成時の権限不足
- SQLiteネイティブバイナリの問題

## 解決方法

### 1. アプリケーションのログを確認

アプリケーションを起動してConsole.app（コンソール）で以下のようなログを確認：

```
Database path: /Users/[username]/Library/Application Support/task-management-system/tasks.db
Looking for schema at: [path]
```

### 2. 手動でデータベースディレクトリを作成

ターミナルで以下を実行：

```bash
# ディレクトリを作成
mkdir -p ~/Library/Application\ Support/task-management-system

# 権限を設定
chmod 755 ~/Library/Application\ Support/task-management-system
```

### 3. データベースファイルをリセット

既存のデータベースファイルに問題がある場合：

```bash
# データベースファイルを削除（注意：すべてのデータが失われます）
rm ~/Library/Application\ Support/task-management-system/tasks.db
```

### 4. アプリケーションを再起動

上記の手順を実行後、アプリケーションを再起動してください。

## 改善された機能

最新版では以下の改善を行いました：

1. **詳細なログ出力**
   - データベースパスの表示
   - schema.sqlの検索パスの表示
   - エラー時の詳細メッセージ

2. **複数のパスでschema.sqlを検索**
   - app.asar内
   - Resourcesフォルダ内
   - 代替パス

3. **エラーダイアログ**
   - DB初期化失敗時にエラーダイアログを表示

4. **ディレクトリの自動作成**
   - データベースディレクトリが存在しない場合は自動作成

## それでも解決しない場合

以下の情報を開発者に提供してください：

1. Console.appのログ（特に"Database"や"schema"を含む行）
2. macOSのバージョン
3. エラーメッセージのスクリーンショット
4. 以下のコマンドの出力：
   ```bash
   ls -la ~/Library/Application\ Support/task-management-system/
   ```