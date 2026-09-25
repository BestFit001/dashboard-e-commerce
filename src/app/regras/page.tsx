'use client';
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function RegrasPage() {
  const { canais, setCanais, channelRules, setChannelRules, goals, setGoals, addLog } = useAppContext();
  
  const [editingChannel, setEditingChannel] = useState('');
  const [ruleFormData, setRuleFormData] = useState<any>(null);
  const [novoCanal, setNovoCanal] = useState('');
  
  const [isSaved, setIsSaved] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [metaMes, setMetaMes] = useState(new Date().toISOString().slice(0, 7)); 
  const [metaValor, setMetaValor] = useState<number | string>(0);

  useEffect(() => { if (canais.length > 0 && !editingChannel) handleSelectChannel(canais[0]); }, [canais, editingChannel]);

  const handleSelectChannel = (ch: string) => {
    setEditingChannel(ch);
    const existingRule = channelRules.find((r: any) => r.canal === ch) || { canal: ch, colIdPedido: 'A', colSku: 'B', colEstado: 'C', colPdv: 'D', colQuantidade: 'G', formulaExcel: 'D2 - (D2 * 12%)', responsavel: 'Equipe Best Fit', logo_url: '' };
    setRuleFormData(existingRule);
    carregarMeta(ch, metaMes);
    setIsSaved(false);
  };

  const carregarMeta = (canal: string, mes: string) => {
    const existingGoal = goals.find((g: any) => g.canal === canal && g.mes_referencia === mes);
    setMetaValor(existingGoal ? existingGoal.meta_valor : 0);
  };

  const handleMesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoMes = e.target.value;
    setMetaMes(novoMes);
    carregarMeta(editingChannel, novoMes);
  };

  const handleLogoUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRuleFormData({ ...ruleFormData, logo_url: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const saveRule = async () => {
    if (!editingChannel || !ruleFormData) return;
    setIsProcessing(true);

    const newData = { ...ruleFormData, canal: editingChannel };
    const valorNumerico = parseFloat(String(metaValor).replace(',', '.')) || 0;

    try {
      // 1. Salva a Regra e o Logo na Nuvem
      const { error: rulesError } = await supabase.from('tb_regras_canais').upsert([{
        canal: newData.canal, col_id_pedido: newData.colIdPedido, col_sku: newData.colSku,
        col_estado: newData.colEstado, col_quantidade: newData.colQuantidade, col_pdv: newData.colPdv, 
        formula_excel: newData.formulaExcel, responsavel: newData.responsavel, logo_url: newData.logo_url
      }], { onConflict: 'canal' });

      if (rulesError) throw rulesError;

      // 2. Salva a Meta Histórica na Nuvem
      const { error: goalsError } = await supabase.from('tb_metas').upsert([{
        canal: editingChannel,
        mes_referencia: metaMes,
        meta_valor: valorNumerico,
        responsavel: newData.responsavel
      }], { onConflict: 'canal, mes_referencia' });

      if (goalsError) throw goalsError;

      // 3. Se passou pela nuvem sem erros, atualiza a tela
      setChannelRules((prev: any[]) => {
        const idx = prev.findIndex(r => r.canal === editingChannel);
        return idx >= 0 ? [...prev.slice(0, idx), newData, ...prev.slice(idx + 1)] : [...prev, newData];
      });

      const goalData = { canal: editingChannel, mes_referencia: metaMes, meta_valor: valorNumerico, responsavel: newData.responsavel };
      setGoals((prev: any[]) => [...prev.filter(g => !(g.canal === editingChannel && g.mes_referencia === metaMes)), goalData]);

      addLog(`Sucesso! Regras e Metas de [${editingChannel}] enviadas para a nuvem.`, 'success');
      setIsSaved(true); 
      setTimeout(() => setIsSaved(false), 2500);

    } catch (e: any) {
      alert(`Erro crítico ao tentar salvar no banco de dados.\n\nDetalhes:\n${e.message}\n\nVocê rodou o código SQL no painel do Supabase?`);
      addLog(`Erro Supabase: ${e.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!editingChannel || !ruleFormData) return <div className="p-8 text-white">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 mb-6">
        {canais.map((ch: string) => (
          <button key={ch} onClick={() => handleSelectChannel(ch)} className={`py-2 px-4 rounded-xl text-xs font-bold transition border ${editingChannel === ch ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}`}>{ch}</button>
        ))}
        <div className="flex gap-2 ml-auto">
          <input type="text" placeholder="Novo Canal..." value={novoCanal} onChange={e => setNovoCanal(e.target.value)} className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white" />
          <button onClick={() => { if(novoCanal.trim() && !canais.includes(novoCanal.trim())) { setCanais([...canais, novoCanal.trim()]); setNovoCanal(''); } }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition">Adicionar</button>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2"><i className="fa-solid fa-image text-purple-400 mr-2"></i>Logo do Canal</label>
              <div className="flex items-center gap-4">
                {ruleFormData.logo_url ? <img src={ruleFormData.logo_url} alt="Logo" className="w-16 h-16 rounded-xl bg-white p-1 object-contain border border-slate-700 shadow-lg" /> : <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 text-[10px] font-bold">LOGO</div>}
                <input type="file" onChange={handleLogoUpload} accept="image/*" className="text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer transition" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Responsável pelo Canal:</label>
              <input type="text" value={ruleFormData.responsavel || ''} onChange={e => setRuleFormData({...ruleFormData, responsavel: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-purple-500 focus:outline-none transition" placeholder="Ex: Equipe Best Fit" />
            </div>
          </div>

          <div className="space-y-6 bg-slate-950/50 p-5 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2"><i className="fa-regular fa-calendar text-indigo-400 mr-2"></i>Mês de Referência (Histórico da Meta):</label>
              <input type="month" value={metaMes} onChange={handleMesChange} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-indigo-300 font-bold focus:border-indigo-500 focus:outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2"><i className="fa-solid fa-bullseye text-emerald-400 mr-2"></i>Meta de Faturamento (R$) para o mês selecionado:</label>
              <input type="text" value={metaValor} onChange={e => setMetaValor(e.target.value)} placeholder="0.00" className="w-full p-3 bg-slate-950 border border-emerald-500/30 rounded-xl text-sm text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none transition" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
           <label className="block text-xs font-bold text-slate-300 mb-2">Fórmula de Apuração (Ex: D2 - (D2 * 0.12)):</label>
           <input type="text" value={ruleFormData.formulaExcel || ''} onChange={e => setRuleFormData({...ruleFormData, formulaExcel: e.target.value})} className="w-full p-4 bg-slate-950 border border-purple-500/40 rounded-xl font-mono text-purple-300 font-bold focus:border-purple-500 focus:outline-none transition" />
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mapeamento das 5 Colunas Foco:</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><label className="block text-[11px] font-bold text-slate-400 mb-1">ID Pedido</label><input type="text" value={ruleFormData.colIdPedido || 'A'} onChange={e => setRuleFormData({...ruleFormData, colIdPedido: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono text-center" /></div>
            <div><label className="block text-[11px] font-bold text-slate-400 mb-1">SKU</label><input type="text" value={ruleFormData.colSku || 'B'} onChange={e => setRuleFormData({...ruleFormData, colSku: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono text-center" /></div>
            <div><label className="block text-[11px] font-bold text-rose-400 mb-1">Cupom/Estado</label><input type="text" value={ruleFormData.colEstado || 'C'} onChange={e => setRuleFormData({...ruleFormData, colEstado: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-rose-900 rounded-xl text-xs text-rose-400 font-mono text-center" /></div>
            <div><label className="block text-[11px] font-bold text-amber-400 mb-1">Preço Venda (PDV)</label><input type="text" value={ruleFormData.colPdv || 'D'} onChange={e => setRuleFormData({...ruleFormData, colPdv: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-amber-400 font-mono text-center" /></div>
            <div><label className="block text-[11px] font-bold text-cyan-400 mb-1">Quantidade</label><input type="text" value={ruleFormData.colQuantidade || 'E'} onChange={e => setRuleFormData({...ruleFormData, colQuantidade: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-cyan-900 rounded-xl text-xs text-cyan-400 font-mono text-center" /></div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
           <button onClick={saveRule} disabled={isProcessing} className={`px-8 py-3 font-bold text-sm rounded-xl transition shadow-lg ${isProcessing ? 'bg-slate-700 cursor-wait' : isSaved ? 'bg-emerald-500 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'}`}>
             {isProcessing ? 'Enviando para a Nuvem...' : isSaved ? 'Regras e Metas Salvas!' : 'Salvar Alterações na Nuvem'}
           </button>
        </div>
      </div>
    </div>
  );
}