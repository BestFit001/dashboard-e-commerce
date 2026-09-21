import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    return NextResponse.json({ sucesso: true, mensagem: "API pronta para processar vendas." });
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno ao processar.' }, { status: 500 });
  }
}