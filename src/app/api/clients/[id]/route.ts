import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getPresignedUrl } from '@/lib/s3';

// GET /api/clients/[id] — Client detail
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  try {
    const user = await requireAuth();
    const { id } = params;

    let result;
    if (user.role === 'super_admin') {
      result = await query(`SELECT * FROM clients WHERE id = $1`, [id]);
    } else {
      result = await query(
        `SELECT * FROM clients WHERE id = $1 AND (pic_user_id = $2 OR batch_id IN (SELECT id FROM batches WHERE uploaded_by = $2))`,
        [id, user.id]
      );
    }

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Klien tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ client: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
