'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function UsuariosPage() {
  const { users, setUsers, currentUser } = useAppContext();
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;
    if (users.find((u: any) => u.username === newUsername.trim())) {
      alert('Usuário já existe.');
      return;
    }
    setUsers([...users, { username: newUsername.trim(), password: newPassword.trim() }]);
    setNewUsername('');
    setNewPassword('');
  };

  const handleRemoveUser = (username: string) => {
    if (username === currentUser.username) {
      alert('Você não pode excluir a si mesmo.');
      return;
    }
    setUsers(users.filter((u: any) => u.username !== username));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold text-white mb-2">Gestão de Usuários</h2>
        <p className="text-xs text-slate-400 mb-6">Cadastre quem pode acessar o sistema.</p>

        <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-4 mb-8 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <input type="text" placeholder="Nome de usuário (ex: Leila@usebestfit.com.br)" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="flex-1 p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition" required />
          <input type="password" placeholder="Senha" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="flex-1 p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition" required />
          <button type="submit" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition">Adicionar</button>
        </form>

        <h3 className="font-bold text-white mb-4">Usuários Ativos</h3>
        <div className="space-y-2">
          {users.map((u: any) => (
            <div key={u.username} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-user text-indigo-400"></i>
                <span className="font-bold text-white">{u.username}</span>
              </div>
              <button onClick={() => handleRemoveUser(u.username)} className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs rounded-lg transition">Excluir</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}