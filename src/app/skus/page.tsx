'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';

export default function SkusPage() {
  const { products, setProducts, addLog } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    sku: '', 
    titulo: '', 
    preco_custo: '', 
    custo_embalagem: '', 
    preco_venda: '' 
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.sku || !newProduct.titulo) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    const item = {
      sku: newProduct.sku.toUpperCase().trim(),
      titulo: newProduct.titulo.trim(),
      preco_custo: parseFloat(newProduct.preco_custo) || 0,
      custo_embalagem: parseFloat(newProduct.custo_embalagem) || 0,
      preco_venda: parseFloat(newProduct.preco_venda) || 0,
      faturamento: 0, 
      pedidos: 0
    };

    setProducts((prev: any[]) => [item, ...prev]);
    setShowModal(false);
    setNewProduct({ sku: '', titulo: '', preco_custo: '', custo_embalagem: '', preco_venda: '' });
    addLog(`Novo SKU [${item.sku}] cadastrado com sucesso.`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white">Cadastro de SKUs & Base de Custos</h2>
          <p className="text-xs text-slate-400 mt-0.5">Gerencie os custos unitários de produtos e embalagens para o abatimento no lucro líquido.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
        >
          <i className="fa-solid fa-plus mr-1.5"></i> Novo SKU
        </button>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Descrição</th>
              <th className="py-3 px-4">Custo Produto</th>
              <th className="py-3 px-4">Custo Embalagem</th>
              <th className="py-3 px-4 text-right">Preço Venda Padrão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">Nenhum SKU cadastrado até o momento.</td>
              </tr>
            ) : (
              products.map((p: any) => (
                <tr key={p.sku} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-400">{p.sku}</td>
                  <td className="py-3 px-4 text-slate-200">{p.titulo}</td>
                  <td className="py-3 px-4">R$ {Number(p.preco_custo || 0).toFixed(2)}</td>
                  <td className="py-3 px-4">R$ {Number(p.custo_embalagem || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400">R$ {Number(p.preco_venda || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Modal de Cadastro de SKU */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
             <div className="flex justify-between items-center border-b border-slate-800 pb-3">
               <h3 className="font-bold text-white text-base">Cadastrar Novo SKU</h3>
               <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                 <i className="fa-solid fa-xmark"></i>
               </button>
             </div>

             <form onSubmit={handleCreateProduct} className="space-y-3">
               <div>
                 <label className="block text-xs font-bold text-slate-400 mb-1">SKU *</label>
                 <input 
                   type="text" 
                   placeholder="Ex: SKU-001" 
                   required 
                   value={newProduct.sku}
                   onChange={e => setNewProduct({...newProduct, sku: e.target.value})} 
                   className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white uppercase font-mono" 
                 />
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-400 mb-1">Descrição / Título *</label>
                 <input 
                   type="text" 
                   placeholder="Ex: Tapete de Yoga" 
                   required 
                   value={newProduct.titulo}
                   onChange={e => setNewProduct({...newProduct, titulo: e.target.value})} 
                   className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" 
                 />
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-400 mb-1">Custo Produto (R$) *</label>
                   <input 
                     type="number" 
                     step="0.01" 
                     placeholder="0.00" 
                     required 
                     value={newProduct.preco_custo}
                     onChange={e => setNewProduct({...newProduct, preco_custo: e.target.value})} 
                     className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" 
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 mb-1">Custo Embalagem (R$)</label>
                   <input 
                     type="number" 
                     step="0.01" 
                     placeholder="0.00" 
                     value={newProduct.custo_embalagem}
                     onChange={e => setNewProduct({...newProduct, custo_embalagem: e.target.value})} 
                     className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" 
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-400 mb-1">Preço Venda Padrão (R$) *</label>
                 <input 
                   type="number" 
                   step="0.01" 
                   placeholder="0.00" 
                   required 
                   value={newProduct.preco_venda}
                   onChange={e => setNewProduct({...newProduct, preco_venda: e.target.value})} 
                   className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" 
                 />
               </div>

               <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
                 <button 
                   type="button" 
                   onClick={() => setShowModal(false)} 
                   className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="submit" 
                   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-lg transition"
                 >
                   Salvar SKU
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}