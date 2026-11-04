import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { readStore, mutateStore } from '@/lib/store';
import { analystActions, applyAnalystAction, type AnalystAction } from '@/lib/analyst-flow';

export const runtime = 'nodejs';

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'analyst') {
    return NextResponse.json({ error: 'Acesso exclusivo ao analista' }, { status: 403 });
  }
  const db = await readStore();
  return NextResponse.json({
    conversations: db.conversations,
    users: db.users.filter(u => u.role === 'employee'),
    tickets: db.tickets
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'analyst') {
    return NextResponse.json({ error: 'Acesso exclusivo ao analista' }, { status: 403 });
  }
  let body: { conversationId?: string; action?: string; text?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (!body.conversationId || !body.action || !analystActions.includes(body.action as AnalystAction)) {
    return NextResponse.json({ error: 'Ação ou conversa inválida' }, { status: 400 });
  }
  try {
    const conversation = await mutateStore(db => {
      const c = db.conversations.find(c => c.id === body.conversationId);
      if (!c) throw new Error('Conversa não encontrada');
      applyAnalystAction(c, body.action as AnalystAction, user.name, body.text);
      return structuredClone(c);
    });
    return NextResponse.json({ conversation });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao processar' }, { status: 409 });
  }
}
