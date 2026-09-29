'use client';
import React, { useState, useRef } from 'react';
import { useAppContext, INITIAL_ADMIN_PASS } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const { 
    canais, isAdminUnlocked, setIsAdminUnlocked, channelRules, 
    sales, setSales, flexData, setFlexData, adsData, setAdsData, 
    faturados, setFaturados, cancelados, setCancelados, addLog, logs 
  } = useAppContext();
  
  const [password, setPassword] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(canais[0] || 'Mercado Livre 1');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [colFaturadosObs, setColFaturadosObs] = useState('AI');
  const [colFaturadosData, setColFaturadosData] = useState('D');
  const [colCancelados, setColCancelados] = useState('A');

  const fileVendasRef = useRef<HTMLInputElement>(null);

  const auth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === INITIAL_ADMIN_PASS) { 
      setIsAdminUnlocked(true); 
      addLog('Área administrativa desbloqueada.', 'success'); 
    } else {
      alert('Senha incorreta.');
    }
  };

  const colToIdx = (colStr: string) => {
    if (!colStr) return 0;
    let base = 0;
    const clean = String(colStr).trim().toUpperCase();
    for (let i = 0; i < clean.length; i++) {
      base = base * 26 + (clean.charCodeAt(i) - 64);
    }
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

  const evaluateFormula = (formulaStr: string, row: any, rebateVal: number) => {
    try {
      let expr = formulaStr.toUpperCase().replace(/(\d+(?:\.\d+)?)%/g, (m, p1) => (parseFloat(p1) / 100).toString());
      expr = expr.replace(/([A-Z]+)\d*/g, (m, colLet) => {
        const val = row[colToIdx(colLet)];
        return (val !== undefined && val !== null ? parseFloat(val) || 0 : 0).toString();
      });
      const result = new Function(`return ${expr.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '')};`)();
      return (isNaN(result) ? 0 : Math.max(0, result)) + rebateVal;
    } catch { return 0; }
  };

  const saveToCloudAndState = async (key: string, data: any, setter: any) => {
    setter(data);
    try {
      await supabase.from('tb_estado_global').upsert([{ chave: key, dados: data }], { onConflict: 'chave' });
    } catch (err) {
      console.error(`Erro ao salvar ${key} no Supabase:`, err);
    }
  };

  const handleUploadFaturados = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        
        const novosFaturados: any[] = [];
        const idxObs = colToIdx(colFaturadosObs);
        const idxData = colToIdx(colFaturadosData);

        rows.slice(1).forEach((row) => {
          if (!row || !row.length) return;
          const obsText = String(row[idxObs] || row[34] || '');
          const match = obsText.match(/20000[0-9]+/);
          
          if (match) {
            const pedidoId = match[0];
            const dataEmissao = parseExcelDate(row[idxData]);
            novosFaturados.push({ id: pedidoId, data: dataEmissao });
          }
        });

        await saveToCloudAndState('faturados', novosFaturados, setFaturados);
        addLog(`${novosFaturados.length} IDs Faturados extraídos e salvos na nuvem.`, 'success');
        alert(`${novosFaturados.length} faturados lidos com sucesso e salvos no Supabase!`);
      } catch (err: any) {
        alert(`Erro ao ler faturados: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleUploadCancelados = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const novosCancelados: any[] = [];
        const idxId = colToIdx(colCancelados);

        rows.slice(1).forEach((row) => {
          if (!row || !row.length) return;
          const rawId = row[idxId];
          if (rawId) novosCancelados.push(String(rawId).trim());
        });

        await saveToCloudAndState('cancelados', novosCancelados, setCancelados);
        addLog(`${novosCancelados.length} IDs Cancelados salvos na nuvem.`, 'warning');
        alert(`${novosCancelados.length} cancelados salvos!`);
      } catch (err: any) {
        alert(`Erro ao ler cancelados: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleUploadVendasCanal = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);

    const rule = channelRules.find((r: any) => r.canal === selectedChannel) || {
      colIdPedido: 'A', colSku: 'W', colRebate: 'C', colPrecoVenda: 'E', colQuantidade: 'H', formulaExcel: 'E2 - (E2 * 0.12)'
    };

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        
        const fatMap = new Map();
        if (faturados && faturados.length > 0) {
          faturados.forEach((item: any) => {
            fatMap.set(String(item.id).trim(), item.data);
          });
        }

        const cancSet = new Set(cancelados.map((id: string) => String(id).trim()));
        const novasVendas: any[] = [];

        let i = 0;
        while (i < rows.length) {
          const row = rows[i];
          if (!row || !row.length) { i++; continue; }

          const rawId = row[colToIdx(rule.colIdPedido)];
          const idPedBruto = rawId ? String(rawId).trim() : '';

          if (!idPedBruto || idPedBruto.length < 5 || idPedBruto.toLowerCase().includes('neste relatório')) {
            i++; continue;
          }

          if (cancSet.has(idPedBruto)) { i++; continue; }

          const dataFaturamento = fatMap.get(idPedBruto) || parseExcelDate(row[1]) || new Date().toISOString().slice(0, 10);
          const precoVendaRaw = row[colToIdx(rule.colPrecoVenda || 'E')];
          const repasse = evaluateFormula(rule.formulaExcel, row, parseBrFloat(row[colToIdx(rule.colRebate || 'C')]));

          const descStatus = String(row[3] || row[4] || '').toLowerCase();
          const pkgMatch = descStatus.match(/pacote de (\d+) produt/i);
          const numItems = pkgMatch ? parseInt(pkgMatch[1], 10) : 0;

          if (numItems > 1) {
            let processed = 0;
            let sub = 1;
            while (sub <= numItems && (i + sub) < rows.length) {
              const subRow = rows[i + sub];
              if (subRow) {
                const subSku = String(subRow[colToIdx(rule.colSku || 'W')] || 'SKU-GERAL').trim().toUpperCase();
                const subQtd = parseInt(String(subRow[colToIdx(rule.colQuantidade || 'H')] || '1').replace(/[^0-9]/g, ''), 10) || 1;

                if (subSku && subSku !== 'SKU-GERAL') {
                  novasVendas.push({
                    id_pedido: idPedBruto,
                    data_faturamento: dataFaturamento,
                    canal: selectedChannel,
                    sku: subSku,
                    quantidade: subQtd,
                    preco_venda: processed === 0 ? parseBrFloat(precoVendaRaw) : 0,
                    repasse_liquido: processed === 0 ? repasse : 0
                  });
                  processed++;
                }
              }
              sub++;
            }
            i += numItems;
          } else {
            const skuVal = row[colToIdx(rule.colSku || 'W')] ? String(row[colToIdx(rule.colSku || 'W')]).trim().toUpperCase() : 'SKU-GERAL';
            const quantidade = parseInt(String(row[colToIdx(rule.colQuantidade || 'H')] || '1').replace(/[^0-9]/g, ''), 10) || 1;

            novasVendas.push({
              id_pedido: idPedBruto,
              data_faturamento: dataFaturamento,
              canal: selectedChannel,
              sku: skuVal,
              quantidade: quantidade,
              preco_venda: parseBrFloat(precoVendaRaw),
              repasse_liquido: repasse
            });
          }
          i++;
        }

        const salesWithKeys = novasVendas.map((s, idx) => ({ ...s, unique_key: `${s.id_pedido}_${s.sku}_${idx}` }));
        const updatedSales = [...salesWithKeys, ...sales];
        await saveToCloudAndState('vendas', updatedSales, setSales);

        addLog(`Sucesso: ${novasVendas.length} itens de vendas importados e salvos na nuvem.`, 'success');
        alert(`Importação concluída com sucesso! ${novasVendas.length} itens gravados no Supabase.`);
      } catch (err: any) {
        addLog(`Erro ao processar vendas: ${err.message}`, 'error');
        alert(`Erro ao processar ficheiro: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileVendasRef.current) fileVendasRef.current.value = '';
  };

  const readGeneric = async (e: any, setter: any, type: string, keyName: string, currentArr: any[], mapper: (row: any[]) => { val: number; obj: any }) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const data = rows.slice(1).map(mapper).filter((i: any) => i && i.val > 0);
      if (data.length > 0) {
        const newObjs = data.map((d: any) => d.obj);
        const updated = [...newObjs, ...currentArr];
        await saveToCloudAndState(keyName, updated, setter);
        addLog(`${data.length} registos de ${type} salvos na nuvem.`, 'success');
        alert(`${data.length} registos de ${type} salvos com sucesso!`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const clearData = async (type: string, keyName: string, setter: any) => {
    if (confirm(`Tem a certeza que deseja limpar a base de ${type.toUpperCase()}?`)) {
      await saveToCloudAndState(keyName, [], setter);
      addLog(`Base de ${type.toUpperCase()} limpa na nuvem.`, 'warning');
    }
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center shadow-2xl mt-10">
        <h2 className="text-xl font-bold text-white mb-2">Área Restrita Admin</h2>
        <form onSubmit={auth}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (Dash321)" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl mb-4 text-white text-sm" />
          <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition">Desbloquear Central</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <h2 className="text-xl font-bold text-white mb-4">Passo 1: Bases e Filtros ERP</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/30 space-y-3">
           <h3 className="font-bold text-emerald-400 text-sm">Faturados (NFes Saída)</h3>
           <div className="flex gap-2">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold mb-1">Coluna Observações (ID)</span>
                <input type="text" value={colFaturadosObs} onChange={e => setColFaturadosObs(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 text-emerald-300 font-bold text-center border border-slate-700 rounded-lg text-xs" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold mb-1">Coluna Data</span>
                <input type="text" value={colFaturadosData} onChange={e => setColFaturadosData(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 text-emerald-300 font-bold text-center border border-slate-700 rounded-lg text-xs" />
              </div>
           </div>
           <label className="cursor-pointer block text-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadFaturados}/>Subir Faturados
           </label>
           <p className="text-[10px] text-slate-400 text-center">Registos Carregados: {faturados.length}</p>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30 space-y-3">
           <h3 className="font-bold text-rose-400 text-sm">Cancelados</h3>
           <div>
              <span className="block text-[10px] text-slate-400 font-bold mb-1">Coluna ID</span>
              <input type="text" value={colCancelados} onChange={e => setColCancelados(e.target.value.toUpperCase())} className="w-24 p-2 bg-slate-950 text-rose-300 font-bold text-center border border-slate-700 rounded-lg text-xs" />
           </div>
           <label className="cursor-pointer block text-center px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition mt-4">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadCancelados}/>Subir Cancelados
           </label>
           <p className="text-[10px] text-slate-400 text-center">Registos Carregados: {cancelados.length}</p>
         </div>
       </div>

       <h2 className="text-xl font-bold text-white mt-8 mb-4">Passo 2: Vendas, Custos e Logística</h2>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-slate-900 p-5 rounded-2xl border border-purple-500/30 flex flex-col justify-between">
           <div>
             <h3 className="font-bold text-white text-sm mb-3">Planilha Vendas (Canal)</h3>
             <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="w-full p-2.5 bg-slate-950 mb-4 text-purple-300 border border-slate-700 font-bold rounded-xl text-xs">
               {canais.map((ch: string) => <option key={ch} value={ch}>{ch}</option>)}
             </select>
           </div>
           <label className={`cursor-pointer block py-3 text-white font-bold text-xs text-center rounded-xl transition shadow-lg ${isProcessing ? 'bg-slate-600' : 'bg-purple-600 hover:bg-purple-500'}`}>
             <input ref={fileVendasRef} type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadVendasCanal} disabled={isProcessing}/>
             {isProcessing ? 'A processar...' : 'Importar e Cruzar Vendas'}
           </label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-cyan-500/30 flex flex-col justify-between">
           <div>
             <h3 className="font-bold text-white text-sm mb-1">Débitos Frete FLEX</h3>
             <p className="text-[10px] text-slate-400 mb-3">Coluna A: ID do Pedido | Coluna B: Valor do Frete</p>
           </div>
           <label className="cursor-pointer block py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs text-center rounded-xl transition shadow-lg">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={e => readGeneric(e, setFlexData, 'FLEX', 'flex', flexData, (r:any) => ({val: parseBrFloat(r[1]), obj: {id_pedido: String(r[0]||'').trim(), valor_frete: parseBrFloat(r[1])}}))} />
             Importar Frete Flex
           </label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-amber-500/30 flex flex-col justify-between">
           <div>
             <h3 className="font-bold text-white text-sm mb-1">Investimento ADS</h3>
             <p className="text-[10px] text-slate-400 mb-3">Coluna A: Nome do Canal | Coluna B: Valor Gasto</p>
           </div>
           <label className="cursor-pointer block py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs text-center rounded-xl transition shadow-lg">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={e => readGeneric(e, setAdsData, 'ADS', 'ads', adsData, (r:any) => ({val: parseBrFloat(r[1]), obj: {canal: String(r[0]||'').trim(), custo_ads: parseBrFloat(r[1])}}))} />
             Importar ADS
           </label>
         </div>
       </div>

       <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30 mt-6 space-y-3">
          <h3 className="font-bold text-rose-400 text-sm flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> Zona de Limpeza</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button onClick={() => clearData('vendas', 'vendas', setSales)} className="py-2.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition">Apagar Vendas</button>
            <button onClick={() => clearData('faturados', 'faturados', setFaturados)} className="py-2.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition">Apagar Faturados</button>
            <button onClick={() => clearData('cancelados', 'cancelados', setCancelados)} className="py-2.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition">Apagar Cancelados</button>
            <button onClick={() => clearData('flex', 'flex', setFlexData)} className="py-2.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition">Apagar FLEX</button>
            <button onClick={() => clearData('ads', 'ads', setAdsData)} className="py-2.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition">Apagar ADS</button>
          </div>
       </div>

       <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex justify-between items-center"><h3 className="font-bold text-white text-xs uppercase tracking-wider">Console de Auditoria</h3><button onClick={() => addLog('Console limpo.', 'info')} className="text-[10px] text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded-lg">Limpar Console</button></div>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs max-h-40 overflow-y-auto text-slate-300 space-y-1.5 border border-slate-800">
             {logs.map((log: any) => (<div key={log.id}><span className="text-slate-500 mr-2">[{log.timestamp}]</span> <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : log.type === 'error' ? 'text-rose-400' : 'text-slate-300'}>{log.message}</span></div>))}
          </div>
       </div>
    </div>
  );
}