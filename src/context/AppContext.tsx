'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const BRAZIL_STATES = ['TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
export const INITIAL_ADMIN_PASS = 'Dash321';

// Lojas oficiais atualizadas
export const CHANNELS = ['Mercado Livre 1', 'Mercado Livre 2', 'Amazon', 'Magalu', 'Shopee', 'TikTok', 'Shein', 'Netshoes', 'Site', 'Clube Hebraica', 'Clube Paineiras'];

const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [users, setUsers] = useState([
    { username: 'Gisele@usebestfit.com.br', password: 'Best2026**', role: 'admin' },
    { username: 'usuario@usebestfit.com.br', password: '123', role: 'user' }
  ]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  const [canais, setCanais] = useState<string[]>(CHANNELS);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [adsData, setAdsData] = useState<any[]>([]);
  const [flexData, setFlexData] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  
  const [faturados, setFaturados] = useState<any[]>([]);
  const [cancelados, setCancelados] = useState<any[]>([]);
  
  const [channelLogos, setChannelLogos] = useState<Record<string, string>>({});
  
  const [channelRules, setChannelRules] = useState(CHANNELS.map(c => ({ 
    canal: c, 
    responsavel: 'Equipe Best Fit', 
    colIdPedido: 'A', 
    colSku: 'B', 
    colPrecoVenda: 'D',
    colRebate: 'C', 
    colQuantidade: 'G', 
    formulaExcel: 'C2 - (C2 * 12%)' 
  })));
  
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Dashboard Best Fit inicializado com sucesso.', type: 'info' }]);
  const [isLoaded, setIsLoaded] = useState(false);

  const addLog = (message: string, type = 'info') => {
    setLogs((prev: any[]) => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message, type }, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    const savedUsers = localStorage.getItem('bestfit_users');
    const savedSession = localStorage.getItem('bestfit_session');
    
    if (savedUsers) { try { setUsers(JSON.parse(savedUsers)); } catch(e) {} }
    if (savedSession) { try { setCurrentUser(JSON.parse(savedSession)); } catch(e) {} }
    setIsAuthLoaded(true);

    const loadLocal = (key: string, setter: any) => {
      const stored = localStorage.getItem(key);
      if (stored) { try { setter(JSON.parse(stored)); } catch (e) {} }
    };

    // Filtro agressivo para limpar o cache da Loja física e injetar os clubes
    const storedCanais = localStorage.getItem('bestfit_canais');
    if (storedCanais) {
      try {
        const parsedCanais = JSON.parse(storedCanais);
        const canaisValidos = parsedCanais.filter((c: string) => c !== 'Loja física' && c !== 'Loja fisica' && c !== 'Paineiras');
        if (!canaisValidos.includes('Clube Paineiras')) canaisValidos.push('Clube Paineiras');
        if (!canaisValidos.includes('Clube Hebraica')) canaisValidos.push('Clube Hebraica');
        setCanais(canaisValidos);
      } catch (e) {}
    }

    const storedRules = localStorage.getItem('bestfit_rules');
    if (storedRules) {
      try {
        const parsedRules = JSON.parse(storedRules);
        const regrasValidas = parsedRules.filter((r: any) => r.canal !== 'Loja física' && r.canal !== 'Loja fisica' && r.canal !== 'Paineiras');
        
        if (!regrasValidas.find((r: any) => r.canal === 'Clube Paineiras')) {
          regrasValidas.push({ canal: 'Clube Paineiras', responsavel: 'Equipe Best Fit', colIdPedido: 'A', colSku: 'B', colPrecoVenda: 'D', colRebate: 'C', colQuantidade: 'G', formulaExcel: 'C2 - (C2 * 12%)' });
        }
        if (!regrasValidas.find((r: any) => r.canal === 'Clube Hebraica')) {
          regrasValidas.push({ canal: 'Clube Hebraica', responsavel: 'Equipe Best Fit', colIdPedido: 'A', colSku: 'B', colPrecoVenda: 'D', colRebate: 'C', colQuantidade: 'G', formulaExcel: 'C2 - (C2 * 12%)' });
        }
        setChannelRules(regrasValidas);
      } catch (e) {}
    }

    loadLocal('bestfit_products', setProducts);
    loadLocal('bestfit_sales', setSales);
    loadLocal('bestfit_ads', setAdsData);
    loadLocal('bestfit_flex', setFlexData);
    loadLocal('bestfit_faturados', setFaturados);
    loadLocal('bestfit_cancelados', setCancelados);
    loadLocal('bestfit_logos', setChannelLogos);

    setIsLoaded(true);
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