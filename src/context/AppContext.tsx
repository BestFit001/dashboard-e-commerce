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
  
  const [faturados, setFaturados] = useState<any[]>([]);
  const [cancelados, setCancelados] = useState<any[]>([]);

  const [channelRules, setChannelRules] = useState(INITIAL_CHANNELS.map(c => ({ canal: c, colIdPedido: 'A', colSku: 'B', colEstado: 'C', colPdv: 'D', colQuantidade: 'G', formulaExcel: 'D2 - (D2 * 12%)' })));
  const [channelLogos, setChannelLogos] = useState<any>({});
  
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Sincronização global com Supabase ativa.', type: 'info' }]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

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
    const savedSession = localStorage.getItem('bestfit_session');
    if (savedSession) { try { setCurrentUser(JSON.parse(savedSession)); } catch (e) {} }
    setIsAuthLoaded(true);

    const carregarBancoDeDados = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
          setIsDataLoaded(true);
          return;
        }

        // Puxa as tabelas dedicadas E também o tb_estado_global onde as vendas e faturados estão gravados
        const [
          { data: usersData },
          { data: skusData },
          { data: regrasData },
          { data: metasData },
          { data: estadoGlobal },
          { data: flexDataDb },
          { data: adsDataDb }
        ] = await Promise.all([
          supabase.from('tb_usuarios').select('*'),
          supabase.from('tb_produtos').select('*'),
          supabase.from('tb_regras_canais').select('*'),
          supabase.from('tb_metas').select('*'),
          supabase.from('tb_estado_global').select('*'),
          supabase.from('tb_flex').select('*'),
          supabase.from('tb_ads').select('*')
        ]);

        if (usersData && usersData.length > 0) setUsers(usersData);
        if (skusData) setProducts(skusData);
        if (metasData) setGoals(metasData);
        if (flexDataDb) setFlexData(flexDataDb);
        if (adsDataDb) setAdsData(adsDataDb);

        // Processa o estado global da nuvem (Vendas, Faturados, Cancelados)
        if (estadoGlobal && estadoGlobal.length > 0) {
          estadoGlobal.forEach((item: any) => {
            if (item.chave === 'vendas' && item.dados) setSales(item.dados);
            if (item.chave === 'faturados' && item.dados) setFaturados(item.dados);
            if (item.chave === 'cancelados' && item.dados) setCancelados(item.dados);
            if (item.chave === 'flex' && item.dados) setFlexData(item.dados);
            if (item.chave === 'ads' && item.dados) setAdsData(item.dados);
          });
        }

        if (regrasData && regrasData.length > 0) {
          const regrasMapeadas = regrasData.map((r: any) => ({
            canal: r.canal, colIdPedido: r.col_id_pedido || 'A', colSku: r.col_sku || 'B',
            colEstado: r.col_estado || 'C', colPdv: r.col_pdv || 'D', colQuantidade: r.col_quantidade || 'G',
            formulaExcel: r.formula_excel || '', responsavel: r.responsavel || '', logo_url: r.logo_url || ''
          }));
          setChannelRules(regrasMapeadas);
          setCanais(Array.from(new Set([...INITIAL_CHANNELS, ...regrasData.map((r: any) => r.canal)])));
        }

      } catch (error) {
        console.error("Erro ao carregar dados do Supabase:", error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    carregarBancoDeDados();
  }, []);

  useEffect(() => { 
    if (isAuthLoaded) { 
      if (currentUser) localStorage.setItem('bestfit_session', JSON.stringify(currentUser)); 
      else localStorage.removeItem('bestfit_session'); 
    } 
  }, [currentUser, isAuthLoaded]);

  return (
    <AppContext.Provider value={{
      canais, setCanais, products, setProducts, sales, setSales, adsData, setAdsData, flexData, setFlexData, goals, setGoals,
      faturados, setFaturados, cancelados, setCancelados,
      channelRules, setChannelRules, isAdminUnlocked, setIsAdminUnlocked, logs, setLogs, addLog,
      currentUser, setCurrentUser, isAuthLoaded, users, setUsers, channelLogos, setChannelLogos, isDataLoaded
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);