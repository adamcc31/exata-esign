const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('route.ts') || file.endsWith('page.tsx')) results.push(file);
    }
  });
  return results;
}
const files = walk('./src/app');
let modifiedFiles = 0;
for(const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('{ params }') || content.includes('params: {')) {
    
    let changed = false;

    // Fix for API routes GET/POST/PUT/PATCH/DELETE
    // export async function GET(req: NextRequest, { params }: { params: { id: string } })
    const regex1 = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*(req|request)\s*:\s*NextRequest\s*,\s*\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{\s*([a-zA-Z0-9_]+)\s*:\s*string\s*;?\s*\}\s*\}\s*\)\s*\{/g;
    content = content.replace(regex1, (match, method, reqVar, paramName) => {
        changed = true;
        return `export async function ${method}(${reqVar}: NextRequest, props: { params: Promise<{ ${paramName}: string }> }) {
  const params = await props.params;
  const { ${paramName} } = params;`;
    });

    const regex1_any = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*(req|request)\s*:\s*NextRequest\s*,\s*\{\s*params\s*\}\s*:\s*any\s*\)\s*\{/g;
    content = content.replace(regex1_any, (match, method, reqVar) => {
        changed = true;
        return `export async function ${method}(${reqVar}: NextRequest, props: { params: Promise<any> }) {
  const params = await props.params;`;
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedFiles++;
        console.log('Fixed', file);
    }
  }
}
console.log('Fixed files:', modifiedFiles);
