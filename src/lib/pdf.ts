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

interface BlankPdfData {
  fullName: string;
  birthDate: string;
  nik: string;
  address: string;
  city: string;
  date: string;
}

/**
 * Generate a pre-filled PDF (without signature).
 * 
 * IMPORTANT: The Surat.pdf template ALREADY has printed labels
 * (Nama Lengkap, Nomor KTP / NIK, etc.) and colons.
 * We ONLY overlay the VALUES — no labels, no colons.
 * 
 * The coordinates below are calibrated for the actual Surat.pdf template (595.32 x 842.04 A4).
 * Y coordinates in pdf-lib start from BOTTOM (0) to TOP (842).
 * 
 * Use calibration-grid.pdf to visually verify positions.
 */
export async function generateBlankPdf(data: BlankPdfData): Promise<Buffer> {
  const templateBytes = await getTemplateBytes();
  const pdfDoc = await PDFDocument.load(templateBytes);

  // Register fontkit & Embed Google Sans TTF
  pdfDoc.registerFontkit(fontkit);
  let font: PDFFont;
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'GoogleSans-Regular.ttf');
  if (fs.existsSync(fontPath)) {
    const fontBytes = fs.readFileSync(fontPath);
    font = await pdfDoc.embedFont(fontBytes);
  } else {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const { height } = page1.getSize();

  const fontSize = 11;
  const color = rgb(0, 0, 0);

  // ═══════════════════════════════════════════════════════
  // PAGE 1 — Client data fields
  // ═══════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════

  // Form fields mapped to new positions
  const fieldPositions = [
    { value: data.fullName, x: 225, y: 725 },
    { value: data.birthDate, x: 225, y: 701 },
    { value: data.nik, x: 225, y: 677 },
    { value: data.address, x: 225, y: 653 },
  ];

  fieldPositions.forEach(({ value, x, y }) => {
    page1.drawText(value || '-', { x, y, size: fontSize, font, color });
  });

  // Kota & Tanggal
  if (data.city && data.date) {
    page1.drawText(`${data.city}, ${data.date}`, { x: 440, y: 188, size: fontSize, font, color });
  }

  // Nama Lengkap at the bottom under signature
  // Rata kanan (Right-aligned) agar nama panjang memanjang ke kiri
  const nameWidth = font.widthOfTextAtSize(data.fullName, fontSize);
  const rightAnchorX = 550; // Perkiraan batas margin kanan dokumen
  const nameX = rightAnchorX - nameWidth;
  
  page1.drawText(`${data.fullName}`, { x: nameX, y: 68, size: fontSize, font, color });

  // PDF metadata
  pdfDoc.setTitle(`Surat Pernyataan - ${data.fullName}`);
  pdfDoc.setAuthor('PT. Sumber Rezeki Exata Indonesia');
  pdfDoc.setCreationDate(new Date());

  return Buffer.from(await pdfDoc.save());
}

/**
 * Overlay signature image onto a pre-filled PDF.
 * Signature goes in the "Yang Membuat Pernyataan" area on the LAST page.
 */
export async function generateSignedPdf(
  blankPdfBytes: Buffer,
  signatureImageBytes: Buffer,
  signingDate: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(blankPdfBytes);
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const lastPage = pages[0]; // NOW ON PAGE 1

  // Scale signature
  const sigDims = signatureImage.scale(0.5);
  const maxWidth = 100;
  const maxHeight = 50;
  const scale = Math.min(maxWidth / sigDims.width, maxHeight / sigDims.height, 1);

  // Tanda tangan placed above the name on Page 1 (X=440, Y=106)
  lastPage.drawImage(signatureImage, {
    x: 440,
    y: 100,
    width: sigDims.width * scale,
    height: sigDims.height * scale,
  });

  // Since Tanggal is already embedded by generateBlankPdf or Excel data, 
  // we do not overlay signingDate manually here anymore, or we can fallback overlay it.

  pdfDoc.setModificationDate(new Date());

  return Buffer.from(await pdfDoc.save());
}
