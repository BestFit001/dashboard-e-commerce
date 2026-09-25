'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const BRAZIL_STATES = ['TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
export const INITIAL_ADMIN_PASS = 'Dash321';

// Canais atualizados (Sem Loja Física, com Clube Hebraica e Clube Paineiras)
const INITIAL_CHANNELS = ['Mercado Livre 1', 'Mercado Livre 2', 'Amazon', 'Magalu', 'Shopee', 'TikTok', 'Shein', 'Netshoes', 'Site', 'Clube Hebraica', 'Clube Paineiras'];

const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [users, setUsers] = useState<any[]>([
    { username: 'Gisele@usebestfit.com.br', password: 'Best2026**', role: 'admin' },
    { username: 'felipe.camargo@usebestfit.com.br', password: '123', role: 'admin' }
  ]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  const [canais, setCanais] = useState<string[]>(INITIAL_CHANNELS);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [adsData, setAdsData] = useState<any[]>([]);
  const [flexData, setFlexData] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  
  const [faturados, setFaturados] = useState<any[]>([]);
  const [cancelados, setCancelados] = useState<any[]>([]);
  
  const [channelLogos, setChannelLogos] = useState<Record<string, string>>({});
  const [channelRules, setChannelRules] = useState(INITIAL_CHANNELS.map(c => ({ canal: c, colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2 - (C2 * 12%)' })));
  
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Dashboard Best Fit sincronizado com Supabase.', type: 'info' }]);

  const addLog = (message: string, type = 'info') => {
    setLogs((prev: any[]) => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message, type }, ...prev.slice(0, 49)]);
  };

  const fetchCloudData = useCallback(async () => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

      const { data: usersDb } = await supabase.from('tb_estado_global').select('dados').eq('chave', 'users').single();
      if (usersDb && usersDb.dados) {
        const updatedUsers = usersDb.dados.map((u: any) => 
          u.username.toLowerCase() === 'gisele@usebestfit.com.br' ? { ...u, role: 'admin' } : u
        );
        setUsers(updatedUsers);
      }

      const { data: globalState } = await supabase.from('tb_estado_global').select('*');
      if (globalState) {
        globalState.forEach((item: any) => {
          if (item.chave === 'vendas') setSales(item.dados || []);
          if (item.chave === 'faturados') setFaturados(item.dados || []);
          if (item.chave === 'cancelados') setCancelados(item.dados || []);
          if (item.chave === 'flex') setFlexData(item.dados || []);
          if (item.chave === 'ads') setAdsData(item.dados || []);
        });
      }

      let allProducts: any[] = [];
      let page = 0;
      let fetchMore = true;
      while (fetchMore) {
        const { data: produtosDb } = await supabase.from('tb_produtos').select('*').range(page * 1000, (page + 1) * 1000 - 1);
        if (produtosDb && produtosDb.length > 0) {
          allProducts = [...allProducts, ...produtosDb];
          if (produtosDb.length < 1000) fetchMore = false;
          else page++;
        } else {
          fetchMore = false;
        }
      }
      if (allProducts.length > 0) setProducts(allProducts);

      const { data: regrasDb } = await supabase.from('tb_regras_canais').select('*');
      if (regrasDb && regrasDb.length > 0) {
        setChannelRules(regrasDb.map((r: any) => ({
           canal: r.canal, colIdPedido: r.col_id_pedido, colSku: r.col_sku, 
           colEstado: r.col_estado, colQuantidade: r.col_quantidade, formulaExcel: r.formula_excel
        })));
        
        const dbCanais = regrasDb.map((r: any) => r.canal);
        const mergedCanais = Array.from(new Set([...INITIAL_CHANNELS, ...dbCanais]));
        setCanais(mergedCanais);
        
        const logosMap: Record<string, string> = {};
        regrasDb.forEach((r: any) => {
           if (r.logo_url) logosMap[r.canal] = r.logo_url;
        });
        setChannelLogos(logosMap);
      }
    } catch (e) {
      console.error("Erro ao sincronizar com Supabase", e);
    }
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem('apex_session');
    if (savedSession) setCurrentUser(JSON.parse(savedSession));
    setIsAuthLoaded(true);

    fetchCloudData();

    const interval = setInterval(() => {
      fetchCloudData();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchCloudData]);

  useEffect(() => {
    if (isAuthLoaded) {
      if (currentUser) localStorage.setItem('apex_session', JSON.stringify(currentUser));
      else localStorage.removeItem('apex_session');
    }
  }, [currentUser, isAuthLoaded]);

  const updateCloudState = async (chave: string, dados: any) => {
    await supabase.from('tb_estado_global').upsert([{ chave, dados }], { onConflict: 'chave' });
    await fetchCloudData();
  };

  return (
    <AppContext.Provider value={{
      users, 
      setUsers: async (newUsersOrUpdater: any) => {
        const updated = typeof newUsersOrUpdater === 'function' ? newUsersOrUpdater(users) : newUsersOrUpdater;
        setUsers(updated);
        await updateCloudState('users', updated);
      }, 
      currentUser, setCurrentUser, isAuthLoaded,
      canais, setCanais, 
      products, setProducts, 
      sales, setSales: async (newSales: any) => {
        const updated = typeof newSales === 'function' ? newSales(sales) : newSales;
        setSales(updated);
        await updateCloudState('vendas', updated);
      }, 
      adsData, setAdsData: async (newAds: any) => {
        const updated = typeof newAds === 'function' ? newAds(adsData) : newAds;
        setAdsData(updated);
        await updateCloudState('ads', updated);
      }, 
      flexData, setFlexData: async (newFlex: any) => {
        const updated = typeof newFlex === 'function' ? newFlex(flexData) : newFlex;
        setFlexData(updated);
        await updateCloudState('flex', updated);
      }, 
      goals, setGoals,
      faturados, setFaturados: async (newFat: any) => {
        const updated = typeof newFat === 'function' ? newFat(faturados) : newFat;
        setFaturados(updated);
        await updateCloudState('faturados', updated);
      }, 
      cancelados, setCancelados: async (newCanc: any) => {
        const updated = typeof newCanc === 'function' ? newCanc(cancelados) : newCanc;
        setCancelados(updated);
        await updateCloudState('cancelados', updated);
      }, 
      channelLogos, setChannelLogos,
      channelRules, setChannelRules, 
      isAdminUnlocked, setIsAdminUnlocked, logs, setLogs, addLog
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);