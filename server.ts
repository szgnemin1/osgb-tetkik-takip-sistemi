/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import * as XLSX from "xlsx";


const JWT_SECRET = process.env.JWT_SECRET || "osgb-secure-super-secret-key!2024";
const DATA_FILE = path.join(process.cwd(), "global_data.json");

// Default password from environment or fallback
const DEFAULT_PASSWORD = process.env.APP_PASSWORD || "123456";

// Define initial data state
const defaultData = {
  referrals: [],
  companies: [],
  exams: [],
  institutions: [],
  transactions: [],
  appSettings: { 
    ekgLimitAge: 40, 
    autoPrintReferral: true 
  }
};

// Initialize file if doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  // Generate hash for default password
  defaultData.appSettings.passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), "utf8");
}

function readData() {
  try {
    const rawData = fs.readFileSync(DATA_FILE, "utf8");
    const db = JSON.parse(rawData);
    
    // Migration: If plain-text password exists, convert to hash and delete plain text
    if (db.appSettings?.password) {
      db.appSettings.passwordHash = bcrypt.hashSync(db.appSettings.password, 10);
      delete db.appSettings.password;
      writeData(db, false); // Don't trigger webhook for internal migrations
    }
    
    // Ensure there is at least a password hash. In development / preview, we set the default to "123456" if not set.
    if (!db.appSettings?.passwordHash) {
      db.appSettings.passwordHash = bcrypt.hashSync("123456", 10);
      writeData(db, false);
    }

    // Ensure a unique backup API key is generated for secure RSS/feed fallback
    if (db.appSettings && !db.appSettings.backupApiKey) {
      db.appSettings.backupApiKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      writeData(db, false);
    }
    
    return db;
  } catch (err) {
    console.error("Error reading data:", err);
    return defaultData;
  }
}

function triggerWebhookSync(db: any) {
  const webhookUrl = db.appSettings?.webhookUrl;
  if (!webhookUrl || !webhookUrl.startsWith("http")) return;

  // Prepare a safe payload (remove sensitive credentials)
  const safePayload = JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "DATA_UPDATE",
    data: {
      ...db,
      appSettings: {
        ...db.appSettings,
        passwordHash: undefined,
        appPassword: undefined
      }
    }
  });

  fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OSGB-Backup-Event": "sync"
    },
    body: safePayload,
    signal: AbortSignal.timeout(10000) // 10s timeout to avoid leaking resources
  })
  .then(res => {
    if (!res.ok) {
      console.warn(`[Webhook Sync] Webhook returned status: ${res.status}`);
    } else {
      console.log(`[Webhook Sync] Webhook sync successful!`);
    }
  })
  .catch(err => {
    console.error("[Webhook Sync] Error sending webhook payload:", err);
  });
}

function sendTelegramNotification(message: string, settings: any) {
  if (!settings?.isTelegramEnabled || !settings?.telegramBotToken || !settings?.telegramChatId) {
    return;
  }
  const token = settings.telegramBotToken;
  const chatId = settings.telegramChatId;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML"
    }),
    signal: AbortSignal.timeout(10000)
  })
  .then(res => {
    if (!res.ok) {
      console.warn(`[Telegram Sync] Telegram API returned status: ${res.status}`);
    } else {
      console.log(`[Telegram Sync] Telegram notification sent successfully!`);
    }
  })
  .catch(err => {
    console.error("[Telegram Sync] Error sending telegram notification:", err);
  });
}

function notifyTelegramReferral(item: any, db: any) {
  if (!db.appSettings?.isTelegramEnabled || !db.appSettings?.telegramBotToken || !db.appSettings?.telegramChatId) {
    return;
  }

  const employeeName = item.employee?.fullName || "Bilinmiyor";
  const tcNo = item.employee?.tcNo || "Bilinmiyor";
  const companyName = item.employee?.company || "Bilinmiyor";
  
  // Try to find status text
  let statusText = item.status || "Bekliyor";
  if (statusText === "PENDING") statusText = "Bekliyor (Gitmedi)";
  else if (statusText === "AT_HOSPITAL") statusText = "Hastanede / Tetkikte";
  else if (statusText === "AWAITING_RESULT") statusText = "Sonuç Bekleniyor";
  else if (statusText === "COMPLETED") statusText = "✅ Tamamlandı";
  else if (statusText === "CANCELLED") statusText = "❌ İptal Edildi";

  // Resolve exams
  const examsList = (item.exams || []).map((examId: string) => {
    const examDef = db.exams?.find((e: any) => e.id === examId);
    return examDef ? `• ${examDef.name} (${examDef.code || ''})` : `• ${examId}`;
  }).join("\n");

  // Format payment method
  let paymentText = item.paymentMethod || "-";
  if (paymentText === "CASH") paymentText = "💵 Nakit";
  else if (paymentText === "POS") paymentText = "💳 POS";
  else if (paymentText === "INVOICE") paymentText = "💼 Cari / Fatura";

  const date = item.referralDate ? new Date(item.referralDate).toLocaleDateString("tr-TR") : "-";
  const notes = item.notes ? item.notes : "-";
  const price = item.totalPrice !== undefined ? `${item.totalPrice} TL` : "-";
  const cost = item.totalCost !== undefined ? `${item.totalCost} TL` : "-";

  const message = `<b>🔔 YENİ SEVK KAYDI</b>\n\n` +
    `<b>👤 Çalışan:</b> ${employeeName} (TC: ${tcNo})\n` +
    `<b>🏢 Firma:</b> ${companyName}\n` +
    `<b>📅 Tarih:</b> ${date}\n` +
    `<b>💳 Ödeme Tipi:</b> ${paymentText}\n\n` +
    `<b>🧪 Yapılan Tetkikler:</b>\n${examsList || 'Belirtilmemiş'}\n\n` +
    `<b>💰 Ücret:</b> ${price} / <b>Maliyet:</b> ${cost}\n` +
    `<b>📝 Notlar:</b> ${notes}`;

  sendTelegramNotification(message, db.appSettings);
}

