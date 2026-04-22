import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';

// Load the Surat.pdf template shipped alongside the project
async function getTemplateBytes(): Promise<Uint8Array> {
  const bundledPath = path.join(process.cwd(), 'public', 'templates', 'Surat.pdf');
  if (fs.existsSync(bundledPath)) {
    return fs.readFileSync(bundledPath);
  }
  const parentPath = path.join(process.cwd(), '..', 'Surat.pdf');
  if (fs.existsSync(parentPath)) {
    return fs.readFileSync(parentPath);
  }
  console.warn('[PDF] Template not found, generating blank fallback.');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([595.28, 841.89]);
  return pdfDoc.save();
}

// Load the custom font (shared helper)
async function loadFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  pdfDoc.registerFontkit(fontkit);
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'GoogleSans-Regular.ttf');
  if (fs.existsSync(fontPath)) {
    const fontBytes = fs.readFileSync(fontPath);
    return pdfDoc.embedFont(fontBytes);
  }
  return pdfDoc.embedFont(StandardFonts.Helvetica);
}

interface BlankPdfData {
  fullName: string;
  birthDate: string;
  nik: string;
  address: string;
  city: string;
  date?: string;  // Optional date for when the PDF is regenerated after filling data
}

/**
 * Generate a pre-filled PDF (without signature).
 * 
 * IMPORTANT: The Surat.pdf template ALREADY has printed labels
 * (Nama Lengkap, Nomor KTP / NIK, etc.) and colons.
 * We ONLY overlay the VALUES — no labels, no colons.
 * 
 * Fields that are empty (NIK, address, city) will show "—" placeholder.
 * The date field is left blank — it will be filled at signing time.
 * 
 * The coordinates below are calibrated for the actual Surat.pdf template (595.32 x 842.04 A4).
 * Y coordinates in pdf-lib start from BOTTOM (0) to TOP (842).
 */
export async function generateBlankPdf(data: BlankPdfData): Promise<Buffer> {
  const templateBytes = await getTemplateBytes();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await loadFont(pdfDoc);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];

  const fontSize = 11;
  const color = rgb(0, 0, 0);

  // ═══════════════════════════════════════════════════════
  // PAGE 1 — Client data fields
  // Use "—" for empty fields (will be filled at signing time)
  // ═══════════════════════════════════════════════════════

  const fieldPositions = [
    { value: data.fullName || '—', x: 225, y: 725 },
    { value: data.birthDate || '—', x: 225, y: 701 },
    { value: data.nik || '—', x: 225, y: 677 },
    { value: data.address || '—', x: 225, y: 653 },
  ];

  fieldPositions.forEach(({ value, x, y }) => {
    page1.drawText(value, { x, y, size: fontSize, font, color });
  });

  // Kota & Tanggal — date is blank at upload time, but filled if regenerated after user completes data
  if (data.city && data.date) {
    page1.drawText(`${data.city}, ${data.date}`, { x: 440, y: 188, size: fontSize, font, color });
  } else if (data.city) {
    page1.drawText(`${data.city},`, { x: 440, y: 188, size: fontSize, font, color });
  } else if (data.date) {
    page1.drawText(data.date, { x: 440, y: 188, size: fontSize, font, color });
  }

  // Nama Lengkap at the bottom under signature area
  // Centered under the "Yang Membuat Pernyataan" column (~x=410 to ~x=560)
  const nameWidth = font.widthOfTextAtSize(data.fullName, fontSize);
  const signatureAreaCenterX = 490; // Center of the signature column
  const nameX = Math.max(signatureAreaCenterX - nameWidth / 2, 390); // Don't go too far left
  
  page1.drawText(`${data.fullName}`, { x: nameX, y: 68, size: fontSize, font, color });

  // PDF metadata
  pdfDoc.setTitle(`Surat Pernyataan - ${data.fullName}`);
  pdfDoc.setAuthor('PT. Sumber Rezeki Exata Indonesia');
  pdfDoc.setCreationDate(new Date());

  return Buffer.from(await pdfDoc.save());
}

interface SignedPdfData {
  fullName: string;
  birthDate: string;
  nik: string;
  address: string;
  city: string;
  signingDate: string;  // Server-generated, e.g. "26 April 2026"
}

/**
 * Generate the FINAL signed PDF from template with COMPLETE data + embedded signature.
 * 
 * This regenerates the PDF from the original template (NOT from blank PDF).
 * This ensures:
 * - Client-submitted NIK/address/city are properly embedded
 * - Server-generated signing date is used (not Excel date)
 * - No placeholder "—" text appears in the final document
 */
export async function generateSignedPdf(
  signatureImageBytes: Buffer,
  data: SignedPdfData
): Promise<Buffer> {
  const templateBytes = await getTemplateBytes();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await loadFont(pdfDoc);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];

  const fontSize = 11;
  const color = rgb(0, 0, 0);

  // ═══════════════════════════════════════════════════════
  // PAGE 1 — Client data fields (all complete now)
  // ═══════════════════════════════════════════════════════

  const fieldPositions = [
    { value: data.fullName, x: 225, y: 725 },
    { value: data.birthDate, x: 225, y: 701 },
    { value: data.nik, x: 225, y: 677 },
    { value: data.address, x: 225, y: 653 },
  ];

  fieldPositions.forEach(({ value, x, y }) => {
    page1.drawText(value || '-', { x, y, size: fontSize, font, color });
  });

  // Kota & Tanggal (server-generated signing date)
  if (data.city && data.signingDate) {
    page1.drawText(`${data.city}, ${data.signingDate}`, { x: 440, y: 188, size: fontSize, font, color });
  } else if (data.signingDate) {
    page1.drawText(data.signingDate, { x: 440, y: 188, size: fontSize, font, color });
  }

  // Nama Lengkap at the bottom under signature
  // Centered under the "Yang Membuat Pernyataan" column (~x=410 to ~x=560)
  const nameWidth = font.widthOfTextAtSize(data.fullName, fontSize);
  const signatureAreaCenterX = 490; // Center of the signature column
  const nameX = Math.max(signatureAreaCenterX - nameWidth / 2, 390); // Don't go too far left
  page1.drawText(data.fullName, { x: nameX, y: 68, size: fontSize, font, color });

  // ═══════════════════════════════════════════════════════
  // Embed signature image
  // ═══════════════════════════════════════════════════════
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

  // Scale signature — larger for better visibility
  const sigDims = signatureImage.scale(0.5);
  const maxWidth = 150;
  const maxHeight = 70;
  const scale = Math.min(maxWidth / sigDims.width, maxHeight / sigDims.height, 1);

  // Center signature above the name in the "Yang Membuat Pernyataan" area
  const sigWidth = sigDims.width * scale;
  const sigX = signatureAreaCenterX - sigWidth / 2;

  page1.drawImage(signatureImage, {
    x: sigX,
    y: 90,
    width: sigWidth,
    height: sigDims.height * scale,
  });

  // PDF metadata
  pdfDoc.setTitle(`Surat Pernyataan - ${data.fullName}`);
  pdfDoc.setAuthor('PT. Sumber Rezeki Exata Indonesia');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  return Buffer.from(await pdfDoc.save());
}
