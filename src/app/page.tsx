'use client';

import React, { useState } from 'react';

export default function Home() {
  const [fileMl, setFileMl] = useState<File | null>(null);
  const [fileFaturados, setFileFaturados] = useState<File | null>(null);
  const [fileCancelados, setFileCancelados] = useState<File | null>(null);
  const [fileCustos, setFileCustos] = useState<File | null>(null);
  
  const [resultado, setResultado] = useState<any>(null);
  const [resultadoCustos, setResultadoCustos] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [carregandoCustos, setCarregandoCustos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [mapping, setMapping] = useState({
    colunaIdMl: 'Número da venda',
    colunaIdFaturado: 'Pedido',
    colunaIdCancelado: 'Pedido',
    sku: 'SKU',
    precoVenda: 'Preço de Venda',
    frete: 'Frete',
    rebate: 'Rebate',
    retornoLiquido: 'Retorno Líquido'
  });

  const handleProcessarTudo = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validação corrigida: apenas ML e Faturados são obrigatórios. Cancelados é opcional.
    if (!fileMl || !fileFaturados) {
      setErro('Envie obrigatoriamente a planilha do Mercado Livre e a planilha de Pedidos Faturados.');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append('fileMl', fileMl);
      formData.append('fileFaturados', fileFaturados);
      if (fileCancelados) {
        formData.append('fileCancelados', fileCancelados);
      }
      formData.append('mapping', JSON.stringify(mapping));

      const response = await fetch('/api/processar-vendas', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || 'Erro ao processar.');

      setResultado(data);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleProcessarCustos = async () => {
    if (!fileCustos) {
      setErro('Selecione a planilha de custos.');
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
      <p style={{ color: '#888', marginBottom: '30px' }}>Gestão de bases: Mercado Livre (com Retorno Líquido), Faturados, Cancelados (Opcional) e Custos.</p>

      {erro && (
        <div style={{ background: '#5d0000', padding: '15px', borderRadius: '8px', margin: '20px 0', border: '1px solid #ff4d4d' }}>
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {/* 1. MERCADO LIVRE */}
      <div style={{ background: '#161b22', padding: '25px', borderRadius: '12px', border: '1px solid #30363d', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', color: '#58a6ff', marginBottom: '12px' }}>1. Planilha Bruta de Vendas (Mercado Livre)</h2>
        <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => setFileMl(e.target.files?.[0] || null)} style={{ color: '#fff', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', width: '100%', marginBottom: '15px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <div><label style={{ fontSize: '11px', color: '#aaa' }}>Coluna ID no ML:</label><input type="text" value={mapping.colunaIdMl} onChange={(e) => setMapping({...mapping, colunaIdMl: e.target.value})} style={{ width: '100%', padding: '6px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} /></div>
          <div><label style={{ fontSize: '11px', color: '#aaa' }}>Coluna SKU:</label><input type="text" value={mapping.sku} onChange={(e) => setMapping({...mapping, sku: e.target.value})} style={{ width: '100%', padding: '6px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} /></div>
          <div><label style={{ fontSize: '11px', color: '#aaa' }}>Coluna Preço:</label><input type="text" value={mapping.precoVenda} onChange={(e) => setMapping({...mapping, precoVenda: e.target.value})} style={{ width: '100%', padding: '6px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} /></div>
          <div><label style={{ fontSize: '11px', color: '#aaa' }}>Coluna Frete:</label><input type="text" value={mapping.frete} onChange={(e) => setMapping({...mapping, frete: e.target.value})} style={{ width: '100%', padding: '6px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} /></div>
          <div><label style={{ fontSize: '11px', color: '#aaa' }}>Coluna Rebate:</label><input type="text" value={mapping.rebate} onChange={(e) => setMapping({...mapping, rebate: e.target.value})} style={{ width: '100%', padding: '6px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} /></div>
          <div><label style={{ fontSize: '11px', color: '#00ffcc' }}>Retorno Líquido:</label><input type="text" value={mapping.retornoLiquido} onChange={(e) => setMapping({...mapping, retornoLiquido: e.target.value})} style={{ width: '100%', padding: '6px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} /></div>
        </div>
      </div>

      {/* 2 & 3. FATURADOS E CANCELADOS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: '#161b22', padding: '25px', borderRadius: '12px', border: '1px solid #30363d' }}>
          <h2 style={{ fontSize: '16px', color: '#2ea043', marginBottom: '12px' }}>2. Pedidos Faturados</h2>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => setFileFaturados(e.target.files?.[0] || null)} style={{ color: '#fff', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', width: '100%', marginBottom: '10px' }} />
          <label style={{ fontSize: '11px', color: '#aaa' }}>Coluna ID:</label>
          <input type="text" value={mapping.colunaIdFaturado} onChange={(e) => setMapping({...mapping, colunaIdFaturado: e.target.value})} style={{ width: '100%', padding: '6px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} />
        </div>

        <div style={{ background: '#161b22', padding: '25px', borderRadius: '12px', border: '1px solid #30363d' }}>
          <h2 style={{ fontSize: '16px', color: '#f85149', marginBottom: '12px' }}>3. Pedidos Cancelados (Opcional)</h2>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => setFileCancelados(e.target.files?.[0] || null)} style={{ color: '#fff', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', width: '100%', marginBottom: '10px' }} />
          <label style={{ fontSize: '11px', color: '#aaa' }}>Coluna ID:</label>
          <input type="text" value={mapping.colunaIdCancelado} onChange={(e) => setMapping({...mapping, colunaIdCancelado: e.target.value})} style={{ width: '100%', padding: '6px', background: '#0d1117', border: '1px solid #30363d', color: '#fff', borderRadius: '4px' }} />
        </div>
      </div>

      <button onClick={handleProcessarTudo} disabled={carregando} style={{ background: '#238636', color: '#fff', padding: '14px 28px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginBottom: '30px', fontSize: '16px' }}>
        {carregando ? 'A processar...' : 'Processar Cruzamento (ML x Faturados)'}
      </button>

      {/* 4. CUSTOS */}
      <div style={{ background: '#161b22', padding: '25px', borderRadius: '12px', border: '1px solid #30363d', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '16px', color: '#58a6ff', marginBottom: '12px' }}>4. Base de Custos (Fixo)</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => setFileCustos(e.target.files?.[0] || null)} style={{ color: '#fff', padding: '10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', flex: 1 }} />
          <button type="button" onClick={handleProcessarCustos} disabled={carregandoCustos} style={{ background: '#1f6feb', color: '#fff', padding: '12px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            {carregandoCustos ? 'A guardar...' : 'Guardar Custos'}
          </button>
        </div>
        {resultadoCustos && <p style={{ color: '#2ea043', marginTop: '10px', fontWeight: 'bold' }}>{resultadoCustos.mensagem}</p>}
      </div>

      {resultado && (
        <div style={{ background: '#161b22', padding: '30px', borderRadius: '12px', border: '1px solid #30363d' }}>
          <h3 style={{ color: '#2ea043', marginBottom: '10px' }}>{resultado.mensagem}</h3>
          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #30363d', color: '#888' }}>
                  <th style={{ padding: '10px' }}>SKU</th>
                  <th style={{ padding: '10px' }}>Preço Venda</th>
                  <th style={{ padding: '10px' }}>Retorno Líquido</th>
                  <th style={{ padding: '10px', color: '#00ffcc' }}>Liquidez Final</th>
                </tr>
              </thead>
              <tbody>
                {resultado.dados?.slice(0, 15).map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '10px' }}>{item.sku}</td>
                    <td style={{ padding: '10px' }}>R$ {item.precoVenda.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>R$ {item.retornoLiquido.toFixed(2)}</td>
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