# StickerGen AI - VPSデプロイガイド

## 概要

このプロジェクトは、フロントエンド(React + Vite)とバックエンド(Node.js + Express + PostgreSQL)で構成されています。

## 必要な環境

- Node.js 18以上
- PostgreSQL 14以上
- nginx (リバースプロキシ用)
- PM2 (プロセス管理用)

## 1. データベースセットアップ

### PostgreSQLのインストール(Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### データベースとユーザーの作成

```bash
# PostgreSQLにログイン
sudo -u postgres psql

# データベース作成
CREATE DATABASE stickergen;

# ユーザー作成とパスワード設定
CREATE USER stickergen_user WITH ENCRYPTED PASSWORD 'your_secure_password';

# 権限付与
GRANT ALL PRIVILEGES ON DATABASE stickergen TO stickergen_user;

# 終了
\q
```

### スキーマのセットアップ

```bash
# スキーマファイルを実行
psql -U stickergen_user -d stickergen -f server/schema.sql
```

## 2. バックエンドのセットアップ

### 環境変数の設定

```bash
cd server
cp .env.example .env
nano .env
```

`.env`ファイルを編集:

```env
DATABASE_URL=postgresql://stickergen_user:your_secure_password@localhost:5432/stickergen
JWT_SECRET=your-very-long-and-secure-random-string-here
PORT=5000
NODE_ENV=production
GEMINI_API_KEY=your-gemini-api-key
```

### 依存関係のインストールと起動

```bash
# 依存関係インストール
npm install

# PM2でプロセス管理
sudo npm install -g pm2

# アプリ起動
pm2 start index.js --name stickergen-api

# 自動起動設定
pm2 startup
pm2 save
```

## 3. フロントエンドのセットアップ

### 環境変数の設定

```bash
cd ../ # プロジェクトルートに戻る
cp .env.local.example .env.local
nano .env.local
```

`.env.local`ファイルを編集:

```env
GEMINI_API_KEY=your-gemini-api-key
VITE_API_URL=https://yourdomain.com/api
```

### ビルド

```bash
npm install
npm run build
```

ビルドされたファイルは`dist`ディレクトリに生成されます。

## 4. Nginxの設定

### Nginxのインストール

```bash
sudo apt install nginx
```

### サイト設定ファイルの作成

```bash
sudo nano /etc/nginx/sites-available/stickergen
```

以下の内容を記述:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # フロントエンド
    location / {
        root /var/www/stickergen/dist;
        try_files $uri $uri/ /index.html;
    }

    # バックエンドAPI
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### サイトの有効化

```bash
# シンボリックリンク作成
sudo ln -s /etc/nginx/sites-available/stickergen /etc/nginx/sites-enabled/

# Nginx設定テスト
sudo nginx -t

# Nginx再起動
sudo systemctl restart nginx
```

## 5. SSL証明書の設定(Let's Encrypt)

```bash
# Certbotのインストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書取得と自動設定
sudo certbot --nginx -d yourdomain.com

# 自動更新テスト
sudo certbot renew --dry-run
```

## 6. ファイアウォール設定

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## 7. アプリケーションのデプロイ

```bash
# プロジェクトディレクトリに配置
sudo mkdir -p /var/www/stickergen
sudo chown -R $USER:$USER /var/www/stickergen

# ファイルのコピー
cp -r dist/* /var/www/stickergen/dist/
```

## 8. 動作確認

1. ブラウザで`https://yourdomain.com`にアクセス
2. 新規登録機能をテスト
3. クレジット購入ページにアクセス
4. スタンプ生成機能をテスト

## 9. モニタリング

### PM2のモニタリング

```bash
# プロセス一覧
pm2 list

# ログ確認
pm2 logs stickergen-api

# CPU/メモリ使用状況
pm2 monit
```

### Nginxのログ

```bash
# アクセスログ
sudo tail -f /var/log/nginx/access.log

# エラーログ
sudo tail -f /var/log/nginx/error.log
```

### PostgreSQLのログ

```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

## 10. バックアップ

### データベースバックアップ

```bash
# バックアップスクリプト作成
nano ~/backup_db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/$(whoami)/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U stickergen_user stickergen > "$BACKUP_DIR/stickergen_$DATE.sql"
# 7日以上前のバックアップを削除
find $BACKUP_DIR -name "stickergen_*.sql" -mtime +7 -delete
```

```bash
# 実行権限付与
chmod +x ~/backup_db.sh

# Cronで毎日実行
crontab -e
# 以下を追加: 毎日午前3時にバックアップ
0 3 * * * /home/$(whoami)/backup_db.sh
```

## 11. セキュリティ対策

### PostgreSQL接続制限

```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

localhostからのみ接続を許可:
```
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
```

### ファイアウォール設定

```bash
# PostgreSQLポートを外部から閉じる
sudo ufw deny 5432
```

### 定期的なアップデート

```bash
# システムアップデート
sudo apt update && sudo apt upgrade -y

# Node.jsパッケージアップデート
cd /path/to/server && npm audit fix
```

## 12. パフォーマンス最適化

### PostgreSQLチューニング

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

推奨設定(8GB RAM想定):
```
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
```

再起動:
```bash
sudo systemctl restart postgresql
```

### Nginx圧縮設定

```bash
sudo nano /etc/nginx/nginx.conf
```

以下を追加:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

## トラブルシューティング

### APIが500エラーを返す

```bash
# バックエンドログ確認
pm2 logs stickergen-api

# データベース接続確認
psql -U stickergen_user -d stickergen -c "SELECT 1;"
```

### フロントエンドが表示されない

```bash
# Nginxエラーログ確認
sudo tail -f /var/log/nginx/error.log

# ファイル権限確認
ls -la /var/www/stickergen/dist/
```

### クレジット購入が動作しない

本番環境では実際の決済システム(Stripe等)との連携が必要です。
`server/routes/packages.js`の`/purchase`エンドポイントを修正してください。

## まとめ

これでStickerGen AIのVPSデプロイが完了しました。

**重要な次のステップ:**
1. 実際の決済システム(Stripe/PayPal)の統合
2. メール通知機能の追加(購入確認等)
3. 利用規約・プライバシーポリシーページの追加
4. エラートラッキング(Sentry等)の導入
5. アナリティクス(Google Analytics等)の導入
