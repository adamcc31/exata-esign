import { generateBlankPdf, generateSignedPdf } from './src/lib/pdf';
import fs from 'fs';

async function test() {
  const data = {
    fullName: "Budi Santoso",
    birthDate: "01/01/1990",
    nik: "1234567890123456",
    address: "Jl. Merdeka No 123",
    city: "Jakarta",
    date: "12 April 2026"
  };

  const blankPdf = await generateBlankPdf(data);
  fs.writeFileSync('test-blank.pdf', blankPdf);
  console.log('test-blank.pdf generated');

  // Dummy 150x50 png
  const dummySignature = Buffer.from('89504e470d0a1a0a0000000d494844520000000a0000000a08060000008d32cfbd0000000b49444154185763fcffff3f0300060901e149eeb4950000000049454e44ae426082', 'hex');
  const signedPdf = await generateSignedPdf(blankPdf, dummySignature, '12 April 2026');
  fs.writeFileSync('test-signed.pdf', signedPdf);
  console.log('test-signed.pdf generated');
}

test().catch(console.error);
