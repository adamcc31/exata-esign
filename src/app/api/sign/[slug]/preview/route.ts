import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPresignedUrl } from '@/lib/s3';

// GET /api/sign/[slug]/preview — Download blank (pre-filled) PDF for preview before signing
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    const result = await query(
      `SELECT blank_pdf_url, status FROM clients WHERE slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Klien tidak ditemukan.' }, { status: 404 });
    }

    const client = result.rows[0];
    if (!client.blank_pdf_url) {
      return NextResponse.json({ error: 'PDF belum tersedia.' }, { status: 400 });
    }

    const url = await getPresignedUrl(client.blank_pdf_url, 3600);
    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
