'use client';
import React, { useState } from 'react';
import { useAppContext, INITIAL_ADMIN_PASS } from '@/context/AppContext';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const { 
    canais, isAdminUnlocked, setIsAdminUnlocked, channelRules, 
    setSales, setFlexData, setAdsData, setGoals, faturados, setFaturados, cancelados, setCancelados, addLog, logs 
  } = useAppContext();
  
  const [password, setPassword] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(canais[0]);
  const [colFaturados, setColFaturados] = useState('A');
  const [colCancelados, setColCancelados] = useState('A');

  const auth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === INITIAL_ADMIN_PASS) { 
      setIsAdminUnlocked(true); addLog('Sessão desbloqueada.', 'success'); 
    }
  };

  const colToIdx = (colStr: string) => {
    if (!colStr) return 0;
    let base = 0;
    for (let i = 0; i < colStr.length; i++) base = base * 26 + (colStr.toUpperCase().charCodeAt(i) - 64);
    return Math.max(0, base - 1);
  };

  const parseBrFloat = (val: any) => {
    if (!val) return 0;
    return parseFloat(String(val).replace(',', '.')) || 0;
  };

  const extractIds = (rows: any[], colLet: string) => {
    const idx = colToIdx(colLet);
    const ids: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      let val = row[idx];
      if (val === undefined && typeof row[0] === 'string' && row[0].includes(';')) val = row[0].split(';')[idx];
      const idStr = String(val || '').trim();
      if (idStr && !['id', 'pedido', 'venda', 'código', 'undefined'].includes(idStr.toLowerCase())) ids.push(idStr);
    }
    return ids;
  };

  const evaluateExcelFormula = (formulaStr: string, row: any) => {
    try {
      let expr = formulaStr.toUpperCase().replace(/(\d+(?:\.\d+)?)%/g, (m, p1) => (parseFloat(p1) / 100).toString());
      expr = expr.replace(/([A-Z]+)\d*/g, (m, colLet) => {
        const val = row[colToIdx(colLet)];
        return (val !== undefined && val !== null ? parseFloat(val) || 0 : 0).toString();
      });
      const result = new Function(`return ${expr.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '')};`)();
      return isNaN(result) ? 0 : Math.max(0, result);
    } catch { return 0; }
  };

  const handleUploadVendas = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const rule = channelRules.find((r: any) => r.canal === selectedChannel);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      
      let bloqueadosFaturados = 0;
      let bloqueadosCancelados = 0;

      const newSales = rows.slice(1).map((row, i) => {
        if (!row || !row.length) return null;
        const id_pedido = String(row[colToIdx(rule.colIdPedido)] || '').trim();
        if(!id_pedido || id_pedido.toLowerCase() === 'id pedido' || id_pedido.toLowerCase() === 'coluna id pedido') return null;

        if (faturados.length > 0 && !faturados.includes(id_pedido)) { bloqueadosFaturados++; return null; }
        if (cancelados.includes(id_pedido)) { bloqueadosCancelados++; return null; }

        const repasse = evaluateExcelFormula(rule.formulaExcel, row);
        const precoVendaRaw = row[colToIdx(rule.colPdv || 'E')];
        const valorBrutoRaw = row[colToIdx(rule.colValorBruto || 'F')];

        return {
          id_pedido,
          data_faturamento: new Date().toISOString().slice(0, 10),
          canal: selectedChannel,
          sku: String(row[colToIdx(rule.colSku)] || 'SKU-GENERAL').trim().toUpperCase(),
          quantidade: parseInt(row[colToIdx(rule.colQuantidade)], 10) || 1,
          preco_venda: parseBrFloat(precoVendaRaw), // Mantido para referência opcional
          faturamento_bruto: parseBrFloat(valorBrutoRaw), // VALOR BRUTO REAL PARA OS KPIS
          repasse_liquido: repasse
        };
      }).filter(Boolean);
      
      if (newSales.length > 0) {
        setSales((prev: any) => [...newSales, ...prev]);
        addLog(`Cruzamento (${selectedChannel}): ${newSales.length} inseridos. Bloqueados: ${bloqueadosFaturados} (Não Faturados) e ${bloqueadosCancelados} (Cancelados).`, 'success');
      } else {
        addLog(`Atenção: Nenhum pedido validado no cruzamento.`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleUploadMetas = (e: any) => { 
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const novasMetas = rows.slice(1).map(r => ({ responsavel: String(r[0]||''), canal: String(r[1]||''), meta_valor: parseBrFloat(r[2]) })).filter(m => m.canal && m.meta_valor > 0);
      if (novasMetas.length > 0) { setGoals(novasMetas); addLog(`${novasMetas.length} Metas configuradas.`, 'success'); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const readGeneric = (e: any, setter: any, type: string, mapper: Function) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const data = rows.slice(1).map(mapper).filter((i:any) => i.val > 0);
      if(data.length > 0) { setter((p:any)=>[...data.map((d:any)=>d.obj), ...p]); addLog(`${data.length} registros de ${type} inseridos.`, 'success'); }
    };
    reader.readAsArrayBuffer(file); e.target.value = '';
  };

  const clearData = (type: string) => {
    if(confirm(`Tem certeza que deseja apagar a base de ${type.toUpperCase()}?`)) {
      if(type === 'faturados') setFaturados([]);
      if(type === 'cancelados') setCancelados([]);
      if(type === 'vendas') setSales([]);
      if(type === 'flex') setFlexData([]);
      if(type === 'ads') setAdsData([]);
      if(type === 'metas') setGoals([]);
      addLog(`Base de ${type.toUpperCase()} deletada da memória.`, 'warning');
    }
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Área Restrita Admin</h2>
        <form onSubmit={auth}><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (Dash321)" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl mb-4 text-white" /><button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Desbloquear</button></form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <h2 className="text-xl font-bold text-white mb-4">Passo 1: Bases do ERP</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/30">
           <h3 className="font-bold text-emerald-400 text-sm mb-2">Faturados</h3>
           <input type="text" value={colFaturados} onChange={e => setColFaturados(e.target.value.toUpperCase())} className="w-16 p-2 bg-slate-950 text-emerald-300 font-bold text-center border mr-2" />
           <label className="cursor-pointer px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={(e)=>{
             const file=e.target.files[0]; if(!file)return; const reader=new FileReader();
             reader.onload=(evt)=>{ const wb=XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer),{type:'array'}); const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1}); const ids=extractIds(rows,colFaturados); if(ids.length>0){setFaturados((p:any)=>[...new Set([...p,...ids])]); addLog(`${ids.length} Faturados carregados.`,'success');} }
             reader.readAsArrayBuffer(file); e.target.value='';
           }}/>Subir Faturados</label>
           <p className="text-[10px] text-slate-400 mt-2">IDs: {faturados.length}</p>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30">
           <h3 className="font-bold text-rose-400 text-sm mb-2">Cancelados</h3>
           <input type="text" value={colCancelados} onChange={e => setColCancelados(e.target.value.toUpperCase())} className="w-16 p-2 bg-slate-950 text-rose-300 font-bold text-center border mr-2" />
           <label className="cursor-pointer px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-lg"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={(e)=>{
             const file=e.target.files[0]; if(!file)return; const reader=new FileReader();
             reader.onload=(evt)=>{ const wb=XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer),{type:'array'}); const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1}); const ids=extractIds(rows,colCancelados); if(ids.length>0){setCancelados((p:any)=>[...new Set([...p,...ids])]); addLog(`${ids.length} Cancelados carregados.`,'warning');} }
             reader.readAsArrayBuffer(file); e.target.value='';
           }}/>Subir Cancelados</label>
           <p className="text-[10px] text-slate-400 mt-2">IDs: {cancelados.length}</p>
         </div>
       </div>

       <h2 className="text-xl font-bold text-white mt-8 mb-4">Passo 2: Vendas, Custos e Metas</h2>
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-slate-900 p-5 rounded-2xl border border-purple-500/30">
           <h3 className="font-bold text-white text-sm mb-4">Planilha Vendas (Cruzar)</h3>
           <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="w-full p-2 bg-slate-950 mb-3 text-purple-300 border font-bold">{canais.map((ch: string) => <option key={ch}>{ch}</option>)}</select>
           <label className="cursor-pointer block py-2 bg-purple-600 text-white font-bold text-xs text-center rounded-xl"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadVendas}/>Importar Vendas</label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-cyan-500/30">
           <h3 className="font-bold text-white text-sm mb-4">Débitos Frete FLEX</h3>
           <p className="text-[9px] text-slate-400 mb-2">A: ID | B: Valor</p>
           <label className="cursor-pointer block py-2 bg-cyan-600 text-white font-bold text-xs text-center rounded-xl mt-auto"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={e => readGeneric(e, setFlexData, 'FLEX', (r:any) => ({val: parseBrFloat(r[1]), obj: {id_pedido: String(r[0]||'').trim(), valor_frete: parseBrFloat(r[1])}}))} />Importar Flex</label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-amber-500/30">
           <h3 className="font-bold text-white text-sm mb-4">Custos de ADS</h3>
           <p className="text-[9px] text-slate-400 mb-2">A: Canal | B: Valor</p>
           <label className="cursor-pointer block py-2 bg-amber-600 text-white font-bold text-xs text-center rounded-xl mt-auto"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={e => readGeneric(e, setAdsData, 'ADS', (r:any) => ({val: parseBrFloat(r[1]), obj: {canal: String(r[0]||'').trim(), custo_ads: parseBrFloat(r[1])}}))} />Importar ADS</label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/30">
           <h3 className="font-bold text-white text-sm mb-4">Importar Metas</h3>
           <p className="text-[9px] text-slate-400 mb-2">A: Resp. | B: Canal | C: Valor</p>
           <label className="cursor-pointer block py-2 bg-emerald-600 text-white font-bold text-xs text-center rounded-xl mt-auto"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadMetas} />Subir Metas</label>
         </div>
       </div>

       {/* ZONA DE EXPURGO (Limpeza de Dados) */}
       <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30 mt-6">
          <h3 className="font-bold text-rose-400 text-sm mb-4"><i className="fa-solid fa-trash mr-2"></i>Zona de Limpeza (Expurgo de Dados)</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <button onClick={() => clearData('vendas')} className="px-2 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar Vendas</button>
            <button onClick={() => clearData('faturados')} className="px-2 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar Faturados</button>
            <button onClick={() => clearData('cancelados')} className="px-2 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar Cancelados</button>
            <button onClick={() => clearData('flex')} className="px-2 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar FLEX</button>
            <button onClick={() => clearData('ads')} className="px-2 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar ADS</button>
            <button onClick={() => clearData('metas')} className="px-2 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar Metas</button>
          </div>
       </div>

       <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 mt-6">
          <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-white text-sm">Console</h3><button onClick={() => setLogs([])} className="text-[10px] text-slate-500 hover:text-slate-300 border border-slate-700 px-2 py-1 rounded">Limpar</button></div>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs max-h-48 overflow-y-auto text-slate-300 space-y-2 border border-slate-800">
             {logs.map((log: any) => (<div key={log.id}><span className="text-slate-600 mr-2">[{log.timestamp}]</span> <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : log.type === 'error' ? 'text-rose-400' : 'text-slate-300'}>{log.message}</span></div>))}
          </div>
       </div>
    </div>
  );
}