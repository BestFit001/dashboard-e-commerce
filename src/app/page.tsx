'use client';

import React, { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados para configurar quais os nomes das colunas na planilha do canal específico
  const [mapping, setMapping] = useState({
    sku: 'SKU',
    precoVenda: 'Preco',
    frete: 'Frete',
    rebate: 'Rebate',
    comissao: 'Comissao'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErro('Por favor, selecione uma planilha (CSV ou XLSX) antes de continuar.');
      return;
    }

    setCarregando(true);
    setErro(null);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));

      const response = await fetch('/api/processar-vendas', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('O servidor retornou uma página HTML (erro 404/500) em vez de JSON.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao processar os dados.');
      }

      setResultado(data);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main style={{ padding: '40px', fontFamily: 'Arial, sans-serif', background: '#0b0f19', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#00ffcc', marginBottom: '8px' }}>Dashboard de E-commerce & Liquidez</h1>
      <p style={{ color: '#888', marginBottom: '30px' }}>Sistema de extração multicanal, mapeamento de colunas e cruzamento de custos.</p>

      {erro && (
        <div style={{ background: '#5d0000', padding: '15px', borderRadius: '8px', margin: '20px 0', border: '1px solid #ff4d4d' }}>
          <strong>Atenção:</strong> {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#161b22', padding: '30px', borderRadius: '12px', border: '1px solid #30363d', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2>1. Upload e Mapeamento de Colunas do Canal</h2>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Ficheiro Bruto do Canal (CSV ou XLSX):</label>
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)} 
            style={{ color: '#fff', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', width: '100%' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Nome da Coluna SKU:</label>
            <input 
              type="text" 
              value={mapping.sku} 
              onChange={(e) => setMapping({...mapping, sku: e.target.value})}
              style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Nome da Coluna Preço:</label>
            <input 
              type="text" 
              value={mapping.precoVenda} 
              onChange={(e) => setMapping({...mapping, precoVenda: e.target.value})}
              style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Nome da Coluna Frete:</label>
            <input 
              type="text" 
              value={mapping.frete} 
              onChange={(e) => setMapping({...mapping, frete: e.target.value})}
              style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Nome da Coluna Rebate (Bônus):</label>
            <input 
              type="text" 
              value={mapping.rebate} 
              onChange={(e) => setMapping({...mapping, rebate: e.target.value})}
              style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Nome da Coluna Comissão:</label>
            <input 
              type="text" 
              value={mapping.comissao} 
              onChange={(e) => setMapping({...mapping, comissao: e.target.value})}
              style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={carregando}
          style={{ background: '#238636', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}
        >
          {carregando ? 'A processar dados...' : 'Processar Planilha e Calcular Liquidez'}
        </button>
      </form>

      {resultado && (
        <div style={{ background: '#161b22', padding: '30px', borderRadius: '12px', marginTop: '30px', border: '1px solid #30363d' }}>
          <h3 style={{ color: '#2ea043', marginBottom: '10px' }}>{resultado.mensagem}</h3>
          
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #30363d', color: '#888' }}>
                  <th style={{ padding: '10px' }}>SKU</th>
                  <th style={{ padding: '10px' }}>Preço Venda</th>
                  <th style={{ padding: '10px' }}>Frete</th>
                  <th style={{ padding: '10px' }}>Rebate</th>
                  <th style={{ padding: '10px' }}>Comissão</th>
                  <th style={{ padding: '10px', color: '#00ffcc' }}>Parcial / Liquidez</th>
                </tr>
              </thead>
              <tbody>
                {resultado.dados?.slice(0, 10).map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '10px' }}>{item.sku}</td>
                    <td style={{ padding: '10px' }}>R$ {item.precoVenda.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>R$ {item.frete.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>R$ {item.rebate.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>R$ {item.comissao.toFixed(2)}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#2ea043' }}>R$ {item.liquidezBruta.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ color: '#888', fontSize: '12px', marginTop: '15px' }}>* Exibindo os primeiros 10 registos da planilha carregada.</p>
          </div>
        </div>
      )}
    </main>
  );
}