function notifyHealthSyncWebhook(item: any, db: any) {
  const settings = db.appSettings || {};
  const targetUrl = settings.healthSyncUrl || "http://localhost:3002/api/health-sync";
  const token = settings.healthSyncToken || "vps_secure_secret_2026";

  let isFatura = true;
  if (item.paymentMethod) {
    const pm = String(item.paymentMethod).toUpperCase();
    if (pm === "CASH" || pm === "NAKİT" || pm === "NAKIT" || pm === "POS") {
      isFatura = false;
    }
  }

  if (!isFatura) {
    console.log(`[Health Sync Webhook] Nakit/POS kaydı olduğu için Fatura Sistemine bildirim gönderilmedi.`);
    return;
  }

  const firmName = (item.employee?.company || item.company || item.description || item.firmName || item.firma || "Müşteri Firma").trim();
  
  let amount = Number(item.totalPrice || item.amount || item.price || item.tutar || 0);
  if (amount <= 0 && Array.isArray(item.exams)) {
    for (const exIdOrName of item.exams) {
      const examDef = db.exams?.find((e: any) => e.id === exIdOrName || e.name === exIdOrName);
      if (examDef && examDef.price) {
        amount += Number(examDef.price || 0);
      }
    }
  }

  const numAmount = Number(amount.toFixed(2));
  const singleRecord = {
    firmName: firmName || "Müşteri Firma",
    paymentType: "fatura",
    amount: numAmount
  };

  const payload = {
    ...singleRecord,
    records: [ singleRecord ]
  };

  console.log(`[Health Sync Webhook] Sending POST request to ${targetUrl}:`, JSON.stringify(payload));

  fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-api-key": token
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  })
  .then(async (res) => {
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Health Sync Webhook] Target endpoint returned ${res.status}: ${errText}`);
    } else {
      console.log(`[Health Sync Webhook] Successfully sent POST invoice notification to target system!`);
    }
  })
  .catch(err => {
    console.error("[Health Sync Webhook] Failed to send POST request (Port 3002 unreachable):", err.message);
  });
}



function getCustomMonthlyRange(startDay: number, endDay: number, today: Date = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentDay = today.getDate();

  let startDate: Date;
  let endDate: Date = new Date(today);

  if (startDay > endDay) {
    if (currentDay <= endDay) {
      startDate = new Date(year, month - 1, startDay, 0, 0, 0, 0);
    } else {
      startDate = new Date(year, month, startDay, 0, 0, 0, 0);
    }
  } else {
    if (currentDay < startDay) {
      startDate = new Date(year, month - 1, startDay, 0, 0, 0, 0);
    } else {
      startDate = new Date(year, month, startDay, 0, 0, 0, 0);
    }
  }
  return { startDate, endDate };
}

function generateExcelReport(db: any, dateRange?: number | { startDate: Date; endDate: Date }, company?: string) {
  let referrals = db.referrals || [];
  let transactions = db.transactions || [];

  if (dateRange) {
    let start: Date;
    let end: Date = new Date();

    if (typeof dateRange === 'number') {
      if (dateRange > 0) {
        start = new Date();
        start.setDate(start.getDate() - dateRange);
      } else {
        start = new Date(0);
      }
    } else {
      start = dateRange.startDate;
      end = dateRange.endDate;
    }

    referrals = referrals.filter((item: any) => {
      if (!item.referralDate) return false;
      const d = new Date(item.referralDate);
      return d >= start && d <= end;
    });

    transactions = transactions.filter((item: any) => {
      if (!item.date) return false;
      const d = new Date(item.date);
      return d >= start && d <= end;
    });
  }

  if (company && company !== 'ALL') {
    referrals = referrals.filter((item: any) => {
      return item.employee?.company === company;
    });
  }

  // Create worksheets
  const referralData = referrals.map((item: any) => {
    let statusText = item.status || "Bekliyor";
    if (statusText === "PENDING") statusText = "Bekliyor (Gitmedi)";
    else if (statusText === "AT_HOSPITAL") statusText = "Hastanede / Tetkikte";
    else if (statusText === "AWAITING_RESULT") statusText = "Sonuç Bekleniyor";
    else if (statusText === "COMPLETED") statusText = "Tamamlandı";
    else if (statusText === "CANCELLED") statusText = "İptal Edildi";

    let paymentText = item.paymentMethod || "-";
    if (paymentText === "CASH") paymentText = "Nakit";
    else if (paymentText === "POS") paymentText = "POS";
    else if (paymentText === "INVOICE") paymentText = "Cari / Fatura";

    const examsList = (item.exams || []).map((examId: string) => {
      const examDef = db.exams?.find((e: any) => e.id === examId);
      return examDef ? `${examDef.name} (${examDef.code || ''})` : examId;
    }).join(", ");

    return {
      "Sevk Tarihi": item.referralDate ? new Date(item.referralDate).toLocaleDateString("tr-TR") : "-",
      "Çalışan Adı Soyadı": item.employee?.fullName || "-",
      "TC Kimlik No": item.employee?.tcNo || "-",
      "Firma / Şirket": item.employee?.company || "-",
      "Kurum / Hastane": db.institutions?.find((ins: any) => ins.id === item.institutionId)?.name || item.institutionId || "-",
      "Sevk Edilen Tetkikler": examsList || "-",
      "Toplam Ücret (TL)": item.totalPrice !== undefined ? item.totalPrice : 0,
      "Toplam Maliyet (TL)": item.totalCost !== undefined ? item.totalCost : 0,
      "Kâr (TL)": (item.totalPrice !== undefined && item.totalCost !== undefined) ? (item.totalPrice - item.totalCost) : 0,
      "Ödeme Tipi": paymentText,
      "Notlar": item.notes || "-"
    };
  });

  const transactionData = transactions.map((item: any) => {
    return {
      "Tarih": item.date ? new Date(item.date).toLocaleDateString("tr-TR") : "-",
      "Hareket Türü": item.type === "INCOME" ? "Gelir (+)" : "Gider (-)",
      "Açıklama": item.description || "-",
      "Tutar (TL)": item.amount || 0,
      "Kategori": item.category || "-",
      "Ödeme Yöntemi": item.paymentMethod === "CASH" ? "Nakit" : item.paymentMethod === "POS" ? "POS" : item.paymentMethod === "INVOICE" ? "Cari / Fatura" : "-"
    };
  });

  const wb = XLSX.utils.book_new();
  
  const wsReferrals = XLSX.utils.json_to_sheet(referralData);
  const wsTransactions = XLSX.utils.json_to_sheet(transactionData);

  XLSX.utils.book_append_sheet(wb, wsReferrals, "Sevk Raporu");
  XLSX.utils.book_append_sheet(wb, wsTransactions, "Kasa Raporu");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf;
}

async function sendTelegramReport(db: any, dateRange?: number | { startDate: Date; endDate: Date }, caption?: string, company?: string) {
  const settings = db.appSettings;
  if (!settings?.isTelegramEnabled || !settings?.telegramBotToken || !settings?.telegramChatId) {
    console.warn("[Telegram Report] Entegrasyon aktif değil veya ayarlar eksik.");
    return false;
  }

  try {
    const excelBuffer = generateExcelReport(db, dateRange, company);
    let fileName = `OSGB_Sistem_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
    if (typeof dateRange === 'number') {
      if (dateRange === 1) fileName = `OSGB_Gunluk_Rapor_${new Date().toISOString().split('T')[0]}.xlsx`;
      else if (dateRange === 7) fileName = `OSGB_Haftalik_Rapor_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (dateRange && typeof dateRange === 'object') {
      fileName = `OSGB_Ozel_Aylik_Rapor_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    const token = settings.telegramBotToken;
    const chatId = settings.telegramChatId;
    const url = `https://api.telegram.org/bot${token}/sendDocument`;

    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("document", blob, fileName);
    if (caption) {
      formData.append("caption", caption);
      formData.append("parse_mode", "HTML");
    }

    const res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Telegram Report] Telegram returned error: ${res.status} - ${errText}`);
      return false;
    }

    console.log(`[Telegram Report] Excel report sent successfully to Telegram!`);
    return true;
  } catch (err) {
    console.error("[Telegram Report] Error sending report:", err);
    return false;
  }
}

function startTelegramScheduler() {
  console.log("[Telegram Scheduler] Periodic report scheduler started.");
  
  // Run check every 30 minutes
  setInterval(() => {
    try {
      const db = readData();
      const settings = db.appSettings;
      
      if (!settings?.isTelegramEnabled || !settings?.telegramBotToken || !settings?.telegramChatId) {
        return;
      }

      const period = settings.telegramReportPeriod || 'none';
      const period2 = settings.telegramReportPeriod2 || 'none';
      if (period === 'none' && period2 === 'none') return;

      const now = new Date();
      const currentHour = now.getHours();
      
      const targetHour1 = settings.telegramReportHour !== undefined ? settings.telegramReportHour : 21;
      const isTime1 = currentHour >= targetHour1;

      const targetHour2 = settings.telegramReportHour2 !== undefined ? settings.telegramReportHour2 : 21;
      const isTime2 = currentHour >= targetHour2;

      const todayStr = now.toISOString().split('T')[0]; // e.g. "2026-06-22"
      
      // Check Period 1
      if (period !== 'none' && isTime1 && settings.telegramLastReportSent !== todayStr) {
        if (period === 'daily') {
          const caption = `<b>📊 GÜNLÜK TETKİK & KASA RAPORU (1. Periyot)</b>\n` +
            `📅 Tarih: ${now.toLocaleDateString("tr-TR")}\n\n` +
            `Sisteminiz tarafından otomatik olarak oluşturulan günlük detaylı Excel raporu ektedir.`;

          sendTelegramReport(db, 1, caption).then(success => {
            if (success) {
              const updatedDb = readData();
              updatedDb.appSettings.telegramLastReportSent = todayStr;
              writeData(updatedDb, false);
            }
          });
        } else if (period === 'weekly') {
          // Only run on Sunday
          const dayOfWeek = now.getDay(); // 0 is Sunday
          if (dayOfWeek === 0) {
            const caption = `<b>📊 HAFTALIK TETKİK & KASA RAPORU (1. Periyot)</b>\n` +
              `📅 Tarih: ${now.toLocaleDateString("tr-TR")}\n\n` +
              `Sisteminiz tarafından otomatik olarak oluşturulan haftalık detaylı Excel raporu ektedir.`;

            sendTelegramReport(db, 7, caption).then(success => {
              if (success) {
                const updatedDb = readData();
                updatedDb.appSettings.telegramLastReportSent = todayStr;
                writeData(updatedDb, false);
              }
            });
          }
        } else if (period === 'monthly_custom') {
          const startDay = settings.telegramCustomReportStartDay !== undefined ? settings.telegramCustomReportStartDay : 20;
          const endDay = settings.telegramCustomReportEndDay !== undefined ? settings.telegramCustomReportEndDay : 19;
          const currentDay = now.getDate();
          if (currentDay === endDay) {
            let startDate: Date;
            if (startDay > endDay) {
              startDate = new Date(now.getFullYear(), now.getMonth() - 1, startDay, 0, 0, 0, 0);
            } else {
              startDate = new Date(now.getFullYear(), now.getMonth(), startDay, 0, 0, 0, 0);
            }
            const endDate = new Date(now);

            const caption = `<b>📊 AYLIK TETKİK & KASA RAPORU (ÖZEL PERİYOT) (1. Periyot)</b>\n` +
              `📅 Dönem: ${startDate.toLocaleDateString("tr-TR")} - ${endDate.toLocaleDateString("tr-TR")}\n\n` +
              `Sisteminiz tarafından belirlenen özel periyot (${startDay} - ${endDay}) uyarınca otomatik oluşturulan aylık detaylı Excel raporu ektedir.`;

            sendTelegramReport(db, { startDate, endDate }, caption).then(success => {
              if (success) {
                const updatedDb = readData();
                updatedDb.appSettings.telegramLastReportSent = todayStr;
                writeData(updatedDb, false);
              }
            });
          }
        }
      }

      // Check Period 2
      if (period2 !== 'none' && isTime2 && settings.telegramLastReportSent2 !== todayStr) {
        if (period2 === 'daily') {
          const caption = `<b>📊 GÜNLÜK TETKİK & KASA RAPORU (2. Periyot)</b>\n` +
            `📅 Tarih: ${now.toLocaleDateString("tr-TR")}\n\n` +
            `Sisteminiz tarafından otomatik olarak oluşturulan günlük detaylı Excel raporu ektedir.`;

          sendTelegramReport(db, 1, caption).then(success => {
            if (success) {
              const updatedDb = readData();
              updatedDb.appSettings.telegramLastReportSent2 = todayStr;
              writeData(updatedDb, false);
            }
          });
        } else if (period2 === 'weekly') {
          // Only run on Sunday
          const dayOfWeek = now.getDay(); // 0 is Sunday
          if (dayOfWeek === 0) {
            const caption = `<b>📊 HAFTALIK TETKİK & KASA RAPORU (2. Periyot)</b>\n` +
              `📅 Tarih: ${now.toLocaleDateString("tr-TR")}\n\n` +
              `Sisteminiz tarafından otomatik olarak oluşturulan haftalık detaylı Excel raporu ektedir.`;

            sendTelegramReport(db, 7, caption).then(success => {
              if (success) {
                const updatedDb = readData();
                updatedDb.appSettings.telegramLastReportSent2 = todayStr;
                writeData(updatedDb, false);
              }
            });
          }
        } else if (period2 === 'monthly_custom') {
          const startDay2 = settings.telegramCustomReportStartDay2 !== undefined ? settings.telegramCustomReportStartDay2 : 20;
          const endDay2 = settings.telegramCustomReportEndDay2 !== undefined ? settings.telegramCustomReportEndDay2 : 19;
          const currentDay = now.getDate();
          if (currentDay === endDay2) {
            let startDate: Date;
            if (startDay2 > endDay2) {
              startDate = new Date(now.getFullYear(), now.getMonth() - 1, startDay2, 0, 0, 0, 0);
            } else {
              startDate = new Date(now.getFullYear(), now.getMonth(), startDay2, 0, 0, 0, 0);
            }
            const endDate = new Date(now);

            const caption = `<b>📊 AYLIK TETKİK & KASA RAPORU (ÖZEL PERİYOT) (2. Periyot)</b>\n` +
              `📅 Dönem: ${startDate.toLocaleDateString("tr-TR")} - ${endDate.toLocaleDateString("tr-TR")}\n\n` +
              `Sisteminiz tarafından belirlenen özel periyot (${startDay2} - ${endDay2}) uyarınca otomatik oluşturulan aylık detaylı Excel raporu ektedir.`;

            sendTelegramReport(db, { startDate, endDate }, caption).then(success => {
              if (success) {
                const updatedDb = readData();
                updatedDb.appSettings.telegramLastReportSent2 = todayStr;
                writeData(updatedDb, false);
              }
            });
          }
        }
      }
    } catch (err) {
      console.error("[Telegram Scheduler] Error in periodic check:", err);
    }
  }, 1000 * 60 * 30); // check every 30 minutes
}

function getHealthSyncFeedData(db: any) {
  const totals: Record<string, number> = {};
  const items: Array<{
    id: string;
    date: string;
    company: string;
    employeeName: string;
    tcNo: string;
    exams: string;
    institution: string;
    amount: number;
    paymentMethod: string;
    status: string;
  }> = [];

  // Build exam price lookup map in case referral totalPrice is not set
  const examPriceMap = new Map<string, number>();
  if (Array.isArray(db.exams)) {
    for (const ex of db.exams) {
      if (ex.name) examPriceMap.set(ex.name, Number(ex.price || 0));
      if (ex.id) examPriceMap.set(ex.id, Number(ex.price || 0));
    }
  }

  // Build institution lookup map
  const instMap = new Map<string, string>();
  if (Array.isArray(db.institutions)) {
    for (const ins of db.institutions) {
      if (ins.id) instMap.set(ins.id, ins.name || ins.id);
    }
  }

  // 1. Process all saved referrals (Sevkler - fatura/cari olanlar toplam tutarlara eklenir)
  const referrals = db.referrals || [];
  for (const ref of referrals) {
    const firmName = (ref.employee?.company || ref.company || "Müşteri Firma").trim();

    // Calculate amount: ref.totalPrice or sum of exam prices
    let amount = Number(ref.totalPrice || 0);
    if (amount <= 0 && Array.isArray(ref.exams)) {
      for (const exName of ref.exams) {
        amount += (examPriceMap.get(exName) || 0);
      }
    }

    const pm = String(ref.paymentMethod || "INVOICE").toUpperCase();
    const isFatura = (pm === "INVOICE" || pm === "FATURA" || pm === "CARİ" || pm === "CARI");

    if (firmName && isFatura) {
      totals[firmName] = (totals[firmName] || 0) + amount;
    }

    const examNames = Array.isArray(ref.exams) ? ref.exams.join(", ") : "-";
    const instName = ref.targetInstitutionId ? (instMap.get(ref.targetInstitutionId) || ref.targetInstitutionId) : "-";

    items.push({
      id: ref.id || Math.random().toString(36).substring(2, 9),
      date: ref.referralDate || new Date().toISOString(),
      company: firmName,
      employeeName: ref.employee?.fullName || "Personel",
      tcNo: ref.employee?.tcNo || "-",
      exams: examNames,
      institution: instName,
      amount: Number(amount.toFixed(2)),
      paymentMethod: ref.paymentMethod || "INVOICE",
      status: ref.status || "PENDING"
    });
  }

  // 2. Process non-referral income safe transactions
  const transactions = db.transactions || [];
  for (const tx of transactions) {
    if (tx.type === "INCOME" && tx.amount > 0 && !tx.referralId) {
      const firmName = (tx.description || "Genel Tahsilat Kaydı").trim();
      const amount = Number(tx.amount || 0);
      if (firmName) {
        totals[firmName] = (totals[firmName] || 0) + amount;
      }
    }
  }

  const roundedTotals: Record<string, number> = {};
  for (const [firm, sum] of Object.entries(totals)) {
    roundedTotals[firm] = Number(sum.toFixed(2));
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastSyncTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // Sort referrals newest first
  const sortedItems = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    success: true,
    uniqueFirmsCount: Object.keys(roundedTotals).length,
    totalReferralsCount: referrals.length,
    lastSyncTime,
    totals: roundedTotals,
    items: sortedItems
  };
}

function generateRssXml(feedData: ReturnType<typeof getHealthSyncFeedData>, hostUrl: string) {
  const itemsXml = feedData.items.map(item => {
    const pubDate = new Date(item.date).toUTCString();
    return `
    <item>
      <title><![CDATA[${item.company} - ${item.employeeName} (${item.amount.toFixed(2)} TL)]]></title>
      <description><![CDATA[Sevk ID: ${item.id} | Firma: ${item.company} | Personel: ${item.employeeName} (TC: ${item.tcNo}) | Tetkikler: ${item.exams} | Kurum: ${item.institution} | Tutar: ${item.amount.toFixed(2)} TL | Ödeme: ${item.paymentMethod} | Durum: ${item.status}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${item.id}</guid>
    </item>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>OSGB Tetkik Sevk Canlı Fatura ve Sağlık Akışı (RSS)</title>
    <link>${hostUrl}</link>
    <description>Anlık OSGB Tetkik Sevk ve Sağlık Hizmeti Fatura Akışı</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>OSGB Tetkik Takip Sistemi Live Feed Engine</generator>
    ${itemsXml}
  </channel>
</rss>`;
}

function writeData(data: any, triggerSync: boolean = true) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    if (triggerSync) {
      triggerWebhookSync(data);
    }
  } catch (err) {
    console.error("Error writing data:", err);
  }
}

function getAppPasswordHash() {
  const db = readData();
  return db.appSettings?.passwordHash || bcrypt.hashSync(DEFAULT_PASSWORD, 10);
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const dbForPort = readData();
  const PORT = process.env.PORT || dbForPort.appSettings?.serverPort || 3001;

  // Rewrite for subpath deployments (e.g. YunoHost)
  // This allows the app to respond correctly whether Nginx strips the path or not.
  app.use((req, res, next) => {
    if (req.url.startsWith('/tetkik/')) {
      req.url = req.url.replace('/tetkik/', '/');
    } else if (req.url === '/tetkik') {
      req.url = '/';
    }
    next();
  });

  // Generic Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for Vite development convenience
  }));
  app.use(cors());
  app.use(express.json({ limit: "50mb" })); // Prevent large payload attacks
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Rate Limiting for Login (Brute Force Protection)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per windowMs
    message: { error: "Çok fazla giriş denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin." },
    validate: false
  });

  // JWT Auth Middleware
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const token = authHeader.split(" ")[1];
    try {
      jwt.verify(token, JWT_SECRET);
      next();
    } catch (error) {
      return res.status(401).json({ error: "Oturum süresi doldu veya geçersiz token." });
    }
  };

  // Login endpoint
  app.post("/api/auth/login", loginLimiter, (req, res) => {
    const { password } = req.body;
    const currentHash = getAppPasswordHash();
    
    // Verify the password against the stored password hash
    if (bcrypt.compareSync(password, currentHash)) {
      // Generate secure 30-day token
      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token });
    } else {
      res.status(401).json({ error: "Yanlış Şifre" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", authMiddleware, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const currentHash = getAppPasswordHash();
    
    if (!bcrypt.compareSync(oldPassword, currentHash)) {
      return res.status(400).json({ error: "Eski şifre yanlış" });
    }
    
    if (newPassword.length < 6) {
       return res.status(400).json({ error: "Yeni şifre en az 6 karakter olmalıdır." });
    }

    const db = readData();
    if (!db.appSettings) db.appSettings = {};
    
    // Hash new password and cleanup olds
    db.appSettings.passwordHash = bcrypt.hashSync(newPassword, 10);
    delete db.appSettings.password;
    
    writeData(db);
    
    // Issue a fresh token
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token });
  });

  // Backup restore endpoint
  app.post("/api/backup/restore", authMiddleware, (req, res) => {
    try {
      const newData = req.body;
      if (!newData || typeof newData !== 'object') {
         return res.status(400).json({ error: "Geçersiz yedek dosyası" });
      }
      
      // Preserve current password hash to avoid locking out the user
      const currentDb = readData();
      newData.appSettings = newData.appSettings || {};
      newData.appSettings.passwordHash = currentDb.appSettings?.passwordHash;
      
      writeData(newData);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Geri yükleme sırasında hata oluştu" });
    }
  });

  // Get backup settings (including Google Drive OAuth client ID and webhook configurations)
  app.get("/api/backup/config", authMiddleware, (req, res) => {
    const db = readData();
    res.json({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || process.env.OAUTH_CLIENT_ID || "49611592469-8lcoj8l3g81h29b8p079e00ep1oohnoo.apps.googleusercontent.com",
      webhookUrl: db.appSettings?.webhookUrl || "",
      backupApiKey: db.appSettings?.backupApiKey || ""
    });
  });

  // Test Telegram Bot connection
  app.post("/api/telegram/test-bot", authMiddleware, (req, res) => {
    const { token, chatId } = req.body;
    if (!token || !chatId) {
      return res.status(400).json({ error: "Token ve Sohbet Kimliği (Chat ID) gereklidir." });
    }

    const testMessage = `<b>🔔 OSGB Tetkik Takip Sistemi</b>\n\n` +
      `Telegram bildirim entegrasyonu başarıyla test edildi! 🎉\n` +
      `Sisteminiz artık tetkik (sevk) hareketlerini buraya raporlayacak.`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: "HTML"
      }),
      signal: AbortSignal.timeout(10000)
    })
    .then(async (tgRes) => {
      if (!tgRes.ok) {
        const errText = await tgRes.text();
        return res.status(400).json({ error: `Telegram Hatası: ${tgRes.status} - ${errText}` });
      }
      res.json({ success: true, message: "Test mesajı başarıyla Telegram botunuza gönderildi!" });
    })
    .catch(err => {
      res.status(500).json({ error: `Telegram ile bağlantı kurulamadı: ${err.message}` });
    });
  });



  // Send Excel report now to Telegram Bot
  app.post("/api/telegram/send-now", authMiddleware, async (req, res) => {
    const { period, startDate, endDate, company, caption: customCaption } = req.body;
    const db = readData();
    const settings = db.appSettings;

    let dateRange: number | { startDate: Date; endDate: Date } = 0;
    let periodText = 'Tüm Zamanlar';

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      dateRange = { startDate: start, endDate: end };
      periodText = `Özel Dönem (${start.toLocaleDateString("tr-TR")} - ${end.toLocaleDateString("tr-TR")})`;
    } else if (period === 'daily') {
      dateRange = 1;
      periodText = 'Günlük';
    } else if (period === 'weekly') {
      dateRange = 7;
      periodText = 'Haftalık';
    } else if (period === 'monthly_custom') {
      const startDay = settings?.telegramCustomReportStartDay !== undefined ? settings.telegramCustomReportStartDay : 20;
      const endDay = settings?.telegramCustomReportEndDay !== undefined ? settings.telegramCustomReportEndDay : 19;
      const range = getCustomMonthlyRange(startDay, endDay);
      dateRange = range;
      periodText = `Özel Aylık (${range.startDate.toLocaleDateString("tr-TR")} - ${range.endDate.toLocaleDateString("tr-TR")})`;
    } else if (period === 'monthly') {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      dateRange = { startDate: start, endDate: end };
      periodText = 'Aylık';
    }

    let caption = customCaption;
    if (!caption) {
      caption = `<b>📊 OSGB TETKİK & KASA RAPORU (${periodText})</b>\n` +
        `📅 İstek Tarihi: ${new Date().toLocaleString("tr-TR")}\n\n` +
        `Seçtiğiniz periyoda ait anlık oluşturulan detaylı Excel raporu ektedir.`;
    }

    const success = await sendTelegramReport(db, dateRange, caption, company);
    if (success) {
      res.json({ success: true, message: `${periodText} Excel raporu başarıyla Telegram botunuza gönderildi!` });
    } else {
      res.status(500).json({ error: "Rapor gönderilemedi. Lütfen Telegram Bot Token ve Chat ID bilgilerinizi, ayrıca botun gruba/sohbete mesaj atma yetkisini kontrol edin." });
    }
  });

  // Secure External Backup/RSS JSON Feed (No JWT header required, authenticated via unique query parameter)
  app.get("/api/backup/feed", (req, res) => {
    const { key } = req.query;
    const db = readData();
    const serverKey = db.appSettings?.backupApiKey;

    if (!serverKey || key !== serverKey) {
      return res.status(401).json({ error: "Geçersiz veya eksik API Anahtarı. Lütfen Ayarlar sekmesindeki doğru URL'yi kullanın." });
    }

    // Prepare a clean payload, removing internal security details
    const secureBackup = { ...db };
    if (secureBackup.appSettings) {
      secureBackup.appSettings = { ...secureBackup.appSettings };
      delete secureBackup.appSettings.passwordHash;
      delete secureBackup.appSettings.appPassword;
      delete secureBackup.appSettings.telegramBotToken;
      delete secureBackup.appSettings.telegramChatId;
    }

    res.json(secureBackup);
  });

  // External Webhook Verification Tester (JWT Protected)
  app.post("/api/backup/test-webhook", authMiddleware, async (req, res) => {
    const { url } = req.body;
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ error: "Geçersiz webhook adresi" });
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OSGB-Backup-Event": "test"
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "TEST_CONNECTION",
          message: "OSGB Tetkik Sevk Takip Sistemi Test Bildirimi"
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        res.json({ success: true, message: `Bağlantı Başarılı (Durum: ${response.status})` });
      } else {
        res.status(400).json({ error: `Sunucu hata döndürdü (Durum: ${response.status})` });
      }
    } catch (err: any) {
      res.status(500).json({ error: `Bağlantı kurulamadı: ${err.message}` });
    }
  });

  // --- CANLI FATURA OTOMASYONU POST BİLDİRİM API ENDPOINTLERİ ---
  app.post("/api/health-sync", (req, res) => {
    const authHeader = req.headers.authorization;
    const db = readData();
    const expectedToken = db.appSettings?.healthSyncToken || "vps_secure_secret_2026";

    if (authHeader && authHeader.startsWith("Bearer ") && authHeader.split(" ")[1] !== expectedToken && authHeader.split(" ")[1] !== "vps_secure_secret_2026") {
      return res.status(401).json({ success: false, error: "Yetkisiz Erişim" });
    }

    const { firmName, paymentType, amount } = req.body || {};
    console.log(`[Health Sync Receiver] Incoming POST notification:`, req.body);

    res.json({
      success: true,
      message: "Fatura bildirimi başarıyla alındı.",
      data: {
        firmName: firmName || "Firma Unvanı",
        paymentType: paymentType || "fatura",
        amount: Number(amount || 0)
      }
    });
  });

  app.post("/api/health-sync/test-connection", authMiddleware, async (req, res) => {
    const { targetUrl, token, firmName, amount } = req.body || {};
    const url = targetUrl || "http://localhost:3002/api/health-sync";
    const bearerToken = token || "vps_secure_secret_2026";

    const numAmount = Number(amount || 1850.00);
    const recItem = {
      firmName: firmName || "Örnek Firma A.Ş.",
      paymentType: "fatura",
      amount: numAmount
    };

    const payload = {
      ...recItem,
      records: [ recItem ]
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${bearerToken}`,
          "x-api-key": bearerToken
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });

      const responseText = await response.text();
      let responseJson = {};
      try { responseJson = JSON.parse(responseText); } catch (e) {}

      if (response.ok) {
        res.json({
          success: true,
          message: `Fatura sistemine POST bildirimi başarıyla iletildi! (HTTP ${response.status})`,
          sentPayload: payload,
          targetResponse: responseJson || responseText
        });
      } else {
        res.status(400).json({
          error: `Hedef sunucu hata döndürdü (HTTP ${response.status})`,
          details: responseText
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: `Fatura otomasyonu sunucusuna erişilemedi: ${err.message}` });
    }
  });

  app.post("/api/health-sync/trigger", authMiddleware, async (req, res) => {
    const db = readData();
    const settings = db.appSettings || {};
    const url = settings.healthSyncUrl || "http://localhost:3002/api/health-sync";
    const bearerToken = settings.healthSyncToken || "vps_secure_secret_2026";

    const feedData = getHealthSyncFeedData(db);
    let successCount = 0;
    let failCount = 0;

    // Send individual POST messages for each firm total
    const entries = Object.entries(feedData.totals || {});
    for (const [firmName, sumAmount] of entries) {
      if (sumAmount <= 0) continue;
      const itemData = {
        firmName: firmName,
        paymentType: "fatura",
        amount: Number(sumAmount)
      };
      const payload = {
        ...itemData,
        records: [ itemData ]
      };

      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${bearerToken}`,
            "x-api-key": bearerToken
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000)
        });
        if (resp.ok) successCount++;
        else failCount++;
      } catch (e) {
        failCount++;
      }
    }

    res.json({
      success: true,
      message: `${successCount} adet firma fatura tutarı Fatura Otomasyonu Sistemine (${url}) POST ile iletildi.`,
      details: { successCount, failCount, totalFirms: entries.length }
    });
  });

  const handleHealthSyncFeed = (req: express.Request, res: express.Response) => {
    // Prevent client/CDN caching to ensure 100% instant real-time data
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"];
    const queryToken = req.query.token as string;
    const tokenProvided = authHeader?.replace("Bearer ", "").trim() || apiKeyHeader || queryToken;

    const db = readData();
    const expectedToken = db.appSettings?.healthSyncToken || "vps_secure_secret_2026";

    if (!tokenProvided || (tokenProvided !== expectedToken && tokenProvided !== "vps_secure_secret_2026")) {
      return res.status(401).json({
        success: false,
        error: "Yetkisiz Erişim",
        message: "Geçersiz veya eksik yetkilendirme token'ı (Bearer vps_secure_secret_2026 veya ?token=vps_secure_secret_2026)."
      });
    }

    const feedData = getHealthSyncFeedData(db);

    const format = (req.query.format as string || "").toLowerCase();
    const isRssPath = req.path.endsWith("/rss") || req.path.endsWith("/feed.xml");

    if (format === "rss" || format === "xml" || isRssPath) {
      const hostUrl = `${req.protocol}://${req.get("host")}${req.baseUrl}`;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      return res.send(generateRssXml(feedData, hostUrl));
    }

    return res.json(feedData);
  };

  app.get("/api/health-sync/latest", handleHealthSyncFeed);
  app.get("/api/health-sync/rss", handleHealthSyncFeed);
  app.get("/api/health-sync/feed.xml", handleHealthSyncFeed);

  // App Software Update endpoint from Git + Build
  app.post("/api/app/update", authMiddleware, async (req, res) => {
    const { exec } = await import("child_process");

    const executeCommand = (cmd: string): Promise<{ success: boolean, stdout: string, stderr: string }> => {
      return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            resolve({ success: false, stdout, stderr: stderr || error.message });
          } else {
            resolve({ success: true, stdout, stderr });
          }
        });
      });
    };

    try {
      console.log("[Web Update] Application update triggered via admin web UI.");
      
      // 1. Git pull
      console.log("[Web Update] Running git pull...");
      const gitRes = await executeCommand("git pull");
      if (!gitRes.success) {
        return res.status(500).json({ 
          error: "Git (Geri Çekme) başarısız oldu. Lütfen internet bağlantınızı veya yerel dosya çakışmalarını kontrol edin.", 
          details: gitRes.stderr || gitRes.stdout
        });
      }
      
      // 2. npm install
      console.log("[Web Update] Running npm install...");
      const npmRes = await executeCommand("npm install");
      if (!npmRes.success) {
        return res.status(500).json({ 
          error: "Bağımlılıklar (npm install) yüklenirken hata oluştu.", 
          details: npmRes.stderr || npmRes.stdout
        });
      }
      
      // 3. npm run build
      console.log("[Web Update] Running npm run build...");
      const buildRes = await executeCommand("npm run build");
      if (!buildRes.success) {
        return res.status(500).json({ 
          error: "Uygulama derlenirken (npm run build) hata oluştu.", 
          details: buildRes.stderr || buildRes.stdout
        });
      }
      
      console.log("[Web Update] Application successfully built! Scheduling restart...");
      res.json({ 
        success: true, 
        message: "Güncelleme başarıyla tamamlandı! Sunucu yeni sürümle yeniden başlatılıyor..." 
      });
      
      // Standalone exit to trigger service manager auto-restart with updated build
      setTimeout(() => {
        console.log("[Web Update] Exiting process with exit code 0 to trigger automatic daemon restart...");
        process.exit(0);
      }, 1500);

    } catch (err: any) {
      res.status(500).json({ error: "Güncelleme sırasında beklenmeyen bir hata oluştu.", details: err.message });
    }
  });

  // Data endpoints
  app.get("/api/data", authMiddleware, (req, res) => {
    res.json(readData());
  });

  app.post("/api/data/:collection/:action", authMiddleware, (req, res) => {
    const { collection, action } = req.params;
    const item = req.body;
    
    const db = readData();
    if (!db[collection] && collection !== 'appSettings') {
      return res.status(400).json({ error: "Invalid collection" });
    }

    if (collection === 'appSettings') {
      if (action === 'save') {
        db.appSettings = { ...db.appSettings, ...item };
        writeData(db);
      }
      return res.json({ success: true });
    }

    if (action === 'save') {
      const idx = db[collection].findIndex((x: any) => x.id === item.id);
      const isNew = idx < 0;
      if (idx >= 0) {
        db[collection][idx] = { ...db[collection][idx], ...item };
      } else {
        db[collection].push(item);
      }

      // If collection is referrals, trigger telegram notification only for newly created items
      if (collection === 'referrals' && isNew) {
        try {
          notifyTelegramReferral(item, db);
        } catch (tgErr) {
          console.error("Failed to send telegram notification:", tgErr);
        }
      }

      // Automatically send instant POST notification to Fatura Hazırlama Sistemine when a referral or transaction is saved
      if (collection === 'referrals' || collection === 'transactions') {
        try {
          notifyHealthSyncWebhook(item, db);
        } catch (hsErr) {
          console.error("Failed to send health sync POST notification:", hsErr);
        }
      }
    } else if (action === 'delete') {
      db[collection] = db[collection].filter((x: any) => x.id !== item.id);
    }
    
    writeData(db);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // @ts-ignore
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  startTelegramScheduler();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
