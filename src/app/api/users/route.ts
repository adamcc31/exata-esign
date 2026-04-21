import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import bcrypt from 'bcrypt';
import { createAuditLog } from '@/services/audit.service';

// GET /api/users — List all staff
export async function GET() {
  try {
    await requireAdmin();
    const result = await query(
      `SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC`
    );
    return NextResponse.json({ users: result.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}

// POST /api/users — Create staff account
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nama, email, dan password wajib diisi.' }, { status: 400 });
    }

    const validRole = role === 'super_admin' ? 'super_admin' : 'staff';
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, passwordHash, validRole]
    );

    await createAuditLog({
      actorId: admin.id,
      actorType: 'super_admin',
      action: 'user_create',
      targetId: result.rows[0].id,
      metadata: { email, role: validRole },
    });

    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email sudah terdaftar.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
