'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function Navigation() {
  const pathname = usePathname();
  const { isAdminUnlocked } = useAppContext();

  const getTabClass = (path: string, color: string) => 
    `px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
      pathname === path ? `bg-${color}-600 text-white shadow-md` : 'text-slate-400 hover:text-slate-200'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <i className="fa-solid fa-chart-pie text-lg"></i>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              ApexMetrics Pro
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Engine V2.5</span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">Painel de Faturamento & Margens Omnichannel</p>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
        <Link href="/" className={getTabClass('/', 'indigo')}><i className="fa-solid fa-chart-line"></i> Dashboard</Link>
        <Link href="/skus" className={getTabClass('/skus', 'indigo')}><i className="fa-solid fa-box"></i> SKUs & Custos</Link>
        <Link href="/regras" className={getTabClass('/regras', 'purple')}><i className="fa-solid fa-calculator"></i> Regras Canal</Link>
        <Link href="/admin" className={getTabClass('/admin', 'amber')}>
          <i className={`fa-solid ${isAdminUnlocked ? 'fa-lock-open text-emerald-400' : 'fa-lock text-amber-400'}`}></i> Admin
        </Link>
      </div>
    </header>
  );
}