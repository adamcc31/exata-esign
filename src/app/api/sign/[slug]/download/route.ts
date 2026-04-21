import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPresignedUrl } from '@/lib/s3';

// GET /api/sign/[slug]/download — Download signed PDF (client)
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    const result = await query(
      `SELECT signed_pdf_url, status, full_name, TO_CHAR(birth_date, 'DD-MM-YYYY') as birth_date FROM clients WHERE slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Klien tidak ditemukan.' }, { status: 404 });
    }

    const client = result.rows[0];
    if (client.status !== 'signed' || !client.signed_pdf_url) {
      return NextResponse.json({ error: 'Dokumen belum ditandatangani.' }, { status: 400 });
    }

    const filename = `${client.full_name}-${client.birth_date}.pdf`.replace(/\//g, '-');
    const url = await getPresignedUrl(client.signed_pdf_url, 3600, filename);
    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
