import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileFaturados = formData.get('faturados') as File;
    const fileCustos = formData.get('custos') as File;
    const fileCanal = formData.get('canal') as File;
    const mappingString = formData.get('mapping') as string;
    const mapping = JSON.parse(mappingString);

    if (!fileFaturados || !fileCustos || !fileCanal) {
      return NextResponse.json({ erro: 'Envie as planilhas obrigatórias: Faturados, Custos e Canal.' }, { status: 400 });
    }

    // 1. Processar Base de Custos e Salvar no Supabase
    const bytesCustos = await fileCustos.arrayBuffer();
    const wbCustos = XLSX.read(bytesCustos, { type: 'array' });
    const linhasCustos: any[] = XLSX.utils.sheet_to_json(wbCustos.Sheets[wbCustos.SheetNames[0]]);

    const mapaCustos = new Map();
    for (const linha of linhasCustos) {
      const sku = String(linha[mapping.custosSku] || '').trim();
      const nomeProduto = String(linha[mapping.custosNome] || '');
      const custo = Number(linha[mapping.custosValor]) || 0;
      const embalagem = Number(linha[mapping.custosEmb]) || 0;

      if (sku) {
        mapaCustos.set(sku, { nomeProduto, custo, embalagem });
        await supabase.from('custos_produtos').upsert({
          sku,
          nome_produto: nomeProduto,
          custo,
          embalagem
        }, { onConflict: 'sku' });
      }
    }

    // 2. Processar Faturados
    const bytesFaturados = await fileFaturados.arrayBuffer();
    const wbFaturados = XLSX.read(bytesFaturados, { type: 'array' });
    const linhasFaturados: any[] = XLSX.utils.sheet_to_json(wbFaturados.Sheets[wbFaturados.SheetNames[0]]);
    
    const pedidosFaturados = new Set();
    const datasPedidos = new Map();
    for (const linha of linhasFaturados) {
      const pedido = String(linha[mapping.faturadosPedido] || '').trim();
      const dataVenda = String(linha[mapping.faturadosData] || new Date().toISOString().split('T')[0]);
      if (pedido) {
        pedidosFaturados.add(pedido);
        datasPedidos.set(pedido, dataVenda);
      }
    }

    // 3. Processar Canal (Mercado Livre) e Cruzar dados
    const bytesCanal = await fileCanal.arrayBuffer();
    const wbCanal = XLSX.read(bytesCanal, { type: 'array' });
    const linhasCanal: any[] = XLSX.utils.sheet_to_json(wbCanal.Sheets[wbCanal.SheetNames[0]]);

    let liquidezTotalAcumulada = 0;
    const dadosProcessados = [];

    for (const linha of linhasCanal) {
      const numPedido = String(linha[mapping.colPedido] || '').trim();
      if (!pedidosFaturados.has(numPedido)) continue;

      const sku = String(linha[mapping.colSku] || '').trim();
      const pdv = mapping.usaPdv ? Number(linha[mapping.colPdv]) || 0 : 0;
      const frete = mapping.usaFrete ? Number(linha[mapping.colFrete]) || 0 : 0;
      const rebate = mapping.usaRebate ? Number(linha[mapping.colRebate]) || 0 : 0;
      const liquidoRecebido = mapping.usaLiquido ? Number(linha[mapping.colLiquido]) || 0 : 0;
      const envioTexto = mapping.usaFlex ? String(linha[mapping.colEnvio] || '').toUpperCase() : '';

      const imposto = pdv * 0.09;
      const custoFlex = envioTexto.includes('FLEX') ? 12.99 : 0;

      const infoCusto = mapaCustos.get(sku) || { nomeProduto: 'Não Cadastrado', custo: 0, embalagem: 0 };
      const custoProduto = infoCusto.custo + infoCusto.embalagem;

      const liquidezFinal = liquidoRecebido > 0 
        ? liquidoRecebido - imposto - custoFlex - custoProduto 
        : pdv - frete - rebate - imposto - custoFlex - custoProduto;

      liquidezTotalAcumulada += liquidezFinal;
      const dataVenda = datasPedidos.get(numPedido) || new Date().toISOString().split('T')[0];

      const registroVenda = {
        num_pedido: numPedido,
        data_venda: dataVenda,
        sku,
        pdv,
        imposto,
        frete,
        rebate,
        liquido_recebido: liquidoRecebido,
        custo_flex: custoFlex,
        custo_produto: custoProduto,
        liquidez_final: liquidezFinal
      };

      dadosProcessados.push({
        numPedido,
        data: dataVenda,
        sku,
        nomeProduto: infoCusto.nomeProduto,
        pdv,
        imposto,
        custoFlex,
        custoProduto,
        liquidezFinal
      });

      // Grava o histórico diário consolidado no Supabase
      await supabase.from('vendas_consolidadas').insert([registroVenda]);
    }

    return NextResponse.json({
      sucesso: true,
      totalVendasProcessadas: dadosProcessados.length,
      liquidezTotalAcumulada,
      dados: dadosProcessados
    });

  } catch (erro) {
    return NextResponse.json({ erro: 'Erro ao processar e salvar no banco.', detalhe: String(erro) }, { status: 500 });
  }
}