'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

export const BRAZIL_STATES = ['TODOS', 'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
const INITIAL_CHANNELS = ['Mercado Livre 1', 'Mercado Livre 2', 'Amazon', 'Magalu', 'Shopee', 'TikTok', 'Shein', 'Netshoes', 'Site', 'Loja física'];

const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // Autenticação com o novo utilizador padrão
  const [users, setUsers] = useState([{ username: 'Gisele@usebestfit.com.br', password: 'Best2026**' }]);
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
  const [logs, setLogs] = useState([{ id: 1, timestamp: new Date().toLocaleTimeString(), message: 'Sistema flexível inicializado.', type: 'info' }]);

  const addLog = (message: string, type = 'info') => {
    setLogs((prev: any[]) => [{ id: Date.now(), timestamp: new Date().toLocaleTimeString(), message, type }, ...prev.slice(0, 49)]);
  };

  // Carregar dados salvos do navegador
  useEffect(() => {
    const savedUsers = localStorage.getItem('apex_users');
    const savedSession = localStorage.getItem('apex_session');
    
    if (savedUsers) {
      const parsedUsers = JSON.parse(savedUsers);
      // Impede que o 'admin' antigo sobreponha o novo login caso já esteja no cache do seu navegador
      if (parsedUsers.length === 1 && parsedUsers[0].username === 'admin') {
         localStorage.removeItem('apex_users'); // Força a limpeza
      } else {
         setUsers(parsedUsers);
      }
    }
    if (savedSession) setCurrentUser(JSON.parse(savedSession));
    setIsAuthLoaded(true);
  }, []);

  // Salvar alterações de utilizadores no navegador
  useEffect(() => {
    if (isAuthLoaded) localStorage.setItem('apex_users', JSON.stringify(users));
  }, [users, isAuthLoaded]);

  // Salvar sessão ativa
  useEffect(() => {
    if (isAuthLoaded) {
      if (currentUser) localStorage.setItem('apex_session', JSON.stringify(currentUser));
      else localStorage.removeItem('apex_session');
    }
  }, [currentUser, isAuthLoaded]);

  return (
    <AppContext.Provider value={{
      users, setUsers, currentUser, setCurrentUser, isAuthLoaded,
      canais, setCanais, products, setProducts, sales, setSales, adsData, setAdsData, flexData, setFlexData,
      goals, setGoals, faturados, setFaturados, cancelados, setCancelados, channelLogos, setChannelLogos,
      channelRules, setChannelRules, isAdminUnlocked, setIsAdminUnlocked, logs, setLogs, addLog
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);