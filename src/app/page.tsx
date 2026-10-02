'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const { canais, sales, adsData, flexData, products, goals, channelRules, channelLogos, users, addLog } = useAppContext();
  
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('TODOS');
  const [appliedChannelFilter, setAppliedChannelFilter] = useState('TODOS');
  
  const [modalidadeFilter, setModalidadeFilter] = useState('TODAS');
  const [appliedModalidadeFilter, setAppliedModalidadeFilter] = useState('TODAS');

  const currentMonthDefault = new Date().toISOString().slice(0, 7);
  const [dateFilter, setDateFilter] = useState('MES_ATUAL');
  const [customStartDate, setCustomStartDate] = useState(currentMonthDefault + '-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [appliedDateFilter, setAppliedDateFilter] = useState('MES_ATUAL');
  const [appliedStartDate, setAppliedStartDate] = useState(currentMonthDefault + '-01');
  const [appliedEndDate, setAppliedEndDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [tarifasSiteMap, setTarifasSiteMap] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchTarifas() {
      try {
        const { data } = await supabase.from('tb_estado_global').select('dados').eq('chave', 'tarifas_site').single();
        if (data && data.dados) {
          setTarifasSiteMap(data.dados);
        }
      } catch (err) {
        // Ignora caso não exista
      }
    }
    fetchTarifas();
  }, []);

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setAppliedChannelFilter(selectedChannelFilter);
      setAppliedModalidadeFilter(modalidadeFilter);
      setAppliedDateFilter(dateFilter);
      setAppliedStartDate(customStartDate);
      setAppliedEndDate(customEndDate);
      setIsRecalculating(false);
      addLog(`Painel recalculado. Canal: [${selectedChannelFilter}] | Modalidade: [${modalidadeFilter}] | Período: [${dateFilter}]`, 'success');
    }, 300);
  };

  const isChannelFisico = (canalName: string) => {
    const nome = String(canalName || '').toLowerCase();
    return nome.includes('clube') || nome.includes('loja') || nome.includes('paineiras') || nome.includes('hebraica');
  };

  const enrichedSales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sales.filter((s: any) => {
        if (appliedChannelFilter !== 'TODOS' && s.canal !== appliedChannelFilter) return false;

        const fisico = isChannelFisico(s.canal);
        if (appliedModalidadeFilter === 'FISICO' && !fisico) return false;
        if (appliedModalidadeFilter === 'DIGITAL' && fisico) return false;

        if (s.data_faturamento) {
           const d = new Date(s.data_faturamento + 'T00:00:00');
           d.setHours(0, 0, 0, 0);
           
           if (appliedDateFilter === 'HOJE' && d.getTime() !== today.getTime()) return false;
           if (appliedDateFilter === 'SEMANA' && (d < new Date(today.getTime() - 7*24*60*60*1000) || d > today)) return false;
           if (appliedDateFilter === 'QUINZENA' && (d < new Date(today.getTime() - 15*24*60*60*1000) || d > today)) return false;
           if (appliedDateFilter === 'MES_ATUAL') {
              const [ano, mes] = currentMonthDefault.split('-');
              if (d.getFullYear() !== Number(ano) || (d.getMonth() + 1) !== Number(mes)) return false;
           }
           if (appliedDateFilter === 'PERSONALIZADO' && appliedStartDate && appliedEndDate) {
              const start = new Date(appliedStartDate + 'T00:00:00');
              const end = new Date(appliedEndDate + 'T23:59:59');
              if (d < start || d > end) return false;
           }
        }
        return true;
      })
      .map((s: any) => {
        const prod = products.find((p: any) => p.sku === s.sku) || { preco_custo: 0, custo_embalagem: 0 };
        const custoCMV = ((Number(prod.preco_custo) || 0) + (Number(prod.custo_embalagem) || 0)) * (Number(s.quantidade) || 1);
        const flexOrder = flexData.find((f: any) => f.id_pedido === s.id_pedido);
        const custoFlex = flexOrder ? (Number(flexOrder.valor_frete) || 0) : 0;
        
        let repasseLiquido = Number(s.repasse_liquido) || Number(s.repasse) || 0; 
        
        const nomeCanal = String(s.canal || '').toLowerCase();
        if ((nomeCanal.includes('site') || nomeCanal.includes('loja virtual')) && tarifasSiteMap[String(s.id_pedido)]) {
           const taxaVindi = Number(tarifasSiteMap[String(s.id_pedido)]) || 0;
           repasseLiquido = Math.max(0, repasseLiquido - taxaVindi);
        }

        const ganhoBruto = repasseLiquido - custoCMV; 
        const ganhoLiquido = ganhoBruto - custoFlex;
        
        return { ...s, custoCMV, custoFlex, ganhoLiquido, repasse_liquido: isNaN(repasseLiquido) ? 0 : repasseLiquido };
      });
  }, [sales, appliedChannelFilter, appliedModalidadeFilter, appliedDateFilter, appliedStartDate, appliedEndDate, products, flexData, currentMonthDefault, tarifasSiteMap]);

  const currentRefMonth = useMemo(() => {
    if (appliedDateFilter === 'PERSONALIZADO' && appliedStartDate) return appliedStartDate.slice(0, 7);
    if (appliedDateFilter === 'MES_ATUAL') return currentMonthDefault;
    return new Date().toISOString().slice(0, 7);
  }, [appliedDateFilter, appliedStartDate, currentMonthDefault]);

  const kpis = useMemo(() => {
    const activeChannels = Array.from(new Set([...canais, ...channelRules.map((r: any) => r.canal)]));
    
    let faturamentoBrutoVendas = 0;
    let faturamentoLiquidoRepasse = 0;
    let metaDigitalTotal = 0;
    let fatBrutoFisico = 0;
    let fatBrutoDigital = 0;
    let repasseFisico = 0;
    let repasseDigital = 0;
    let custoTotalCMV = 0;
    let cmvFisico = 0;
    let cmvDigital = 0;

    const lojasFisicasDetalhes: any[] = [];

    activeChannels.forEach(channelName => {
      const fisico = isChannelFisico(channelName);
      const goalObj = goals.find((g: any) => g.canal === channelName && g.mes_referencia === currentRefMonth) 
                   || goals.find((g: any) => g.canal === channelName) 
                   || { meta_valor: 0 };
      const metaCanal = Number(goalObj.meta_valor) || 0;

      const chSales = enrichedSales.filter((s: any) => s.canal === channelName);
      const faturadoCanal = chSales.reduce((sum: number, s: any) => sum + (Number(s.preco_venda) || 0), 0);

      if (fisico) {
        const progresso = metaCanal > 0 ? (faturadoCanal / metaCanal) * 100 : 0;
        const diff = Math.abs(progresso - 100);

        let nomeLimpo = channelName.replace(/clube|loja/gi, '').trim();
        if (!nomeLimpo) nomeLimpo = channelName;

        lojasFisicasDetalhes.push({
          nome: nomeLimpo,
          faturado: faturadoCanal,
          progresso,
          diff,
          abaixo: progresso < 100
        });
      } else {
        metaDigitalTotal += metaCanal;
      }
    });

    enrichedSales.forEach((s: any) => {
      const fisico = isChannelFisico(s.canal);
      const valBruto = Number(s.preco_venda) || 0;
      const valRepasse = Number(s.repasse_liquido) || 0;
      const valCmv = Number(s.custoCMV) || 0;

      faturamentoBrutoVendas += isNaN(valBruto) ? 0 : valBruto;
      faturamentoLiquidoRepasse += isNaN(valRepasse) ? 0 : valRepasse;
      custoTotalCMV += isNaN(valCmv) ? 0 : valCmv;

      if (fisico) {
        fatBrutoFisico += isNaN(valBruto) ? 0 : valBruto;
        repasseFisico += isNaN(valRepasse) ? 0 : valRepasse;
        cmvFisico += isNaN(valCmv) ? 0 : valCmv;
      } else {
        fatBrutoDigital += isNaN(valBruto) ? 0 : valBruto;
        repasseDigital += isNaN(valRepasse) ? 0 : valRepasse;
        cmvDigital += isNaN(valCmv) ? 0 : valCmv;
      }
    });

    const progressoDigitalPct = metaDigitalTotal > 0 ? (fatBrutoDigital / metaDigitalTotal) * 100 : 0;
    const diffDigital = Math.abs(progressoDigitalPct - 100);

    const totalFlexCost = enrichedSales.reduce((sum: number, s: any) => sum + (Number(s.custoFlex) || 0), 0);
    const filteredAds = adsData.filter((a: any) => appliedChannelFilter === 'TODOS' || a.canal === appliedChannelFilter);
    const totalAdsCost = filteredAds.reduce((sum: number, a: any) => sum + (Number(a.custo_ads) || 0), 0);
    
    const lucroLiquidoReal = faturamentoLiquidoRepasse - custoTotalCMV - totalFlexCost - totalAdsCost;
    const lucroFisico = repasseFisico - cmvFisico;
    const lucroDigital = repasseDigital - cmvDigital - totalFlexCost - totalAdsCost;

    return { 
      faturamentoBrutoVendas: isNaN(faturamentoBrutoVendas) ? 0 : faturamentoBrutoVendas, 
      fatBrutoFisico,
      fatBrutoDigital, 
      faturamentoLiquidoRepasse: isNaN(faturamentoLiquidoRepasse) ? 0 : faturamentoLiquidoRepasse, 
      repasseFisico,
      repasseDigital,
      custoTotalCMV: isNaN(custoTotalCMV) ? 0 : custoTotalCMV, 
      cmvFisico,
      cmvDigital,
      lucroLiquidoReal: isNaN(lucroLiquidoReal) ? 0 : lucroLiquidoReal, 
      lucroFisico,
      lucroDigital,
      totalPedidos: enrichedSales.length,
      lojasFisicasDetalhes,
      progressoDigitalPct,
      diffDigital
    };
  }, [enrichedSales, adsData, appliedChannelFilter, canais, channelRules, goals, currentRefMonth]);

  const channelAnalytics = useMemo(() => {
    const activeChannels = Array.from(new Set([...canais, ...channelRules.map((r: any) => r.canal)]));
    let channelsToAnalyze = appliedChannelFilter === 'TODOS' ? activeChannels : activeChannels.filter(c => c === appliedChannelFilter);

    if (appliedModalidadeFilter === 'FISICO') {
      channelsToAnalyze = channelsToAnalyze.filter(c => isChannelFisico(c));
    } else if (appliedModalidadeFilter === 'DIGITAL') {
      channelsToAnalyze = channelsToAnalyze.filter(c => !isChannelFisico(c));
    }

    channelsToAnalyze.sort((a, b) => {
      const aFisico = isChannelFisico(a);
      const bFisico = isChannelFisico(b);
      if (aFisico && !bFisico) return -1;
      if (!aFisico && bFisico) return 1;
      return a.localeCompare(b);
    });

    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth();
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();
    const diaAtual = now.getDate();
    const diasPassados = Math.max(1, diaAtual);
    const diasFaltantes = Math.max(1, totalDiasMes - diaAtual);

    return channelsToAnalyze.map(channelName => {
      const chSales = enrichedSales.filter((s: any) => s.canal === channelName);
      const ruleObj = channelRules.find((r: any) => r.canal === channelName) || {};
      const goalObj = goals.find((g: any) => g.canal === channelName && g.mes_referencia === currentRefMonth) 
                   || goals.find((g: any) => g.canal === channelName) 
                   || { meta_valor: 0, responsavel: ruleObj.responsavel || 'Equipe Best Fit' };

      const faturadoBruto = chSales.reduce((sum: number, s: any) => sum + (Number(s.preco_venda) || 0), 0);
      const repasseTotal = chSales.reduce((sum: number, s: any) => sum + (Number(s.repasse_liquido) || 0), 0);
      
      const canalAds = adsData.find((a: any) => a.canal === channelName)?.custo_ads || 0;
      const cmvCanal = chSales.reduce((sum: number, s: any) => sum + (Number(s.custoCMV) || 0), 0);
      const flexCanal = chSales.reduce((sum: number, s: any) => sum + (Number(s.custoFlex) || 0), 0);

      const lucroLiquidoFinal = repasseTotal - cmvCanal - flexCanal - canalAds;
      
      const metaBase = Number(goalObj.meta_valor) || 0;
      const progressoMetaPct = metaBase > 0 ? (faturadoBruto / metaBase) * 100 : 0;
      const margemBrutaPct = faturadoBruto > 0 ? (repasseTotal / faturadoBruto) * 100 : 0;
      const margemLiquidaPct = faturadoBruto > 0 ? (lucroLiquidoFinal / faturadoBruto) * 100 : 0;

      const projecaoFaturamento = (faturadoBruto / diasPassados) * totalDiasMes;
      const valorFaltante = Math.max(0, metaBase - faturadoBruto);
      const mediaDiariaNecessaria = valorFaltante > 0 ? valorFaltante / diasFaltantes : 0;

      const logoUrl = channelLogos[channelName] || ruleObj.logo_url || null;

      return { 
        canal: channelName, 
        responsavel: ruleObj.responsavel || goalObj.responsavel || 'Equipe Best Fit', 
        metaValor: metaBase,
        faturadoBruto: isNaN(faturadoBruto) ? 0 : faturadoBruto, 
        lucroLiquidoFinal: isNaN(lucroLiquidoFinal) ? 0 : lucroLiquidoFinal, 
        progressoMetaPct: isNaN(progressoMetaPct) ? 0 : progressoMetaPct, 
        margemBrutaPct: isNaN(margemBrutaPct) ? 0 : margemBrutaPct, 
        margemLiquidaPct: isNaN(margemLiquidaPct) ? 0 : margemLiquidaPct, 
        projecaoFaturamento: isNaN(projecaoFaturamento) ? 0 : projecaoFaturamento,
        valorFaltante,
        mediaDiariaNecessaria,
        logoUrl 
      };
    });
  }, [enrichedSales, goals, adsData, appliedChannelFilter, appliedModalidadeFilter, channelRules, channelLogos, currentRefMonth, canais]);

  const handleEnviarEmailAlerta = () => {
    const emailsCadastrados = users && users.length > 0 
      ? users.map((u: any) => u.username).filter(Boolean).join(';') 
      : "gisele@usebestfit.com.br";
    
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const assunto = encodeURIComponent(`📊 Resumo de Vendas - Lojas Físicas e Online (${dataHoje})`);

    const hebraicaObj = channelAnalytics.find(c => c.canal.toLowerCase().includes('hebraica')) || { faturadoBruto: 0, progressoMetaPct: 0 };
    const paineirasObj = channelAnalytics.find(c => c.canal.toLowerCase().includes('paineiras')) || { faturadoBruto: 0, progressoMetaPct: 0 };
    
    const fatDigitalTotal = channelAnalytics
      .filter(c => !isChannelFisico(c.canal))
      .reduce((acc, c) => acc + c.faturadoBruto, 0);
    
    const metaDigitalTotal = channelAnalytics
      .filter(c => !isChannelFisico(c.canal))
      .reduce((acc, c) => acc + c.metaValor, 0);
    
    const progressoDigitalPct = metaDigitalTotal > 0 ? (fatDigitalTotal / metaDigitalTotal) * 100 : 0;

    let corpoTexto = `Olá, tudo bem? Segue resumo das vendas das lojas fisica e onlines do dia ${dataHoje}.\n\n`;
    corpoTexto += `Hebraica: R$ ${hebraicaObj.faturadoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${hebraicaObj.progressoMetaPct.toFixed(1)}% da meta)\n`;
    corpoTexto += `Paineiras: R$ ${paineirasObj.faturadoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${paineirasObj.progressoMetaPct.toFixed(1)}% da meta)\n`;
    corpoTexto += `E-commerce: R$ ${fatDigitalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${progressoDigitalPct.toFixed(1)}% da meta)\n\n`;
    corpoTexto += `Caso queiram visualiza-lo, acessem o link a seguir: https://dashboard-e-commerce-nine.vercel.app/\n`;

    const corpoEncoded = encodeURIComponent(corpoTexto);
    window.location.href = `mailto:${emailsCadastrados}?subject=${assunto}&body=${corpoEncoded}`;
    addLog('E-mail aberto com os destinatários separados por ponto e vírgula.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Dashboard Best Fit</h2>
          <p className="text-xs text-slate-400 mt-1">Cálculo de Margem Real = Repasse Líq - CMV - Fretes Flex - ADS</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          <button 
            onClick={handleEnviarEmailAlerta} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2"
          >
            <i className="fa-solid fa-envelope"></i> Enviar Relatório por E-mail
          </button>

          <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-700">
            <i className="fa-regular fa-calendar text-indigo-400 pl-2 text-xs"></i>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent text-indigo-300 font-bold text-xs focus:outline-none pr-1 cursor-pointer">
              <option value="MES_ATUAL" className="bg-slate-900 text-white">Mês Atual (Padrão Metas)</option>
              <option value="HOJE" className="bg-slate-900 text-white">Hoje</option>
              <option value="SEMANA" className="bg-slate-900 text-white">Últimos 7 dias</option>
              <option value="QUINZENA" className="bg-slate-900 text-white">Últimos 15 dias</option>
              <option value="PERSONALIZADO" className="bg-slate-900 text-white">Personalizado</option>
            </select>
          </div>
          {dateFilter === 'PERSONALIZADO' && (
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-700">
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="bg-transparent text-slate-300 font-bold text-xs focus:outline-none" />
              <span className="text-slate-500 text-xs font-bold">até</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="bg-transparent text-slate-300 font-bold text-xs focus:outline-none" />
            </div>
          )}

          <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-700">
            <i className="fa-solid fa-layer-group text-emerald-400 pl-2 text-xs"></i>
            <select value={modalidadeFilter} onChange={(e) => setModalidadeFilter(e.target.value)} className="bg-transparent text-emerald-300 font-bold text-xs focus:outline-none pr-1 cursor-pointer">
              <option value="TODAS" className="bg-slate-900 text-white">Todas as Modalidades</option>
              <option value="FISICO" className="bg-slate-900 text-white">Lojas Físicas</option>
              <option value="DIGITAL" className="bg-slate-900 text-white">E-commerce / Marketplaces</option>
            </select>
          </div>

          <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-700">
            <i className="fa-solid fa-store text-purple-400 pl-2 text-xs"></i>
            <select value={selectedChannelFilter} onChange={(e) => setSelectedChannelFilter(e.target.value)} className="bg-transparent text-purple-300 font-bold text-xs focus:outline-none pr-1 cursor-pointer">
              <option value="TODOS" className="bg-slate-900 text-white">Todos os Canais</option>
              {canais.map((ch: string) => <option key={ch} value={ch} className="bg-slate-900 text-white">{ch}</option>)}
            </select>
          </div>

          <button onClick={handleRecalculate} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-extrabold text-xs rounded-xl shadow-lg">
            {isRecalculating ? 'A calcular...' : 'Recalcular'}
          </button>
        </div>
      </div>

      {/* 4 PAINÉIS DO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        {/* 1. FATURAMENTO BRUTO (Com divisão individualizada para as duas lojas físicas) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between text-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento Bruto</span>
            <h3 className="text-2xl font-black text-white mt-1">R$ {kpis.faturamentoBrutoVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-500 mt-1">{kpis.totalPedidos} itens validados</p>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
            <div>
              <span className="block text-[9px] text-emerald-400 font-bold uppercase mb-2">Lojas Físicas</span>
              <div className="grid grid-cols-2 gap-2">
                {kpis.lojasFisicasDetalhes.map((loja: any) => (
                  <div key={loja.nome} className="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
                    <span className="font-bold text-slate-200 text-xs block">{loja.nome}</span>
                    <span className="text-xs font-black text-white block mt-0.5">R$ {loja.faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={`text-[9px] font-black block mt-0.5 ${loja.abaixo ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {loja.abaixo ? `▼ ${loja.diff.toFixed(1)}% abaixo` : `▲ ${loja.diff.toFixed(1)}% acima`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/50">
              <span className="block text-[9px] text-blue-400 font-bold uppercase mb-0.5">E-commerce</span>
              <span className="text-xs font-bold text-slate-200 block">R$ {kpis.fatBrutoDigital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`text-[10px] font-black block mt-0.5 ${kpis.progressoDigitalPct >= 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {kpis.progressoDigitalPct >= 100 ? `▲ ${kpis.diffDigital.toFixed(1)}% acima` : `▼ ${kpis.diffDigital.toFixed(1)}% abaixo`}
              </span>
            </div>
          </div>
        </div>

        {/* 2. REPASSE TOTAL (Consolidado: Lojas Físicas em cima, E-commerce embaixo) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between text-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Repasse Total das Plataformas</span>
            <h3 className="text-2xl font-black text-purple-400 mt-1">R$ {kpis.faturamentoLiquidoRepasse.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
            <div>
              <span className="block text-[9px] text-emerald-400 font-bold uppercase mb-1">Lojas Físicas</span>
              <span className="text-xs font-bold text-slate-200 block">R$ {kpis.repasseFisico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/50">
              <span className="block text-[9px] text-blue-400 font-bold uppercase mb-0.5">E-commerce</span>
              <span className="text-xs font-bold text-slate-200 block">R$ {kpis.repasseDigital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        
        {/* 3. CMV TOTAL (Consolidado: Lojas Físicas em cima, E-commerce embaixo) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between text-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">CMV Total (Custos de SKU x Qtd)</span>
            <h3 className="text-2xl font-black text-amber-400 mt-1">R$ {kpis.custoTotalCMV.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
            <div>
              <span className="block text-[9px] text-emerald-400 font-bold uppercase mb-1">Lojas Físicas</span>
              <span className="text-[10px] font-bold text-slate-400 italic block">Sem custos detalhados</span>
            </div>
            <div className="pt-2 border-t border-slate-800/50">
              <span className="block text-[9px] text-blue-400 font-bold uppercase mb-0.5">E-commerce</span>
              <span className="text-xs font-bold text-slate-200 block">R$ {kpis.cmvDigital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* 4. LUCRO LÍQUIDO REAL (Consolidado: Lojas Físicas em cima, E-commerce embaixo) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/20 flex flex-col justify-between text-center">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Lucro Líquido Real</span>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">R$ {kpis.lucroLiquidoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
            <div>
              <span className="block text-[9px] text-emerald-400 font-bold uppercase mb-1">Lojas Físicas</span>
              <span className="text-xs font-bold text-slate-200 block">R$ {kpis.lucroFisico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/50">
              <span className="block text-[9px] text-blue-400 font-bold uppercase mb-0.5">E-commerce</span>
              <span className="text-xs font-bold text-slate-200 block">R$ {kpis.lucroDigital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

      </div>

      {/* CARDS DOS CANAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channelAnalytics.map((item: any) => {
          const metaBatida = item.progressoMetaPct >= 100;
          return (
            <div key={item.canal} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition duration-300 shadow-sm">
               <div className="flex justify-between items-start border-b border-slate-800 pb-3 gap-3">
                 <div className="flex items-center gap-3">
                   {item.logoUrl ? <img src={item.logoUrl} alt={item.canal} className="w-11 h-11 rounded-xl bg-white object-contain p-1 border border-slate-700 shadow" /> : <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 text-[10px] font-bold">Logo</div>}
                   <div>
                     <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">{item.responsavel || 'Equipe'}</span>
                     <h4 className="font-black text-white text-sm tracking-tight">{item.canal}</h4>
                   </div>
                 </div>
                 
                 <div className="flex flex-col items-end gap-1">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border whitespace-nowrap ${metaBatida ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'}`}>
                      {item.progressoMetaPct.toFixed(1)}% da meta atingida
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 tracking-tight">
                      Meta: R$ {item.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-3 bg-slate-800/30 p-3.5 rounded-xl border border-slate-700/50">
                 <div>
                   <span className="text-[10px] text-slate-300 block font-bold tracking-wider mb-0.5">FAT. BRUTO</span>
                   <strong className="text-sm font-black text-white">R$ {item.faturadoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                 </div>
                 <div>
                   <span className="text-[10px] text-purple-200 block font-bold tracking-wider mb-0.5">LUCRO LÍQ.</span>
                   <strong className="text-sm font-black text-purple-400">R$ {item.lucroLiquidoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                 </div>
               </div>

               <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                 <div className="flex justify-between items-center">
                   <span className="text-[10px] text-slate-400 font-bold uppercase">Projeção Fechamento:</span>
                   <strong className="text-xs font-black text-indigo-300">R$ {item.projecaoFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                 </div>
                 <div className="flex justify-between items-center pt-1 border-t border-slate-900">
                   {item.valorFaltante === 0 ? (
                     <span className="w-full text-center text-xs font-black text-emerald-400 py-0.5">🎉 Parabéns, meta batida!</span>
                   ) : (
                     <>
                       <span className="text-[10px] text-slate-400 font-bold uppercase">Meta Diária Restante:</span>
                       <strong className="text-xs font-black text-amber-400">R$ {item.mediaDiariaNecessaria.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / dia</strong>
                     </>
                   )}
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/50">
                  <div>
                    <span className="text-[10px] text-slate-300 block font-bold mb-0.5">Margem Bruta</span>
                    <strong className="text-sm font-black text-blue-400">{item.margemBrutaPct.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-300 block font-bold mb-0.5">Margem Líquida</span>
                    <strong className="text-sm font-black text-emerald-400">{item.margemLiquidaPct.toFixed(1)}%</strong>
                  </div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}