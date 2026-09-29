'use client';
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function SkusPage() {
  const { products, setProducts, addLog } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newProduct, setNewProduct] = useState({ sku: '', titulo: '', marca: '', preco_custo: '', custo_embalagem: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Estados para Busca, Filtro e Paginação (agora 20 por página)
  const [searchSku, setSearchSku] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('TODAS');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Extrair lista única de marcas da base de SKUs
  const availableBrands = useMemo(() => {
    const brands = new Set(products.map((p: any) => p.marca?.trim()).filter(Boolean));
    return ['TODAS', ...Array.from(brands).sort()];
  }, [products]);

  // Filtragem por SKU, Título ou Marca
  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchesSearch = !searchSku.trim() || 
        p.sku.toLowerCase().includes(searchSku.toLowerCase()) || 
        (p.titulo && p.titulo.toLowerCase().includes(searchSku.toLowerCase())) ||
        (p.marca && p.marca.toLowerCase().includes(searchSku.toLowerCase()));
        
      const matchesBrand = selectedBrand === 'TODAS' || p.marca === selectedBrand;

      return matchesSearch && matchesBrand;
    });
  }, [products, searchSku, selectedBrand]);

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Exportar base atual para Excel
  const handleExportData = () => {
    if (products.length === 0) return alert('Não há SKUs para exportar.');
    
    // Formata os dados para o padrão que a importação espera ler
    const dataToExport = products.map(p => ({
      'SKU': p.sku,
      'Título do Produto': p.titulo,
      'Custo Prod.': p.preco_custo,
      'Custo Emb.': p.custo_embalagem,
      'Marca': p.marca || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Base de SKUs");
    XLSX.writeFile(wb, "Base_Custos_SKUs.xlsx");
    addLog('Base de SKUs exportada para Excel com sucesso.', 'info');
  };

  // Resetar (Apagar) toda a base de SKUs
  const handleResetDatabase = async () => {
    const confirm1 = confirm("ATENÇÃO: Tem a certeza absoluta que deseja APAGAR TODOS os SKUs da base de dados?");
    if (!confirm1) return;
    
    const confirm2 = prompt("Esta ação é irreversível. Para confirmar, escreva APAGAR no campo abaixo:");
    if (confirm2 !== 'APAGAR') {
       alert('Ação cancelada.');
       return;
    }

    try {
      // O Supabase exige um filtro para deletar. Utilizar um neq com um valor impossível apaga tudo.
      const { error } = await supabase.from('tb_produtos').delete().neq('sku', 'VALOR_FALSO_PARA_APAGAR_TUDO');
      if (error) throw error;

      setProducts([]);
      addLog('A base de SKUs foi completamente apagada.', 'warning');
      alert('Base de SKUs apagada com sucesso!');
    } catch (err: any) {
      addLog(`Erro ao limpar a base: ${err.message}`, 'error');
      alert(`Falha ao apagar: ${err.message}`);
    }
  };

  // Abertura do modal para criar novo
  const openNewModal = () => {
    setNewProduct({ sku: '', titulo: '', marca: '', preco_custo: '', custo_embalagem: '' });
    setIsEditing(false);
    setShowModal(true);
  };

  // Abertura do modal para editar
  const openEditModal = (prod: any) => {
    setNewProduct({
      sku: prod.sku,
      titulo: prod.titulo,
      marca: prod.marca || '',
      preco_custo: String(prod.preco_custo),
      custo_embalagem: String(prod.custo_embalagem)
    });
    setIsEditing(true);
    setShowModal(true);
  };

  // Salvar Produto no Supabase (Novo ou Edição)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const item = {
      sku: newProduct.sku.toUpperCase().trim(),
      titulo: newProduct.titulo.trim(),
      marca: newProduct.marca.trim(),
      preco_custo: parseFloat(String(newProduct.preco_custo).replace(',', '.')) || 0,
      custo_embalagem: parseFloat(String(newProduct.custo_embalagem).replace(',', '.')) || 0
    };

    try {
      const { error } = await supabase.from('tb_produtos').upsert([item]);
      if (error) throw error;

      if (isEditing) {
        setProducts((prev: any[]) => prev.map(p => p.sku === item.sku ? item : p));
        addLog(`SKU [${item.sku}] atualizado com sucesso no banco de dados.`, 'success');
      } else {
        setProducts((prev: any[]) => [item, ...prev]);
        addLog(`Novo SKU [${item.sku}] gravado no banco de dados.`, 'success');
      }
      setShowModal(false);
    } catch (err: any) {
      addLog(`Erro ao salvar SKU no banco: ${err.message}`, 'error');
      alert(`Falha ao gravar no Supabase: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir Produto único do Supabase
  const handleDeleteProduct = async (sku: string) => {
    if (confirm(`Tem a certeza que deseja apagar definitivamente o SKU: ${sku}?`)) {
      try {
        const { error } = await supabase.from('tb_produtos').delete().eq('sku', sku);
        if (error) throw error;

        setProducts((prev: any[]) => prev.filter(p => p.sku !== sku));
        addLog(`SKU [${sku}] apagado da nuvem.`, 'warning');
      } catch (err: any) {
        alert(`Falha ao apagar: ${err.message}`);
      }
    }
  };

  // Importação em Massa
  const handleUploadCustos = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    
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
            titulo: String(r[1] || 'Produto Importado').trim(),
            preco_custo: parseFloat(String(r[2]).replace(',', '.')) || 0,
            custo_embalagem: parseFloat(String(r[3]).replace(',', '.')) || 0,
            marca: r[4] ? String(r[4]).trim() : '' // Lendo a marca da Coluna E
          });
        });

        if(novosCustos.length === 0) return;

        addLog(`A enviar ${novosCustos.length} SKUs em lotes para o Supabase...`, 'info');

        const chunkSize = 500;
        for (let i = 0; i < novosCustos.length; i += chunkSize) {
          const chunk = novosCustos.slice(i, i + chunkSize);
          const { error } = await supabase.from('tb_produtos').upsert(chunk);
          if (error) throw error;
        }

        setProducts((prev: any[]) => {
          const map = new Map(prev.map(p => [p.sku, p]));
          novosCustos.forEach(nc => map.set(nc.sku, nc));
          return Array.from(map.values());
        });

        addLog(`Importação concluída: ${novosCustos.length} SKUs sincronizados na Nuvem.`, 'success');
        alert(`Sucesso! Todos os ${novosCustos.length} SKUs foram guardados.`);
      } catch (err: any) {
        alert(`Erro na importação: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Cadastro de SKUs & Base de Custos</h2>
          <p className="text-xs text-emerald-400 font-bold mt-0.5">
            <i className="fa-solid fa-cloud"></i> Sincronizado em tempo real com o banco de dados (Supabase) | Total: {products.length}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Filtro de Marca */}
          <div className="flex gap-2 items-center bg-slate-950 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
            <i className="fa-solid fa-tag text-emerald-400 pl-2 text-xs"></i>
            <select 
              value={selectedBrand} 
              onChange={(e) => { setSelectedBrand(e.target.value); setCurrentPage(1); }} 
              className="bg-transparent text-emerald-300 font-bold text-xs focus:outline-none pr-1 cursor-pointer w-full sm:w-32"
            >
              {availableBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <input 
            type="text" 
            placeholder="Buscar SKU ou Título..." 
            value={searchSku} 
            onChange={e => { setSearchSku(e.target.value); setCurrentPage(1); }} 
            className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-indigo-500 w-full sm:w-48" 
          />
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleResetDatabase} className="px-3.5 py-2.5 bg-rose-950/40 hover:bg-rose-900 text-rose-400 border border-rose-900 font-bold text-xs rounded-xl transition" title="Apagar Base Inteira">
              <i className="fa-solid fa-trash"></i>
            </button>
            <button onClick={handleExportData} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl transition flex-1 sm:flex-none">
              <i className="fa-solid fa-download mr-1"></i> Exportar
            </button>
            <label className="cursor-pointer px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition text-center flex-1 sm:flex-none">
              <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadCustos} />
              <i className="fa-solid fa-upload mr-1"></i> Importar
            </label>
            <button onClick={openNewModal} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex-1 sm:flex-none">
              <i className="fa-solid fa-plus mr-1"></i> Novo SKU
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="py-4 px-5">SKU</th>
                <th className="py-4 px-5">Descrição</th>
                <th className="py-4 px-5">Marca</th>
                <th className="py-4 px-5">Custo Produto</th>
                <th className="py-4 px-5">Custo Embalagem</th>
                <th className="py-4 px-5 text-right">Custo Total Unitário</th>
                <th className="py-4 px-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {paginatedProducts.length > 0 ? paginatedProducts.map((p: any) => (
                <tr key={p.sku} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-5 font-mono font-bold text-indigo-400">{p.sku}</td>
                  <td className="py-3 px-5 text-slate-200">{p.titulo}</td>
                  <td className="py-3 px-5 text-slate-300">{p.marca || '-'}</td>
                  <td className="py-3 px-5">R$ {(p.preco_custo || 0).toFixed(2).replace('.', ',')}</td>
                  <td className="py-3 px-5">R$ {(p.custo_embalagem || 0).toFixed(2).replace('.', ',')}</td>
                  <td className="py-3 px-5 text-right font-black text-amber-400">R$ {((p.preco_custo || 0) + (p.custo_embalagem || 0)).toFixed(2).replace('.', ',')}</td>
                  <td className="py-3 px-5 flex justify-center gap-3">
                    <button onClick={() => openEditModal(p)} className="text-slate-400 hover:text-indigo-400 transition" title="Editar">
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onClick={() => handleDeleteProduct(p.sku)} className="text-slate-400 hover:text-rose-400 transition" title="Excluir">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-bold">
                    Nenhum SKU encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginação (20 por página) */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-slate-800 text-xs">
            <span className="text-slate-400">Página {currentPage} de {totalPages} ({filteredProducts.length} SKUs encontrados)</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-slate-950 border border-slate-700 hover:bg-slate-800 rounded-lg text-slate-300 disabled:opacity-40 transition font-bold">Anterior</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-slate-950 border border-slate-700 hover:bg-slate-800 rounded-lg text-slate-300 disabled:opacity-40 transition font-bold">Próxima</button>
            </div>
          </div>
        )}
      </div>
      
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
             <div className="flex justify-between items-center border-b border-slate-800 pb-3">
               <h3 className="font-bold text-white text-base">{isEditing ? 'Editar SKU' : 'Cadastrar Novo SKU'}</h3>
               <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
             </div>
             <form onSubmit={handleSaveProduct} className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-400 mb-1">CÓDIGO SKU *</label>
                 <input 
                   type="text" 
                   required 
                   value={newProduct.sku} 
                   onChange={e => setNewProduct({...newProduct, sku: e.target.value})} 
                   disabled={isEditing} 
                   className={`w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white uppercase font-mono focus:border-indigo-500 focus:outline-none ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`} 
                 />
                 {isEditing && <span className="text-[10px] text-amber-400 mt-1 block">Não é possível alterar o código de um SKU já criado.</span>}
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 <div className="col-span-2">
                   <label className="block text-xs font-bold text-slate-400 mb-1">Título do Produto *</label>
                   <input type="text" required value={newProduct.titulo} onChange={e => setNewProduct({...newProduct, titulo: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none" />
                 </div>
                 
                 <div className="col-span-2">
                   <label className="block text-xs font-bold text-slate-400 mb-1">Marca</label>
                   <input type="text" value={newProduct.marca} onChange={e => setNewProduct({...newProduct, marca: e.target.value})} placeholder="Ex: Farm, Speedo, Só Dança..." className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none" />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-400 mb-1">Custo Prod. (R$) *</label>
                   <input type="text" required value={newProduct.preco_custo} onChange={e => setNewProduct({...newProduct, preco_custo: e.target.value})} placeholder="0,00" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:border-indigo-500 focus:outline-none" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 mb-1">Embalagem (R$)</label>
                   <input type="text" value={newProduct.custo_embalagem} onChange={e => setNewProduct({...newProduct, custo_embalagem: e.target.value})} placeholder="0,00" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:border-indigo-500 focus:outline-none" />
                 </div>
               </div>
               <div className="flex gap-2 justify-end pt-4">
                 <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition">Cancelar</button>
                 <button type="submit" disabled={isSaving} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition text-white shadow-lg ${isSaving ? 'bg-indigo-800 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'}`}>
                   {isSaving ? 'A guardar...' : 'Salvar Base'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}