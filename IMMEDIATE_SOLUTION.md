# 即座に使える解決策

## 🚀 最も確実な方法

### 方法1: ターミナルコマンドで属性を削除（推奨）

受け取った人に以下のコマンドを実行してもらってください：

```bash
# DMGファイルの場合
xattr -cr ~/Downloads/Task\ Management\ System-1.0.0-arm64.dmg

# インストール後のアプリの場合
sudo xattr -rd com.apple.quarantine /Applications/Task\ Management\ System.app
```

### 方法2: 配布前に属性を削除

配布する前に、あなたのMacで以下を実行：

```bash
# DMGファイルから検疫属性を削除
xattr -cr "/Users/kaichiyoshino/Dev/tms/release/Task Management System-1.0.0-arm64.dmg"

# ZIPファイルから検疫属性を削除  
xattr -cr "/Users/kaichiyoshino/Dev/tms/release/Task Management System-1.0.0-arm64-mac.zip"
```

## 📤 推奨される共有方法

### 1. AirDropを使用（最も簡単）
- AirDropで直接送信すると、検疫属性が付かない場合があります
- 最も手軽で、追加の手順が不要

### 2. USBメモリで直接渡す
- 物理メディアでの転送は検疫属性が付きにくい
- 確実性が高い

### 3. クラウドストレージ経由の場合
以下の手順で共有：

1. ファイルをアップロード前に圧縮：
```bash
# 新しいZIPを作成（検疫属性なし）
cd /Users/kaichiyoshino/Dev/tms/release
zip -r TaskManagementSystem.zip "mac-arm64/Task Management System.app"
```

2. 受け取り側での手順：
```bash
# ダウンロード後、解凍前に実行
xattr -d com.apple.quarantine ~/Downloads/TaskManagementSystem.zip
```

## 🛠 より技術的な解決策

### アプリに自己署名を追加

```bash
# 自己署名証明書でアプリに署名
codesign --force --deep --sign - "/Users/kaichiyoshino/Dev/tms/release/mac-arm64/Task Management System.app"
```

その後、新しいDMGを作成：

```bash
# 既存のDMGを削除
rm "/Users/kaichiyoshino/Dev/tms/release/Task Management System-1.0.0-arm64.dmg"

# 新しいDMGを作成
hdiutil create -volname "Task Management System" -srcfolder "/Users/kaichiyoshino/Dev/tms/release/mac-arm64/Task Management System.app" -ov -format UDZO "/Users/kaichiyoshino/Dev/tms/release/TaskManagementSystem.dmg"
```

## ✅ 最も簡単な手順まとめ

1. **配布側（あなた）**：
   ```bash
   xattr -cr "/Users/kaichiyoshino/Dev/tms/release/Task Management System-1.0.0-arm64.dmg"
   ```

2. **AirDropまたはUSBで共有**

3. **受け取り側**：
   - 通常通りインストール
   - もし警告が出たら：
     ```bash
     sudo xattr -rd com.apple.quarantine /Applications/Task\ Management\ System.app
     ```

この方法なら確実に動作します。