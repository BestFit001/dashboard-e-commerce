'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function SkusPage() {
  const { products, setProducts, addLog } = useAppContext();
  const [skuInput, setSkuInput] = useState('');
  const [nomeInput, setNomeInput] = useState('');
  const [custoInput, setCustoInput] = useState('');
  const [embalagemInput, setEmbalagemInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleAddOrUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuInput.trim() || !custoInput) return;

    const newSku = skuInput.trim().toUpperCase();
    const nomeProd = nomeInput.trim() || 'Produto sem nome';
    const custo = Number(custoInput) || 0;
    const embalagem = Number(embalagemInput) || 0;

    const updatedList = products.filter((p: any) => p.sku !== newSku);
    const newProduct = { sku: newSku, nome: nomeProd, preco_custo: custo, custo_embalagem: embalagem };
    const finalProducts = [newProduct, ...updatedList];

    setProducts(finalProducts);
    addLog(`SKU [${newSku}] (${nomeProd}) guardado. Custo: R$ ${custo}, Embalagem: R$ ${embalagem}.`, 'success');

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        await supabase.from('tb_produtos').upsert([{ sku: newSku, nome: nomeProd, preco_custo: custo, custo_embalagem: embalagem }], { onConflict: 'sku' });
      }
    } catch (err) {
      console.error(err);
    }

    setSkuInput('');
    setNomeInput('');
    setCustoInput('');
    setEmbalagemInput('');
  };

  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

        const novosProdutos: any[] = [];
        rows.slice(1).forEach((r) => {
          if (!r || !r.length) return;
          const sku = String(r[0] || '').trim().toUpperCase();
          if (!sku || sku === 'SKU') return;

          const nome = String(r[1] || '').trim() || 'Produto';
          const preco_custo = parseFloat(String(r[2] || '0').replace(',', '.')) || 0;
          const custo_embalagem = parseFloat(String(r[3] || '0').replace(',', '.')) || 0;

          novosProdutos.push({ sku, nome, preco_custo, custo_embalagem });
        });

        if (novosProdutos.length > 0) {
          // Atualiza estado local mantendo os antigos se não repetidos
          setProducts((prev: any[]) => {
            const map = new Map();
            [...novosProdutos, ...prev].forEach(p => map.set(p.sku, p));
            return Array.from(map.values());
          });

          if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
            await supabase.from('tb_produtos').upsert(novosProdutos, { onConflict: 'sku' });
          }

          addLog(`Importação em massa concluída: ${novosProdutos.length} SKUs processados.`, 'success');
          alert(`Sucesso! ${novosProdutos.length} SKUs importados.`);
        } else {
          alert('Nenhum SKU válido encontrado no arquivo. Verifique se o formato está correto (Col A: SKU, Col B: Nome, Col C: Custo, Col D: Embalagem).');
        }
      } catch (err: any) {
        alert(`Erro ao ler arquivo: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const filteredProducts = products.filter((p: any) => 
    p.sku.toUpperCase().includes(searchFilter.toUpperCase()) || 
    (p.nome && p.nome.toUpperCase().includes(searchFilter.toUpperCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Gestão de SKUs, Custos & Embalagens</h2>
          <p className="text-xs text-slate-400 mt-0.5">Cadastre manualmente ou importe a base completa via Excel para cálculo do Lucro Real.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Pesquisar por SKU ou Nome..." 
            value={searchFilter} 
            onChange={e => setSearchFilter(e.target.value)} 
            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 w-full md:w-64"
          />
          <label className={`cursor-pointer px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 whitespace-nowrap shadow-lg ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleUploadExcel} disabled={isUploading} />
            <i className="fa-solid fa-file-excel"></i> {isUploading ? 'A importar...' : 'Subir Excel (Lote)'}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Cadastro Individual */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-fit space-y-4">
          <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">Adicionar / Atualizar SKU</h3>
          <form onSubmit={handleAddOrUpdateProduct} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Código SKU *</label>
              <input type="text" placeholder="Ex: TOP-FIT-PRETO-M" value={skuInput} onChange={e => setSkuInput(e.target.value)} required className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nome do Produto</label>
              <input type="text" placeholder="Ex: Top Fitness Ribana Preto" value={nomeInput} onChange={e => setNomeInput(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Preço de Custo (R$) *</label>
              <input type="number" step="0.01" placeholder="0.00" value={custoInput} onChange={e => setCustoInput(e.target.value)} required className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-bold focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Custo de Embalagem (R$)</label>
              <input type="number" step="0.01" placeholder="0.00" value={embalagemInput} onChange={e => setEmbalagemInput(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-bold focus:outline-none focus:border-indigo-500" />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition mt-2">
              Guardar / Atualizar Custo
            </button>
          </form>
        </div>

        {/* Tabela de SKUs Cadastrados com linhas mais compactas */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base">SKUs Cadastrados</h3>
            <span className="text-xs text-slate-400 font-bold">{filteredProducts.length} itens registados</span>
          </div>

          <div className="overflow-x-auto max-h-[520px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold sticky top-0 border-b border-slate-800 z-10">
                <tr>
                  <th className="py-2 pl-3">SKU / Produto</th>
                  <th className="py-2">Custo Unit.</th>
                  <th className="py-2">Embalagem</th>
                  <th className="py-2 pr-3 text-right">Custo Total (CMV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredProducts.map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2 pl-3">
                      <span className="font-mono font-bold text-indigo-400 block">{p.sku}</span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-xs">{p.nome || 'Produto sem nome'}</span>
                    </td>
                    <td className="py-2 text-amber-400 font-bold align-middle">R$ {Number(p.preco_custo || 0).toFixed(2)}</td>
                    <td className="py-2 text-indigo-300 font-bold align-middle">R$ {Number(p.custo_embalagem || 0).toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right font-black text-white align-middle">R$ {(Number(p.preco_custo || 0) + Number(p.custo_embalagem || 0)).toFixed(2)}</td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-500">
                      Nenhum SKU registado. Utilize o formulário ao lado ou importe uma base Excel em lote.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}