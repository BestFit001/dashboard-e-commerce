'use client';
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function ProdutosPage() {
  const { sales, products, cancelados, adsData, flexData } = useAppContext();
  
  const [dateFilter, setDateFilter] = useState('MES');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 1. Filtragem de Data
  const filteredSales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sales.filter((s: any) => {
      if (dateFilter !== 'TUDO' && s.data_faturamento) {
         const d = new Date(s.data_faturamento + 'T00:00:00');
         d.setHours(0, 0, 0, 0);
         if (dateFilter === 'HOJE' && d.getTime() !== today.getTime()) return false;
         if (dateFilter === 'SEMANA' && (d < new Date(today.getTime() - 7*24*60*60*1000) || d > today)) return false;
         if (dateFilter === 'QUINZENA' && (d < new Date(today.getTime() - 15*24*60*60*1000) || d > today)) return false;
         if (dateFilter === 'MES' && (d < new Date(today.getTime() - 30*24*60*60*1000) || d > today)) return false;
         if (dateFilter === 'PERSONALIZADO' && customStartDate && customEndDate) {
            const start = new Date(customStartDate + 'T00:00:00');
            const end = new Date(customEndDate + 'T23:59:59');
            if (d < start || d > end) return false;
         }
      }
      return true;
    });
  }, [sales, dateFilter, customStartDate, customEndDate]);

  // 2. Processamento da Curva ABC de SKUs
  const { abcCurve, kpis } = useMemo(() => {
    const skuStats: Record<string, any> = {};
    let faturamentoTotal = 0;

    // Agrupa vendas por SKU
    filteredSales.forEach((s: any) => {
      if (!skuStats[s.sku]) skuStats[s.sku] = { sku: s.sku, qtd: 0, revenue: 0, repasse: 0 };
      skuStats[s.sku].qtd += (Number(s.quantidade) || 1);
      
      const preco = Number(s.preco_venda) || 0;
      skuStats[s.sku].revenue += preco;
      skuStats[s.sku].repasse += (Number(s.repasse_liquido) || 0);
      faturamentoTotal += preco;
    });

    // Enriquecer com dados de Produtos (Título e Marca)
    let enrichedSkus = Object.values(skuStats).map(s => {
      const p = products.find((prod: any) => prod.sku === s.sku) || {};
      const custoUn = (Number(p.preco_custo) || 0) + (Number(p.custo_embalagem) || 0);
      const cmvTotal = custoUn * s.qtd;
      const lucroTotal = s.repasse - cmvTotal; // Estimativa simples, sem descontar ads/flex especifico por sku
      
      return { 
        ...s, 
        titulo: p.titulo || 'Produto não cadastrado', 
        marca: p.marca || 'Sem Marca',
        cmvTotal,
        lucroTotal
      };
    });

    // Ordenar do maior para o menor faturamento
    enrichedSkus.sort((a, b) => b.revenue - a.revenue);

    // Calcular Curva ABC (A = 80%, B = 15%, C = 5% do faturamento)
    let cumulative = 0;
    let countA = 0, countB = 0, countC = 0;

    enrichedSkus.forEach(s => {
      cumulative += s.revenue;
      const pct = (cumulative / (faturamentoTotal || 1)) * 100;
      s.pctRepresentatividade = (s.revenue / (faturamentoTotal || 1)) * 100;

      if (pct <= 80) { s.curva = 'A'; countA++; }
      else if (pct <= 95) { s.curva = 'B'; countB++; }
      else { s.curva = 'C'; countC++; }
    });

    const ticketMedio = filteredSales.length > 0 ? faturamentoTotal / filteredSales.length : 0;
    // Estimativa de cancelamento: Multiplica a QTD de cancelados pelo Ticket Médio do período
    const valorEstimadoCancelado = cancelados.length * ticketMedio;

    return { 
      abcCurve: enrichedSkus, 
      kpis: { faturamentoTotal, countA, countB, countC, ticketMedio, totalCancelados: cancelados.length, valorEstimadoCancelado }
    };
  }, [filteredSales, products, cancelados]);

  // 3. Processamento de Marcas
  const brandStats = useMemo(() => {
    const brands: Record<string, any> = {};
    abcCurve.forEach(s => {
      const b = s.marca;
      if (!brands[b]) brands[b] = { marca: b, revenue: 0, qtd: 0 };
      brands[b].revenue += s.revenue;
      brands[b].qtd += s.qtd;
    });
    return Object.values(brands).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [abcCurve]);

  return (
    <div className="space-y-6">
      {/* Header e Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Inteligência de Produtos</h2>
          <p className="text-xs text-slate-400 mt-1">Análise de Curva ABC, Desempenho por Marca e Impacto de Cancelamentos</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-700">
            <i className="fa-regular fa-calendar text-indigo-400 pl-2 text-xs"></i>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent text-indigo-300 font-bold text-xs focus:outline-none pr-1 cursor-pointer">
              <option value="TUDO">Todo o Histórico</option>
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
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento (Filtro Atual)</span>
          <h3 className="text-2xl font-black text-white mt-1">R$ {kpis.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Ticket Médio: R$ {kpis.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-indigo-500/30">
          <span className="text-[10px] font-bold text-indigo-400 uppercase">Curva A (Top 80% Receita)</span>
          <h3 className="text-2xl font-black text-indigo-400 mt-1">{kpis.countA} SKUs</h3>
          <p className="text-[10px] text-slate-500 mt-1">Prioridade máxima de reposição</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-emerald-500/30">
          <span className="text-[10px] font-bold text-emerald-400 uppercase">Curva B (15% Receita)</span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">{kpis.countB} SKUs</h3>
          <p className="text-[10px] text-slate-500 mt-1">Desempenho intermediário</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-rose-500/30">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-rose-400 uppercase">Perda Est. em Cancelados</span>
            <i className="fa-solid fa-circle-exclamation text-rose-500/50" title="Estimativa: Qtd Cancelados x Ticket Médio"></i>
          </div>
          <h3 className="text-2xl font-black text-rose-400 mt-1">R$ {kpis.valorEstimadoCancelado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-500 mt-1">{kpis.totalCancelados} pedidos cancelados globais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Lateral: Ranking de Marcas */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 h-full">
            <h3 className="font-bold text-white text-base mb-4"><i className="fa-solid fa-medal text-amber-400 mr-2"></i>Faturamento por Marca</h3>
            <div className="space-y-4">
              {brandStats.map((brand, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-300 truncate max-w-[60%]">{brand.marca}</span>
                    <div className="text-right">
                      <span className="block text-xs font-black text-white">R$ {brand.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="block text-[9px] text-slate-400">{brand.qtd} un. vendidas</span>
                    </div>
                  </div>
                  {/* Barra de Progresso visual */}
                  <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-indigo-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.min((brand.revenue / (kpis.faturamentoTotal || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {brandStats.length === 0 && <p className="text-xs text-slate-500 text-center py-4">Sem dados para o período.</p>}
            </div>
          </div>
        </div>

        {/* Painel Principal: Tabela Curva ABC */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800">
               <h3 className="font-bold text-white text-base">Relatório de Curva ABC (Classificação de SKUs)</h3>
            </div>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">Curva</th>
                    <th className="py-3 px-4">SKU / Marca</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-center">Un. Vendidas</th>
                    <th className="py-3 px-4 text-right">Fat. Bruto</th>
                    <th className="py-3 px-4 text-right">Participação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {abcCurve.map((sku: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-lg font-black text-xs ${
                          sku.curva === 'A' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 
                          sku.curva === 'B' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {sku.curva}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="block font-mono font-bold text-white">{sku.sku}</span>
                        <span className="block text-[9px] uppercase text-slate-400 mt-0.5">{sku.marca}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 truncate max-w-[200px]" title={sku.titulo}>{sku.titulo}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">{sku.qtd}</td>
                      <td className="py-3 px-4 text-right font-black text-amber-400">R$ {sku.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right text-slate-300">{sku.pctRepresentatividade.toFixed(2)}%</td>
                    </tr>
                  ))}
                  {abcCurve.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-bold">Nenhum produto vendido neste período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}