'use client';
import React, { useState, useMemo } from 'react';
import { useAppContext, CHANNELS, BRAZIL_STATES } from '@/context/AppContext';

export default function DashboardPage() {
  const { sales, adsData, products, goals, channelRules, channelLogos, addLog } = useAppContext();
  
  const [selectedState, setSelectedState] = useState('TODOS');
  const [appliedStateFilter, setAppliedStateFilter] = useState('TODOS');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('TODOS');
  const [appliedChannelFilter, setAppliedChannelFilter] = useState('TODOS');
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setAppliedStateFilter(selectedState);
      setAppliedChannelFilter(selectedChannelFilter);
      setIsRecalculating(false);
      addLog(`Dashboard recalculado. UF: [${selectedState}], Canal: [${selectedChannelFilter}]`, 'success');
    }, 300);
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s: any) => {
      const matchesState = appliedStateFilter === 'TODOS' || (s.estado || s.estado_compra) === appliedStateFilter;
      const matchesChannel = appliedChannelFilter === 'TODOS' || s.canal === appliedChannelFilter;
      return matchesState && matchesChannel;
    });
  }, [sales, appliedStateFilter, appliedChannelFilter]);

  const kpis = useMemo(() => {
    const faturamentoBrutoVendas = filteredSales.reduce((sum: number, s: any) => sum + ((Number(s.preco_venda) || 0) * (Number(s.quantidade) || 1)), 0);
    const faturamentoLiquidoRepasse = filteredSales.reduce((sum: number, s: any) => sum + (Number(s.faturamento_liquido_final) || 0), 0);
    
    let custoTotal = 0;
    filteredSales.forEach((s: any) => {
      const prod = products.find((p: any) => p.sku === s.sku);
      if(prod) custoTotal += ((Number(prod.preco_custo) + Number(prod.custo_embalagem)) * (Number(s.quantidade) || 1));
    });

    const lucroLiquidoReal = faturamentoLiquidoRepasse - custoTotal - adsData.reduce((acc: number, a: any) => acc + a.custo_ads, 0);

    return { faturamentoBrutoVendas, faturamentoLiquidoRepasse, custoTotal, lucroLiquidoReal, totalPedidos: filteredSales.length };
  }, [filteredSales, products, adsData]);

  const channelAnalytics = useMemo(() => {
    const activeChannels = Array.from(new Set([...CHANNELS, ...channelRules.map((r: any) => r.canal)]));
    const channelsToAnalyze = appliedChannelFilter === 'TODOS' ? activeChannels : activeChannels.filter(c => c === appliedChannelFilter);

    return channelsToAnalyze.map(channelName => {
      const channelSales = filteredSales.filter((s: any) => s.canal === channelName);
      const goalObj = goals.find((g: any) => g.canal === channelName) || { meta_valor: 0, responsavel: 'Equipe Best Fit' };

      const faturadoBruto = channelSales.reduce((sum: number, s: any) => sum + ((Number(s.preco_venda) || 0) * (s.quantidade || 1)), 0);
      const repasseBase = channelSales.reduce((sum: number, s: any) => sum + (Number(s.faturamento_liquido_final) || 0), 0);
      
      const custoAdsCanal = adsData.find((a: any) => a.canal === channelName)?.custo_ads || 0;
      const faturadoLiquido = Math.max(0, repasseBase - custoAdsCanal);

      let custoCMVCanal = 0;
      channelSales.forEach((s: any) => {
        const prod = products.find((p: any) => p.sku === s.sku);
        if (prod) custoCMVCanal += ((Number(prod.preco_custo) + Number(prod.custo_embalagem)) * (s.quantidade || 1));
      });

      const lucroBruto = repasseBase - custoCMVCanal;
      const margemBrutaPct = faturadoBruto > 0 ? (lucroBruto / faturadoBruto) * 100 : 0;
      const lucroLiquido = faturadoLiquido - custoCMVCanal;
      const margemLiquidaPct = faturadoBruto > 0 ? (lucroLiquido / faturadoBruto) * 100 : 0;
      const progressoMetaPct = (Number(goalObj.meta_valor) || 0) > 0 ? (faturadoLiquido / Number(goalObj.meta_valor)) * 100 : 0;

      const logoUrl = channelLogos[channelName] || null;

      return {
        canal: channelName, 
        responsavel: goalObj.responsavel || 'Equipe Best Fit',
        faturadoBruto, faturadoLiquido,
        lucroLiquido,
        margemBrutaPct: parseFloat(margemBrutaPct.toFixed(1)),
        margemLiquidaPct: parseFloat(margemLiquidaPct.toFixed(1)),
        progressoMetaPct: parseFloat(progressoMetaPct.toFixed(1)),
        logoUrl
      };
    });
  }, [filteredSales, goals, adsData, products, appliedChannelFilter, channelLogos, channelRules]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div><h2 className="text-xl font-bold text-white tracking-tight">Painel Executivo de Vendas Best Fit</h2></div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={selectedChannelFilter} onChange={(e) => setSelectedChannelFilter(e.target.value)} className="bg-slate-950 border border-slate-700 text-purple-300 font-bold text-xs rounded-xl px-3 py-2">
            <option value="TODOS">Todos os Canais</option>
            {channelRules.map((r: any) => <option key={r.canal} value={r.canal}>{r.canal}</option>)}
          </select>
          <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="bg-slate-950 border border-slate-700 text-indigo-300 font-bold text-xs rounded-xl px-3 py-2">
             {BRAZIL_STATES.map(uf => <option key={uf} value={uf}>{uf === 'TODOS' ? 'Todos os UF' : uf}</option>)}
          </select>
          <button onClick={handleRecalculate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition">
            {isRecalculating ? 'A calcular...' : 'Recalcular'}
          </button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Faturamento Bruto</span>
          <h3 className="text-2xl font-black text-white mt-1">R$ {kpis.faturamentoBrutoVendas.toFixed(2)}</h3>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Repasse Líquido Canal</span>
          <h3 className="text-2xl font-black text-purple-400 mt-1">R$ {kpis.faturamentoLiquidoRepasse.toFixed(2)}</h3>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Custo Produtos + Emb.</span>
          <h3 className="text-2xl font-black text-amber-400 mt-1">R$ {kpis.custoTotal.toFixed(2)}</h3>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-emerald-950/30">
          <span className="text-xs font-semibold text-emerald-400 uppercase">Lucro Líquido Real</span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">R$ {kpis.lucroLiquidoReal.toFixed(2)}</h3>
        </div>
      </div>

      {/* Consolidado por Canal */}
      <div className="space-y-4">
        <h3 className="font-bold text-white text-base">Consolidado por Canal de Venda</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channelAnalytics.map((item) => (
            <div key={item.canal} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3 gap-3">
                <div className="flex items-center gap-3">
                  {item.logoUrl ? (
                    <img src={item.logoUrl} alt={item.canal} className="w-11 h-11 rounded-xl bg-white object-contain p-1 border border-slate-700 shadow" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 text-[10px] font-bold">Logo</div>
                  )}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">{item.responsavel}</span>
                    <h4 className="font-black text-white text-sm">{item.canal}</h4>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
                  {item.progressoMetaPct}% Meta
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">FAT. BRUTO</span>
                  <strong className="text-xs font-black text-slate-100">R$ {item.faturadoBruto.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-300 block">LUCRO LÍQ.</span>
                  <strong className="text-xs font-black text-purple-400">R$ {item.lucroLiquido.toFixed(2)}</strong>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 block">MARGEM BRUTA</span>
                  <strong className="text-xs font-black text-indigo-400">{item.margemBrutaPct}%</strong>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 block">MARGEM LÍQUIDA</span>
                  <strong className="text-xs font-black text-emerald-400">{item.margemLiquidaPct}%</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de Pedidos */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <h3 className="font-bold text-white text-base mb-4">Pedidos Faturados ({filteredSales.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr><th className="py-3 pl-3">ID Pedido</th><th>Canal</th><th>SKU</th><th>Estado</th><th className="text-right pr-3">Líquido Final</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredSales.map((s: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2.5 pl-3 font-bold text-indigo-400">{s.id_pedido}</td>
                  <td className="py-2.5">{s.canal}</td>
                  <td className="py-2.5 font-mono">{s.sku}</td>
                  <td className="py-2.5">{s.estado || s.estado_compra}</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-emerald-400">R$ {Number(s.faturamento_liquido_final || 0).toFixed(2)}</td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhum pedido encontrado para os filtros selecionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}