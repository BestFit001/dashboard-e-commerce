'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function ProdutosPage() {
  const { sales, products, cancelados, flexData } = useAppContext();
  
  const [dateFilter, setDateFilter] = useState('MES');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Estados para os filtros de SKU e Marca (Curva ABC)
  const [searchSku, setSearchSku] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('TODAS');

  // Estados para a Tabela de Pedidos
  const [searchOrderId, setSearchOrderId] = useState('');
  const [sortOrder, setSortOrder] = useState('DEFAULT');
  const [cmvFilter, setCmvFilter] = useState('TODOS'); // NOVO: Estado para filtrar CMV
  const [currentPageOrders, setCurrentPageOrders] = useState(1);
  const itemsPerPageOrders = 20;

  // Resetar página da tabela de pedidos ao mudar filtros
  useEffect(() => {
    setCurrentPageOrders(1);
  }, [searchOrderId, sortOrder, cmvFilter, dateFilter, customStartDate, customEndDate]);

  // Extrair lista única de marcas
  const availableBrands = useMemo(() => {
    const brands = new Set(products.map((p: any) => {
      const m = p.marca?.trim();
      return m ? m.toUpperCase() : 'SEM MARCA';
    }));
    return ['TODAS', ...Array.from(brands).sort((a: any, b: any) => a.localeCompare(b))];
  }, [products]);

  // 1. Filtragem Global de Data
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

  // 2. Processamento da Curva ABC e Filtros de Texto/Marca
  const { abcCurve, kpis } = useMemo(() => {
    const skuStats: Record<string, any> = {};

    filteredSales.forEach((s: any) => {
      if (!skuStats[s.sku]) skuStats[s.sku] = { sku: s.sku, qtd: 0, revenue: 0, repasse: 0 };
      skuStats[s.sku].qtd += (Number(s.quantidade) || 1);
      
      const preco = Number(s.preco_venda) || 0;
      skuStats[s.sku].revenue += preco;
      skuStats[s.sku].repasse += (Number(s.repasse_liquido) || 0);
    });

    let faturamentoTotalPeriodo = 0;

    let allSkus = Object.values(skuStats).map(s => {
      const p = products.find((prod: any) => prod.sku === s.sku) || {};
      const custoUn = (Number(p.preco_custo) || 0) + (Number(p.custo_embalagem) || 0);
      const cmvTotal = custoUn * s.qtd;
      const lucroTotal = s.repasse - cmvTotal; 
      
      const marcaRaw = p.marca?.trim();
      const marcaNormalizada = marcaRaw ? marcaRaw.toUpperCase() : 'SEM MARCA';
      
      faturamentoTotalPeriodo += s.revenue; 

      return { ...s, titulo: p.titulo || 'Produto não cadastrado', marca: marcaNormalizada, cmvTotal, lucroTotal };
    });

    allSkus.sort((a, b) => b.revenue - a.revenue);

    let cumulative = 0;
    allSkus.forEach(s => {
      cumulative += s.revenue;
      const pct = (cumulative / (faturamentoTotalPeriodo || 1)) * 100;
      s.pctRepresentatividade = (s.revenue / (faturamentoTotalPeriodo || 1)) * 100;

      if (pct <= 80) { s.curva = 'A'; }
      else if (pct <= 95) { s.curva = 'B'; }
      else { s.curva = 'C'; }
    });

    let displaySkus = allSkus;
    
    if (searchSku.trim()) displaySkus = displaySkus.filter(s => s.sku.toLowerCase().includes(searchSku.toLowerCase()));
    if (selectedBrand !== 'TODAS') displaySkus = displaySkus.filter(s => s.marca === selectedBrand);

    let faturamentoTotalFiltrado = 0;
    let lucroTotalFiltrado = 0;
    let countAFiltrado = 0, countBFiltrado = 0, countCFiltrado = 0;

    displaySkus.forEach(s => {
      faturamentoTotalFiltrado += s.revenue;
      lucroTotalFiltrado += s.lucroTotal;
      if (s.curva === 'A') countAFiltrado++;
      if (s.curva === 'B') countBFiltrado++;
      if (s.curva === 'C') countCFiltrado++;
    });

    const ticketMedio = filteredSales.length > 0 ? faturamentoTotalPeriodo / filteredSales.length : 0;
    const valorEstimadoCancelado = cancelados.length * ticketMedio;

    return { 
      abcCurve: displaySkus, 
      kpis: { 
        faturamentoTotal: faturamentoTotalFiltrado, 
        lucroTotal: lucroTotalFiltrado, 
        countA: countAFiltrado, 
        countB: countBFiltrado, 
        countC: countCFiltrado, 
        ticketMedio, 
        totalCancelados: cancelados.length, 
        valorEstimadoCancelado 
      }
    };
  }, [filteredSales, products, cancelados, searchSku, selectedBrand]);

  // 3. Processamento de Marcas
  const brandStats = useMemo(() => {
    const brands: Record<string, any> = {};
    abcCurve.forEach(s => {
      const b = s.marca;
      if (!brands[b]) brands[b] = { marca: b, revenue: 0, lucro: 0, qtd: 0 };
      brands[b].revenue += s.revenue;
      brands[b].lucro += s.lucroTotal;
      brands[b].qtd += s.qtd;
    });
    return Object.values(brands).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [abcCurve]);

  // 4. Lógica para a Tabela de Pedidos
  const enrichedOrders = useMemo(() => {
    return filteredSales.map((s: any) => {
      const prod = products.find((p: any) => p.sku === s.sku) || { preco_custo: 0, custo_embalagem: 0 };
      const custoCMV = ((Number(prod.preco_custo) || 0) + (Number(prod.custo_embalagem) || 0)) * (Number(s.quantidade) || 1);
      const flexOrder = flexData.find((f: any) => f.id_pedido === s.id_pedido);
      const custoFlex = flexOrder ? (Number(flexOrder.valor_frete) || 0) : 0;
      
      const repasse = Number(s.repasse_liquido) || 0; 
      const ganhoLiquido = repasse - custoCMV - custoFlex;
      
      return { ...s, custoCMV, custoFlex, ganhoLiquido, repasse };
    });
  }, [filteredSales, products, flexData]);

  const displayOrders = useMemo(() => {
    let result = enrichedOrders;

    // NOVO: Filtro para mostrar apenas pedidos com CMV zerado
    if (cmvFilter === 'SEM_CMV') {
      result = result.filter((s: any) => !s.custoCMV || s.custoCMV === 0);
    }

    if (searchOrderId.trim()) {
      result = result.filter((s: any) => s.id_pedido && String(s.id_pedido).includes(searchOrderId.trim()));
    }
    
    if (sortOrder === 'MAIOR_LIQUIDEZ') {
      result = [...result].sort((a: any, b: any) => b.ganhoLiquido - a.ganhoLiquido);
    } else if (sortOrder === 'MENOR_LIQUIDEZ') {
      result = [...result].sort((a: any, b: any) => a.ganhoLiquido - b.ganhoLiquido);
    }
    return result;
  }, [enrichedOrders, searchOrderId, sortOrder, cmvFilter]);

  const totalPagesOrders = Math.ceil(displayOrders.length / itemsPerPageOrders) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPageOrders - 1) * itemsPerPageOrders;
    return displayOrders.slice(start, start + itemsPerPageOrders);
  }, [displayOrders, currentPageOrders]);

  return (
    <div className="space-y-6">
      {/* Header e Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Inteligência de Produtos</h2>
          <p className="text-xs text-slate-400 mt-1">Análise de Curva ABC, Desempenho por Marca e Impacto de Cancelamentos</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
            <i className="fa-solid fa-magnifying-glass text-slate-400 pl-2 text-xs"></i>
            <input 
              type="text" 
              placeholder="Pesquisar SKU..." 
              value={searchSku} 
              onChange={e => setSearchSku(e.target.value)} 
              className="bg-transparent text-slate-300 font-bold text-xs focus:outline-none pr-2 w-full sm:w-32" 
            />
          </div>

          <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
            <i className="fa-solid fa-tag text-purple-400 pl-2 text-xs"></i>
            <select 
              value={selectedBrand} 
              onChange={(e) => setSelectedBrand(e.target.value)} 
              className="bg-transparent text-purple-300 font-bold text-xs focus:outline-none pr-1 cursor-pointer w-full sm:w-32"
            >
              {availableBrands.map(brand => (
                <option key={brand} value={brand} className="bg-slate-900 text-slate-200">{brand}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
            <i className="fa-regular fa-calendar text-indigo-400 pl-2 text-xs"></i>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent text-indigo-300 font-bold text-xs focus:outline-none pr-1 cursor-pointer w-full sm:w-auto">
              <option value="TUDO" className="bg-slate-900 text-slate-200">Todo o Histórico</option>
              <option value="HOJE" className="bg-slate-900 text-slate-200">Hoje</option>
              <option value="SEMANA" className="bg-slate-900 text-slate-200">Últimos 7 dias</option>
              <option value="QUINZENA" className="bg-slate-900 text-slate-200">Últimos 15 dias</option>
              <option value="MES" className="bg-slate-900 text-slate-200">Últimos 30 dias</option>
              <option value="PERSONALIZADO" className="bg-slate-900 text-slate-200">Personalizado</option>
            </select>
          </div>
          {dateFilter === 'PERSONALIZADO' && (
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
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
          <p className="text-[10px] text-emerald-400 font-bold mt-1">Lucro: R$ {kpis.lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
            <i className="fa-solid fa-circle-exclamation text-rose-500/50" title="Estimativa: Qtd Cancelados Globais x Ticket Médio Global"></i>
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
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {brandStats.map((brand, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-300 truncate max-w-[50%]">{brand.marca}</span>
                    <div className="text-right">
                      <span className="block text-xs font-black text-white">R$ {brand.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="block text-[9px] text-emerald-400 font-bold">Lucro: R$ {brand.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-indigo-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.min((brand.revenue / (kpis.faturamentoTotal || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {brandStats.length === 0 && <p className="text-xs text-slate-500 text-center py-4">Sem dados para os filtros selecionados.</p>}
            </div>
          </div>
        </div>

        {/* Painel Principal: Tabela Curva ABC */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800">
               <h3 className="font-bold text-white text-base">Relatório de Curva ABC (Classificação de SKUs)</h3>
            </div>
            <div className="overflow-x-auto max-h-[530px]">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">Curva</th>
                    <th className="py-3 px-4">SKU / Marca</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-center">Un. Vendidas</th>
                    <th className="py-3 px-4 text-right">Fat. Bruto</th>
                    <th className="py-3 px-4 text-right text-emerald-400">Liquidez (Lucro)</th>
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
                      <td className={`py-3 px-4 text-right font-black ${sku.lucroTotal < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        R$ {sku.lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">{sku.pctRepresentatividade.toFixed(2)}%</td>
                    </tr>
                  ))}
                  {abcCurve.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500 font-bold">Nenhum produto encontrado com os filtros atuais.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Nova Seção Adicionada: Fragmentação por Pedido */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <h3 className="font-bold text-white text-base">Fragmentação por Pedido (Ganho Real)</h3>
          
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            {/* NOVO: Filtro para localizar Pedidos Sem CMV */}
            <select 
              value={cmvFilter} 
              onChange={(e) => setCmvFilter(e.target.value)}
              className="p-2.5 bg-slate-950 border border-amber-700/50 text-amber-400 rounded-xl text-xs outline-none focus:border-amber-500 cursor-pointer w-full sm:w-auto font-bold"
            >
              <option value="TODOS" className="bg-slate-900 text-slate-200">Todos os Pedidos</option>
              <option value="SEM_CMV" className="bg-slate-900 text-rose-400">Aviso: Sem Custo (CMV 0)</option>
            </select>

            <input 
              type="text" 
              placeholder="Buscar ID Pedido..." 
              value={searchOrderId}
              onChange={(e) => setSearchOrderId(e.target.value)}
              className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-indigo-500 w-full sm:w-48"
            />
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value)}
              className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-indigo-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="DEFAULT" className="bg-slate-900 text-slate-200">Ordem Padrão (Data)</option>
              <option value="MAIOR_LIQUIDEZ" className="bg-slate-900 text-slate-200">Maior Liquidez (Lucro)</option>
              <option value="MENOR_LIQUIDEZ" className="bg-slate-900 text-slate-200">Menor Liquidez (Prejuízo)</option>
            </select>
          </div>
        </div>

        <table className="w-full text-left text-xs text-slate-200">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
            <tr>
              <th className="py-3 pl-3">Data</th>
              <th>ID Pedido</th>
              <th>Canal</th>
              <th>SKU (Qtd)</th>
              <th>PDV</th>
              <th>Repasse</th>
              <th>CMV</th>
              <th className="text-rose-300">FLEX</th>
              <th className="text-emerald-400 font-extrabold pr-3 text-right">Líquido Real</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {paginatedOrders.map((s: any, i: number) => (
              <tr key={i} className="hover:bg-slate-800/40 transition">
                <td className="py-2.5 pl-3 text-slate-400">{s.data_faturamento ? s.data_faturamento.split('-').reverse().join('/') : '-'}</td>
                <td className="py-2.5 font-bold text-indigo-400">{s.id_pedido}</td>
                <td className="py-2.5">{s.canal}</td>
                <td className="py-2.5 font-mono text-[10px]">{s.sku} (x{s.quantidade})</td>
                <td className="py-2.5">R$ {(s.preco_venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2.5">R$ {(s.repasse || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`py-2.5 ${!s.custoCMV || s.custoCMV === 0 ? 'text-rose-400 font-bold bg-rose-950/20' : 'text-amber-300'}`}>
                  - R$ {(s.custoCMV || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 text-rose-300">- R$ {(s.custoFlex || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`py-2.5 pr-3 text-right font-extrabold ${(s.ganhoLiquido || 0) < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                  R$ {(s.ganhoLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {paginatedOrders.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-slate-500 font-bold">Nenhum pedido encontrado.</td></tr>
            )}
          </tbody>
        </table>

        {/* Controles de Paginação */}
        {totalPagesOrders > 1 && (
          <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">
              Página {currentPageOrders} de {totalPagesOrders} ({displayOrders.length} pedidos)
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPageOrders(p => Math.max(1, p - 1))} 
                disabled={currentPageOrders === 1} 
                className="px-4 py-2 bg-slate-950 border border-slate-700 hover:bg-slate-800 rounded-lg text-slate-300 disabled:opacity-40 font-bold transition"
              >
                Anterior
              </button>
              <button 
                onClick={() => setCurrentPageOrders(p => Math.min(totalPagesOrders, p + 1))} 
                disabled={currentPageOrders === totalPagesOrders} 
                className="px-4 py-2 bg-slate-950 border border-slate-700 hover:bg-slate-800 rounded-lg text-slate-300 disabled:opacity-40 font-bold transition"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}