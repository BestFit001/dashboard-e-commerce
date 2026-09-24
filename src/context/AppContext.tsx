'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const BRAZIL_STATES = ['TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
export const INITIAL_ADMIN_PASS = 'Dash321';

const INITIAL_CHANNELS = ['Mercado Livre 1', 'Mercado Livre 2', 'Amazon', 'Magalu', 'Shopee', 'TikTok', 'Shein', 'Netshoes', 'Site', 'Loja física'];

const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [canais, setCanais] = useState<string[]>(INITIAL_CHANNELS);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [adsData, setAdsData] = useState<any[]>([]);
  const [flexData, setFlexData] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  
  const [faturados, setFaturados] = useState<string[]>([]);
  const [cancelados, setCancelados] = useState<string[]>([]);

  const [channelRules, setChannelRules] = useState(INITIAL_CHANNELS.map(c => ({ canal: c, colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2 - (C2 * 12%)' })));
  
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Motor de persistência ativado (Supabase + LocalStorage).', type: 'info' }]);

  const addLog = (message: string, type = 'info') => {
    setLogs((prev: any[]) => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message, type }, ...prev.slice(0, 49)]);
  };

  // 1. CARREGAR DADOS AO ABRIR A PÁGINA (F5)
  useEffect(() => {
    async function carregarDadosSalvos() {
      // Busca Produtos do Supabase
      const { data: produtosDb } = await supabase.from('tb_produtos').select('*');
      if (produtosDb) setProducts(produtosDb);

      // Busca Regras e Canais do Supabase
      const { data: regrasDb } = await supabase.from('tb_regras_canais').select('*');
      if (regrasDb && regrasDb.length > 0) {
        setChannelRules(regrasDb);
        setCanais(regrasDb.map(r => r.canal));
      }

      // Busca Vendas do Supabase
      const { data: vendasDb } = await supabase.from('tb_vendas').select('*');
      if (vendasDb) setSales(vendasDb);

      // Busca Dados Auxiliares da Memória do Navegador (LocalStorage)
      const localAds = localStorage.getItem('apex_ads');
      if (localAds) setAdsData(JSON.parse(localAds));

      const localFlex = localStorage.getItem('apex_flex');
      if (localFlex) setFlexData(JSON.parse(localFlex));

      const localFaturados = localStorage.getItem('apex_faturados');
      if (localFaturados) setFaturados(JSON.parse(localFaturados));

      const localCancelados = localStorage.getItem('apex_cancelados');
      if (localCancelados) setCancelados(JSON.parse(localCancelados));
    }
    carregarDadosSalvos();
  }, []);

  // 2. SALVAR DADOS AUXILIARES AUTOMATICAMENTE (Para sobreviverem ao F5)
  useEffect(() => {
    localStorage.setItem('apex_ads', JSON.stringify(adsData));
    localStorage.setItem('apex_flex', JSON.stringify(flexData));
    localStorage.setItem('apex_faturados', JSON.stringify(faturados));
    localStorage.setItem('apex_cancelados', JSON.stringify(cancelados));
  }, [adsData, flexData, faturados, cancelados]);

  return (
    <AppContext.Provider value={{
      canais, setCanais, products, setProducts, sales, setSales, adsData, setAdsData, flexData, setFlexData, goals, setGoals,
      faturados, setFaturados, cancelados, setCancelados,
      channelRules, setChannelRules, isAdminUnlocked, setIsAdminUnlocked, logs, setLogs, addLog
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);