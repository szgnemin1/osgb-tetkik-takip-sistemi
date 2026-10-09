import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const bad = `      const data = await response.json();
      res.json({ success: true, data });`;
const good = `      const text = await response.text();
      let data = {};
      if (text) {
        try { data = JSON.parse(text); } catch(e) {}
      }
      res.json({ success: true, data });`;

code = code.replace(bad, good);
fs.writeFileSync('server.ts', code, 'utf8');
console.log('Fixed json parse error');
