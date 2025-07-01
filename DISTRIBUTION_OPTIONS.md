# 配布オプション

## 現在の状況
修正されたパッケージでは以下の設定により、セキュリティ警告を軽減しています：
- `identity: null` - 署名を明示的に無効化
- `gatekeeperAssess: false` - Gatekeeper評価を無効化

## より安全な配布方法

### 1. Apple Developer Program登録（推奨）
- 年額$99でApple Developer Programに登録
- 正式なDeveloper ID証明書を取得
- 公証（notarization）も可能

### 2. 自己署名証明書の作成
```bash
# 開発用証明書作成
security create-keypair -a rsa -s 2048 -f ~/Desktop/MyKey.key
```

### 3. 代替配布方法
- **GitHub Releases**: ソースコードと一緒に配布
- **ウェブサイト配布**: インストールガイドと一緒に提供
- **直接配布**: USB/メールで直接渡す

### 4. ユーザー向け説明
- アプリの安全性を説明
- インストール手順を明記
- サポート連絡先を提供

## セキュリティ警告の軽減
1. 信頼できるソースからの配布であることを明記
2. アプリの機能と必要な権限を説明
3. オープンソースの場合はソースコードを公開