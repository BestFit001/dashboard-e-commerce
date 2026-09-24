'use client';
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function RegrasPage() {
  const { canais, setCanais, channelRules, setChannelRules, addLog } = useAppContext();
  
  const [editingChannel, setEditingChannel] = useState(canais[0]);
  const [ruleFormData, setRuleFormData] = useState<any>({});
  const [novoCanal, setNovoCanal] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Carrega os dados do canal selecionado
  useEffect(() => {
    if (!editingChannel || !canais.includes(editingChannel)) return;
    const existing = channelRules.find((r: any) => r.canal === editingChannel);
    
    // Define o mês atual como padrão (YYYY-MM) se não houver um salvo
    const currentMonth = new Date().toISOString().slice(0, 7); 

    setRuleFormData(existing || { 
      canal: editingChannel, 
      responsavel: '',
      meta_valor: '',
      mes_referencia: currentMonth,
      formulaExcel: 'C2 - (C2 * 12%)',
      colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G' 
    });
  }, [editingChannel, channelRules, canais]);

  const handleSelectChannel = (ch: string) => {
    setEditingChannel(ch);
    setIsSaved(false);
  };

  const saveRule = () => {
    setChannelRules((prev: any[]) => {
      const idx = prev.findIndex(r => r.canal === editingChannel);
      const newData = { ...ruleFormData, canal: editingChannel };
      
      if (idx >= 0) { 
         const updated = [...prev]; 
         updated[idx] = newData; 
         return updated; 
      }
      return [...prev, newData];
    });
    
    addLog(`Regras, Meta e Responsável salvos para [${editingChannel}].`, 'success');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const adicionarCanal = () => {
    if (novoCanal.trim() && !canais.includes(novoCanal.trim())) {
      const nome = novoCanal.trim();
      setCanais([...canais, nome]);
      
      const newRule = { 
        canal: nome, responsavel: '', meta_valor: '', mes_referencia: new Date().toISOString().slice(0, 7),
        colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2' 
      };
      setChannelRules([...channelRules, newRule]);
      
      setNovoCanal('');
      addLog(`Novo canal criado com sucesso: ${nome}`, 'success');
      
      setEditingChannel(nome);
      setIsSaved(false);
    }
  };

  // Preview local do upload de Logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file) {
      const tempUrl = URL.createObjectURL(file);
      setRuleFormData({...ruleFormData, logo_url: tempUrl});
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Parametrização de Fórmulas & Canais</h2>
          <p className="text-xs text-slate-400 mt-1">Configure colunas, metas mensais, fórmulas de repasse e identidades visuais.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <input 
            type="text" placeholder="Nome do Novo Canal..." value={novoCanal} onChange={e => setNovoCanal(e.target.value)} 
            className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 flex-1 sm:flex-none" 
          />
          <button onClick={adicionarCanal} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition">
            Criar Canal
          </button>
          <button 
            onClick={saveRule} 
            className={`px-4 py-2.5 font-bold text-xs rounded-xl transition flex items-center gap-2 ${
              isSaved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30'
            }`}
          >
            {isSaved ? <><i className="fa-solid fa-check"></i> Salvo!</> : 'Salvar Regra'}
          </button>
        </div>
      </div>
      
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex flex-wrap gap-2">
          {canais.map((ch: string) => (
            <button 
              key={ch} onClick={() => handleSelectChannel(ch)} 
              className={`py-2 px-4 rounded-xl text-xs font-bold transition border ${
                editingChannel === ch ? 'bg-purple-600 text-white border-purple-500 shadow-md' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
        
        {/* BLOCO 1: Identidade e Gestão Comercial */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-800">
           {/* Identidade */}
           <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2">Logo do Canal ({editingChannel})</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-700 p-1">
                      {ruleFormData.logo_url ? <img src={ruleFormData.logo_url} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-slate-400 text-[10px] font-bold">LOGO</span>}
                  </div>
                  <input type="file" onChange={handleLogoUpload} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2">Responsável pelo Canal:</label>
                <input 
                  type="text" value={ruleFormData.responsavel || ''} onChange={e => setRuleFormData({...ruleFormData, responsavel: e.target.value})} 
                  placeholder="Ex: Teste / Gisele" 
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500" 
                />
              </div>
           </div>

           {/* Metas Comerciais */}
           <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2">Mês de Referência (Histórico):</label>
                <input 
                  type="month" value={ruleFormData.mes_referencia || ''} onChange={e => setRuleFormData({...ruleFormData, mes_referencia: e.target.value})} 
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2">Meta de Faturamento (R$):</label>
                <input 
                  type="number" step="0.01" value={ruleFormData.meta_valor || ''} onChange={e => setRuleFormData({...ruleFormData, meta_valor: e.target.value})} 
                  placeholder="Ex: 50000.00" 
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500" 
                />
              </div>
           </div>
        </div>

        {/* BLOCO 2: Fórmula */}
        <div className="pt-4 border-t border-slate-800">
           <label className="block text-xs font-bold text-slate-200 mb-2">Expressão Excel de Cálculo ({editingChannel}):</label>
           <input 
             type="text" value={ruleFormData?.formulaExcel || ''} onChange={e => setRuleFormData({...ruleFormData, formulaExcel: e.target.value})} 
             placeholder="Ex: C2 - (C2 * 12%)" 
             className="w-full p-3.5 bg-slate-950 border border-purple-500/40 rounded-xl font-mono text-purple-300 font-bold focus:outline-none focus:border-purple-400" 
           />
        </div>

        {/* BLOCO 3: Colunas */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mapeamento das Colunas:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna ID Pedido</label>
              <input type="text" value={ruleFormData?.colIdPedido || 'A'} onChange={e => setRuleFormData({...ruleFormData, colIdPedido: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna SKU</label>
              <input type="text" value={ruleFormData?.colSku || 'B'} onChange={e => setRuleFormData({...ruleFormData, colSku: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna Estado (UF)</label>
              <input type="text" value={ruleFormData?.colEstado || 'E'} onChange={e => setRuleFormData({...ruleFormData, colEstado: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Coluna Quantidade</label>
              <input type="text" value={ruleFormData?.colQuantidade || 'G'} onChange={e => setRuleFormData({...ruleFormData, colQuantidade: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold uppercase text-center" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}