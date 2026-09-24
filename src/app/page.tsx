'use client';
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function DashboardPage() {
  const { canais, sales, adsData, flexData, products, goals, channelRules, channelLogos, addLog } = useAppContext();
  
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('TODOS');
  const [appliedChannelFilter, setAppliedChannelFilter] = useState('TODOS');
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setAppliedChannelFilter(selectedChannelFilter);
      setIsRecalculating(false);
      addLog(`Dashboard recalculado. Canal: [${selectedChannelFilter}]`, 'success');
    }, 300);
  };

  const enrichedSales = useMemo(() => {
    return sales.filter((s: any) => appliedChannelFilter === 'TODOS' || s.canal === appliedChannelFilter)
      .map((s: any) => {
        const prod = products.find((p: any) => p.sku === s.sku) || { preco_custo: 0, custo_embalagem: 0 };
        const custoUn = (prod.preco_custo || 0) + (prod.custo_embalagem || 0);
        const custoCMV = custoUn * (s.quantidade || 1);
        const flexOrder = flexData.find((f: any) => f.id_pedido === s.id_pedido);
        const custoFlex = flexOrder ? (flexOrder.valor_frete || 0) : 0;
        const repasse = s.repasse_liquido || 0;
        const ganhoBruto = repasse - custoCMV; 
        const ganhoLiquido = ganhoBruto - custoFlex;

        return { ...s, custoCMV, custoFlex, ganhoBruto, ganhoLiquido };
      });
  }, [sales, appliedChannelFilter, products, flexData]);

  const kpis = useMemo(() => {
    const faturamentoBrutoVendas = enrichedSales.reduce((sum: number, s: any) => sum + (s.preco_venda || 0), 0);
    const faturamentoLiquidoRepasse = enrichedSales.reduce((sum: number, s: any) => sum + (s.repasse_liquido || 0), 0);
    const custoTotalCMV = enrichedSales.reduce((sum: number, s: any) => sum + (s.custoCMV || 0), 0);
    
    const filteredAds = adsData.filter((a: any) => appliedChannelFilter === 'TODOS' || a.canal === appliedChannelFilter);
    const totalAdsCost = filteredAds.reduce((sum: number, a: any) => sum + (a.custo_ads || 0), 0);
    const totalFlexCost = enrichedSales.reduce((sum: number, s: any) => sum + (s.custoFlex || 0), 0);
    
    const lucroLiquidoReal = faturamentoLiquidoRepasse - custoTotalCMV - totalFlexCost - totalAdsCost;

    return { faturamentoBrutoVendas, faturamentoLiquidoRepasse, custoTotalCMV, lucroLiquidoReal, totalPedidos: enrichedSales.length };
  }, [enrichedSales, adsData, appliedChannelFilter]);

  const channelAnalytics = useMemo(() => {
    const channelsToAnalyze = appliedChannelFilter === 'TODOS' ? canais : canais.filter((c:string) => c === appliedChannelFilter);

    return channelsToAnalyze.map((channelName: string) => {
      const chSales = enrichedSales.filter((s: any) => s.canal === channelName);
      
      // Busca as Metas, as Regras (Responsável) e o Logo dinamicamente
      const goalObj = goals.find((g: any) => g.canal === channelName) || { meta_valor: 0 };
      const ruleObj = channelRules.find((r: any) => r.canal === channelName) || { responsavel: 'EQUIPE BEST FIT' };
      const logo = channelLogos[channelName];

      const faturadoBruto = chSales.reduce((sum: number, s: any) => sum + (s.preco_venda || 0), 0);
      const repasseTotal = chSales.reduce((sum: number, s: any) => sum + (s.repasse_liquido || 0), 0);
      const canalAds = adsData.filter((a: any) => a.canal === channelName).reduce((sum: number, a: any) => sum + (a.custo_ads || 0), 0);
      const cmvCanal = chSales.reduce((sum: number, s: any) => sum + (s.custoCMV || 0), 0);
      const flexCanal = chSales.reduce((sum: number, s: any) => sum + (s.custoFlex || 0), 0);

      const faturadoLiquido = repasseTotal - cmvCanal - flexCanal - canalAds;
      const progressoMetaPct = goalObj.meta_valor > 0 ? (faturadoBruto / goalObj.meta_valor) * 100 : 0;
      const ganhoBrutoCanal = repasseTotal - cmvCanal;
      const margemBrutaPct = faturadoBruto > 0 ? (ganhoBrutoCanal / faturadoBruto) * 100 : 0;
      const margemLiquidaPct = faturadoBruto > 0 ? (faturadoLiquido / faturadoBruto) * 100 : 0;

      return { 
        canal: channelName, 
        responsavel: ruleObj.responsavel || 'EQUIPE BEST FIT', 
        logo,
        metaValor: goalObj.meta_valor, 
        faturadoBruto, 
        faturadoLiquido, 
        progressoMetaPct, 
        margemBrutaPct, 
        margemLiquidaPct 
      };
    });
  }, [enrichedSales, goals, channelRules, channelLogos, adsData, canais, appliedChannelFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Painel Executivo Omnichannel</h2>
          <p className="text-xs text-slate-400 mt-1">Metas sobre Fat. Bruto | Ganho Real: Repasse - CMV(Emb+Prod) - Fretes Flex - ADS</p>
        </div>
        <div className="flex gap-3">
          <select value={selectedChannelFilter} onChange={(e) => setSelectedChannelFilter(e.target.value)} className="bg-slate-950 border border-slate-700 text-purple-300 font-bold text-xs rounded-lg px-3 py-2">
            <option value="TODOS">Todos os Canais</option>
            {canais.map((ch: string) => <option key={ch} value={ch}>{ch}</option>)}
          </select>
          <button onClick={handleRecalculate} className="px-5 py-2 bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-lg">
            {isRecalculating ? 'A calcular...' : 'Recalcular'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento Bruto</span>
          <h3 className="text-2xl font-black text-white">R$ {kpis.faturamentoBrutoVendas.toFixed(2).replace('.', ',')}</h3>
          <p className="text-[10px] text-slate-500">{kpis.totalPedidos} pedidos validados</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Repasse Total das Plataformas</span>
          <h3 className="text-2xl font-black text-purple-400">R$ {kpis.faturamentoLiquidoRepasse.toFixed(2).replace('.', ',')}</h3>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">CMV Total (Custos de SKU x Qtd)</span>
          <h3 className="text-2xl font-black text-amber-400">R$ {kpis.custoTotalCMV.toFixed(2).replace('.', ',')}</h3>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/20">
          <span className="text-[10px] font-bold text-emerald-400 uppercase">Lucro Líquido Real</span>
          <h3 className="text-2xl font-black text-emerald-400">R$ {kpis.lucroLiquidoReal.toFixed(2).replace('.', ',')}</h3>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-white text-base">Consolidado por Canal de Venda</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {channelAnalytics.map((item: any) => (
            <div key={item.canal} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
               
               <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-950 rounded-lg flex items-center justify-center overflow-hidden border border-slate-800 p-0.5">
                      {item.logo ? <img src={item.logo} alt={item.canal} className="w-full h-full object-contain" /> : <span className="text-[8px] text-slate-500 font-bold uppercase">Logo</span>}
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400">{item.responsavel}</span>
                      <h4 className="font-black text-white text-sm leading-tight">{item.canal}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{item.progressoMetaPct.toFixed(1)}% Meta</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div><span className="text-[10px] text-slate-400 block">Fat. Bruto</span><strong className="text-sm text-white">R$ {item.faturadoBruto.toFixed(2).replace('.', ',')}</strong></div>
                 <div><span className="text-[10px] text-purple-300 block">Lucro Líquido Real</span><strong className="text-sm text-purple-400">R$ {item.faturadoLiquido.toFixed(2).replace('.', ',')}</strong></div>
               </div>
               <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div><span className="text-[10px] text-slate-500 block">Margem Bruta</span><strong className="text-xs text-indigo-400">{item.margemBrutaPct.toFixed(1)}%</strong></div>
                  <div><span className="text-[10px] text-slate-500 block">Margem Líquida</span><strong className="text-xs text-emerald-400">{item.margemLiquidaPct.toFixed(1)}%</strong></div>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 overflow-x-auto">
        <h3 className="font-bold text-white text-base mb-4">Fragmentação por Pedido (Ganho Real)</h3>
        <table className="w-full text-left text-xs text-slate-200">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
            <tr>
              <th className="py-3 pl-3">ID Pedido</th>
              <th>Canal</th>
              <th>SKU (Qtd)</th>
              <th>PDV (Fat. Bruto)</th>
              <th>Repasse (Fórmula)</th>
              <th>CMV do Pedido</th>
              <th className="text-indigo-300">Ganho Bruto</th>
              <th className="text-rose-300">FLEX</th>
              <th className="text-emerald-400 font-extrabold pr-3 text-right">Ganho Líquido Real</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {enrichedSales.map((s: any) => (
              <tr key={s.id_pedido} className="hover:bg-slate-800/40">
                <td className="py-2.5 pl-3 font-bold text-indigo-400">{s.id_pedido}</td>
                <td className="py-2.5">{s.canal}</td>
                <td className="py-2.5 font-mono text-[10px]">{s.sku} (x{s.quantidade})</td>
                <td className="py-2.5">R$ {(s.preco_venda || 0).toFixed(2).replace('.', ',')}</td>
                <td className="py-2.5">R$ {(s.repasse_liquido || 0).toFixed(2).replace('.', ',')}</td>
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