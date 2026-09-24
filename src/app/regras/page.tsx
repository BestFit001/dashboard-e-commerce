'use client';
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function RegrasPage() {
  const { canais, setCanais, channelRules, setChannelRules, addLog } = useAppContext();
  
  const [editingChannel, setEditingChannel] = useState('');
  const [ruleFormData, setRuleFormData] = useState<any>(null);
  const [novoCanal, setNovoCanal] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Sincroniza o UI após o carregamento (F5)
  useEffect(() => {
    if (canais.length > 0 && !editingChannel) {
      setEditingChannel(canais[0]);
      const existing = channelRules.find((r: any) => r.canal === canais[0]);
      setRuleFormData(existing || { canal: canais[0], colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2 - (C2 * 12%)' });
    }
  }, [canais, channelRules, editingChannel]);

  const handleSelectChannel = (ch: string) => {
    setEditingChannel(ch);
    const existing = channelRules.find((r: any) => r.canal === ch);
    setRuleFormData(existing || { canal: ch, colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2 - (C2 * 12%)' });
    setIsSaved(false);
  };

  const saveRule = async () => {
    if (!editingChannel || !ruleFormData) return;

    const newData = { ...ruleFormData, canal: editingChannel };

    // 1. Atualiza a Memória e o LocalStorage imediatamente
    setChannelRules((prev: any[]) => {
      const idx = prev.findIndex(r => r.canal === editingChannel);
      if (idx >= 0) { 
         const updated = [...prev]; 
         updated[idx] = newData; 
         return updated; 
      }
      return [...prev, newData];
    });

    // 2. Atualiza o Supabase (Se configurado)
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const dbData = {
          canal: newData.canal,
          col_id_pedido: newData.colIdPedido,
          col_sku: newData.colSku,
          col_estado: newData.colEstado,
          col_quantidade: newData.colQuantidade,
          formula_excel: newData.formulaExcel
        };
        await supabase.from('tb_regras_canais').upsert([dbData]);
      }
    } catch (e) {
      console.warn("Aviso: Supabase não salvou, mas os dados estão seguros na memória do navegador.", e);
    }
    
    addLog(`Regras salvas para [${editingChannel}].`, 'success');
    
    // Feedback visual
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const adicionarCanal = () => {
    if (novoCanal.trim() && !canais.includes(novoCanal.trim())) {
      const nome = novoCanal.trim();
      setCanais([...canais, nome]);
      
      const newRule = { canal: nome, colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2' };
      setChannelRules([...channelRules, newRule]);
      
      setNovoCanal('');
      addLog(`Novo canal criado com sucesso: ${nome}`, 'success');
      
      setEditingChannel(nome);
      setRuleFormData(newRule);
      setIsSaved(false);
    }
  };

  if (!editingChannel || !ruleFormData) return <div className="p-8 text-white">Carregando regras...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <h2 className="text-xl font-bold text-white">Parametrização de Fórmulas</h2>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <input 
            type="text" 
            placeholder="Nome do Novo Canal..." 
            value={novoCanal} 
            onChange={e => setNovoCanal(e.target.value)} 
            className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 flex-1 sm:flex-none" 
          />
          <button onClick={adicionarCanal} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition">
            Criar Canal
          </button>
          <button 
            onClick={saveRule} 
            className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 ${
              isSaved 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30'
            }`}
          >
            {isSaved ? <><i className="fa-solid fa-check"></i> Salvo!</> : 'Salvar Regra'}
          </button>
        </div>
      </div>
      
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex flex-wrap gap-2">
          {canais.map((ch: string) => (
            <button 
              key={ch} 
              onClick={() => handleSelectChannel(ch)} 
              className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                editingChannel === ch 
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md' 
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
        
        <div className="pt-4 border-t border-slate-800">
           <label className="block text-xs font-bold text-slate-200 mb-2">Expressão Excel ({editingChannel}):</label>
           <input 
             type="text" 
             value={ruleFormData.formulaExcel || ''} 
             onChange={e => setRuleFormData({...ruleFormData, formulaExcel: e.target.value})} 
             placeholder="Ex: C2 - (C2 * 12%)" 
             className="w-full p-3.5 bg-slate-950 border border-purple-500/40 rounded-xl font-mono text-purple-300 font-bold focus:outline-none focus:border-purple-400" 
           />
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mapeamento das Colunas (Avançado):</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna ID Pedido</label>
              <input type="text" value={ruleFormData.colIdPedido || 'A'} onChange={e => setRuleFormData({...ruleFormData, colIdPedido: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna SKU</label>
              <input type="text" value={ruleFormData.colSku || 'B'} onChange={e => setRuleFormData({...ruleFormData, colSku: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna Estado (UF)</label>
              <input type="text" value={ruleFormData.colEstado || 'E'} onChange={e => setRuleFormData({...ruleFormData, colEstado: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna Quantidade</label>
              <input type="text" value={ruleFormData.colQuantidade || 'G'} onChange={e => setRuleFormData({...ruleFormData, colQuantidade: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}