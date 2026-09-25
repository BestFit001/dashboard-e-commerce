'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function SkusPage() {
  const { products, setProducts, addLog } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newProduct, setNewProduct] = useState({ sku: '', titulo: '', preco_custo: '', custo_embalagem: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const openNewModal = () => { setNewProduct({ sku: '', titulo: '', preco_custo: '', custo_embalagem: '' }); setIsEditing(false); setShowModal(true); };
  const openEditModal = (prod: any) => { setNewProduct({ sku: prod.sku, titulo: prod.titulo, preco_custo: String(prod.preco_custo), custo_embalagem: String(prod.custo_embalagem) }); setIsEditing(true); setShowModal(true); };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    const item = {
      sku: newProduct.sku.toUpperCase(),
      titulo: newProduct.titulo,
      preco_custo: parseFloat(newProduct.preco_custo) || 0,
      custo_embalagem: parseFloat(newProduct.custo_embalagem) || 0
    };

    // Salva no Supabase
    const { error } = await supabase.from('tb_produtos').upsert([item], { onConflict: 'sku' });
    
    if (error) {
      addLog(`Erro ao salvar no banco: ${error.message}`, 'error');
    } else {
      if (isEditing) {
        setProducts((prev: any[]) => prev.map(p => p.sku === item.sku ? item : p));
        addLog(`SKU [${item.sku}] atualizado com sucesso.`, 'success');
      } else {
        if (!products.some((p: any) => p.sku === item.sku)) {
          setProducts((prev: any[]) => [item, ...prev]);
        }
        addLog(`Novo SKU [${item.sku}] cadastrado.`, 'success');
      }
      setShowModal(false);
    }
    setIsProcessing(false);
  };

  const handleDeleteProduct = async (sku: string) => {
    if (confirm(`Tem a certeza que deseja excluir o SKU: ${sku}?`)) {
      const { error } = await supabase.from('tb_produtos').delete().eq('sku', sku);
      if (error) {
        addLog(`Erro ao excluir: ${error.message}`, 'error');
      } else {
        setProducts((prev: any[]) => prev.filter(p => p.sku !== sku));
        addLog(`SKU [${sku}] removido da base de dados.`, 'warning');
      }
    }
  };

  const handleUploadCustos = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        
        const novosCustos: any[] = [];
        rows.slice(1).forEach((r) => {
          if (!r[0]) return;
          novosCustos.push({
            sku: String(r[0]).trim().toUpperCase(),
            titulo: String(r[1] || 'Produto Importado'),
            preco_custo: parseFloat(r[2]) || 0,
            custo_embalagem: parseFloat(r[3]) || 0
          });
        });

        // Gravação em lote no Supabase
        const { error } = await supabase.from('tb_produtos').upsert(novosCustos, { onConflict: 'sku' });
        
        if (error) throw error;

        setProducts((prev: any[]) => {
          const map = new Map(prev.map(p => [p.sku, p]));
          novosCustos.forEach(nc => map.set(nc.sku, nc));
          return Array.from(map.values());
        });

        addLog(`Sincronização concluída: ${novosCustos.length} SKUs importados para o Supabase.`, 'success');
      } catch (err: any) {
        addLog(`Erro ao importar custos: ${err.message}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Cadastro de SKUs & Base de Custos</h2>
          <p className="text-xs text-slate-400 mt-0.5">Sincronizado em tempo real com o banco de dados.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className={`cursor-pointer px-4 py-2 border border-slate-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition text-center flex-1 sm:flex-none ${isProcessing ? 'bg-slate-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
            <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadCustos} disabled={isProcessing} />
            <i className={`fa-solid ${isProcessing ? 'fa-spinner fa-spin' : 'fa-file-arrow-up'} mr-2`}></i>Importar Custos
          </label>
          <button onClick={openNewModal} disabled={isProcessing} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex-1 sm:flex-none">
            <i className="fa-solid fa-plus mr-2"></i>Novo SKU
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Descrição</th>
              <th className="py-3 px-4">Custo Produto</th>
              <th className="py-3 px-4">Custo Embalagem</th>
              <th className="py-3 px-4 text-right">Custo Total Unitário</th>
              <th className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
            {products.map((p: any) => (
              <tr key={p.sku} className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-mono font-bold text-indigo-400">{p.sku}</td>
                <td className="py-3 px-4 text-slate-200">{p.titulo}</td>
                <td className="py-3 px-4">R$ {(p.preco_custo || 0).toFixed(2)}</td>
                <td className="py-3 px-4">R$ {(p.custo_embalagem || 0).toFixed(2)}</td>
                <td className="py-3 px-4 text-right font-bold text-amber-400">R$ {((p.preco_custo || 0) + (p.custo_embalagem || 0)).toFixed(2)}</td>
                <td className="py-3 px-4 flex justify-center gap-2">
                  <button onClick={() => openEditModal(p)} className="text-slate-400 hover:text-indigo-400 transition" title="Editar"><i className="fa-solid fa-pen-to-square"></i></button>
                  <button onClick={() => handleDeleteProduct(p.sku)} className="text-slate-400 hover:text-rose-400 transition" title="Excluir"><i className="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
             <div className="flex justify-between items-center border-b border-slate-800 pb-3">
               <h3 className="font-bold text-white text-base">{isEditing ? 'Editar SKU' : 'Cadastrar Novo SKU'}</h3>
               <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
             </div>
             <form onSubmit={handleSaveProduct} className="space-y-3">
               <div>
                 <label className="block text-xs font-bold text-slate-400 mb-1">SKU *</label>
                 <input type="text" required value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} disabled={isEditing} className={`w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white uppercase font-mono ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`} />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-400 mb-1">Descrição / Título *</label>
                 <input type="text" required value={newProduct.titulo} onChange={e => setNewProduct({...newProduct, titulo: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-400 mb-1">Custo Produto (R$) *</label>
                   <input type="number" step="0.01" required value={newProduct.preco_custo} onChange={e => setNewProduct({...newProduct, preco_custo: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 mb-1">Custo Embalagem (R$)</label>
                   <input type="number" step="0.01" value={newProduct.custo_embalagem} onChange={e => setNewProduct({...newProduct, custo_embalagem: e.target.value})} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
                 </div>
               </div>
               <div className="flex gap-2 justify-end pt-3">
                 <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition">Cancelar</button>
                 <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">{isProcessing ? 'A salvar...' : 'Salvar SKU'}</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}