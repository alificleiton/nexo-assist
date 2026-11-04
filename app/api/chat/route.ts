import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { readStore, mutateStore } from '@/lib/store';
import { decide } from '@/lib/agent';
import { flowTicket } from '@/lib/ticket-flow';
import { isExplicitHumanRequest } from '@/lib/intents';
import { answerWithGemini } from '@/lib/mastra/nexo-agent';
import type { Conversation, Message, Store } from '@/lib/types';

export const runtime = 'nodejs';
const askTickets=/meus chamados|meu chamado|status|andamento/i;

export async function GET(){
  const user=await currentUser();
  if(!user||user.role!=='employee') return NextResponse.json({error:'Não autorizado'},{status:401});
  const db=await readStore();
  return NextResponse.json({conversations:db.conversations.filter(c=>c.userId===user.id)});
}

export async function POST(req:Request){
  const user=await currentUser();
  if(!user||user.role!=='employee')return NextResponse.json({error:'Não autorizado'},{status:401});
  let body:{text?:string;conversationId?:string};
  try{body=await req.json();}catch{return NextResponse.json({error:'JSON inválido'},{status:400});}
  const text=body.text?.trim();
  if(!text||text.length>2000)return NextResponse.json({error:'Digite uma mensagem de até 2000 caracteres.'},{status:400});
  try{
    // Mantemos a fila de persistência da etapa anterior para evitar perder atualizações locais.
    // Limitação documentada: a chamada ao LLM mantém o lock por alguns segundos.
    const conversation=await mutateStore(async(db:Store)=>{
      let c=body.conversationId?db.conversations.find(x=>x.id===body.conversationId&&x.userId===user.id):undefined;
      if(body.conversationId&&!c)throw new Error('Conversa não encontrada');
      if(!c){c={id:crypto.randomUUID(),userId:user.id,state:'agent',messages:[],updatedAt:new Date().toISOString()};db.conversations.push(c);}
      if(c.state!=='agent')throw new Error('Conversa em atendimento humano ou encerrada');
      if(c.messages.filter(m=>m.sender==='employee').length>=30)throw new Error('Limite de 30 mensagens por sessão atingido');
      const now=new Date().toISOString();
      const employee:Message={id:crypto.randomUUID(),sender:'employee',text,at:now};
      const owned=db.tickets.filter(t=>t.userId===user.id);
      // Rascunhos e transferências são governados por regras, nunca pela IA.
      let result=flowTicket(text,c,db.tickets,user.id);
      if(!result && isExplicitHumanRequest(text))result=decide("quero falar com um analista",owned);
      if(!result){
        try{
          result=await answerWithGemini({text,tickets:owned,conversation:c});
          // Se o modelo não usou ferramentas para uma consulta sensível, a resposta
          // determinística evita que ele invente chamados.
          if(askTickets.test(text)&&!result.decision.action.includes('Consultou chamados')){
            result=decide(text,owned);
          }
        }catch(error){
          console.error('Falha Gemini/Mastra:',error instanceof Error?error.message:'erro desconhecido');
          result=decide(text,owned);
          result.decision.reason+=' (Fallback: Gemini indisponível ou sem configuração.)';
        }
      }
      c.messages.push(employee,{id:crypto.randomUUID(),sender:'agent',text:result.text,at:now,decision:result.decision});
      if(result.transfer)c.state='waiting_analyst';
      c.updatedAt=now;
      return c as Conversation;
    });
    return NextResponse.json({conversation});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Falha ao processar'},{status:409});}
}
