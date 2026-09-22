'use client';
import React, { useState } from 'react';
import { useAppContext, INITIAL_ADMIN_PASS, CHANNELS } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const { isAdminUnlocked, setIsAdminUnlocked, channelRules, setSales, addLog, logs } = useAppContext();
  const [password, setPassword] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  const auth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === INITIAL_ADMIN_PASS) { setIsAdminUnlocked(true); addLog('Autenticado com sucesso.', 'success'); }
  };

  const colToIdx = (colStr: string) => {
    if (!colStr) return 0;
    let base = 0;
    for (let i = 0; i < colStr.length; i++) base = base * 26 + (colStr.toUpperCase().charCodeAt(i) - 64);
    return Math.max(0, base - 1);
  };

  const evaluateExcelFormula = (formulaStr: string, row: any) => {
    try {
      let expr = formulaStr.toUpperCase().replace(/(\d+(?:\.\d+)?)%/g, (m, p1) => (parseFloat(p1) / 100).toString());
      expr = expr.replace(/([A-Z]+)\d*/g, (m, colLet) => {
        const val = row[colToIdx(colLet)];
        return (val !== undefined && val !== null ? parseFloat(val) || 0 : 0).toString();
      });
      const result = new Function(`return ${expr.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '')};`)();
      return isNaN(result) ? 0 : result;
    } catch { return 0; }
  };

  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    
    const rule = channelRules.find((r: any) => r.canal === selectedChannel) || {
      colIdPedido: 'A', colSku: 'B', colRebate: 'C', colLiquido: 'D', formulaExcel: 'D2 - C2'
    };

    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
        
        const novosParaBanco: any[] = [];
        const novosParaTela: any[] = [];

        rows.slice(1).forEach((row, i) => {
          if (!row || !row.length) return;
          
          const idPdv = row[colToIdx(rule.colIdPedido)] ? String(row[colIdPedido]).trim() : `PDV-${Date.now()}-${i}`;
          const skuVal = row[colToIdx(rule.colSku)] ? String(row[colToIdx(rule.colSku)]).trim().toUpperCase() : 'SKU-GERAL';
          const valorLiquidoFinal = evaluateExcelFormula(rule.formulaExcel, row);

          novosParaBanco.push({
            id_pedido: idPdv,
            data_faturamento: new Date().toISOString().slice(0, 10),
            canal: selectedChannel,
            estado_compra: 'SP',
            sku: skuVal,
            faturamento_liquido_final: valorLiquidoFinal
          });

          novosParaTela.push({
            id_pedido: idPdv,
            data_faturamento: new Date().toISOString().slice(0, 10),
            canal: selectedChannel,
            estado: 'SP',
            sku: skuVal,
            quantidade: 1,
            preco_venda: parseFloat(row[colToIdx(rule.colLiquido)]) || 100,
            faturamento_liquido_final: valorLiquidoFinal
          });
        });

        if (novosParaBanco.length > 0) {
          const { error } = await supabase.from('tb_vendas').insert(novosParaBanco);
          if (error) {
            addLog(`Erro ao salvar no Supabase: ${error.message}`, 'error');
          } else {
            setSales((prev: any) => [...novosParaTela, ...prev]);
            addLog(`${novosParaBanco.length} vendas importadas para [${selectedChannel}] com base nas colunas PDV, SKU e Líquido.`, 'success');
          }
        }
      } catch (err: any) {
        addLog(`Erro ao processar ficheiro: ${err.message}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center mt-10 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Área Restrita Admin</h2>
        <form onSubmit={auth}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Senha Master (Dash321)"
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl mb-4 text-white text-sm"
          />
          <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg">Desbloquear Central</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
         <div>
           <h2 className="font-bold text-white text-base">Importação de Planilha do Canal (PDV, SKU, Rebate & Líquido)</h2>
           <p className="text-xs text-slate-400 mt-0.5">O sistema usará o mapeamento definido na aba Regras Canal para extrair os valores e abater os custos.</p>
         </div>
         
         <select
           value={selectedChannel}
           onChange={e => setSelectedChannel(e.target.value)}
           className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-purple-300 font-bold text-xs"
         >
           {CHANNELS.map(ch => <option key={ch}>{ch}</option>)}
         </select>
         
         <label className={`cursor-pointer block py-3.5 text-white font-extrabold text-xs text-center rounded-xl shadow-lg transition ${isProcessing ? 'bg-slate-600' : 'bg-purple-600 hover:bg-purple-500'}`}>
           <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUpload} disabled={isProcessing}/>
           {isProcessing ? 'A processar planilhas...' : `Importar Planilha de Vendas (${selectedChannel})`}
         </label>
       </div>

       <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Console de Auditoria</h3>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs max-h-40 overflow-auto text-slate-300 space-y-1 border border-slate-800">
             {logs.map((log: any) => (
               <div key={log.id} className="flex gap-2">
                 <span className="text-slate-600">[{log.timestamp}]</span>
                 <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}>{log.message}</span>
               </div>
             ))}
          </div>
       </div>
    </div>
  );
}