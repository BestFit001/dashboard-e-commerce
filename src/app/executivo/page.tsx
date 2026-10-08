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
  const previousMonthDefault = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  }, []);

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

  const currentRefMonth = currentMonthDefault;

  const activeCancelados = useMemo(() => {
    if (!cancelados) return [];
    return cancelados.filter((c: any) => c.mes_referencia === currentRefMonth);
  }, [cancelados, currentRefMonth]);

  const enrichedSales = useMemo(() => {
    return (sales || []).filter((s: any) => {
      if (s.mes_referencia !== currentRefMonth) return false;
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

      const flexOrder = flexData.find((f: any) => f.id_pedido === s.id_pedido && f.mes_referencia === currentRefMonth);
      const custoFlex = flexOrder ? parseCurrency(flexOrder.valor_frete) : 0;
      const precoVenda = parseCurrency(s.preco_venda);
      let repasseLiquido = parseCurrency(s.repasse_liquido);
      if (repasseLiquido <= 0 || repasseLiquido > precoVenda * 2) repasseLiquido = precoVenda;

      const ganhoBruto = repasseLiquido - custoCMV;
      const ganhoLiquido = ganhoBruto - custoFlex;

      return { ...s, preco_venda: precoVenda, custoCMV, custoFlex, ganhoLiquido, repasse_liquido: repasseLiquido };
    });
  }, [sales, selectedChannelFilter, products, flexData, currentRefMonth]);

  const previousMonthSales = useMemo(() => {
    return (sales || []).filter((s: any) => s.mes_referencia === previousMonthDefault);
  }, [sales, previousMonthDefault]);

  const { targetDateStr } = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { targetDateStr: `${yyyy}-${mm}-${dd}` };
  }, []);

  const channelAnalytics = useMemo(() => {
    const activeChannels = Array.from(new Set([...canais, ...channelRules.map((r: any) => r.canal)]));
    
    const [refAnoStr, refMesStr] = currentRefMonth.split('-');
    const refAno = parseInt(refAnoStr, 10);
    const refMes = parseInt(refMesStr, 10) - 1;
    const now = new Date();
    const isCurrentMonth = (now.getFullYear() === refAno && now.getMonth() === refMes);
    const totalDiasMes = new Date(refAno, refMes + 1, 0).getDate();
    let diasPassados = isCurrentMonth ? Math.max(1, now.getDate()) : totalDiasMes;

    return activeChannels.map(channelName => {
      const chSales = enrichedSales.filter((s: any) => s.canal === channelName);
      const prevChSales = previousMonthSales.filter((s: any) => s.canal === channelName);
      const fisico = isChannelFisico(channelName);

      const vendasDoDia = chSales
        .filter((s: any) => s.data_faturamento === targetDateStr)
        .reduce((sum: number, s: any) => sum + s.preco_venda, 0);

      const ruleObj = channelRules.find((r: any) => r.canal === channelName) || {};
      const defaultMetaBruta = fisico ? 56.0 : 48.0;
      const goalObj = goals.find((g: any) => g.canal === channelName && g.mes_referencia === currentRefMonth) 
                   || goals.find((g: any) => g.canal === channelName) 
                   || { meta_valor: 0, meta_margem_bruta: defaultMetaBruta, meta_margem_liq: 15, responsavel: ruleObj.responsavel || 'Equipe' };

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
      
      const projecaoFaturamento = isCurrentMonth ? (faturadoComRedutor / diasPassados) * totalDiasMes : faturadoComRedutor;
      const projecaoVsMeta = metaBase > 0 ? ((projecaoFaturamento / metaBase) - 1) * 100 : 0;

      const faturadoMesAnterior = prevChSales.reduce((sum: number, s: any) => sum + parseCurrency(s.preco_venda), 0);
      const projVsMesAnterior = faturadoMesAnterior > 0 ? ((faturadoComRedutor / faturadoMesAnterior) - 1) * 100 : 0;

      const margemBrutaAtingida = faturadoBrutoPuro > 0 ? (repasseTotal / faturadoBrutoPuro) * 100 : 0;
      const margemLiqAtingida = faturadoBrutoPuro > 0 ? (lucroLiquidoFinal / faturadoBrutoPuro) * 100 : 0;

      const metaMargemBruta = parseCurrency(goalObj.meta_margem_bruta || defaultMetaBruta);
      const metaMargemLiq = parseCurrency(goalObj.meta_margem_liq || 15);

      const diffMargemBruta = margemBrutaAtingida - metaMargemBruta;
      const diffMargemLiq = margemLiqAtingida - metaMargemLiq;

      return {
        canal: channelName,
        responsavel: ruleObj.responsavel || goalObj.responsavel || 'Equipe',
        vendasDoDia,
        faturadoComRedutor,
        metaValor: metaBase,
        projecaoFaturamento,
        projecaoVsMeta,
        faturadoMesAnterior,
        projVsMesAnterior,
        metaMargemBruta,
        diffMargemBruta,
        metaMargemLiq,
        diffMargemLiq,
        isFisico: fisico
      };
    });
  }, [enrichedSales, previousMonthSales, goals, adsData, channelRules, currentRefMonth, canais, activeCancelados, targetDateStr, flexData]);

  const ecommerceChannels = channelAnalytics.filter(c => !c.isFisico);
  const physicalChannels = channelAnalytics.filter(c => c.isFisico);

  const sumTotals = (channels: any[]) => {
    return channels.reduce((acc, curr) => ({
      vendasDoDia: acc.vendasDoDia + curr.vendasDoDia,
      faturadoComRedutor: acc.faturadoComRedutor + curr.faturadoComRedutor,
      metaValor: acc.metaValor + curr.metaValor,
      projecaoFaturamento: acc.projecaoFaturamento + curr.projecaoFaturamento,
      faturadoMesAnterior: acc.faturadoMesAnterior + curr.faturadoMesAnterior,
    }), { vendasDoDia: 0, faturadoComRedutor: 0, metaValor: 0, projecaoFaturamento: 0, faturadoMesAnterior: 0 });
  };

  const totalEcom = sumTotals(ecommerceChannels);
  const totalFisico = sumTotals(physicalChannels);
  const totalGeral = {
    vendasDoDia: totalEcom.vendasDoDia + totalFisico.vendasDoDia,
    faturadoComRedutor: totalEcom.faturadoComRedutor + totalFisico.faturadoComRedutor,
    metaValor: totalEcom.metaValor + totalFisico.metaValor,
    projecaoFaturamento: totalEcom.projecaoFaturamento + totalFisico.projecaoFaturamento,
    faturadoMesAnterior: totalEcom.faturadoMesAnterior + totalFisico.faturadoMesAnterior,
  };

  const renderSetaVariacao = (val: number) => {
    if (val >= 0) {
      return <span className="text-emerald-400 font-bold inline-flex items-center gap-0.5"><i className="fa-solid fa-caret-up"></i> +{val.toFixed(1)}%</span>;
    } else {
      return <span className="text-rose-400 font-bold inline-flex items-center gap-0.5"><i className="fa-solid fa-caret-down"></i> {val.toFixed(1)}%</span>;
    }
  };

  const renderSetaDiferencaMargem = (diff: number) => {
    if (diff >= 0) {
      return <span className="text-emerald-400 font-bold inline-flex items-center gap-0.5"><i className="fa-solid fa-caret-up"></i> +{diff.toFixed(1)}%</span>;
    } else {
      return <span className="text-rose-400 font-bold inline-flex items-center gap-0.5"><i className="fa-solid fa-caret-down"></i> {diff.toFixed(1)}%</span>;
    }
  };

  const handleEnviarEmailAlerta = () => {
    const emailsCadastrados = users && users.length > 0 ? users.map((u: any) => u.username).filter(Boolean).join(';') : "gisele@usebestfit.com.br";
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const assunto = encodeURIComponent(`📊 Painel Executivo - Margens e Metas (${dataHoje})`);
    window.location.href = `mailto:${emailsCadastrados}?subject=${assunto}&body=${encodeURIComponent(`Olá, segue o Painel Executivo consolidado do dia ${dataHoje}.`)}`;
    addLog('E-mail do Painel Executivo disparado.', 'success');
  };

  return (
    <div className="space-y-2 max-w-full mx-auto pb-6 px-1 text-[10px]">
      <div className="flex justify-between items-center bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
        <span className="font-bold text-slate-300">Data de Referência: <span className="text-indigo-400 font-mono">{new Date().toLocaleDateString('pt-BR')}</span></span>
        <button onClick={handleEnviarEmailAlerta} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded shadow transition flex items-center gap-1">
          <i className="fa-solid fa-envelope"></i> Enviar por E-mail
        </button>
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-2xl p-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-200 border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 tracking-tight">
              <tr>
                <th className="py-2 px-2 border-r border-slate-800 whitespace-nowrap">Canal / Resp.</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Vendas Dia</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Total Mês</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Meta Mês</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Projeção</th>
                <th className="py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap">Proj x Meta</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Mês Ant.</th>
                <th className="py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap">Proj x Ant.</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Meta Bruta</th>
                <th className="py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap">Bruta x Ating.</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Meta Líq.</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Líq. x Ating.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-medium">
              
              {/* E-COMMERCE */}
              <tr className="bg-slate-950 font-black text-white text-[10px]">
                <td colSpan={12} className="py-1.5 px-2.5 text-indigo-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-globe"></i> E-COMMERCE
                </td>
              </tr>
              {ecommerceChannels.map((item: any, idx: number) => (
                <tr key={item.canal} className={`${idx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-950/20'} hover:bg-slate-800/40 transition`}>
                  <td className="py-1.5 px-2 font-bold border-r border-slate-800/50 whitespace-nowrap">{item.canal} <span className="text-[9px] text-slate-400 font-normal">({item.responsavel})</span></td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-300 whitespace-nowrap">R$ {item.vendasDoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-bold text-white whitespace-nowrap">R$ {item.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-400 whitespace-nowrap">R$ {item.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-bold text-indigo-300 whitespace-nowrap">R$ {item.projecaoFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-800/50 whitespace-nowrap">{renderSetaVariacao(item.projecaoVsMeta)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-400 whitespace-nowrap">R$ {item.faturadoMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-800/50 whitespace-nowrap">{renderSetaVariacao(item.projVsMesAnterior)}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-300 whitespace-nowrap">{item.metaMargemBruta.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-800/50 whitespace-nowrap">{renderSetaDiferencaMargem(item.diffMargemBruta)}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-300 whitespace-nowrap">{item.metaMargemLiq.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap">{renderSetaDiferencaMargem(item.diffMargemLiq)}</td>
                </tr>
              ))}

              {/* LOJAS FÍSICAS */}
              <tr className="bg-slate-950 font-black text-white text-[10px]">
                <td colSpan={12} className="py-1.5 px-2.5 text-emerald-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-store"></i> Lojas Físicas
                </td>
              </tr>
              {physicalChannels.map((item: any, idx: number) => (
                <tr key={item.canal} className={`${idx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-950/20'} hover:bg-slate-800/40 transition`}>
                  <td className="py-1.5 px-2 font-bold border-r border-slate-800/50 whitespace-nowrap">{item.canal} <span className="text-[9px] text-slate-400 font-normal">({item.responsavel})</span></td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-300 whitespace-nowrap">R$ {item.vendasDoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-bold text-white whitespace-nowrap">R$ {item.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-400 whitespace-nowrap">R$ {item.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-bold text-emerald-300 whitespace-nowrap">R$ {item.projecaoFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-800/50 whitespace-nowrap">{renderSetaVariacao(item.projecaoVsMeta)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-400 whitespace-nowrap">R$ {item.faturadoMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-800/50 whitespace-nowrap">{renderSetaVariacao(item.projVsMesAnterior)}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-300 whitespace-nowrap">{item.metaMargemBruta.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-800/50 whitespace-nowrap">{renderSetaDiferencaMargem(item.diffMargemBruta)}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-300 whitespace-nowrap">{item.metaMargemLiq.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap">{renderSetaDiferencaMargem(item.diffMargemLiq)}</td>
                </tr>
              ))}

            </tbody>

            <tfoot className="bg-slate-950 text-white font-black text-[10px] border-t-2 border-slate-700">
              <tr>
                <td className="py-2 px-2 border-r border-slate-800 whitespace-nowrap">Total Geral</td>
                <td className="py-2 px-2 text-right font-mono text-emerald-400 whitespace-nowrap">R$ {totalGeral.vendasDoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right text-white whitespace-nowrap">R$ {totalGeral.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right font-mono text-slate-300 whitespace-nowrap">R$ {totalGeral.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right text-emerald-400 whitespace-nowrap">R$ {totalGeral.projecaoFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap">{renderSetaVariacao(totalGeral.metaValor > 0 ? ((totalGeral.projecaoFaturamento / totalGeral.metaValor) - 1) * 100 : 0)}</td>
                <td className="py-2 px-2 text-right font-mono text-slate-300 whitespace-nowrap">R$ {totalGeral.faturadoMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap">{renderSetaVariacao(totalGeral.faturadoMesAnterior > 0 ? ((totalGeral.faturadoComRedutor / totalGeral.faturadoMesAnterior) - 1) * 100 : 0)}</td>
                <td colSpan={4} className="py-2 px-2 text-center text-slate-400 whitespace-nowrap">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}