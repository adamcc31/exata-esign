import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';

async function generateGrid() {
  const templateBytes = fs.readFileSync('public/templates/Surat.pdf');
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const { width, height } = page1.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Draw X lines
  for (let x = 0; x < width; x += 50) {
    page1.drawLine({ start: { x, y: 0 }, end: { x, y: height }, color: rgb(1, 0, 0), thickness: 0.5 });
    page1.drawText(`${x}`, { x: x + 2, y: height - 10, size: 8, font, color: rgb(1, 0, 0) });
  }

  // Draw Y lines
  for (let y = 0; y < height; y += 50) {
    page1.drawLine({ start: { x: 0, y }, end: { x: width, y }, color: rgb(0, 0, 1), thickness: 0.5 });
    page1.drawText(`${y}`, { x: 2, y: y + 2, size: 8, font, color: rgb(0, 0, 1) });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('calibration-grid.pdf', pdfBytes);
  console.log('Grid PDF saved to calibration-grid.pdf');
}

generateGrid().catch(console.error);
