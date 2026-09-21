import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const mappingString = formData.get('mapping');

    if (!file) {
      return NextResponse.json({ sucesso: false, erro: 'Nenhum ficheiro enviado.' }, { status: 400 });
    }

    const mapping = mappingString ? JSON.parse(mappingString) : {};

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const linhas = XLSX.utils.sheet_to_json(sheet);

    // Filtra estritamente apenas os pedidos faturados se a coluna de status estiver definida
    const linhasFiltradas = linhas.filter((linha) => {
      if (!mapping.status) return true;
      const statusLinha = String(linha[mapping.status] || '').trim().toLowerCase();
      const statusDesejado = String(mapping.statusDesejado || '').trim().toLowerCase();
      return statusLinha.includes(statusDesejado);
    });

    const dadosProcessados = linhasFiltradas.map((linha, index) => {
      const sku = String(linha[mapping.sku] || linha['SKU'] || linha['Código'] || '').trim();
      const precoVenda = Number(linha[mapping.precoVenda] || linha['Preço'] || linha['Preço de Venda'] || 0);
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
      mensagem: `Filtro aplicado! ${dadosProcessados.length} pedidos faturados processados.`,
      dados: dadosProcessados 
    });

  } catch (erro) {
    return NextResponse.json({ sucesso: false, erro: String(erro) }, { status: 500 });
  }
}