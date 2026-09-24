'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const BRAZIL_STATES = ['TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
export const INITIAL_ADMIN_PASS = 'Dash321';
const INITIAL_CHANNELS = ['Mercado Livre 1', 'Mercado Livre 2', 'Amazon', 'Magalu', 'Shopee', 'TikTok', 'Shein', 'Netshoes', 'Site', 'Loja física'];

const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // Usuários com controle de nível ('admin' ou 'user')
  const [users, setUsers] = useState([
    { username: 'Gisele@usebestfit.com.br', password: 'Best2026**', role: 'admin' },
    { username: 'usuario@usebestfit.com.br', password: '123', role: 'user' }
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
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Dashboard Best Fit inicializado com sucesso.', type: 'info' }]);
  const [isLoaded, setIsLoaded] = useState(false);

  const addLog = (message: string, type = 'info') => {
    setLogs((prev: any[]) => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message, type }, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    const savedUsers = localStorage.getItem('bestfit_users');
    const savedSession = localStorage.getItem('bestfit_session');
    
    if (savedUsers) {
      try { setUsers(JSON.parse(savedUsers)); } catch(e) {}
    }
    if (savedSession) {
      try { setCurrentUser(JSON.parse(savedSession)); } catch(e) {}
    }
    setIsAuthLoaded(true);

    const loadLocal = (key: string, setter: any) => {
      const stored = localStorage.getItem(key);
      if (stored) { try { setter(JSON.parse(stored)); } catch (e) {} }
    };

    loadLocal('bestfit_canais', setCanais);
    loadLocal('bestfit_rules', setChannelRules);
    loadLocal('bestfit_products', setProducts);
    loadLocal('bestfit_sales', setSales);
    loadLocal('bestfit_ads', setAdsData);
    loadLocal('bestfit_flex', setFlexData);
    loadLocal('bestfit_faturados', setFaturados);
    loadLocal('bestfit_cancelados', setCancelados);
    loadLocal('bestfit_logos', setChannelLogos);

    setIsLoaded(true);

    async function fetchDb() {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return; 
        const { data: produtosDb } = await supabase.from('tb_produtos').select('*');
        if (produtosDb && produtosDb.length > 0) setProducts(produtosDb);

        const { data: regrasDb } = await supabase.from('tb_regras_canais').select('*');
        if (regrasDb && regrasDb.length > 0) {
          setChannelRules(regrasDb.map((r: any) => ({
             canal: r.canal, colIdPedido: r.col_id_pedido, colSku: r.col_sku, 
             colEstado: r.col_estado, colQuantidade: r.col_quantidade, formulaExcel: r.formula_excel
          })));
          setCanais(regrasDb.map((r: any) => r.canal));
          
          const logosMap: Record<string, string> = {};
          regrasDb.forEach((r: any) => {
             if (r.logo_url) logosMap[r.canal] = r.logo_url;
          });
          setChannelLogos(logosMap);
        }
      } catch (e) {
        console.error("Falha ao comunicar com Supabase", e);
      }
    }
    fetchDb();
  }, []);

  useEffect(() => {
    if (isAuthLoaded) localStorage.setItem('bestfit_users', JSON.stringify(users));
  }, [users, isAuthLoaded]);

  useEffect(() => {
    if (isAuthLoaded) {
      if (currentUser) localStorage.setItem('bestfit_session', JSON.stringify(currentUser));
      else localStorage.removeItem('bestfit_session');
    }
  }, [currentUser, isAuthLoaded]);

  useEffect(() => {
    if (!isLoaded) return; 
    localStorage.setItem('bestfit_canais', JSON.stringify(canais));
    localStorage.setItem('bestfit_rules', JSON.stringify(channelRules));
    localStorage.setItem('bestfit_products', JSON.stringify(products));
    localStorage.setItem('bestfit_sales', JSON.stringify(sales));
    localStorage.setItem('bestfit_ads', JSON.stringify(adsData));
    localStorage.setItem('bestfit_flex', JSON.stringify(flexData));
    localStorage.setItem('bestfit_faturados', JSON.stringify(faturados));
    localStorage.setItem('bestfit_cancelados', JSON.stringify(cancelados));
    localStorage.setItem('bestfit_logos', JSON.stringify(channelLogos));
  }, [canais, channelRules, products, sales, adsData, flexData, faturados, cancelados, channelLogos, isLoaded]);

  return (
    <AppContext.Provider value={{
      users, setUsers, currentUser, setCurrentUser, isAuthLoaded,
      canais, setCanais, products, setProducts, sales, setSales, adsData, setAdsData, flexData, setFlexData, goals, setGoals,
      faturados, setFaturados, cancelados, setCancelados, channelLogos, setChannelLogos,
      channelRules, setChannelRules, isAdminUnlocked, setIsAdminUnlocked, logs, setLogs, addLog
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);