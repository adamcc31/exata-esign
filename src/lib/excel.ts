import * as xlsx from 'xlsx';

export interface ParsedClientData {
  fullName: string;
  birthDate: Date;
  nik: string;        // May be empty — client fills at signing
  address: string;    // May be empty — client fills at signing
  city: string;       // May be empty — client fills at signing
  phone: string;
  nenkinNumber: string;
  accountNumber: string;
  picName: string;
}

export interface ValidationError {
  row: number;
  column: string;
  message: string;
}

// Only truly required columns in the Excel upload
// NIK, Alamat Sesuai KTP, Kota, Tanggal are now OPTIONAL
const REQUIRED_COLUMNS = [
  'Nama Lengkap',
  'Tanggal Lahir',
  'PIC',
];

// Columns that are accepted but optional
const OPTIONAL_COLUMNS = [
  'NIK',
  'Alamat Sesuai KTP',
  'Kota',
  'Tanggal',  // Ignored — date is server-generated at signing time
];

export function validateAndParseBatchExcel(buffer: Buffer): {
  data: ParsedClientData[];
  rawRows: Record<string, any>[];
  errors: ValidationError[];
} {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];

  const errors: ValidationError[] = [];
  const data: ParsedClientData[] = [];

  if (rawRows.length === 0) {
    errors.push({ row: 0, column: '-', message: 'File Excel kosong, tidak ada data.' });
    return { data, rawRows, errors };
  }

  if (rawRows.length > 500) {
    errors.push({ row: 0, column: '-', message: 'Maksimal 500 baris per batch.' });
    return { data, rawRows, errors };
  }

  // Check required columns exist
  const existingColumns = Object.keys(rawRows[0]);
  for (const col of REQUIRED_COLUMNS) {
    if (!existingColumns.includes(col)) {
      errors.push({ row: 0, column: col, message: `Kolom wajib "${col}" tidak ditemukan.` });
    }
  }
  if (errors.length > 0) return { data, rawRows, errors };

  // NIK duplicate check within batch (only for non-empty NIKs)
  const nikSet = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // Excel row = index + 2 (header is row 1)

    const fullName = String(row['Nama Lengkap'] || '').trim();
    const nikRaw = String(row['NIK'] || '').trim();
    const address = String(row['Alamat Sesuai KTP'] || '').trim();
    const city = String(row['Kota'] || '').trim();
    const phone = String(row['Nomor Telepon / WA'] || '').trim();
    const nenkinNumber = String(row['Nomor Nenkin'] || '').trim();
    const accountNumber = String(row['Nomor Rekening'] || '').trim();
    const picName = String(row['PIC'] || '').trim();

    // Required field checks
    if (!fullName) errors.push({ row: rowNum, column: 'Nama Lengkap', message: 'Nama Lengkap wajib diisi.' });

    // NIK validation: only validate format if provided (not empty)
    if (nikRaw) {
      if (!/^\d{16}$/.test(nikRaw)) {
        errors.push({ row: rowNum, column: 'NIK', message: `NIK harus 16 digit angka, ditemukan: "${nikRaw}".` });
      }
      if (nikSet.has(nikRaw)) {
        errors.push({ row: rowNum, column: 'NIK', message: `NIK "${nikRaw}" duplikat dalam batch ini.` });
      }
      nikSet.add(nikRaw);
    }

    // Date parsing for birth date
    let birthDate: Date;
    const dateVal = row['Tanggal Lahir (YYYYMMDD)'] || row['Tanggal Lahir'];
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      birthDate = dateVal;
    } else {
      const dateStr = String(dateVal || '').trim();
      if (dateStr.length === 8 && /^\d+$/.test(dateStr)) {
        // Format YYYYMMDD (e.g. 19901231)
        const year = Number(dateStr.substring(0, 4));
        const month = Number(dateStr.substring(4, 6));
        const day = Number(dateStr.substring(6, 8));
        birthDate = new Date(year, month - 1, day);
      } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          birthDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          birthDate = new Date(NaN);
        }
      } else {
        birthDate = new Date(dateStr);
      }
    }

    if (isNaN(birthDate.getTime())) {
      errors.push({ row: rowNum, column: 'Tanggal Lahir', message: 'Tanggal Lahir tidak valid.' });
    }

    // "Tanggal" column is now IGNORED — date is server-generated at signing time.
    // We no longer parse or validate it.

    data.push({ fullName, birthDate, nik: nikRaw, address, city, phone, nenkinNumber, accountNumber, picName });
  }

  return { data, rawRows, errors };
}

export function generateOutputExcel(
  rawRows: Record<string, any>[],
  appendedData: Record<string, string>[]
): Buffer {
  const merged = rawRows.map((row, i) => ({ ...row, ...appendedData[i] }));
  const worksheet = xlsx.utils.json_to_sheet(merged);

  // Auto-size columns
  const colWidths = Object.keys(merged[0] || {}).map(key => ({
    wch: Math.max(key.length, ...merged.map(r => String(r[key] || '').length)) + 2,
  }));
  worksheet['!cols'] = colWidths;

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Hasil Batch');
  return Buffer.from(xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}
