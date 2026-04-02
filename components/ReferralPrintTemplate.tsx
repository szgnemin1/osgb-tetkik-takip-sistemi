import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Referral, MedicalInstitution, AppSettings } from '../types';

interface Props {
  referral: Referral;
  institution?: MedicalInstitution;
  settings: AppSettings;
}

export const ReferralPrintTemplate: React.FC<Props> = ({ referral, institution, settings }) => {
  const pageSize = settings.printPageSize || 'A4';

  return (
    <div className="hidden print:block bg-white text-black w-full relative min-h-screen">
      <style type="text/css">
        {`
          @media print {
            @page {
              size: ${pageSize};
              margin: 10mm;
            }
          }
        `}
      </style>
      
      {/* Background Watermark */}
      {settings.printBackgroundLogo && (
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-0 overflow-hidden">
          <img src={settings.printBackgroundLogo} alt="Watermark" className="w-[95%] h-[95%] object-contain" />
        </div>
      )}

      <div className="w-full mx-auto p-2 bg-transparent flex flex-col relative z-10">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8 gap-4">
          
          {/* Top Left: Kurum Adı */}
          <div className="flex-1 flex flex-col items-start">
            <h1 className="text-xl font-bold text-gray-900 leading-snug">
              {institution?.name || 'Kurum Belirtilmedi'}
            </h1>
          </div>

          {/* Top Right: Logo, Firma Adı, Kişi Bilgileri, Tarih */}
          <div className="flex-1 text-right flex flex-col items-end">
            {settings.companyLogo ? (
              <img src={settings.companyLogo} alt="Logo" className="w-32 h-32 object-contain mb-4" />
            ) : (
              <div className="w-32 h-32 bg-gray-100 flex items-center justify-center rounded font-bold text-gray-400 text-sm text-center border border-gray-300 mb-4">
                LOGO
              </div>
            )}
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide mb-2 leading-snug">
              FİRMA ADI: {referral.employee.company}
            </h2>
            <div className="text-sm text-gray-800 flex flex-col items-end space-y-1">
              <p className="font-bold text-base">AD SOYAD: {referral.employee.fullName}</p>
              <div className="flex flex-wrap items-center justify-end gap-x-2 text-gray-700 mt-1 text-xs sm:text-sm">
                <p className="whitespace-nowrap">TC: {referral.employee.tcNo}</p>
                <span className="text-gray-400 hidden sm:inline">|</span>
                <p className="whitespace-nowrap">Tarih: {new Date(referral.referralDate).toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Tetkikler Section */}
        <div className="mb-4">
          <h3 className="text-sm font-bold border-b-2 border-gray-800 pb-1 mb-3 uppercase">İstenen Tetkikler</h3>
          <ul className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm pl-1 text-gray-800 font-medium list-inside list-disc">
            {referral.exams.map((exam, index) => (
              <li key={index}>{exam}</li>
            ))}
          </ul>
          
          {referral.notes && (
            <div className="mt-6">
              <h3 className="text-xs font-bold text-gray-900 mb-1.5">Sevk Notu:</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap italic p-2.5 bg-gray-50 border border-gray-200 rounded">{referral.notes}</p>
            </div>
          )}
        </div>

        {/* Kurum İletişim ve Ulaşım Bilgileri */}
        {institution && (institution.address || institution.locationUrl) && (
          <div className="mt-8 pt-4 border-t-2 border-gray-800 flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase">Kurum İletişim ve Ulaşım</h3>
              <p className="text-sm font-bold text-gray-800 mb-1">{institution.name}</p>
              {institution.phone && <p className="text-xs text-gray-700 mb-1">Tel: {institution.phone}</p>}
              {institution.address && <p className="text-xs text-gray-700 whitespace-pre-wrap">{institution.address}</p>}
            </div>
            {institution.locationUrl && (
              <div className="flex flex-col items-center ml-4">
                <QRCodeSVG value={institution.locationUrl} size={80} level="M" />
                <span className="text-[10px] text-gray-500 mt-1 text-center">Konum için<br/>okutunuz</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
