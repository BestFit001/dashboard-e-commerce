'use client';
import React, { useState, useRef } from 'react';
import { useAppContext, INITIAL_ADMIN_PASS } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const { 
    canais, isAdminUnlocked, setIsAdminUnlocked, channelRules, 
    sales, setSales, flexData, setFlexData, adsData, setAdsData, 
    faturados, setFaturados, cancelados, setCancelados, importFaturadosComMes, importCanceladosComMes, importAdsComMes, addLog, logs 
  } = useAppContext();
  
  const [password, setPassword] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(canais[0] || 'Mercado Livre 1');
  const [targetChannelDelete, setTargetChannelDelete] = useState('TODOS');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [colFaturadosObs, setColFaturadosObs] = useState('AI');
  const [colFaturadosData, setColFaturadosData] = useState('D');
  
  const [mesFaturado, setMesFaturado] = useState(new Date().toISOString().slice(0, 7));
  const [mesCancelado, setMesCancelado] = useState(new Date().toISOString().slice(0, 7));
  const [mesAds, setMesAds] = useState(new Date().toISOString().slice(0, 7)); 

  const [colTarifasIdPedido, setColTarifasIdPedido] = useState('A');
  const [colTarifasValor, setColTarifasValor] = useState('E');

  const fileVendasRef = useRef<HTMLInputElement>(null);
  const fileCanceladosRef = useRef<HTMLInputElement>(null);
  const fileAdsRef = useRef<HTMLInputElement>(null);

  const auth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === INITIAL_ADMIN_PASS) { 
      setIsAdminUnlocked(true); 
      addLog('Área administrativa desbloqueada.', 'success'); 
    } else {
      alert('Senha incorreta.');
    }
  };

  const getDbUsageMB = () => {
    try {
      const estimate = (arr: any[]) => arr && arr.length > 0 ? JSON.stringify(arr[0]).length * arr.length : 0;
      const totalBytes = estimate(sales) + estimate(faturados) + estimate(cancelados) + estimate(flexData) + estimate(adsData) + estimate(channelRules);
      return (totalBytes / (1024 * 1024)).toFixed(2);
    } catch (e) {
      return "0.00";
    }
  };

  const colToIdx = (colStr: string) => {
    if (!colStr) return 0;
    const clean = String(colStr).replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (!clean) return -1;
    let base = 0;
    for (let i = 0; i < clean.length; i++) {
      base = base * 26 + (clean.charCodeAt(i) - 64);
    }
    return Math.max(0, base - 1);
  };

  const parseSmartFloat = (val: any, channelName: string) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let strVal = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(strVal) || /^\d{2}\/\d{2}\/\d{4}/.test(strVal)) return 0;
    strVal = strVal.replace(/[a-zA-Z$\s]/g, '');
    if (strVal.includes(',') && strVal.includes('.')) {
      const lastComma = strVal.lastIndexOf(',');
      const lastDot = strVal.lastIndexOf('.');
      if (lastComma > lastDot) {
        strVal = strVal.replace(/\./g, '').replace(',', '.');
      } else {
        strVal = strVal.replace(/,/g, '');
      }
    } else if (strVal.includes(',')) {
      strVal = strVal.replace(/\./g, '').replace(',', '.');
    }
    return parseFloat(strVal) || 0;
  };

  const parseExcelDate = (val: any) => {
    if (!val) return new Date().toISOString().slice(0, 10);
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().slice(0, 10);
    }
    const cleanStr = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) return cleanStr.substring(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}/.test(cleanStr)) {
      const parts = cleanStr.substring(0, 10).split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return cleanStr.substring(0, 10);
  };

  const extractCPF = (row: any[]) => {
    for (let cell of row) {
      if (cell === undefined || cell === null) continue;
      const str = String(cell).trim();
      if (/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/.test(str)) return str.replace(/\D/g, '');
      if (/^\d{9,14}$/.test(str)) {
        const numStr = str.replace(/\D/g, '');
        if (numStr.length >= 9 && numStr.length <= 11) return numStr.padStart(11, '0');
        else if (numStr.length > 11 && numStr.length <= 14) return numStr.padStart(14, '0');
      }
    }
    return null;
  };

  const evaluateFormula = (formulaStr: string, row: any, rebateVal: number, channelName: string) => {
    if (!formulaStr) return 0;
    try {
      let expr = formulaStr.toUpperCase().replace(/(\d+(?:\.\d+)?)%/g, (m, p1) => (parseFloat(p1) / 100).toString());
      expr = expr.replace(/([A-Z]+)\d*/g, (m, colLet) => {
        const idx = colToIdx(colLet);
        const val = idx >= 0 ? row[idx] : 0;
        return (val !== undefined && val !== null ? parseSmartFloat(val, channelName) : 0).toString();
      });
      const result = new Function(`return ${expr.replace(/[^0-9\.\+\-\*\/\(\)\s\?\:\<\=\>]/g, '')};`)();
      return (isNaN(result) ? 0 : Math.max(0, result)) + rebateVal;
    } catch { return 0; }
  };

  const getPdvValue = (pdvConfig: string, row: any, channelName: string) => {
    if (!pdvConfig) return 0;
    if (/[+\-*/()]/.test(pdvConfig)) return evaluateFormula(pdvConfig, row, 0, channelName);
    const idx = colToIdx(pdvConfig);
    if (idx < 0) return 0; 
    return parseSmartFloat(row[idx], channelName);
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
        let rows: any[] = [];
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
          const text = evt.target?.result as string;
          const lines = text.split(/\r?\n/);
          rows = lines.map(line => line.split(line.includes(';') ? ';' : ',').map(cell => cell.replace(/^["']|["']$/g, '').trim()));
        } else {
          const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        }
        
        const novosFaturados: any[] = [];
        const idxObs = colToIdx(colFaturadosObs);
        const idxData = colToIdx(colFaturadosData);

        rows.slice(1).forEach((row) => {
          if (!row || !row.length) return;
          const rawObs = idxObs >= 0 && row[idxObs] !== undefined ? String(row[idxObs]).trim() : '';
          let pedidoId = null;
          const matchId = rawObs.match(/\b[A-Z]+-\d+\b/) || rawObs.match(/\d{3}-\d{7}-\d{7}/) || rawObs.match(/20000[0-9]+/) || rawObs.match(/\b[A-Z0-9]{6,}\b/);
          if (matchId) pedidoId = matchId[0].trim();
          const cpfMatch = extractCPF(row);
          
          if (pedidoId || cpfMatch) {
            const dataEmissao = parseExcelDate(idxData >= 0 ? row[idxData] : (row[3] || row[2]));
            novosFaturados.push({ id: pedidoId || `s-id-${Math.random()}`, data: dataEmissao, cpf: cpfMatch });
          }
        });

        await importFaturadosComMes(rows, mesFaturado, novosFaturados);
        alert(`Sucesso! ${novosFaturados.length} faturados lidos e salvos para o mês ${mesFaturado}.`);
      } catch (err: any) { alert(`Erro ao ler faturados: ${err.message}`); }
    };
    if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file, 'ISO-8859-1');
    else reader.readAsArrayBuffer(file);
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
        const data: any[] = [];
        
        rows.forEach((row) => {
          if (!row || row.length === 0) return;
          const firstCell = String(row[0] || '').toLowerCase();
          if (firstCell.includes('id') || firstCell.includes('pedido')) return;

          const rawId = row[0];
          if (rawId) {
             let rawValor = row[3] || 0;
             if (typeof rawValor === 'number') {
                rawValor = rawValor.toFixed(2).replace('.', ',');
             }
             data.push({
               'ID Pedido': String(rawId).trim(),
               'Produto': String(row[1] || '').trim(),
               'Canal': String(row[2] || '').trim(),
               'Valor': rawValor
             });
          }
        });

        if (data.length === 0) throw new Error("A planilha está vazia ou não tem o formato correto.");
        await importCanceladosComMes(data, mesCancelado);
        alert(`${data.length} registos de cancelados importados para o mês ${mesCancelado}!`);
      } catch (err: any) { alert(`Erro ao ler cancelados: ${err.message}`); }
    };
    reader.readAsArrayBuffer(file);
    if (fileCanceladosRef.current) fileCanceladosRef.current.value = '';
  };

  const handleUploadAds = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const parsedData = rows.slice(1).map((r: any[]) => ({
          canal: String(r[0] || '').trim(),
          custo_ads: parseSmartFloat(r[1], 'ADS')
        })).filter(item => item.canal && item.custo_ads > 0);

        if (parsedData.length === 0) throw new Error("A planilha está vazia ou sem dados válidos.");
        
        await importAdsComMes(parsedData, mesAds);
        alert(`${parsedData.length} registos de ADS salvos para o mês ${mesAds}!`);
      } catch (err: any) {
        addLog(`Erro ao importar ADS: ${err.message}`, 'error');
        alert(`Erro: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileAdsRef.current) fileAdsRef.current.value = '';
  };

  const handleUploadTarifasSite = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        let rows: any[] = [];
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
          const text = evt.target?.result as string;
          rows = text.split(/\r?\n/).map(line => line.split(line.includes(';') ? ';' : ',').map(c => c.replace(/^["']|["']$/g, '').trim()));
        } else {
          const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        }
        const idxId = colToIdx(colTarifasIdPedido);
        const idxVal = colToIdx(colTarifasValor);
        const novasTarifas: Record<string, number> = {};

        rows.slice(1).forEach((row) => {
          if (!row || !row.length) return;
          const idPed = row[idxId] !== undefined ? String(row[idxId]).trim() : '';
          const valTarifa = parseSmartFloat(row[idxVal], 'TARIFAS');
          if (idPed) novasTarifas[idPed] = valTarifa;
        });
        await saveToCloudAndState('tarifas_site', novasTarifas, () => {});
        addLog(`Consulta de Tarifas do Site: ${Object.keys(novasTarifas).length} registos salvos.`, 'success');
        alert(`Sucesso! ${Object.keys(novasTarifas).length} tarifas do site importadas.`);
      } catch (err: any) { alert(`Erro ao ler tarifas: ${err.message}`); }
    };
    if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file, 'ISO-8859-1');
    else reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleUploadVendasCanal = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const isClube = selectedChannel.toLowerCase().includes('clube') || selectedChannel.toLowerCase().includes('loja');
    
    // Coleta todos os faturados acumulados de todos os meses para o cruzamento de ID/CPF
    const faturadosAtuais = faturados || [];
    if (!isClube && faturadosAtuais.length === 0) {
      alert('ATENÇÃO: A base de Faturados (NFes Saída) está vazia! Por favor, suba a planilha de Faturados no Passo 1 antes de importar as vendas do e-commerce.');
      if (fileVendasRef.current) fileVendasRef.current.value = '';
      return;
    }

    setIsProcessing(true);
    const isShopee = selectedChannel.toLowerCase().includes('shopee');
    const rule = channelRules.find((r: any) => r.canal === selectedChannel) || { colIdPedido: 'A', colSku: isShopee ? 'S' : 'AS', colRebate: 'C', colPdv: isShopee ? 'BA' : 'J', colQuantidade: isShopee ? 'X' : 'I', formulaExcel: 'J - (J * 9%) - K' };
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        let rows: any[] = [];
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
          const text = evt.target?.result as string;
          const lines = text.split(/\r?\n/);
          rows = lines.map(line => line.split(line.includes(';') ? ';' : ',').map(cell => cell.replace(/^["']|["']$/g, '').trim()));
        } else {
          const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
          rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        }
        
        const fatIdMap = new Map();
        const fatCpfMap = new Map();
        faturadosAtuais.forEach((item: any) => {
          if (item.id && !item.id.includes('s-id-')) fatIdMap.set(String(item.id).trim(), item.data);
          if (item.cpf) fatCpfMap.set(String(item.cpf).trim(), item.data);
        });

        const novasVendas: any[] = [];
        const loteId = `lote_${selectedChannel}_${Date.now()}`;
        let i = 0;
        let ignoradosPorNaoFaturados = 0;

        while (i < rows.length) {
          const row = rows[i];
          if (!row || !row.length) { i++; continue; }
          let rawId = '';
          let dataFaturamento = new Date().toISOString().slice(0, 10);
          let precoVendaUnitario = 0;
          let repasseCalculado = 0;
          let skuVal = 'SKU-GERAL';
          let quantidade = 1;

          if (isClube) {
            const colAStr = row[0] !== undefined ? String(row[0]).trim().toLowerCase() : '';
            const colFStr = row[5] !== undefined ? String(row[5]).trim().toLowerCase() : '';
            if (!colAStr || colAStr.includes('total') || colAStr === 'nan' || colAStr.includes('data') || colAStr.includes('empresa') || colAStr.includes('filial') || colFStr.includes('vendas') || colFStr === 'nan') { i++; continue; }
            rawId = `clube-${Date.now()}-${i}`;
            dataFaturamento = parseExcelDate(row[0]);
            precoVendaUnitario = getPdvValue(rule.colPdv || 'F', row, selectedChannel);
            const apuracaoStr = (rule.formulaExcel || 'I').trim();
            if (!/[+\-*/()]/.test(apuracaoStr)) {
                const apIdx = colToIdx(apuracaoStr);
                repasseCalculado = apIdx >= 0 ? parseSmartFloat(row[apIdx], selectedChannel) : 0;
            } else { repasseCalculado = evaluateFormula(apuracaoStr, row, 0, selectedChannel); }
            skuVal = 'SKU-CLUBE-ISENTO'; 
            const colQtdIdx = colToIdx(rule.colQuantidade || 'ZZZ');
            quantidade = colQtdIdx >= 0 && row[colQtdIdx] ? parseInt(String(row[colQtdIdx]).replace(/[^0-9]/g, ''), 10) || 1 : 1;
            if (precoVendaUnitario === 0 && repasseCalculado === 0) { i++; continue; }
          } else {
            const colIdIdx = colToIdx(rule.colIdPedido || 'A');
            rawId = colIdIdx >= 0 && row[colIdIdx] !== undefined ? String(row[colIdIdx]).trim() : '';
            if (!rawId || rawId.toLowerCase().includes('pedido') || rawId.toLowerCase().includes('order-id')) { i++; continue; }
            rawId = rawId.replace(/\.0$/, '');
            if (rawId.toUpperCase().includes('E+')) {
              try {
                const numVal = parseFloat(rawId.replace(',', '.'));
                if (!isNaN(numVal)) rawId = Math.round(numVal).toString();
              } catch {}
            }
            const rowCpf = extractCPF(row);
            let isFaturado = false;
            if (fatIdMap.has(rawId)) {
              isFaturado = true;
              dataFaturamento = fatIdMap.get(rawId);
            } else if (rowCpf && fatCpfMap.has(rowCpf)) {
              isFaturado = true;
              dataFaturamento = fatCpfMap.get(rowCpf);
            }
            if (!isFaturado && fatIdMap.size > 0) {
              ignoradosPorNaoFaturados++;
              i++; 
              continue;
            }
            precoVendaUnitario = getPdvValue(rule.colPdv || 'J', row, selectedChannel);
            const colRebateIdx = colToIdx(rule.colRebate || 'C');
            const rebateRowValue = colRebateIdx >= 0 ? parseSmartFloat(row[colRebateIdx], selectedChannel) : 0;
            repasseCalculado = evaluateFormula(rule.formulaExcel || 'J - (J * 9%) - K', row, rebateRowValue, selectedChannel);
            const colSkuIdx = colToIdx(rule.colSku || 'AS');
            skuVal = colSkuIdx >= 0 && row[colSkuIdx] ? String(row[colSkuIdx]).trim().toUpperCase() : 'SKU-GERAL';
            const colQtdIdx = colToIdx(rule.colQuantidade || 'I');
            quantidade = colQtdIdx >= 0 && row[colQtdIdx] ? parseInt(String(row[colQtdIdx]).replace(/[^0-9]/g, ''), 10) || 1 : 1;
            if (precoVendaUnitario === 0 && repasseCalculado === 0) { i++; continue; }
          }

          novasVendas.push({ id_pedido: rawId, data_faturamento: dataFaturamento, canal: selectedChannel, sku: skuVal, quantidade: quantidade, preco_venda: precoVendaUnitario, repasse_liquido: repasseCalculado, lote_id: loteId });
          i++;
        }

        const salesWithKeys = novasVendas.map((s, idx) => ({ ...s, unique_key: `${s.id_pedido}_${s.sku}_${idx}` }));
        const filteredOldSales = sales.filter((s: any) => s.canal !== selectedChannel);
        const updatedSales = [...salesWithKeys, ...filteredOldSales];
        await saveToCloudAndState('vendas', updatedSales, setSales);

        const clubeMsg = isClube ? ' (Modo Loja Física)' : ` (${ignoradosPorNaoFaturados} ignorados)`;
        addLog(`Importação canal [${selectedChannel}]: ${novasVendas.length} itens salvos.`, 'success');
        alert(`Sucesso! ${novasVendas.length} vendas importadas para ${selectedChannel}${clubeMsg}.`);
      } catch (err: any) {
        addLog(`Erro ao processar vendas: ${err.message}`, 'error');
        alert(`Erro ao processar ficheiro: ${err.message}`);
      } finally { setIsProcessing(false); }
    };
    if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file, 'ISO-8859-1');
    else reader.readAsArrayBuffer(file);
    if (fileVendasRef.current) fileVendasRef.current.value = '';
  };

  const handleExcluirVendasPorCanal = async () => {
    if (targetChannelDelete === 'TODOS') {
      if (confirm('Tem a certeza absoluta que deseja apagar TODAS AS VENDAS de todos os canais?')) {
        await saveToCloudAndState('vendas', [], setSales);
        addLog('Base global de vendas limpa.', 'warning');
        alert('Todas as vendas foram apagadas.');
      }
    } else {
      if (confirm(`Tem a certeza que deseja apagar todas as vendas do canal [${targetChannelDelete}]?`)) {
        const remainingSales = sales.filter((s: any) => s.canal !== targetChannelDelete);
        await saveToCloudAndState('vendas', remainingSales, setSales);
        addLog(`Vendas do canal [${targetChannelDelete}] apagadas.`, 'warning');
        alert(`Vendas do canal ${targetChannelDelete} removidas com sucesso.`);
      }
    }
  };

  const handleExcluirUltimoLoteCanal = async () => {
    if (targetChannelDelete === 'TODOS') {
      alert('Por favor, selecione um canal específico acima para excluir o último lote enviado.');
      return;
    }
    const canalSales = sales.filter((s: any) => s.canal === targetChannelDelete);
    if (canalSales.length === 0) {
      alert(`Não existem vendas registadas para o canal ${targetChannelDelete}.`);
      return;
    }
    const lotes = Array.from(new Set(canalSales.map((s: any) => s.lote_id).filter(Boolean)));
    if (lotes.length === 0) {
      if (confirm(`O canal ${targetChannelDelete} não possui marcação de lotes. Deseja remover todas as vendas deste canal?`)) {
        const remainingSales = sales.filter((s: any) => s.canal !== targetChannelDelete);
        await saveToCloudAndState('vendas', remainingSales, setSales);
        alert(`Vendas do canal ${targetChannelDelete} removidas.`);
      }
      return;
    }
    const ultimoLote = lotes[lotes.length - 1];
    if (confirm(`Tem a certeza que deseja excluir o ÚLTIMO envio (lote) do canal [${targetChannelDelete}]?`)) {
      const remainingSales = sales.filter((s: any) => s.lote_id !== ultimoLote);
      await saveToCloudAndState('vendas', remainingSales, setSales);
      addLog(`Último lote do canal [${targetChannelDelete}] removido.`, 'warning');
      alert(`Último envio do canal ${targetChannelDelete} foi desfeito/removido com sucesso!`);
    }
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

  const faturadosMesAtual = (faturados || []).filter((f: any) => f.mes_referencia === mesFaturado);
  const canceladosMesAtual = (cancelados || []).filter((c: any) => c.mes_referencia === mesCancelado);
  const adsMesAtual = (adsData || []).filter((a: any) => a.mes_referencia === mesAds);

  return (
    <div className="space-y-6">
       
       <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h2 className="text-xl font-bold text-white tracking-tight">Painel Administrativo</h2>
           <p className="text-xs text-slate-400 mt-1">Gestão de bases, faturados e redutores</p>
         </div>
         
         <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            {(() => {
              const usageStr = getDbUsageMB();
              const usageNum = parseFloat(usageStr);
              const limitMB = 500;
              const pct = Math.min((usageNum / limitMB) * 100, 100);
              const colorText = pct > 90 ? 'text-rose-400' : pct > 75 ? 'text-amber-400' : 'text-emerald-400';
              const colorBg = pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <div className="flex flex-col justify-center bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 min-w-[170px]">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Uso DB (Supa)</span>
                    <span className={`text-[10px] font-black ${colorText}`}>{pct.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className={`text-sm font-black ${colorText}`}>{usageStr}</span>
                    <span className="text-[10px] font-bold text-slate-500">/ {limitMB} MB</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${colorBg} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })()}

            <button onClick={() => setIsAdminUnlocked(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition whitespace-nowrap">
              Bloquear Admin
            </button>
         </div>
       </div>

       <h2 className="text-xl font-bold text-white mt-8 mb-4">Passo 1: Bases e Filtros ERP</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/30 space-y-3">
           <h3 className="font-bold text-emerald-400 text-sm">Faturados (NFes Saída)</h3>
           <div>
              <span className="block text-[10px] text-slate-400 font-bold mb-1">Mês de Referência dos Faturados</span>
              <input 
                type="month" 
                value={mesFaturado} 
                onChange={e => setMesFaturado(e.target.value)} 
                className="w-full p-2 bg-slate-950 text-white font-bold border border-slate-700 rounded-lg text-xs outline-none focus:border-emerald-500" 
              />
           </div>
           <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[10px] text-slate-400 font-bold mb-1">Coluna ID (Observações / AI)</span>
                <input type="text" value={colFaturadosObs} onChange={e => setColFaturadosObs(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 text-emerald-300 font-bold text-center border border-slate-700 rounded-lg text-xs" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold mb-1">Coluna Data (D)</span>
                <input type="text" value={colFaturadosData} onChange={e => setColFaturadosData(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 text-emerald-300 font-bold text-center border border-slate-700 rounded-lg text-xs" />
              </div>
           </div>
           <label className="cursor-pointer block text-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadFaturados}/>Subir Faturados (Excel/CSV)
           </label>
           <p className="text-[10px] text-slate-400 text-center">Registos p/ {mesFaturado}: <span className="text-emerald-400 font-bold">{faturadosMesAtual.length}</span></p>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30 space-y-3">
           <h3 className="font-bold text-rose-400 text-sm">Cancelados / Redutores</h3>
           <div>
              <span className="block text-[10px] text-slate-400 font-bold mb-1">Mês de Referência para Abatimento</span>
              <input 
                type="month" 
                value={mesCancelado} 
                onChange={e => setMesCancelado(e.target.value)} 
                className="w-full p-2 bg-slate-950 text-white font-bold border border-slate-700 rounded-lg text-xs outline-none focus:border-rose-500" 
              />
           </div>
           <label className="cursor-pointer block text-center px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition mt-4">
             <input type="file" ref={fileCanceladosRef} className="hidden" accept=".xlsx, .csv" onChange={handleUploadCancelados}/>
             Subir Cancelados
           </label>
           <p className="text-[10px] text-slate-400 text-center">Registos p/ {mesCancelado}: <span className="text-emerald-400 font-bold">{canceladosMesAtual.length}</span></p>
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
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={e => readGeneric(e, setFlexData, 'FLEX', 'flex', flexData, (r:any) => ({val: parseSmartFloat(r[1], 'FLEX'), obj: {id_pedido: String(r[0]||'').trim(), valor_frete: parseSmartFloat(r[1], 'FLEX')}}))} />
             Importar Frete Flex
           </label>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-amber-500/30 flex flex-col justify-between">
           <div>
             <h3 className="font-bold text-white text-sm mb-1">Investimento ADS</h3>
             <p className="text-[10px] text-slate-400 mb-3">Coluna A: Nome do Canal | Coluna B: Valor Gasto</p>
             <div className="mb-3">
               <label className="text-[10px] text-slate-400 block mb-1">Mês de Referência para ADS</label>
               <input 
                 type="month" 
                 value={mesAds} 
                 onChange={e => setMesAds(e.target.value)} 
                 className="w-full p-2 bg-slate-950 text-white font-bold border border-slate-700 rounded-lg text-xs outline-none focus:border-amber-500" 
               />
             </div>
           </div>
           <label className="cursor-pointer block py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs text-center rounded-xl transition shadow-lg">
             <input type="file" ref={fileAdsRef} className="hidden" accept=".xlsx, .csv" onChange={handleUploadAds} />
             Importar ADS
           </label>
           <p className="text-[10px] text-slate-400 text-center mt-2">Registos p/ {mesAds}: <span className="text-amber-400 font-bold">{adsMesAtual.length}</span></p>
         </div>

         <div className="bg-slate-900 p-5 rounded-2xl border border-indigo-500/30 flex flex-col justify-between space-y-3">
           <div>
             <h3 className="font-bold text-white text-sm mb-1">Consulta Tarifas Site</h3>
             <p className="text-[10px] text-slate-400 mb-2">Cruza ID do Pedido com a tarifa para descontar do líquido final.</p>
             <div className="grid grid-cols-2 gap-2">
               <div>
                 <span className="block text-[9px] text-slate-400 font-bold mb-1">Col ID Pedido</span>
                 <input type="text" value={colTarifasIdPedido} onChange={e => setColTarifasIdPedido(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 text-indigo-300 font-bold text-center border border-slate-700 rounded-lg text-xs" />
               </div>
               <div>
                 <span className="block text-[9px] text-slate-400 font-bold mb-1">Col Valor Tarifa</span>
                 <input type="text" value={colTarifasValor} onChange={e => setColTarifasValor(e.target.value.toUpperCase())} className="w-full p-2 bg-slate-950 text-indigo-300 font-bold text-center border border-slate-700 rounded-lg text-xs" />
               </div>
             </div>
           </div>
           <label className="cursor-pointer block py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs text-center rounded-xl transition shadow-lg">
             <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadTarifasSite}/>
             Subir Tarifas do Site
           </label>
         </div>
       </div>

       <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30 mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
             <h3 className="font-bold text-rose-400 text-sm flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation"></i> Zona de Limpeza de Vendas</h3>
             
             <div className="flex items-center gap-2 w-full sm:w-auto">
               <span className="text-xs text-slate-400 font-bold">Canal Alvo:</span>
               <select 
                 value={targetChannelDelete} 
                 onChange={e => setTargetChannelDelete(e.target.value)} 
                 className="p-2 bg-slate-950 border border-slate-700 text-white rounded-xl text-xs font-bold outline-none cursor-pointer"
               >
                 <option value="TODOS">Todos os Canais</option>
                 {canais.map((ch: string) => <option key={ch} value={ch}>{ch}</option>)}
               </select>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button 
              onClick={handleExcluirUltimoLoteCanal} 
              className="py-3 bg-rose-950/50 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-rotate-left"></i> Excluir Último Lote (Envio) do Canal Selecionado
            </button>
            <button 
              onClick={handleExcluirVendasPorCanal} 
              className="py-3 bg-rose-900 hover:bg-rose-800 border border-rose-700 text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-trash-can"></i> Apagar Todas as Vendas do Canal Selecionado
            </button>
          </div>

          <div className="pt-3 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3">
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