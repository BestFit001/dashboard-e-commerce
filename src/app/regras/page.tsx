'use client';
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function RegrasPage() {
  const { canais, setCanais, channelRules, setChannelRules, channelLogos, setChannelLogos, addLog } = useAppContext();
  const [editingChannel, setEditingChannel] = useState(canais[0]);
  const [ruleFormData, setRuleFormData] = useState(channelRules[0]);
  const [novoCanal, setNovoCanal] = useState('');

  useEffect(() => {
    if (!editingChannel || !canais.includes(editingChannel)) {
      setEditingChannel(canais[0]);
    }
  }, [canais, editingChannel]);

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

  const adicionarCanal = () => {
    if (novoCanal.trim() && !canais.includes(novoCanal.trim())) {
      const nome = novoCanal.trim();
      setCanais([...canais, nome]);
      setChannelRules([...channelRules, { canal: nome, colIdPedido: 'A', colSku: 'B', colEstado: 'E', colQuantidade: 'G', formulaExcel: 'C2' }]);
      setNovoCanal('');
      addLog(`Novo canal criado com sucesso: ${nome}`, 'success');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        setChannelLogos((prev: any) => ({ ...prev, [editingChannel]: base64 }));
        addLog(`Logo atualizado para o canal [${editingChannel}].`, 'success');
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <h2 className="text-xl font-bold text-white">Parametrização de Fórmulas e Logos</h2>
        <div className="flex flex-wrap gap-2">
          <input type="text" placeholder="Nome do Novo Canal..." value={novoCanal} onChange={e => setNovoCanal(e.target.value)} className="p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white" />
          <button onClick={adicionarCanal} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition">Criar Canal</button>
          <button onClick={saveRule} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition">Salvar Regra</button>
        </div>
      </div>
      
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap gap-2 mb-6">
          {canais.map((ch: string) => (
            <button key={ch} onClick={() => handleSelectChannel(ch)} className={`py-2 px-3 rounded-xl text-xs font-bold transition ${editingChannel === ch ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-300'}`}>
              {ch}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div>
             <label className="block text-xs font-bold text-slate-200 mb-2">Expressão Excel ({editingChannel}):</label>
             <input type="text" value={ruleFormData?.formulaExcel || ''} onChange={e => setRuleFormData({...ruleFormData, formulaExcel: e.target.value})} className="w-full p-3 bg-slate-950 border border-purple-500/40 rounded-xl font-mono text-purple-300 font-bold" />
             <p className="text-[10px] text-slate-500 mt-2">Esta fórmula deduz as taxas da plataforma sobre o Preço de Venda Bruto.</p>
          </div>
          
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
             <div className="w-16 h-16 bg-white rounded-lg p-2 flex items-center justify-center shrink-0 border border-slate-700">
                {channelLogos[editingChannel] ? (
                  <img src={channelLogos[editingChannel]} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <i className="fa-solid fa-image text-slate-300 text-2xl"></i>
                )}
             </div>
             <div>
                <h4 className="text-sm font-bold text-white mb-1">Logo do Canal</h4>
                <p className="text-[10px] text-slate-400 mb-3">Imagens quadradas (PNG/JPG) ficam com melhor aspeto no dashboard.</p>
                <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-[10px] rounded-lg transition inline-block">
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  Fazer Upload de Imagem
                </label>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}