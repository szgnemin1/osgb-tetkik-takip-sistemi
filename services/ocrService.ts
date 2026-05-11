import Tesseract, { createWorker } from 'tesseract.js';

export interface ExtractedIdInfo {
  fullName: string;
  tcNo: string;
  birthDate: string;
}

let ocrWorker: Tesseract.Worker | null = null;

const getWorker = async () => {
  if (!ocrWorker) {
    ocrWorker = await createWorker('tur');
  }
  return ocrWorker;
};

export const extractIdInfoWithOCR = async (base64Image: string): Promise<ExtractedIdInfo | null> => {
  try {
    const worker = await getWorker();
    const result = await worker.recognize(base64Image);

    const text = result.data.text;
    console.log("OCR Extracted Text:\n", text);

    return parseIdText(text);
  } catch (error) {
    console.error("OCR Error:", error);
    return null;
  }
};

const parseIdText = (text: string): ExtractedIdInfo => {
  const info: ExtractedIdInfo = {
    fullName: '',
    tcNo: '',
    birthDate: ''
  };

  // 1. Önce MRZ kontrolü (Kullanıcının önerdiği mantığa göre)
  // MRZ genellikle 3 satırdan oluşur ve 30'ar karakterdir. Tesseract boşluklar vs. ekleyebilir.
  const mrzLines = text.split('\n').map(l => l.replace(/\s/g, '')).filter(l => l.length >= 25 && (l.includes('<') || /^[A-Z0-9<]+$/.test(l)));
  
  if (mrzLines.length >= 3) {
    console.log("MRZ Detected. Applying MRZ Parsing Logic.");
    // MRZ formatı: 
    // Satır 1: I<TUR...[15:26] -> TC NO
    // Satır 2: YYMMDD...[0:6] -> Doğum Tarihi
    // Satır 3: SOYAD<<AD<AD... -> İsim
    
    // Line 1: Genellikle I<TUR ile başlar
    let line1 = mrzLines.find(l => l.startsWith('I<TUR') || l.startsWith('1<TUR') || l.startsWith('I<'));
    let line3 = mrzLines.slice().reverse().find(l => l !== line1 && l.includes('<<') && /[A-Z]/.test(l));
    let line2 = mrzLines.find(l => l !== line1 && l !== line3 && /^\d{6}/.test(l.replace(/[{}[\]()]/g, '')));

    if (!line1) line1 = mrzLines[0];
    if (!line2) line2 = mrzLines[1];
    if (!line3) line3 = mrzLines[mrzLines.length - 1];

    line1 = line1?.replace(/[{}[\]()]/g, '');
    line2 = line2?.replace(/[{}[\]()]/g, '');
    line3 = line3?.replace(/[{}[\]()]/g, '');

    // Doğum Tarihini al (Satır 2 [0:6])
    if (line2 && line2.length >= 6) {
      // Bazen harfler rakam gibi algılanabilir, düzeltelim
      let datePart = line2.substring(0, 6).replace(/O/g, '0').replace(/I/g, '1').replace(/l/g, '1').replace(/S/g, '5').replace(/Z/g, '2');
      if (/^\d{6}$/.test(datePart)) {
        const yy = datePart.substring(0, 2);
        const mm = datePart.substring(2, 4);
        const dd = datePart.substring(4, 6);
        const yearPrefix = parseInt(yy) > 30 ? '19' : '20';
        info.birthDate = `${yearPrefix}${yy}-${mm}-${dd}`;
      }
    }

    // T.C. No al (Satır 1 [15:26] - güvenilirlik için 11 rakam arıyoruz)
    if (line1) {
      let tcPart = line1.replace(/O/g, '0').replace(/I/g, '1').replace(/l/g, '1').replace(/S/g, '5').replace(/Z/g, '2');
      const tcMatch = tcPart.match(/\d{11}/);
      if (tcMatch) {
        info.tcNo = tcMatch[0];
      } else if (line1.length >= 26) {
         // Fallback 15. index'ten sonrasını al
         let extract = line1.substring(15).replace(/</g, '');
         extract = extract.replace(/[^0-9]/g, '');
         if (extract.length >= 11) {
            info.tcNo = extract.substring(0, 11);
         }
      }
    }

    // Ad Soyad Ayır (Satır 3)
    if (line3) {
       // Olası rakam karışmalarını temizle ve gereksiz karakterleri at (sadece harfler ve < kalmalı)
       // Fakat sadece baştaki ve sondaki parantez vb. önceden temizlendi.
       // İçerideki gereksiz işaretleri at:
       let cleanLine3 = line3.replace(/[^A-ZÇĞİÖŞÜa-zçğıöşü<]/g, '');
       
       // << veya <> veya daha fazla < içeren yerden böl
       // Standartta SOYAD<<AD<IKINCIAD şeklindedir.
       const parts = cleanLine3.split(/<<+/);
       if (parts.length >= 2) {
         let soyad = parts[0].replace(/</g, ' ').trim();
         let ad = parts.slice(1).join(' ').replace(/</g, ' ').replace(/\s+/g, ' ').trim();
         
         const titleCase = (str: string) => str.toLocaleLowerCase('tr-TR').replace(/(?:^|\s)\S/g, a => a.toLocaleUpperCase('tr-TR'));
         
         info.fullName = titleCase(`${ad} ${soyad}`.trim());
       } else {
         // Yanlışlıkla sadece tek < okunmuşsa (nadiren)
         const singleParts = cleanLine3.split('<');
         if (singleParts.length >= 2) {
            let soyad = singleParts[0].trim();
            let ad = singleParts.slice(1).join(' ').trim();
            const titleCase = (str: string) => str.toLocaleLowerCase('tr-TR').replace(/(?:^|\s)\S/g, a => a.toLocaleUpperCase('tr-TR'));
            info.fullName = titleCase(`${ad} ${soyad}`.trim());
         }
       }
    }

    if (info.tcNo && info.birthDate && info.fullName) {
       return info;
    }
  }

  // 2. Standart OCR Regex Fallback (MRZ yetersizse veya yoksa)
  const digitsOnly = text.replace(/[^0-9]/g, '');
  const tcRegex = /\b(\d[\s]*){11}\b/;
  const tcMatchRaw = text.match(tcRegex);
  
  if (!info.tcNo) {
    if (tcMatchRaw) {
      info.tcNo = tcMatchRaw[0].replace(/\s/g, '');
    } else {
      const tcMatch = digitsOnly.match(/\d{11}/);
      if (tcMatch) info.tcNo = tcMatch[0];
    }
  }

  if (!info.birthDate) {
    const dateMatch = text.match(/\b\d{2}[.,\-/\s]*\d{2}[.,\-/\s]*(19|20)\d{2}\b/);
    if (dateMatch) {
      let d = dateMatch[0].replace(/[^\d]/g, '');
      if (d.length === 8) {
        // d is DDMMYYYY
        info.birthDate = `${d.substring(4,8)}-${d.substring(2,4)}-${d.substring(0,2)}`;
      } else {
        // If it's something else, we try to parse it
        info.birthDate = dateMatch[0].replace(/[^\d]/g, '-');
      }
    }
  }

  if (!info.fullName) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const ignoreWords = ['CUMHURİYETİ', 'TURKİYE', 'TÜRKİYE', 'KİMLİK', 'KARTI', 'REPUBLIC', 'TURKEY', 'IDENTITY', 'CARD', 'SOYADI', 'SURNAME', 'GIVEN', 'NAME(S)', 'DOGUM', 'DOĞUM', 'TARIHI', 'DATE', 'OF', 'BIRTH', 'SERI', 'NO', 'DOCUMENT', 'NUMBER', 'SON', 'GECERLILIK', 'GEÇERLİLİK', 'VALID', 'UNTIL', 'CINSIYETI', 'CİNSİYETİ', 'GENDER', 'UYRUGU', 'UYRUĞU', 'NATIONALITY', 'IMZA', 'SIGNATURE'];
    
    let nameCandidates: string[] = [];
    
    for (const line of lines) {
       const cleanLine = line.replace(/[0]/g, 'O').replace(/[1]/g, 'I').replace(/[^A-ZÇĞİÖŞÜ\s]/g, '');
       if (cleanLine.trim().length === 0) continue;
       
       if (/^[A-ZÇĞİÖŞÜ\s]+$/.test(cleanLine)) {
          const words = cleanLine.split(/\s+/);
          const filteredWords = words.filter(w => !ignoreWords.includes(w) && w.length > 2);
          if (filteredWords.length > 0) {
             nameCandidates.push(filteredWords.join(' '));
          }
       }
    }

    if (nameCandidates.length > 0) {
        const nameParts = nameCandidates.slice(0, 2);
        if (nameParts.length > 1) {
            info.fullName = nameParts[1] + ' ' + nameParts[0];
        } else {
            info.fullName = nameParts[0];
        }
        info.fullName = info.fullName.replace(/\s+/g, ' ').trim();
        // Fallback de Title Case yapalım
        const titleCase = (str: string) => str.toLocaleLowerCase('tr-TR').replace(/(?:^|\s)\S/g, a => a.toLocaleUpperCase('tr-TR'));
        info.fullName = titleCase(info.fullName);
    }
  }

  return info;
};
