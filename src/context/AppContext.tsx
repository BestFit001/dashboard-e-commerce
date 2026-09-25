'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const BRAZIL_STATES = ['TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
export const INITIAL_ADMIN_PASS = 'Dash321';
const INITIAL_CHANNELS = ['Mercado Livre 1', 'Mercado Livre 2', 'Amazon', 'Magalu', 'Shopee', 'TikTok', 'Shein', 'Netshoes', 'Site', 'Clube Hebraica', 'Clube Paineiras'];

const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [canais, setCanais] = useState<string[]>(INITIAL_CHANNELS);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [adsData, setAdsData] = useState<any[]>([]);
  const [flexData, setFlexData] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [channelRules, setChannelRules] = useState(INITIAL_CHANNELS.map(c => ({ canal: c, colIdPedido: 'A', colSku: 'B', colEstado: 'C', colPdv: 'D', colQuantidade: 'G', formulaExcel: 'D2 - (D2 * 12%)' })));
  const [channelLogos, setChannelLogos] = useState<any>({});
  
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Sistema sincronizado com a nuvem.', type: 'info' }]);

  const [users, setUsers] = useState<any[]>([
    { username: 'gisele@usebestfit.com.br', password: '123', role: 'admin' },
    { username: 'felipe.camargo@usebestfit.com.br', password: '123', role: 'admin' },
    { username: 'leila@usebestfit.com.br', password: '123', role: 'admin' }
  ]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  const addLog = (message: string, type = 'info') => {
    setLogs((prev: any[]) => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message, type }, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    const savedUsers = localStorage.getItem('bestfit_users');
    if (savedUsers) { try { setUsers(JSON.parse(savedUsers)); } catch (e) {} }
    
    const savedSession = localStorage.getItem('bestfit_session');
    if (savedSession) { try { setCurrentUser(JSON.parse(savedSession)); } catch (e) {} }
    setIsAuthLoaded(true);

    const carregarBancoDeDados = async () => {
      try {
        // Puxa SKUs
        const { data: skusData } = await supabase.from('tb_produtos').select('*');
        if (skusData) setProducts(skusData);

        // Puxa Regras e Canais
        const { data: regrasData } = await supabase.from('tb_regras_canais').select('*');
        if (regrasData && regrasData.length > 0) {
          const regrasMapeadas = regrasData.map((r: any) => ({
            canal: r.canal, colIdPedido: r.col_id_pedido || 'A', colSku: r.col_sku || 'B',
            colEstado: r.col_estado || 'C', colPdv: r.col_pdv || 'D', colQuantidade: r.col_quantidade || 'G',
            formulaExcel: r.formula_excel || '', responsavel: r.responsavel || '', logo_url: r.logo_url || ''
          }));
          setChannelRules(regrasMapeadas);
          setCanais(Array.from(new Set([...INITIAL_CHANNELS, ...regrasData.map((r: any) => r.canal)])));
        }

        // Puxa Metas Históricas
        const { data: metasData } = await supabase.from('tb_metas').select('*');
        if (metasData) setGoals(metasData);

      } catch (error) {
        console.error("Erro Supabase:", error);
      }
    };
    carregarBancoDeDados();
  }, []);

  useEffect(() => { if (isAuthLoaded) localStorage.setItem('bestfit_users', JSON.stringify(users)); }, [users, isAuthLoaded]);
  useEffect(() => { if (isAuthLoaded) { if (currentUser) localStorage.setItem('bestfit_session', JSON.stringify(currentUser)); else localStorage.removeItem('bestfit_session'); } }, [currentUser, isAuthLoaded]);

  return (
    <AppContext.Provider value={{
      canais, setCanais, products, setProducts, sales, setSales, adsData, setAdsData, flexData, setFlexData, goals, setGoals,
      channelRules, setChannelRules, isAdminUnlocked, setIsAdminUnlocked, logs, setLogs, addLog,
      currentUser, setCurrentUser, isAuthLoaded, users, setUsers, channelLogos, setChannelLogos
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);