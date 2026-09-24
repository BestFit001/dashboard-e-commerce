'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function Navbar() {
  const { currentUser, setCurrentUser } = useAppContext();
  const pathname = usePathname();

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

  // Array de rotas. O atributo reqAdmin define se a rota exige nível Administrador.
  const navLinks = [
    { name: 'Dashboard', path: '/', icon: 'fa-solid fa-chart-pie', reqAdmin: false },
    { name: 'SKUs & Custos', path: '/skus', icon: 'fa-solid fa-tags', reqAdmin: true },
    { name: 'Regras Canal', path: '/regras', icon: 'fa-solid fa-calculator', reqAdmin: true },
    { name: 'Admin', path: '/admin', icon: 'fa-solid fa-lock', reqAdmin: true },
    { name: 'Usuários', path: '/usuarios', icon: 'fa-solid fa-users', reqAdmin: true },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
      
      {/* Logotipo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
          <span className="text-white font-black text-xl tracking-tighter">BF</span>
        </div>
        <div>
          <h1 className="text-white font-black text-base leading-tight">ApexMetrics Pro</h1>
          <p className="text-slate-400 text-[9px] uppercase tracking-widest font-bold">Painel Executivo Omnichannel</p>
        </div>
      </div>

      {/* Menu Principal com Bloqueio de Role */}
      <div className="hidden md:flex items-center gap-2">
        {navLinks.map(link => {
          // Se o link exige admin e o utilizador atual não é admin, não renderiza o botão
          if (link.reqAdmin && !isAdmin) return null;
          
          const isActive = pathname === link.path;
          return (
            <Link key={link.path} href={link.path} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${isActive ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <i className={link.icon}></i> {link.name}
            </Link>
          );
        })}
      </div>

      {/* Informações da Sessão e Saída */}
      <div className="flex items-center gap-6">
        <div className="text-right hidden sm:block">
          <span className={`block text-[9px] font-black uppercase tracking-wider ${isAdmin ? 'text-slate-400' : 'text-purple-400'}`}>
            {isAdmin ? 'Administrador' : 'Visualizador'}
          </span>
          <span className="block text-xs font-medium text-slate-200">{currentUser.username}</span>
        </div>
        <button onClick={() => setCurrentUser(null)} className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900 rounded-xl text-xs font-bold transition flex items-center gap-2">
          <i className="fa-solid fa-arrow-right-from-bracket"></i> Sair
        </button>
      </div>
      
    </div>
  );
}