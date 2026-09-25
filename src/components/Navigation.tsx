'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function Navigation() {
  const pathname = usePathname();
  const { currentUser, setCurrentUser } = useAppContext();

  if (!currentUser) return null;
  const isAdmin = currentUser.role === 'admin';

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-purple-600/30">
          BF
        </div>
        <div>
          <h1 className="font-black text-white text-base tracking-tight">Dashboard Best Fit</h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Painel Executivo Omnichannel</p>
        </div>
      </div>

      <nav className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800/80 overflow-x-auto max-w-full">
        <Link href="/" className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${pathname === '/' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
          <i className="fa-solid fa-chart-pie"></i> Dashboard
        </Link>
        {isAdmin && (
          <>
            <Link href="/skus" className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${pathname === '/skus' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-tags"></i> SKUs & Custos
            </Link>
            <Link href="/regras" className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${pathname === '/regras' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-calculator"></i> Regras Canal
            </Link>
            <Link href="/admin" className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${pathname === '/admin' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-lock"></i> Admin
            </Link>
            <Link href="/usuarios" className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${pathname === '/usuarios' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-users"></i> Usuários
            </Link>
          </>
        )}
      </nav>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">{currentUser.role === 'admin' ? 'Administrador' : 'Visualizador'}</span>
          <span className="text-xs font-bold text-slate-200">{currentUser.username}</span>
        </div>
        <button onClick={() => setCurrentUser(null)} className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs rounded-xl transition flex items-center gap-2">
          <i className="fa-solid fa-right-from-bracket"></i> Sair
        </button>
      </div>
    </header>
  );
}