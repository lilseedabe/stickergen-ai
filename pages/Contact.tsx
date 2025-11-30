import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const Contact: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">お問い合わせ</h1>
        
        <div className="prose max-w-none text-slate-700 space-y-6">
          <p>
            L-StickerGenに関するご質問・お問い合わせは、以下の方法でご連絡ください。
          </p>

          <section className="bg-slate-50 p-6 rounded-lg space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">メールアドレス</h3>
                <a 
                  href="mailto:osusume-co@lilseed.jp" 
                  className="text-green-600 hover:text-green-700 underline"
                >
                  osusume-co@lilseed.jp
                </a>
                <p className="text-sm text-slate-500 mt-1">
                  ※お問い合わせはメールでのご連絡を推奨しております
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">電話番号</h3>
                <p>080-5891-5161</p>
                <p className="text-sm text-slate-500">受付時間：平日 9:00〜18:00</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">所在地</h3>
                <p>LiLseed合同会社</p>
                <p>福島県福島市山口字町東61</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-4">よくあるお問い合わせ</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold mb-2">クレジットが付与されない</h3>
                <p className="text-sm text-slate-600">
                  決済完了後もクレジットが反映されない場合は、一度ログアウト→ログインをお試しください。
                  それでも解決しない場合は、決済完了メールを添えてご連絡ください。
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold mb-2">生成が失敗する</h3>
                <p className="text-sm text-slate-600">
                  一時的なサーバーエラーの可能性があります。時間をおいて再度お試しください。
                  繰り返し失敗する場合は、エラーメッセージのスクリーンショットと共にご連絡ください。
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold mb-2">返金について</h3>
                <p className="text-sm text-slate-600">
                  返金対応については「特定商取引法に基づく表記」をご確認ください。
                  システムエラー等の場合のみ対応いたします。
                </p>
              </div>
            </div>
          </section>

          <section className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6">
            <p className="text-sm text-slate-700">
              <strong>営業時間外のお問い合わせについて：</strong><br />
              メールでのお問い合わせは24時間受け付けておりますが、
              回答は営業時間内（平日9:00〜18:00）とさせていただきます。
            </p>
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

export default Contact;