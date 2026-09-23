'use client';
import React, { useState } from 'react';
import { useAppContext, INITIAL_ADMIN_PASS, CHANNELS } from '@/context/AppContext';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const { 
    isAdminUnlocked, setIsAdminUnlocked, channelRules, products, sales, setSales, setProducts, addLog, logs 
  } = useAppContext();
  
  const [password, setPassword] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearPassword, setClearPassword] = useState('');

  const [faturadosSet, setFaturadosSet] = useState<Set<string>>(new Set());
  const [canceladosSet, setCanceladosSet] = useState<Set<string>>(new Set());

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

  const evaluateFormula = (formulaStr: string, row: any, rebateVal: number) => {
    try {
      let expr = formulaStr.toUpperCase().replace(/(\d+(?:\.\d+)?)%/g, (m, p1) => (parseFloat(p1) / 100).toString());
      expr = expr.replace(/([A-Z]+)\d*/g, (m, colLet) => {
        const val = row[colToIdx(colLet)];
        return (val !== undefined && val !== null ? parseFloat(val) || 0 : 0).toString();
      });
      const result = new Function(`return ${expr.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '')};`)();
      const baseLiquido = isNaN(result) ? 0 : result;
      return baseLiquido + rebateVal; 
    } catch { return rebateVal; }
  };

  // Conversor Inteligente de Estados para UF
  const converterEstadoParaUF = (estadoBruto: string) => {
    if (!estadoBruto) return 'SP'; // Fallback padrão
    
    // Remove acentos, espaços extras e deixa minúsculo para comparar
    const estado = estadoBruto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    
    if (estado.length === 2) return estado.toUpperCase(); // Já é UF

    const mapaUF: Record<string, string> = {
      'acre': 'AC', 'alagoas': 'AL', 'amapa': 'AP', 'amazonas': 'AM',
      'bahia': 'BA', 'ceara': 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES',
      'goias': 'GO', 'maranhao': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
      'minas gerais': 'MG', 'para': 'PA', 'paraiba': 'PB', 'parana': 'PR',
      'pernambuco': 'PE', 'piaui': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
      'rio grande do sul': 'RS', 'rondonia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
      'sao paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO'
    };

    return mapaUF[estado] || estadoBruto.substring(0, 2).toUpperCase(); // Retorna a UF ou as 2 primeiras letras como fallback
  };

  // 1. Upload Faturados
  const handleUploadFaturados = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const newSet = new Set<string>();
      rows.slice(1).forEach(r => { if (r[0]) newSet.add(String(r[0]).trim()); });
      setFaturadosSet(newSet);
      addLog(`Base Faturados carregada: ${newSet.size} pedidos habilitados para filtro.`, 'success');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 2. Upload Cancelados
  const handleUploadCancelados = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const newSet = new Set<string>();
      rows.slice(1).forEach(r => { if (r[0]) newSet.add(String(r[0]).trim()); });
      setFaturadosSet(prev => {
        const updated = new Set(prev);
        newSet.forEach(id => updated.delete(id));
        return updated;
      });
      setCanceladosSet(newSet);
      addLog(`${newSet.size} pedidos cancelados identificados e removidos.`, 'warning');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 3. Upload Envios Flex
  const handleUploadFlex = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      const idsFlex = new Set<string>();
      rows.slice(1).forEach(r => { if (r[0]) idsFlex.add(String(r[0]).trim()); });

      setSales((prev: any[]) => prev.map(s => {
        if (idsFlex.has(s.id_pedido)) {
          return { ...s, faturamento_liquido_final: Math.max(0, s.faturamento_liquido_final - 12.99) };
        }
        return s;
      }));
      addLog(`Fretes FLEX aplicados em ${idsFlex.size} pedidos (-R$ 12,99 un).`, 'success');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 4. Upload Adsense
  const handleUploadAds = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      
      let count = 0;
      rows.slice(1).forEach(r => {
        const canalRef = String(r[0] || '').trim();
        const valorAds = parseFloat(r[1]) || 0;
        if (canalRef && valorAds > 0) {
          setSales((prev: any[]) => prev.map(s => {
            if (s.canal.toLowerCase() === canalRef.toLowerCase()) {
              return { ...s, faturamento_liquido_final: Math.max(0, s.faturamento_liquido_final - (valorAds / prev.filter(x => x.canal === s.canal).length || 1)) };
            }
            return s;
          }));
          count++;
        }
      });
      addLog(`Investimento ADS processado para ${count} canais.`, 'success');
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 5. Upload Vendas do Canal 
  const handleUploadVendasCanal = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);

    const rule = channelRules.find((r: any) => r.canal === selectedChannel) || {
      colIdPedido: 'A', colSku: 'B', colEstado: 'C', colRebate: 'NAO', formulaExcel: 'D2'
    };

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        
        const novasVendas: any[] = [];
        rows.slice(1).forEach((row, i) => {
          if (!row || !row.length) return;
          const idPed = row[colToIdx(rule.colIdPedido)] ? String(row[colToIdx(rule.colIdPedido)]).trim() : `PDV-${i}`;

          if (faturadosSet.size > 0 && !faturadosSet.has(idPed)) return;
          if (canceladosSet.has(idPed)) return;

          const skuVal = row[colToIdx(rule.colSku)] ? String(row[colToIdx(rule.colSku)]).trim().toUpperCase() : 'SKU-GERAL';
          
          // Tratamento do Estado
          const estadoBruto = row[colToIdx(rule.colEstado)] ? String(row[colToIdx(rule.colEstado)]) : 'SP';
          const estadoConvertido = converterEstadoParaUF(estadoBruto);
          
          let rebateVal = 0;
          if (rule.colRebate && rule.colRebate !== 'NAO') {
            rebateVal = parseFloat(row[colToIdx(rule.colRebate)]) || 0;
          }

          const liquidoFinal = evaluateFormula(rule.formulaExcel, row, rebateVal);
          const prodMatch = products.find((p: any) => p.sku === skuVal);
          const custoProd = prodMatch ? (Number(prodMatch.preco_custo) || 0) + (Number(prodMatch.custo_embalagem) || 0) : 0;
          const liquidoAposCustos = Math.max(0, liquidoFinal - custoProd);

          novasVendas.push({
            id_pedido: idPed,
            data_faturamento: new Date().toISOString().slice(0, 10),
            canal: selectedChannel,
            estado: estadoConvertido,
            sku: skuVal,
            quantidade: 1,
            preco_venda: liquidoFinal,
            faturamento_liquido_final: liquidoAposCustos
          });
        });

        setSales((prev: any) => [...novasVendas, ...prev]);
        addLog(`Processadas ${novasVendas.length} vendas para [${selectedChannel}] (Estados e Custos ajustados).`, 'success');
      } catch (err: any) {
        addLog(`Erro ao processar vendas: ${err.message}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // --- ACÕES GLOBAIS ---
  const handleExportDashboard = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      const wsVendas = XLSX.utils.json_to_sheet(sales);
      XLSX.utils.book_append_sheet(wb, wsVendas, "Vendas Processadas");

      const wsSkus = XLSX.utils.json_to_sheet(products);
      XLSX.utils.book_append_sheet(wb, wsSkus, "Base de SKUs e Custos");

      XLSX.writeFile(wb, `Exportacao_ApexMetrics_${new Date().toISOString().slice(0,10)}.xlsx`);
      addLog('Exportação do Dashboard concluída com sucesso.', 'success');
    } catch (err) {
      addLog('Erro ao exportar dados.', 'error');
    }
  };

  const handleExecuteClearBase = (e: React.FormEvent) => {
    e.preventDefault();
    if (clearPassword === INITIAL_ADMIN_PASS) {
      setSales([]);
      setProducts([]);
      setFaturadosSet(new Set());
      setCanceladosSet(new Set());
      addLog('ATENÇÃO: Toda a base de dados (Vendas, Custos, Filtros) foi limpa com sucesso.', 'warning');
      setShowClearModal(false);
      setClearPassword('');
    } else {
      addLog('Falha na limpeza: Senha Master incorreta.', 'error');
    }
  };

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center mt-10 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Área Restrita Admin</h2>
        <form onSubmit={auth}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha Master (Dash321)" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl mb-4 text-white text-sm" />
          <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transition">Desbloquear Central</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {/* 1. Pedidos Faturados */}
         <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
           <div>
             <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-block mb-2">Base de Filtro</span>
             <h3 className="font-bold text-white text-sm">Pedidos Faturados (ERP)</h3>
             <p className="text-xs text-slate-400 mt-1">Define quais pedidos devem ser validados e mantidos.</p>
           </div>
           <label className="cursor-pointer block py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs text-center rounded-xl transition">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadFaturados} />
             <i className="fa-solid fa-upload mr-2"></i>Importar Faturados
           </label>
         </div>

         {/* 2. Pedidos Cancelados */}
         <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
           <div>
             <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-block mb-2">Exclusão</span>
             <h3 className="font-bold text-white text-sm">Pedidos Cancelados</h3>
             <p className="text-xs text-slate-400 mt-1">Remove automaticamente os pedidos cancelados da base.</p>
           </div>
           <label className="cursor-pointer block py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs text-center rounded-xl transition">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadCancelados} />
             <i className="fa-solid fa-upload mr-2"></i>Importar Cancelados
           </label>
         </div>

         {/* 3. Envios Flex */}
         <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
           <div>
             <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 inline-block mb-2">Logística</span>
             <h3 className="font-bold text-white text-sm">Envios Flex (-R$ 12,99)</h3>
             <p className="text-xs text-slate-400 mt-1">Subtrai automaticamente a taxa de envio Flex por pedido.</p>
           </div>
           <label className="cursor-pointer block py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs text-center rounded-xl transition">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadFlex} />
             <i className="fa-solid fa-upload mr-2"></i>Importar Fretes Flex
           </label>
         </div>

         {/* 4. Adsense por Canal */}
         <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
           <div>
             <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block mb-2">Mídia</span>
             <h3 className="font-bold text-white text-sm">Adsense / Investimento ADS</h3>
             <p className="text-xs text-slate-400 mt-1">Abate o investimento de ADS proporcionalmente por canal.</p>
           </div>
           <label className="cursor-pointer block py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center rounded-xl transition">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadAds} />
             <i className="fa-solid fa-upload mr-2"></i>Importar Adsense
           </label>
         </div>

         {/* 5. Vendas Brutas do Canal */}
         <div className="bg-slate-900 p-5 rounded-2xl border border-purple-500/30 flex flex-col justify-between space-y-3 lg:col-span-2">
           <div>
             <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-block mb-2">Processamento</span>
             <h3 className="font-bold text-white text-sm">Planilha do Canal Final</h3>
             <p className="text-xs text-slate-400 mt-1">Aplica fórmula, rebate, converte UF, filtra faturados e desconta custos.</p>
           </div>
           <div className="flex flex-col sm:flex-row gap-3">
             <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="w-full sm:w-1/2 p-2.5 bg-slate-950 border border-purple-500/30 rounded-xl text-xs text-purple-300 font-bold">
               {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
             </select>
             <label className={`w-full sm:w-1/2 cursor-pointer block py-2.5 text-white font-bold text-xs text-center rounded-xl transition shadow-lg ${isProcessing ? 'bg-slate-600' : 'bg-purple-600 hover:bg-purple-500'}`}>
               <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadVendasCanal} disabled={isProcessing} />
               <i className={`fa-solid ${isProcessing ? 'fa-spinner fa-spin' : 'fa-play'} mr-2`}></i>
               {isProcessing ? 'A processar...' : 'Processar Vendas do Canal'}
             </label>
           </div>
         </div>
       </div>

       {/* Ações Globais */}
       <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
         <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2">Gestão e Manutenção da Base</h3>
         <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={handleExportDashboard} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition">
              <i className="fa-solid fa-file-excel mr-2 text-emerald-400"></i> Exportar Dados do Dashboard
            </button>
            <button onClick={() => setShowClearModal(true)} className="flex-1 py-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900 font-bold rounded-xl text-xs transition">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i> Limpar Toda a Base de Dados
            </button>
         </div>
       </div>

       {/* Console */}
       <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Console de Auditoria</h3>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs max-h-40 overflow-auto text-slate-300 space-y-1 border border-slate-800">
             {logs.map((log: any) => (
               <div key={log.id} className="flex gap-2">
                 <span className="text-slate-600">[{log.timestamp}]</span>
                 <span className={log.type === 'error' ? 'text-red-400' : log.type === 'warning' ? 'text-amber-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}>{log.message}</span>
               </div>
             ))}
          </div>
       </div>

       {/* Modal de Limpeza de Base */}
       {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
             <div className="flex justify-between items-center border-b border-slate-800 pb-3">
               <h3 className="font-bold text-rose-400 text-base flex items-center gap-2"><i className="fa-solid fa-radiation"></i> Ação Destrutiva</h3>
               <button onClick={() => setShowClearModal(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
             </div>
             <p className="text-xs text-slate-300">
               Tem a certeza que deseja limpar completamente as tabelas de Vendas, Custos, SKUs e Filtros do sistema? <strong>Esta ação é irreversível.</strong>
             </p>
             <form onSubmit={handleExecuteClearBase} className="space-y-4 pt-2">
               <div>
                 <label className="block text-xs font-bold text-slate-400 mb-1">Confirme com a Senha Master *</label>
                 <input type="password" required value={clearPassword} onChange={e => setClearPassword(e.target.value)} placeholder="Senha (Dash321)" className="w-full p-2.5 bg-slate-950 border border-rose-500/40 rounded-xl text-xs text-white" />
               </div>
               <div className="flex gap-2 justify-end">
                 <button type="button" onClick={() => setShowClearModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition">Cancelar</button>
                 <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition">Executar Limpeza</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}