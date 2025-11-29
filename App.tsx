import React, { useState, useEffect } from 'react';
import { User, LogOut, Package } from 'lucide-react';
import Workstation from './components/Workstation';
import PurchasePage from './components/PurchasePage';
import Auth from './components/Auth';
import { apiService } from './services/apiService';

type Page = 'workstation' | 'purchase';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('workstation');
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    // Check if user is already logged in
    if (apiService.isAuthenticated()) {
      fetchUserData();
    }

    // Handle routing based on URL path
    const path = window.location.pathname;
    if (path === '/purchase') {
      setCurrentPage('purchase');
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const data = await apiService.getCreditBalance();
      setCredits(data.credits);
      // Set a mock user for display purposes
      setUser({ email: 'user@example.com' });
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const handleCreditUpdate = (newCredits: number) => {
    setCredits(newCredits);
  };

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
    setCredits(userData.credits);
  };

  const handleLogout = () => {
    apiService.clearToken();
    setUser(null);
    setCredits(0);
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    window.history.pushState({}, '', `/${page === 'workstation' ? '' : page}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('workstation')}>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
              L
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              StickerGen <span className="text-green-500">AI</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
              Gemini 3.0 Pro 搭載
            </span>

            {user ? (
              <>
                <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                  <span className="text-sm font-bold text-green-600">{credits} cr</span>
                </div>

                <button
                  onClick={() => navigateTo('purchase')}
                  className="flex items-center gap-2 text-sm bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium"
                >
                  <Package className="w-4 h-4" />
                  購入
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 text-sm bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium"
              >
                <User className="w-4 h-4" />
                ログイン
              </button>
            )}

            <a
              href="https://creator.line.me/ja/guideline/sticker/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-green-600 font-medium transition-colors"
            >
              ガイドライン &rarr;
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {currentPage === 'workstation' ? (
          <Workstation onCreditUpdate={handleCreditUpdate} />
        ) : (
          <PurchasePage />
        )}
      </main>

      <footer className="py-6 text-center text-slate-400 text-sm">
        <p>Powered by Gemini 3.0 Pro Image & React</p>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <Auth
          onClose={() => setShowAuth(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
};

export default App;