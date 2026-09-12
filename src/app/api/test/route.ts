import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      env: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        databaseUrl: !!process.env.DATABASE_URL,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed',
      message: (error as Error).message 
    }, { status: 500 });
  }
}
