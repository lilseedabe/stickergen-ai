import React from 'react';

const Commerce: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">特定商取引法に基づく表記</h1>
        
        <div className="prose max-w-none text-slate-700 space-y-6">
          
          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">販売業者（事業者名）</h2>
            <p>LiLseed合同会社</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">運営責任者</h2>
            <p>阿部 泰宗</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">所在地</h2>
            <p>福島県福島市山口字町東61</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">電話番号</h2>
            <p>080-5891-5161</p>
            <p className="text-sm text-slate-500">（受付時間：平日 9:00〜18:00）</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">メールアドレス</h2>
            <p>osusume-co@lilseed.jp</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">販売価格</h2>
            <p>本サービス内に表示されるクレジットパックの販売価格に準じます。</p>
            <div className="bg-slate-50 p-4 rounded-lg mt-2">
              <p className="font-semibold mb-2">クレジットパック：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>50 cr パック：¥480（10回生成＝120個相当）</li>
                <li>100 cr パック：¥900（20回生成＝240個相当）</li>
                <li>300 cr パック：¥2,400（60回生成＝720個相当）</li>
                <li>500 cr パック：¥3,750（100回生成＝1,200個相当）</li>
                <li>1000 cr パック：¥7,000（200回生成＝2,400個相当）</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">商品代金以外の必要料金</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>インターネット接続費用</li>
              <li>決済手数料（決済手段により異なる場合があります）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">支払方法</h2>
            <p>クレジットカード決済（Stripe経由）</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">支払時期</h2>
            <p>購入手続き完了時（チェックアウト時）に決済が行われます。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">商品の引渡し時期</h2>
            <p>決済完了後、クレジットは即時にユーザーアカウントへ付与されます。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">返品・返金について</h2>
            <p>デジタル商品の特性上、購入後の返品・返金は原則できません。</p>
            <p className="mt-2">ただし、以下の場合に限り返金対応いたします：</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>システムエラーによりクレジットが付与されなかった場合</li>
              <li>二重決済が発生した場合</li>
              <li>当社の重大な過失によりサービスが利用できなかった場合</li>
            </ul>
            <p className="mt-2">
              返金対応希望の場合は、osusume-co@lilseed.jp までご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">動作環境</h2>
            <p>Webブラウザで利用可能です。推奨ブラウザ：Google Chrome、Safari、Edge（最新版）</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">販売数量の制限</h2>
            <p>特になし</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-6 mb-3">特別な販売条件</h2>
            <p>外部API（Nanobanana Pro等）の提供状況によりサービス内容が変更される場合があります。</p>
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

export default Commerce;