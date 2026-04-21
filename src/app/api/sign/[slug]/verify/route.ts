import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// In-memory rate limiting (production should use Redis)
const rateLimitMap = new Map<string, { attempts: number; lockUntil: number }>();

// POST /api/sign/[slug]/verify — Verify birth date
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateKey = `${ip}_${slug}`;

  // Check rate limit
  const limitData = rateLimitMap.get(rateKey) || { attempts: 0, lockUntil: 0 };
  if (limitData.lockUntil > Date.now()) {
    const remainingMinutes = Math.ceil((limitData.lockUntil - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${remainingMinutes} menit.` },
      { status: 429 }
    );
  }

  try {
    const { birthDate } = await req.json();
    if (!birthDate) {
      return NextResponse.json({ error: 'Tanggal lahir wajib diisi.' }, { status: 400 });
    }

    const result = await query(
      `SELECT id, full_name, TO_CHAR(birth_date, 'YYYY-MM-DD') as birth_date_str, status, link_expires_at, nik, address, phone,
              nenkin_number, account_number, letter_number, blank_pdf_url
       FROM clients WHERE slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Link tidak valid.' }, { status: 404 });
    }

    const client = result.rows[0];

    // Check expired
    if (new Date(client.link_expires_at) < new Date()) {
      await query(`UPDATE clients SET status = 'expired', updated_at = NOW() WHERE slug = $1 AND status = 'pending'`, [slug]);
      return NextResponse.json({ error: 'Link sudah kedaluwarsa.' }, { status: 410 });
    }

    // Check already signed
    if (client.status !== 'pending') {
      return NextResponse.json({ error: 'Dokumen sudah ditandatangani atau link tidak aktif.' }, { status: 400 });
    }

    // Compare dates directly (both are YYYY-MM-DD formatted strings now)
    const dbDate = client.birth_date_str;
    const inputDate = birthDate; // This is the native format returned by <input type="date">

    if (dbDate !== inputDate) {
      limitData.attempts += 1;
      if (limitData.attempts >= 5) {
        limitData.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lock
        limitData.attempts = 0;
      }
      rateLimitMap.set(rateKey, limitData);
      const remaining = 5 - limitData.attempts;
      return NextResponse.json(
        { error: `Tanggal lahir salah. Sisa percobaan: ${remaining}.` },
        { status: 401 }
      );
    }

    // Success — clear rate limit and return client data for preview
    rateLimitMap.delete(rateKey);

    return NextResponse.json({
      success: true,
      clientData: {
        id: client.id,
        fullName: client.full_name,
        birthDate: client.birth_date_str,
        nik: client.nik,
        address: client.address,
        letterNumber: client.letter_number,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
