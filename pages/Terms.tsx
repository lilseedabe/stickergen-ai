import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">利用規約</h1>
        
        <div className="prose max-w-none text-slate-700 space-y-6">
          <p className="text-sm text-slate-500">最終更新日：2025年11月30日</p>
          
          <p>
            本利用規約（以下「本規約」）は、LiLseed合同会社（以下「当社」）が提供するAI画像生成サービス「L-StickerGen」（以下「本サービス」）の利用条件を定めるものです。
          </p>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第1条（適用）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>本規約は、本サービスの利用に関わる一切の関係に適用されます。</li>
              <li>当社は本サービスに関し、本規約のほか、利用ルール等を定める場合があります。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第2条（アカウント）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>本サービスの利用にはアカウント登録が必要です。</li>
              <li>登録情報に虚偽があった場合、当社はアカウントの停止・削除等を行うことがあります。</li>
              <li>アカウント情報の管理はユーザー自身の責任で行うものとします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第3条（クレジット）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>本サービスでは、画像生成等の機能を利用する際に「クレジット」を消費します。</li>
              <li>クレジットは「クレジットパック」として販売され、価格は本サービス内に表示される内容に準じます。</li>
              <li>購入したクレジットの有効期限はありません。</li>
              <li>クレジットの付与は決済完了後即時に行われます。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第4条（クレジットの消費）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>クレジット消費量は、画像生成の種類・解像度により異なり、生成画面に明示します。</li>
              <li>生成成功後のクレジット消費の取り消し・返還はできません。</li>
              <li>システム不具合により生成が正常に行われなかった場合は、当社判断によりクレジット補填等を行う場合があります。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第5条（禁止事項）</h2>
            <p>ユーザーは、以下の行為を行ってはなりません：</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>法令・公序良俗に反する行為</li>
              <li>他者の著作権・商標権・肖像権その他の権利を侵害する行為</li>
              <li>反社会的勢力に関与する行為</li>
              <li>第三者にクレジットまたはアカウントを譲渡・売買する行為</li>
              <li>本サービスの運営を妨害する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第6条（生成される画像について）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>AIによる生成物は、プロンプト設定等により結果が異なります。当社は生成結果の特定の品質・用途適合性を保証しません。</li>
              <li>生成画像の利用はユーザーの責任で行うものとし、第三者の権利侵害について当社は一切責任を負いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第7条（返金等）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>クレジットはデジタル商品であり、購入後の返金・キャンセルは原則できません。</li>
              <li>ただし、当社の重大な過失によりクレジットが適切に付与されなかった場合は、相当分の補填を行います。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第8条（免責事項）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>外部APIの仕様変更や停止、または通信の不具合等により発生した損害について、当社は責任を負いません。</li>
              <li>システムの保守、障害発生等により、本サービスの全部または一部を変更・中断する場合があります。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">第9条（準拠法・裁判管轄）</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>本規約は日本法に準拠します。</li>
              <li>本サービスに関して紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</li>
            </ol>
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

export default Terms;