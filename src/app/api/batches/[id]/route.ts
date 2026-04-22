import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { getPresignedUrl } from '@/lib/s3';
import { createAuditLog } from '@/services/audit.service';

// GET /api/batches/[id] — Batch detail
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  try {
    const user = await requireAuth();
    const { id } = params;

    let result;
    if (user.role === 'super_admin') {
      result = await query(
        `SELECT b.*, u.name AS uploader_name FROM batches b LEFT JOIN users u ON b.uploaded_by = u.id WHERE b.id = $1`,
        [id]
      );
    } else {
      result = await query(
        `SELECT b.*, u.name AS uploader_name FROM batches b LEFT JOIN users u ON b.uploaded_by = u.id
         WHERE b.id = $1 AND (b.uploaded_by = $2 OR EXISTS(SELECT 1 FROM clients c WHERE c.batch_id = b.id AND c.pic_user_id = $2))`,
        [id, user.id]
      );
    }

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Batch tidak ditemukan' }, { status: 404 });
    }

    let clientsResult;
    const batch = result.rows[0];

    if (user.role === 'super_admin') {
      // Super admin sees all clients
      clientsResult = await query(
        `SELECT id, full_name, nik, status, slug, TO_CHAR(birth_date, 'DD/MM/YYYY') as birth_date_str, signed_at, viewed_at, link_expires_at, pic_name
         FROM clients WHERE batch_id = $1 ORDER BY created_at ASC`,
        [id]
      );
    } else {
      // Staff only sees their own PIC clients
      clientsResult = await query(
        `SELECT id, full_name, nik, status, slug, TO_CHAR(birth_date, 'DD/MM/YYYY') as birth_date_str, signed_at, viewed_at, link_expires_at, pic_name
         FROM clients WHERE batch_id = $1 AND LOWER(pic_name) = LOWER($2) ORDER BY created_at ASC`,
        [id, user.name]
      );

      // Override batch counts with PIC-filtered values
      batch.total_clients = clientsResult.rowCount;
      batch.signed_count = clientsResult.rows.filter((c: any) => c.status === 'signed').length;
    }

    return NextResponse.json({
      batch,
      clients: clientsResult.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/batches/[id] — Delete batch (super_admin only)
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  try {
    const user = await requireAdmin();
    const { id } = params;

    const result = await query(`DELETE FROM batches WHERE id = $1 RETURNING id, batch_name`, [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Batch tidak ditemukan' }, { status: 404 });
    }

    await createAuditLog({
      actorId: user.id,
      actorType: 'super_admin',
      action: 'batch_delete',
      targetId: id,
      metadata: { batchName: result.rows[0].batch_name },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/batches/[id] — Update batch name
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  try {
    const user = await requireAuth();
    const { id } = params;
    
    // Check permission: super admin OR uploader
    const checkRes = await query(`SELECT uploaded_by FROM batches WHERE id = $1`, [id]);
    if (checkRes.rowCount === 0) {
      return NextResponse.json({ error: 'Batch tidak ditemukan' }, { status: 404 });
    }
    if (user.role !== 'super_admin' && checkRes.rows[0].uploaded_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    if (!body.batch_name || !body.batch_name.trim()) {
      return NextResponse.json({ error: 'Nama batch tidak boleh kosong' }, { status: 400 });
    }

    const result = await query(
      `UPDATE batches SET batch_name = $1 WHERE id = $2 RETURNING id, batch_name`,
      [body.batch_name.trim(), id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Batch tidak ditemukan' }, { status: 404 });
    }

    await createAuditLog({
      actorId: user.id,
      actorType: 'super_admin',
      action: 'batch_update',
      targetId: id,
      metadata: { newBatchName: result.rows[0].batch_name },
    });

    return NextResponse.json({ success: true, batch: result.rows[0] });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
