import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export interface ScrapedRecord {
  tcNo: string;
  fullName: string;
  protocolId: string;
  date?: string;
  company?: string;
  status: 'COMPLETED' | 'PARTIAL' | 'AWAITING_RESULT' | 'ERROR';
  pdfPath?: string;
  institutionType: 'VETA' | 'INFOMED';
}

function ensurePdfDir(): string {
  const pdfDir = path.join(process.cwd(), 'uploads/pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }
  return pdfDir;
}

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function sanitizeFilenamePart(str: string): string {
  return String(str || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
}

export const runVetaScraper = async (
  portalUrl: string,
  username: string,
  password: string,
  targetTcs?: string[],
  limit: number = 20
): Promise<ScrapedRecord[]> => {
  const targetUrl = portalUrl || 'https://yonetimakademi.veta.com.tr/account/login';
  console.log(`[Scraper:VETA] Starting scraper for: ${targetUrl}`);
  const pdfDir = ensurePdfDir();
  const results: ScrapedRecord[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(targetUrl, { timeout: 60000 });
    await page.fill("input[name*='User' i], input[type='text']", username);
    await page.fill("input[type='password']", password);
    await page.click("button[type='submit'], input[type='submit']");
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    console.log('[Scraper:VETA] Login successful.');

    const rows = await page.locator('table tbody tr').all();
    console.log(`[Scraper:VETA] Total rows found: ${rows.length}`);

    let processed = 0;
    for (let i = 0; i < rows.length; i++) {
      if (processed >= limit) break;
      const row = rows[i];
      const cells = await row.locator('td').all();
      if (cells.length < 6) continue;

      const recordId = (await cells[0].innerText()).trim();
      const dateStr = (await cells[1].innerText()).trim();
      const company = cells.length > 2 ? (await cells[2].innerText()).trim() : '';
      const tc = (await cells[3].innerText()).trim();
      const name = (await cells[4].innerText()).trim();
      const statusText = (await cells[5].innerText()).trim().toLowerCase();

      if (!tc || tc.length < 10) continue;

      const downloadLink = row.locator("a[href*='PdfRaporGoster'], a[href*='GetPdfRapor']").first();
      const hasDownload = (await downloadLink.count()) > 0;

      if (hasDownload) {
        const href = await downloadLink.getAttribute('href');
        const cleanTc = sanitizeFilenamePart(tc);
        const cleanRecordId = sanitizeFilenamePart(recordId);
        const pdfFileName = `${cleanTc}_${cleanRecordId}.pdf`;
        const filePath = path.join(pdfDir, pdfFileName);
        const webPdfPath = `/uploads/pdfs/${pdfFileName}`;

        console.log(`[Scraper:VETA] Downloading PDF for ${name} (${tc}) - Durum: ${statusText}...`);
        try {
          const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
          await downloadLink.click();
          const download = await downloadPromise;

          if (download) {
            await download.saveAs(filePath);
          } else if (href) {
            // Direct fetch fallback
            const fullUrl = new URL(href, targetUrl).toString();
            const cookies = await context.cookies();
            const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            const fetch = require('node-fetch');
            const res = await fetch(fullUrl, { headers: { Cookie: cookieHeader } });
            const buf = await res.buffer();
            fs.writeFileSync(filePath, buf);
          }

          if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
            const isCompleted = statusText.includes('bitmi');
            results.push({
              tcNo: tc,
              fullName: name,
              protocolId: recordId,
              date: dateStr,
              company: company,
              status: isCompleted ? 'COMPLETED' : 'PARTIAL',
              pdfPath: webPdfPath,
              institutionType: 'VETA'
            });
            processed++;
          }
        } catch (downloadErr) {
          console.error(`[Scraper:VETA] Download error for ${tc}:`, downloadErr);
        }
      } else {
        // Pending without download link - add if target TC or today's record
        const todayStr = formatDate(new Date());
        if ((targetTcs && targetTcs.includes(tc)) || (dateStr && dateStr.includes(todayStr))) {
          results.push({
            tcNo: tc,
            fullName: name,
            protocolId: recordId,
            date: dateStr,
            company: company,
            status: 'AWAITING_RESULT',
            institutionType: 'VETA'
          });
        }
      }
    }
  } catch (err) {
    console.error('[Scraper:VETA] Main error:', err);
  } finally {
    await browser.close();
  }

  console.log(`[Scraper:VETA] Finished. Total results scraped: ${results.length}`);
  return results;
};

export const runInfomedScraper = async (
  portalUrl: string,
  username: string,
  password: string,
  targetTcs?: string[],
  limit: number = 50
): Promise<ScrapedRecord[]> => {
  const targetUrl = portalUrl || 'https://burverta.infomed.com.tr/';
  console.log(`[Scraper:INFOMED] Starting scraper for: ${targetUrl}`);
  const pdfDir = ensurePdfDir();
  const results: ScrapedRecord[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(targetUrl, { timeout: 60000 });
    await page.fill("input[name*='User' i], input[id*='User' i], input[type='text']", username);
    await page.fill("input[type='password']", password);
    await page.click("button[type='submit'], input[type='submit'], button:has-text('Giriş')");
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    console.log('[Scraper:INFOMED] Login successful.');

    // Direct navigation to patient list
    await page.goto('https://burverta.infomed.com.tr/WebSonuc/Sorgu', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    // Set date range (last 45 days to today)
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 45);

    const startDateStr = formatDate(pastDate);
    const endDateStr = formatDate(today);

    // Always query empty TC first to fetch all recent patients who went, plus any target TCs
    const tcsToProcess = [''];
    if (targetTcs && targetTcs.length > 0) {
      for (const t of targetTcs) {
        if (t && !tcsToProcess.includes(t)) tcsToProcess.push(t);
      }
    }
    let processed = 0;

    for (const currentTc of tcsToProcess) {
      if (processed >= limit) break;

      // Set values safely via evaluate so bootstrap datepicker popups do not intercept clicks
      await page.evaluate(({ start, end, tcVal }) => {
        const d1 = document.getElementById('tarih1') as HTMLInputElement | null;
        const d2 = document.getElementById('tarih2') as HTMLInputElement | null;
        if (d1) d1.value = start;
        if (d2) d2.value = end;
        const tcInput = document.getElementById('TcKimlikNo') as HTMLInputElement | null;
        if (tcInput) tcInput.value = tcVal || '';
        document.querySelectorAll('.datepicker').forEach(el => el.remove());
      }, { 
        start: startDateStr, 
        end: endDateStr, 
        tcVal: currentTc 
      });

      // Click search button
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, input[type="submit"]'))
          .find(b => b.innerText?.includes('Sorgula') || (b as HTMLInputElement).value?.includes('Sorgula'));
        if (btn) (btn as HTMLElement).click();
      });

      await page.waitForTimeout(2500);

      // Sort Kendo Grid by ProtokolId DESCENDING (Newest records / today's patients first!) and set pageSize to 200
      await page.evaluate(() => {
        // @ts-ignore
        const $ = (window as any).$;
        if ($) {
          const grid = $('.k-grid').data('kendoGrid');
          if (grid && grid.dataSource) {
            grid.dataSource.pageSize(200);
            grid.dataSource.sort({ field: 'ProtokolId', dir: 'desc' });
          }
        }
      });

      await page.waitForTimeout(2500);

      const rows = await page.locator('.k-grid-table tbody tr, table tbody tr').all();
      console.log(`[Scraper:INFOMED] Search for '${currentTc || 'ALL'}': Total rows found: ${rows.length}`);

      for (let i = 0; i < rows.length; i++) {
        if (processed >= limit) break;
        const row = rows[i];
        const cells = await row.locator('td').all();
        if (cells.length < 8) continue;

        // Extract protocol ID from checkbox or second cell
        const checkbox = row.locator("input[type='checkbox'].websonucCheckbox").first();
        let protocolId = '';
        if ((await checkbox.count()) > 0) {
          protocolId = (await checkbox.getAttribute('value')) || '';
        }
        if (!protocolId && cells.length > 1) {
          protocolId = (await cells[1].innerText()).trim();
        }

        const dateStr = cells.length > 3 ? (await cells[3].innerText()).trim() : '';
        const name = cells.length > 4 ? (await cells[4].innerText()).trim() : '';
        const company = cells.length > 5 ? (await cells[5].innerText()).trim() : '';
        const tc = cells.length > 7 ? (await cells[7].innerText()).trim() : '';

        if (!tc || tc.length < 10) continue;

        // Skip if already in results
        if (results.some(r => r.tcNo === tc && r.protocolId === protocolId)) {
          continue;
        }

        if (protocolId) {
          const downloadUrl = `https://burverta.infomed.com.tr/Lab/ProtokolTumDosyalariIndir3?protokol=${protocolId}`;
          const cleanTc = sanitizeFilenamePart(tc);
          const cleanProtocolId = sanitizeFilenamePart(protocolId);
          const pdfFileName = `${cleanTc}_${cleanProtocolId}.pdf`;
          const filePath = path.join(pdfDir, pdfFileName);
          const webPdfPath = `/uploads/pdfs/${pdfFileName}`;

          console.log(`[Scraper:INFOMED] Downloading report for ${name} (${tc}) - Protocol ${protocolId}...`);
          try {
            const cookies = await context.cookies();
            const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
            const fetch = require('node-fetch');
            const res = await fetch(downloadUrl, { headers: { Cookie: cookieHeader } });
            const buf = await res.buffer();

            if (buf.length > 100) {
              const isZip = buf.slice(0, 2).toString('utf-8') === 'PK';
              const isPdf = buf.slice(0, 5).toString('utf-8').startsWith('%PDF');

              if (isZip) {
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(buf);
                const zipEntries = zip.getEntries();
                const pdfEntry = zipEntries.find((entry: any) => entry.entryName.toLowerCase().endsWith('.pdf'));
                if (pdfEntry) {
                  fs.writeFileSync(filePath, pdfEntry.getData());
                  console.log(`[Scraper:INFOMED] Successfully extracted PDF for ${name} (${tc}): ${filePath} (${pdfEntry.getData().length} bytes)`);
                } else {
                  console.warn(`[Scraper:INFOMED] No PDF found inside ZIP for ${name} (${tc})`);
                }
              } else if (isPdf) {
                fs.writeFileSync(filePath, buf);
                console.log(`[Scraper:INFOMED] Successfully saved direct PDF for ${name} (${tc}): ${filePath} (${buf.length} bytes)`);
              } else {
                console.warn(`[Scraper:INFOMED] File is neither ZIP nor PDF (Size: ${buf.length})`);
              }
            }

            if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
              results.push({
                tcNo: tc,
                fullName: name,
                protocolId: protocolId,
                date: dateStr,
                company: company,
                status: 'PARTIAL',
                pdfPath: webPdfPath,
                institutionType: 'INFOMED'
              });
              processed++;
            } else {
              results.push({
                tcNo: tc,
                fullName: name,
                protocolId: protocolId,
                date: dateStr,
                company: company,
                status: 'AWAITING_RESULT',
                institutionType: 'INFOMED'
              });
            }
          } catch (downloadErr) {
            console.error(`[Scraper:INFOMED] Download error for ${tc}:`, downloadErr);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Scraper:INFOMED] Main error:', err);
  } finally {
    await browser.close();
  }

  console.log(`[Scraper:INFOMED] Finished. Total results scraped: ${results.length}`);
  return results;
};

export function extractTextFromPdf(pdfPath: string): string {
  try {
    if (!fs.existsSync(pdfPath)) return '';
    const buf = fs.readFileSync(pdfPath);
    const str = buf.toString('latin1');
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    const streams: string[] = [];
    while ((match = streamRegex.exec(str)) !== null) {
      try {
        const raw = Buffer.from(match[1], 'latin1');
        streams.push(zlib.inflateSync(raw).toString('latin1'));
      } catch(e) {
        streams.push('');
      }
    }
    const charToUnicode: Record<string, string> = {};
    streams.forEach(s => {
      if (s.includes('beginbfchar')) {
        const bfRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
        let m;
        while ((m = bfRegex.exec(s)) !== null) {
          charToUnicode[m[1].toLowerCase()] = String.fromCharCode(parseInt(m[2], 16));
        }
      }
      if (s.includes('beginbfrange')) {
        const bfr = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
        let r;
        while ((r = bfr.exec(s)) !== null) {
          const start = parseInt(r[1], 16);
          const end = parseInt(r[2], 16);
          let dest = parseInt(r[3], 16);
          for (let code = start; code <= end; code++) {
            const hexKey = code.toString(16).padStart(4, '0').toLowerCase();
            charToUnicode[hexKey] = String.fromCharCode(dest++);
          }
        }
      }
    });

    let fullText = '';
    streams.forEach(s => {
      if (s.includes('BT')) {
        s.replace(/<([0-9a-fA-F]+)>/g, (_, hex) => {
          let res = '';
          for (let i = 0; i < hex.length; i += 4) {
            res += charToUnicode[hex.substr(i, 4).toLowerCase()] || '';
          }
          fullText += ' ' + res;
          return '';
        });
        s.replace(/\(([^()]+)\)/g, (_, lit) => {
          fullText += ' ' + lit;
          return '';
        });
      }
      if (s.includes('Tj') || s.includes('TJ')) {
        fullText += ' ' + s;
      }
    });

    fullText += '\n' + str.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ :.,\/-]/g, ' ');
    return fullText;
  } catch (err) {
    console.error('[PDF Parser] Error reading PDF text:', err);
    return '';
  }
}

