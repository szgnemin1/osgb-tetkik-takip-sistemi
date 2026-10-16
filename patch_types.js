import fs from 'fs';

let content = fs.readFileSync('types.ts', 'utf8');

// Update MedicalInstitution
content = content.replace(/whatsappTemplate\?: string; \/\/ Gnderilecek mesaj tasla/g, 
  "whatsappTemplate?: string; // Gnderilecek mesaj tasla\n  portalType?: 'VETA' | 'INFOMED' | 'NONE';\n  portalUrl?: string;\n  portalUsername?: string;\n  portalPassword?: string;"
);

// Update Referral
content = content.replace(/odealStatus\?: string;/g,
  "odealStatus?: string;\n  resultPdfPath?: string;\n  lastCheckedAt?: string;"
);

fs.writeFileSync('types.ts', content);
console.log("types.ts patched");
