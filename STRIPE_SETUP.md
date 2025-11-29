# Stripe決済システム統合ガイド

## 概要

StickerGen AIでは、クレジット購入にStripe Checkoutを使用しています。このドキュメントでは、Stripeの設定方法と実装の詳細を説明します。

## 🔑 Stripeアカウントのセットアップ

### 1. Stripeアカウント作成

1. [Stripe](https://stripe.com)にアクセス
2. アカウントを作成
3. ビジネス情報を入力

### 2. APIキーの取得

**テスト環境:**
1. Stripeダッシュボードにログイン
2. 「開発者」→「APIキー」を開く
3. 以下のキーをコピー:
   - **公開可能キー** (pk_test_xxx)
   - **シークレットキー** (sk_test_xxx)

**本番環境:**
1. 「本番データを表示」をオンにする
2. 本番用のAPIキーをコピー:
   - **公開可能キー** (pk_live_xxx)
   - **シークレットキー** (sk_live_xxx)

⚠️ **重要**: シークレットキーは絶対に公開しないでください！

## 🔧 ローカル環境のセットアップ

### 1. 環境変数の設定

#### バックエンド (`server/.env`)

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Frontend URL (for redirect)
FRONTEND_URL=http://localhost:3000
```

#### フロントエンド (`.env.local`)

```bash
# Stripe Publishable Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Backend API
VITE_API_URL=http://localhost:5000/api
```

### 2. 依存関係のインストール

```bash
# バックエンド
cd server
npm install stripe

# フロントエンド
cd ..
npm install @stripe/stripe-js
```

## 🪝 Webhookのセットアップ

Webhookは決済完了などのイベントをサーバーに通知するために必要です。

### ローカル開発環境

1. **Stripe CLIのインストール**

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
# https://stripe.com/docs/stripe-cli からダウンロード
```

2. **Stripe CLIでログイン**

```bash
stripe login
```

3. **Webhookイベントの転送**

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

実行すると、Webhook署名シークレット (`whsec_xxx`) が表示されます。
これを `server/.env` の `STRIPE_WEBHOOK_SECRET` に設定してください。

4. **イベントのテスト**

別のターミナルで:

```bash
stripe trigger checkout.session.completed
```

### 本番環境

1. Stripeダッシュボードで「開発者」→「Webhook」を開く
2. 「エンドポイントを追加」をクリック
3. エンドポイントURL: `https://yourdomain.com/api/stripe/webhook`
4. リッスンするイベントを選択:
   - `checkout.session.completed` (必須)
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. 署名シークレットをコピーして `STRIPE_WEBHOOK_SECRET` に設定

## 💳 決済フロー

### 1. ユーザーがパッケージを選択

```
ユーザー → [パッケージ選択] → [購入ボタンクリック]
```

### 2. Checkoutセッション作成

```typescript
// Frontend: components/PurchasePage.tsx
const { url } = await apiService.createStripeCheckout(packageId);
window.location.href = url; // Stripeにリダイレクト
```

```javascript
// Backend: server/routes/stripe.js
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const session = await createCheckoutSession(pkg, userId, successUrl, cancelUrl);
  res.json({ sessionId: session.id, url: session.url });
});
```

### 3. Stripe Checkoutページ

- ユーザーがカード情報を入力
- Stripeが決済を処理
- 成功 → success_url にリダイレクト
- キャンセル → cancel_url にリダイレクト

### 4. Webhookで決済完了を処理

```javascript
// Backend: server/routes/stripe.js
async function handleCheckoutSessionCompleted(session) {
  // 1. ユーザーにクレジットを追加
  await db.query('UPDATE users SET credits = credits + $1 WHERE id = $2',
    [credits, userId]);

  // 2. 購入履歴を記録
  await db.query('INSERT INTO purchases (...) VALUES (...)');
}
```

### 5. 成功ページでクレジット残高を更新

```typescript
// Frontend: components/PurchasePage.tsx
const checkSuccess = () => {
  const success = urlParams.get('success');
  if (success === 'true') {
    setSuccessMessage('購入が完了しました！');
    fetchCredits(); // クレジット残高を再取得
  }
};
```

## 🧪 テスト

### テストカード番号

**成功する決済:**
- カード番号: `4242 4242 4242 4242`
- 有効期限: 未来の任意の日付
- CVC: 任意の3桁
- 郵便番号: 任意

**失敗する決済:**
- カード番号: `4000 0000 0000 0002`
- エラー: カードが拒否されました

**3Dセキュア認証が必要:**
- カード番号: `4000 0025 0000 3155`

その他のテストカードは[Stripe公式ドキュメント](https://stripe.com/docs/testing)を参照。

### テスト手順

1. アプリを起動 (`npm run dev`)
2. サーバーを起動 (`cd server && npm start`)
3. Stripe CLIでWebhookを転送 (`stripe listen --forward-to ...`)
4. ブラウザで購入ページにアクセス
5. パッケージを選択して購入
6. テストカード情報を入力
7. 決済完了後、クレジットが追加されることを確認

## 📊 Stripeダッシュボード

### 決済履歴の確認

1. Stripeダッシュボードで「支払い」を開く
2. 全ての決済が一覧表示されます
3. 各決済をクリックして詳細を確認

### 顧客管理

1. 「顧客」タブで顧客情報を確認
2. 決済履歴や返金履歴を表示

### 売上レポート

1. 「レポート」タブで売上分析
2. 日次/週次/月次の売上を確認

## 🔒 セキュリティベストプラクティス

### 1. APIキーの管理

- ✅ `.env` ファイルを `.gitignore` に追加
- ✅ 本番キーとテストキーを分ける
- ✅ 定期的にキーをローテーション
- ❌ コードにハードコードしない
- ❌ フロントエンドにシークレットキーを含めない

### 2. Webhook署名検証

```javascript
// 必ずWebhook署名を検証する
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 3. トランザクションの整合性

```javascript
// データベーストランザクションを使用
await db.query('BEGIN');
try {
  // クレジット追加
  // 購入履歴記録
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
}
```

## 💰 料金設定

### Stripe手数料

- **国内カード**: 3.6%
- **海外カード**: 3.6% + 為替手数料

### 例

ユーザーが¥900のパッケージを購入した場合:
- 売上: ¥900
- Stripe手数料: ¥900 × 3.6% = ¥32.4
- 実際の収益: ¥900 - ¥32.4 = ¥867.6

## 🚨 トラブルシューティング

### Webhookが動作しない

**問題**: 決済完了後、クレジットが追加されない

**解決策**:
1. Stripe CLIが実行中か確認
2. Webhook署名シークレットが正しいか確認
3. サーバーログでエラーを確認: `pm2 logs stickergen-api`
4. Stripeダッシュボードで「Webhook」→「イベント」を確認

### 決済が失敗する

**問題**: テストカードでも決済が失敗する

**解決策**:
1. テストモード (pk_test_xxx) を使用しているか確認
2. カード情報が正しいか確認
3. Stripeダッシュボードの「支払い」でエラー詳細を確認

### リダイレクトURLが正しくない

**問題**: 決済後に404エラーが表示される

**解決策**:
1. `server/.env` の `FRONTEND_URL` が正しいか確認
2. 本番環境では実際のドメインを設定
   ```
   FRONTEND_URL=https://yourdomain.com
   ```

## 📚 参考リンク

- [Stripe公式ドキュメント](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Webhook](https://stripe.com/docs/webhooks)
- [Testing](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

## 🎯 本番環境チェックリスト

- [ ] 本番APIキーを取得
- [ ] 本番Webhookエンドポイントを設定
- [ ] SSL証明書をインストール (HTTPS必須)
- [ ] `.env` に本番キーを設定
- [ ] Stripe CLIではなくWebhookエンドポイントを使用
- [ ] 決済テストを実行
- [ ] 返金フローをテスト
- [ ] エラーログ監視を設定
- [ ] Stripeダッシュボードでアラートを設定

---

**実装完了日**: 2025-11-28
**Stripeバージョン**: v14.10.0
**ステータス**: ✅ Ready for Production