export function detectCompletedExams(pdfPath: string, allExams: string[]): string[] {
  if (!allExams || allExams.length === 0) return [];
  const text = extractTextFromPdf(pdfPath);
  if (!text) return [];

  const examPatterns = [
    { name: 'AKCİĞER GRAFİSİ', regex: /AKC[İI]ĞER|AKC[İI]GER|PA\s*GRAF|TELE\s*GRAF|RÖNTGEN|KOSTOFREN[İI]K|PARANK[İI]M/i },
    { name: 'ODYOMETRİ', regex: /ODYO|SAFSES|[İI]Ş[İI]TME\s*TEST|HAVAYOLU/i },
    { name: 'HEMOGRAM', regex: /HEMOGRAM|TAM\s*KAN|\bCBC\b|LÖKOS[İI]T|LOKOS[İI]T|ER[İI]TROS[İI]T|TROMBOS[İI]T|\bWBC\b|\bPLT\b/i },
    { name: 'EKG', regex: /\bEKG\b|ELEKTROKARD[İI]|S[İI]N[ÜU]S\s*R[İI]TM/i },
    { name: 'SFT', regex: /\bSFT\b|SOLUNUM\s*FONKS[İI]YON|SP[İI]ROMETR/i },
    { name: 'TETANOZ AŞISI', regex: /TETANOZ/i },
    { name: 'İDRAR TAHLİLİ', regex: /TAM\s*[İI]DRAR|\bT[İI]T\b|DANS[İI]TE/i },
    { name: 'AÇLIK KAN ŞEKERİ', regex: /GLUKOZ|\bAKŞ\b|AÇLIK\s*KAN/i },
    { name: 'HBS AG', regex: /HBSAG|HEPAT[İI]T\s*B/i },
    { name: 'HBSAG', regex: /HBSAG|HEPAT[İI]T\s*B/i },
    { name: 'ANTI HBS', regex: /ANT[İI]\s*HBS|ANTIHBS/i },
    { name: 'ANTİ HBS', regex: /ANT[İI]\s*HBS|ANTIHBS/i },
    { name: 'HIV', regex: /ANT[İI]\s*H[İI]V|ANTIHIV|\bH[İI]V\b/i },
    { name: 'HCV', regex: /ANT[İI]\s*HCV|ANTIHCV|\bHCV\b/i },
    { name: 'GÖZ MUAYENESİ', regex: /GÖZ\s*MUAYENE|GOZ\s*MUAYENE|GÖRME\s*KESK[İI]NL[İI]Ğ[İI]/i }
  ];

  const completed: string[] = [];
  for (const ex of allExams) {
    const cleanEx = ex.trim().toUpperCase();
    const pattern = examPatterns.find(p => p.name.toUpperCase() === cleanEx) || {
      regex: new RegExp(cleanEx.replace(/[^A-ZÇĞİÖŞÜ0-9]/gi, ''), 'i')
    };

    if (pattern.regex.test(text)) {
      completed.push(ex);
    }
  }
  return completed;
}
