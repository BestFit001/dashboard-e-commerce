'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function SkusPage() {
  const { products, setProducts, addLog } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newProduct, setNewProduct] = useState({ sku: '', titulo: '', preco_custo: '', custo_embalagem: '', preco_venda: '' });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const itemDB = {
      sku: newProduct.sku.toUpperCase(),
      titulo: newProduct.titulo,
      preco_custo: parseFloat(newProduct.preco_custo) || 0,
      custo_embalagem: parseFloat(newProduct.custo_embalagem) || 0,
      preco_venda: parseFloat(newProduct.preco_venda) || 0
    };

    // Salva no banco de dados
    const { error } = await supabase.from('tb_produtos').insert([itemDB]);

    setIsSaving(false);

    if (error) {
      addLog(`Erro ao salvar SKU no banco: ${error.message}`, 'error');
      return;
    }

    // Atualiza a tela após confirmação do Supabase
    setProducts((prev: any[]) => [{ ...itemDB, faturamento: 0, pedidos: 0 }, ...prev]);
    setShowModal(false);
    setNewProduct({ sku: '', titulo: '', preco_custo: '', custo_embalagem: '', preco_venda: '' });
    addLog(`Novo SKU [${itemDB.sku}] cadastrado no Supabase.`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold text-white">Cadastro de SKUs & Base de Custos</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-indigo-600 text-white font-extrabold text-xs rounded-xl">Novo SKU</button>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
            <tr><th className="py-3 px-4">SKU</th><th>Descrição</th><th>Custo Produto</th><th>Custo Embalagem</th><th>Preço Venda</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
            {products.map((p: any) => (
              <tr key={p.sku} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-mono font-bold text-indigo-400">{p.sku}</td>
                <td>{p.titulo}</td>
                <td>R$ {Number(p.preco_custo).toFixed(2)}</td>
                <td>R$ {Number(p.custo_embalagem).toFixed(2)}</td>
                <td>R$ {Number(p.preco_venda).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6">
             <h3 className="font-bold text-white mb-4">Novo SKU</h3>
             <form onSubmit={handleCreateProduct} className="space-y-3">
               <input type="text" placeholder="SKU" required value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
               <input type="text" placeholder="Descrição" required value={newProduct.titulo} onChange={e => setNewProduct({...newProduct, titulo: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
               <input type="number" step="0.01" placeholder="Custo Produto" required value={newProduct.preco_custo} onChange={e => setNewProduct({...newProduct, preco_custo: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
               <input type="number" step="0.01" placeholder="Custo Embalagem" value={newProduct.custo_embalagem} onChange={e => setNewProduct({...newProduct, custo_embalagem: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
               <input type="number" step="0.01" placeholder="Preço de Venda" required value={newProduct.preco_venda} onChange={e => setNewProduct({...newProduct, preco_venda: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
               <div className="flex gap-2 justify-end mt-4">
                 <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs">Cancelar</button>
                 <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs">{isSaving ? 'A guardar...' : 'Salvar no Supabase'}</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}