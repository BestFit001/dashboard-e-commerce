'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function SkusPage() {
  const { products, setProducts, addLog } = useAppContext();
  const [skuInput, setSkuInput] = useState('');
  const [custoInput, setCustoInput] = useState('');
  const [embalagemInput, setEmbalagemInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const handleAddOrUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuInput.trim() || !custoInput) return;

    const newSku = skuInput.trim().toUpperCase();
    const custo = Number(custoInput) || 0;
    const embalagem = Number(embalagemInput) || 0;

    const updatedList = products.filter((p: any) => p.sku !== newSku);
    const newProduct = { sku: newSku, preco_custo: custo, custo_embalagem: embalagem };
    const finalProducts = [newProduct, ...updatedList];

    setProducts(finalProducts);
    addLog(`SKU [${newSku}] atualizado com Custo R$ ${custo} e Embalagem R$ ${embalagem}.`, 'success');

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        await supabase.from('tb_produtos').upsert([{ sku: newSku, preco_custo: custo, custo_embalagem: embalagem }], { onConflict: 'sku' });
      }
    } catch (err) {
      console.error(err);
    }

    setSkuInput('');
    setCustoInput('');
    setEmbalagemInput('');
  };

  const filteredProducts = products.filter((p: any) => p.sku.toUpperCase().includes(searchFilter.toUpperCase()));

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Gestão de SKUs, Custos & Embalagens</h2>
          <p className="text-xs text-slate-400 mt-0.5">Defina os custos unitários de fabrico/aquisição e embalagem para cálculo do Lucro Real.</p>
        </div>
        <input 
          type="text" 
          placeholder="Pesquisar SKU..." 
          value={searchFilter} 
          onChange={e => setSearchFilter(e.target.value)} 
          className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 w-full md:w-64"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-fit space-y-4">
          <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">Adicionar / Atualizar SKU</h3>
          <form onSubmit={handleAddOrUpdateProduct} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Código SKU:</label>
              <input type="text" placeholder="Ex: TOP-FIT-PRETO-M" value={skuInput} onChange={e => setSkuInput(e.target.value)} required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Preço de Custo (R$):</label>
              <input type="number" step="0.01" placeholder="0.00" value={custoInput} onChange={e => setCustoInput(e.target.value)} required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-bold focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Custo de Embalagem (R$):</label>
              <input type="number" step="0.01" placeholder="0.00" value={embalagemInput} onChange={e => setEmbalagemInput(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-bold focus:outline-none focus:border-indigo-500" />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition">
              Guardar / Atualizar Custo
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">SKUs Cadastrados ({filteredProducts.length})</h3>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold sticky top-0 border-b border-slate-800">
                <tr><th className="py-3 pl-3">SKU</th><th>Custo Unitário</th><th>Embalagem</th><th className="text-right pr-3">Custo Total (CMV)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredProducts.map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-3 pl-3 font-mono font-bold text-indigo-400">{p.sku}</td>
                    <td className="py-3 text-amber-400 font-bold">R$ {Number(p.preco_custo || 0).toFixed(2)}</td>
                    <td className="py-3 text-indigo-300 font-bold">R$ {Number(p.custo_embalagem || 0).toFixed(2)}</td>
                    <td className="py-3 pr-3 text-right font-black text-white">R$ {(Number(p.preco_custo || 0) + Number(p.custo_embalagem || 0)).toFixed(2)}</td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum SKU registado. Adicione o primeiro ao lado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}