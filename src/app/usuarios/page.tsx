'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

const LISTA_PAINEIS = [
  { id: 'dashboard', label: 'Dashboard Principal' },
  { id: 'produtos', label: 'Análise de Produtos (ABC)' },
  { id: 'skus', label: 'SKUs & Custos' },
  { id: 'regras', label: 'Regras de Canais' },
  { id: 'admin', label: 'Central Admin (Importações)' },
  { id: 'usuarios', label: 'Gestão de Utilizadores' },
];

export default function UsuariosPage() {
  const { users, setUsers, addLog } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargo, setCargo] = useState('Analistas');
  const [permissoes, setPermissoes] = useState<string[]>(['dashboard']); // Inicia apenas com o Dashboard marcado
  const [isSaving, setIsSaving] = useState(false);

  const handleTogglePermissao = (id: string) => {
    setPermissoes(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const cleanEmail = email.trim().toLowerCase();

    if (users.some((u: any) => u.username === cleanEmail)) {
      alert(`O utilizador ${cleanEmail} já existe.`);
      return;
    }

    setIsSaving(true);
    const newUser = { 
      username: cleanEmail, 
      password: password.trim(), 
      cargo, 
      permissoes,
      role: cargo === 'Gerência' ? 'admin' : 'user'
    };

    const { error } = await supabase.from('tb_usuarios').upsert([newUser], { onConflict: 'username' });

    if (error) {
      alert(`Erro ao salvar no Supabase: ${error.message}`);
      setIsSaving(false);
      return;
    }

    setUsers((prev: any[]) => [...prev, newUser]);
    addLog(`Utilizador ${cleanEmail} (${cargo}) cadastrado com sucesso.`, 'success');
    
    setEmail('');
    setPassword('');
    setCargo('Analistas');
    setPermissoes(['dashboard']);
    setIsSaving(false);
    alert('Utilizador cadastrado com sucesso!');
  };

  const handleDeleteUser = async (username: string) => {
    if (username === 'gisele@usebestfit.com.br') {
      alert('Não é possível remover o administrador principal.');
      return;
    }

    if (confirm(`Tem a certeza que deseja remover o acesso de ${username}?`)) {
      setUsers((prev: any[]) => prev.filter((u: any) => u.username !== username));
      await supabase.from('tb_usuarios').delete().eq('username', username);
      addLog(`Utilizador ${username} removido com sucesso.`, 'warning');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Gestão por Cargos e Permissões de Acesso</h2>
          <p className="text-xs text-slate-400 mt-1">Cadastre utilizadores, defina o cargo corporativo e selecione exatamente quais abas cada um pode aceder.</p>
        </div>

        <form onSubmit={handleAddUser} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">E-mail / Utilizador</label>
              <input 
                type="email" 
                required 
                placeholder="ex: analista@usebestfit.com.br" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Senha</label>
              <input 
                type="text" 
                required 
                placeholder="Senha de acesso" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Cargo Corporativo</label>
              <select 
                value={cargo} 
                onChange={e => setCargo(e.target.value)} 
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-bold cursor-pointer"
              >
                <option value="Gerência" className="bg-slate-900">Gerência</option>
                <option value="Analistas" className="bg-slate-900">Analistas</option>
                <option value="Vendedoras" className="bg-slate-900">Vendedoras</option>
                <option value="Outros" className="bg-slate-900">Outros</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">Painéis com Acesso Liberado:</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              {LISTA_PAINEIS.map(painel => (
                <label key={painel.id} className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 font-medium select-none">
                  <input 
                    type="checkbox" 
                    checked={permissoes.includes(painel.id)}
                    onChange={() => handleTogglePermissao(painel.id)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  {painel.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="py-3 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-user-plus"></i> {isSaving ? 'A Guardar...' : 'Cadastrar Utilizador com Permissões'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <h3 className="font-bold text-white text-sm">Utilizadores com Acesso Ativo</h3>
        
        <div className="space-y-3">
          {users.map((u: any) => (
            <div key={u.username} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <i className="fa-solid fa-user-shield"></i>
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{u.username}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                    {u.cargo || 'Cargo não definido'}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(u.permissoes || ['dashboard']).map((p: string) => (
                      <span key={p} className="px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded text-[9px] font-mono border border-slate-800">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {u.username !== 'gisele@usebestfit.com.br' && (
                <button 
                  onClick={() => handleDeleteUser(u.username)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-lg transition"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}