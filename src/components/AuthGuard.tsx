'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { users, currentUser, setCurrentUser, isAuthLoaded } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Aguarda o carregamento do cache local para não piscar a tela
  if (!isAuthLoaded) return null; 

  // Se já houver um utilizador logado, libera o acesso ao Dashboard (renderiza os filhos)
  if (currentUser) {
    return <>{children}</>;
  }

  // Função de Login atualizada para ler da base dinâmica (users)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Busca o utilizador na lista global que inclui os novos cadastros como o do Felipe
    const validUser = users.find(
      (u: any) => u.username.toLowerCase().trim() === username.toLowerCase().trim() && u.password === password
    );

    if (validUser) {
      setCurrentUser(validUser);
    } else {
      setError('Credenciais Inválidas.');
    }
  };

  // Ecrã de Login (Mostrado apenas se não estiver logado)
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col items-center">
        
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
          <i className="fa-solid fa-chart-pie text-white text-2xl"></i>
        </div>
        
        <h1 className="text-2xl font-black text-white mb-1">ApexMetrics Pro</h1>
        <p className="text-slate-400 text-sm mb-6">Acesso Restrito</p>

        {error && (
          <div className="w-full bg-rose-950/40 border border-rose-900 text-rose-400 text-sm font-bold p-3 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Usuário</label>
            <input
              type="email"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="email@usebestfit.com.br"
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/30 transition mt-2"
          >
            Entrar
          </button>
        </form>
        
      </div>
    </div>
  );
}