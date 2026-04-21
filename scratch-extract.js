const fs = require('fs');
const PDFParser = require("pdf2json");

const pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
pdfParser.on("pdfParser_dataReady", pdfData => {
    fs.writeFileSync("./extracted.json", JSON.stringify(pdfData, null, 2));
    console.log("Extracted to extracted.json");
});

pdfParser.loadPDF("z:/03 NEW/2026/17 PERNYATAAN NENKIN 20/Surat_new.pdf");
