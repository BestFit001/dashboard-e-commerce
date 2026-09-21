import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    return NextResponse.json({ sucesso: true, mensagem: "API processada com sucesso." });
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 });
  }
}