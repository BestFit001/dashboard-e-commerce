'use client';
import React, { useState } from 'react';
import { useAppContext, INITIAL_ADMIN_PASS } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const { 
    canais, isAdminUnlocked, setIsAdminUnlocked, channelRules, 
    sales, setSales, setFlexData, setAdsData, faturados, setFaturados, cancelados, setCancelados, addLog, logs, setLogs 
  } = useAppContext();
  
  const [password, setPassword] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  
  const [colFaturadosId, setColFaturadosId] = useState('AI');
  const [colFaturadosData, setColFaturadosData] = useState('D');
  const [colCancelados, setColCancelados] = useState('AI');

  React.useEffect(() => {
    if (canais && canais.length > 0 && !selectedChannel) {
      setSelectedChannel(canais[0]);
    }
  }, [canais, selectedChannel]);

  const auth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === INITIAL_ADMIN_PASS) { setIsAdminUnlocked(true); addLog('Sessão desbloqueada.', 'success'); }
  };

  const colToIdx = (colStr: string) => {
    if (!colStr) return 0;
    let base = 0;
    for (let i = 0; i < colStr.length; i++) base = base * 26 + (colStr.toUpperCase().charCodeAt(i) - 64);
    return Math.max(0, base - 1);
  };

  const parseBrFloat = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const strVal = String(val).replace(/[^0-9,-]/g, '').replace(',', '.');
    return parseFloat(strVal) || 0;
  };

  const parseExcelDate = (val: any) => {
    if (!val) return new Date().toISOString().slice(0, 10);
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().slice(0, 10);
    }
    return String(val).trim().substring(0, 10);
  };

  const extractCleanId = (rawStr: string) => {
    const rawId = String(rawStr || '').trim();
    const regexMatch = rawId.match(/n[úu]mero\s+([0-9\-]+)/i);
    let finalId = '';
    if (regexMatch && regexMatch[1]) {
      finalId = regexMatch[1];
    } else {
      finalId = rawId.split(/[\s;|,\|]+/)[0];
    }
    return finalId;
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

  // Salva o estado global no Supabase
  const persistToCloud = async (chave: string, dados: any) => {
    try {
      await supabase.from('tb_estado_global').upsert([{ chave, dados }]);
    } catch (e) {
      console.error("Erro ao salvar na nuvem:", e);
    }
  };

  // UPLOAD DE VENDAS
  const handleUploadVendas = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const rule = channelRules.find((r: any) => r.canal === selectedChannel);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const workbook = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      
      let bloqueadosFaturados = 0;
      let bloqueadosCancelados = 0;

      const newSales = rows.slice(1).map((row, i) => {
        if (!row || !row.length) return null;
        const id_pedido = extractCleanId(row[colToIdx(rule.colIdPedido)]);

        if(!id_pedido || ['id', 'pedido', 'venda', 'código', 'undefined', 'observacoes'].includes(id_pedido.toLowerCase())) return null;

        const faturadoMatch = faturados.find((f: any) => f.id === id_pedido);
        if (faturados.length > 0 && !faturadoMatch) { bloqueadosFaturados++; return null; }
        if (cancelados.find((c: any) => c.id === id_pedido)) { bloqueadosCancelados++; return null; }

        const repasse = evaluateExcelFormula(rule.formulaExcel, row);
        const precoVendaRaw = row[colToIdx(rule.colPdv || 'E')];
        const dataFaturamento = faturadoMatch ? faturadoMatch.data : new Date().toISOString().slice(0, 10);

        return {
          id_pedido,
          data_faturamento: dataFaturamento,
          canal: selectedChannel,
          sku: String(row[colToIdx(rule.colSku)] || 'SKU-GENERAL').trim().toUpperCase(),
          quantidade: parseInt(row[colToIdx(rule.colQuantidade)], 10) || 1,
          preco_venda: parseBrFloat(precoVendaRaw),
          repasse_liquido: repasse 
        };
      }).filter(Boolean);
      
      if (newSales.length > 0) {
        const updatedSales = [...newSales, ...sales];
        setSales(updatedSales);
        await persistToCloud('vendas', updatedSales);
        addLog(`Cruzamento (${selectedChannel}): ${newSales.length} salvos na nuvem. Bloqueados: ${bloqueadosFaturados} / ${bloqueadosCancelados}.`, 'success');
      } else {
        addLog(`Atenção: Nenhum pedido validado no cruzamento.`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // UPLOAD DE FATURADOS
  const handleUploadFaturados = (e: any) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      
      const novosFaturados: any[] = [];
      const idxId = colToIdx(colFaturadosId);
      const idxData = colToIdx(colFaturadosData);

      for (let i = 1; i < (rows as any[]).length; i++) {
        const row = (rows as any[])[i];
        if (!row) continue;
        const id_pedido = extractCleanId(row[idxId]);
        if (id_pedido && !['id', 'pedido', 'observacoes'].includes(id_pedido.toLowerCase())) {
          novosFaturados.push({ id: id_pedido, data: parseExcelDate(row[idxData]) });
        }
      }

      if(novosFaturados.length > 0){
        setFaturados(async (prev: any) => {
          const map = new Map();
          [...prev, ...novosFaturados].forEach(item => map.set(item.id, item));
          const finalArr = Array.from(map.values());
          await persistToCloud('faturados', finalArr);
          return finalArr;
        });
        addLog(`${novosFaturados.length} Faturados salvos na nuvem.`, 'success');
      }
    };
    reader.readAsArrayBuffer(file); e.target.value = '';
  };

  // UPLOAD DE CANCELADOS
  const handleUploadCancelados = (e: any) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      
      const novosCancelados: any[] = [];
      const idxId = colToIdx(colCancelados);

      for (let i = 1; i < (rows as any[]).length; i++) {
        const row = (rows as any[])[i];
        if (!row) continue;
        const id_pedido = extractCleanId(row[idxId]);
        if (id_pedido && !['id', 'pedido', 'observacoes'].includes(id_pedido.toLowerCase())) {
          novosCancelados.push({ id: id_pedido });
        }
      }

      if(novosCancelados.length > 0){
        setCancelados(async (prev: any) => {
          const map = new Map();
          [...prev, ...novosCancelados].forEach(item => map.set(item.id, item));
          const finalArr = Array.from(map.values());
          await persistToCloud('cancelados', finalArr);
          return finalArr;
        });
        addLog(`${novosCancelados.length} Cancelados salvos na nuvem.`, 'warning');
      }
    };
    reader.readAsArrayBuffer(file); e.target.value = '';
  };

  // UPLOAD GENÉRICO (FLEX / ADS)
  const readGeneric = (e: any, setter: any, type: string, cloudKey: string, mapper: (row: any) => any) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const data = rows.slice(1).map(mapper).filter((i:any) => i.val > 0);
      
      if(data.length > 0) {
        setter((prev: any) => {
          const objs = data.map((d:any)=>d.obj);
          const finalArr = [...objs, ...prev];
          persistToCloud(cloudKey, finalArr);
          return finalArr;
        });
        addLog(`${data.length} registos de ${type} salvos na nuvem.`, 'success');
      }
    };
    reader.readAsArrayBuffer(file); e.target.value = '';
  };

  // LIMPEZA DEFINITIVA
  const clearData = async (type: string, cloudKey: string, setter: any) => {
    if(confirm(`Tem a certeza que deseja apagar a base de ${type.toUpperCase()}?`)) {
      setter([]);
      await persistToCloud(cloudKey, []);
      addLog(`Base de ${type.toUpperCase()} apagada.`, 'warning');
    }
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center shadow-2xl mt-10">
        <h2 className="text-xl font-bold text-white mb-2">Área Restrita Admin</h2>
        <form onSubmit={auth}><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (Dash321)" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl mb-4 text-white" /><button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Desbloquear</button></form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <h2 className="text-xl font-bold text-white mb-4">Passo 1: Bases do ERP (Nufla Global)</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/30">
           <h3 className="font-bold text-emerald-400 text-sm mb-2">Faturados</h3>
           <div className="flex gap-2 mb-3">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold mb-1">Coluna ID</span>
                <input type="text" value={colFaturadosId} onChange={e => setColFaturadosId(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 text-emerald-300 font-bold text-center border rounded-lg" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold mb-1">Coluna Data</span>
                <input type="text" value={colFaturadosData} onChange={e => setColFaturadosData(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 text-emerald-300 font-bold text-center border rounded-lg" />
              </div>
           </div>
           
           <label className="cursor-pointer block text-center px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadFaturados}/>Subir Faturados</label>
           <p className="text-[10px] text-slate-400 mt-2 text-center">IDs Salvos: {faturados.length}</p>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30">
           <h3 className="font-bold text-rose-400 text-sm mb-2">Cancelados</h3>
           <div className="mb-3">
              <span className="block text-[10px] text-slate-400 font-bold mb-1">Coluna ID</span>
              <input type="text" value={colCancelados} onChange={e => setColCancelados(e.target.value.toUpperCase())} className="w-24 p-2 bg-slate-950 text-rose-300 font-bold text-center border rounded-lg" />
           </div>
           <label className="cursor-pointer block text-center px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-lg"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadCancelados}/>Subir Cancelados</label>
           <p className="text-[10px] text-slate-400 mt-2 text-center">IDs Salvos: {cancelados.length}</p>
         </div>
       </div>

       <h2 className="text-xl font-bold text-white mt-8 mb-4">Passo 2: Vendas e Custos</h2>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-slate-900 p-5 rounded-2xl border border-purple-500/30">
           <h3 className="font-bold text-white text-sm mb-4">Planilha Vendas (Cruzar)</h3>
           <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="w-full p-2 bg-slate-950 mb-3 text-purple-300 border font-bold">{canais.map((ch: string) => <option key={ch}>{ch}</option>)}</select>
           <label className="cursor-pointer block py-2 bg-purple-600 text-white font-bold text-xs text-center rounded-xl"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadVendas}/>Importar Vendas</label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-cyan-500/30">
           <h3 className="font-bold text-white text-sm mb-4">Débitos Frete FLEX</h3>
           <p className="text-[9px] text-slate-400 mb-2">A: ID | B: Valor</p>
           <label className="cursor-pointer block py-2 bg-cyan-600 text-white font-bold text-xs text-center rounded-xl mt-auto"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={e => readGeneric(e, setFlexData, 'FLEX', 'flex', (r:any) => ({val: parseBrFloat(r[1]), obj: {id_pedido: String(r[0]||'').trim(), valor_frete: parseBrFloat(r[1])}}))} />Importar Flex</label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-amber-500/30">
           <h3 className="font-bold text-white text-sm mb-4">Custos de ADS</h3>
           <p className="text-[9px] text-slate-400 mb-2">A: Canal | B: Valor</p>
           <label className="cursor-pointer block py-2 bg-amber-600 text-white font-bold text-xs text-center rounded-xl mt-auto"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={e => readGeneric(e, setAdsData, 'ADS', 'ads', (r:any) => ({val: parseBrFloat(r[1]), obj: {canal: String(r[0]||'').trim(), custo_ads: parseBrFloat(r[1])}}))} />Importar ADS</label>
         </div>
       </div>

       <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30 mt-6">
          <h3 className="font-bold text-rose-400 text-sm mb-4"><i className="fa-solid fa-trash mr-2"></i>Zona de Limpeza</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => clearData('vendas', 'vendas', setSales)} className="px-3 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar Vendas</button>
            <button onClick={() => clearData('faturados', 'faturados', setFaturados)} className="px-3 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar Faturados</button>
            <button onClick={() => clearData('cancelados', 'cancelados', setCancelados)} className="px-3 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar Cancelados</button>
            <button onClick={() => clearData('flex', 'flex', setFlexData)} className="px-3 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar FLEX</button>
            <button onClick={() => clearData('ads', 'ads', setAdsData)} className="px-3 py-2 bg-slate-950 hover:bg-rose-900 border border-slate-800 text-slate-300 text-[10px] font-bold rounded-lg transition">Apagar ADS</button>
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