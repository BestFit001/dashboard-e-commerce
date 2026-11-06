'use client';
import React, { useState, useRef, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';

const MESES_MAP: Record<string, string> = {
  '01': 'janeiro', '02': 'fevereiro', '03': 'março', '04': 'abril',
  '05': 'maio', '06': 'junho', '07': 'julho', '08': 'agosto',
  '09': 'setembro', '10': 'outubro', '11': 'novembro', '12': 'dezembro'
};

// Converte qualquer formato ("2026-11", "11/2026", "novembro de 2026") para a chave canónica "AAAA-MM"
function normalizarMesParaChave(mesRef: any): string {
  if (!mesRef) return '';
  const s = String(mesRef).trim().toLowerCase();

  // Caso: AAAA-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s;

  // Caso: MM/AAAA
  const matchBarra = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (matchBarra) {
    return `${matchBarra[2]}-${matchBarra[1].padStart(2, '0')}`;
  }

  // Caso por extenso: "outubro de 2026"
  for (const [num, nome] of Object.entries(MESES_MAP)) {
    if (s.includes(nome)) {
      const anoMatch = s.match(/\d{4}/);
      if (anoMatch) return `${anoMatch[0]}-${num}`;
    }
  }

  return s;
}

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

  const tableRef = useRef<HTMLTableElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mês padrão atual no formato AAAA-MM
  const currentMonthDefault = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthDefault);

  // Extrai todos os meses presentes de forma normalizada
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthDefault);

    (sales || []).forEach((s: any) => {
      const k = normalizarMesParaChave(s.mes_referencia);
      if (k) monthsSet.add(k);
    });
    (goals || []).forEach((g: any) => {
      const k = normalizarMesParaChave(g.mes_referencia);
      if (k) monthsSet.add(k);
    });
    (adsData || []).forEach((a: any) => {
      const k = normalizarMesParaChave(a.mes_referencia);
      if (k) monthsSet.add(k);
    });

    return Array.from(monthsSet).sort().reverse();
  }, [sales, goals, adsData, currentMonthDefault]);

  const currentRefMonth = selectedMonth; // Chave canónica AAAA-MM

  // Mês anterior canónico (AAAA-MM)
  const previousMonthRef = useMemo(() => {
    const [yearStr, monthStr] = currentRefMonth.split('-');
    const d = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [currentRefMonth]);

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

  // Filtra cancelados estritamente pelo mês canónico selecionado
  const activeCancelados = useMemo(() => {
    if (!cancelados) return [];
    return cancelados.filter((c: any) => normalizarMesParaChave(c.mes_referencia) === currentRefMonth);
  }, [cancelados, currentRefMonth]);

  // Vendas do mês selecionado rigorosamente filtradas (usadas em todo o restante do dashboard)
  const enrichedSales = useMemo(() => {
    return (sales || []).filter((s: any) => {
      if (normalizarMesParaChave(s.mes_referencia) !== currentRefMonth) return false;
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

      const flexOrder = flexData.find((f: any) => f.id_pedido === s.id_pedido && normalizarMesParaChave(f.mes_referencia) === currentRefMonth);
      const custoFlex = flexOrder ? parseCurrency(flexOrder.valor_frete) : 0;
      const precoVenda = parseCurrency(s.preco_venda);
      let repasseLiquido = parseCurrency(s.repasse_liquido);
      if (repasseLiquido <= 0 || repasseLiquido > precoVenda * 2) repasseLiquido = precoVenda;

      const ganhoBruto = repasseLiquido - custoCMV;
      const ganhoLiquido = ganhoBruto - custoFlex;

      return { ...s, preco_venda: precoVenda, custoCMV, custoFlex, ganhoLiquido, repasse_liquido: repasseLiquido };
    });
  }, [sales, selectedChannelFilter, products, flexData, currentRefMonth]);

  // Vendas do mês anterior rigorosamente filtradas
  const previousMonthSales = useMemo(() => {
    return (sales || []).filter((s: any) => normalizarMesParaChave(s.mes_referencia) === previousMonthRef);
  }, [sales, previousMonthRef]);

  // Força o dia anterior fixo (D-1) para a coluna "Vendas Dia"
  const { targetDateStr, targetDateFormatted } = useMemo(() => {
    const [yearStr, monthStr] = currentRefMonth.split('-');
    const yyyy = parseInt(yearStr, 10);
    const mm = parseInt(monthStr, 10);

    const now = new Date();
    const isMesAtual = (now.getFullYear() === yyyy && (now.getMonth() + 1) === mm);

    let finalDateStr = '';
    if (isMesAtual) {
      const ontem = new Date(now);
      ontem.setDate(now.getDate() - 1);
      finalDateStr = `${yyyy}-${String(mm).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`;
    } else {
      const ultimoDia = new Date(yyyy, mm, 0).getDate();
      finalDateStr = `${yyyy}-${String(mm).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    }

    const [y, m, d] = finalDateStr.split('-');
    return {
      targetDateStr: finalDateStr,
      targetDateFormatted: `${d}/${m}/${y}`
    };
  }, [currentRefMonth]);

  const channelAnalytics = useMemo(() => {
    const activeChannels = Array.from(new Set([...canais, ...channelRules.map((r: any) => r.canal)]));
    
    const [refAnoStr, refMesStr] = currentRefMonth.split('-');
    const refAno = parseInt(refAnoStr, 10);
    const refMes = parseInt(refMesStr, 10) - 1;
    const now = new Date();
    const isCurrentMonth = (now.getFullYear() === refAno && now.getMonth() === refMes);
    const totalDiasMes = new Date(refAno, refMes + 1, 0).getDate();
    let diasPassados = isCurrentMonth ? Math.max(1, now.getDate() - 1) : totalDiasMes;

    return activeChannels.map(channelName => {
      const chSales = enrichedSales.filter((s: any) => s.canal === channelName);
      const prevChSales = previousMonthSales.filter((s: any) => s.canal === channelName);
      const fisico = isChannelFisico(channelName);

      const vendasDoDia = chSales
        .filter((s: any) => String(s.data_faturamento || '').trim() === targetDateStr)
        .reduce((sum: number, s: any) => sum + s.preco_venda, 0);

      const ruleObj = channelRules.find((r: any) => r.canal === channelName) || {};
      const defaultMetaBruta = fisico ? 56.0 : 48.0;
      const goalObj = goals.find((g: any) => g.canal === channelName && normalizarMesParaChave(g.mes_referencia) === currentRefMonth) 
                   || goals.find((g: any) => g.canal === channelName) 
                   || { meta_valor: 0, meta_margem_bruta: defaultMetaBruta, meta_margem_liq: 15, responsavel: ruleObj.responsavel || 'Equipe' };

      const cancelamentosMes = activeCancelados
        .filter((c: any) => String(c.canal).toLowerCase() === String(channelName).toLowerCase())
        .reduce((sum: number, c: any) => sum + parseCurrency(c.valor), 0);

      const faturadoBrutoPuro = chSales.reduce((sum: number, s: any) => sum + s.preco_venda, 0);
      const faturadoComRedutor = Math.max(0, faturadoBrutoPuro - cancelamentosMes);
      const repasseTotal = chSales.reduce((sum: number, s: any) => sum + s.repasse_liquido, 0);
      const cmvCanal = chSales.reduce((sum: number, s: any) => sum + s.custoCMV, 0);
      
      const canalAds = adsData
        .filter((a: any) => a.canal === channelName && normalizarMesParaChave(a.mes_referencia) === currentRefMonth)
        .reduce((sum: number, a: any) => sum + parseCurrency(a.custo_ads), 0);
      const flexCanal = chSales.reduce((sum: number, s: any) => sum + s.custoFlex, 0);

      const metaBase = parseCurrency(goalObj.meta_valor);
      
      const projecaoFaturamento = isCurrentMonth ? (faturadoComRedutor / diasPassados) * totalDiasMes : faturadoComRedutor;
      const projecaoVsMeta = metaBase > 0 ? ((projecaoFaturamento / metaBase) - 1) * 100 : 0;

      const faturadoMesAnterior = prevChSales.reduce((sum: number, s: any) => sum + parseCurrency(s.preco_venda), 0);
      const projVsMesAnterior = faturadoMesAnterior > 0 ? ((faturadoComRedutor / faturadoMesAnterior) - 1) * 100 : 0;

      // Correção aplicada estritamente para Hebraica e Paineiras
      let margemBrutaAtingida = 0;
      let margemLiqAtingida = 0;
      const nomeLower = String(channelName).toLowerCase();
      const isClubeEspecial = nomeLower.includes('hebraica') || nomeLower.includes('paineiras');

      if (faturadoBrutoPuro > 0) {
        if (isClubeEspecial) {
          // Margem Bruta = (Repasse - CMV) / Faturamento Bruto
          const brutoClube = repasseTotal - cmvCanal;
          margemBrutaAtingida = (brutoClube / faturadoBrutoPuro) * 100;

          // Margem Líquida = (Repasse - CMV - 9% Imposto) / Faturamento Bruto
          const impostoClube = faturadoBrutoPuro * 0.09;
          const liquidoClube = repasseTotal - cmvCanal - impostoClube;
          margemLiqAtingida = (liquidoClube / faturadoBrutoPuro) * 100;
        } else {
          // Demais canais mantêm a lógica original intacta
          const lucroLiquidoFinal = repasseTotal - cmvCanal - flexCanal - canalAds;
          margemBrutaAtingida = (repasseTotal / faturadoBrutoPuro) * 100;
          margemLiqAtingida = (lucroLiquidoFinal / faturadoBrutoPuro) * 100;
        }
      }

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
        margemBrutaAtingida,
        diffMargemBruta,
        metaMargemLiq,
        margemLiqAtingida,
        diffMargemLiq,
        isFisico: fisico,
        faturadoBrutoPuro,
        repasseTotal
      };
    });
  }, [enrichedSales, previousMonthSales, goals, adsData, channelRules, currentRefMonth, canais, activeCancelados, targetDateStr]);

  const ecommerceChannels = channelAnalytics.filter(c => !c.isFisico);
  const physicalChannels = channelAnalytics.filter(c => c.isFisico);

  const sumTotals = (channels: any[]) => {
    return channels.reduce((acc, curr) => ({
      vendasDoDia: acc.vendasDoDia + curr.vendasDoDia,
      faturadoComRedutor: acc.faturadoComRedutor + curr.faturadoComRedutor,
      metaValor: acc.metaValor + curr.metaValor,
      projecaoFaturamento: acc.projecaoFaturamento + curr.projecaoFaturamento,
      faturadoMesAnterior: acc.faturadoMesAnterior + curr.faturadoMesAnterior,
      faturadoBrutoPuro: acc.faturadoBrutoPuro + curr.faturadoBrutoPuro,
      repasseTotal: acc.repasseTotal + curr.repasseTotal,
      metaBrutaPonderada: acc.metaBrutaPonderada + (curr.metaMargemBruta * curr.metaValor),
      metaLiqPonderada: acc.metaLiqPonderada + (curr.metaMargemLiq * curr.metaValor),
    }), { 
      vendasDoDia: 0, faturadoComRedutor: 0, metaValor: 0, projecaoFaturamento: 0, faturadoMesAnterior: 0, 
      faturadoBrutoPuro: 0, repasseTotal: 0, metaBrutaPonderada: 0, metaLiqPonderada: 0 
    });
  };

  const enrichTotals = (totals: any) => {
    const margemBrutaAtingida = totals.faturadoBrutoPuro > 0 ? (totals.repasseTotal / totals.faturadoBrutoPuro) * 100 : 0;
    const margemLiqAtingida = totals.faturadoBrutoPuro > 0 ? (totals.repasseTotal / totals.faturadoBrutoPuro) * 100 : 0;
    const metaMargemBruta = totals.metaValor > 0 ? totals.metaBrutaPonderada / totals.metaValor : 0;
    const metaMargemLiq = totals.metaValor > 0 ? totals.metaLiqPonderada / totals.metaValor : 0;

    return {
      ...totals,
      margemBrutaAtingida,
      margemLiqAtingida,
      metaMargemBruta,
      metaMargemLiq,
      diffMargemBruta: margemBrutaAtingida - metaMargemBruta,
      diffMargemLiq: margemLiqAtingida - metaMargemLiq
    };
  };

  const totalEcomRaw = sumTotals(ecommerceChannels);
  const totalEcom = enrichTotals(totalEcomRaw);

  const totalFisicoRaw = sumTotals(physicalChannels);
  const totalFisico = enrichTotals(totalFisicoRaw);

  const totalGeralRaw = {
    vendasDoDia: totalEcomRaw.vendasDoDia + totalFisicoRaw.vendasDoDia,
    faturadoComRedutor: totalEcomRaw.faturadoComRedutor + totalFisicoRaw.faturadoComRedutor,
    metaValor: totalEcomRaw.metaValor + totalFisicoRaw.metaValor,
    projecaoFaturamento: totalEcomRaw.projecaoFaturamento + totalFisicoRaw.projecaoFaturamento,
    faturadoMesAnterior: totalEcomRaw.faturadoMesAnterior + totalFisicoRaw.faturadoMesAnterior,
    faturadoBrutoPuro: totalEcomRaw.faturadoBrutoPuro + totalFisicoRaw.faturadoBrutoPuro,
    repasseTotal: totalEcomRaw.repasseTotal + totalFisicoRaw.repasseTotal,
    metaBrutaPonderada: totalEcomRaw.metaBrutaPonderada + totalFisicoRaw.metaBrutaPonderada,
    metaLiqPonderada: totalEcomRaw.metaLiqPonderada + totalFisicoRaw.metaLiqPonderada,
  };
  const totalGeral = enrichTotals(totalGeralRaw);

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

  const renderSetaTotal = (val: number) => {
    if (val >= 0) {
      return <span className="text-green-300 font-black inline-flex items-center gap-0.5"><i className="fa-solid fa-caret-up"></i> +{val.toFixed(1)}%</span>;
    } else {
      return <span className="text-red-300 font-black inline-flex items-center gap-0.5"><i className="fa-solid fa-caret-down"></i> {val.toFixed(1)}%</span>;
    }
  };

  const handleEnviarEmailComPrint = async () => {
    if (!tableRef.current) return;
    try {
      setIsProcessing(true);
      
      const { toBlob } = await import('html-to-image');
      
      const fullWidth = tableRef.current.scrollWidth;
      const fullHeight = tableRef.current.scrollHeight;

      const blob = await toBlob(tableRef.current, {
        backgroundColor: '#0f172a',
        width: fullWidth,
        height: fullHeight,
        style: {
          width: `${fullWidth}px`,
          maxWidth: 'none',
        },
        pixelRatio: 2
      });
      
      if (!blob) throw new Error('Falha ao gerar imagem.');
      
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      const emailsCadastrados = users && users.length > 0 ? users.map((u: any) => u.username).filter(Boolean).join(';') : "gisele@usebestfit.com.br";
      
      const [anoFormat, mesFormat] = currentRefMonth.split('-');
      const mesReferenciaFormatado = `${mesFormat}/${anoFormat}`;
      const isMesAtual = currentRefMonth === currentMonthDefault;
      const tituloPeriodo = isMesAtual ? `DIÁRIO (${targetDateFormatted})` : `FECHAMENTO (${mesReferenciaFormatado} - Dia ${targetDateFormatted})`;
      const assunto = encodeURIComponent(`DASHBOARD ${tituloPeriodo} LOJA E ECO`);
      
      const hebraicaObj = channelAnalytics.find(c => c.canal.toLowerCase().includes('hebraica')) || { faturadoComRedutor: 0, projecaoVsMeta: 0 };
      const paineirasObj = channelAnalytics.find(c => c.canal.toLowerCase().includes('paineiras')) || { faturadoComRedutor: 0, projecaoVsMeta: 0 };
      const ecomProjVsMeta = totalEcom.metaValor > 0 ? ((totalEcom.projecaoFaturamento / totalEcom.metaValor) - 1) * 100 : 0;

      const formatProjText = (val: number) => val >= 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`;

      let corpoTexto = `Olá, tudo bem? Segue resumo das vendas das lojas físicas e online do período de referência ${mesReferenciaFormatado} (Dia apurado: ${targetDateFormatted}).\n\n`;
      corpoTexto += `Hebraica: R$ ${hebraicaObj.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Projeção/Fechamento: ${formatProjText(hebraicaObj.projecaoVsMeta)})\n`;
      corpoTexto += `Paineiras: R$ ${paineirasObj.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Projeção/Fechamento: ${formatProjText(paineirasObj.projecaoVsMeta)})\n`;
      corpoTexto += `E-commerce: R$ ${totalEcom.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Projeção/Fechamento: ${formatProjText(ecomProjVsMeta)})\n\n`;
      corpoTexto += `Imagem do Dash:\n\n\n`;
      corpoTexto += `Acesse o sistema para conferir a visão completa: https://dashboard-e-commerce-nine.vercel.app/executivo`;
      
      window.location.href = `mailto:${emailsCadastrados}?subject=${assunto}&body=${encodeURIComponent(corpoTexto)}`;

      alert(`✅ Tabela referente ao dia ${targetDateFormatted} (${mesReferenciaFormatado}) copiada em alta resolução! Clique em "Imagem do Dash:" no e-mail e aperte Ctrl + V para colar.`);
      addLog(`Print panorâmico do dia ${targetDateFormatted} copiado e cliente de e-mail acionado.`, 'success');
      
    } catch (err: any) {
      alert(`Erro ao copiar print/abrir e-mail: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2 max-w-full mx-auto pb-6 px-1 text-[10px]">
      <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-300">Mês de Referência:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-indigo-400 font-mono font-bold rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {availableMonths.map((m) => {
                const [ano, mes] = m.split('-');
                return (
                  <option key={m} value={m}>
                    {mes}/{ano} {m === currentMonthDefault ? '(Atual)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
          <span className="font-bold text-slate-400 text-[9px] border-l border-slate-700 pl-3">
            Último Dia de Vendas: <span className="text-emerald-400 font-mono font-bold">{targetDateFormatted}</span>
          </span>
          <span className="font-bold text-slate-400 text-[9px] border-l border-slate-700 pl-3">
            Comparativo Mês Ant: <span className="text-slate-300 font-mono">{previousMonthRef.split('-').reverse().join('/')}</span>
          </span>
        </div>
        
        <button 
          onClick={handleEnviarEmailComPrint} 
          disabled={isProcessing}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded shadow transition flex items-center gap-2 disabled:opacity-50"
        >
          <i className="fa-solid fa-paper-plane"></i> {isProcessing ? 'A gerar print...' : 'Copiar Print & Enviar E-mail'}
        </button>
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-2xl p-1">
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full text-left text-slate-200 border-collapse bg-slate-900">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-800 tracking-tight">
              <tr>
                <th className="py-2 px-2 border-r border-slate-800 whitespace-nowrap">Canal / Resp.</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">
                  Vendas Dia <span className="text-[8px] text-emerald-400 font-mono">({targetDateFormatted})</span>
                </th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Total Mês</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Meta Mês</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Projeção</th>
                <th className="py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap">Proj x Meta</th>
                <th className="py-2 px-2 text-right whitespace-nowrap">Mês Ant.</th>
                <th className="py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap">Proj x Ant.</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Meta Margem Bruta</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Margem Bruta Ating</th>
                <th className="py-2 px-2 text-center border-r border-slate-800 whitespace-nowrap">Margem Bruta x Ating</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Meta Margem Liq</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Margem Liq Ating</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Margem Liq x Ating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-medium">
              
              {/* E-COMMERCE */}
              <tr className="bg-slate-950 font-black text-white text-[10px]">
                <td colSpan={14} className="py-2 px-2.5 text-indigo-400 flex items-center gap-1.5">
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
                  <td className="py-1.5 px-2 text-center font-mono text-slate-200 whitespace-nowrap">{item.margemBrutaAtingida.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-800/50 whitespace-nowrap">{renderSetaDiferencaMargem(item.diffMargemBruta)}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-300 whitespace-nowrap">{item.metaMargemLiq.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-200 whitespace-nowrap">{item.margemLiqAtingida.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap">{renderSetaDiferencaMargem(item.diffMargemLiq)}</td>
                </tr>
              ))}
              
              {/* E-COMMERCE TOTAL */}
              <tr className="bg-indigo-900 font-black text-white text-[10px] border-y-2 border-indigo-500 shadow-md">
                <td className="py-2 px-2 border-r border-indigo-500/50 whitespace-nowrap text-white">TOTAL E-COMMERCE</td>
                <td className="py-2 px-2 text-right font-mono text-white whitespace-nowrap">R$ {totalEcom.vendasDoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right text-white whitespace-nowrap">R$ {totalEcom.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right font-mono text-indigo-100 whitespace-nowrap">R$ {totalEcom.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right text-indigo-100 whitespace-nowrap">R$ {totalEcom.projecaoFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-center border-r border-indigo-500/50 whitespace-nowrap">{renderSetaTotal(totalEcom.metaValor > 0 ? ((totalEcom.projecaoFaturamento / totalEcom.metaValor) - 1) * 100 : 0)}</td>
                <td className="py-2 px-2 text-right font-mono text-indigo-100 whitespace-nowrap">R$ {totalEcom.faturadoMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-center border-r border-indigo-500/50 whitespace-nowrap">{renderSetaTotal(totalEcom.faturadoMesAnterior > 0 ? ((totalEcom.faturadoComRedutor / totalEcom.faturadoMesAnterior) - 1) * 100 : 0)}</td>
                <td className="py-2 px-2 text-center font-mono text-indigo-100 whitespace-nowrap">{totalEcom.metaMargemBruta.toFixed(1)}%</td>
                <td className="py-2 px-2 text-center font-mono text-indigo-100 whitespace-nowrap">{totalEcom.margemBrutaAtingida.toFixed(1)}%</td>
                <td className="py-2 px-2 text-center border-r border-indigo-500/50 whitespace-nowrap">{renderSetaTotal(totalEcom.diffMargemBruta)}</td>
                <td className="py-2 px-2 text-center font-mono text-indigo-100 whitespace-nowrap">{totalEcom.metaMargemLiq.toFixed(1)}%</td>
                <td className="py-2 px-2 text-center font-mono text-indigo-100 whitespace-nowrap">{totalEcom.margemLiqAtingida.toFixed(1)}%</td>
                <td className="py-2 px-2 text-center whitespace-nowrap">{renderSetaTotal(totalEcom.diffMargemLiq)}</td>
              </tr>

              {/* LOJAS FÍSICAS */}
              <tr className="bg-slate-950 font-black text-white text-[10px]">
                <td colSpan={14} className="py-2 px-2.5 text-emerald-400 flex items-center gap-1.5 border-t border-slate-800">
                  <i className="fa-solid fa-store"></i> LOJAS FÍSICAS
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
                  <td className="py-1.5 px-2 text-center font-mono text-slate-200 whitespace-nowrap">{item.margemBrutaAtingida.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-800/50 whitespace-nowrap">{renderSetaDiferencaMargem(item.diffMargemBruta)}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-300 whitespace-nowrap">{item.metaMargemLiq.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-200 whitespace-nowrap">{item.margemLiqAtingida.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap">{renderSetaDiferencaMargem(item.diffMargemLiq)}</td>
                </tr>
              ))}

              {/* LOJAS FÍSICAS TOTAL */}
              <tr className="bg-emerald-900 font-black text-white text-[10px] border-y-2 border-emerald-500 shadow-md">
                <td className="py-2 px-2 border-r border-emerald-500/50 whitespace-nowrap text-white">TOTAL LOJAS FÍSICAS</td>
                <td className="py-2 px-2 text-right font-mono text-white whitespace-nowrap">R$ {totalFisico.vendasDoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right text-white whitespace-nowrap">R$ {totalFisico.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right font-mono text-emerald-100 whitespace-nowrap">R$ {totalFisico.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right text-emerald-100 whitespace-nowrap">R$ {totalFisico.projecaoFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-center border-r border-emerald-500/50 whitespace-nowrap">{renderSetaTotal(totalFisico.metaValor > 0 ? ((totalFisico.projecaoFaturamento / totalFisico.metaValor) - 1) * 100 : 0)}</td>
                <td className="py-2 px-2 text-right font-mono text-emerald-100 whitespace-nowrap">R$ {totalFisico.faturadoMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-center border-r border-slate-800/50 whitespace-nowrap">{renderSetaTotal(totalFisico.faturadoMesAnterior > 0 ? ((totalFisico.faturadoComRedutor / totalFisico.faturadoMesAnterior) - 1) * 100 : 0)}</td>
                <td className="py-2 px-2 text-center font-mono text-emerald-100 whitespace-nowrap">{totalFisico.metaMargemBruta.toFixed(1)}%</td>
                <td className="py-2 px-2 text-center font-mono text-emerald-100 whitespace-nowrap">{totalFisico.margemBrutaAtingida.toFixed(1)}%</td>
                <td className="py-2 px-2 text-center border-r border-slate-800/50 whitespace-nowrap">{renderSetaDiferencaMargem(totalFisico.diffMargemBruta)}</td>
                <td className="py-2 px-2 text-center font-mono text-emerald-100 whitespace-nowrap">{totalFisico.metaMargemLiq.toFixed(1)}%</td>
                <td className="py-2 px-2 text-center font-mono text-emerald-100 whitespace-nowrap">{totalFisico.margemLiqAtingida.toFixed(1)}%</td>
                <td className="py-2 px-2 text-center whitespace-nowrap">{renderSetaDiferencaMargem(totalFisico.diffMargemLiq)}</td>
              </tr>

            </tbody>

            {/* TOTAL GERAL ABSOLUTO */}
            <tfoot className="bg-slate-800 text-white font-black text-[11px] border-t-4 border-slate-400 shadow-[0_-8px_10px_-1px_rgba(0,0,0,0.4)]">
              <tr>
                <td className="py-3 px-2 border-r border-slate-600 whitespace-nowrap text-white">TOTAL GERAL</td>
                <td className="py-3 px-2 text-right font-mono text-white whitespace-nowrap">R$ {totalGeral.vendasDoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-3 px-2 text-right text-white whitespace-nowrap">R$ {totalGeral.faturadoComRedutor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-3 px-2 text-right font-mono text-slate-200 whitespace-nowrap">R$ {totalGeral.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-3 px-2 text-right text-white whitespace-nowrap">R$ {totalGeral.projecaoFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-3 px-2 text-center border-r border-slate-600 whitespace-nowrap">{renderSetaTotal(totalGeral.metaValor > 0 ? ((totalGeral.projecaoFaturamento / totalGeral.metaValor) - 1) * 100 : 0)}</td>
                <td className="py-3 px-2 text-right font-mono text-slate-200 whitespace-nowrap">R$ {totalGeral.faturadoMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-3 px-2 text-center border-r border-slate-600 whitespace-nowrap">{renderSetaTotal(totalGeral.faturadoMesAnterior > 0 ? ((totalGeral.faturadoComRedutor / totalGeral.faturadoMesAnterior) - 1) * 100 : 0)}</td>
                <td className="py-3 px-2 text-center font-mono text-slate-200 whitespace-nowrap">{totalGeral.metaMargemBruta.toFixed(1)}%</td>
                <td className="py-3 px-2 text-center font-mono text-slate-200 whitespace-nowrap">{totalGeral.margemBrutaAtingida.toFixed(1)}%</td>
                <td className="py-3 px-2 text-center border-r border-slate-600 whitespace-nowrap">{renderSetaDiferencaMargem(totalGeral.diffMargemBruta)}</td>
                <td className="py-3 px-2 text-center font-mono text-slate-200 whitespace-nowrap">{totalGeral.metaMargemLiq.toFixed(1)}%</td>
                <td className="py-3 px-2 text-center font-mono text-slate-200 whitespace-nowrap">{totalGeral.margemLiqAtingida.toFixed(1)}%</td>
                <td className="py-3 px-2 text-center whitespace-nowrap">{renderSetaDiferencaMargem(totalGeral.diffMargemLiq)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}