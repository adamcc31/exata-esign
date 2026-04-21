const fs = require('fs');
const data = require('./extracted.json');

data.Pages[0].Texts.forEach(t => {
  let text = '';
  try {
    text = decodeURIComponent(t.R[0].T);
  } catch(e) {
    text = unescape(t.R[0].T);
  }
  console.log(`x: ${t.x.toFixed(2)}, y: ${t.y.toFixed(2)} - ${text}`);
});
