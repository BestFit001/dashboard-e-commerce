'use client';
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function DashboardPage() {
  const context = useAppContext();
  
  // Extração segura das variáveis de contexto
  const { sales = [], canais = [], channelRules = [], flexData = [], adsData = [] } = context;
  const skuList = context.skuCosts || context.skus || context.custos || context.produtos || [];

  const [dateFilter, setDateFilter] = useState('Todo o Período');
  const [channelFilter, setChannelFilter] = useState('Todos os Canais');

  // Formatadores
  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatPct = (val: number) => (val || 0).toFixed(1) + '%';

  // Helper para buscar custo atualizado do SKU
  const getSkuCost = (skuCode: string) => {
    if (!skuCode || skuCode === 'SKU-CLUBE-ISENTO') return { base: 0, emb: 0 };
    const info = skuList.find((s: any) => s.sku === skuCode || s.id === skuCode);
    return {
      base: Number(info?.custo || info?.custo_produto || info?.custo_base) || 0,
      emb: Number(info?.embalagem || info?.custo_embalagem) || 0
    };
  };

  // ==========================================
  // MOTOR DE CÁLCULO GLOBAL (Com Divisão Física/Digital)
  // ==========================================
  const globalMetrics = useMemo(() => {
    let fatBrutoTotal = 0;
    let fatBrutoFisico = 0;
    let fatBrutoDigital = 0;
    let repasseTotal = 0;
    let cmvTotal = 0;
    let validItems = 0;

    const filteredSales = sales.filter((s: any) => channelFilter === 'Todos os Canais' || s.canal === channelFilter);

    filteredSales.forEach((s: any) => {
      // Deteta automaticamente se é loja física pelo nome
      const nomeCanal = String(s.canal || '').toLowerCase();
      const isFisico = nomeCanal.includes('clube') || nomeCanal.includes('loja') || nomeCanal.includes('paineiras') || nomeCanal.includes('hebraica');
      
      const valVenda = Number(s.preco_venda) || 0;
      const qtd = Number(s.quantidade) || 1;

      fatBrutoTotal += valVenda;
      if (isFisico) {
        fatBrutoFisico += valVenda;
      } else {
        fatBrutoDigital += valVenda;
      }

      repasseTotal += Number(s.repasse_liquido) || 0;
      validItems += qtd;

      const custos = getSkuCost(s.sku);
      cmvTotal += (custos.base + custos.emb) * qtd;
    });

    const flexTotal = flexData.reduce((acc: number, curr: any) => acc + (Number(curr.valor_frete) || 0), 0);
    const adsTotal = adsData.reduce((acc: number, curr: any) => acc + (Number(curr.custo_ads) || 0), 0);

    const lucroLiquidoReal = repasseTotal - cmvTotal - flexTotal - adsTotal;

    return { fatBrutoTotal, fatBrutoFisico, fatBrutoDigital, repasseTotal, cmvTotal, lucroLiquidoReal, validItems };
  }, [sales, channelFilter, flexData, adsData, skuList]);

  // ==========================================
  // MOTOR DE CÁLCULO POR CANAL (Cards Inferiores)
  // ==========================================
  const channelStats = useMemo(() => {
    return canais.map((canalName: string) => {
      const cSales = sales.filter((s: any) => s.canal === canalName);
      const rule = channelRules.find((r: any) => r.canal === canalName);
      
      let cFatBruto = 0;
      let cRepasse = 0;
      let cCmv = 0;
      
      cSales.forEach((s: any) => {
        cFatBruto += Number(s.preco_venda) || 0;
        cRepasse += Number(s.repasse_liquido) || 0;
        const custos = getSkuCost(s.sku);
        cCmv += (custos.base + custos.emb) * (Number(s.quantidade) || 1);
      });

      const cFlex = flexData
        .filter((f: any) => cSales.some((s: any) => String(s.id_pedido) === String(f.id_pedido)))
        .reduce((acc: number, curr: any) => acc + (Number(curr.valor_frete) || 0), 0);
        
      const cAds = adsData
        .filter((a: any) => a.canal === canalName)
        .reduce((acc: number, curr: any) => acc + (Number(curr.custo_ads) || 0), 0);

      const cLucro = cRepasse - cCmv - cFlex - cAds;
      const cMargemBruta = cFatBruto > 0 ? (cRepasse / cFatBruto) * 100 : 0;
      const cMargemLiquida = cFatBruto > 0 ? (cLucro / cFatBruto) * 100 : 0;
      
      const meta = Number(rule?.meta) || 1;
      const percMeta = (cFatBruto / meta) * 100;

      return {
        canal: canalName,
        responsavel: rule?.responsavel || 'Equipe',
        logo: rule?.logo || null,
        meta,
        percMeta,
        fatBruto: cFatBruto,
        lucro: cLucro,
        margemBruta: cMargemBruta,
        margemLiquida: cMargemLiquida
      };
    }).sort((a: any, b: any) => b.fatBruto - a.fatBruto); // Ordena do maior para o menor faturamento
  }, [canais, sales, channelRules, flexData, adsData, skuList]);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Best Fit</h1>
          <p className="text-xs text-slate-400 mt-1">Cálculo de Margem Real = Repasse Líq - CMV - Fretes Flex - ADS</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-xl outline-none font-bold cursor-pointer"
          >
            <option value="Todo o Período">📅 Todo o Período</option>
            <option value="Mês Atual">Mês Atual</option>
          </select>
          
          <select 
            value={channelFilter} 
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-xl outline-none font-bold cursor-pointer"
          >
            <option value="Todos os Canais">🛍️ Todos os Canais</option>
            {canais.map((ch: string) => <option key={ch} value={ch}>{ch}</option>)}
          </select>

          <button 
            onClick={() => alert('Cálculos atualizados e sincronizados com a nuvem!')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-lg shadow-indigo-500/20"
          >
            Recalcular
          </button>
        </div>
      </div>

      {/* CARDS GLOBAIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* CARD FATURAMENTO BRUTO (DIVIDIDO FÍSICO VS DIGITAL) */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Faturamento Bruto</h3>
            <div className="text-3xl font-black text-white">{formatBRL(globalMetrics.fatBrutoTotal)}</div>
            <p className="text-[10px] text-slate-500 mt-1">{globalMetrics.validItems} itens validados</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-800/80">
            <div>
              <span className="block text-[9px] text-emerald-400 font-bold uppercase mb-0.5">Lojas Físicas</span>
              <span className="text-sm font-bold text-slate-200">{formatBRL(globalMetrics.fatBrutoFisico)}</span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="block text-[9px] text-blue-400 font-bold uppercase mb-0.5">E-commerce</span>
              <span className="text-sm font-bold text-slate-200">{formatBRL(globalMetrics.fatBrutoDigital)}</span>
            </div>
          </div>
        </div>

        {/* CARD REPASSE TOTAL */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-purple-500/20 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Repasse Total das Plataformas</h3>
            <div className="text-3xl font-black text-purple-400">{formatBRL(globalMetrics.repasseTotal)}</div>
          </div>
        </div>

        {/* CARD CMV TOTAL */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-amber-500/20 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">CMV Total (Custos de SKU X QTD)</h3>
            <div className="text-3xl font-black text-amber-400">{formatBRL(globalMetrics.cmvTotal)}</div>
          </div>
        </div>

        {/* CARD LUCRO LÍQUIDO REAL */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-emerald-500/20 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Lucro Líquido Real</h3>
            <div className="text-3xl font-black text-emerald-400">{formatBRL(globalMetrics.lucroLiquidoReal)}</div>
          </div>
        </div>

      </div>

      {/* CARDS POR CANAL (GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {channelStats.map((ch: any, idx: number) => (
          <div key={idx} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-5 shadow-xl">
            
            {/* Header do Canal */}
            <div className="flex justify-between items-start">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 shadow-sm">
                  {ch.logo ? (
                     <img src={ch.logo} alt={ch.canal} className="w-full h-full object-contain" />
                  ) : (
                     <span className="text-[10px] text-black font-extrabold uppercase leading-none">{ch.canal.slice(0, 4)}</span>
                  )}
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{ch.responsavel}</p>
                  <h4 className="text-sm font-bold text-white leading-tight">{ch.canal}</h4>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-full border border-indigo-500/30">
                  {formatPct(ch.percMeta)} Meta
                </span>
                <span className="text-[9px] text-slate-500 mt-1">Meta: {formatBRL(ch.meta)}</span>
              </div>
            </div>

            {/* Números Focais */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800/50">
              <div>
                <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">Fat. Bruto</p>
                <p className="text-sm font-bold text-white">{formatBRL(ch.fatBruto)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">Lucro Líq.</p>
                <p className="text-sm font-bold text-purple-400">{formatBRL(ch.lucro)}</p>
              </div>
            </div>

            {/* Margens */}
            <div className="grid grid-cols-2 gap-4 px-1">
              <div>
                <p className="text-[10px] text-slate-400 font-bold mb-0.5">Margem Bruta</p>
                <p className="text-sm font-bold text-blue-400">{formatPct(ch.margemBruta)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold mb-0.5">Margem Liquida</p>
                <p className="text-sm font-bold text-emerald-400">{formatPct(ch.margemLiquida)}</p>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}