import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getPresignedUrl } from '@/lib/s3';

// GET /api/batches/[id]/export — Download output Excel
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const { id } = params;

    const result = await query(`SELECT output_excel_url FROM batches WHERE id = $1`, [id]);
    if (result.rowCount === 0 || !result.rows[0].output_excel_url) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
    }

    const url = await getPresignedUrl(result.rows[0].output_excel_url, 3600);
    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
