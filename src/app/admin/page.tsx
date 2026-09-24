'use client';
import React, { useState } from 'react';
import { useAppContext, INITIAL_ADMIN_PASS } from '@/context/AppContext';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const { canais, isAdminUnlocked, setIsAdminUnlocked, channelRules, setSales, setFlexData, setAdsData, addLog, logs } = useAppContext();
  const [password, setPassword] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(canais[0]);

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
      let expr = formulaStr.toUpperCase().replace(/(\d+(?:\.\d+)?)%/g, (m: string, p1: string) => (parseFloat(p1) / 100).toString());
      expr = expr.replace(/([A-Z]+)\d*/g, (m: string, colLet: string) => {
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
      const newSales = rows.slice(1).map((row, i) => {
        if (!row || !row.length) return null;
        const repasse = evaluateExcelFormula(rule.formulaExcel, row);
        return {
          id_pedido: row[colToIdx(rule.colIdPedido)] || `PED-${Date.now()}-${i}`,
          data_faturamento: new Date().toISOString().slice(0, 10),
          canal: selectedChannel,
          sku: row[colToIdx(rule.colSku)] || 'SKU-GENERAL',
          quantidade: parseInt(row[colToIdx(rule.colQuantidade)], 10) || 1,
          preco_venda: parseFloat(row[colToIdx('C')]) || 100,
          repasse_liquido: repasse, 
          faturamento_liquido_final: repasse * (parseInt(row[colToIdx(rule.colQuantidade)], 10) || 1)
        };
      }).filter(Boolean);
      
      setSales((prev: any) => [...newSales, ...prev]);
      addLog(`${newSales.length} pedidos importados para [${selectedChannel}].`, 'success');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadFlex = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      const novosFretes = rows.slice(1).map(row => {
        if (!row || !row.length) return null;
        return {
          id_pedido: String(row[0] || '').trim(),
          valor_frete: parseFloat(row[1]) || 12.99
        };
      }).filter(f => f && f.id_pedido);

      setFlexData((prev: any) => [...novosFretes, ...prev]);
      addLog(`${novosFretes.length} registos de Frete Flex importados.`, 'success');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadAds = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      const novosAds = rows.slice(1).map(row => {
        if (!row || !row.length) return null;
        return {
          canal: String(row[0] || '').trim(),
          custo_ads: parseFloat(row[1]) || 0
        };
      }).filter(a => a && a.canal && a.custo_ads > 0);

      setAdsData((prev: any) => [...novosAds, ...prev]);
      addLog(`${novosAds.length} registos de ADS importados.`, 'success');
    };
    reader.readAsArrayBuffer(file);
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
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-slate-900 p-5 rounded-2xl border border-purple-500/30">
           <h3 className="font-bold text-white text-sm mb-2">1. Vendas do Marketplace</h3>
           <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="w-full p-2 bg-slate-950 rounded-xl mb-3 text-purple-300 font-bold">{canais.map((ch: string) => <option key={ch}>{ch}</option>)}</select>
           <label className="cursor-pointer block py-2.5 bg-purple-600 text-white font-bold text-xs text-center rounded-xl"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadVendas}/>Importar Vendas ({selectedChannel})</label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-cyan-500/30">
           <h3 className="font-bold text-white text-sm mb-2">2. Débitos Frete FLEX</h3>
           <p className="text-xs text-slate-400 mb-4">Coluna A: ID Pedido | Coluna B: Custo</p>
           <label className="cursor-pointer block py-2.5 bg-cyan-600 text-white font-bold text-xs text-center rounded-xl"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadFlex}/>Importar Fretes FLEX</label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-amber-500/30">
           <h3 className="font-bold text-white text-sm mb-2">3. Investimento em ADS</h3>
           <p className="text-xs text-slate-400 mb-4">Coluna A: Canal | Coluna B: Valor Total</p>
           <label className="cursor-pointer block py-2.5 bg-amber-600 text-white font-bold text-xs text-center rounded-xl"><input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadAds}/>Importar ADS por Canal</label>
         </div>
       </div>

       <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <h3 className="font-bold text-white mb-2">Console de Auditoria</h3>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs max-h-40 overflow-auto text-slate-300 space-y-1">
             {logs.map((log: any) => <div key={log.id}>[{log.timestamp}] {log.message}</div>)}
          </div>
       </div>
    </div>
  );
}