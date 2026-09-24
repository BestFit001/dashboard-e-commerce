'use client';
import React, { useState } from 'react';
import { useAppContext, INITIAL_ADMIN_PASS } from '@/context/AppContext';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const { 
    canais, isAdminUnlocked, setIsAdminUnlocked, channelRules, 
    setSales, setFlexData, setAdsData, faturados, setFaturados, cancelados, setCancelados, addLog, logs 
  } = useAppContext();
  
  const [password, setPassword] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(canais[0]);
  const [colFaturados, setColFaturados] = useState('A');
  const [colCancelados, setColCancelados] = useState('A');

  const auth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === INITIAL_ADMIN_PASS) { setIsAdminUnlocked(true); addLog('Sessão desbloqueada. Aguardando cruzamentos.', 'success'); }
  };

  const colToIdx = (colStr: string) => {
    if (!colStr) return 0;
    let base = 0;
    for (let i = 0; i < colStr.length; i++) base = base * 26 + (colStr.toUpperCase().charCodeAt(i) - 64);
    return Math.max(0, base - 1);
  };

  const evaluateExcelFormula = (formulaStr: string, row: any) => {
    try {
      let expr = formulaStr.toUpperCase().replace(/(\d+(?:\.\d+)?)%/g, (m: string, p1: string) => (parseFloat(p1) / 100).toString());
      expr = expr.replace(/([A-Z]+)\d*/g, (m: string, colLet: string) => {
        const val = row[colToIdx(colLet)];
        return (val !== undefined && val !== null ? parseFloat(val) || 0 : 0).toString();
      });
      const result = new Function(`return ${expr.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '')};`)();
      return isNaN(result) ? 0 : Math.max(0, result);
    } catch { return 0; }
  };

  // UPLOAD 1: FATURADOS (ERP)
  const handleUploadFaturados = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      const idx = colToIdx(colFaturados);
      const ids = rows.slice(1).map(r => String(r[idx] || '').trim()).filter(Boolean);
      
      setFaturados((prev: string[]) => [...new Set([...prev, ...ids])]);
      addLog(`${ids.length} IDs Faturados memorizados para validação.`, 'success');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // UPLOAD 2: CANCELADOS (ERP)
  const handleUploadCancelados = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      const idx = colToIdx(colCancelados);
      const ids = rows.slice(1).map(r => String(r[idx] || '').trim()).filter(Boolean);
      
      setCancelados((prev: string[]) => [...new Set([...prev, ...ids])]);
      addLog(`${ids.length} IDs Cancelados memorizados para exclusão.`, 'warning');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // UPLOAD 3: VENDAS MARKETPLACE (O CRUZAMENTO ACONTECE AQUI)
  const handleUploadVendas = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    if (faturados.length === 0) {
      addLog('AVISO: A base de Faturados está vazia. Todos os pedidos da planilha serão considerados.', 'warning');
    }

    const rule = channelRules.find((r: any) => r.canal === selectedChannel);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      
      let bloqueadosFaturados = 0;
      let bloqueadosCancelados = 0;

      const newSales = rows.slice(1).map((row, i) => {
        if (!row || !row.length) return null;
        
        const id_pedido = String(row[colToIdx(rule.colIdPedido)] || '').trim() || `PED-${Date.now()}-${i}`;

        // CRUZAMENTO 1: Tem que estar nos Faturados (se a base foi enviada)
        if (faturados.length > 0 && !faturados.includes(id_pedido)) {
          bloqueadosFaturados++;
          return null;
        }

        // CRUZAMENTO 2: Não pode estar nos Cancelados
        if (cancelados.includes(id_pedido)) {
          bloqueadosCancelados++;
          return null;
        }

        const repasse = evaluateExcelFormula(rule.formulaExcel, row);
        return {
          id_pedido,
          data_faturamento: new Date().toISOString().slice(0, 10),
          canal: selectedChannel,
          sku: row[colToIdx(rule.colSku)] || 'SKU-GENERAL',
          quantidade: parseInt(row[colToIdx(rule.colQuantidade)], 10) || 1,
          preco_venda: parseFloat(row[colToIdx('C')]) || 100, // Preço genérico se não achado
          repasse_liquido: repasse, 
          faturamento_liquido_final: repasse * (parseInt(row[colToIdx(rule.colQuantidade)], 10) || 1)
        };
      }).filter(Boolean);
      
      setSales((prev: any) => [...newSales, ...prev]);
      addLog(`Cruzamento (${selectedChannel}): ${newSales.length} válidos. Bloqueados: ${bloqueadosFaturados} (Não Faturados) e ${bloqueadosCancelados} (Cancelados).`, 'success');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // UPLOADS 4 e 5: FLEX E ADS (Mantidos)
  const handleUploadFlex = (e: any) => { /* ... código mantido ... */ 
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const novosFretes = rows.slice(1).map(r => ({ id_pedido: String(r[0] || '').trim(), valor_frete: parseFloat(r[1]) || 0 })).filter(f => f.id_pedido && f.valor_frete > 0);
      setFlexData((prev: any) => [...novosFretes, ...prev]);
      addLog(`${novosFretes.length} Fretes Flex lançados.`, 'success');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleUploadAds = (e: any) => { /* ... código mantido ... */
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const novosAds = rows.slice(1).map(r => ({ canal: String(r[0] || '').trim(), custo_ads: parseFloat(r[1]) || 0 })).filter(a => a.canal && a.custo_ads > 0);
      setAdsData((prev: any) => [...novosAds, ...prev]);
      addLog(`${novosAds.length} custos de ADS lançados.`, 'success');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center">
        <h2 className="text-xl font-bold text-white mb-4">Área Restrita Admin</h2>
        <form onSubmit={auth}><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (Dash321)" className="w-full p-3 bg-slate-950 rounded-xl mb-4 text-white" /><button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Desbloquear Central</button></form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       
       {/* BLOCO 1: BASES DO ERP (Cruzamento Prévio) */}
       <h2 className="text-xl font-bold text-white mb-4">Passo 1: Bases de Validação (ERP)</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/30">
           <h3 className="font-bold text-emerald-400 text-sm mb-2">Pedidos Faturados (Adicionar)</h3>
           <div className="flex gap-2 mb-3">
             <div className="w-1/3">
               <label className="text-[10px] text-slate-400 font-bold">Coluna ID:</label>
               <input type="text" value={colFaturados} onChange={e => setColFaturados(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 rounded-lg text-emerald-300 font-bold text-center border border-emerald-500/20" />
             </div>
             <div className="w-2/3 flex items-end">
               <label className="cursor-pointer w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center rounded-lg transition"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadFaturados}/>Subir Faturados</label>
             </div>
           </div>
           <p className="text-[10px] text-slate-400">Total na memória: <strong className="text-emerald-300">{faturados.length}</strong> IDs</p>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30">
           <h3 className="font-bold text-rose-400 text-sm mb-2">Pedidos Cancelados (Remover)</h3>
           <div className="flex gap-2 mb-3">
             <div className="w-1/3">
               <label className="text-[10px] text-slate-400 font-bold">Coluna ID:</label>
               <input type="text" value={colCancelados} onChange={e => setColCancelados(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 rounded-lg text-rose-300 font-bold text-center border border-rose-500/20" />
             </div>
             <div className="w-2/3 flex items-end">
               <label className="cursor-pointer w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs text-center rounded-lg transition"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadCancelados}/>Subir Cancelados</label>
             </div>
           </div>
           <p className="text-[10px] text-slate-400">Total na memória: <strong className="text-rose-300">{cancelados.length}</strong> IDs</p>
         </div>
       </div>

       {/* BLOCO 2: VENDAS E CUSTOS EXTRAS */}
       <h2 className="text-xl font-bold text-white mt-8 mb-4">Passo 2: Vendas e Custos do Marketplace</h2>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-slate-900 p-5 rounded-2xl border border-purple-500/30">
           <h3 className="font-bold text-white text-sm mb-2">Planilha Bruta do Canal</h3>
           <p className="text-[10px] text-slate-400 mb-3">Filtra automaticamente Faturados e Cancelados.</p>
           <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="w-full p-2 bg-slate-950 rounded-xl mb-3 text-purple-300 font-bold border border-slate-700">{canais.map((ch: string) => <option key={ch}>{ch}</option>)}</select>
           <label className="cursor-pointer block py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs text-center rounded-xl transition"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadVendas}/>Importar e Cruzar</label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-cyan-500/30">
           <h3 className="font-bold text-white text-sm mb-2">Débitos Frete FLEX</h3>
           <p className="text-[10px] text-slate-400 mb-4">Col A: ID Pedido | Col B: Custo</p>
           <label className="cursor-pointer block mt-10 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs text-center rounded-xl transition"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadFlex}/>Importar Flex</label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-amber-500/30">
           <h3 className="font-bold text-white text-sm mb-2">Investimento em ADS</h3>
           <p className="text-[10px] text-slate-400 mb-4">Col A: Canal | Col B: Valor Total</p>
           <label className="cursor-pointer block mt-10 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs text-center rounded-xl transition"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadAds}/>Importar ADS</label>
         </div>
       </div>

       {/* BLOCO 3: LOGS */}
       <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-white text-sm">Console de Auditoria e Cruzamento</h3>
            <button onClick={() => setLogs([])} className="text-[10px] text-slate-500 hover:text-slate-300">Limpar</button>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs max-h-40 overflow-auto text-slate-300 space-y-1 border border-slate-800">
             {logs.map((log: any) => (
               <div key={log.id}>
                 <span className="text-slate-500">[{log.timestamp}]</span> 
                 <span className={`ml-2 ${log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : log.type === 'error' ? 'text-rose-400' : 'text-slate-300'}`}>{log.message}</span>
               </div>
             ))}
          </div>
       </div>
    </div>
  );
}