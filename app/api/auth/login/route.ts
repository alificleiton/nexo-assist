import { NextResponse } from 'next/server';
import { readStore } from '@/lib/store';
import { sessionCookie,tokenFor } from '@/lib/auth';
export const runtime='nodejs';
export async function POST(req:Request){try{const body=await req.json() as {email?:string;password?:string};const user=(await readStore()).users.find(u=>u.email===body.email?.toLowerCase().trim());if(!user||!body.password)return NextResponse.json({error:'Credenciais inválidas.'},{status:401});const res=NextResponse.json({user});res.cookies.set(sessionCookie,tokenFor(user),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:86400});return res;}catch{return NextResponse.json({error:'Falha ao autenticar.'},{status:400});}}
