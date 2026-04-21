import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/audit-logs
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT al.*, u.name AS actor_name, u.email AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM audit_logs`);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      logs: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 });
  }
}
