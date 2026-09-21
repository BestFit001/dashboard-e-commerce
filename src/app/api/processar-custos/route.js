import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ sucesso: false, erro: 'Nenhum ficheiro de custos enviado.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const linhas = XLSX.utils.sheet_to_json(sheet);

    const custosProcessados = linhas.map((linha, index) => ({
      id: index + 1,
      sku: String(linha['SKU'] || linha['Cód'] || linha['Código'] || '').trim(),
      nome: String(linha['Nome'] || linha['Produto'] || '').trim(),
      custo: Number(linha['Custo'] || linha['Valor Custo'] || 0),
    }));

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: `Base de custos processada com sucesso! ${custosProcessados.length} SKUs mapeados.`,
      dados: custosProcessados 
    });

  } catch (erro) {
    return NextResponse.json({ sucesso: false, erro: String(erro) }, { status: 500 });
  }
}