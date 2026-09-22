'use client';
import React, { useState } from 'react';
import { useAppContext, CHANNELS } from '@/context/AppContext';

export default function RegrasPage() {
  const { channelRules, setChannelRules, addLog } = useAppContext();
  const [editingChannel, setEditingChannel] = useState(CHANNELS[0]);
  
  const currentRule = channelRules.find((r: any) => r.canal === editingChannel) || {
    canal: editingChannel,
    colIdPedido: 'A',
    colSku: 'B',
    colRebate: 'C',
    colLiquido: 'D',
    formulaExcel: 'D2 - C2'
  };

  const [ruleFormData, setRuleFormData] = useState(currentRule);

  const handleSelectChannel = (ch: string) => {
    setEditingChannel(ch);
    const existing = channelRules.find((r: any) => r.canal === ch);
    setRuleFormData(existing || {
      canal: ch,
      colIdPedido: 'A',
      colSku: 'B',
      colRebate: 'C',
      colLiquido: 'D',
      formulaExcel: 'D2 - C2'
    });
  };

  const saveRule = () => {
    setChannelRules((prev: any[]) => {
      const idx = prev.findIndex(r => r.canal === editingChannel);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...ruleFormData, canal: editingChannel };
        return updated;
      }
      return [...prev, { ...ruleFormData, canal: editingChannel }];
    });
    addLog(`Regras e colunas salvas para [${editingChannel}].`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white">Parametrização de Colunas e Fórmulas ({editingChannel})</h2>
          <p className="text-xs text-slate-400 mt-0.5">Mapeie as colunas de PDV, SKU, Cupom/Rebate e Líquido conforme a planilha do canal.</p>
        </div>
        <button onClick={saveRule} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition">
          Salvar Regra do Canal
        </button>
      </div>
      
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {CHANNELS.map(ch => (
            <button
              key={ch}
              onClick={() => handleSelectChannel(ch)}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border ${
                editingChannel === ch
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Coluna PDV / ID Pedido</label>
            <input
              type="text"
              value={ruleFormData.colIdPedido || 'A'}
              onChange={e => setRuleFormData({...ruleFormData, colIdPedido: e.target.value.toUpperCase()})}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold text-center uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Coluna SKU</label>
            <input
              type="text"
              value={ruleFormData.colSku || 'B'}
              onChange={e => setRuleFormData({...ruleFormData, colSku: e.target.value.toUpperCase()})}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold text-center uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Coluna Cupom / Rebate</label>
            <input
              type="text"
              value={ruleFormData.colRebate || 'C'}
              onChange={e => setRuleFormData({...ruleFormData, colRebate: e.target.value.toUpperCase()})}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 font-mono font-bold text-center uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Coluna Valor Líquido</label>
            <input
              type="text"
              value={ruleFormData.colLiquido || 'D'}
              onChange={e => setRuleFormData({...ruleFormData, colLiquido: e.target.value.toUpperCase()})}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono font-bold text-center uppercase"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-2">
           <label className="block text-xs font-bold text-slate-200">Fórmula de Apuração do Líquido Final:</label>
           <input
             type="text"
             value={ruleFormData.formulaExcel || 'D2 - C2'}
             onChange={e => setRuleFormData({...ruleFormData, formulaExcel: e.target.value})}
             placeholder="Ex: D2 - C2 (Líquido menos Rebate)"
             className="w-full p-3 bg-slate-950 border border-purple-500/40 rounded-xl font-mono text-purple-300 font-bold text-sm"
           />
           <span className="text-[10px] text-slate-500 block">Utilize as letras das colunas mapeadas acima para calcular o valor final que será integrado no dashboard.</span>
        </div>
      </div>
    </div>
  );
}