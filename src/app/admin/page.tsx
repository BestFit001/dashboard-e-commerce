'use client';
import React, { useState, useRef } from 'react';
import { useAppContext, INITIAL_ADMIN_PASS } from '@/context/AppContext';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const { 
    canais, isAdminUnlocked, setIsAdminUnlocked, channelRules, 
    setSales, setFlexData, setAdsData, setGoals, 
    faturados, setFaturados, cancelados, setCancelados, addLog, logs 
  } = useAppContext();
  
  const [password, setPassword] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(canais[0] || 'Mercado Livre 1');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [colFaturadosId, setColFaturadosId] = useState('AI');
  const [colFaturadosData, setColFaturadosData] = useState('D');
  const [colCancelados, setColCancelados] = useState('AI');

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

  // 1. UPLOAD FATURADOS
  const handleUploadFaturados = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        
        const novosFaturados: any[] = [];
        const idxId = colToIdx(colFaturadosId);
        const idxData = colToIdx(colFaturadosData);

        rows.slice(1).forEach((row) => {
          if (!row || !row.length) return;
          const rawId = row[idxId];
          if (rawId) {
            const cleanId = String(rawId).trim();
            novosFaturados.push({
              id: cleanId,
              data: parseExcelDate(row[idxData])
            });
          }
        });

        setFaturados(novosFaturados);
        addLog(`${novosFaturados.length} IDs Faturados carregados para a trava de segurança.`, 'success');
        alert(`${novosFaturados.length} faturados importados com sucesso!`);
      } catch (err: any) {
        alert(`Erro ao ler faturados: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 2. UPLOAD CANCELADOS
  const handleUploadCancelados = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        
        const novosCancelados: any[] = [];
        const idxId = colToIdx(colCancelados);

        rows.slice(1).forEach((row) => {
          if (!row || !row.length) return;
          const rawId = row[idxId];
          if (rawId) {
            novosCancelados.push(String(rawId).trim());
          }
        });

        setCancelados(novosCancelados);
        addLog(`${novosCancelados.length} IDs Cancelados carregados.`, 'warning');
        alert(`${novosCancelados.length} cancelados importados!`);
      } catch (err: any) {
        alert(`Erro ao ler cancelados: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 3. UPLOAD VENDAS (COM TRAVA INTELIGENTE E FILTRAGEM DE CABEÇALHOS)
  const handleUploadVendasCanal = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);

    const rule = channelRules.find((r: any) => r.canal === selectedChannel) || {
      colIdPedido: 'A', colSku: 'B', colRebate: 'C', colPrecoVenda: 'D', colQuantidade: 'G', formulaExcel: 'D2 - (D2 * 0.12) + C2'
    };

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        
        const fatSet = new Set(faturados.map((id: string) => String(id).replace(/[^0-9]/g, '')));
        const cancSet = new Set(cancelados.map((id: string) => String(id).replace(/[^0-9]/g, '')));

        let bloqueadosFaturados = 0;
        let bloqueadosCancelados = 0;
        let ignoradosCabecalho = 0;
        const novasVendas: any[] = [];

        rows.slice(1).forEach((row, i) => {
          if (!row || !row.length) return;

          const rawId = row[colToIdx(rule.colIdPedido)];
          const idPedBruto = rawId ? String(rawId).trim() : '';

          // Ignora cabeçalhos, textos longos explicativos e avisos comuns de relatórios
          if (!idPedBruto || idPedBruto.length < 5 || idPedBruto.toLowerCase().includes('neste relatório') || idPedBruto.toLowerCase().includes('vendas') || idPedBruto.toLowerCase().includes('código')) {
            ignoradosCabecalho++;
            return;
          }

          const idPedLimpo = idPedBruto.replace(/[^0-9]/g, '');

          if (fatSet.size > 0 && idPedLimpo && !fatSet.has(idPedLimpo)) {
              bloqueadosFaturados++;
              return;
          }
          
          if (cancSet.size > 0 && idPedLimpo && cancSet.has(idPedLimpo)) {
              bloqueadosCancelados++;
              return;
          }

          const skuVal = row[colToIdx(rule.colSku)] ? String(row[colToIdx(rule.colSku)]).trim().toUpperCase() : 'SKU-GERAL';
          const quantidade = parseFloat(row[colToIdx(rule.colQuantidade)]) || 1;
          const pdvUnitario = parseFloat(row[colToIdx(rule.colPrecoVenda)]) || 0;
          const rebate = parseFloat(row[colToIdx(rule.colRebate)]) || 0;

          const repasseBase = evaluateFormula(rule.formulaExcel, row, rebate);
          
          novasVendas.push({
            id_pedido: idPedBruto,
            data_faturamento: new Date().toISOString().slice(0, 10),
            canal: selectedChannel,
            sku: skuVal,
            quantidade: quantidade,
            preco_venda: pdvUnitario * quantidade,
            repasse_liquido: repasseBase,
            faturamento_liquido_final: repasseBase 
          });
        });

        setSales((prev: any) => [...prev, ...novasVendas]);
        addLog(`Sucesso: ${novasVendas.length} vendas importadas para o canal [${selectedChannel}].`, 'success');
        
        if (ignoradosCabecalho > 0) addLog(`Info: ${ignoradosCabecalho} linhas de texto/cabeçalho ignoradas.`, 'warning');
        if (bloqueadosFaturados > 0) addLog(`Atenção: ${bloqueadosFaturados} linhas bloqueadas (não encontradas nos Faturados).`, 'error');
        if (bloqueadosCancelados > 0) addLog(`Atenção: ${bloqueadosCancelados} pedidos ignorados (Cancelados).`, 'warning');
        
        alert(`Importação concluída! ${novasVendas.length} vendas adicionadas.`);
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

  const readGeneric = (e: any, setter: any, type: string, mapper: Function) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const data = rows.slice(1).map(mapper).filter((i: any) => i.val > 0);
      if (data.length > 0) {
        setter((p: any) => [...data.map((d: any) => d.obj), ...p]);
        addLog(`${data.length} registos de ${type} inseridos.`, 'success');
        alert(`${data.length} registos de ${type} importados com sucesso!`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const clearData = (type: string) => {
    if (confirm(`Tem a certeza que deseja limpar a base de ${type.toUpperCase()}?`)) {
      if (type === 'vendas') setSales([]);
      if (type === 'faturados') setFaturados([]);
      if (type === 'cancelados') setCancelados([]);
      if (type === 'flex') setFlexData([]);
      if (type === 'ads') setAdsData([]);
      addLog(`Base de ${type.toUpperCase()} limpa.`, 'warning');
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
           <h3 className="font-bold text-emerald-400 text-sm">Faturados</h3>
           <div className="flex gap-2">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold mb-1">Coluna ID</span>
                <input type="text" value={colFaturadosId} onChange={e => setColFaturadosId(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 text-emerald-300 font-bold text-center border border-slate-700 rounded-lg text-xs" />
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
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={e => readGeneric(e, setFlexData, 'FLEX', (r:any) => ({val: parseBrFloat(r[1]), obj: {id_pedido: String(r[0]||'').trim(), valor_frete: parseBrFloat(r[1])}}))} />
             Importar Frete Flex
           </label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-amber-500/30 flex flex-col justify-between">
           <div>
             <h3 className="font-bold text-white text-sm mb-1">Investimento ADS</h3>
             <p className="text-[10px] text-slate-400 mb-3">Coluna A: Nome do Canal | Coluna B: Valor Gasto</p>
           </div>
           <label className="cursor-pointer block py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs text-center rounded-xl transition shadow-lg">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={e => readGeneric(e, setAdsData, 'ADS', (r:any) => ({val: parseBrFloat(r[1]), obj: {canal: String(r[0]||'').trim(), custo_ads: parseBrFloat(r[1])}}))} />
             Importar ADS
           </label>
         </div>
       </div>

       <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30 mt-6 space-y-3">
          <h3 className="font-bold text-rose-400 text-sm flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> Zona de Limpeza</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button onClick={() => clearData('vendas')} className="py-2.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition">Apagar Vendas</button>
            <button onClick={() => clearData('faturados')} className="py-2.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition">Apagar Faturados</button>
            <button onClick={() => clearData('cancelados')} className="py-2.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition">Apagar Cancelados</button>
            <button onClick={() => clearData('flex')} className="py-2.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition">Apagar FLEX</button>
            <button onClick={() => clearData('ads')} className="py-2.5 bg-slate-950 hover:bg-rose-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition">Apagar ADS</button>
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