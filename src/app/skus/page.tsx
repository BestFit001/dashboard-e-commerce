'use client';
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import * as XLSX from 'xlsx';

export default function SkusPage() {
  const { products, setProducts, addLog } = useAppContext();

  const handleUploadCustos = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      
      const novosProdutos = rows.slice(1).map(row => {
        if (!row || !row.length) return null;
        return {
          sku: String(row[0] || '').trim().toUpperCase(),
          titulo: String(row[1] || 'Sem Título'),
          preco_custo: parseFloat(row[2]) || 0,
          custo_embalagem: parseFloat(row[3]) || 0,
          preco_venda: parseFloat(row[4]) || 0,
        };
      }).filter(p => p && p.sku);

      setProducts((prev: any) => {
        const filtrados = prev.filter((p: any) => !novosProdutos.find(n => n?.sku === p.sku));
        return [...novosProdutos, ...filtrados];
      });
      addLog(`${novosProdutos.length} SKUs atualizados via Base de Custos.`, 'success');
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Base de Custos & SKUs</h2>
          <p className="text-xs text-slate-400 mt-1">Colunas exigidas: A(SKU), B(Título), C(Custo Produto), D(Custo Embalagem), E(Preço Venda)</p>
        </div>
        <label className="cursor-pointer px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center">
          <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadCustos} />
          Importar Base de Custos (Excel)
        </label>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
            <tr><th className="py-3 px-4">SKU</th><th>Descrição</th><th>Custo Produto</th><th>Custo Embalagem</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
            {products.map((p: any) => (
              <tr key={p.sku} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-mono font-bold text-indigo-400">{p.sku}</td>
                <td>{p.titulo}</td>
                <td>R$ {p.preco_custo.toFixed(2)}</td>
                <td>R$ {p.custo_embalagem.toFixed(2)}</td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-500">Nenhuma Base de Custos importada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}