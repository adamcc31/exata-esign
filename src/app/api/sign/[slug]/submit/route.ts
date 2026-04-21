import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateSignedPdf } from '@/lib/pdf';
import { s3Client, uploadFileToS3 } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createAuditLog } from '@/services/audit.service';

async function getBufferFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME || 'exata-nenkin',
    Key: key,
  });
  const response = await s3Client.send(command);
  const stream = response.Body as unknown as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

// POST /api/sign/[slug]/submit — Submit signature
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;

  try {
    const { signatureImageBase64 } = await req.json();
    if (!signatureImageBase64) {
      return NextResponse.json({ error: 'Tanda tangan wajib diisi.' }, { status: 400 });
    }

    // Idempotent check — FOR UPDATE prevents race condition (SEC-04)
    const result = await query(
      `SELECT id, status, blank_pdf_url, batch_id FROM clients WHERE slug = $1 FOR UPDATE`,
      [slug]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Klien tidak ditemukan.' }, { status: 404 });
    }

    const client = result.rows[0];
    if (client.status !== 'pending') {
      return NextResponse.json({ error: 'Dokumen sudah ditandatangani atau kedaluwarsa.' }, { status: 400 });
    }

    // Extract base64 data
    const base64Data = signatureImageBase64.replace(/^data:image\/png;base64,/, '');
    const sigBuffer = Buffer.from(base64Data, 'base64');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const signingDate = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // 1. Upload signature PNG to S3
    const sigKey = `signatures/${year}/${month}/${slug}_sig.png`;
    await uploadFileToS3(sigKey, sigBuffer, 'image/png');

    // 2. Download blank PDF from S3
    const blankPdfBuffer = await getBufferFromS3(client.blank_pdf_url);

    // 3. Generate signed PDF
    const signedPdfBuffer = await generateSignedPdf(blankPdfBuffer, sigBuffer, signingDate);

    // 4. Upload signed PDF to S3
    const signedPdfKey = `signed/${year}/${month}/${slug}.pdf`;
    await uploadFileToS3(signedPdfKey, signedPdfBuffer, 'application/pdf');

    // 5. Update client status in DB
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await query(
      `UPDATE clients SET
        status = 'signed',
        signed_at = NOW(),
        signature_image_url = $1,
        signed_pdf_url = $2,
        ip_address = $3,
        user_agent = $4,
        updated_at = NOW()
       WHERE slug = $5`,
      [sigKey, signedPdfKey, ip, userAgent, slug]
    );

    // 6. Increment signed_count on batch
    await query(
      `UPDATE batches SET signed_count = signed_count + 1 WHERE id = $1`,
      [client.batch_id]
    );

    // 7. Audit log
    await createAuditLog({
      actorId: null,
      actorType: 'client',
      action: 'client_signed',
      targetId: client.id,
      metadata: { slug, ip },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Submit signature error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
