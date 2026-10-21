/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import React, { useState } from 'react';
import { 
  Trash2,
  MapPin,
  Building2,
  FileText,
  CalendarDays,
  MessageSquare,
  Edit2,
  Printer,
  RefreshCw
} from 'lucide-react';
import { Referral, Status, MedicalInstitution } from '../types';
import { getApiToken } from '../services/useServerData';

interface ReferralListProps {
  referrals: Referral[];
  institutions?: MedicalInstitution[];
  onUpdateStatus?: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
  onEdit?: (referral: Referral) => void; // Düzenleme prop'u eklendi
  onPrint?: (referral: Referral) => void; // Yazdırma prop'u eklendi
  compact?: boolean;
  isAdmin?: boolean;
}

export const ReferralList: React.FC<ReferralListProps> = ({ 
  referrals, 
  institutions = [],
  onDelete,
  onEdit,
  onPrint,
  compact = false,
  isAdmin = false
}) => {
  const [loadingPdf, setLoadingPdf] = useState<string | null>(null);

  const handleViewPdf = async (rawUrl: string, name?: string, tc?: string) => {
    if (!rawUrl) return;
    const cleanUrl = rawUrl.split('?')[0];
    setLoadingPdf(rawUrl);
    try {
      const token = getApiToken();
      const res = await fetch(cleanUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        alert('PDF raporu yüklenemedi veya erişim yetkiniz bulunmuyor.');
        return;
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('PDF açma hatası:', err);
      alert('PDF raporu açılırken bir sorun oluştu.');
    } finally {
      setLoadingPdf(null);
    }
  };

  const getInstitutionName = (id?: string) => {
    if (!id) return null;
    return institutions.find(i => i.id === id)?.name || "Bilinmeyen Kurum";
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getPaymentBadge = (method: string) => {
      if (method === 'CASH') {
          return <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 rounded text-emerald-400 bg-emerald-500/10">Elden (Nakit)</span>;
      }
      if (method === 'POS') {
          return <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 rounded text-purple-400 bg-purple-500/10">Elden (Pos)</span>;
      }
      return <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 rounded text-blue-400 bg-blue-500/10">Fatura</span>;
  };

  if (referrals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
        <div className="p-4 bg-slate-800 rounded-full mb-3">
            <FileText className="w-8 h-8 opacity-50" />
        </div>
        <p className="font-medium">Kayıt bulunamadı.</p>
        <p className="text-xs mt-1">Arama kriterlerini değiştirin veya yeni sevk oluşturun.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 shadow-sm">
            <tr>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-1/4">Personel</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Firma & Kurum</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tarih</th>
              {!compact && <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Tetkikler</th>}
              {!compact && <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Not</th>}
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Tutar</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 bg-slate-800">
            {referrals.map((referral) => {
               const instName = getInstitutionName(referral.targetInstitutionId);
               return (
              <tr key={referral.id} className="hover:bg-slate-700/30 transition-colors group">
                {/* Personel */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg ${getAvatarColor(referral.employee?.fullName || '')}`}>
                        {getInitials(referral.employee?.fullName || '')}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200 text-sm">{referral.employee?.fullName || 'İsimsiz'}</span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-[11px] text-slate-500 font-mono tracking-wide">{referral.employee?.tcNo || '-'}</span>
                        {referral.isExternalRecord && (
                          <span 
                            className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            title="Bu hasta için sistemde sevk kaydı oluşturulmamıştı. Kurum portalından doğrudan çekilerek indirildi."
                          >
                            ⚠️ Sevk Kaydı Yok
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Firma & Kurum */}
                <td className="px-4 py-2.5">
                  <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-1.5">
                         <Building2 className="w-3.5 h-3.5 text-slate-500" />
                         <span className="text-sm text-slate-300 font-medium truncate max-w-[150px]" title={referral.employee?.company}>{referral.employee?.company || '-'}</span>
                      </div>
                      {!compact && (
                        <div className="flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-600" />
                            <span className={`text-xs truncate max-w-[150px] ${instName ? 'text-slate-400' : 'text-slate-600 italic'}`}>
                                {instName || 'Kurum Yok'}
                            </span>
                        </div>
                      )}
                  </div>
                </td>

                {/* Tarih */}
                <td className="px-4 py-2.5">
                    <div className="flex items-center space-x-2 text-slate-400">
                        <CalendarDays className="w-4 h-4 text-slate-600" />
                        <span className="text-xs font-medium">{new Date(referral.referralDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                </td>

                {/* Tetkikler (Full View Only) */}
                {!compact && (
                    <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {(referral.exams || []).map((exam, i) => (
                                <span 
                                    key={i} 
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700/60 text-slate-300 border border-slate-600/50"
                                >
                                    {exam}
                                </span>
                            ))}
                        </div>
                    </td>
                )}

                {/* Not (Full View Only) */}
                {!compact && (
                    <td className="px-4 py-2.5">
                        {referral.notes ? (
                            <div className="flex items-start space-x-1.5 group/note cursor-help" title={referral.notes}>
                                <MessageSquare className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                                <span className="text-xs text-slate-400 truncate max-w-[150px]">{referral.notes}</span>
                            </div>
                        ) : (
                            <span className="text-slate-600 text-xs">-</span>
                        )}
                    </td>
                )}

                {/* Tutar */}
                <td className="px-4 py-2.5 text-right">
                  <div className="flex flex-col items-end">
                    {referral.isExternalRecord ? (
                        <>
                          <span className="text-indigo-400 font-bold text-sm">-</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 rounded text-indigo-400 bg-indigo-500/10">DIŞARIDAN</span>
                        </>
                      ) : (
                        <>
                          <span className="text-white font-bold text-sm">₺{referral.totalPrice?.toLocaleString('tr-TR') || 0}</span>
                          {getPaymentBadge(referral.paymentMethod)}
                        </>
                      )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-2.5 text-right">
                   <div className="flex items-center justify-end space-x-1">
                      {referral.resultPdfPath && (
                         <button 
                            type="button"
                            onClick={() => handleViewPdf(referral.resultPdfPath!, referral.employee?.fullName, referral.employee?.tcNo)}
                            disabled={loadingPdf === referral.resultPdfPath}
                            className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 p-1.5 rounded-lg transition-all disabled:opacity-50"
                            title={referral.status === 'PARTIAL' ? 'Kısmi PDF Raporunu Aç' : 'Tamamlanan PDF Raporunu Aç'}
                         >
                            {loadingPdf === referral.resultPdfPath ? (
                              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4 text-emerald-400" />
                            )}
                         </button>
                      )}
                      {onPrint && !referral.isExternalRecord && (
                         <button 
                            onClick={() => onPrint(referral)}
                            className="text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Yazdır"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                      )}
                      {onEdit && !isAdmin && (
                         <button 
                            onClick={() => onEdit(referral)}
                            className="text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Düzenle"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {!isAdmin && (
                      <button 
                          onClick={() => onDelete(referral.id)}
                          className="text-slate-600 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Kaydı Sil"
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                      )}
                   </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
};
