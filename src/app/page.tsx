'use client';
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function DashboardPage() {
  const { canais, sales, adsData, flexData, products, goals, channelRules, channelLogos, addLog } = useAppContext();
  
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('TODOS');
  const [appliedChannelFilter, setAppliedChannelFilter] = useState('TODOS');
  
  const [dateFilter, setDateFilter] = useState('TUDO');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedDateFilter, setAppliedDateFilter] = useState('TUDO');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
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

        if (appliedDateFilter !== 'TUDO' && s.data_faturamento) {
           const d = new Date(s.data_faturamento + 'T00:00:00');
           d.setHours(0, 0, 0, 0);
           
           if (appliedDateFilter === 'HOJE' && d.getTime() !== today.getTime()) return false;
           if (appliedDateFilter === 'SEMANA' && (d < new Date(today.getTime() - 7*24*60*60*1000) || d > today)) return false;
           if (appliedDateFilter === 'QUINZENA' && (d < new Date(today.getTime() - 15*24*60*60*1000) || d > today)) return false;
           if (appliedDateFilter === 'MES' && (d < new Date(today.getTime() - 30*24*60*60*1000) || d > today)) return false;
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
        const custoCMV = ((prod.preco_custo || 0) + (prod.custo_embalagem || 0)) * (s.quantidade || 1);
        const flexOrder = flexData.find((f: any) => f.id_pedido === s.id_pedido);
        const custoFlex = flexOrder ? (flexOrder.valor_frete || 0) : 0;
        const ganhoBruto = (s.repasse_liquido || 0) - custoCMV; 
        const ganhoLiquido = ganhoBruto - custoFlex;
        return { ...s, custoCMV, custoFlex, ganhoBruto, ganhoLiquido };
      });
  }, [sales, appliedChannelFilter, appliedDateFilter, appliedStartDate, appliedEndDate, products, flexData]);

  const currentRefMonth = useMemo(() => {
    if (appliedDateFilter === 'PERSONALIZADO' && appliedStartDate) return appliedStartDate.slice(0, 7);
    return new Date().toISOString().slice(0, 7); 
  }, [appliedDateFilter, appliedStartDate]);

  const kpis = useMemo(() => {
    const faturamentoBrutoVendas = enrichedSales.reduce((sum: number, s: any) => sum + (s.preco_venda || 0), 0);
    const faturamentoLiquidoRepasse = enrichedSales.reduce((sum: number, s: any) => sum + (s.repasse_liquido || 0), 0);
    const custoTotalCMV = enrichedSales.reduce((sum: number, s: any) => sum + (s.custoCMV || 0), 0);
    const totalFlexCost = enrichedSales.reduce((sum: number, s: any) => sum + (s.custoFlex || 0), 0);
    
    const filteredAds = adsData.filter((a: any) => appliedChannelFilter === 'TODOS' || a.canal === appliedChannelFilter);
    const totalAdsCost = filteredAds.reduce((sum: number, a: any) => sum + (a.custo_ads || 0), 0);
    
    const lucroLiquidoReal = faturamentoLiquidoRepasse - custoTotalCMV - totalFlexCost - totalAdsCost;

    return { faturamentoBrutoVendas, faturamentoLiquidoRepasse, custoTotalCMV, lucroLiquidoReal, totalPedidos: enrichedSales.length };
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

      const faturadoBruto = chSales.reduce((sum: number, s: any) => sum + (s.preco_venda || 0), 0);
      const repasseTotal = chSales.reduce((sum: number, s: any) => sum + (s.repasse_liquido || 0), 0);
      const canalAds = adsData.find((a: any) => a.canal === channelName)?.custo_ads || 0;
      const cmvCanal = chSales.reduce((sum: number, s: any) => sum + (s.custoCMV || 0), 0);
      const flexCanal = chSales.reduce((sum: number, s: any) => sum + (s.custoFlex || 0), 0);

      const faturadoLiquido = repasseTotal - cmvCanal - flexCanal - canalAds;
      const progressoMetaPct = goalObj.meta_valor > 0 ? (faturadoBruto / goalObj.meta_valor) * 100 : 0;
      
      const ganhoBrutoCanal = repasseTotal - cmvCanal;
      const margemBrutaPct = faturadoBruto > 0 ? (ganhoBrutoCanal / faturadoBruto) * 100 : 0;
      const margemLiquidaPct = faturadoBruto > 0 ? (faturadoLiquido / faturadoBruto) * 100 : 0;

      const logoUrl = channelLogos[channelName as keyof typeof channelLogos] || ruleObj.logo_url || null;

      return { canal: channelName, responsavel: goalObj.responsavel || ruleObj.responsavel, metaValor: goalObj.meta_valor, faturadoBruto, faturadoLiquido, progressoMetaPct, margemBrutaPct, margemLiquidaPct, logoUrl };
    });
  }, [enrichedSales, goals, adsData, appliedChannelFilter, channelRules, channelLogos, currentRefMonth, canais]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Dashboard Best Fit</h2>
          <p className="text-xs text-slate-400 mt-1">Metas sobre Fat. Bruto | Lucro Líquido: Repasse - CMV - Fretes Flex - ADS</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          {/* Filtro Datas */}
          <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-700">
            <i className="fa-regular fa-calendar text-indigo-400 pl-2 text-xs"></i>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent text-indigo-300 font-bold text-xs focus:outline-none pr-1 cursor-pointer">
              <option value="TUDO">Todo o Período</option>
              <option value="HOJE">Hoje</option>
              <option value="SEMANA">Últimos 7 dias</option>
              <option value="QUINZENA">Últimos 15 dias</option>
              <option value="MES">Últimos 30 dias</option>
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
          {/* Filtro Canais Corrigido: Agora usa a lista global 'canais' */}
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento Bruto</span>
          <h3 className="text-2xl font-black text-white mt-1">R$ {kpis.faturamentoBrutoVendas.toFixed(2).replace('.', ',')}</h3>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Repasse Total das Plataformas</span>
          <h3 className="text-2xl font-black text-purple-400 mt-1">R$ {kpis.faturamentoLiquidoRepasse.toFixed(2).replace('.', ',')}</h3>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">CMV Total (Custos de SKU x Qtd)</span>
          <h3 className="text-2xl font-black text-amber-400 mt-1">R$ {kpis.custoTotalCMV.toFixed(2).replace('.', ',')}</h3>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/20">
          <span className="text-[10px] font-bold text-emerald-400 uppercase">Lucro Líquido Final</span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">R$ {kpis.lucroLiquidoReal.toFixed(2).replace('.', ',')}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channelAnalytics.map((item: any) => (
          <div key={item.canal} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
             <div className="flex justify-between items-start border-b border-slate-800 pb-3 gap-3">
               <div className="flex items-center gap-3">
                 {item.logoUrl ? <img src={item.logoUrl} alt={item.canal} className="w-11 h-11 rounded-xl bg-white object-contain p-1 border border-slate-700 shadow" /> : <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 text-[10px] font-bold">Logo</div>}
                 <div>
                   <span className="text-[10px] uppercase font-bold text-slate-400 block">{item.responsavel || 'Equipe'}</span>
                   <h4 className="font-black text-white text-sm">{item.canal}</h4>
                 </div>
               </div>
               <div className="flex flex-col items-end">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap mb-1">{item.progressoMetaPct.toFixed(1)}% Meta</span>
                  <span className="text-[9px] text-slate-500 font-bold">Meta R$: {Number(item.metaValor).toLocaleString('pt-BR')}</span>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
               <div><span className="text-[10px] text-slate-400 block font-bold">FAT. BRUTO</span><strong className="text-xs text-white">R$ {item.faturadoBruto.toFixed(2).replace('.', ',')}</strong></div>
               <div><span className="text-[10px] text-purple-300 block font-bold">LUCRO LÍQ.</span><strong className="text-xs text-purple-400">R$ {item.faturadoLiquido.toFixed(2).replace('.', ',')}</strong></div>
             </div>
             <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div><span className="text-[10px] text-slate-500 block font-bold">Margem Bruta</span><strong className="text-xs text-indigo-400">{item.margemBrutaPct.toFixed(1)}%</strong></div>
                <div><span className="text-[10px] text-slate-500 block font-bold">Margem Líquida</span><strong className="text-xs text-emerald-400">{item.margemLiquidaPct.toFixed(1)}%</strong></div>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 overflow-x-auto">
        <h3 className="font-bold text-white text-base mb-4">Fragmentação por Pedido (Análise de Margem)</h3>
        <table className="w-full text-left text-xs text-slate-200">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
            <tr>
              <th className="py-3 pl-3">Data</th>
              <th>ID Pedido</th>
              <th>Canal</th>
              <th>SKU (Qtd)</th>
              <th>Fat. Bruto</th>
              <th>Repasse Líq.</th>
              <th>Custo CMV</th>
              <th className="text-indigo-300">Lucro Bruto</th>
              <th className="text-rose-300">Frete FLEX</th>
              <th className="text-emerald-400 font-extrabold pr-3 text-right">Lucro Líq. Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {enrichedSales.map((s: any, i: number) => (
              <tr key={i} className="hover:bg-slate-800/40">
                <td className="py-2.5 pl-3 text-slate-400">{s.data_faturamento ? s.data_faturamento.split('-').reverse().join('/') : '-'}</td>
                <td className="py-2.5 font-bold text-indigo-400">{s.id_pedido}</td>
                <td className="py-2.5">{s.canal}</td>
                <td className="py-2.5 font-mono text-[10px]">{s.sku} (x{s.quantidade})</td>
                <td className="py-2.5">R$ {(s.preco_venda || 0).toFixed(2).replace('.', ',')}</td>
                <td className="py-2.5 text-purple-300">R$ {(s.repasse_liquido || 0).toFixed(2).replace('.', ',')}</td>
                <td className="py-2.5 text-amber-300">- R$ {(s.custoCMV || 0).toFixed(2).replace('.', ',')}</td>
                <td className="py-2.5 font-bold text-indigo-300">R$ {(s.ganhoBruto || 0).toFixed(2).replace('.', ',')}</td>
                <td className="py-2.5 text-rose-300">- R$ {(s.custoFlex || 0).toFixed(2).replace('.', ',')}</td>
                <td className="py-2.5 pr-3 text-right font-extrabold text-emerald-400">R$ {(s.ganhoLiquido || 0).toFixed(2).replace('.', ',')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}