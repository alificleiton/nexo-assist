export type Role = 'employee' | 'analyst';
export type Status = 'open' | 'waiting_analyst' | 'resolved';
export type Priority = 'Crítica'|'Alta'|'Média'|'Baixa';
export type Category = 'Acesso'|'Rede e VPN'|'Hardware'|'Software'|'E-mail'|'Outros';
export interface User { id:string; name:string; email:string; role:Role }
export interface Ticket { id:string; userId:string; title:string; description:string; type:'INC'|'REQ'; category:Category; priority:Priority; status:Status; updatedAt:string; createdAt:string }
export interface DecisionTraceStep { kind:'tool'|'model'|'policy'|'fallback'; title:string; detail:string; outcome:'success'|'info'|'error' }
export interface Decision { intent:string; action:string; reason:string; confidence:number; source:'rules'|'knowledge'|'tickets'|'gemini'; trace?:DecisionTraceStep[] }
export interface Message { id:string; sender:'employee'|'agent'|'analyst'; text:string; at:string; decision?:Decision }
export interface TicketDraft { step:'description'|'impact'|'urgency'|'confirmation'; description?:string; impacted?:string; urgency?:string; title?:string; type?:'INC'|'REQ'; category?:Category; priority?:Priority; affected?:string; duplicateId?:string }
export interface Conversation { id:string; userId:string; state:'agent'|'waiting_analyst'|'analyst'|'closed'; messages:Message[]; pendingDraft?:TicketDraft; processing?:{token:string;startedAt:string}; updatedAt:string }
export interface Store { users:User[]; tickets:Ticket[]; conversations:Conversation[] }
