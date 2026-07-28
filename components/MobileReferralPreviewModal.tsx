/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { X, Download, Image, CheckCircle, Smartphone } from 'lucide-react';
import { Referral, MedicalInstitution, AppSettings } from '../types';

interface Props {
  referral: Referral;
  institution?: MedicalInstitution;
  settings: AppSettings;
  onClose: () => void;
}

export const MobileReferralPreviewModal: React.FC<Props> = ({ referral, institution, settings, onClose }) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownloadImage = async () => {
    if (!documentRef.current) return;
    setIsCapturing(true);
    try {
      // Ensure fonts and QR Code are fully drawn
      await new Promise((resolve) => setTimeout(resolve, 350));
      
      const dataUrl = await toPng(documentRef.current, {
        quality: 0.98,
        pixelRatio: 3, // High density for mobile galleries
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          borderRadius: '0px',
        }
      });
      
      const link = document.createElement('a');
      link.download = `sevk_${referral.employee.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to export as image:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div id="mobile-preview-modal" className="fixed inset-0 bg-slate-950/95 z-[100] flex flex-col justify-between overflow-y-auto md:hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-50 shadow-md">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-500/10 rounded-lg">
            <Smartphone className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Mobil Sevk Belgesi</h2>
            <p className="text-[10px] text-slate-400">Resim olarak kaydedip paylaşabilirsiniz</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
          title="Kapat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Document Stage */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[370px] bg-slate-900/50 p-2 rounded-2xl border border-slate-800 shadow-xl">
          
          {/* Visual Slip Wrapper for Capture */}
          <div 
            ref={documentRef}
            className="bg-white text-black w-full p-4 relative overflow-hidden flex flex-col select-none rounded-xl"
            style={{ minHeight: '520px', fontFamily: '"Inter", sans-serif' }}
          >
            {/* Background Watermark */}
            {settings.printBackgroundLogo && (
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none z-0">
                <img src={settings.printBackgroundLogo} alt="Watermark" className="w-[90%] h-[90%] object-contain" />
              </div>
            )}

            <div className="relative z-10 flex flex-col h-full flex-1 justify-between">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-6 gap-2 border-b border-gray-100 pb-4">
                <div className="flex-1">
                  <h3 className="text-sm font-black text-gray-900 leading-tight uppercase tracking-wider">
                    {institution?.name || 'Sağlık Kurumu'}
                  </h3>
                  <span className="text-[10px] text-gray-400 font-bold tracking-wide uppercase mt-1 block">SEVK BELGESİ</span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  {settings.companyLogo ? (
                    <img src={settings.companyLogo} alt="Logo" className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-[9px] text-gray-400 font-bold">
                      LOGO
                    </div>
                  )}
                </div>
              </div>

              {/* Patient and Company Information */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">AD SOYAD:</span>
                  <span className="font-bold text-gray-900 text-right uppercase">{referral.employee.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">T.C. KİMLİK:</span>
                  <span className="font-mono font-bold text-gray-900 text-right">{referral.employee.tcNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">FİRMA:</span>
                  <span className="font-bold text-gray-950 text-right uppercase truncate max-w-[200px]" title={referral.employee.company}>
                    {referral.employee.company}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">TARİH:</span>
                  <span className="font-bold text-gray-900 text-right">
                    {new Date(referral.referralDate).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>

              {/* Exams list */}
              <div className="mb-4 flex-1">
                <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2 border-b border-gray-200 pb-1">İstenen Tetkikler</h4>
                <ul className="grid grid-cols-2 gap-1 text-[11px] font-bold text-gray-800 list-inside list-disc pl-1">
                  {referral.exams.map((exam, index) => (
                    <li key={index} className="truncate" title={exam}>{exam}</li>
                  ))}
                </ul>

                {referral.notes && referral.notesShow !== false && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <h5 className="text-[9px] uppercase font-bold text-gray-400 mb-1">Sevk Notu</h5>
                    <p className="text-[11px] text-gray-600 bg-gray-50/50 p-2 rounded border border-gray-100 italic whitespace-pre-wrap">
                      {referral.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Institution Details & QR Code */}
              {institution && (
                <div className="mt-auto pt-3 border-t border-gray-200 flex items-end justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Ulaşım & İletişim</span>
                    <p className="text-[11px] font-bold text-gray-800 truncate">{institution.name}</p>
                    {institution.phone && <p className="text-[10px] text-gray-600 font-medium mt-0.5">Tel: {institution.phone}</p>}
                    {institution.address && <p className="text-[9px] text-gray-500 truncate mt-0.5" title={institution.address}>{institution.address}</p>}
                  </div>
                  {institution.locationUrl && (
                    <div className="flex flex-col items-center shrink-0 ml-2">
                      <QRCodeSVG value={institution.locationUrl} size={54} level="M" />
                      <span className="text-[8px] text-gray-400 mt-1 font-bold text-center">Konum QR</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          <p className="text-[11px] text-center text-slate-400 mt-2.5 italic">
            💡 İpucu: Resmi galeriye kaydetmek için aşağıdaki butona basın veya direkt ekran görüntüsü (screenshot) alın.
          </p>
        </div>
      </div>

      {/* Sticky Bottom Bar with Actions */}
      <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-2 z-50">
        <button
          onClick={handleDownloadImage}
          disabled={isCapturing}
          className={`w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95 ${
            copied ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
          }`}
        >
          {isCapturing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              <span>GÖRÜNTÜ OLUŞTURULUYOR...</span>
            </>
          ) : copied ? (
            <>
              <CheckCircle className="w-4 h-4 text-white" />
              <span>GALERİYE KAYDEDİLDİ!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>RESMİ GALERİYE KAYDET (PNG)</span>
            </>
          )}
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-xl transition-all active:scale-95"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};
