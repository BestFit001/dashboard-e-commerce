'use client';
import React, { useState } from 'react';
import { useAppContext, CHANNELS } from '@/context/AppContext';

export default function RegrasPage() {
  const { channelRules, setChannelRules, addLog } = useAppContext();
  const [editingChannel, setEditingChannel] = useState(CHANNELS[0]);
  const [ruleFormData, setRuleFormData] = useState(channelRules[0]);

  const handleSelectChannel = (ch: string) => {
    setEditingChannel(ch);
    const existing = channelRules.find((r: any) => r.canal === ch);
    setRuleFormData(existing || { canal: ch, colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2 - (C2 * 12%)' });
  };

  const saveRule = () => {
    setChannelRules((prev: any[]) => {
      const idx = prev.findIndex(r => r.canal === editingChannel);
      if (idx >= 0) { const updated = [...prev]; updated[idx] = { ...ruleFormData, canal: editingChannel }; return updated; }
      return [...prev, { ...ruleFormData, canal: editingChannel }];
    });
    addLog(`Fórmula salva para [${editingChannel}].`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold text-white">Parametrização de Fórmulas</h2>
        <button onClick={saveRule} className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl">Salvar Regra</button>
      </div>
      
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {CHANNELS.map(ch => (
            <button key={ch} onClick={() => handleSelectChannel(ch)} className={`py-2 px-3 rounded-xl text-xs font-bold ${editingChannel === ch ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-400'}`}>
              {ch}
            </button>
          ))}
        </div>
        <div>
           <label className="block text-xs font-bold text-slate-200 mb-2">Expressão Excel:</label>
           <input type="text" value={ruleFormData.formulaExcel} onChange={e => setRuleFormData({...ruleFormData, formulaExcel: e.target.value})} className="w-full p-3 bg-slate-950 border border-purple-500/40 rounded-xl font-mono text-purple-300 font-bold" />
        </div>
      </div>
    </div>
  );
}