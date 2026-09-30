'use client';
import React, { useState, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function AuxiliarPage() {
  const { canais, addLog } = useAppContext();
  const [selectedChannel, setSelectedChannel] = useState(canais[0] || 'Site');
  const [colSkuAux, setColSkuAux] = useState('B');
  const [colIdVariacao, setColIdVariacao] = useState('J');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadAuxiliar = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

        const colToIdx = (colStr: string) => {
          const clean = String(colStr || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
          let base = 0;
          for (let i = 0; i < clean.length; i++) {
            base = base * 26 + (clean.charCodeAt(i) - 64);
          }
          return Math.max(0, base - 1);
        };

        const idxSku = colToIdx(colSkuAux);
        const idxVar = colToIdx(colIdVariacao);
        const novosMapeamentos: Record<string, string> = {};

        rows.slice(1).forEach((row) => {
          if (!row || !row.length) return;
          const skuVal = row[idxSku] ? String(row[idxSku]).trim().toUpperCase() : '';
          const varVal = row[idxVar] ? String(row[idxVar]).trim() : '';
          
          if (skuVal && varVal) {
            novosMapeamentos[varVal] = skuVal;
          }
        });

        const chaveSupabase = `auxiliar_sku_${selectedChannel}`;
        await supabase.from('tb_estado_global').upsert([{ chave: chaveSupabase, dados: novosMapeamentos }], { onConflict: 'chave' });

        addLog(`Base Auxiliar [${selectedChannel}]: ${Object.keys(novosMapeamentos).length} mapeamentos salvos.`, 'success');
        alert(`Sucesso! ${Object.keys(novosMapeamentos).length} regras de SKU por ID de Variação carregadas para ${selectedChannel}.`);
      } catch (err: any) {
        alert(`Erro ao processar ficheiro auxiliar: ${err.message}`);
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-6">
      <div className="bg-slate-900 p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Aba Auxiliar: Mapeamento de Variações</h2>
          <p className="text-xs text-slate-400 mt-1">Carregue a planilha de referência cruzando o ID de Variação com o SKU correto para preencher vazios.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Canal Alvo</label>
            <select 
              value={selectedChannel} 
              onChange={e => setSelectedChannel(e.target.value)} 
              className="w-full p-3 bg-slate-950 text-indigo-300 border border-slate-700 font-bold rounded-xl text-xs outline-none cursor-pointer"
            >
              {canais.map((ch: string) => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Coluna SKU Correto (ex: B)</label>
              <input type="text" value={colSkuAux} onChange={e => setColSkuAux(e.target.value.toUpperCase())} className="w-full p-2.5 bg-slate-950 text-emerald-400 font-bold text-center border border-slate-700 rounded-xl text-xs" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Coluna ID Variação (ex: J)</label>
              <input type="text" value={colIdVariacao} onChange={e => setColIdVariacao(e.target.value.toUpperCase())} className="w-full p-2.5 bg-slate-950 text-purple-400 font-bold text-center border border-slate-700 rounded-xl text-xs" />
            </div>
          </div>

          <label className={`cursor-pointer block py-3.5 text-white font-extrabold text-xs text-center rounded-xl transition shadow-lg ${isProcessing ? 'bg-slate-600' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
            <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadAuxiliar} disabled={isProcessing} />
            {isProcessing ? 'A processar cruzamento...' : 'Subir Planilha Auxiliar de SKUs'}
          </label>
        </div>
      </div>
    </div>
  );
}