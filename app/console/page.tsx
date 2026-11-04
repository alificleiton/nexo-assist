'use client';

import './console.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Conversation, Ticket, User } from '@/lib/types';

type Action = 'assume' | 'return' | 'close' | 'reply';
type Filter = 'queue' | 'active' | 'all' | 'closed';
const labels: Record<Conversation['state'], string> = {
  agent: 'Com agente', waiting_analyst: 'Aguardando analista', analyst: 'Com analista', closed: 'Encerrada'
};

export default function Console() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('queue');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/console', { cache: 'no-store' });
      if (!res.ok) { setError('Acesso exclusivo a analistas. Entre com marina@nexo.com.'); return; }
      const db = await res.json();
      setConversations(db.conversations ?? []);
      setUsers(db.users ?? []);
      setTickets(db.tickets ?? []);
    } catch { setError('Falha ao atualizar o console.'); }
  }, []);
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 4000);
    return () => clearInterval(interval);
  }, [refresh]);
  const shown = useMemo(() => conversations.filter(c =>
    filter === 'all' || (filter === 'queue' && c.state === 'waiting_analyst') ||
    (filter === 'active' && c.state === 'analyst') || (filter === 'closed' && c.state === 'closed')
  ).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)), [conversations,filter]);
  const c = conversations.find(x => x.id === selected);
  const employee = c ? users.find(u => u.id === c.userId) : undefined;
  const related = c ? tickets.filter(t => t.userId === c.userId) : [];
  async function action(kind: Action) {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/console', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: selected, action: kind, ...(kind === 'reply' ? {text:reply} : {}) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao processar ação');
      if (kind === 'reply') setReply('');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro inesperado'); }
    finally { setBusy(false); }
  }
  return <div className="app-shell">
    <aside className="sidebar analyst-sidebar">
      <div className="sidebar-header"><h2>◈ Nexo Assist</h2><span className="mini">Console do analista N1/N2</span></div>
      <button className="secondary" onClick={()=>void refresh()}>Atualizar conversas</button>
      <label htmlFor="queue-filter" className="mini">FILTRAR ATENDIMENTOS</label>
      <select id="queue-filter" value={filter} onChange={e=>setFilter(e.target.value as Filter)} className="console-select">
        <option value="queue">Aguardando ({conversations.filter(c=>c.state==='waiting_analyst').length})</option>
        <option value="active">Em atendimento ({conversations.filter(c=>c.state==='analyst').length})</option>
        <option value="all">Todas ({conversations.length})</option>
        <option value="closed">Encerradas ({conversations.filter(c=>c.state==='closed').length})</option>
      </select>
      <div className="scroll analyst-list" aria-label="Lista de conversas">
        {shown.length===0&&<p className="mini">Nenhuma conversa neste filtro.</p>}
        {shown.map(conv=><button className={`nav-item ${selected===conv.id?'selected':''}`} key={conv.id} onClick={()=>{setSelected(conv.id);setReply('');}}>
          <strong>{users.find(u=>u.id===conv.userId)?.name??'Funcionário'}</strong>
          <small>{labels[conv.state]} · {conv.messages.length} mensagens</small>
          <small>{conv.messages.at(-1)?.text.slice(0,65)??'Sem mensagens'}</small>
        </button>)}
      </div>
      <button className="signout" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});window.location.href='/';}}>Sair</button>
    </aside>
    <main className="console-main">
      <header className="topbar"><div><strong>Console do analista</strong><span>Fila, histórico e atendimento humano</span></div><span className="status">● N1 / N2</span></header>
      {error&&<p className="error padded" role="alert">{error}</p>}
      {!c?<div className="welcome"><h1>Selecione uma conversa</h1><p>As transferências aparecem na fila de atendimento.</p></div>:
      <div className="console-content">
        <div className="console-heading"><div><h2>{employee?.name??'Funcionário'}</h2><p>{employee?.email??''} · <strong>{labels[c.state]}</strong></p></div>
          <div className="actions">
            {c.state==='waiting_analyst'&&<button disabled={busy} onClick={()=>void action('assume')}>Assumir conversa</button>}
            {c.state==='analyst'&&<><button disabled={busy} onClick={()=>void action('return')}>Devolver ao agente</button><button disabled={busy} className="secondary" onClick={()=>void action('close')}>Encerrar</button></>}
          </div>
        </div>
        {c.state==='waiting_analyst'&&<p className="console-note">O agente está pausado. Assuma a conversa para enviar mensagens.</p>}
        {c.state==='analyst'&&<p className="console-note">Atendimento humano ativo: a IA não responderá enquanto você estiver atendendo.</p>}
        <h3>Histórico da conversa</h3>
        <div className="console-history" aria-live="polite">{c.messages.map(m=><div className="history" key={m.id}>
          <strong>{m.sender==='employee'?employee?.name??'Funcionário':m.sender==='analyst'?'Analista':'Nexo Assist'}</strong>
          <small> · {new Date(m.at).toLocaleString('pt-BR')}</small><p>{m.text}</p>
        </div>)}</div>
        {c.state==='analyst'&&<form className="console-reply" onSubmit={e=>{e.preventDefault();void action('reply');}}>
          <label htmlFor="analyst-reply">Responder ao funcionário</label>
          <textarea id="analyst-reply" value={reply} onChange={e=>setReply(e.target.value)} maxLength={2000} rows={3} placeholder="Descreva a orientação ou solicite mais informações..." disabled={busy}/>
          <button disabled={busy||!reply.trim()} type="submit">Enviar resposta</button>
        </form>}
        <h3>Chamados deste funcionário</h3>
        {related.length===0?<p>Nenhum chamado localizado.</p>:related.map(t=><div key={t.id} className="history">
          <strong>{t.id}</strong> · {t.title}<p>{t.type} · {t.category} · {t.priority} · {t.status}</p>
        </div>)}
      </div>}
    </main>
  </div>;
}
