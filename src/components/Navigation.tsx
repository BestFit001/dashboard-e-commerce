'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function Navigation() {
  const pathname = usePathname();
  const { currentUser, setCurrentUser, setIsAdminUnlocked } = useAppContext();

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdminUnlocked(false);
  };

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: 'fa-chart-line' },
    { href: '/regras', label: 'Regras Canal', icon: 'fa-calculator' },
    { href: '/admin', label: 'Admin', icon: 'fa-lock' },
    { href: '/usuarios', label: 'Usuários', icon: 'fa-users' },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 fixed w-full z-50 top-0 left-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-chart-pie text-white text-sm"></i>
            </div>
            <div>
              <h1 className="text-white font-bold text-sm tracking-tight leading-none">ApexMetrics Pro</h1>
              <span className="text-[10px] text-slate-400 font-medium">Painel Executivo Omnichannel</span>
            </div>
          </div>

          <div className="hidden md:flex space-x-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${
                    isActive 
                      ? 'bg-indigo-600/10 text-indigo-400' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <i className={`fa-solid ${link.icon}`}></i>
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <i className="fa-solid fa-circle text-[8px] text-emerald-500"></i>
                <span className="font-bold">{currentUser.username}</span>
              </div>
            )}
            
            <button 
              onClick={handleLogout} 
              className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl font-bold text-xs transition"
            >
              Sair
            </button>
          </div>
          
        </div>
      </div>
      
      {/* Menu mobile em baixo (opcional, mas bom para ecrãs pequenos) */}
      <div className="md:hidden border-t border-slate-800 bg-slate-950 flex justify-around p-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`p-2 rounded-lg text-xs font-bold transition flex flex-col items-center gap-1 ${
                isActive ? 'text-indigo-400' : 'text-slate-500'
              }`}
            >
              <i className={`fa-solid ${link.icon}`}></i>
              <span className="text-[10px]">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}