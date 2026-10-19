// Fetch polyfill for older Node versions (Windows Server 2012)
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}
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

import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';


// --- WHATSAPP CLIENT SETUP ---
let waReady = false;
let waQr = '';
let sock: any = null;

let isConnecting = false;
async function connectToWhatsApp() {
  if (isConnecting) return;
  isConnecting = true;
  if (sock) {
    try { sock.end(undefined); } catch (e) {}
    sock = null;
  }
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        waQr = qr;
      }
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        isConnecting = false;
        waReady = false;
        waQr = '';
        if (isLoggedOut) {
          console.log('[WhatsApp] Session logged out from device. Cleaning auth_info_baileys and restarting for new QR...');
          try {
            fs.rmSync(path.join(process.cwd(), 'auth_info_baileys'), { recursive: true, force: true });
          } catch (e) {}
          setTimeout(() => connectToWhatsApp(), 3000);
        } else {
          setTimeout(() => connectToWhatsApp(), 10000);
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connection opened');
        isConnecting = false;
        waReady = true;
        waQr = '';
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    isConnecting = false;
    console.error('WhatsApp Error:', err);
    setTimeout(() => connectToWhatsApp(), 15000);
  }
}

connectToWhatsApp();


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

  // Prepare a safe payload (remove all sensitive credentials & API keys)
  const safeCompanies = Array.isArray(db.companies)
    ? db.companies.map((c: any) => ({ ...c, portalPassword: undefined }))
    : [];
  const safeInstitutions = Array.isArray(db.institutions)
    ? db.institutions.map((i: any) => ({ ...i, portalPassword: undefined }))
    : [];

  const safePayload = JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "DATA_UPDATE",
    data: {
      ...db,
      companies: safeCompanies,
      institutions: safeInstitutions,
      appSettings: {
        ...db.appSettings,
        passwordHash: undefined,
        appPassword: undefined,
        sonucPortalPassword: undefined,
        telegramBotToken: undefined,
        telegramChatId: undefined,
        odealMerchantKey: undefined,
        odealSecretKey: undefined,
        backupApiKey: undefined
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

function escapeHtml(text: any): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sendTelegramNotification(message: string, settings: any) {
  if (!settings?.isTelegramEnabled || !settings?.telegramBotToken || !settings?.telegramChatId) {
    return;
  }
  const token = String(settings.telegramBotToken).trim();
  const chatId = String(settings.telegramChatId).trim();
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
  .then(async res => {
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[Telegram Sync] Telegram API returned status: ${res.status} - ${errText}`);
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

  const employeeName = escapeHtml(item.employee?.fullName || "Bilinmiyor");
  const tcNo = escapeHtml(item.employee?.tcNo || "Bilinmiyor");
  const companyName = escapeHtml(item.employee?.company || "Bilinmiyor");
  const targetInstId = item.targetInstitutionId || item.institutionId;
  const instName = escapeHtml(
    db.institutions?.find((ins: any) => ins.id === targetInstId)?.name || "Belirtilmemiş"
  );

  // Resolve exams (by id or name)
  const examsList = (item.exams || []).map((examKey: string) => {
    const examDef = db.exams?.find((e: any) => e.id === examKey || e.name === examKey);
    const label = examDef
      ? `${examDef.name}${examDef.code ? ` (${examDef.code})` : ''}`
      : examKey;
    return `• ${escapeHtml(label)}`;
  }).join("\n");

  // Format payment method
  let paymentText = item.paymentMethod || "-";
  if (paymentText === "CASH") paymentText = "\u{1F4B5} Nakit";
  else if (paymentText === "POS") paymentText = "\u{1F4B3} POS";
  else if (paymentText === "INVOICE") paymentText = "\u{1F4BC} Cari / Fatura";

  const date = item.referralDate ? new Date(item.referralDate).toLocaleDateString("tr-TR") : "-";
  const notes = escapeHtml(item.notes ? item.notes : "-");
  const price = item.totalPrice !== undefined ? `${item.totalPrice} TL` : "-";
  const cost = item.totalCost !== undefined ? `${item.totalCost} TL` : "-";

  const message = `<b>\u{1F514} YEN\u0130 SEVK KAYDI</b>\n\n` +
    `<b>\u{1F464} \u00C7al\u0131\u015fan:</b> ${employeeName} (TC: ${tcNo})\n` +
    `<b>\u{1F3E2} Firma:</b> ${companyName}\n` +
    `<b>\u{1F3E5} Kurum:</b> ${instName}\n` +
    `<b>\u{1F4C5} Tarih:</b> ${date}\n` +
    `<b>\u{1F4B3} \u00D6deme Tipi:</b> ${paymentText}\n\n` +
    `<b>\u{1F9EA} Yap\u0131lan Tetkikler:</b>\n${examsList || 'Belirtilmemiş'}\n\n` +
    `<b>\u{1F4B0} \u00Dccret:</b> ${price} / <b>Maliyet:</b> ${cost}\n` +
    `<b>\u{1F4DD} Notlar:</b> ${notes}`;

  sendTelegramNotification(message, db.appSettings);
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
  let dateTitle = "Tüm Kayıtlar";

  if (dateRange) {
    let start: Date;
    let end: Date = new Date();

    if (typeof dateRange === 'number') {
      if (dateRange > 0) {
        start = new Date();
        start.setDate(start.getDate() - dateRange);
        dateTitle = `Son ${dateRange} Gün (${start.toLocaleDateString('tr-TR')} - ${end.toLocaleDateString('tr-TR')})`;
      } else {
        start = new Date(0);
      }
    } else {
      start = dateRange.startDate;
      end = dateRange.endDate;
      dateTitle = `${start.toLocaleDateString('tr-TR')} - ${end.toLocaleDateString('tr-TR')}`;
    }

    referrals = referrals.filter((item: any) => {
      if (item.isExternalRecord || !item.referralDate) return false;
      const d = new Date(item.referralDate);
      return d >= start && d <= end;
    });

    transactions = transactions.filter((item: any) => {
      if (!item.date) return false;
      const d = new Date(item.date);
      return d >= start && d <= end;
    });
  } else {
    referrals = referrals.filter((item: any) => !item.isExternalRecord);
  }

  if (company && company !== 'ALL') {
    referrals = referrals.filter((item: any) => {
      return item.employee?.company === company;
    });
  }

  const autoFitColumns = (sheetData: any[][]) => {
    const colWidths: number[] = [];
    sheetData.forEach(row => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, colIdx) => {
        let str = '';
        if (cell === null || cell === undefined) str = '';
        else if (typeof cell === 'object' && cell.v !== undefined) {
          if (typeof cell.v === 'number') {
            str = cell.z && cell.z.includes('%') ? `${(cell.v * 100).toFixed(1)}%` : cell.v.toLocaleString('tr-TR');
          } else {
            str = String(cell.v);
          }
        } else {
          str = String(cell);
        }
        colWidths[colIdx] = Math.max(colWidths[colIdx] || 10, Math.min(str.length + 4, 60));
      });
    });
    return colWidths.map(w => ({ wch: w }));
  };

  // Aggregations
  let totalReferralPrice = 0;
  let totalReferralCost = 0;
  const paymentStats = {
    cash: { count: 0, total: 0 },
    pos: { count: 0, total: 0 },
    invoice: { count: 0, total: 0 }
  };
  const institutionStats: Record<string, { name: string; count: number; revenue: number; cost: number; profit: number }> = {};
  const companyStats: Record<string, { name: string; count: number; total: number; cashTotal: number; posTotal: number; invoiceTotal: number; cost: number }> = {};
  const examCounter: Record<string, number> = {};

  referrals.forEach((item: any) => {
    const price = item.totalPrice !== undefined ? Number(item.totalPrice) : 0;
    const cost = item.totalCost !== undefined ? Number(item.totalCost) : 0;
    totalReferralPrice += price;
    totalReferralCost += cost;

    const pm = item.paymentMethod || 'CASH';
    if (pm === 'CASH') {
      paymentStats.cash.count++;
      paymentStats.cash.total += price;
    } else if (pm === 'POS') {
      paymentStats.pos.count++;
      paymentStats.pos.total += price;
    } else {
      paymentStats.invoice.count++;
      paymentStats.invoice.total += price;
    }

    const targetInstId = item.targetInstitutionId || item.institutionId || 'unknown';
    const instName = db.institutions?.find((ins: any) => ins.id === targetInstId)?.name || targetInstId;
    if (!institutionStats[targetInstId]) {
      institutionStats[targetInstId] = { name: instName, count: 0, revenue: 0, cost: 0, profit: 0 };
    }
    institutionStats[targetInstId].count++;
    institutionStats[targetInstId].revenue += price;
    institutionStats[targetInstId].cost += cost;
    institutionStats[targetInstId].profit += price - cost;

    const compName = item.employee?.company || 'Belirtilmemiş';
    if (!companyStats[compName]) {
      companyStats[compName] = { name: compName, count: 0, total: 0, cashTotal: 0, posTotal: 0, invoiceTotal: 0, cost: 0 };
    }
    companyStats[compName].count++;
    companyStats[compName].total += price;
    companyStats[compName].cost += cost;
    if (pm === 'CASH') companyStats[compName].cashTotal += price;
    else if (pm === 'POS') companyStats[compName].posTotal += price;
    else companyStats[compName].invoiceTotal += price;

    (item.exams || []).forEach((ex: string) => {
      const examDef = db.exams?.find((e: any) => e.id === ex || e.code === ex || e.name === ex);
      const exName = examDef ? examDef.name : ex;
      examCounter[exName] = (examCounter[exName] || 0) + 1;
    });
  });

  const estimatedProfit = totalReferralPrice - totalReferralCost;

  let totalIncome = 0;
  let periodCashIncome = 0;
  let totalExpense = 0;
  transactions.forEach((tx: any) => {
    const amt = Number(tx.amount || 0);
    if (tx.type === 'INCOME') {
      totalIncome += amt;
      if (tx.paymentMethod === 'CASH' || !tx.paymentMethod) periodCashIncome += amt;
    } else {
      totalExpense += amt;
    }
  });

  const currentTotalCashBalance = (db.transactions || []).reduce((acc: number, curr: any) => {
    const amt = Number(curr.amount || 0);
    if (curr.type === 'INCOME') {
      return (curr.paymentMethod === 'CASH' || !curr.paymentMethod) ? acc + amt : acc;
    }
    return acc - amt;
  }, 0);
  const openingBalance = currentTotalCashBalance - (periodCashIncome - totalExpense);

  const examStats = Object.entries(examCounter)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const totalExamsCount = examStats.reduce((sum, item) => sum + item.count, 0);

  const wb = XLSX.utils.book_new();

  // 1. Finansal Z Özeti
  const summaryRows: any[][] = [
    ['OSGB TETKİK VE SEVK TAKİP - FİNANSAL Z RAPORU VE MUTABAKAT TABLOSU'],
    ['Rapor Dönemi:', dateTitle],
    ['Seçili Firma:', company && company !== 'ALL' ? company : 'Tüm Firmalar'],
    ['Oluşturulma Zamanı:', new Date().toLocaleString('tr-TR')],
    [],
    ['1. GENEL CİRO VE KÂRLILIK GÖSTERGELERİ'],
    ['Metrik / Gösterge', 'Tutar / Miktar', 'Birim / Açıklama'],
    ['Toplam Sevk Edilen Personel Sayısı', referrals.length, 'Kişi'],
    ['Toplam Sevk Satış Cirosu (TL)', { t: 'n', v: totalReferralPrice, z: '#,##0.00' }, 'Müşterilerden beklenen / tahsil edilen ciro'],
    ['Toplam Kurum (Hastane) Maliyeti (TL)', { t: 'n', v: totalReferralCost, z: '#,##0.00' }, 'Hastanelere ödenecek toplam hakediş'],
    ['Tahmini Net Brüt Kâr (TL)', { t: 'n', v: estimatedProfit, z: '#,##0.00' }, 'Toplam Ciro - Kurum Maliyeti'],
    ['Genel Kâr Marjı (%)', { t: 'n', v: totalReferralPrice > 0 ? (estimatedProfit / totalReferralPrice) : 0, z: '0.0%' }, 'Net Kâr / Satış Cirosu'],
    [],
    ['2. NAKİT KASA (ÇEKMECE) MUTABAKATI (MUHASEBE & KASA GÖREVLİSİ AYRIMI)'],
    ['* DİKKAT: POS / Kart ve Cari tahsilatları banka ve cariye işler, nakit kasasına dahil edilmez.'],
    ['Kasa Hareketi Kalemi', 'Tutar (TL)', 'Muhasebe Açıklaması'],
    ['Dönem Başı Devreden Nakit Bakiye (TL)', { t: 'n', v: openingBalance, z: '#,##0.00' }, 'Dönem başındaki nakit çekmece mevcudu'],
    ['(+) Dönem İçi Elden Nakit Girişi (TL)', { t: 'n', v: periodCashIncome, z: '#,##0.00' }, 'Kasaya giren nakit tahsilatlar (+)'],
    ['(-) Dönem İçi Kasadan Nakit Çıkış / Gider (TL)', { t: 'n', v: totalExpense, z: '#,##0.00' }, 'Kasadan ödenen masraflar (-)'],
    ['(=) Güncel Net Nakit Kasa Bakiyesi (TL)', { t: 'n', v: currentTotalCashBalance, z: '#,##0.00' }, 'ÇEKMECEDE OLMASI GEREKEN NAKİT MEVCUDU'],
    [],
    ['3. TAHSİLAT KANALLARI DAĞILIMI'],
    ['Tahsilat Kanalı', 'Kişi / İşlem Sayısı', 'Toplam Tutar (TL)', 'Ciro Payı (%)', 'Nakit Kasaya Etkisi'],
    ['Elden Nakit Tahsilat', paymentStats.cash.count, { t: 'n', v: paymentStats.cash.total, z: '#,##0.00' }, { t: 'n', v: totalReferralPrice > 0 ? paymentStats.cash.total / totalReferralPrice : 0, z: '0.0%' }, 'Nakit Kasaya İşlendi (+)'],
    ['Kredi Kartı / POS Tahsilatı', paymentStats.pos.count, { t: 'n', v: paymentStats.pos.total, z: '#,##0.00' }, { t: 'n', v: totalReferralPrice > 0 ? paymentStats.pos.total / totalReferralPrice : 0, z: '0.0%' }, 'Banka Hesabına Yatar (Nakit Kasaya İşlemez)'],
    ['Fatura / Cari (Vadeli Borç)', paymentStats.invoice.count, { t: 'n', v: paymentStats.invoice.total, z: '#,##0.00' }, { t: 'n', v: totalReferralPrice > 0 ? paymentStats.invoice.total / totalReferralPrice : 0, z: '0.0%' }, 'Cari Borç (Nakit Kasaya İşlemez)'],
    ['GENEL TOPLAM', referrals.length, { t: 'n', v: totalReferralPrice, z: '#,##0.00' }, { t: 'n', v: 1, z: '0.0%' }, 'Toplam Satış Cirosu'],
    [],
    ['4. KURUM (HASTANE) HAKEDİŞ VE MALİYET DAĞILIMI'],
    ['Kurum / Hastane Adı', 'Sevk Sayısı', 'Satış Cirosu (TL)', 'Kuruma Ödenecek Maliyet (TL)', 'Net Kârımız (TL)', 'Kâr Marjı (%)'],
    ...Object.values(institutionStats).map(inst => [
      inst.name,
      inst.count,
      { t: 'n', v: inst.revenue, z: '#,##0.00' },
      { t: 'n', v: inst.cost, z: '#,##0.00' },
      { t: 'n', v: inst.profit, z: '#,##0.00' },
      { t: 'n', v: inst.revenue > 0 ? (inst.profit / inst.revenue) : 0, z: '0.0%' }
    ]),
    ['KURUMLAR TOPLAMI', referrals.length, { t: 'n', v: totalReferralPrice, z: '#,##0.00' }, { t: 'n', v: totalReferralCost, z: '#,##0.00' }, { t: 'n', v: estimatedProfit, z: '#,##0.00' }, { t: 'n', v: totalReferralPrice > 0 ? (estimatedProfit / totalReferralPrice) : 0, z: '0.0%' }],
    [],
    ['5. EN ÇOK SEVK YAPILAN İLK 10 FİRMA'],
    ['Firma Adı', 'Personel Sayısı', 'Toplam Ciro (TL)', 'Elden Nakit (TL)', 'POS / Kart (TL)', 'Cari / Fatura (TL)', 'Maliyet (TL)', 'Net Kâr (TL)'],
    ...Object.values(companyStats).sort((a, b) => b.total - a.total).slice(0, 10).map(comp => [
      comp.name,
      comp.count,
      { t: 'n', v: comp.total, z: '#,##0.00' },
      { t: 'n', v: comp.cashTotal, z: '#,##0.00' },
      { t: 'n', v: comp.posTotal, z: '#,##0.00' },
      { t: 'n', v: comp.invoiceTotal, z: '#,##0.00' },
      { t: 'n', v: comp.cost, z: '#,##0.00' },
      { t: 'n', v: comp.total - comp.cost, z: '#,##0.00' }
    ]),
    [],
    ['6. EN ÇOK YAPILAN TETKİKLER'],
    ['Tetkik Adı', 'Yapılma Sayısı', 'İşlem Payı (%)'],
    ...examStats.map(ex => [
      ex.name,
      ex.count,
      { t: 'n', v: totalExamsCount > 0 ? (ex.count / totalExamsCount) : 0, z: '0.0%' }
    ])
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = autoFitColumns(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, '1_Finansal_Z_Ozeti');

  // 2. Sevk ve Hasta Listesi
  const referralHeaders = [
    'Sıra No', 'Sevk Tarihi', 'Saat', 'Personel Adı Soyadı', 'TC Kimlik No', 'Firma / İşyeri', 'Sevk Edilen Kurum / Hastane', 'Sevk Edilen Tetkikler', 'Ödeme Yöntemi', 'Satış Tutarı (TL)', 'Kurum Maliyeti (TL)', 'Net Kâr (TL)', 'Sonuç Durumu', 'Notlar'
  ];
  const referralRows: any[][] = [
    referralHeaders,
    ...referrals.map((item: any, idx: number) => {
      const d = item.referralDate ? new Date(item.referralDate) : null;
      const dateStr = d ? d.toLocaleDateString("tr-TR") : "-";
      const timeStr = d ? d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "-";
      const examsList = (item.exams || []).map((examKey: string) => {
        const examDef = db.exams?.find((e: any) => e.id === examKey || e.name === examKey || e.code === examKey);
        return examDef ? examDef.name : examKey;
      }).join(", ");
      const targetInstId = item.targetInstitutionId || item.institutionId;
      const instName = db.institutions?.find((ins: any) => ins.id === targetInstId)?.name || targetInstId || "-";
      let paymentLabel = item.paymentMethod === "CASH" ? "ELDEN NAKİT (Kasa)" : item.paymentMethod === "POS" ? "POS / KART (Banka)" : "FATURA / CARİ";
      const price = item.totalPrice !== undefined ? Number(item.totalPrice) : 0;
      const cost = item.totalCost !== undefined ? Number(item.totalCost) : 0;

      let statusText = 'Bekliyor';
      if (item.status === 'COMPLETED') statusText = 'Tamamlandı';
      else if (item.status === 'PARTIAL') statusText = 'Kısmi Sonuç';
      else if (item.status === 'AT_HOSPITAL') statusText = 'Hastanede';
      else if (item.status === 'AWAITING_RESULT') statusText = 'Sonuç Bekleniyor';
      else if (item.status === 'CANCELLED') statusText = 'İptal';

      return [
        idx + 1, dateStr, timeStr, item.employee?.fullName || "-", item.employee?.tcNo || "-", item.employee?.company || "-", instName, examsList || "-", paymentLabel, { t: 'n', v: price, z: '#,##0.00' }, { t: 'n', v: cost, z: '#,##0.00' }, { t: 'n', v: price - cost, z: '#,##0.00' }, statusText, item.notes || "-"
      ];
    }),
    [],
    [
      'GENEL TOPLAM', `${referrals.length} Kişi`, '', '', '', '', '', '', '', { t: 'n', v: totalReferralPrice, z: '#,##0.00' }, { t: 'n', v: totalReferralCost, z: '#,##0.00' }, { t: 'n', v: estimatedProfit, z: '#,##0.00' }, '', ''
    ]
  ];
  const wsReferrals = XLSX.utils.aoa_to_sheet(referralRows);
  wsReferrals['!cols'] = autoFitColumns(referralRows);
  XLSX.utils.book_append_sheet(wb, wsReferrals, '2_Sevk_ve_Hasta_Listesi');

  // 3. Kasa ve Gider Defteri
  const txHeaders = [
    'Sıra No', 'Tarih', 'Saat', 'Hareket Türü', 'Ödeme / Hesap Türü', 'Kategori', 'Açıklama', 'Gelir / Giriş (+TL)', 'Gider / Çıkış (-TL)', 'Nakit Kasaya Etkisi'
  ];
  const txRows: any[][] = [
    txHeaders,
    ...transactions.map((t: any, idx: number) => {
      const d = t.date ? new Date(t.date) : null;
      const dateFormatted = d ? d.toLocaleDateString('tr-TR') : '-';
      const timeFormatted = d ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-';
      const isIncome = t.type === 'INCOME';
      const isCash = t.paymentMethod === 'CASH' || !t.paymentMethod;
      const channelLabel = !isIncome ? 'Nakit Kasadan Çıkış' : t.paymentMethod === 'POS' ? 'Banka / POS' : t.paymentMethod === 'INVOICE' ? 'Cari / Fatura' : 'Nakit Kasa (Çekmece)';
      const impactText = !isIncome ? 'Kasadan Azaldı (-)' : isCash ? 'Kasaya Arttı (+)' : 'Nakit Kasaya İşlemez (Banka/Cari)';
      const amt = Number(t.amount || 0);
      return [
        idx + 1, dateFormatted, timeFormatted, isIncome ? 'GELİR (+)' : 'GİDER (-)', channelLabel, t.category || '-', t.description || '-', isIncome ? { t: 'n', v: amt, z: '#,##0.00' } : { t: 'n', v: 0, z: '#,##0.00' }, !isIncome ? { t: 'n', v: amt, z: '#,##0.00' } : { t: 'n', v: 0, z: '#,##0.00' }, impactText
      ];
    }),
    [],
    [
      'GENEL TOPLAM', `${transactions.length} İşlem`, '', '', '', '', '', { t: 'n', v: totalIncome, z: '#,##0.00' }, { t: 'n', v: totalExpense, z: '#,##0.00' }, `Net Nakit Kasa Değişimi: ${(periodCashIncome - totalExpense).toLocaleString('tr-TR')} TL`
    ]
  ];
  const wsTx = XLSX.utils.aoa_to_sheet(txRows);
  wsTx['!cols'] = autoFitColumns(txRows);
  XLSX.utils.book_append_sheet(wb, wsTx, '3_Kasa_ve_Gider_Defteri');

  // 4. Kurum Hakediş Mutabakatı
  const instHeaders = [
    'Sıra No', 'Anlaşmalı Kurum / Hastane Adı', 'Sevk Sayısı (Kişi)', 'Toplam Satış Cirosu (TL)', 'Kuruma Ödenecek Hakediş (TL)', 'OSGB Net Kârı (TL)', 'Kâr Marjı (%)', 'Sevk Payı (%)'
  ];
  const sortedInsts = Object.values(institutionStats).sort((a, b) => b.count - a.count);
  const instRows: any[][] = [
    instHeaders,
    ...sortedInsts.map((inst, idx) => [
      idx + 1, inst.name, inst.count, { t: 'n', v: inst.revenue, z: '#,##0.00' }, { t: 'n', v: inst.cost, z: '#,##0.00' }, { t: 'n', v: inst.profit, z: '#,##0.00' }, { t: 'n', v: inst.revenue > 0 ? (inst.profit / inst.revenue) : 0, z: '0.0%' }, { t: 'n', v: referrals.length > 0 ? (inst.count / referrals.length) : 0, z: '0.0%' }
    ]),
    [],
    [
      'GENEL TOPLAM', `${sortedInsts.length} Kurum`, referrals.length, { t: 'n', v: totalReferralPrice, z: '#,##0.00' }, { t: 'n', v: totalReferralCost, z: '#,##0.00' }, { t: 'n', v: estimatedProfit, z: '#,##0.00' }, { t: 'n', v: totalReferralPrice > 0 ? (estimatedProfit / totalReferralPrice) : 0, z: '0.0%' }, { t: 'n', v: 1, z: '0.0%' }
    ]
  ];
  const wsInst = XLSX.utils.aoa_to_sheet(instRows);
  wsInst['!cols'] = autoFitColumns(instRows);
  XLSX.utils.book_append_sheet(wb, wsInst, '4_Kurum_Hakedis_Mutabakati');

  // 5. Firma Ciro Mutabakatı
  const compHeaders = [
    'Sıra No', 'Firma / Müşteri Adı', 'Sevk Edilen Personel', 'Toplam Ciro (TL)', 'Elden Nakit (TL)', 'POS / Kredi Kartı (TL)', 'Cari / Fatura (TL)', 'Kurum Maliyeti (TL)', 'Net Kâr (TL)', 'Kâr Marjı (%)'
  ];
  const sortedComps = Object.values(companyStats).sort((a, b) => b.total - a.total);
  const compRows: any[][] = [
    compHeaders,
    ...sortedComps.map((comp, idx) => [
      idx + 1, comp.name, comp.count, { t: 'n', v: comp.total, z: '#,##0.00' }, { t: 'n', v: comp.cashTotal, z: '#,##0.00' }, { t: 'n', v: comp.posTotal, z: '#,##0.00' }, { t: 'n', v: comp.invoiceTotal, z: '#,##0.00' }, { t: 'n', v: comp.cost, z: '#,##0.00' }, { t: 'n', v: comp.total - comp.cost, z: '#,##0.00' }, { t: 'n', v: comp.total > 0 ? ((comp.total - comp.cost) / comp.total) : 0, z: '0.0%' }
    ]),
    [],
    [
      'GENEL TOPLAM', `${sortedComps.length} Firma`, referrals.length, { t: 'n', v: totalReferralPrice, z: '#,##0.00' }, { t: 'n', v: paymentStats.cash.total, z: '#,##0.00' }, { t: 'n', v: paymentStats.pos.total, z: '#,##0.00' }, { t: 'n', v: paymentStats.invoice.total, z: '#,##0.00' }, { t: 'n', v: totalReferralCost, z: '#,##0.00' }, { t: 'n', v: estimatedProfit, z: '#,##0.00' }, { t: 'n', v: totalReferralPrice > 0 ? (estimatedProfit / totalReferralPrice) : 0, z: '0.0%' }
    ]
  ];
  const wsComp = XLSX.utils.aoa_to_sheet(compRows);
  wsComp['!cols'] = autoFitColumns(compRows);
  XLSX.utils.book_append_sheet(wb, wsComp, '5_Firma_Ciro_Mutabakati');

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf;
}

async function sendTelegramReport(
  db: any,
  dateRange?: number | { startDate: Date; endDate: Date },
  caption?: string,
  company?: string,
  overrideAuth?: { token?: string; chatId?: string }
) {
  const settings = db.appSettings;
  const token = String(overrideAuth?.token || settings?.telegramBotToken || "").trim();
  const chatId = String(overrideAuth?.chatId || settings?.telegramChatId || "").trim();
  if (!token || !chatId || (!overrideAuth?.token && !settings?.isTelegramEnabled)) {
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
          const caption = `<b>\u{1F4CA} G\u00DCNL\u00DCK TETK\u0130K &amp; KASA RAPORU (1. Periyot)</b>\n` +
            `\u{1F4C5} Tarih: ${now.toLocaleDateString("tr-TR")}\n\n` +
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
            const caption = `<b>\u{1F4CA} HAFTALIK TETK\u0130K &amp; KASA RAPORU (1. Periyot)</b>\n` +
              `\u{1F4C5} Tarih: ${now.toLocaleDateString("tr-TR")}\n\n` +
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

            const caption = `<b>\u{1F4CA} AYLIK TETK\u0130K &amp; KASA RAPORU (ÖZEL PERİYOT) (1. Periyot)</b>\n` +
              `\u{1F4C5} D\u00f6nem: ${startDate.toLocaleDateString("tr-TR")} - ${endDate.toLocaleDateString("tr-TR")}\n\n` +
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
          const caption = `<b>\u{1F4CA} G\u00DCNL\u00DCK TETK\u0130K &amp; KASA RAPORU (2. Periyot)</b>\n` +
            `\u{1F4C5} Tarih: ${now.toLocaleDateString("tr-TR")}\n\n` +
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
            const caption = `<b>\u{1F4CA} HAFTALIK TETK\u0130K &amp; KASA RAPORU (2. Periyot)</b>\n` +
              `\u{1F4C5} Tarih: ${now.toLocaleDateString("tr-TR")}\n\n` +
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

            const caption = `<b>\u{1F4CA} AYLIK TETK\u0130K &amp; KASA RAPORU (ÖZEL PERİYOT) (2. Periyot)</b>\n` +
              `\u{1F4C5} D\u00f6nem: ${startDate.toLocaleDateString("tr-TR")} - ${endDate.toLocaleDateString("tr-TR")}\n\n` +
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
  const PORT = 3000;

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
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (!decoded || decoded.role !== 'admin') {
        return res.status(403).json({ error: "Bu işlem için yönetici yetkisi gereklidir." });
      }
      next();
    } catch (error) {
      return res.status(401).json({ error: "Oturum süresi doldu veya geçersiz token." });
    }
  };

  // Login endpoint
  app.post("/api/auth/login", loginLimiter, (req, res) => {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "Lütfen şifrenizi giriniz." });
    }
    const currentHash = getAppPasswordHash();
    
    // Verify the password against the stored password hash
    if (bcrypt.compareSync(password, currentHash)) {
      // Generate secure 12-hour token
      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: "Yanlış Şifre" });
    }
  });

  // Change password endpoint
  app.post("/api/auth/change-password", authMiddleware, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: "Eski ve yeni şifre gereklidir." });
    }
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
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: '12h' });
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
      `Telegram bildirim entegrasyonu ba\u015far\u0131yla test edildi! \u{1F389}\n` +
      `Sisteminiz artık tetkik (sevk) hareketlerini buraya raporlayacak.`;

    const url = `https://api.telegram.org/bot${String(token).trim()}/sendMessage`;

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(chatId).trim(),
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
    const { period, startDate, endDate, company, caption: customCaption, token, chatId, customStartDay, customEndDay } = req.body;
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
      const startDay = customStartDay !== undefined ? Number(customStartDay) : (settings?.telegramCustomReportStartDay !== undefined ? settings.telegramCustomReportStartDay : 20);
      const endDay = customEndDay !== undefined ? Number(customEndDay) : (settings?.telegramCustomReportEndDay !== undefined ? settings.telegramCustomReportEndDay : 19);
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
      caption = `<b>\u{1F4CA} OSGB TETK\u0130K &amp; KASA RAPORU (${escapeHtml(periodText)})</b>\n` +
        `📅 İstek Tarihi: ${new Date().toLocaleString("tr-TR")}\n\n` +
        `Seçtiğiniz periyoda ait anlık oluşturulan detaylı Excel raporu ektedir.`;
    }

    const success = await sendTelegramReport(
      db,
      dateRange,
      caption,
      company,
      token && chatId ? { token, chatId } : undefined
    );
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
      delete secureBackup.appSettings.sonucPortalPassword;
      delete secureBackup.appSettings.telegramBotToken;
      delete secureBackup.appSettings.telegramChatId;
      delete secureBackup.appSettings.odealMerchantKey;
      delete secureBackup.appSettings.odealSecretKey;
      delete secureBackup.appSettings.backupApiKey;
    }

    if (Array.isArray(secureBackup.companies)) {
      secureBackup.companies = secureBackup.companies.map((comp: any) => {
        const safeComp = { ...comp };
        delete safeComp.portalPassword;
        return safeComp;
      });
    }

    if (Array.isArray(secureBackup.institutions)) {
      secureBackup.institutions = secureBackup.institutions.map((inst: any) => {
        const safeInst = { ...inst };
        delete safeInst.portalPassword;
        return safeInst;
      });
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

  // --- ADMIN OTP ENDPOINTS ---
  let adminOTP = '';
  let otpExpiry = 0;

  app.post('/api/admin/request-otp', authMiddleware, async (req, res) => {
    try {
      if (!waReady || !sock || !sock.user || !sock.user.id) {
        return res.json({ success: true, fallback: true, message: 'WhatsApp bağlı olmadığı için ana sistem şifresiyle giriş yapabilirsiniz.' });
      }

      adminOTP = Math.floor(100000 + Math.random() * 900000).toString();
      otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

      const ownJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      await sock.sendMessage(ownJid, {
        text: '*OSGB Sistem Yönetici Paneli*\n\nGiriş şifreniz: *' + adminOTP + '*\n\nBu şifre 5 dakika geçerlidir.'
      });

      res.json({ success: true, message: 'OTP gönderildi.' });
    } catch (err: any) {
      console.error('OTP send error:', err);
      res.json({ success: true, fallback: true, message: 'WhatsApp üzerinden şifre gönderilemedi, ana sistem şifrenizi girebilirsiniz.' });
    }
  });

  app.post('/api/admin/verify-otp', loginLimiter, authMiddleware, (req, res) => {
    const { otp } = req.body;
    if (!otp || typeof otp !== 'string') return res.status(400).json({ error: 'OTP gerekli.' });

    if (!adminOTP || Date.now() > otpExpiry) {
      return res.status(400).json({ error: 'Şifrenin süresi dolmuş. Lütfen yeni şifre isteyin.' });
    }

    if (adminOTP.length === 6 && otp.trim() === adminOTP) {
      adminOTP = ''; // Invalidate after success
      otpExpiry = 0;
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Hatalı şifre.' });
    }
  });

  app.post('/api/admin/verify-fallback', loginLimiter, authMiddleware, (req, res) => {
    const { password } = req.body;
    if (!password || typeof password !== 'string') return res.status(400).json({ error: 'Şifre gerekli.' });
    const currentHash = getAppPasswordHash();
    if (bcrypt.compareSync(password, currentHash)) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Hatalı şifre.' });
    }
  });

  // --- WHATSAPP ENDPOINTS ---
  app.get("/api/whatsapp/status", authMiddleware, (req, res) => {
    res.json({ ready: waReady, qr: waQr });
  });

  app.post("/api/whatsapp/send", authMiddleware, async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ success: false, error: "Telefon numarası ve mesaj metni gereklidir." });
      }
      if (!waReady || !sock) {
        console.warn("[WhatsApp Send] WhatsApp bağlı olmadığı için mesaj gönderilemedi.");
        return res.status(503).json({ success: false, error: "WhatsApp bağlantısı aktif değil. Lütfen Ayarlar > WhatsApp sekmesinden QR kod okutun." });
      }

      let cleanPhone = String(phone).replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) {
        cleanPhone = "90" + cleanPhone.substring(1);
      } else if (!cleanPhone.startsWith("90") && cleanPhone.length === 10) {
        cleanPhone = "90" + cleanPhone;
      }

      if (cleanPhone.length < 10) {
        return res.status(400).json({ success: false, error: "Geçersiz telefon numarası formatı." });
      }

      const jid = `${cleanPhone}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: String(message) });
      console.log(`[WhatsApp] Mesaj başarıyla gönderildi -> ${jid}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[WhatsApp] Mesaj gönderim hatası:", err);
      res.status(500).json({ success: false, error: err.message || "WhatsApp mesajı gönderilemedi." });
    }
  });

  app.post("/api/whatsapp/logout", authMiddleware, async (req, res) => {
    try {
      if (sock) {
        try {
          await sock.logout();
        } catch (e) {}
        try {
          sock.end(undefined);
        } catch (e) {}
      }
      try {
        fs.rmSync(path.join(process.cwd(), 'auth_info_baileys'), { recursive: true, force: true });
      } catch (e) {}
      isConnecting = false;
      waReady = false;
      waQr = '';
      sock = null;
      connectToWhatsApp();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- DATA ENDPOINTS ---
  const ALLOWED_COLLECTIONS = new Set(['referrals', 'companies', 'exams', 'institutions', 'transactions', 'appSettings']);

  app.get("/api/data", authMiddleware, (req, res) => {
    const db = readData();
    const safeDb = {
      ...db,
      appSettings: db.appSettings ? { ...db.appSettings, passwordHash: undefined } : {}
    };
    res.json(safeDb);
  });

  app.post("/api/data/:collection/:action", authMiddleware, (req, res) => {
    const { collection, action } = req.params;
    const item = req.body;
    
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return res.status(400).json({ error: "Invalid collection" });
    }

    const db = readData();
    if (!db[collection] && collection !== 'appSettings') {
      db[collection] = [];
    }

    if (collection === 'appSettings') {
      if (action === 'save' && item && typeof item === 'object') {
        const existingHash = db.appSettings?.passwordHash;
        db.appSettings = { ...db.appSettings, ...item };
        if (existingHash) {
          db.appSettings.passwordHash = existingHash;
        }
        delete db.appSettings.password;
        writeData(db);
      }
      return res.json({ success: true });
    }

    if (action === 'save') {
      if (collection === 'referrals' && item.employee?.tcNo) {
        const extIdx = db.referrals.findIndex((x: any) => 
          x.isExternalRecord && 
          x.employee?.tcNo === item.employee.tcNo &&
          x.id !== item.id
        );
        if (extIdx >= 0) {
          const extRecord = db.referrals[extIdx];
          item.resultPdfPath = item.resultPdfPath || extRecord.resultPdfPath;
          item.completedExams = item.completedExams || extRecord.completedExams;
          item.status = (item.status && item.status !== 'PENDING') ? item.status : extRecord.status;
          item.targetInstitutionId = item.targetInstitutionId || extRecord.targetInstitutionId;
          db.referrals.splice(extIdx, 1);
        }
        item.isExternalRecord = false;
      }
      const idx = db[collection].findIndex((x: any) => x.id === item.id);
      const isNew = idx < 0;
      if (idx >= 0) {
        db[collection][idx] = { ...db[collection][idx], ...item };
      } else {
        db[collection].push(item);
      }

      // Fatura Takip Webhook Integration
      if (collection === 'referrals' && item.paymentMethod === 'INVOICE' && !item.isExternalRecord) {
        try {
          const payload = [{
            id: item.id,
            paymentMethod: item.paymentMethod,
            totalPrice: item.totalPrice || 0,
            referralDate: item.referralDate,
            employee: {
                fullName: item.employee?.fullName || "",
                company: item.employee?.company || ""
            },
            exams: item.exams || []
          }];
          
          fetch('http://localhost:5000/api/webhook/health-services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(err => console.error("Webhook (Fatura Takip) gonderilemedi:", err.message));
        } catch (e) {
          console.error("Webhook (Fatura Takip) hatasi:", e);
        }
      }
      // If collection is referrals, trigger telegram notification only for newly created items
      if (collection === 'referrals' && isNew && !item.skipNotifications) {
        try {
          notifyTelegramReferral(item, db);
        } catch (tgErr) {
          console.error("Failed to send telegram notification:", tgErr);
        }
      }
    } else if (action === 'delete') {
      db[collection] = db[collection].filter((x: any) => x.id !== item.id);
    }
    
    writeData(db);
    res.json({ success: true });
  });

  // --- ODEAL ENTEGRASYONU ---
  app.post("/api/odeal/profile/update", authMiddleware, async (req, res) => {
    try {
      const db = readData();
      const settings = db.appSettings || {};
      const profileType = req.body.profileType;
      const merchantKey = String(req.body.merchantKey || settings.odealMerchantKey || "").trim();
      const secretKey = String(req.body.secretKey || settings.odealSecretKey || "").trim();

      if (!merchantKey || !secretKey) {
        return res.status(400).json({ success: false, error: "Ödeal Merchant Key ve Secret Key gereklidir." });
      }
      
      const response = await fetch("https://api.odeal.com/api/v1/profile/update", {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
          'X-ODEAL-MERCHANT-KEY': merchantKey,
          'X-ODEAL-SECRET-KEY': secretKey
        },
        body: JSON.stringify({ profileType }),
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        const text = await response.text();
        return res.status(400).json({ success: false, error: "API Hatası: " + response.status + " - " + text });
      }
      
      const raw = await response.text();
      let data = {};
      if (raw) {
        try { data = JSON.parse(raw); } catch (e) {}
      }
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/odeal/basket", authMiddleware, async (req, res) => {
    console.log("=== BASKET ISTEGI GELDI ===", req.body);
      
    try {
      const { amount, referralId, deviceKey } = req.body;
      const db = readData();
      const settings = db.appSettings || {};

      if (settings.odealEnabled === false) {
        return res.status(400).json({ error: "Ödeal POS entegrasyonu ayarlardan devre dışı bırakılmış." });
      }

      const finalDeviceKey = String(deviceKey || settings.odealDeviceKey || "").trim();
      if (!finalDeviceKey) {
        return res.status(400).json({ error: "Ödeal Cihaz Kodu eksik." });
      }

      const numericAmount = Number(parseFloat(amount).toFixed(2));
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: "Geçersiz ödeme tutarı." });
      }
      
      const merchantKey = String(settings.odealMerchantKey || "").trim();
      const secretKey = String(settings.odealSecretKey || "").trim();
      
      if (!merchantKey || !secretKey) {
          return res.status(400).json({ error: "Ödeal API anahtarları tanımlı değil." });
      }
      
      const payload = {
        referenceCode: referralId,
        externalDeviceKey: finalDeviceKey,
        basketType: "SIMPLE",
        customer: {
          type: "INDIVIDUAL",
          name: "Nihai",
          surname: "Tüketici",
          identityNumber: "11111111111",
          city: "bursa",
          town: "mudanya",
          address: "Belirtilmedi",
          email: "test@test.com",
          gsmNumber: "5555555555"
        },
        price: {
          grossPrice: numericAmount
        },
        items: [
          {
            quantity: 1,
            product: {
              unitCode: "C62",
              name: "SAĞLIK HİZMETİ",
              referenceCode: "196355",
              price: {
                grossPrice: numericAmount,
                vatRatio: 10
              }
            }
          }
        ],
        paymentOptions: [
          {
            amount: numericAmount,
            type: "CREDITCARD"
          }
        ]
      };
        
      console.log("=== ODL PAYLOAD ===", JSON.stringify(payload, null, 2));
      const response = await fetch(`https://api.odeal.com/api/v1/basket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ODEAL-MERCHANT-KEY": merchantKey,
          "X-ODEAL-SECRET-KEY": secretKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ödeal Sepet Hatası:", errorText);
        return res.status(response.status).json({ error: "Ödeal başlatılamadı", details: errorText });
      }
      const rawText = await response.text();
      let responseData: any = {};
      if (rawText) {
          try { responseData = JSON.parse(rawText); } catch(e){}
      }
      
      const referral = db.referrals?.find((r: any) => r.id === referralId);
      if (referral) {
          referral.odealTransactionId = responseData.id || "PENDING";
          referral.odealStatus = "BASKET_SENT";
          writeData(db);
      }
      
      res.json({ success: true, odealResponse: responseData });
    } catch (err: any) {
      console.error("Odeal API Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/odeal/webhook", express.json(), async (req, res) => {
    try {
      const payload = req.body || {};
      console.log("[Ödeal Webhook] Gelen Veri:", payload);
      const referralId = payload.referenceCode;
      const statusStr = String(payload.status || payload.paymentStatus || "").toUpperCase();
      
      if ((statusStr === 'SUCCESS' || statusStr === 'COMPLETED') && referralId && typeof referralId === 'string') {
        const db = readData();
        const referral = db.referrals?.find((r: any) => r.id === referralId);
        // Only accept webhook updates for valid referrals that used POS / BASKET_SENT
        if (referral && (referral.paymentMethod === 'POS' || referral.odealStatus === 'BASKET_SENT')) {
            referral.paymentMethod = 'POS';
            referral.odealStatus = 'SUCCESS';
            const existingTx = db.transactions?.find((t: any) => t.referralId === referral.id && (t.paymentMethod === 'POS' || (t.description && t.description.includes('Ödeal'))));
            if (!existingTx) {
                const transaction = {
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'INCOME',
                    amount: Number(payload.amount) || referral.totalPrice || 0,
                    description: `Ödeal POS Tahsilat: ${referral.employee?.fullName || '-'} (${referral.employee?.company || '-'})`,
                    date: new Date().toISOString(),
                    paymentMethod: 'POS',
                    referralId: referral.id
                };
                if (!db.transactions) db.transactions = [];
                db.transactions.push(transaction);
                console.log("[Ödeal Webhook] Kasa kaydı başarılı.");
            }
            writeData(db);
        }
      }
      res.status(200).send("OK");
    } catch (err) {
      console.error("Webhook hatası", err);
      res.status(500).send("ERROR");
    }
  });

  // --- PDF & SCRAPING APIS ---
  // --- PROTECTED PDF ROUTE (Authentication & Privacy Required) ---
  const pdfDir = path.join(process.cwd(), 'uploads/pdfs');
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  app.get('/uploads/pdfs/:filename', (req, res) => {
    const rawFilename = req.params.filename;
    const cleanFilename = path.basename(rawFilename); // Prevent path traversal
    const filePath = path.join(pdfDir, cleanFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF dosyası bulunamadı.' });
    }

    // Extract authentication token from Authorization header or URL query parameter
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    // Validate token
    let decodedUser: any = null;
    if (token) {
      try {
        decodedUser = jwt.verify(token, JWT_SECRET) as any;
      } catch (err) {
        decodedUser = null;
      }
    }

    // If unauthenticated, BLOCK ACCESS!
    if (!decodedUser) {
      const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
      if (acceptsHtml) {
        return res.status(401).send(`
          <!DOCTYPE html>
          <html lang="tr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Yetkisiz Erişim - OSGB Sonuç Portalı</title>
            <style>
              body {
                background: #0f172a;
                color: #f8fafc;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 1.25rem;
              }
              .card {
                background: #1e293b;
                border: 1px solid #334155;
                padding: 2.5rem 2rem;
                border-radius: 1.25rem;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
                max-width: 480px;
                text-align: center;
              }
              .icon {
                font-size: 3.5rem;
                margin-bottom: 1rem;
              }
              h1 {
                font-size: 1.4rem;
                font-weight: 700;
                margin: 0 0 0.75rem 0;
                color: #f1f5f9;
              }
              p {
                font-size: 0.95rem;
                line-height: 1.6;
                color: #94a3b8;
                margin: 0 0 1.75rem 0;
              }
              .btn {
                display: inline-block;
                background: #2563eb;
                color: #ffffff;
                text-decoration: none;
                padding: 0.75rem 1.75rem;
                border-radius: 0.75rem;
                font-weight: 600;
                font-size: 0.95rem;
                transition: background 0.2s;
              }
              .btn:hover {
                background: #1d4ed8;
              }
              .notice {
                font-size: 0.75rem;
                color: #64748b;
                margin-top: 1.5rem;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">🔒</div>
              <h1>Sağlık Raporu Koruma Altında</h1>
              <p>KVKK ve hasta gizliliği gereğince bu tetkik raporuna doğrudan şifresiz erişilemez. Raporu görüntülemek veya indirmek için lütfen <b>OSGB Sonuç Portalı</b> üzerinden şifrenizle giriş yapınız.</p>
              <a href="/sonuc" class="btn">Sonuç Portalına Giriş Yap</a>
              <div class="notice">Çankaya OSGB Tetkik ve Sağlık Takip Sistemi</div>
            </div>
          </body>
          </html>
        `);
      }
      return res.status(401).json({ error: 'Yetkilendirme gereklidir. Lütfen sonuç portalına şifrenizle giriş yapınız.' });
    }

    // Role-based authorization:
    // If company_viewer, verify that this PDF belongs to their company
    if (decodedUser.role === 'company_viewer') {
      const db = readData();
      const userCompany = decodedUser.companyName || decodedUser.companyId;
      const webPath = `/uploads/pdfs/${cleanFilename}`;
      const hasAccess = (db.referrals || []).some((r: any) => {
        const matchesFile = r.resultPdfPath === webPath || (r.resultPdfPath && path.basename(r.resultPdfPath) === cleanFilename);
        const matchesCompany = r.employee?.company === userCompany || r.employee?.companyId === userCompany;
        return matchesFile && matchesCompany;
      });

      if (!hasAccess) {
        return res.status(403).json({ error: 'Bu tetkik sonucunu görüntüleme yetkiniz bulunmamaktadır.' });
      }
    }

    // User is authorized (admin, sonuc_viewer, or matching company_viewer)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${cleanFilename}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  });

const publicLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { error: "Çok fazla giriş denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin." },
  validate: false
});

const publicAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Sonuç portalı için yetkilendirme gereklidir." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && (decoded.role === 'sonuc_viewer' || decoded.role === 'admin' || decoded.role === 'company_viewer')) {
      (req as any).publicUser = decoded;
      return next();
    }
    return res.status(403).json({ error: "Yetkisiz erişim." });
  } catch (error) {
    return res.status(401).json({ error: "Oturum süresi doldu veya geçersiz token." });
  }
};

let isScraperActive = false;

app.post('/api/public/login', publicLoginLimiter, (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Lütfen şifre giriniz.' });
    }
    const cleanPass = String(password).trim();
    const db = readData();

    // 1. Ana OSGB Sonuç Portalı Şifresi Kontrolü (Admin / Tüm Sonuçlar)
    const portalPassword = String(db.appSettings?.sonucPortalPassword || '196304').trim();
    if (portalPassword === cleanPass) {
        const token = jwt.sign({ role: 'sonuc_viewer' }, JWT_SECRET, { expiresIn: '12h' });
        return res.json({ 
            success: true, 
            role: 'admin', 
            token 
        });
    }

    // 2. Firma Bazlı Şifre Kontrolü (Şifreden firma otomatik tespit edilir, firma seçmeye gerek yok)
    const companies = db.companies || [];
    const matchedCompany = companies.find((c: any) => 
        Boolean(c.portalPassword && String(c.portalPassword).trim() === cleanPass)
    );

    if (matchedCompany) {
        const token = jwt.sign(
            { role: 'company_viewer', companyId: matchedCompany.id, companyName: matchedCompany.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        return res.json({
            success: true,
            role: 'company',
            token,
            company: { id: matchedCompany.id, name: matchedCompany.name }
        });
    }

    return res.status(401).json({ error: 'Hatalı şifre. Lütfen geçerli bir portal şifresi giriniz.' });
});

app.get('/api/public/institutions', publicAuthMiddleware, (req, res) => {
    const db = readData();
    const insts = (db.institutions || []).map((i: any) => ({
        id: i.id, name: i.name, portalType: i.portalType
    }));
    res.json({ success: true, institutions: insts });
});

function parseDateScore(d?: any): number {
    if (!d) return 0;
    if (d instanceof Date) return d.getTime();
    const str = String(d).trim();
    const parts = str.split(' ')[0].split('.');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        if (!isNaN(dateObj.getTime())) return dateObj.getTime();
    }
    const t = new Date(str).getTime();
    return isNaN(t) ? 0 : t;
}

function formatReferralResult(r: any, institutions: any[]): any {
    const inst = institutions.find((i: any) => i.id === r.targetInstitutionId);
    const allExams: string[] = Array.isArray(r.exams) ? r.exams : [];
    const hasPdf = Boolean(r.resultPdfPath);

    const status = hasPdf ? 'COMPLETED' : 'AWAITING_RESULT';

    return {
        id: r.id,
        date: r.referralDate,
        company: r.employee?.company,
        tc: r.employee?.tcNo,
        name: r.employee?.fullName,
        institutionName: inst?.name || 'Belirtilmemiş Kurum',
        exams: allExams,
        completedExams: hasPdf ? allExams : [],
        pendingExams: hasPdf ? [] : allExams,
        status,
        pdfUrl: r.resultPdfPath || null,
        isExternalRecord: Boolean(r.isExternalRecord),
        notes: r.notes || null
    };
}

app.get('/api/public/all-results', publicAuthMiddleware, (req, res) => {
    const user = (req as any).publicUser;
    // Security: Company viewers are ONLY allowed to search by 11-digit TC, never list all results!
    if (!user || user.role === 'company_viewer') {
        return res.status(403).json({ error: 'Firma yetkilisi yalnızca TC Kimlik No ile sorgulama yapabilir.' });
    }

    const db = readData();
    const referrals = db.referrals || [];
    const institutions = db.institutions || [];

    const results = referrals
        .map((r: any) => formatReferralResult(r, institutions))
        .sort((a: any, b: any) => parseDateScore(b.date) - parseDateScore(a.date));

    res.json({ success: true, results });
});

app.get('/api/public/institution-results/:instId', publicAuthMiddleware, (req, res) => {
    const user = (req as any).publicUser;
    if (!user || user.role === 'company_viewer') {
        return res.status(403).json({ error: 'Yetkisiz erişim.' });
    }
    const { instId } = req.params;
    const db = readData();
    const referrals = db.referrals || [];
    const institutions = db.institutions || [];

    const results = referrals
        .filter((r: any) => r.targetInstitutionId === instId)
        .map((r: any) => formatReferralResult(r, institutions))
        .sort((a: any, b: any) => parseDateScore(b.date) - parseDateScore(a.date));

    res.json({ success: true, results });
});

app.get('/api/public/results/:tc', publicAuthMiddleware, (req, res) => {
    const { tc } = req.params;
    if (!tc || !/^\d{11}$/.test(String(tc).trim())) {
        return res.status(400).json({ error: 'Geçerli bir 11 haneli T.C. Kimlik Numarası giriniz.' });
    }
    const cleanTc = String(tc).trim();
    const user = (req as any).publicUser;
    const db = readData();
    const referrals = db.referrals || [];
    const institutions = db.institutions || [];
    const norm = (s: string) => (s || '').trim().toLocaleLowerCase('tr-TR');

    let filtered = referrals.filter((r: any) => String(r.employee?.tcNo || '').trim() === cleanTc);

    // If logged in as company viewer, strictly filter by company!
    if (user && user.role === 'company_viewer') {
        const userComp = norm(user.companyName);
        if (!userComp) {
            return res.status(403).json({ error: 'Firma bilgisi doğrulanamadı.' });
        }
        filtered = filtered.filter((r: any) => norm(r.employee?.company) === userComp);
    }

    const results = filtered
        .map((r: any) => formatReferralResult(r, institutions))
        .sort((a: any, b: any) => parseDateScore(b.date) - parseDateScore(a.date));

    res.json({ success: true, results });
});

// --- FİRMA PORTALI APIS ---
const companyAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Firma portalı için yetkilendirme gereklidir." });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded && (decoded.role === 'company_viewer' || decoded.role === 'admin')) {
            (req as any).companyUser = decoded;
            return next();
        }
        return res.status(403).json({ error: "Yetkisiz erişim." });
    } catch (error) {
        return res.status(401).json({ error: "Oturum süresi doldu veya geçersiz token." });
    }
};

app.get('/api/public/company-list', authMiddleware, (req, res) => {
    const db = readData();
    const companies = (db.companies || [])
        .filter((c: any) => Boolean(c.portalPassword && c.portalPassword.trim()))
        .map((c: any) => ({ id: c.id, name: c.name }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr-TR'));
    res.json({ success: true, companies });
});

app.post('/api/public/company-login', publicLoginLimiter, (req, res) => {
    const { companyId, companyName, password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Lütfen firma şifrenizi giriniz.' });
    }
    const db = readData();
    const companies = db.companies || [];
    const norm = (s: string) => (s || '').trim().toLocaleLowerCase('tr-TR');

    let company = null;
    if (companyId) {
        company = companies.find((c: any) => c.id === companyId);
    } else if (companyName) {
        company = companies.find((c: any) => norm(c.name) === norm(companyName));
    }

    if (!company) {
        return res.status(404).json({ error: 'Firma bulunamadı veya portal erişimi henüz tanımlanmamış.' });
    }

    if (!company.portalPassword || company.portalPassword.trim() !== password.trim()) {
        return res.status(401).json({ error: 'Hatalı şifre. Lütfen firma yetkilisi şifrenizi kontrol ediniz.' });
    }

    const token = jwt.sign(
        { role: 'company_viewer', companyId: company.id, companyName: company.name },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({
        success: true,
        token,
        company: { id: company.id, name: company.name }
    });
});

app.get('/api/public/company-results/:tc', companyAuthMiddleware, (req, res) => {
    const { tc } = req.params;
    if (!tc || !/^\d{11}$/.test(String(tc).trim())) {
        return res.status(400).json({ error: 'Geçerli bir 11 haneli T.C. Kimlik Numarası giriniz.' });
    }
    const cleanTc = String(tc).trim();
    const companyUser = (req as any).companyUser;
    const db = readData();
    const referrals = db.referrals || [];
    const institutions = db.institutions || [];

    const norm = (s: string) => (s || '').trim().toLocaleLowerCase('tr-TR');
    const userCompName = norm(companyUser?.companyName);

    if (companyUser?.role !== 'admin' && !userCompName) {
        return res.status(403).json({ error: 'Firma yetkisi doğrulanamadı.' });
    }

    // CRITICAL: Strict privacy enforcement - only records where employee company matches!
    const results = referrals
        .filter((r: any) => {
            if (String(r.employee?.tcNo || '').trim() !== cleanTc) return false;
            if (companyUser?.role === 'admin') return true;
            return norm(r.employee?.company) === userCompName;
        })
        .map((r: any) => formatReferralResult(r, institutions))
        .sort((a: any, b: any) => parseDateScore(b.date) - parseDateScore(a.date));

    res.json({ success: true, results, count: results.length });
});

app.get('/api/public/company-all-results', companyAuthMiddleware, (req, res) => {
    const companyUser = (req as any).companyUser;
    if (companyUser?.role !== 'admin') {
        return res.status(403).json({ error: 'Firma yetkilisi yalnızca TC Kimlik No ile sorgulama yapabilir.' });
    }
    const db = readData();
    const referrals = db.referrals || [];
    const institutions = db.institutions || [];

    const results = referrals
        .map((r: any) => formatReferralResult(r, institutions))
        .sort((a: any, b: any) => parseDateScore(b.date) - parseDateScore(a.date));

    res.json({ success: true, results, count: results.length });
});

function parseDateToIso(dStr?: string): string {
    if (!dStr) return new Date().toISOString();
    try {
        const parts = dStr.split(' ')[0].split('.');
        if (parts.length === 3) {
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const y = parseInt(parts[2], 10);
            const dt = new Date(y, m, d, 12, 0, 0);
            if (!isNaN(dt.getTime())) return dt.toISOString();
        }
    } catch (e) {}
    return new Date().toISOString();
}

app.get('/api/public/test-scrape/:instId', authMiddleware, async (req, res) => {
    const { instId } = req.params;
    if (isScraperActive) {
        return res.status(429).json({ error: 'Başka bir bot işlemi şu anda devam ediyor. Lütfen birkaç saniye sonra tekrar deneyin.' });
    }

    const db = readData();
    const inst = (db.institutions || []).find((i: any) => i.id === instId);
    if (!inst) return res.status(404).json({ error: 'Kurum bulunamadı' });
    if (!inst.portalType || inst.portalType === 'NONE') {
        return res.status(400).json({ error: 'Bu kurum için bot entegrasyonu aktif değil.' });
    }

    isScraperActive = true;
    try {
        const currentDb = readData();
        currentDb.referrals = currentDb.referrals || [];
        const pendingRefs = currentDb.referrals.filter((r: any) => 
            r.targetInstitutionId === instId && (r.status === 'AWAITING_RESULT' || r.status === 'PENDING' || !r.resultPdfPath)
        );
        const pendingTcs: string[] = Array.from(new Set(pendingRefs.map((r: any) => r.employee?.tcNo).filter(Boolean)));

        console.log(`[Test-Scrape] Starting scraper for ${inst.name} (${inst.portalType}). Target pending TCs: ${pendingTcs.length}`);
        let scrapedRecords: any[] = [];
        if (inst.portalType === 'VETA') {
            const { runVetaScraper } = require('./scrapers/index.ts');
            scrapedRecords = await runVetaScraper(inst.portalUrl, inst.portalUsername, inst.portalPassword, pendingTcs.length > 0 ? pendingTcs : undefined, 50);
        } else if (inst.portalType === 'INFOMED') {
            const { runInfomedScraper } = require('./scrapers/index.ts');
            scrapedRecords = await runInfomedScraper(inst.portalUrl, inst.portalUsername, inst.portalPassword, pendingTcs.length > 0 ? pendingTcs : undefined, 50);
        }
        let addedCount = 0;
        let updatedCount = 0;

        // Atomically re-read fresh data right before saving to prevent race condition / data loss
        const freshDb = readData();
        freshDb.referrals = freshDb.referrals || [];

        for (const rec of scrapedRecords) {
            let ref = freshDb.referrals.find((r: any) => r.employee?.tcNo === rec.tcNo && r.targetInstitutionId === instId);
            if (ref) {
                if (rec.pdfPath) {
                    ref.resultPdfPath = rec.pdfPath;
                    ref.status = 'COMPLETED';
                    ref.completedExams = ref.exams || [];
                    ref.pendingExams = [];
                } else {
                    ref.status = rec.status || 'AWAITING_RESULT';
                }
                ref.lastCheckedAt = new Date().toISOString();
                updatedCount++;
            } else if (rec.status && rec.tcNo) {
                const newId = Math.random().toString(36).substr(2, 9);
                const companyName = (rec.company && rec.company !== 'C1') 
                    ? rec.company 
                    : (inst.portalUsername === 'CANKAYA' ? 'ÇANKAYA OSGB' : inst.name);

                freshDb.referrals.push({
                    id: newId,
                    employee: {
                        id: Math.random().toString(36).substr(2, 9),
                        fullName: rec.fullName,
                        tcNo: rec.tcNo,
                        company: companyName
                    },
                    exams: ['Sağlık Tetkikleri'],
                    completedExams: rec.pdfPath ? ['Sağlık Tetkikleri'] : [],
                    pendingExams: rec.pdfPath ? [] : ['Sağlık Tetkikleri'],
                    status: rec.pdfPath ? 'COMPLETED' : 'AWAITING_RESULT',
                    referralDate: parseDateToIso(rec.date),
                    targetInstitutionId: instId,
                    resultPdfPath: rec.pdfPath || null,
                    isExternalRecord: true,
                    notes: rec.pdfPath 
                        ? 'Kurum portalından indirildi (Sonuç PDF Hazır)'
                        : 'Kurum portalından tespit edildi (Sonuç Bekleniyor)'
                });
                addedCount++;
            }
        }

        writeData(freshDb);
        console.log(`[Test-Scrape] Completed for ${inst.name}. Scraped: ${scrapedRecords.length}, Added: ${addedCount}, Updated: ${updatedCount}`);
        res.json({
            success: true,
            message: `${scrapedRecords.length} adet gerçek tetkik sonucu başarıyla çekildi. (${addedCount} yeni kayıt eklendi, ${updatedCount} kayıt güncellendi)`,
            count: scrapedRecords.length,
            results: scrapedRecords
        });
    } catch (e: any) {
        console.error(`[Test-Scrape] Error:`, e);
        res.status(500).json({ error: 'Bot çalışırken hata oluştu: ' + (e.message || e) });
    } finally {
        isScraperActive = false;
    }
});

// CRON JOB SETUP
const cron = require('node-cron');
cron.schedule('0 2 * * *', () => {
    // Delete files older than 30 days
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (require('fs').existsSync(pdfDir)) {
        require('fs').readdirSync(pdfDir).forEach(file => {
            const filePath = require('path').join(pdfDir, file);
            const stats = require('fs').statSync(filePath);
            if (now - stats.mtime.getTime() > thirtyDays) {
                require('fs').unlinkSync(filePath);
                console.log('Deleted old PDF:', file);
            }
        });
    }
});

cron.schedule('*/10 * * * *', async () => {
    if (isScraperActive) {
        console.log('[CRON] Scraper already active, skipping this 10-minute cycle.');
        return;
    }
    isScraperActive = true;
    console.log('[CRON] Running Scrapers (every 10 mins) for all active institutions...');
    try {
        const db = readData();
        const pendingReferrals = (db.referrals || []).filter((r: any) => r.status === 'AWAITING_RESULT' || r.status === 'PENDING' || !r.resultPdfPath);
        
        for (const inst of (db.institutions || [])) {
            if (!inst.portalType || inst.portalType === 'NONE') continue;
            const refs = pendingReferrals.filter((r: any) => r.targetInstitutionId === inst.id);
            const tcList = refs.map((r: any) => r.employee?.tcNo).filter(Boolean);
            
            let scrapedRecords: any[] = [];
            try {
                if (inst.portalType === 'VETA') {
                    const { runVetaScraper } = require('./scrapers/index.ts');
                    scrapedRecords = await runVetaScraper(inst.portalUrl, inst.portalUsername, inst.portalPassword, tcList.length > 0 ? tcList : undefined, 50);
                } else if (inst.portalType === 'INFOMED') {
                    const { runInfomedScraper } = require('./scrapers/index.ts');
                    scrapedRecords = await runInfomedScraper(inst.portalUrl, inst.portalUsername, inst.portalPassword, tcList.length > 0 ? tcList : undefined, 50);
                }
            } catch (err) {
                console.error(`[CRON] Error scraping ${inst.name}:`, err);
            }

            if (scrapedRecords.length > 0) {
                const freshDb = readData();
                freshDb.referrals = freshDb.referrals || [];
                let changed = false;
                scrapedRecords.forEach((rec: any) => {
                    const ref = freshDb.referrals.find((r: any) => r.employee?.tcNo === rec.tcNo && r.targetInstitutionId === inst.id);
                    if (ref) {
                        if (rec.pdfPath) {
                            ref.resultPdfPath = rec.pdfPath;
                            ref.status = 'COMPLETED';
                            ref.completedExams = ref.exams || [];
                            ref.pendingExams = [];
                        } else {
                            ref.status = rec.status || 'AWAITING_RESULT';
                        }
                        ref.lastCheckedAt = new Date().toISOString();
                        changed = true;
                    } else if (rec.status && rec.tcNo) {
                        const newId = Math.random().toString(36).substr(2, 9);
                        const companyName = (rec.company && rec.company !== 'C1') 
                            ? rec.company 
                            : (inst.portalUsername === 'CANKAYA' ? 'ÇANKAYA OSGB' : inst.name);

                        freshDb.referrals.push({
                            id: newId,
                            employee: {
                                id: Math.random().toString(36).substr(2, 9),
                                fullName: rec.fullName,
                                tcNo: rec.tcNo,
                                company: companyName
                            },
                            exams: ['Sağlık Tetkikleri'],
                            completedExams: rec.pdfPath ? ['Sağlık Tetkikleri'] : [],
                            pendingExams: rec.pdfPath ? [] : ['Sağlık Tetkikleri'],
                            status: rec.pdfPath ? 'COMPLETED' : 'AWAITING_RESULT',
                            referralDate: parseDateToIso(rec.date),
                            targetInstitutionId: inst.id,
                            resultPdfPath: rec.pdfPath || null,
                            isExternalRecord: true,
                            notes: rec.pdfPath 
                                ? 'Kurum portalından indirildi (Sonuç PDF Hazır)'
                                : 'Kurum portalından tespit edildi (Sonuç Bekleniyor)'
                        });
                        changed = true;
                    }
                });
                if (changed) writeData(freshDb);
            }
        }
    } finally {
        isScraperActive = false;
    }
});

  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), "dist", "index.html"));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  startTelegramScheduler();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

