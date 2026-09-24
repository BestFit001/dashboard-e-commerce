'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function UsuariosPage() {
  const { users, setUsers, currentUser } = useAppContext();
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;
    if (users.find((u: any) => u.username === newUsername.trim())) {
      alert('Este usuário já existe.');
      return;
    }
    setUsers([...users, { username: newUsername.trim(), password: newPassword.trim(), role: newRole }]);
    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
    alert('Usuário cadastrado com sucesso!');
  };

  const handleRemoveUser = (username: string) => {
    if (username === currentUser.username) {
      alert('Você não pode excluir a si mesmo enquanto está logado.');
      return;
    }
    setUsers(users.filter((u: any) => u.username !== username));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold text-white mb-1">Gestão de Usuários e Níveis de Acesso</h2>
        <p className="text-xs text-slate-400 mb-6">Adicione utilizadores e defina se têm acesso total (Admin) ou apenas visualização (User).</p>

        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-950 p-4 rounded-xl border border-slate-800 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">E-mail / Utilizador</label>
            <input type="text" placeholder="ex: Joao@usebestfit.com.br" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-indigo-500" required />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Senha</label>
            <input type="password" placeholder="Senha de acesso" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-indigo-500" required />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Nível de Permissão</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-purple-300 font-bold outline-none cursor-pointer">
              <option value="user">Visualizador (Apenas Dashboard)</option>
              <option value="admin">Administrador (Acesso Total)</option>
            </select>
          </div>
          <div>
            <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-600/20">
              Cadastrar Usuário
            </button>
          </div>
        </form>

        <h3 className="font-bold text-white text-sm mb-4">Utilizadores com Acesso Ativo</h3>
        <div className="space-y-3">
          {users.map((u: any) => (
            <div key={u.username} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
                  <i className={`fa-solid ${u.role === 'admin' ? 'fa-shield-halved' : 'fa-user'}`}></i>
                </div>
                <div>
                  <span className="font-bold text-white text-xs block">{u.username}</span>
                  <span className={`text-[10px] font-bold uppercase ${u.role === 'admin' ? 'text-purple-400' : 'text-slate-400'}`}>
                    {u.role === 'admin' ? 'Administrador' : 'Visualizador'}
                  </span>
                </div>
              </div>
              <button onClick={() => handleRemoveUser(u.username)} className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs rounded-lg transition">
                Remover
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}