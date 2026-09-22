'use client';
import React, { createContext, useContext, useState } from 'react';

export const CHANNELS = [
  'Mercado Livre 1',
  'Mercado Livre 2',
  'Magalu',
  'Shopee',
  'TikTok',
  'Shein',
  'Netshoes',
  'Site',
  'Loja física'
];

export const BRAZIL_STATES = [
  'TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 
  'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 
  'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

export const INITIAL_ADMIN_PASS = 'Dash321';

// Dados Iniciais Zerados (Sem dados fictícios/Carlos)
const SEED_PRODUCTS: any[] = [];
const SEED_SALES: any[] = [];
const SEED_ADS: any[] = [];
const SEED_FLEX: any[] = [];
const SEED_CANCELLED: any[] = [];
const SEED_GOALS: any[] = [];

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
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [sales, setSales] = useState(SEED_SALES);
  const [adsData, setAdsData] = useState(SEED_ADS);
  const [flexData, setFlexData] = useState(SEED_FLEX);
  const [cancelledOrders, setCancelledOrders] = useState(SEED_CANCELLED);
  const [goals, setGoals] = useState(SEED_GOALS);
  
  const [channelRules, setChannelRules] = useState(DEFAULT_CHANNEL_RULES);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  
  const [logs, setLogs] = useState([
    { id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Sistema inicializado.', type: 'info' }
  ]);

  const addLog = (message: string, type = 'info') => {
    setLogs((prev: any[]) => [
      { id: Date.now(), timestamp: new Date().toLocaleTimeString(), message, type },
      ...prev.slice(0, 49)
    ]);
  };

  return (
    <AppContext.Provider value={{
      products, setProducts,
      sales, setSales,
      adsData, setAdsData,
      flexData, setFlexData,
      cancelledOrders, setCancelledOrders,
      goals, setGoals,
      channelRules, setChannelRules,
      isAdminUnlocked, setIsAdminUnlocked,
      logs, setLogs,
      addLog
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);