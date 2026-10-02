'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export const INITIAL_ADMIN_PASS = 'admin123'; // Constante necessária para a página de Admin

interface AppContextType {
  canais: string[];
  sales: any[];
  adsData: any[];
  flexData: any[];
  products: any[];
  goals: any[];
  channelRules: any[];
  channelLogos: Record<string, string>;
  users: any[];
  cancellations: any[];
  logs: { text: string; type: 'success' | 'error' | 'info'; date: string }[];
  addLog: (text: string, type?: 'success' | 'error' | 'info') => void;
  importCancellations: (rows: any[], mesReferencia: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [canais, setCanais] = useState<string[]>(['Amazon', 'Magalu', 'Shein', 'Netshoes', 'Mercado Livre', 'Hebraica', 'Paineiras']);
  const [sales, setSales] = useState<any[]>([]);
  const [adsData, setAdsData] = useState<any[]>([]);
  const [flexData, setFlexData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [channelRules, setChannelRules] = useState<any[]>([]);
  const [channelLogos, setChannelLogos] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [logs, setLogs] = useState<{ text: string; type: 'success' | 'error' | 'info'; date: string }[]>([]);

  const addLog = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newLog = { text, type, date: new Date().toLocaleTimeString() };
    setLogs(prev => [newLog, ...prev]);
  };

  const refreshData = async () => {
    try {
      const [
        resSales, 
        resAds, 
        resFlex, 
        resProd, 
        resGoals, 
        resRules, 
        resUsers, 
        resCancel
      ] = await Promise.all([
        supabase.from('tb_vendas').select('*'),
        supabase.from('tb_ads').select('*'),
        supabase.from('tb_flex').select('*'),
        supabase.from('tb_produtos').select('*'),
        supabase.from('tb_metas').select('*'),
        supabase.from('tb_regras_canal').select('*'),
        supabase.from('tb_usuarios').select('*'),
        supabase.from('tb_cancelamentos').select('*')
      ]);

      if (resSales.data) setSales(resSales.data);
      if (resAds.data) setAdsData(resAds.data);
      if (resFlex.data) setFlexData(resFlex.data);
      if (resProd.data) setProducts(resProd.data);
      if (resGoals.data) setGoals(resGoals.data);
      if (resRules.data) setChannelRules(resRules.data);
      if (resUsers.data) setUsers(resUsers.data);
      if (resCancel.data) setCancellations(resCancel.data);

      const activeChannels = Array.from(new Set([
        ...canais, 
        ...(resSales.data || []).map((s: any) => s.canal),
        ...(resRules.data || []).map((r: any) => r.canal)
      ])).filter(Boolean);
      setCanais(activeChannels as string[]);

      const logosMap: Record<string, string> = {};
      (resRules.data || []).forEach((r: any) => {
        if (r.canal && r.logo_url) logosMap[r.canal] = r.logo_url;
      });
      setChannelLogos(logosMap);

    } catch (err: any) {
      addLog(`Erro ao atualizar dados: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const importCancellations = async (rows: any[], mesReferencia: string) => {
    try {
      const formattedRows = rows.map((r: any) => ({
        id_pedido: String(r['ID Pedido'] || r.id_pedido || ''),
        produto: String(r['Produto'] || r.produto || ''),
        canal: String(r['Canal'] || r.canal || ''),
        valor: Number(String(r['Valor'] || r.valor || 0).replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0,
        mes_referencia: mesReferencia
      }));

      const { error } = await supabase.from('tb_cancelamentos').upsert(formattedRows, { onConflict: 'id_pedido,mes_referencia' });
      if (error) throw error;

      setCancellations(prev => [...prev.filter(c => c.mes_referencia !== mesReferencia), ...formattedRows]);
      addLog(`Planilha de cancelamentos importada para o mês ${mesReferencia} com sucesso!`, 'success');
    } catch (err: any) {
      addLog(`Erro ao importar cancelamentos: ${err.message}`, 'error');
    }
  };

  return (
    <AppContext.Provider value={{
      canais,
      sales,
      adsData,
      flexData,
      products,
      goals,
      channelRules,
      channelLogos,
      users,
      cancellations,
      logs,
      addLog,
      importCancellations,
      refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext deve ser usado dentro de um AppProvider');
  return context;
}