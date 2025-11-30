import React, { useState, useEffect } from 'react';
import { Shield, Users, Plus, Minus, Search } from 'lucide-react';

interface User {
  id: number;
  email: string;
  credits: number;
  created_at: string;
}

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('admin_token', data.token);
        fetchUsers();
      } else {
        setError('パスワードが正しくありません');
      }
    } catch (err) {
      setError('ログインに失敗しました');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('ユーザー取得エラー:', err);
    }
  };

  const updateCredits = async (userId: number, amount: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error('クレジット更新エラー:', err);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">管理者ログイン</h1>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <input
            type="password"
            placeholder="管理者パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          
          <button
            onClick={handleLogin}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium"
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-slate-800">ユーザー管理</h1>
            </div>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                localStorage.removeItem('admin_token');
              }}
              className="text-sm text-slate-600 hover:text-red-600"
            >
              ログアウト
            </button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="メールアドレスで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">メールアドレス</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">クレジット</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">登録日</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4 text-sm text-slate-600">{user.id}</td>
                    <td className="px-4 py-4 text-sm text-slate-900 font-medium">{user.email}</td>
                    <td className="px-4 py-4 text-sm text-right">
                      <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                        {user.credits} cr
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            const amount = prompt('付与するクレジット数を入力:');
                            if (amount) updateCredits(user.id, parseInt(amount));
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="クレジット追加"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            const amount = prompt('減算するクレジット数を入力:');
                            if (amount) updateCredits(user.id, -parseInt(amount));
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="クレジット減算"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              ユーザーが見つかりません
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
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

export default Admin;