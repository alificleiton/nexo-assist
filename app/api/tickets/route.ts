import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { readStore } from '@/lib/store';
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:'Não autorizado'},{status:401});const db=await readStore();return NextResponse.json({tickets:user.role==='analyst'?db.tickets:db.tickets.filter(t=>t.userId===user.id)});}
