import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Store } from './types';
const dbPath=path.join(process.cwd(),'data','state.json');
const stamp=new Date().toISOString();
const initial:Store={
 users:[{id:'u1',name:'Ana Souza',email:'ana@nexo.com',role:'employee'},{id:'u2',name:'Bruno Lima',email:'bruno@nexo.com',role:'employee'},{id:'a1',name:'Marina Costa',email:'marina@nexo.com',role:'analyst'}],
 tickets:[{id:'INC-20311',userId:'u1',title:'Notebook lento após atualização',description:'Notebook demora para iniciar desde a última atualização.',type:'INC',category:'Hardware',priority:'Média',status:'open',createdAt:stamp,updatedAt:stamp},{id:'REQ-10442',userId:'u1',title:'Segundo monitor',description:'Pedido de monitor para home office.',type:'REQ',category:'Hardware',priority:'Baixa',status:'resolved',createdAt:stamp,updatedAt:stamp},{id:'INC-20150',userId:'u2',title:'Acesso ao SAP',description:'Senha de acesso bloqueada.',type:'INC',category:'Acesso',priority:'Alta',status:'open',createdAt:stamp,updatedAt:stamp}],
 conversations:[]
};
export async function readStore():Promise<Store>{try{return JSON.parse(await fs.readFile(dbPath,'utf8')) as Store;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await fs.mkdir(path.dirname(dbPath),{recursive:true});try{await fs.writeFile(dbPath,JSON.stringify(initial,null,2),{flag:'wx'});}catch(err){if((err as NodeJS.ErrnoException).code!=='EEXIST')throw err;}return JSON.parse(await fs.readFile(dbPath,'utf8')) as Store;}}
// Para a demonstração local: gravação atômica e fila no mesmo processo.
// Não é seguro para múltiplas instâncias; migrar para PostgreSQL em produção.
let pending:Promise<unknown>=Promise.resolve();
export function mutateStore<T>(fn:(store:Store)=>T|Promise<T>):Promise<T>{const job=pending.then(async()=>{const store=await readStore();const result=await fn(store);const tmp=dbPath+'.tmp';await fs.writeFile(tmp,JSON.stringify(store,null,2));await fs.rename(tmp,dbPath);return result;});pending=job.catch(()=>{});return job;}
