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
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Sincronização global Supabase ativa.', type: 'info' }]);

  // Gestão de Utilizadores Global
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
    // Mantém apenas a sessão ativa localmente para não obrigar login a cada F5
    const savedSession = localStorage.getItem('bestfit_session');
    if (savedSession) { try { setCurrentUser(JSON.parse(savedSession)); } catch (e) {} }
    setIsAuthLoaded(true);

    // Puxa TUDO da Nuvem (Supabase) para que qualquer app veja os mesmos dados
    const carregarBancoDeDados = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

        // 1. Utilizadores da Nuvem
        const { data: usersData } = await supabase.from('tb_usuarios').select('*');
        if (usersData && usersData.length > 0) setUsers(usersData);

        // 2. Produtos e Custos
        const { data: skusData } = await supabase.from('tb_produtos').select('*');
        if (skusData) setProducts(skusData);

        // 3. Regras de Canais
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

        // 4. Metas
        const { data: metasData } = await supabase.from('tb_metas').select('*');
        if (metasData) setGoals(metasData);

        // 5. Vendas (Admin)
        const { data: vendasData } = await supabase.from('tb_vendas').select('*');
        if (vendasData) setSales(vendasData);

        // 6. Faturados (Admin)
        const { data: faturadosData } = await supabase.from('tb_faturados').select('*');
        if (faturadosData) setFaturados(faturadosData);

        // 7. Cancelados (Admin)
        const { data: canceladosData } = await supabase.from('tb_cancelados').select('*');
        if (canceladosData) setCancelados(canceladosData);

        // 8. Frete Flex (Admin)
        const { data: flexDataDb } = await supabase.from('tb_flex').select('*');
        if (flexDataDb) setFlexData(flexDataDb);

        // 9. Ads (Admin)
        const { data: adsDataDb } = await supabase.from('tb_ads').select('*');
        if (adsDataDb) setAdsData(adsDataDb);

      } catch (error) {
        console.error("Erro ao carregar dados do Supabase:", error);
      }
    };
    carregarBancoDeDados();
  }, []);

  // Salva sessão localmente
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
      currentUser, setCurrentUser, isAuthLoaded, users, setUsers, channelLogos, setChannelLogos
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);