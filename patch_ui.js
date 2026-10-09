const fs = require('fs');
let text = fs.readFileSync('components/NewReferralModal.tsx', 'utf8');

// Remove city state
text = text.replace(/const \[city, setCity\] = useState\('Bursa'\);\n\s*/g, '');
// Remove town state
text = text.replace(/const \[town, setTown\] = useState\('Mudanya'\);\n\s*/g, '');

// Remove setCity / setTown from initialData population
text = text.replace(/setCity\(initialData\.employee\.city \|\| 'Bursa'\);\n\s*/g, '');
text = text.replace(/setTown\(initialData\.employee\.town \|\| 'Mudanya'\);\n\s*/g, '');

// Remove city, town from selectedCompany payload
text = text.replace(/city,\n\s*town,\n\s*/g, '');

// Remove city / town UI blocks from desktop and mobile views
const cityTownRegex1 = /<div className="grid grid-cols-2 gap-3">\s*<div>\s*<label[^>]*>İl<\/label>[\s\S]*?<\/select>\s*<\/div>\s*<div>\s*<label[^>]*>İlçe<\/label>[\s\S]*?<\/select>\s*<\/div>\s*<\/div>/g;
text = text.replace(cityTownRegex1, '');

fs.writeFileSync('components/NewReferralModal.tsx', text, 'utf8');
console.log("Removed city and town from UI");
