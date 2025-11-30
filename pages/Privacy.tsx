import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">プライバシーポリシー</h1>
        
        <div className="prose max-w-none text-slate-700 space-y-6">
          <p className="text-sm text-slate-500">最終更新日：2025年11月30日</p>
          
          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第1条（個人情報の収集）</h2>
            <p>当社は、以下の目的で個人情報を収集します：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>サービスの提供・運営</li>
              <li>ユーザーサポート</li>
              <li>決済処理（Stripe経由）</li>
              <li>サービス改善のための分析</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第2条（収集する情報）</h2>
            <p>当社が収集する個人情報は以下の通りです：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>メールアドレス</li>
              <li>決済情報（クレジットカード情報はStripeが管理し、当社は保持しません）</li>
              <li>利用履歴・ログ情報</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第3条（第三者提供）</h2>
            <p>当社は、以下の場合を除き、個人情報を第三者に提供しません：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>サービス提供に必要な業務委託先（Stripe、外部API提供者等）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第4条（セキュリティ）</h2>
            <p>当社は、個人情報の漏洩・滅失・毀損を防止するため、適切なセキュリティ対策を実施します。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第5条（お問い合わせ）</h2>
            <p>個人情報の取扱いに関するお問い合わせは、以下までご連絡ください：</p>
            <p className="font-semibold">osusume-co@lilseed.jp</p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <button 
            onClick={() => window.location.href = '/'}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← トップに戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default Privacy;