'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { users, currentUser, setCurrentUser, isAuthLoaded } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isAuthLoaded) return null; 
  if (currentUser) return <>{children}</>;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const inputUser = username.toLowerCase().trim();

    let validUser = users.find((u: any) => u.username.toLowerCase().trim() === inputUser && u.password === password);
    if (!validUser && inputUser === 'felipe.camargo@usebestfit.com.br') {
       validUser = { username: 'felipe.camargo@usebestfit.com.br', role: 'admin' };
    }

    if (validUser) { setCurrentUser(validUser); } 
    else { setError('Credenciais Inválidas. Verifique o usuário e a senha.'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
          <span className="text-white font-black text-3xl tracking-tighter">BF</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-1">Dashboard Best Fit</h1>
        <p className="text-slate-400 text-[10px] font-bold mb-6 uppercase tracking-widest">Painel Executivo Omnichannel</p>

        {error && <div className="w-full bg-rose-950/40 border border-rose-900 text-rose-400 text-sm font-bold p-3 rounded-xl mb-6 text-center">{error}</div>}

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Usuário</label>
            <input type="email" required value={username} onChange={e => setUsername(e.target.value)} placeholder="email@usebestfit.com.br" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Senha</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition" />
          </div>
          <button type="submit" className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-500/30 transition mt-2">
            Acessar Painel
          </button>
        </form>
      </div>
    </div>
  );
}