import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const fileCanal = formData.get('fileCanal');
    const fileFaturados = formData.get('fileFaturados');
    const mappingString = formData.get('mapping');

    if (!fileCanal || !fileFaturados) {
      return NextResponse.json({ sucesso: false, erro: 'Envie a planilha do canal e a planilha de pedidos faturados.' }, { status: 400 });
    }

    const mapping = mappingString ? JSON.parse(mappingString) : {};

    // 1. Lê a planilha de Pedidos Faturados (extrai a lista de números válidos)
    const bytesFaturados = await fileFaturados.arrayBuffer();
    const wbFaturados = XLSX.read(bytesFaturados, { type: 'array' });
    const wsFaturados = wbFaturados.Sheets[wbFaturados.SheetNames[0]];
    const linhasFaturados = XLSX.utils.sheet_to_json(wsFaturados);

    // Cria um Set com todos os números de pedidos faturados para busca rápida
    const pedidosFaturadosSet = new Set();
    linhasFaturados.forEach((linha) => {
      const numPedido = String(linha[mapping.colunaIdFaturado] || linha['Pedido'] || linha['Nº do pedido'] || linha['ID'] || '').trim();
      if (numPedido) pedidosFaturadosSet.add(numPedido);
    });

    // 2. Lê a planilha Bruta do Canal
    const bytesCanal = await fileCanal.arrayBuffer();
    const wbCanal = XLSX.read(bytesCanal, { type: 'array' });
    const wsCanal = wbCanal.Sheets[wbCanal.SheetNames[0]];
    const linhasCanal = XLSX.utils.sheet_to_json(wsCanal);

    // 3. Filtra: Mantém APENAS os pedidos que estão na lista de faturados
    const linhasFiltradas = linhasCanal.linspace ? [] : linhasCanal.filter((linha) => {
      const numPedidoCanal = String(linha[mapping.colunaIdCanal] || linha['Número da venda'] || linha['Pedido'] || '').trim();
      return pedidosFaturadosSet.has(numPedidoCanal);
    });

    // 4. Processa os dados filtrados
    const dadosProcessados = linhasFiltradas.map((linha, index) => {
      const sku = String(linha[mapping.sku] || linha['SKU'] || '').trim();
      const precoVenda = Number(linha[mapping.precoVenda] || linha['Preço'] || 0);
      const frete = Number(linha[mapping.frete] || linha['Frete'] || 0);
      const rebate = Number(linha[mapping.rebate] || linha['Rebate'] || 0);
      const comissao = Number(linha[mapping.comissao] || linha['Comissão'] || 0);

      const liquidezBruta = precoVenda - frete - rebate - comissao;

      return {
        id: index + 1,
        sku: sku || `SKU-${index + 1}`,
        precoVenda,
        frete,
        rebate,
        comissao,
        liquidezBruta,
      };
    });

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: `Filtro aplicado com sucesso! ${dadosProcessados.length} pedidos mantidos (os não faturados foram descartados).`,
      dados: dadosProcessados 
    });

  } catch (erro) {
    return NextResponse.json({ sucesso: false, erro: String(erro) }, { status: 500 });
  }
}