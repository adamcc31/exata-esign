import { query, pool } from '@/lib/db';
import { validateAndParseBatchExcel, generateOutputExcel, type ValidationError } from '@/lib/excel';
import { generateBlankPdf } from '@/lib/pdf';
import { uploadFileToS3 } from '@/lib/s3';
import { createAuditLog } from '@/services/audit.service';
import crypto from 'crypto';

interface BatchResult {
  success: boolean;
  batchId?: string;
  recordsProcessed?: number;
  errors?: ValidationError[];
}

export class BatchService {
  /**
   * Full batch processing pipeline:
   * 1. Parse & validate Excel
   * 2. Create batch record
   * 3. Match PIC to users
   * 4. Create client records with slugs & letter numbers
   * 5. Generate blank PDFs
   * 6. Generate output Excel
   * 7. Write audit log
   */
  static async processBatch(
    fileBuffer: Buffer,
    userId: string,
    userRole: string
  ): Promise<BatchResult> {
    // 1. Validate Excel
    const { data, rawRows, errors } = validateAndParseBatchExcel(fileBuffer);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Create batch record
      const batchName = `Batch-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
      const batchRes = await client.query(
        `INSERT INTO batches (batch_name, uploaded_by, total_clients) VALUES ($1, $2, $3) RETURNING id`,
        [batchName, userId, data.length]
      );
      const batchId = batchRes.rows[0].id;

      // 3. Pre-fetch all staff users for PIC matching
      const usersRes = await client.query(
        `SELECT id, name, email FROM users WHERE is_active = true`
      );
      const staffUsers = usersRes.rows;

      // Restrict staff users to only upload their own PIC data
      if (userRole === 'staff') {
        const uploader = staffUsers.find(u => u.id === userId);
        const uploaderName = uploader?.name?.toLowerCase().trim() || '';

        for (let i = 0; i < data.length; i++) {
          const rowPicName = data[i].picName?.toLowerCase().trim() || '';
          if (rowPicName !== uploaderName) {
            await client.query('ROLLBACK');
            client.release();
            return {
              success: false,
              errors: [{
                row: i + 2,
                column: 'PIC',
                message: `Sebagai staff, Anda hanya dapat mengupload data dengan nama PIC sesuai akun Anda (${uploader?.name || 'Unknown'}). Menemukan: "${data[i].picName || 'Kosong'}".`
              }]
            };
          }
        }
      }

      const outputAppend: Record<string, string>[] = [];
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];

        // Match PIC to user
        let picUserId: string | null = null;
        if (row.picName) {
          const matched = staffUsers.find(
            u =>
              u.name.toLowerCase() === row.picName.toLowerCase() ||
              u.email.toLowerCase() === row.picName.toLowerCase()
          );
          picUserId = matched?.id || null;
        }

        // Generate slug (32-char hex per SEC-01)
        const slug = crypto.randomBytes(16).toString('hex');

        // Expiration: 60 days from now
        const linkExpiresAt = new Date();
        linkExpiresAt.setDate(linkExpiresAt.getDate() + 60);

        // Format date for PDF
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const birthDateStr = !isNaN(row.birthDate.getTime()) 
          ? `${row.birthDate.getDate()} ${months[row.birthDate.getMonth()]} ${row.birthDate.getFullYear()}`
          : '';

        // Generate blank PDF
        const pdfBytes = await generateBlankPdf({
          fullName: row.fullName,
          birthDate: birthDateStr,
          nik: row.nik,
          address: row.address,
          city: row.city,
          date: row.date,
        });

        const pdfKey = `blank-pdfs/${year}/${month}/${slug}_blank.pdf`;
        await uploadFileToS3(pdfKey, pdfBytes, 'application/pdf');

        // Insert client record
        await client.query(
          `INSERT INTO clients (
            batch_id, pic_user_id, full_name, birth_date, nik, address, phone,
            nenkin_number, account_number, pic_name, slug, letter_number,
            link_expires_at, blank_pdf_url
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            batchId, picUserId, row.fullName, row.birthDate, row.nik,
            row.address, row.phone, row.nenkinNumber, row.accountNumber,
            row.picName, slug, slug, linkExpiresAt, pdfKey,
          ]
        );

        outputAppend.push({
          'Link Penandatanganan': `${appUrl}/sign/${slug}`,
          'Berlaku Hingga': linkExpiresAt.toLocaleDateString('id-ID'),
          'Status': 'Menunggu',
        });
      }

      // Generate output Excel
      const outBuffer = generateOutputExcel(rawRows, outputAppend);
      const excelKey = `batch-exports/${batchId}_output.xlsx`;
      await uploadFileToS3(
        excelKey,
        outBuffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      // Update batch with output excel URL
      await client.query(
        `UPDATE batches SET output_excel_url = $1 WHERE id = $2`,
        [excelKey, batchId]
      );

      await client.query('COMMIT');

      // Audit log
      await createAuditLog({
        actorId: userId,
        actorType: userRole as any,
        action: 'batch_upload',
        targetId: batchId,
        metadata: { totalClients: data.length },
      });

      return { success: true, batchId, recordsProcessed: data.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
