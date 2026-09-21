'use client';

import React, { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileCustos, setFileCustos] = useState<File | null>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [resultadoCustos, setResultadoCustos] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [carregandoCustos, setCarregandoCustos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [mapping, setMapping] = useState({
    sku: 'SKU',
    precoVenda: 'Preço',
    frete: 'Frete',
    rebate: 'Rebate',
    comissao: 'Comissão',
    status: 'Status', // Coluna para filtrar pedidos faturados
    statusDesejado: 'Faturado' // Valor que indica que o pedido foi faturado
  });

  const handleSubmitVendas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErro('Por favor, selecione a planilha do canal.');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));

      const response = await fetch('/api/processar-vendas', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Erro ao processar vendas.');

      setResultado(data);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleSubmitCustos = async () => {
    if (!fileCustos) {
      setErro('Por favor, selecione a planilha de base de custos.');
      return;
    }

    setCarregandoCustos(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append('file', fileCustos);

      const response = await fetch('/api/processar-custos', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Erro ao processar custos.');

      setResultadoCustos(data);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregandoCustos(false);
    }
  };

  return (
    <main style={{ padding: '40px', fontFamily: 'Arial, sans-serif', background: '#0b0f19', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#00ffcc', marginBottom: '8px' }}>Dashboard de E-commerce & Liquidez</h1>
      <p style={{ color: '#888', marginBottom: '30px' }}>Gestão de canais com foco estrito em pedidos faturados e cruzamento de custos.</p>

      {erro && (
        <div style={{ background: '#5d0000', padding: '15px', borderRadius: '8px', margin: '20px 0', border: '1px solid #ff4d4d' }}>
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {/* 1. PAINEL DE VENDAS E FILTRO DE FATURADOS */}
      <form onSubmit={handleSubmitVendas} style={{ background: '#161b22', padding: '30px', borderRadius: '12px', border: '1px solid #30363d', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', color: '#2ea043', marginBottom: '15px' }}>1. Painel de Pedidos e Filtro de Faturados</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Planilha Bruta do Canal (CSV ou XLSX):</label>
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)} 
            style={{ color: '#fff', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', width: '100%' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Coluna SKU:</label>
            <input type="text" value={mapping.sku} onChange={(e) => setMapping({...mapping, sku: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Coluna Preço:</label>
            <input type="text" value={mapping.precoVenda} onChange={(e) => setMapping({...mapping, precoVenda: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Coluna Frete:</label>
            <input type="text" value={mapping.frete} onChange={(e) => setMapping({...mapping, frete: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Coluna Rebate:</label>
            <input type="text" value={mapping.rebate} onChange={(e) => setMapping({...mapping, rebate: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>Coluna Comissão:</label>
            <input type="text" value={mapping.comissao} onChange={(e) => setMapping({...mapping, comissao: e.target.value})} style={{ width: '100%', padding: '8px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', background: '#0d1117', padding: '15px', borderRadius: '8px', border: '1px solid #30363d' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#00ffcc', marginBottom: '5px', fontWeight: 'bold' }}>Nome da Coluna de Status:</label>
            <input type="text" value={mapping.status} onChange={(e) => setMapping({...mapping, status: e.target.value})} style={{ width: '100%', padding: '8px', background: '#161b22', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#00ffcc', marginBottom: '5px', fontWeight: 'bold' }}>Valor considerado Faturado (ex: Faturado / Entregue):</label>
            <input type="text" value={mapping.statusDesejado} onChange={(e) => setMapping({...mapping, statusDesejado: e.target.value})} style={{ width: '100%', padding: '8px', background: '#161b22', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} />
          </div>
        </div>

        <button type="submit" disabled={carregando} style={{ background: '#238636', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          {carregando ? 'A processar...' : 'Processar Apenas Faturados e Calcular'}
        </button>
      </form>

      {/* 2. PAINEL DE CUSTOS */}
      <div style={{ background: '#161b22', padding: '30px', borderRadius: '12px', border: '1px solid #30363d', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', color: '#58a6ff', marginBottom: '15px' }}>2. Painel de Base de Custos (Fixo)</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            onChange={(e) => setFileCustos(e.target.files?.[0] || null)} 
            style={{ color: '#fff', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', flex: 1 }} 
          />
          <button type="button" onClick={handleSubmitCustos} disabled={carregandoCustos} style={{ background: '#1f6feb', color: '#fff', padding: '12px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            {carregandoCustos ? 'A processar...' : 'Processar Base de Custos'}
          </button>
        </div>
        {resultadoCustos && <p style={{ color: '#2ea043', marginTop: '10px', fontWeight: 'bold' }}>{resultadoCustos.mensagem}</p>}
      </div>

      {/* TABELA DE RESULTADOS DE VENDAS */}
      {resultado && (
        <div style={{ background: '#161b22', padding: '30px', borderRadius: '12px', border: '1px solid #30363d' }}>
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
                {resultado.dados?.slice(0, 15).map((item: any) => (
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
          </div>
        </div>
      )}
    </main>
  );
}