'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const BRAZIL_STATES = ['TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
export const INITIAL_ADMIN_PASS = 'Dash321';

// Removida a "Loja física" genérica e adicionados os clubes específicos
const INITIAL_CHANNELS = ['Mercado Livre 1', 'Mercado Livre 2', 'Amazon', 'Magalu', 'Shopee', 'TikTok', 'Shein', 'Netshoes', 'Site', 'Clube Hebraica', 'Clube Paineiras'];

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

  const [channelRules, setChannelRules] = useState(INITIAL_CHANNELS.map(c => ({ 
    canal: c, colIdPedido: 'A', colSku: 'B', colEstado: 'C', colQuantidade: 'D', colPdv: 'E', formulaExcel: 'E2 - (E2 * 12%)' 
  })));
  
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Motor atualizado: Lojas físicas fragmentadas em Clube Hebraica e Clube Paineiras.', type: 'info' }]);
  const [isLoaded, setIsLoaded] = useState(false);

  const addLog = (message: string, type = 'info') => {
    setLogs((prev: any[]) => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message, type }, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    const loadLocal = (key: string, setter: any) => {
      const stored = localStorage.getItem(key);
      if (stored) { try { setter(JSON.parse(stored)); } catch (e) {} }
    };

    // 1. CARREGA E MIGRA OS CANAIS (Remove "Loja física" e injeta os Clubes caso seja o primeiro carregamento após o update)
    const storedCanais = localStorage.getItem('apex_canais');
    if (storedCanais) {
      try {
        let parsedCanais = JSON.parse(storedCanais);
        if (parsedCanais.includes('Loja física')) {
          parsedCanais = parsedCanais.filter((c: string) => c !== 'Loja física');
          if (!parsedCanais.includes('Clube Hebraica')) parsedCanais.push('Clube Hebraica');
          if (!parsedCanais.includes('Clube Paineiras')) parsedCanais.push('Clube Paineiras');
        }
        setCanais(parsedCanais);
      } catch(e) {}
    }

    // 2. CARREGA E MIGRA AS REGRAS
    const storedRules = localStorage.getItem('apex_rules');
    if (storedRules) {
      try {
        let parsedRules = JSON.parse(storedRules);
        if (parsedRules.some((r: any) => r.canal === 'Loja física')) {
          parsedRules = parsedRules.filter((r: any) => r.canal !== 'Loja física');
          
          // Por padrão, vendas de clube físico não costumam ter taxa de plataforma, logo a expressão inicia apenas como E2 (valor limpo)
          const baseRule = { colIdPedido: 'A', colSku: 'B', colEstado: 'C', colQuantidade: 'D', colPdv: 'E', formulaExcel: 'E2' };
          
          if (!parsedRules.some((r: any) => r.canal === 'Clube Hebraica')) parsedRules.push({ canal: 'Clube Hebraica', ...baseRule });
          if (!parsedRules.some((r: any) => r.canal === 'Clube Paineiras')) parsedRules.push({ canal: 'Clube Paineiras', ...baseRule });
        }
        setChannelRules(parsedRules);
      } catch(e) {}
    }

    loadLocal('apex_products', setProducts);
    loadLocal('apex_sales', setSales);
    loadLocal('apex_ads', setAdsData);
    loadLocal('apex_flex', setFlexData);
    loadLocal('apex_faturados', setFaturados);
    loadLocal('apex_cancelados', setCancelados);
    loadLocal('apex_goals', setGoals);

    setIsLoaded(true);

    async function fetchDb() {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
        const { data: produtosDb } = await supabase.from('tb_produtos').select('*');
        if (produtosDb && produtosDb.length > 0) setProducts(produtosDb);

        const { data: regrasDb } = await supabase.from('tb_regras_canais').select('*');
        if (regrasDb && regrasDb.length > 0) {
          let mappedRules = regrasDb.map((r: any) => ({
             canal: r.canal, colIdPedido: r.col_id_pedido, colSku: r.col_sku, 
             colEstado: r.col_estado, colQuantidade: r.col_quantidade, colPdv: r.col_pdv || 'E', 
             formulaExcel: r.formula_excel
          }));
          
          // Migração idêntica caso os dados puxem do Supabase remoto
          if (mappedRules.some((r: any) => r.canal === 'Loja física')) {
             mappedRules = mappedRules.filter((r: any) => r.canal !== 'Loja física');
             const baseRule = { colIdPedido: 'A', colSku: 'B', colEstado: 'C', colQuantidade: 'D', colPdv: 'E', formulaExcel: 'E2' };
             if (!mappedRules.some((r: any) => r.canal === 'Clube Hebraica')) mappedRules.push({ canal: 'Clube Hebraica', ...baseRule });
             if (!mappedRules.some((r: any) => r.canal === 'Clube Paineiras')) mappedRules.push({ canal: 'Clube Paineiras', ...baseRule });
          }

          setChannelRules(mappedRules);
          setCanais(mappedRules.map((r: any) => r.canal));
        }
      } catch (e) {
        console.error("Falha Supabase", e);
      }
    }
    fetchDb();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('apex_canais', JSON.stringify(canais));
    localStorage.setItem('apex_rules', JSON.stringify(channelRules));
    localStorage.setItem('apex_products', JSON.stringify(products));
    localStorage.setItem('apex_sales', JSON.stringify(sales));
    localStorage.setItem('apex_ads', JSON.stringify(adsData));
    localStorage.setItem('apex_flex', JSON.stringify(flexData));
    localStorage.setItem('apex_faturados', JSON.stringify(faturados));
    localStorage.setItem('apex_cancelados', JSON.stringify(cancelados));
    localStorage.setItem('apex_goals', JSON.stringify(goals));
  }, [canais, channelRules, products, sales, adsData, flexData, faturados, cancelados, goals, isLoaded]);

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