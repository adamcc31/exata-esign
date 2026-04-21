import { NextRequest, NextResponse } from 'next/server';
import { BatchService } from '@/services/batch.service';
import { requireAuth } from '@/lib/auth';

// POST /api/batches/upload — Upload Excel batch
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diupload.' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Format file harus .xlsx' }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 5 MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await BatchService.processBatch(buffer, user.id, user.role);

    if (!result.success) {
      return NextResponse.json({ error: 'Validasi gagal', errors: result.errors }, { status: 422 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[API] Batch upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
