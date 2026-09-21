'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function Home() {
  const [colunas, setColunas] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mapeamento, setMapeamento] = useState({
    sku: '',
    precoVenda: '',
    frete: '',
    comissao: '',
    rebate: '',
  });
  const [resultado, setResultado] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Lê o arquivo localmente para extrair os cabeçalhos das colunas
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file);

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (json.length > 0) {
      setColunas(json[0] as string[]);
    }
  };

  const processarPlanilha = async () => {
    if (!arquivo) return alert('Selecione uma planilha primeiro.');
    setCarregando(true);

    const formData = new FormData();
    formData.append('file', arquivo);
    formData.append('mapping', JSON.stringify(mapeamento));

    const res = await fetch('/api/processar-vendas', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setCarregando(false);

    if (data.sucesso) {
      setResultado(data.dados);
    } else {
      alert('Erro: ' + data.erro);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-400">Dashboard de E-commerce & Liquidez</h1>
          <p className="text-slate-400 text-sm mt-1">Importação multi-canais, mapeamento dinâmico e cruzamento de custos.</p>
        </header>

        {/* Bloco de Upload */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">1. Upload da Planilha do Canal (CSV / XLSX)</h2>
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
          />
        </div>

        {/* Bloco de Mapeamento de Colunas */}
        {colunas.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-semibold">2. Mapeamento de Colunas do Canal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(mapeamento).map((campo) => (
                <div key={campo} className="space-y-1">
                  <label className="text-xs font-medium uppercase text-slate-400 tracking-wider">
                    {campo === 'sku' ? 'Código SKU' : campo === 'precoVenda' ? 'Preço de Venda' : campo}
                  </label>
                  <select 
                    value={(mapeamento as any)[campo]}
                    onChange={(e) => setMapeamento({ ...mapeamento, [campo]: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Selecione a coluna...</option>
                    {colunas.map((col, idx) => (
                      <option key={idx} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button 
              onClick={processarPlanilha}
              disabled={carregando}
              className="w-full bg-emerald-600 hover:bg-emerald-500 transition font-semibold py-3 rounded-lg text-white shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {carregando ? 'A processar dados...' : 'Processar e Calcular Liquidez'}
            </button>
          </div>
        )}

        {/* Tabela de Resultados Prévia */}
        {resultado.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold">3. Prévia Consolidada ({resultado.length} registos)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-3">SKU</th>
                    <th className="p-3">Preço Venda</th>
                    <th className="p-3">Frete</th>
                    <th className="p-3">Comissão</th>
                    <th className="p-3">Rebate</th>
                    <th className="p-3 text-emerald-400">Líquido Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.slice(0, 10).map((row) => (
                    <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-xs">{row.sku}</td>
                      <td className="p-3">R$ {row.precoVenda.toFixed(2)}</td>
                      <td className="p-3 text-red-400">R$ {row.frete.toFixed(2)}</td>
                      <td className="p-3 text-red-400">R$ {row.comissao.toFixed(2)}</td>
                      <td className="p-3 text-red-400">R$ {row.rebate.toFixed(2)}</td>
                      <td className="p-3 font-bold text-emerald-400">R$ {row.liquidoEstimado.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}