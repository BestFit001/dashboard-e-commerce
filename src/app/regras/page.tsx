'use client';
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function RegrasPage() {
  const { canais, setCanais, channelRules, setChannelRules, channelLogos, setChannelLogos, addLog } = useAppContext();
  
  const [editingChannel, setEditingChannel] = useState(canais[0]);
  const [ruleFormData, setRuleFormData] = useState<any>({});
  const [novoCanal, setNovoCanal] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!editingChannel || !canais.includes(editingChannel)) {
      if (canais.length > 0) setEditingChannel(canais[0]);
      return;
    }
    const existing = channelRules.find((r: any) => r.canal === editingChannel);
    const logoBase64 = channelLogos[editingChannel] || '';
    const currentMonth = new Date().toISOString().slice(0, 7); 

    setRuleFormData(existing || { 
      canal: editingChannel, 
      responsavel: '',
      meta_valor: '',
      mes_referencia: currentMonth,
      formulaExcel: 'C2 - (C2 * 12%)',
      colIdPedido: 'A', colSku: 'B', colRebate: 'C', colPrecoVenda: 'D', colQuantidade: 'E'
    });
    setRuleFormData((prev: any) => ({ ...prev, logo_url: logoBase64 }));
  }, [editingChannel, channelRules, canais, channelLogos]);

  const handleSelectChannel = (ch: string) => { setEditingChannel(ch); setIsSaved(false); };

  const saveRule = async () => {
    setIsProcessing(true);
    
    const dbPayload = {
      canal: editingChannel,
      responsavel: ruleFormData.responsavel || 'EQUIPE',
      col_id_pedido: ruleFormData.colIdPedido,
      col_sku: ruleFormData.colSku,
      col_preco_venda: ruleFormData.colPrecoVenda,
      col_rebate: ruleFormData.colRebate,
      col_quantidade: ruleFormData.colQuantidade,
      formula_excel: ruleFormData.formulaExcel,
      meta_valor: ruleFormData.meta_valor || 0,
      logo_url: ruleFormData.logo_url || ''
    };

    // Upsert no Supabase
    const { error } = await supabase.from('tb_regras_canais').upsert([dbPayload], { onConflict: 'canal' });

    if (error) {
      addLog(`Erro Supabase ao salvar regra: ${error.message}`, 'error');
    } else {
      setChannelRules((prev: any[]) => {
        const idx = prev.findIndex(r => r.canal === editingChannel);
        const newData = { ...ruleFormData, canal: editingChannel };
        if (idx >= 0) { const updated = [...prev]; updated[idx] = newData; return updated; }
        return [...prev, newData];
      });

      if (ruleFormData.logo_url) {
        setChannelLogos((prev: any) => ({ ...prev, [editingChannel]: ruleFormData.logo_url }));
      }
      
      addLog(`Regras comerciais sincronizadas para [${editingChannel}].`, 'success');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
    setIsProcessing(false);
  };

  const excluirCanal = async () => {
    if (confirm(`Tem a certeza que deseja excluir o canal "${editingChannel}" do banco de dados?`)) {
      const { error } = await supabase.from('tb_regras_canais').delete().eq('canal', editingChannel);
      
      if (error) {
        addLog(`Erro Supabase ao excluir: ${error.message}`, 'error');
      } else {
        const novosCanais = canais.filter((c: string) => c !== editingChannel);
        setCanais(novosCanais);
        setChannelRules((prev: any[]) => prev.filter(r => r.canal !== editingChannel));
        setEditingChannel(novosCanais[0] || '');
        addLog(`Canal [${editingChannel}] excluído definitivamente.`, 'warning');
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRuleFormData({ ...ruleFormData, logo_url: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Parametrização e Metas</h2>
          <p className="text-xs text-slate-400 mt-1">Regras fixas salvas no banco de dados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button onClick={saveRule} disabled={isProcessing} className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 ${isSaved ? 'bg-emerald-500 text-white shadow-lg' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'}`}>
            {isProcessing ? 'A Sincronizar...' : isSaved ? <><i className="fa-solid fa-check"></i> Sincronizado!</> : 'Salvar Regra'}
          </button>
          <button onClick={excluirCanal} className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900 font-bold text-xs rounded-xl transition ml-2"><i className="fa-solid fa-trash"></i></button>
        </div>
      </div>
      
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex flex-wrap gap-2">
          {canais.map((ch: string) => (
            <button key={ch} onClick={() => handleSelectChannel(ch)} className={`py-2 px-4 rounded-xl text-xs font-bold transition border ${editingChannel === ch ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
              {ch}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-800">
           <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2">Logo do Canal</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-700 p-1">
                      {ruleFormData.logo_url ? <img src={ruleFormData.logo_url} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-slate-400 text-[10px] font-bold">LOGO</span>}
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2">Responsável pelo Canal:</label>
                <input type="text" value={ruleFormData.responsavel || ''} onChange={e => setRuleFormData({...ruleFormData, responsavel: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
              </div>
           </div>

           <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2">Meta de Faturamento (R$):</label>
                <input type="number" step="0.01" value={ruleFormData.meta_valor || ''} onChange={e => setRuleFormData({...ruleFormData, meta_valor: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-bold" />
              </div>
           </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
           <label className="block text-xs font-bold text-slate-200 mb-2">Fórmula de Apuração (Ex: D2 - (D2 * 0.12)):</label>
           <input type="text" value={ruleFormData?.formulaExcel || ''} onChange={e => setRuleFormData({...ruleFormData, formulaExcel: e.target.value})} className="w-full p-3.5 bg-slate-950 border border-purple-500/40 rounded-xl font-mono text-purple-300 font-bold" />
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mapeamento das 5 Colunas Foco:</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div><label className="block text-[11px] text-slate-400 mb-1">ID Pedido</label><input type="text" value={ruleFormData?.colIdPedido || 'A'} onChange={e => setRuleFormData({...ruleFormData, colIdPedido: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono text-center" /></div>
            <div><label className="block text-[11px] text-slate-400 mb-1">SKU</label><input type="text" value={ruleFormData?.colSku || 'B'} onChange={e => setRuleFormData({...ruleFormData, colSku: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono text-center" /></div>
            <div><label className="block text-[11px] text-rose-400 mb-1">Cupom/Rebate</label><input type="text" value={ruleFormData?.colRebate || 'C'} onChange={e => setRuleFormData({...ruleFormData, colRebate: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-400 font-mono text-center" /></div>
            <div><label className="block text-[11px] text-amber-500 mb-1">Preço Venda</label><input type="text" value={ruleFormData?.colPrecoVenda || 'D'} onChange={e => setRuleFormData({...ruleFormData, colPrecoVenda: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-amber-400 font-mono text-center" /></div>
            <div><label className="block text-[11px] text-cyan-400 mb-1">Quantidade</label><input type="text" value={ruleFormData?.colQuantidade || 'E'} onChange={e => setRuleFormData({...ruleFormData, colQuantidade: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-400 font-mono text-center" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}