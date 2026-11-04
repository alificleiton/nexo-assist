/**
 * Detecção conservadora de ações que alteram o estado.
 * Dúvidas sobre o procedimento devem ser respondidas, nunca executadas.
 * Mensagens ambíguas ficam a cargo do agente (que só possui ferramentas de leitura).
 */
const normalize = (text: string): string => text
  .toLocaleLowerCase('pt-BR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function isExplicitTicketRequest(text: string): boolean {
  const q = normalize(text);
  // Pedidos diretos são privilegiados. Perguntas como "quando devo abrir" não passam.
  if (/^(abrir|criar|registrar|novo|nova) (um |uma |meu |minha )?(chamado|ticket|incidente|solicitacao)( |$)/.test(q)) return true;
  if (/^(quero|gostaria de|preciso|desejo|necessito|vou|podemos|vamos|poderia|pode|por favor|me ajuda a|me ajude a) (abrir|criar|registrar|solicitar) (um |uma |meu |minha )?(chamado|ticket|incidente|solicitacao)( |$)/.test(q)) return true;
  if (/^(preciso de|quero|gostaria de|solicito|necessito de) (um |uma |novo |nova )?(acesso|equipamento|software|monitor|notebook|licenca)( |$)/.test(q)) return true;
  return false;
}

export function isExplicitHumanRequest(text: string): boolean {
  const q = normalize(text);
  return /^(quero|preciso|gostaria de|desejo|necessito|posso|poderia) (falar|conversar) com (um |uma )?(analista|atendente|humano|pessoa real)( |$)/.test(q)
    || /^(chamar|transferir|transfira|encaminhar|encaminhe|solicitar) (para |a |um |uma )?(analista|atendente|humano)( |$)/.test(q);
}
