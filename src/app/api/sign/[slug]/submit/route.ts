import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateSignedPdf } from '@/lib/pdf';
import { s3Client, uploadFileToS3 } from '@/lib/s3';
import { createAuditLog } from '@/services/audit.service';

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// POST /api/sign/[slug]/submit — Submit signature + optional additional data
export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = params;

  try {
    const body = await req.json();
    const { signatureImageBase64, nik, address, city } = body;

    if (!signatureImageBase64) {
      return NextResponse.json({ error: 'Tanda tangan wajib diisi.' }, { status: 400 });
    }

    // Idempotent check — FOR UPDATE prevents race condition (SEC-04)
    const result = await query(
      `SELECT id, status, batch_id, full_name, TO_CHAR(birth_date, 'YYYY-MM-DD') as birth_date_str,
              nik, address, city, letter_number
       FROM clients WHERE slug = $1 FOR UPDATE`,
      [slug]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Klien tidak ditemukan.' }, { status: 404 });
    }

    const client = result.rows[0];

    // Allow submission from 'pending' or 'viewed' status
    if (client.status !== 'pending' && client.status !== 'viewed') {
      return NextResponse.json({ error: 'Dokumen sudah ditandatangani atau kedaluwarsa.' }, { status: 400 });
    }

    // ─── Resolve final NIK/address/city ──────────────────────────
    // Use DB value if available, otherwise use client-submitted value
    const finalNik = client.nik || nik || '';
    const finalAddress = client.address || address || '';
    const finalCity = client.city || city || '';

    // ─── Server-side validation: these fields MUST be filled ─────
    if (!finalNik) {
      return NextResponse.json({ error: 'NIK wajib diisi.' }, { status: 400 });
    }
    if (!/^\d{16}$/.test(finalNik)) {
      return NextResponse.json({ error: 'NIK harus 16 digit angka.' }, { status: 400 });
    }
    if (!finalAddress) {
      return NextResponse.json({ error: 'Alamat Sesuai KTP wajib diisi.' }, { status: 400 });
    }
    if (!finalCity) {
      return NextResponse.json({ error: 'Kota wajib diisi.' }, { status: 400 });
    }

    // ─── Generate server-side signing date (WIB / Asia/Jakarta) ──
    const now = new Date();
    const wibFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const signingDate = wibFormatter.format(now);

    // Format birth date for PDF
    const birthDateParts = client.birth_date_str.split('-');
    const birthDateFormatted = birthDateParts.length === 3
      ? `${parseInt(birthDateParts[2])} ${MONTHS_ID[parseInt(birthDateParts[1]) - 1]} ${birthDateParts[0]}`
      : client.birth_date_str;

    // ─── Extract base64 data ─────────────────────────────────────
    const base64Data = signatureImageBase64.replace(/^data:image\/png;base64,/, '');
    const sigBuffer = Buffer.from(base64Data, 'base64');

    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 1. Upload signature PNG to S3
    const sigKey = `signatures/${year}/${month}/${slug}_sig.png`;
    await uploadFileToS3(sigKey, sigBuffer, 'image/png');

    // 2. Generate final signed PDF from template (NOT from blank PDF)
    //    This ensures all client data + server date + signature are properly embedded
    const signedPdfBuffer = await generateSignedPdf(sigBuffer, {
      fullName: client.full_name,
      birthDate: birthDateFormatted,
      nik: finalNik,
      address: finalAddress,
      city: finalCity,
      signingDate: signingDate,
    });

    // 3. Upload signed PDF to S3
    const signedPdfKey = `signed/${year}/${month}/${slug}.pdf`;
    await uploadFileToS3(signedPdfKey, signedPdfBuffer, 'application/pdf');

    // 4. Update client record in DB
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await query(
      `UPDATE clients SET
        status = 'signed',
        signed_at = NOW(),
        nik = $1,
        address = $2,
        city = $3,
        signature_image_url = $4,
        signed_pdf_url = $5,
        ip_address = $6,
        user_agent = $7,
        updated_at = NOW()
       WHERE slug = $8`,
      [finalNik, finalAddress, finalCity, sigKey, signedPdfKey, ip, userAgent, slug]
    );

    // 5. Increment signed_count on batch
    await query(
      `UPDATE batches SET signed_count = signed_count + 1 WHERE id = $1`,
      [client.batch_id]
    );

    // 6. Audit log
    await createAuditLog({
      actorId: null,
      actorType: 'client',
      action: 'client_signed',
      targetId: client.id,
      metadata: {
        slug,
        ip,
        signingDate,
        additionalDataProvided: !client.nik || !client.address || !client.city,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Submit signature error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
