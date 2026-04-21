import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/batches — List batches (SA: all, Staff: own PIC-filtered counts)
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    let result;

    if (user.role === 'super_admin') {
      result = await query(
        `SELECT b.*, u.name AS uploader_name
         FROM batches b
         LEFT JOIN users u ON b.uploaded_by = u.id
         ORDER BY b.uploaded_at DESC`
      );
    } else {
      // Staff: get batches where they are PIC, with per-PIC counts
      result = await query(
        `SELECT
           b.id, b.batch_name, b.uploaded_by, b.uploaded_at, b.output_excel_url,
           u.name AS uploader_name,
           COUNT(c.id)::int AS total_clients,
           COUNT(c.id) FILTER (WHERE c.status = 'signed')::int AS signed_count
         FROM batches b
         LEFT JOIN users u ON b.uploaded_by = u.id
         INNER JOIN clients c ON c.batch_id = b.id
         WHERE LOWER(c.pic_name) = LOWER($1)
         GROUP BY b.id, b.batch_name, b.uploaded_by, b.uploaded_at, b.output_excel_url, u.name
         ORDER BY b.uploaded_at DESC`,
        [user.name]
      );
    }

    return NextResponse.json({ batches: result.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
