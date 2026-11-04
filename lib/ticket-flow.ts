import type { Conversation, Decision, Ticket, Category, Priority } from './types';
import { isExplicitTicketRequest } from './intents';

// Demonstração determinística: chamadas estruturadas, sem alegar que existe um LLM.
const positive = /^(sim|confirmo|confirmar|pode criar|pode atualizar|ok|confirmado)[.! ]*$/i;
const negative = /^(não|nao|cancelar|cancela|não confirmo|nao confirmo)[.! ]*$/i;
const normalize = (s:string) => s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const terms = (s:string)=>new Set(normalize(s).split(' ').filter(w=>w.length>3));
function overlap(a:string,b:string){const A=terms(a),B=terms(b);if(!A.size||!B.size)return 0;let common=0;for(const w of A)if(B.has(w))common++;return common/Math.min(A.size,B.size);}
function categoryOf(s:string):Category {if(/vpn|wi.?fi|rede|internet|conexão|conexao/i.test(s))return 'Rede e VPN';if(/notebook|monitor|teclado|mouse|computador|impressora|equipamento/i.test(s))return 'Hardware';if(/senha|login|permissão|permissao|acesso|sap/i.test(s))return 'Acesso';if(/email|e-mail|outlook/i.test(s))return 'E-mail';if(/programa|aplicativo|software|instalar/i.test(s))return 'Software';return 'Outros';}
function ticketType(s:string):'INC'|'REQ'{return /solicito|preciso de|pedido|novo monitor|acesso ao|instalação|instalacao|licença|licenca|equipamento adicional/i.test(s)?'REQ':'INC'}
function priorityOf(impact:string, urgency:string, type:'INC'|'REQ'):Priority {const urgent=normalize(urgency);const people=normalize(impact);if(/equipe|departamento|setor|empresa|todos|varias pessoas|muitas pessoas/.test(people))return 'Crítica';if(/hoje|agora|urgente|sem trabalhar|bloqueado|impede|prazo hoje|reuniao hoje/.test(urgent))return 'Alta';if(/alternativa|contorno|consigo trabalhar|nao urgente|sem pressa/.test(urgent))return 'Média';return type==='REQ'?'Baixa':'Média';}
const sla:Record<Priority,string>={'Crítica':'1 hora','Alta':'4 horas úteis','Média':'3 dias úteis','Baixa':'5 dias úteis'};
function decision(intent:string, action:string, reason:string, confidence=1):Decision{return {intent,action,reason,confidence,source:'rules'};}
interface Output {text:string;decision:Decision;transfer:boolean}
export function flowTicket(text:string,c:Conversation,tickets:Ticket[],userId:string):Output|null {
 const draft=c.pendingDraft;
 if (!draft && !isExplicitTicketRequest(text))return null;
 if (!draft){c.pendingDraft={step:'description'};return {text:'Vamos abrir seu chamado. Descreva o problema ou pedido com detalhes (equipamento/sistema, erro e o que você já tentou).',decision:decision('Abrir chamado','Solicitar descrição','Abertura iniciada sem modificar dados.'),transfer:false};}
 if(negative.test(text)){delete c.pendingDraft;return {text:'Rascunho cancelado. Nenhum chamado foi criado ou alterado.',decision:decision('Cancelar rascunho','Descartar rascunho','O funcionário recusou a operação.'),transfer:false};}
 if(draft.step==='description'){
  if(text.length<12)return {text:'Preciso de mais detalhes (ao menos 12 caracteres) para registrar o chamado. O que aconteceu?',decision:decision('Coletar descrição','Pedir detalhes','Descrição insuficiente.'),transfer:false};
  draft.description=text;draft.step='impact';return {text:'Quem está sendo afetado? Responda, por exemplo: “só eu”, “minha equipe” ou “a empresa inteira”.',decision:decision('Coletar impacto','Solicitar alcance','Impacto é obrigatório para definir a prioridade.'),transfer:false};
 }
 if(draft.step==='impact'){
  if(text.length<3)return {text:'Informe se afeta somente você, a equipe ou a empresa.',decision:decision('Coletar impacto','Pedir esclarecimento','O alcance ainda não está claro.'),transfer:false};
  draft.impacted=text;draft.affected=text;draft.step='urgency';return {text:'Qual a urgência? Você está impedido de trabalhar, existe compromisso hoje ou há alternativa temporária?',decision:decision('Coletar urgência','Solicitar prazo/alternativa','Urgência é obrigatória para cálculo de SLA.'),transfer:false};
 }
 if(draft.step==='urgency'){
  if(text.length<5)return {text:'Explique um pouco mais sobre a urgência para definir a prioridade corretamente.',decision:decision('Coletar urgência','Pedir detalhes','Urgência insuficiente.'),transfer:false};
  draft.urgency=text;draft.type=ticketType(draft.description||'');draft.category=categoryOf(draft.description||'');draft.priority=priorityOf(draft.impacted||'',text,draft.type);
  draft.title=(draft.description||'Solicitação de TI').slice(0,70);
  const matches=tickets.filter(t=>t.userId===userId && (t.status!=='resolved'||Date.now()-new Date(t.updatedAt).getTime()<=7*86400000) && t.category===draft.category && overlap(t.description,draft.description||'')>=0.6);
  draft.duplicateId=matches.sort((a,b)=>Number(a.status==='resolved')-Number(b.status==='resolved'))[0]?.id;
  draft.step='confirmation';
  const operation=draft.duplicateId?`Atualizar/reabrir chamado existente ${draft.duplicateId} (possível duplicidade)`:'Criar novo chamado';
  return {text:`RASCUNHO — AGUARDANDO CONFIRMAÇÃO\nOperação: ${operation}\nTítulo: ${draft.title}\nDescrição: ${draft.description}\nTipo: ${draft.type}\nCategoria: ${draft.category}\nPrioridade: ${draft.priority} (prazo: ${sla[draft.priority]})\nAfetados: ${draft.affected}\nUrgência: ${draft.urgency}\n\nResponda somente “confirmar” para executar, ou “cancelar” para descartar.`,decision:decision('Preparar chamado','Exibir rascunho','Nenhum dado foi modificado; confirmação explícita é obrigatória.',0.9),transfer:false};
 }
 if(!positive.test(text))return {text:'O rascunho está aguardando confirmação. Escreva “confirmar” ou “cancelar”.',decision:decision('Aguardar confirmação','Não executar','Mensagem não representa confirmação explícita.'),transfer:false};
 // Executado dentro de mutateStore, protegido pela fila local e pelo filtro de proprietário.
 const now=new Date().toISOString();let ticket=tickets.find(t=>t.id===draft.duplicateId && t.userId===userId);
 if(ticket){ticket.description+=`\n\nAtualização em ${now}: ${draft.description} | Impacto: ${draft.impacted} | Urgência: ${draft.urgency}`;ticket.updatedAt=now;if(ticket.status==='resolved')ticket.status='open';}
 else {const id=`${draft.type}-${Math.floor(10000+Math.random()*89999)}-${crypto.randomUUID().slice(0,4)}`;ticket={id,userId,title:draft.title||'Chamado de TI',description:`${draft.description}\nImpacto: ${draft.impacted}\nUrgência: ${draft.urgency}`,type:draft.type||'INC',category:draft.category||'Outros',priority:draft.priority||'Média',status:'open',createdAt:now,updatedAt:now};tickets.push(ticket);}
 delete c.pendingDraft;
 const critical=ticket.priority==='Crítica';
 return {text:`${draft.duplicateId?'Chamado atualizado':'Chamado criado'} com sucesso: ${ticket.id}.\nCategoria: ${ticket.category} | Prioridade: ${ticket.priority} | Prazo: ${sla[ticket.priority]}.${critical?'\nCaso crítico: transferindo para um analista.':''}`,decision:decision('Confirmar chamado',draft.duplicateId?'Atualizar/reabrir chamado':'Criar chamado',`Confirmação explícita recebida. ${draft.duplicateId?'Chamado existente do mesmo funcionário encontrado.':'Novo registro autorizado.'}`),transfer:critical};
}
