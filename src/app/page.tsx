'use client';

import { useState } from 'react';

export default function Home() {
  // Arquivos
  const [fileFaturados, setFileFaturados] = useState<File | null>(null);
  const [fileCancelados, setFileCancelados] = useState<File | null>(null);
  const [fileCustos, setFileCustos] = useState<File | null>(null);
  const [fileCanal, setFileCanal] = useState<File | null>(null);

  // Mapeamentos separados por Painéis
  const [mapFaturados, setMapFaturados] = useState({ pedido: 'A', data: 'B' });
  const [mapCancelados, setMapCancelados] = useState({ pedido: 'A' });
  const [mapCustos, setMapCustos] = useState({ sku: 'A', nome: 'B', custo: 'C', embalagem: 'D' });
  
  const [mapCanal, setMapCanal] = useState({
    pedido: 'A',
    sku: 'W',
    pdv: 'I', usaPdv: true,
    frete: 'N', usaFrete: true,
    rebate: 'Q', usaRebate: true,
    liquido: 'S', usaLiquido: true,
    envio: 'AR', usaFlex: true,
  });

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);
    setErro('');

    const formData = new FormData();
    if (fileFaturados) formData.append('faturados', fileFaturados);
    if (fileCancelados) formData.append('cancelados', fileCancelados);
    if (fileCustos) formData.append('custos', fileCustos);
    if (fileCanal) formData.append('canal', fileCanal);

    formData.append('mapping', JSON.stringify({
      faturadosPedido: mapFaturados.pedido,
      faturadosData: mapFaturados.data,
      canceladosPedido: mapCancelados.pedido,
      custosSku: mapCustos.sku,
      custosNome: mapCustos.nome,
      custosValor: mapCustos.custo,
      custosEmb: mapCustos.embalagem,
      colPedido: mapCanal.pedido,
      colSku: mapCanal.sku,
      colPdv: mapCanal.pdv, usaPdv: mapCanal.usaPdv,
      colFrete: mapCanal.frete, usaFrete: mapCanal.usaFrete,
      colRebate: mapCanal.rebate, usaRebate: mapCanal.usaRebate,
      colLiquido: mapCanal.liquido, usaLiquido: mapCanal.usaLiquido,
      colEnvio: mapCanal.envio, usaFlex: mapCanal.usaFlex,
    }));

    try {
      const res = await fetch('/api/processar-vendas', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao processar.');
      setResultado(data);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-emerald-400">Dashboard de E-commerce & Liquidez</h1>
          <p className="text-sm text-slate-400 mt-1">Painéis isolados por tipo de base e mapeamento dedicado por canal.</p>
        </header>

        {erro && <div className="bg-red-950 border border-red-800 text-red-200 p-4 rounded-lg text-sm">{erro}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* PAINEL 1: PRODUTOS FATURADOS & CANCELADOS */}
          <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-lg font-semibold text-emerald-400">1. Painel de Pedidos Faturados e Cancelados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-xs uppercase text-slate-400">Planilha Faturados (Obrigatório)</label>
                <input type="file" accept=".csv, .xlsx" onChange={(e) => setFileFaturados(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded file:bg-emerald-500 file:text-slate-950 file:font-semibold cursor-pointer"/>
                <div className="flex gap-2 pt-2">
                  <div><span className="text-[10px] text-slate-400 block">Col. Pedido</span><input type="text" value={mapFaturados.pedido} onChange={e=>setMapFaturados({...mapFaturados, pedido: e.target.value})} className="w-16 bg-slate-950 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/></div>
                  <div><span className="text-[10px] text-slate-400 block">Col. Data</span><input type="text" value={mapFaturados.data} onChange={e=>setMapFaturados({...mapFaturados, data: e.target.value})} className="w-16 bg-slate-950 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/></div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs uppercase text-slate-400">Planilha Cancelados (Opcional)</label>
                <input type="file" accept=".csv, .xlsx" onChange={(e) => setFileCancelados(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded file:bg-slate-700 file:text-slate-100 file:font-semibold cursor-pointer"/>
                <div className="flex gap-2 pt-2">
                  <div><span className="text-[10px] text-slate-400 block">Col. Pedido</span><input type="text" value={mapCancelados.pedido} onChange={e=>setMapCancelados({...mapCancelados, pedido: e.target.value})} className="w-16 bg-slate-950 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/></div>
                </div>
              </div>
            </div>
          </div>

          {/* PAINEL 2: BASE DE CUSTOS */}
          <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-lg font-semibold text-emerald-400">2. Painel de Base de Custos</h2>
            <div className="space-y-3">
              <label className="block text-xs uppercase text-slate-400">Planilha Base de Custos (Obrigatório)</label>
              <input type="file" accept=".csv, .xlsx" onChange={(e) => setFileCustos(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded file:bg-emerald-500 file:text-slate-950 file:font-semibold cursor-pointer"/>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div><span className="text-[10px] text-slate-400 block">Col. SKU (A)</span><input type="text" value={mapCustos.sku} onChange={e=>setMapCustos({...mapCustos, sku: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/></div>
                <div><span className="text-[10px] text-slate-400 block">Col. Nome (B)</span><input type="text" value={mapCustos.nome} onChange={e=>setMapCustos({...mapCustos, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/></div>
                <div><span className="text-[10px] text-slate-400 block">Col. Custo (C)</span><input type="text" value={mapCustos.custo} onChange={e=>setMapCustos({...mapCustos, custo: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/></div>
                <div><span className="text-[10px] text-slate-400 block">Col. Embalagem (D)</span><input type="text" value={mapCustos.embalagem} onChange={e=>setMapCustos({...mapCustos, embalagem: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/></div>
              </div>
            </div>
          </div>

          {/* PAINEL 3: MERCADO LIVRE */}
          <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-lg font-semibold text-emerald-400">3. Painel de Vendas - Mercado Livre</h2>
            <div className="space-y-3">
              <label className="block text-xs uppercase text-slate-400">Planilha de Vendas do Canal (Obrigatório)</label>
              <input type="file" accept=".csv, .xlsx" onChange={(e) => setFileCanal(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:py-1.5 file:px-3 file:rounded file:bg-emerald-500 file:text-slate-950 file:font-semibold cursor-pointer"/>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-950 p-3 rounded border border-slate-800"><span className="text-xs text-slate-400 block mb-1">Nº Pedido</span><input type="text" value={mapCanal.pedido} onChange={e=>setMapCanal({...mapCanal, pedido: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/></div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800"><span className="text-xs text-slate-400 block mb-1">SKU</span><input type="text" value={mapCanal.sku} onChange={e=>setMapCanal({...mapCanal, sku: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/></div>
                
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">PDV (9% Imposto)</span><label className="text-[10px] text-emerald-400 flex gap-1 cursor-pointer"><input type="checkbox" checked={mapCanal.usaPdv} onChange={e=>setMapCanal({...mapCanal, usaPdv: e.target.checked})}/> Possui</label></div>
                  {mapCanal.usaPdv && <input type="text" value={mapCanal.pdv} onChange={e=>setMapCanal({...mapCanal, pdv: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/>}
                </div>

                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Frete</span><label className="text-[10px] text-emerald-400 flex gap-1 cursor-pointer"><input type="checkbox" checked={mapCanal.usaFrete} onChange={e=>setMapCanal({...mapCanal, usaFrete: e.target.checked})}/> Possui</label></div>
                  {mapCanal.usaFrete && <input type="text" value={mapCanal.frete} onChange={e=>setMapCanal({...mapCanal, frete: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/>}
                </div>

                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Rebate / Bônus</span><label className="text-[10px] text-emerald-400 flex gap-1 cursor-pointer"><input type="checkbox" checked={mapCanal.usaRebate} onChange={e=>setMapCanal({...mapCanal, usaRebate: e.target.checked})}/> Possui</label></div>
                  {mapCanal.usaRebate && <input type="text" value={mapCanal.rebate} onChange={e=>setMapCanal({...mapCanal, rebate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/>}
                </div>

                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Líquido Recebido</span><label className="text-[10px] text-emerald-400 flex gap-1 cursor-pointer"><input type="checkbox" checked={mapCanal.usaLiquido} onChange={e=>setMapCanal({...mapCanal, usaLiquido: e.target.checked})}/> Possui</label></div>
                  {mapCanal.usaLiquido && <input type="text" value={mapCanal.liquido} onChange={e=>setMapCanal({...mapCanal, liquido: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/>}
                </div>

                <div className="bg-slate-950 p-3 rounded border border-slate-800 col-span-full">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Modalidade Envio (FLEX = +R$ 12,99)</span><label className="text-[10px] text-emerald-400 flex gap-1 cursor-pointer"><input type="checkbox" checked={mapCanal.usaFlex} onChange={e=>setMapCanal({...mapCanal, usaFlex: e.target.checked})}/> Possui Flex</label></div>
                  {mapCanal.usaFlex && <input type="text" value={mapCanal.envio} onChange={e=>setMapCanal({...mapCanal, envio: e.target.value})} className="w-32 bg-slate-900 border border-slate-700 text-center uppercase font-bold py-1 rounded text-sm"/>}
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl hover:bg-emerald-400 transition-all cursor-pointer shadow-lg">
            {loading ? 'Processando Painéis...' : 'Processar Dashboard e Calcular Liquidez'}
          </button>

        </form>

        {resultado && (
          <div className="space-y-6 pt-6 border-t border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800"><span className="text-xs text-slate-400 uppercase">Pedidos Validados</span><h3 className="text-2xl font-bold text-white mt-1">{resultado.totalVendasProcessadas}</h3></div>
              <div className="bg-slate-900 p-5 rounded-xl border border-emerald-900/50"><span className="text-xs text-slate-400 uppercase">Liquidez Total Acumulada</span><h3 className="text-2xl font-bold text-emerald-400 mt-1">R$ {resultado.liquidezTotalAcumulada.toFixed(2)}</h3></div>
            </div>
            
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-3 border-b border-slate-800 text-xs font-semibold">Resumo do Apuramento</div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase sticky top-0">
                    <tr>
                      <th className="p-2.5">Pedido</th><th className="p-2.5">Data</th><th className="p-2.5">SKU</th><th className="p-2.5 text-right">PDV</th><th className="p-2.5 text-right">Imposto</th><th className="p-2.5 text-right">Flex</th><th className="p-2.5 text-right">Custo Prod</th><th className="p-2.5 text-right font-bold text-emerald-400">Liquidez</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {resultado.dados.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-800/50">
                        <td className="p-2.5 font-mono">{item.numPedido}</td>
                        <td className="p-2.5">{item.data}</td>
                        <td className="p-2.5 font-mono">{item.sku}</td>
                        <td className="p-2.5 text-right">R$ {item.pdv.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-red-400">-R$ {item.imposto.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-red-400">-R$ {item.custoFlex.toFixed(2)}</td>
                        <td className="p-2.5 text-right text-red-400">-R$ {item.custoProduto.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">R$ {item.liquidezFinal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}