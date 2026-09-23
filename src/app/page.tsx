'use client';
import React, { useState, useMemo } from 'react';
import { useAppContext, CHANNELS } from '@/context/AppContext';

export default function DashboardPage() {
  const { sales, adsData, flexData, products, addLog } = useAppContext();

  const [selectedState, setSelectedState] = useState('TODOS');
  const [appliedStateFilter, setAppliedStateFilter] = useState('TODOS');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('TODOS');
  const [appliedChannelFilter, setAppliedChannelFilter] = useState('TODOS');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      const matchesState = appliedStateFilter === 'TODOS' || s.estado === appliedStateFilter;
      const matchesChannel = appliedChannelFilter === 'TODOS' || s.canal === appliedChannelFilter;
      const matchesSearch = searchQuery === '' || s.id_pedido.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesState && matchesChannel && matchesSearch;
    });
  }, [sales, appliedStateFilter, appliedChannelFilter, searchQuery]);

  const kpis = useMemo(() => {
    const faturamentoBrutoVendas = filteredSales.reduce((sum: number, s: any) => sum + ((Number(s.preco_venda) || 0) * (Number(s.quantidade) || 1)), 0);
    const faturamentoLiquidoRepasse = filteredSales.reduce((sum: number, s: any) => sum + (Number(s.faturamento_liquido_final) || 0), 0);

    let custoTotal = 0;
    let custoFlexTotal = 0;

    filteredSales.forEach((s: any) => {
      const prod = products.find((p: any) => p.sku === s.sku);
      if(prod) custoTotal += ((Number(prod.preco_custo) + Number(prod.custo_embalagem)) * (Number(s.quantidade) || 1));

      const flexMatch = flexData.find((f: any) => f.id_pedido === s.id_pedido);
      if (flexMatch) custoFlexTotal += Number(flexMatch.valor_frete);
    });

    const custoAdsTotal = adsData
      .filter((a: any) => appliedChannelFilter === 'TODOS' || a.canal === appliedChannelFilter)
      .reduce((acc: number, a: any) => acc + Number(a.custo_ads), 0);

    const lucroLiquidoReal = faturamentoLiquidoRepasse - custoTotal - custoFlexTotal - custoAdsTotal;

    return { faturamentoBrutoVendas, faturamentoLiquidoRepasse, custoTotal, custoFlexTotal, custoAdsTotal, lucroLiquidoReal, totalPedidos: filteredSales.length };
  }, [filteredSales, products, adsData, flexData, appliedChannelFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div><h2 className="text-xl font-bold text-white tracking-tight">Painel Executivo de Vendas</h2></div>
        <div className="flex gap-3">
          <select value={selectedChannelFilter} onChange={(e) => setSelectedChannelFilter(e.target.value)} className="bg-slate-950 border border-slate-700 text-purple-300 font-bold text-xs rounded-lg px-2 py-1">
            <option value="TODOS">Todos os Canais</option>
            {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>
          <button onClick={handleRecalculate} className="px-4 py-2 bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-lg">
            {isRecalculating ? 'A calcular...' : 'Recalcular'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Fat. Bruto</span>
          <h3 className="text-2xl font-black text-white">R$ {kpis.faturamentoBrutoVendas.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-500 mt-1">{kpis.totalPedidos} pedidos validados</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Repasse Líquido</span>
          <h3 className="text-2xl font-black text-purple-400">R$ {kpis.faturamentoLiquidoRepasse.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Após comissões</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase">Custos & Deduções</span>
          <h3 className="text-2xl font-black text-amber-400">R$ {(kpis.custoTotal + kpis.custoFlexTotal + kpis.custoAdsTotal).toFixed(2)}</h3>
          <p className="text-[11px] text-slate-500 mt-1">CMV + R${kpis.custoFlexTotal.toFixed(2)} Flex + R${kpis.custoAdsTotal.toFixed(2)} ADS</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-emerald-400 uppercase">Lucro Líquido Real</span>
          <h3 className="text-2xl font-black text-emerald-400">R$ {kpis.lucroLiquidoReal.toFixed(2)}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Liquidez Final</p>
        </div>
      </div>

      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <h3 className="font-bold text-white text-base mb-4">Pedidos Faturados</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr><th className="py-3 pl-3">ID Pedido</th><th>Canal</th><th>SKU</th><th>Preço Venda</th><th className="text-right pr-3">Repasse Líquido</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredSales.map((s: any) => (
                <tr key={s.id_pedido} className="hover:bg-slate-800/40">
                  <td className="py-2.5 pl-3 font-bold text-indigo-400">{s.id_pedido}</td>
                  <td className="py-2.5">{s.canal}</td>
                  <td className="py-2.5 font-mono">{s.sku}</td>
                  <td className="py-2.5">R$ {s.preco_venda.toFixed(2)}</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-emerald-400">R$ {s.faturamento_liquido_final.toFixed(2)}</td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">Nenhum pedido processado até o momento.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}