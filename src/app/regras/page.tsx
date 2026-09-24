'use client';
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function RegrasPage() {
  const { canais, setCanais, channelRules, setChannelRules, channelLogos, setChannelLogos, addLog } = useAppContext();
  
  const [editingChannel, setEditingChannel] = useState('');
  const [ruleFormData, setRuleFormData] = useState<any>(null);
  const [novoCanal, setNovoCanal] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (canais.length > 0 && !editingChannel) {
      setEditingChannel(canais[0]);
      const existing = channelRules.find((r: any) => r.canal === canais[0]);
      setRuleFormData(existing || { canal: canais[0], responsavel: 'Equipe Best Fit', colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2 - (C2 * 12%)' });
    }
  }, [canais, channelRules, editingChannel]);

  const handleSelectChannel = (ch: string) => {
    setEditingChannel(ch);
    const existing = channelRules.find((r: any) => r.canal === ch);
    setRuleFormData(existing || { canal: ch, responsavel: 'Equipe Best Fit', colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2 - (C2 * 12%)' });
    setIsSaved(false);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingChannel) return;
    setIsUploading(true);
    addLog(`A iniciar upload do logo para ${editingChannel}...`, 'info');

    const fileExt = file.name.split('.').pop();
    const fileName = `${editingChannel.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file);
    if (uploadError) {
      alert(`FALHA NO UPLOAD:\n${uploadError.message}`);
      addLog(`Erro upload: ${uploadError.message}`, 'error');
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);

    const { error: dbError } = await supabase.from('tb_regras_canais').update({ logo_url: publicUrl }).eq('canal', editingChannel);
    if (dbError) {
      // Se a linha ainda não existir na tabela, faz upsert
      await supabase.from('tb_regras_canais').upsert([{ canal: editingChannel, logo_url: publicUrl }]);
    }

    setChannelLogos((prev: any) => ({ ...prev, [editingChannel]: publicUrl }));
    addLog(`Logo de ${editingChannel} guardado com sucesso!`, 'success');
    setIsUploading(false);
  };

  const saveRule = async () => {
    if (!editingChannel || !ruleFormData) return;
    const newData = { ...ruleFormData, canal: editingChannel };

    setChannelRules((prev: any[]) => {
      const idx = prev.findIndex(r => r.canal === editingChannel);
      if (idx >= 0) { const updated = [...prev]; updated[idx] = newData; return updated; }
      return [...prev, newData];
    });

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const dbData = {
          canal: newData.canal,
          responsavel: newData.responsavel || 'Equipe Best Fit',
          col_id_pedido: newData.colIdPedido,
          col_sku: newData.colSku,
          col_estado: newData.colEstado,
          col_quantidade: newData.colQuantidade,
          formula_excel: newData.formulaExcel,
          logo_url: channelLogos[editingChannel] || null
        };
        await supabase.from('tb_regras_canais').upsert([dbData], { onConflict: 'canal' });
      }
    } catch (e) {
      console.error(e);
    }
    
    addLog(`Regras e responsável salvos para [${editingChannel}].`, 'success');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const adicionarCanal = () => {
    if (novoCanal.trim() && !canais.includes(novoCanal.trim())) {
      const nome = novoCanal.trim();
      setCanais([...canais, nome]);
      const newRule = { canal: nome, responsavel: 'Equipe Best Fit', colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2' };
      setChannelRules([...channelRules, newRule]);
      setNovoCanal('');
      addLog(`Novo canal criado: ${nome}`, 'success');
      setEditingChannel(nome);
      setRuleFormData(newRule);
      setIsSaved(false);
    }
  };

  if (!editingChannel || !ruleFormData) return <div className="p-8 text-white">Carregando regras...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Parametrização de Fórmulas & Canais</h2>
          <p className="text-xs text-slate-400 mt-0.5">Configure colunas, responsáveis, fórmulas de repasse e identidades visuais.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <input type="text" placeholder="Nome do Novo Canal..." value={novoCanal} onChange={e => setNovoCanal(e.target.value)} className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 flex-1 sm:flex-none" />
          <button onClick={adicionarCanal} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition">Criar Canal</button>
          <button onClick={saveRule} className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 ${isSaved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30'}`}>
            {isSaved ? <><i className="fa-solid fa-check"></i> Salvo!</> : 'Salvar Regra'}
          </button>
        </div>
      </div>
      
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex flex-wrap gap-2">
          {canais.map((ch: string) => (
            <button key={ch} onClick={() => handleSelectChannel(ch)} className={`py-2 px-3.5 rounded-xl text-xs font-bold transition border ${editingChannel === ch ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'}`}>
              {ch}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
           <div className="flex items-center gap-5">
             {channelLogos[editingChannel] ? (
               <img src={channelLogos[editingChannel]} alt="Logo" className="w-16 h-16 rounded-xl bg-white object-contain p-1 border border-slate-700 shadow-md" />
             ) : (
               <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 text-[10px] font-bold">Sem Logo</div>
             )}
             <div>
               <label className="block text-xs font-bold text-slate-300 mb-1">Logo do Canal ({editingChannel})</label>
               <input type="file" accept="image/*" onChange={handleUploadLogo} disabled={isUploading} className="text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600/20 file:text-indigo-400 hover:file:bg-indigo-600/30 cursor-pointer" />
               {isUploading && <span className="text-[10px] text-indigo-400 ml-2 animate-pulse font-bold">Enviando...</span>}
             </div>
           </div>

           <div>
             <label className="block text-xs font-bold text-slate-200 mb-1">Responsável pelo Canal:</label>
             <input type="text" value={ruleFormData.responsavel || ''} onChange={e => setRuleFormData({...ruleFormData, responsavel: e.target.value})} placeholder="Ex: Gisele / Carlos Eduardo" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500" />
           </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
           <label className="block text-xs font-bold text-slate-200 mb-2">Expressão Excel de Cálculo ({editingChannel}):</label>
           <input type="text" value={ruleFormData.formulaExcel || ''} onChange={e => setRuleFormData({...ruleFormData, formulaExcel: e.target.value})} placeholder="Ex: C2 - (C2 * 12%)" className="w-full p-3.5 bg-slate-950 border border-purple-500/40 rounded-xl font-mono text-purple-300 font-bold focus:outline-none focus:border-purple-400" />
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mapeamento das Colunas:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna ID Pedido</label><input type="text" value={ruleFormData.colIdPedido || 'A'} onChange={e => setRuleFormData({...ruleFormData, colIdPedido: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" /></div>
            <div><label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna SKU</label><input type="text" value={ruleFormData.colSku || 'B'} onChange={e => setRuleFormData({...ruleFormData, colSku: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" /></div>
            <div><label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna Estado (UF)</label><input type="text" value={ruleFormData.colEstado || 'E'} onChange={e => setRuleFormData({...ruleFormData, colEstado: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" /></div>
            <div><label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna Quantidade</label><input type="text" value={ruleFormData.colQuantidade || 'G'} onChange={e => setRuleFormData({...ruleFormData, colQuantidade: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}