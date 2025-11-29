import React, { useState, useEffect } from 'react';
import { Package, CreditCard, Check, ArrowLeft, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { apiService, CreditPackage } from '../services/apiService';

const PurchasePage: React.FC = () => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentCredits, setCurrentCredits] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchPackages();
    fetchCredits();
    checkSuccess();
  }, []);

  const checkSuccess = () => {
    // Check if we're returning from a successful Stripe checkout
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');

    if (success === 'true' && sessionId) {
      handleCheckoutSuccess(sessionId);
    } else if (urlParams.get('canceled') === 'true') {
      setError('決済がキャンセルされました。');
    }
  };

  const handleCheckoutSuccess = async (sessionId: string) => {
    try {
      await apiService.getCheckoutSession(sessionId);
      setSuccessMessage('購入が完了しました！クレジットが追加されました。');
      // Refresh credit balance
      fetchCredits();
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err) {
      console.error('Failed to verify checkout:', err);
    }
  };

  const fetchPackages = async () => {
    try {
      const data = await apiService.getPackages();
      setPackages(data.packages);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    }
  };

  const fetchCredits = async () => {
    if (apiService.isAuthenticated()) {
      try {
        const data = await apiService.getCreditBalance();
        setCurrentCredits(data.credits);
      } catch (err) {
        console.error('Failed to fetch credits:', err);
      }
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    if (!apiService.isAuthenticated()) {
      setError('ログインが必要です');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create Stripe Checkout Session
      const { url } = await apiService.createStripeCheckout(selectedPackage.id);

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || '決済ページの作成に失敗しました');
      setIsLoading(false);
    }
  };

  const getGenerationCount = (credits: number) => {
    return Math.floor(credits / 5); // 1K generation
  };

  const getStampCount = (credits: number) => {
    return getGenerationCount(credits) * 12;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>戻る</span>
          </button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-800 mb-3 flex items-center justify-center gap-3">
              <Package className="w-10 h-10 text-green-600" />
              クレジット購入
            </h1>
            <p className="text-slate-600 text-lg">
              業界最安値クラス！1回50円で12個のスタンプを生成
            </p>
            {apiService.isAuthenticated() && (
              <div className="mt-4 inline-block bg-white px-6 py-3 rounded-full shadow-md border border-green-200">
                <span className="text-sm text-slate-600">現在の残高: </span>
                <span className="text-2xl font-bold text-green-600">{currentCredits} cr</span>
              </div>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border-2 border-green-500 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-800">{successMessage}</p>
              <p className="text-sm text-green-700">新しい残高: {currentCredits} cr</p>
            </div>
          </div>
        )}

        {/* Value Proposition */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-bold text-slate-800">驚異的なコスパ</h3>
            </div>
            <p className="text-sm text-slate-600">
              1K: <strong>1スタンプ約4円</strong>、4K: <strong>約7.5円</strong>
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-800">一括生成</h3>
            </div>
            <p className="text-sm text-slate-600">
              1回の生成で<strong>12種類</strong>のスタンプを作成
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-800">高品質AI</h3>
            </div>
            <p className="text-sm text-slate-600">
              Gemini 3 Pro使用、<strong>最大4K</strong>まで対応
            </p>
          </div>
        </div>

        {/* Package Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`
                relative bg-white rounded-2xl shadow-lg border-2 transition-all cursor-pointer
                ${selectedPackage?.id === pkg.id
                  ? 'border-green-500 ring-4 ring-green-100 transform scale-105'
                  : 'border-slate-200 hover:border-green-300 hover:shadow-xl'
                }
              `}
              onClick={() => setSelectedPackage(pkg)}
            >
              {/* Discount Badge */}
              {pkg.discount_percentage > 0 && (
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  {pkg.discount_percentage}% OFF
                </div>
              )}

              <div className="p-6">
                {/* Package Name */}
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{pkg.name}</h3>

                {/* Credits */}
                <div className="mb-4">
                  <div className="text-4xl font-bold text-green-600 mb-1">
                    {pkg.credits}
                    <span className="text-lg text-slate-500 ml-2">cr</span>
                  </div>
                  <div className="text-slate-600 text-sm">{pkg.description}</div>
                </div>

                {/* Price */}
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm text-slate-600">価格:</span>
                    <div>
                      <span className="text-3xl font-bold text-slate-800">
                        ¥{pkg.price_jpy.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline text-xs text-slate-500">
                    <span>単価:</span>
                    <span>¥{pkg.unit_price}/cr</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">生成可能回数 (1K):</span>
                    <span className="font-bold text-slate-800">
                      {getGenerationCount(pkg.credits)}回
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">作成可能スタンプ数:</span>
                    <span className="font-bold text-green-600">
                      {getStampCount(pkg.credits)}個
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">LINEスタンプ (24個):</span>
                    <span className="font-bold text-indigo-600">
                      {Math.floor(getStampCount(pkg.credits) / 24)}セット
                    </span>
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedPackage?.id === pkg.id && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-600 font-bold">
                    <Check className="w-5 h-5" />
                    <span>選択中</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Purchase Button */}
        {selectedPackage && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-6 shadow-2xl">
            <div className="max-w-4xl mx-auto">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mb-4">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-6">
                <div>
                  <div className="text-sm text-slate-600 mb-1">選択中のパッケージ:</div>
                  <div className="text-2xl font-bold text-slate-800">
                    {selectedPackage.name} - ¥{selectedPackage.price_jpy.toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={isLoading}
                  className={`
                    px-8 py-4 rounded-xl font-bold text-white shadow-lg flex items-center gap-3
                    ${isLoading
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all'
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Stripeに移動中...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6" />
                      Stripeで購入
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Notes */}
        <div className="mt-16 text-center text-sm text-slate-500">
          <p>※ 本番環境では実際の決済システム(Stripe等)と連携されます</p>
          <p className="mt-1">※ クレジットに有効期限はありません</p>
        </div>
      </div>
    </div>
  );
};

export default PurchasePage;
