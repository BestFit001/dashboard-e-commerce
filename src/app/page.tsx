'use client';
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function DashboardPage() {
  const { canais, sales, adsData, flexData, products, goals, channelRules, channelLogos, addLog } = useAppContext();
  
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('TODOS');
  const [appliedChannelFilter, setAppliedChannelFilter] = useState('TODOS');
  
  // TRAVA DE DATA: Inicia sempre no mês atual (ex: '2026-09') para alinhar com as metas mensais
  const currentMonthDefault = new Date().toISOString().slice(0, 7);
  const [dateFilter, setDateFilter] = useState('MES_ATUAL');
  const [customStartDate, setCustomStartDate] = useState(currentMonthDefault + '-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [appliedDateFilter, setAppliedDateFilter] = useState('MES_ATUAL');
  const [appliedStartDate, setAppliedStartDate] = useState(currentMonthDefault + '-01');
  const [appliedEndDate, setAppliedEndDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setAppliedChannelFilter(selectedChannelFilter);
      setAppliedDateFilter(dateFilter);
      setAppliedStartDate(customStartDate);
      setAppliedEndDate(customEndDate);
      setIsRecalculating(false);
      addLog(`Painel recalculado. Canal: [${selectedChannelFilter}] | Período: [${dateFilter}]`, 'success');
    }, 300);
  };

  const enrichedSales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sales.filter((s: any) => {
        if (appliedChannelFilter !== 'TODOS' && s.canal !== appliedChannelFilter) return false;

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
        
        const repasseLiquido = Number(s.repasse_liquido) || Number(s.repasse) || 0; 
        const ganhoBruto = repasseLiquido - custoCMV; 
        const ganhoLiquido = ganhoBruto - custoFlex;
        
        return { ...s, custoCMV, custoFlex, ganhoLiquido, repasse_liquido: repasseLiquido };
      });
  }, [sales, appliedChannelFilter, appliedDateFilter, appliedStartDate, appliedEndDate, products, flexData, currentMonthDefault]);

  const currentRefMonth = useMemo(() => {
    if (appliedDateFilter === 'PERSONALIZADO' && appliedStartDate) return appliedStartDate.slice(0, 7);
    if (appliedDateFilter === 'MES_ATUAL') return currentMonthDefault;
    return new Date().toISOString().slice(0, 7);
  }, [appliedDateFilter, appliedStartDate, currentMonthDefault]);

  const kpis = useMemo(() => {
    let faturamentoBrutoVendas = 0;
    let fatBrutoFisico = 0;
    let fatBrutoDigital = 0;

    let faturamentoLiquidoRepasse = 0;
    let repasseFisico = 0;
    let repasseDigital = 0;

    let custoTotalCMV = 0;
    let cmvFisico = 0;
    let cmvDigital = 0;

    enrichedSales.forEach((s: any) => {
      const nomeCanal = String(s.canal || '').toLowerCase();
      const isFisico = nomeCanal.includes('clube') || nomeCanal.includes('loja') || nomeCanal.includes('paineiras') || nomeCanal.includes('hebraica');
      
      const valBruto = Number(s.preco_venda) || 0;
      const valRepasse = Number(s.repasse_liquido) || 0;
      const valCmv = Number(s.custoCMV) || 0;

      faturamentoBrutoVendas += valBruto;
      faturamentoLiquidoRepasse += valRepasse;
      custoTotalCMV += valCmv;

      if (isFisico) {
        fatBrutoFisico += valBruto;
        repasseFisico += valRepasse;
        cmvFisico += valCmv;
      } else {
        fatBrutoDigital += valBruto;
        repasseDigital += valRepasse;
        cmvDigital += valCmv;
      }
    });

    const totalFlexCost = enrichedSales.reduce((sum: number, s: any) => sum + (Number(s.custoFlex) || 0), 0);
    const filteredAds = adsData.filter((a: any) => appliedChannelFilter === 'TODOS' || a.canal === appliedChannelFilter);
    const totalAdsCost = filteredAds.reduce((sum: number, a: any) => sum + (Number(a.custo_ads) || 0), 0);
    
    // Distribuindo custos fixos (flex e ads) proporcionalmente ou mantendo o líquido real total
    const lucroLiquidoReal = faturamentoLiquidoRepasse - custoTotalCMV - totalFlexCost - totalAdsCost;
    
    // Lucro por modalidade (Repasse - CMV - Custos proporcionais)
    const lucroFisico = repasseFisico - cmvFisico;
    const lucroDigital = repasseDigital - cmvDigital - totalFlexCost - totalAdsCost;

    return { 
      faturamentoBrutoVendas, fatBrutoFisico, fatBrutoDigital, 
      faturamentoLiquidoRepasse, repasseFisico, repasseDigital,
      custoTotalCMV, cmvFisico, cmvDigital,
      lucroLiquidoReal, lucroFisico, lucroDigital,
      totalPedidos: enrichedSales.length 
    };
  }, [enrichedSales, adsData, appliedChannelFilter]);

  const channelAnalytics = useMemo(() => {
    const activeChannels = Array.from(new Set([...canais, ...channelRules.map((r: any) => r.canal)]));
    const channelsToAnalyze = appliedChannelFilter === 'TODOS' ? activeChannels : activeChannels.filter(c => c === appliedChannelFilter);

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

      const logoUrl = channelLogos[channelName] || ruleObj.logo_url || null;

      return { 
        canal: channelName, 
        responsavel: ruleObj.responsavel || goalObj.responsavel || 'Equipe Best Fit', 
        metaValor: metaBase,
        faturadoBruto, 
        lucroLiquidoFinal, 
        progressoMetaPct, 
        margemBrutaPct, 
        margemLiquidaPct, 
        logoUrl 
      };
    });
  }, [enrichedSales, goals, adsData, appliedChannelFilter, channelRules, channelLogos, currentRefMonth, canais]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Dashboard Best Fit</h2>
          <p className="text-xs text-slate-400 mt-1">Cálculo de Margem Real = Repasse Líq - CMV - Fretes Flex - ADS</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-700">
            <i className="fa-regular fa-calendar text-indigo-400 pl-2 text-xs"></i>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent text-indigo-300 font-bold text-xs focus:outline-none pr-1 cursor-pointer">
              <option value="MES_ATUAL">Mês Atual (Padrão Metas)</option>
              <option value="HOJE">Hoje</option>
              <option value="SEMANA">Últimos 7 dias</option>
              <option value="QUINZENA">Últimos 15 dias</option>
              <option value="PERSONALIZADO">Personalizado</option>
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
            <i className="fa-solid fa-store text-purple-400 pl-2 text-xs"></i>
            <select value={selectedChannelFilter} onChange={(e) => setSelectedChannelFilter(e.target.value)} className="bg-transparent text-purple-300 font-bold text-xs focus:outline-none pr-1 cursor-pointer">
              <option value="TODOS">Todos os Canais</option>
              {canais.map((ch: string) => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
          <button onClick={handleRecalculate} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-extrabold text-xs rounded-xl shadow-lg">
            {isRecalculating ? 'A calcular...' : 'Recalcular'}
          </button>
        </div>
      </div>

      {/* 4 PAINÉIS DO TOPO COM DIVISÃO FÍSICO VS DIGITAL */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        {/* 1. FATURAMENTO BRUTO */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento Bruto</span>
            <h3 className="text-2xl font-black text-white mt-1">R$ {kpis.faturamentoBrutoVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-500 mt-1">{kpis.totalPedidos} itens validados</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <div>
              <span className="block text-[9px] text-emerald-400 font-bold uppercase mb-0.5">Lojas Físicas</span>
              <span className="text-xs font-bold text-slate-200">R$ {kpis.fatBrutoFisico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="border-l border-slate-800 pl-2.5">
              <span className="block text-[9px] text-blue-400 font-bold uppercase mb-0.5">E-commerce</span>
              <span className="text-xs font-bold text-slate-200">R$ {kpis.fatBrutoDigital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* 2. REPASSE TOTAL */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Repasse Total das Plataformas</span>
            <h3 className="text-2xl font-black text-purple-400 mt-1">R$ {kpis.faturamentoLiquidoRepasse.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <div>
              <span className="block text-[9px] text-emerald-400 font-bold uppercase mb-0.5">Lojas Físicas</span>
              <span className="text-xs font-bold text-slate-200">R$ {kpis.repasseFisico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="border-l border-slate-800 pl-2.5">
              <span className="block text-[9px] text-blue-400 font-bold uppercase mb-0.5">E-commerce</span>
              <span className="text-xs font-bold text-slate-200">R$ {kpis.repasseDigital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        
        {/* 3. CMV TOTAL */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">CMV Total (Custos de SKU x Qtd)</span>
            <h3 className="text-2xl font-black text-amber-400 mt-1">R$ {kpis.custoTotalCMV.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <div>
              <span className="block text-[9px] text-emerald-400 font-bold uppercase mb-0.5">Lojas Físicas</span>
              <span className="text-xs font-bold text-slate-200">R$ {kpis.cmvFisico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="border-l border-slate-800 pl-2.5">
              <span className="block text-[9px] text-blue-400 font-bold uppercase mb-0.5">E-commerce</span>
              <span className="text-xs font-bold text-slate-200">R$ {kpis.cmvDigital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* 4. LUCRO LÍQUIDO REAL */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/20 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Lucro Líquido Real</span>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">R$ {kpis.lucroLiquidoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <div>
              <span className="block text-[9px] text-emerald-400 font-bold uppercase mb-0.5">Lojas Físicas</span>
              <span className="text-xs font-bold text-slate-200">R$ {kpis.lucroFisico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="border-l border-slate-800 pl-2.5">
              <span className="block text-[9px] text-blue-400 font-bold uppercase mb-0.5">E-commerce</span>
              <span className="text-xs font-bold text-slate-200">R$ {kpis.lucroDigital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channelAnalytics.map((item: any) => (
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
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
                    {item.progressoMetaPct.toFixed(1)}% Meta
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
             
             <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
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
        ))}
      </div>
    </div>
  );
}