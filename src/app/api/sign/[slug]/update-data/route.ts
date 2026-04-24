import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateBlankPdf } from '@/lib/pdf';
import { uploadFileToS3 } from '@/lib/s3';
import { createAuditLog } from '@/services/audit.service';

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/**
 * POST /api/sign/[slug]/update-data
 * 
 * Called when client fills in missing NIK/address/city via the "Lengkapi Data" form.
 * - Validates input
 * - Saves to DB
 * - Regenerates blank PDF with complete data + current date
 * - Returns updated client data
 */
export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = params;

  try {
    const body = await req.json();
    const { nik, address, city, email } = body;

    // Fetch current client record
    const result = await query(
      `SELECT id, status, full_name, TO_CHAR(birth_date, 'YYYY-MM-DD') as birth_date_str,
              nik, address, city, email, blank_pdf_url
       FROM clients WHERE slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Klien tidak ditemukan.' }, { status: 404 });
    }

    const client = result.rows[0];

    // Only allow for pending/viewed status
    if (client.status !== 'pending' && client.status !== 'viewed') {
      return NextResponse.json({ error: 'Dokumen sudah ditandatangani atau kedaluwarsa.' }, { status: 400 });
    }

    // Merge: use submitted value if DB field is empty
    const finalNik = client.nik || (nik || '').trim();
    const finalAddress = client.address || (address || '').trim();
    const finalCity = client.city || (city || '').trim();
    const finalEmail = client.email || (email || '').trim();

    // Validate
    if (finalNik && !/^\d{16}$/.test(finalNik)) {
      return NextResponse.json({ error: 'NIK harus 16 digit angka.' }, { status: 400 });
    }
    if (!finalNik) {
      return NextResponse.json({ error: 'NIK wajib diisi.' }, { status: 400 });
    }
    if (!finalAddress) {
      return NextResponse.json({ error: 'Alamat Sesuai KTP wajib diisi.' }, { status: 400 });
    }
    if (!finalCity) {
      return NextResponse.json({ error: 'Kota wajib diisi.' }, { status: 400 });
    }
    if (!finalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail)) {
      return NextResponse.json({ error: 'Alamat email valid wajib diisi (contoh: nama@domain.com).' }, { status: 400 });
    }

    // Format birth date for PDF
    const birthDateParts = client.birth_date_str.split('-');
    const birthDateFormatted = birthDateParts.length === 3
      ? `${parseInt(birthDateParts[2])} ${MONTHS_ID[parseInt(birthDateParts[1]) - 1]} ${birthDateParts[0]}`
      : client.birth_date_str;

    // Save to DB
    await query(
      `UPDATE clients SET nik = $1, address = $2, city = $3, email = $4, updated_at = NOW() WHERE slug = $5`,
      [finalNik, finalAddress, finalCity, finalEmail, slug]
    );

    // Regenerate blank PDF with COMPLETE data + current date
    const now = new Date();
    const wibFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const currentDate = wibFormatter.format(now);

    const pdfBytes = await generateBlankPdf({
      fullName: client.full_name,
      birthDate: birthDateFormatted,
      nik: finalNik,
      address: finalAddress,
      city: finalCity,
      date: currentDate,
    });

    // Upload regenerated PDF to S3 (same key overwrites)
    const pdfKey = client.blank_pdf_url || `blank-pdfs/${now.getFullYear()}/${now.getMonth() + 1}/${slug}_blank.pdf`;
    await uploadFileToS3(pdfKey, pdfBytes, 'application/pdf');

    // Update blank_pdf_url if it changed
    if (!client.blank_pdf_url) {
      await query(`UPDATE clients SET blank_pdf_url = $1 WHERE slug = $2`, [pdfKey, slug]);
    }

    // Audit log
    await createAuditLog({
      actorId: null,
      actorType: 'client',
      action: 'client_data_updated',
      targetId: client.id,
      metadata: { slug, fieldsUpdated: { nik: !client.nik, address: !client.address, city: !client.city } },
    });

    return NextResponse.json({
      success: true,
      clientData: {
        id: client.id,
        fullName: client.full_name,
        birthDate: client.birth_date_str,
        nik: finalNik,
        address: finalAddress,
        city: finalCity,
        email: finalEmail,
        letterNumber: slug,
        signingDate: currentDate,
      },
    });
  } catch (error: any) {
    console.error('[API] Update data error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
