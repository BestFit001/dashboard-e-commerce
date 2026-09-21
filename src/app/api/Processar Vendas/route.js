import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Arquivos enviados
    const fileFaturados = formData.get('faturados');
    const fileCancelados = formData.get('cancelados');
    const fileCustos = formData.get('custos');
    const fileCanal = formData.get('canal');
    
    // Mapeamento dinâmico enviado pelo front-end
    // Ex: { colPedido: 'A', colPdv: 'I', colFrete: 'N', colRebate: 'Q', colLiquido: 'S', colSku: 'W', colEnvio: 'AR', usaFlex: true, usaPdv: true, ... }
    const mapping = JSON.parse(formData.get('mapping') || '{}');

    if (!fileCanal || !fileCustos || !fileFaturados) {
      return NextResponse.json({ erro: 'Envie pelo menos a planilha de Faturados, Custos e a do Canal.' }, { status: 400 });
    }

    // Função auxiliar para ler qualquer planilha XLSX/CSV enviada
    const lerPlanilha = async (file) => {
      const bytes = await file.arrayBuffer();
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Retorna array de linhas em formato matricial (linhas e colunas por índice)
    };

    // Converter letra de coluna (ex: 'A' -> 0, 'I' -> 8, 'AR' -> 43)
    const letraParaIndice = (letra) => {
      if (!letra) return -1;
      let col = letra.toUpperCase().trim();
      let sum = 0;
      for (let i = 0; i < col.length; i++) {
        sum *= 26;
        sum += col.charCodeAt(i) - 64;
      }
      return sum - 1;
    };

    // 1. Processar Planilha de Faturados (Filtro de Pedidos Válidos + Data)
    const dadosFaturados = await lerPlanilha(fileFaturados);
    const pedidosValidos = new Set();
    const datasPedidos = {};

    // Ignora o cabeçalho (linha 0)
    for (let i = 1; i < dadosFaturados.length; i++) {
      const linha = dadosFaturados[i];
      const numPedido = String(linha[letraParaIndice(mapping.faturadosPedido || 'A')] || '').trim();
      const diaPedido = String(linha[letraParaIndice(mapping.faturadosData || 'B')] || '').trim();
      if (numPedido) {
        pedidosValidos.add(numPedido);
        datasPedidos[numPedido] = diaPedido;
      }
    }

    // 2. Processar Pedidos Cancelados (Remover da lista de válidos)
    if (fileCancelados) {
      const dadosCancelados = await lerPlanilha(fileCancelados);
      for (let i = 1; i < dadosCancelados.length; i++) {
        const linha = dadosCancelados[i];
        const numPedido = String(linha[letraParaIndice(mapping.canceladosPedido || 'A')] || '').trim();
        if (numPedido) {
          pedidosValidos.delete(numPedido);
        }
      }
    }

    // 3. Processar Base de Custos (SKU -> Custo Produto + Embalagem)
    const dadosCustos = await lerPlanilha(fileCustos);
    const mapaCustos = {};
    for (let i = 1; i < dadosCustos.length; i++) {
      const linha = dadosCustos[i];
      const sku = String(linha[0] || '').trim().toUpperCase(); // Coluna A: SKU
      const custoProduto = Number(linha[2]) || 0;              // Coluna C: Custo
      const embalagem = Number(linha[3]) || 0;                 // Coluna D: Embalagem
      mapaCustos[sku] = {
        custoTotal: custoProduto + embalagem,
        nomeProduto: String(linha[1] || '')                    // Coluna B: Nome
      };
    }

    // 4. Processar Planilha do Canal (Mercado Livre)
    const dadosCanal = await lerPlanilha(fileCanal);
    const resultados = [];
    let totalLiquidezGeral = 0;

    const idxPedido = letraParaIndice(mapping.colPedido);
    const idxPdv = mapping.usaPdv ? letraParaIndice(mapping.colPdv) : -1;
    const idxFrete = mapping.usaFrete ? letraParaIndice(mapping.colFrete) : -1;
    const idxRebate = mapping.usaRebate ? letraParaIndice(mapping.colRebate) : -1;
    const idxLiquido = mapping.usaLiquido ? letraParaIndice(mapping.colLiquido) : -1;
    const idxSku = letraParaIndice(mapping.colSku);
    const idxEnvio = mapping.usaFlex ? letraParaIndice(mapping.colEnvio) : -1;

    for (let i = 1; i < dadosCanal.length; i++) {
      const linha = dadosCanal[i];
      const numPedido = String(linha[idxPedido] || '').trim();

      // Regra: Considerar APENAS se estiver na planilha de faturados e não cancelado
      if (!numPedido || !pedidosValidos.has(numPedido)) continue;

      const sku = String(linha[idxSku] || '').trim().toUpperCase();
      const pdv = idxPdv !== -1 ? (Number(linha[idxPdv]) || 0) : 0;
      const frete = idxFrete !== -1 ? (Number(linha[idxFrete]) || 0) : 0;
      const rebate = idxRebate !== -1 ? (Number(linha[idxRebate]) || 0) : 0;
      const liquidoOriginal = idxLiquido !== -1 ? (Number(linha[idxLiquido]) || 0) : 0;
      const metodoEnvio = idxEnvio !== -1 ? String(linha[idxEnvio] || '').toUpperCase() : '';

      // Imposto: 9% em cima do PDV
      const imposto = pdv * 0.09;

      // Custo Flex: Adicionar R$ 12,99 se contiver "FLEX"
      const custoFlex = metodoEnvio.includes('FLEX') ? 12.99 : 0;

      // Buscar custos na base de dados fixa
      const infoCusto = mapaCustos[sku] || { custoTotal: 0, nomeProduto: 'SKU não cadastrado' };

      // Liquidez Final por Venda = Líquido Original - Imposto - Custo Flex - Custo Produto - Embalagem
      const liquidezFinal = liquidoOriginal - imposto - custoFlex - infoCusto.custoTotal;

      totalLiquidezGeral += liquidezFinal;

      resultados.push({
        numPedido,
        data: datasPedidos[numPedido] || '',
        sku,
        nomeProduto: infoCusto.nomeProduto,
        pdv,
        imposto,
        frete,
        rebate,
        liquidoOriginal,
        custoFlex,
        custoProduto: infoCusto.custoTotal,
        liquidezFinal
      });
    }

    return NextResponse.json({
      sucesso: true,
      totalVendasProcessadas: resultados.length,
      liquidezTotalAcumulada: totalLiquidezGeral,
      dados: resultados
    });

  } catch (erro) {
    return NextResponse.json({ erro: 'Erro ao processar o motor do dashboard.', detalhe: String(erro) }, { status: 500 });
  }
}