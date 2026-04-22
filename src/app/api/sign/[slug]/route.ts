import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/sign/[slug] — Check slug validity (before verification)
// Per SEC-05: only return first name, status, and expiry — no sensitive data
export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = params;
  try {
    const result = await query(
      `SELECT full_name, status, link_expires_at, signed_at FROM clients WHERE slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ status: 'invalid' });
    }

    const client = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(client.link_expires_at);

    // Check if link is expired and status is still pending or viewed
    if ((client.status === 'pending' || client.status === 'viewed') && expiresAt < now) {
      // Auto-update status to expired
      await query(
        `UPDATE clients SET status = 'expired', updated_at = NOW() WHERE slug = $1 AND status IN ('pending', 'viewed')`,
        [slug]
      );
      return NextResponse.json({
        status: 'expired',
        firstName: client.full_name.split(' ')[0],
      });
    }

    if (client.status === 'signed') {
      return NextResponse.json({
        status: 'signed',
        firstName: client.full_name.split(' ')[0],
        signedAt: client.signed_at,
      });
    }

    if (client.status === 'expired') {
      return NextResponse.json({
        status: 'expired',
        firstName: client.full_name.split(' ')[0],
      });
    }

    // Pending or Viewed and not expired — ready for verification
    // Frontend treats both as "verify" state
    return NextResponse.json({
      status: 'pending',
      firstName: client.full_name.split(' ')[0],
      expiresAt: client.link_expires_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
