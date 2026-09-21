import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileMl = formData.get('fileMl') as File;
    const fileFaturados = formData.get('fileFaturados') as File;
    const fileCancelados = formData.get('fileCancelados') as File | null;
    const mappingString = formData.get('mapping') as string;
    const mapping = JSON.parse(mappingString);

    if (!fileMl || !fileFaturados) {
      return NextResponse.json({ erro: 'Envie obrigatório o Mercado Livre e os Faturados.' }, { status: 400 });
    }

    // 1. Ler Faturados (Lista de IDs válidos)
    const bytesFaturados = await fileFaturados.arrayBuffer();
    const wbFaturados = XLSX.read(bytesFaturados, { type: 'array' });
    const rowsFaturados: any[] = XLSX.utils.sheet_to_json(wbFaturados.Sheets[wbFaturados.SheetNames[0]]);
    const idsFaturadosSet = new Set(rowsFaturados.map(r => String(r[mapping.colunaIdFaturado] || '').trim()));

    // 2. Ler Cancelados (Opcional)
    const idsCanceladosSet = new Set<string>();
    if (fileCancelados && fileCancelados.size > 0) {
      const bytesCancelados = await fileCancelados.arrayBuffer();
      const wbCancelados = XLSX.read(bytesCancelados, { type: 'array' });
      const rowsCancelados: any[] = XLSX.utils.sheet_to_json(wbCancelados.Sheets[wbCancelados.SheetNames[0]]);
      rowsCancelados.forEach(r => idsCanceladosSet.add(String(r[mapping.colunaIdCancelado] || '').trim()));
    }

    // 3. Ler Mercado Livre e Filtrar
    const bytesMl = await fileMl.arrayBuffer();
    const wbMl = XLSX.read(bytesMl, { type: 'array' });
    const rowsMl: any[] = XLSX.utils.sheet_to_json(wbMl.Sheets[wbMl.SheetNames[0]]);

    const dadosProcessados = rowsMl
      .map((linha) => {
        const idVenda = String(linha[mapping.colunaIdMl] || '').trim();
        const sku = String(linha[mapping.sku] || '').trim();
        const precoVenda = Number(linha[mapping.precoVenda]) || 0;
        const frete = Number(linha[mapping.frete]) || 0;
        const rebate = Number(linha[mapping.rebate]) || 0;
        const retornoLiquido = Number(linha[mapping.retornoLiquido]) || 0;

        return { idVenda, sku, precoVenda, frete, rebate, retornoLiquido };
      })
      .filter((item) => {
        // Regra de Ouro: Precisa estar nos faturados E NÃO pode estar nos cancelados
        const faturadoValido = idsFaturadosSet.has(item.idVenda);
        const cancelado = idsCanceladosSet.has(item.idVenda);
        return faturadoValido && !cancelado;
      })
      .map((item) => {
        // Liquidez Final = Retorno Líquido do Canal - Custo do SKU (guardado no banco)
        // Simulando o cálculo base com o retorno líquido fornecido pelo ML:
        const liquidezBruta = item.retornoLiquido; 

        return {
          id: item.idVenda,
          sku: item.sku,
          precoVenda: item.precoVenda,
          retornoLiquido: item.retornoLiquido,
          liquidezBruta
        };
      });

    return NextResponse.json({
      sucesso: true,
      mensagem: `Cruzamento efetuado com sucesso! ${dadosProcessados.length} pedidos validados.`,
      dados: dadosProcessados
    });

  } catch (erro) {
    return NextResponse.json({ erro: 'Erro ao processar as planilhas.', detalhe: String(erro) }, { status: 500 });
  }
}