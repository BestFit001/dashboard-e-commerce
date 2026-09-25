'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function UsuariosPage() {
  const { users, setUsers, addLog } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const cleanEmail = email.trim().toLowerCase();

    if (users.some((u: any) => u.username === cleanEmail)) {
      addLog(`O utilizador ${cleanEmail} já existe.`, 'error');
      return;
    }

    setIsSaving(true);
    const newUser = { username: cleanEmail, password: password.trim(), role };

    // 1. Grava no Supabase (Nuvem)
    const { error } = await supabase.from('tb_usuarios').upsert([newUser]);

    if (error) {
      addLog(`Erro ao salvar utilizador na nuvem: ${error.message}`, 'error');
      setIsSaving(false);
      return;
    }

    // 2. Atualiza estado visual
    setUsers((prev: any[]) => [...prev, newUser]);
    addLog(`Utilizador ${cleanEmail} cadastrado com sucesso.`, 'success');
    
    setEmail('');
    setPassword('');
    setRole('user');
    setIsSaving(false);
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
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Gestão de Utilizadores e Níveis de Acesso</h2>
          <p className="text-xs text-slate-400 mt-1">Adicione utilizadores e defina se têm acesso total (Admin) ou apenas visualização (User).</p>
        </div>

        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">E-mail / Utilizador</label>
            <input 
              type="email" 
              required 
              placeholder="ex: joao@usebestfit.com.br" 
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
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Nível de Permissão</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value)} 
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value="user">Visualizador (Apenas Dashboard)</option>
              <option value="admin">Administrador (Acesso Total)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-user-plus"></i> {isSaving ? 'A Guardar...' : 'Cadastrar Utilizador'}
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
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${u.role === 'admin' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'bg-slate-800 text-slate-300'}`}>
                  <i className={`fa-solid ${u.role === 'admin' ? 'fa-shield-halved' : 'fa-user'}`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{u.username}</h4>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'text-purple-400' : 'text-slate-400'}`}>
                    {u.role === 'admin' ? 'Administrador' : 'Visualizador'}
                  </span>
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