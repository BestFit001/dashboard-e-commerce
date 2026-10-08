'use client';
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function PainelExecutivoPage() {
  const context = useAppContext();
  const canais = context?.canais || [];
  const sales = context?.sales || [];
  const adsData = context?.adsData || [];
  const flexData = context?.flexData || [];
  const products = context?.products || [];
  const goals = context?.goals || [];
  const channelRules = context?.channelRules || [];
  const cancelados = context?.cancelados || [];
  const users = context?.users || [];
  const addLog = context?.addLog || (() => {});

  const currentMonthDefault = new Date().toISOString().slice(0, 7);
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('TODOS');

  const isChannelFisico = (canalName: string) => {
    const nome = String(canalName || '').toLowerCase();
    return nome.includes('clube') || nome.includes('loja') || nome.includes('paineiras') || nome.includes('hebraica');
  };

  const parseCurrency = (val: any) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let s = String(val).trim().replace('R$', '').replace('R', '').trim();
    if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const num = Number(s);
    return isNaN(num) ? 0 : num;
  };

  const currentRefMonth = useMemo(() => {
    return currentMonthDefault;
  }, [currentMonthDefault]);

  const activeCancelados = useMemo(() => {
    if (!cancelados) return [];
    return cancelados.filter((c: any) => c.mes_referencia === currentRefMonth);
  }, [cancelados, currentRefMonth]);

  const enrichedSales = useMemo(() => {
    return (sales || []).filter((s: any) => {
      if (selectedChannelFilter !== 'TODOS' && s.canal !== selectedChannelFilter) return false;
      return true;
    }).map((s: any) => {
      let custoCMV = 0;
      if (isChannelFisico(s.canal) && s.cmv_clube !== undefined && s.cmv_clube !== null) {
        custoCMV = parseCurrency(s.cmv_clube);
      } else {
        const prod = products.find((p: any) => p.sku === s.sku) || { preco_custo: 0, custo_embalagem: 0 };
        const qtd = parseCurrency(s.quantidade) || 1;
        custoCMV = (parseCurrency(prod.preco_custo) + parseCurrency(prod.custo_embalagem)) * qtd;
      }

      const flexOrder = flexData.find((f: any) => f.id_pedido === s.id_pedido);
      const custoFlex = flexOrder ? parseCurrency(flexOrder.valor_frete) : 0;
      const precoVenda = parseCurrency(s.preco_venda);
      let repasseLiquido = parseCurrency(s.repasse_liquido);
      if (repasseLiquido <= 0 || repasseLiquido > precoVenda * 2) repasseLiquido = precoVenda;

      const ganhoBruto = repasseLiquido - custoCMV;
      const ganhoLiquido = ganhoBruto - custoFlex;

      return { ...s, preco_venda: precoVenda, custoCMV, custoFlex, ganhoLiquido, repasse_liquido: repasseLiquido };
    });
  }, [sales, selectedChannelFilter, products, flexData]);

  const channelAnalytics = useMemo(() => {
    const activeChannels = Array.from(new Set([...canais, ...channelRules.map((r: any) => r.canal)]));
    
    return activeChannels.map(channelName => {
      const chSales = enrichedSales.filter((s: any) => s.canal === channelName);
      const ruleObj = channelRules.find((r: any) => r.canal === channelName) || {};
      const goalObj = goals.find((g: any) => g.canal === channelName && g.mes_referencia === currentRefMonth) 
                   || goals.find((g: any) => g.canal === channelName) 
                   || { meta_valor: 0, meta_margem_bruta: 45, meta_margem_liq: 15, responsavel: ruleObj.responsavel || 'Equipe Best Fit' };

      const cancelamentosMes = activeCancelados
        .filter((c: any) => String(c.canal).toLowerCase() === String(channelName).toLowerCase())
        .reduce((sum: number, c: any) => sum + parseCurrency(c.valor), 0);

      const faturadoBrutoPuro = chSales.reduce((sum: number, s: any) => sum + s.preco_venda, 0);
      const faturadoComRedutor = Math.max(0, faturadoBrutoPuro - cancelamentosMes);
      const repasseTotal = chSales.reduce((sum: number, s: any) => sum + s.repasse_liquido, 0);
      
      const canalAds = adsData
        .filter((a: any) => a.canal === channelName && a.mes_referencia === currentRefMonth)
        .reduce((sum: number, a: any) => sum + parseCurrency(a.custo_ads), 0);

      const cmvCanal = chSales.reduce((sum: number, s: any) => sum + s.custoCMV, 0);
      const flexCanal = chSales.reduce((sum: number, s: any) => sum + s.custoFlex, 0);

      const lucroLiquidoFinal = repasseTotal - cmvCanal - flexCanal - canalAds;
      const metaBase = parseCurrency(goalObj.meta_valor);
      
      const margemBrutaAtingida = faturadoBrutoPuro > 0 ? (repasseTotal / faturadoBrutoPuro) * 100 : 0;
      const margemLiqAtingida = faturadoBrutoPuro > 0 ? (lucroLiquidoFinal / faturadoBrutoPuro) * 100 : 0;

      const metaMargemBruta = parseCurrency(goalObj.meta_margem_bruta || 45);
      const metaMargemLiq = parseCurrency(goalObj.meta_margem_liq || 15);

      return {
        canal: channelName,
        responsavel: ruleObj.responsavel || goalObj.responsavel || 'Equipe Best Fit',
        faturadoComRedutor,
        metaValor: metaBase,
        metaMargemBruta,
        margemBrutaAtingida,
        metaMargemLiq,
        margemLiqAtingida,
        isFisico: isChannelFisico(channelName)
      };
    });
  }, [enrichedSales, goals, adsData, channelRules, currentRefMonth, canais, activeCancelados]);

  const ecommerceChannels = channelAnalytics.filter(c => !c.isFisico);
  const physicalChannels = channelAnalytics.filter(c => c.isFisico);

  const renderSeta = (atingido: number, meta: number) => {
    if (atingido >= meta) {
      return <span className="text-emerald-400 font-black inline-flex items-center gap-1"><i className="fa-solid fa-arrow-trend-up"></i> {atingido.toFixed(1)}%</span>;
    } else if (atingido >= meta * 0.85) {
      return <span className="text-amber-400 font-black inline-flex items-center gap-1"><i className="fa-solid fa-arrow-right"></i> {atingido.toFixed(1)}%</span>;
    } else {
      return <span className="text-rose-400 font-black inline-flex items-center gap-1"><i className="fa-solid fa-arrow-trend-down"></i> {atingido.toFixed(1)}%</span>;
    }
  };

  const handleEnviarEmailAlerta = () => {
    const emailsCadastrados = users && users.length > 0 
      ? users.map((u: any) => u.username).filter(Boolean).join(';') 
      : "gisele@usebestfit.com.br";
    
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const assunto = encodeURIComponent(`📊 Painel Executivo - Margens e Metas (${dataHoje})`);
    let corpoTexto = `Olá, tudo bem? Segue o resumo do Painel Executivo de Margens do dia ${dataHoje}.\n\nAcesse o sistema para conferir a visão completa: https://dashboard-e-commerce-nine.vercel.app/`;

    window.location.href = `mailto:${emailsCadastrados}?subject=${assunto}&body=${encodeURIComponent(corpoTexto)}`;
    addLog('E-mail do Painel Executivo disparado para a equipe.', 'success');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Painel Executivo de Margens & Metas</h2>
          <p className="text-[11px] text-slate-400">Visão consolidada de performance, metas de margem bruta e margem líquida.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleEnviarEmailAlerta} 
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 transition text-white font-extrabold text-xs rounded-lg shadow-md flex items-center gap-2"
          >
            <i className="fa-solid fa-envelope"></i> Enviar por E-mail ao Time
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3 px-5">Canal / Responsável</th>
                <th className="py-3 px-4 text-right">Faturamento</th>
                <th className="py-3 px-4 text-center">Meta Margem Bruta %</th>
                <th className="py-3 px-4 text-center">Margem Bruta Atingida %</th>
                <th className="py-3 px-4 text-center">Meta Margem Líq. %</th>
                <th className="py-3 px-5 text-center">Margem Líq. Atingida %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-medium">
              
              {/* E-COMMERCE */}
              <tr className="bg-slate-950/90 font-black text-white text-xs border-y border-slate-800">
                <td colSpan={6} className="py-2.5 px-5 text-indigo-400 flex items-center gap-2">
                  <i className="fa-solid fa-globe"></i> E-COMMERCE
                </td>
              </tr>
              {ecommerceChannels.map((item: any, idx: number) => (
                <tr key={item.canal} className={`${idx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-950/30'} hover:bg-slate-800/40 transition`}>
                  <td className="py-2.5 px-5">
                    <span className="font-bold text-white text-xs">{item.canal}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({item.responsavel})</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-white">R$ {item.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-4 text-center font-mono text-slate-300">{item.metaMargemBruta.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-center">{renderSeta(item.margemBrutaAtingida, item.metaMargemBruta)}</td>
                  <td className="py-2.5 px-4 text-center font-mono text-slate-300">{item.metaMargemLiq.toFixed(1)}%</td>
                  <td className="py-2.5 px-5 text-center">{renderSeta(item.margemLiqAtingida, item.metaMargemLiq)}</td>
                </tr>
              ))}

              {/* LOJAS FÍSICAS */}
              <tr className="bg-slate-950/90 font-black text-white text-xs border-y border-slate-800">
                <td colSpan={6} className="py-2.5 px-5 text-emerald-400 flex items-center gap-2">
                  <i className="fa-solid fa-store"></i> LOJAS FÍSICAS
                </td>
              </tr>
              {physicalChannels.map((item: any, idx: number) => (
                <tr key={item.canal} className={`${idx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-950/30'} hover:bg-slate-800/40 transition`}>
                  <td className="py-2.5 px-5">
                    <span className="font-bold text-white text-xs">{item.canal}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({item.responsavel})</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-white">R$ {item.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-2.5 px-4 text-center font-mono text-slate-300">{item.metaMargemBruta.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-center">{renderSeta(item.margemBrutaAtingida, item.metaMargemBruta)}</td>
                  <td className="py-2.5 px-4 text-center font-mono text-slate-300">{item.metaMargemLiq.toFixed(1)}%</td>
                  <td className="py-2.5 px-5 text-center">{renderSeta(item.margemLiqAtingida, item.metaMargemLiq)}</td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}