'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const CHANNELS = ['Mercado Livre 1', 'Mercado Livre 2', 'Magalu', 'Shopee', 'TikTok', 'Shein', 'Netshoes', 'Site', 'Loja física'];
export const BRAZIL_STATES = ['TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
export const INITIAL_ADMIN_PASS = 'Dash321';

const DEFAULT_CHANNEL_RULES = CHANNELS.map((channel) => ({
  canal: channel,
  colIdPedido: 'A',
  colSku: 'B',
  colEstado: 'E',
  colQuantidade: 'G',
  formulaExcel: channel === 'Site' || channel === 'Loja física' ? 'C2' : 'C2 - (C2 * 12%) - D2 + F2',
}));

const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // Inicializa vazio para preencher com o Supabase
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [channelRules, setChannelRules] = useState<any[]>(DEFAULT_CHANNEL_RULES);
  
  // Estruturas secundárias (mantidas em state até criar as tabelas delas)
  const [adsData, setAdsData] = useState([{ canal: 'Mercado Livre 1', custo_ads: 1250.00 }]);
  const [flexData, setFlexData] = useState([{ id_pedido: 'PED-90812', canal: 'Mercado Livre 1', valor_frete: 12.99 }]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [goals, setGoals] = useState([{ responsavel: 'Carlos', canal: 'Mercado Livre 1', meta_valor: 25000.00 }]);
  
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Conectando ao Supabase...', type: 'info' }]);

  const addLog = (message: string, type = 'info') => {
    setLogs((prev: any[]) => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message, type }, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    const fetchSupabaseData = async () => {
      // 1. Buscar Produtos
      const { data: produtos } = await supabase.from('tb_produtos').select('*');
      if (produtos) setProducts(produtos);

      // 2. Buscar Regras
      const { data: regras } = await supabase.from('tb_regras_canais').select('*');
      if (regras && regras.length > 0) {
        const regrasMapeadas = regras.map((r: any) => ({
          canal: r.canal, colIdPedido: r.col_id_pedido, colSku: r.col_sku, 
          colEstado: r.col_estado, colQuantidade: r.col_quantidade, formulaExcel: r.formula_excel
        }));
        setChannelRules(regrasMapeadas);
      }

      // 3. Buscar Vendas
      const { data: vendas } = await supabase.from('tb_vendas').select('*');
      if (vendas) {
        const vendasMapeadas = vendas.map((v: any) => ({
          id_pedido: v.id_pedido,
          data_faturamento: v.data_faturamento,
          canal: v.canal,
          estado: v.estado_compra,
          sku: v.sku,
          quantidade: 1, // Default visual
          preco_venda: 0, // Default visual
          faturamento_liquido_final: v.faturamento_liquido_final
        }));
        setSales(vendasMapeadas);
      }
      
      addLog('Sincronização com Supabase concluída.', 'success');
    };

    fetchSupabaseData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider value={{
      products, setProducts, sales, setSales, adsData, flexData, cancelledOrders, goals, 
      channelRules, setChannelRules, isAdminUnlocked, setIsAdminUnlocked, logs, setLogs, addLog
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);