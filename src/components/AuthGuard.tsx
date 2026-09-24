'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { users, currentUser, setCurrentUser, isAuthLoaded } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isAuthLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Carregando...</div>;
  if (currentUser) return <>{children}</>;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      setError('');
    } else {
      setError('Credenciais inválidas.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-4"><i className="fa-solid fa-chart-pie text-white text-xl"></i></div>
          <h1 className="text-2xl font-black text-white">ApexMetrics Pro</h1>
          <p className="text-xs text-slate-400 mt-1">Acesso Restrito</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="bg-rose-500/10 text-rose-400 p-3 rounded-lg text-xs font-bold text-center border border-rose-500/20">{error}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Usuário</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500" required />
          </div>
          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition pt-2">Entrar</button>
        </form>
      </div>
    </div>
  );
}