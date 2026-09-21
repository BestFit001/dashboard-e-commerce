'use client';

import { useState } from 'react';

export default function Home() {
  // Estados para os arquivos
  const [fileFaturados, setFileFaturados] = useState<File | null>(null);
  const [fileCancelados, setFileCancelados] = useState<File | null>(null);
  const [fileCustos, setFileCustos] = useState<File | null>(null);
  const [fileCanal, setFileCanal] = useState<File | null>(null);

  // Mapeamento de Colunas e Checkboxes de "Possui / Não Possui"
  const [mapping, setMapping] = useState({
    faturadosPedido: 'A',
    faturadosData: 'B',
    canceladosPedido: 'A',
    colPedido: 'A',
    colPdv: 'I',
    usaPdv: true,
    colFrete: 'N',
    usaFrete: true,
    colRebate: 'Q',
    usaRebate: true,
    colLiquido: 'S',
    usaLiquido: true,
    colSku: 'W',
    colEnvio: 'AR',
    usaFlex: true,
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
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const res = await fetch('/api/processar-vendas', {
        method: 'POST',
        body: formData,
      });

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
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">Dashboard de E-commerce & Liquidez</h1>
          <p className="text-sm text-slate-400 mt-1">Gestão de faturamento, cruzamento de custos e apuração de margem líquida por canal.</p>
        </header>

        {erro && (
          <div className="bg-red-950/50 border border-red-800 text-red-200 p-4 rounded-lg text-sm">
            {erro}
          </div>
        )}

        {/* Formulário Principal */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Seção 1: Upload de Arquivos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <h2 className="text-lg font-semibold col-span-full text-emerald-400">1. Upload de Planilhas Base e Canal</h2>
            
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Planilha de Produtos Faturados (Obrigatório)</label>
              <input type="file" accept=".csv, .xlsx" onChange={(e) => setFileFaturados(e.target.files?.[0] || null)} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"/>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Planilha de Pedidos Cancelados (Opcional)</label>
              <input type="file" accept=".csv, .xlsx" onChange={(e) => setFileCancelados(e.target.files?.[0] || null)} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-100 hover:file:bg-slate-600 cursor-pointer"/>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Base de Custos [SKU, Nome, Custo, Embalagem] (Obrigatório)</label>
              <input type="file" accept=".csv, .xlsx" onChange={(e) => setFileCustos(e.target.files?.[0] || null)} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"/>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Planilha de Vendas do Canal - ex: Mercado Livre (Obrigatório)</label>
              <input type="file" accept=".csv, .xlsx" onChange={(e) => setFileCanal(e.target.files?.[0] || null)} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"/>
            </div>
          </div>

          {/* Seção 2: Mapeamento Dinâmico de Colunas */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-lg font-semibold text-emerald-400">2. Mapeamento de Colunas do Canal</h2>
            <p className="text-xs text-slate-400">Informe a letra da coluna correspondente ou desmarque a caixinha caso o canal não possua o campo.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              
              {/* Coluna Número Pedido */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <label className="block text-xs text-slate-400 mb-1">Número do Pedido</label>
                <input type="text" value={mapping.colPedido} onChange={(e) => setMapping({...mapping, colPedido: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm uppercase text-center font-bold"/>
              </div>

              {/* Coluna SKU */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <label className="block text-xs text-slate-400 mb-1">SKU do Produto</label>
                <input type="text" value={mapping.colSku} onChange={(e) => setMapping({...mapping, colSku: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm uppercase text-center font-bold"/>
              </div>

              {/* Coluna PDV */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Valor PDV (Imposto 9%)</label>
                  <label className="text-xs text-emerald-400 flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={mapping.usaPdv} onChange={(e) => setMapping({...mapping, usaPdv: e.target.checked})}/> Possui
                  </label>
                </div>
                {mapping.usaPdv && (
                  <input type="text" value={mapping.colPdv} onChange={(e) => setMapping({...mapping, colPdv: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm uppercase text-center font-bold"/>
                )}
              </div>

              {/* Coluna Frete */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Valor Frete</label>
                  <label className="text-xs text-emerald-400 flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={mapping.usaFrete} onChange={(e) => setMapping({...mapping, usaFrete: e.target.checked})}/> Possui
                  </label>
                </div>
                {mapping.usaFrete && (
                  <input type="text" value={mapping.colFrete} onChange={(e) => setMapping({...mapping, colFrete: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm uppercase text-center font-bold"/>
                )}
              </div>

              {/* Coluna Rebate */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Rebate / Bônus</label>
                  <label className="text-xs text-emerald-400 flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={mapping.usaRebate} onChange={(e) => setMapping({...mapping, usaRebate: e.target.checked})}/> Possui
                  </label>
                </div>
                {mapping.usaRebate && (
                  <input type="text" value={mapping.colRebate} onChange={(e) => setMapping({...mapping, colRebate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm uppercase text-center font-bold"/>
                )}
              </div>

              {/* Coluna Líquido */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Líquido Recebido</label>
                  <label className="text-xs text-emerald-400 flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={mapping.usaLiquido} onChange={(e) => setMapping({...mapping, usaLiquido: e.target.checked})}/> Possui
                  </label>
                </div>
                {mapping.usaLiquido && (
                  <input type="text" value={mapping.colLiquido} onChange={(e) => setMapping({...mapping, colLiquido: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm uppercase text-center font-bold"/>
                )}
              </div>

              {/* Coluna Envio Flex */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 col-span-full sm:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-400">Método de Envio (Aplica R$ 12,99 se contiver "FLEX")</label>
                  <label className="text-xs text-emerald-400 flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={mapping.usaFlex} onChange={(e) => setMapping({...mapping, usaFlex: e.target.checked})}/> Possui Flex
                  </label>
                </div>
                {mapping.usaFlex && (
                  <input type="text" value={mapping.colEnvio} onChange={(e) => setMapping({...mapping, colEnvio: e.target.value})} className="w-32 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm uppercase text-center font-bold"/>
                )}
              </div>

            </div>
          </div>

          {/* Botão Executar */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 px-6 rounded-xl font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            {loading ? 'Processando e Cruzando Dados...' : 'Processar Dashboard e Calcular Liquidez'}
          </button>

        </form>

        {/* Seção 3: Resultados */}
        {resultado && (
          <div className="space-y-6 pt-6 border-t border-slate-800 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <span className="text-xs uppercase text-slate-400">Total de Pedidos Validados</span>
                <h3 className="text-3xl font-extrabold text-white mt-1">{resultado.totalVendasProcessadas}</h3>
              </div>
              <div className="bg-slate-900 border border-emerald-900/50 p-6 rounded-xl">
                <span className="text-xs uppercase text-slate-400">Liquidez Total Acumulada</span>
                <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">
                  R$ {resultado.liquidezTotalAcumulada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            {/* Tabela de Detalhes */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 font-semibold text-sm">Detalhamento por Venda</div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="p-3">Pedido</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-right">PDV</th>
                      <th className="p-3 text-right">Imposto (9%)</th>
                      <th className="p-3 text-right">Custo Flex</th>
                      <th className="p-3 text-right">Custo Prod+Emb</th>
                      <th className="p-3 text-right font-bold text-emerald-400">Liquidez Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {resultado.dados.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono">{item.numPedido}</td>
                        <td className="p-3">{item.data}</td>
                        <td className="p-3 font-mono">{item.sku}</td>
                        <td className="p-3 truncate max-w-xs">{item.nomeProduto}</td>
                        <td className="p-3 text-right">R$ {item.pdv.toFixed(2)}</td>
                        <td className="p-3 text-right text-red-400">- R$ {item.imposto.toFixed(2)}</td>
                        <td className="p-3 text-right text-red-400">- R$ {item.custoFlex.toFixed(2)}</td>
                        <td className="p-3 text-right text-red-400">- R$ {item.custoProduto.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">R$ {item.liquidezFinal.toFixed(2)}</td>
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