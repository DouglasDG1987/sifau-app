import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    console.log('Auth GET request');
    const supabase = await createServerClient();
    console.log('Supabase client created');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('User fetched:', { user, error });

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ user, profile });
  } catch (error) {
    console.error('Auth GET error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, nome, role, telefone, bairro } = body;

    console.log('Auth request:', { action, email });

    const supabase = await createServerClient();

    if (action === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, data.user.id),
      });

      if (!profile || !profile.ativo) {
        await supabase.auth.signOut();
        return NextResponse.json({ error: 'Account not found or inactive' }, { status: 401 });
      }

      return NextResponse.json({ user: data.user, profile });
    }

    if (action === 'register') {
      console.log('Register attempt:', { email, nome, role });

      const existingProfile = await db.query.profiles.findFirst({
        where: eq(profiles.email, email),
      });

      if (existingProfile) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Supabase signup error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      console.log('Supabase user created:', data.user?.id);

      const passwordHash = await bcrypt.hash(password, 10);

      await db.insert(profiles).values({
        id: data.user!.id,
        email,
        password_hash: passwordHash,
        role: role || 'cidadao',
        nome: nome || email.split('@')[0],
        telefone,
        bairro,
      });

      console.log('Profile created successfully');

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, data.user!.id),
      });

      return NextResponse.json({ user: data.user, profile });
    }

    if (action === 'logout') {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error as Error).message }, { status: 500 });
  }
}
