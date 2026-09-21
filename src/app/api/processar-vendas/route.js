import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const mappingString = formData.get('mapping');

    if (!file) {
      return NextResponse.json({ 
        sucesso: false, 
        erro: 'Nenhum ficheiro foi enviado na requisição.' 
      }, { status: 400 });
    }

    // Recebe o dicionário de colunas mapeadas pelo usuário na interface
    const mapping = mappingString ? JSON.parse(mappingString) : {};

    // Lê os bytes do ficheiro enviado (CSV ou XLSX)
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Converte a planilha bruta em um array de objetos JSON
    const linhas = XLSX.utils.sheet_to_json(sheet);

    if (!linhas || linhas.length === 0) {
      return NextResponse.json({ 
        sucesso: false, 
        erro: 'A planilha enviada está vazia ou não pôde ser lida.' 
      }, { status: 400 });
    }

    // Processamento e normalização das colunas variáveis de cada canal
    const dadosProcessados = linhas.map((linha, index) => {
      const sku = String(linha[mapping.sku] || `SKU-NAO-INFORMADO-${index + 1}`).trim();
      const precoVenda = Number(linha[mapping.precoVenda]) || 0;
      const frete = Number(linha[mapping.frete]) || 0;
      const rebate = Number(linha[mapping.rebate]) || 0;
      const comissao = Number(linha[mapping.comissao]) || 0;

      // Cálculo preliminar da liquidez (fórmula base do canal)
      const liquidezBruta = precoVenda - frete - rebate - comissao;

      return {
        id: index + 1,
        sku,
        precoVenda,
        frete,
        rebate,
        comissao,
        liquidezBruta,
      };
    });

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: `Planilha processada com sucesso! Total de ${dadosProcessados.length} registos extraídos.`,
      dados: dadosProcessados 
    });

  } catch (erro) {
    return NextResponse.json({ 
      sucesso: false, 
      erro: 'Erro interno ao processar a planilha no servidor.', 
      detalhe: String(erro) 
    }, { status: 500 });
  }
}