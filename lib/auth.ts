import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { readStore } from './store';
import type { User } from './types';
const cookieName='nexo_session';
function secret(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw new Error('Defina SESSION_SECRET com pelo menos 32 caracteres no .env.local');return s;}
function sign(payload:string){return createHmac('sha256',secret()).update(payload).digest('hex');}
export function tokenFor(user:User){const payload=Buffer.from(JSON.stringify({id:user.id,exp:Date.now()+86400000})).toString('base64url');return `${payload}.${sign(payload)}`;}
export async function currentUser():Promise<User|null>{const token=(await cookies()).get(cookieName)?.value;if(!token)return null;const [payload,mac]=token.split('.');if(!payload||!mac)return null;const expected=sign(payload);if(mac.length!==expected.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return null;try{const obj=JSON.parse(Buffer.from(payload,'base64url').toString()) as {id:string;exp:number};if(Date.now()>obj.exp)return null;return (await readStore()).users.find(u=>u.id===obj.id)??null;}catch{return null;}}
export const sessionCookie=cookieName;
