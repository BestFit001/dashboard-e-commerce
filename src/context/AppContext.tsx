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
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Motor de Persistência Total ativado (LocalStorage + Supabase).', type: 'info' }]);
  const [isLoaded, setIsLoaded] = useState(false);

  const addLog = (message: string, type = 'info') => {
    setLogs((prev: any[]) => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message, type }, ...prev.slice(0, 49)]);
  };

  // 1. CARREGAR DADOS AO ABRIR (F5) - Prioriza LocalStorage para não ficar tela branca
  useEffect(() => {
    const loadLocal = (key: string, setter: any) => {
      const stored = localStorage.getItem(key);
      if (stored) { try { setter(JSON.parse(stored)); } catch (e) {} }
    };

    loadLocal('apex_canais', setCanais);
    loadLocal('apex_rules', setChannelRules);
    loadLocal('apex_products', setProducts);
    loadLocal('apex_sales', setSales);
    loadLocal('apex_ads', setAdsData);
    loadLocal('apex_flex', setFlexData);
    loadLocal('apex_faturados', setFaturados);
    loadLocal('apex_cancelados', setCancelados);

    setIsLoaded(true);

    // 2. Sincronizar com Supabase em segundo plano
    async function fetchDb() {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return; // Aborta se faltar as credenciais
        const { data: produtosDb } = await supabase.from('tb_produtos').select('*');
        if (produtosDb && produtosDb.length > 0) setProducts(produtosDb);

        const { data: regrasDb } = await supabase.from('tb_regras_canais').select('*');
        if (regrasDb && regrasDb.length > 0) {
          setChannelRules(regrasDb.map((r: any) => ({
             canal: r.canal, colIdPedido: r.col_id_pedido, colSku: r.col_sku, 
             colEstado: r.col_estado, colQuantidade: r.col_quantidade, formulaExcel: r.formula_excel
          })));
          setCanais(regrasDb.map((r: any) => r.canal));
        }
      } catch (e) {
        console.error("Falha ao comunicar com Supabase", e);
      }
    }
    fetchDb();
  }, []);

  // 3. SALVAR TUDO IMEDIATAMENTE APÓS QUALQUER MUDANÇA
  useEffect(() => {
    if (!isLoaded) return; // Não sobrescreve antes de carregar o F5
    localStorage.setItem('apex_canais', JSON.stringify(canais));
    localStorage.setItem('apex_rules', JSON.stringify(channelRules));
    localStorage.setItem('apex_products', JSON.stringify(products));
    localStorage.setItem('apex_sales', JSON.stringify(sales));
    localStorage.setItem('apex_ads', JSON.stringify(adsData));
    localStorage.setItem('apex_flex', JSON.stringify(flexData));
    localStorage.setItem('apex_faturados', JSON.stringify(faturados));
    localStorage.setItem('apex_cancelados', JSON.stringify(cancelados));
  }, [canais, channelRules, products, sales, adsData, flexData, faturados, cancelados, isLoaded]);

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