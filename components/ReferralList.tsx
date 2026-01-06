import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Trash2,
  Sparkles,
  MapPin,
  Building2
} from 'lucide-react';
import { Referral, Status, MedicalInstitution } from '../types';
import { analyzeResults } from '../services/geminiService';

interface ReferralListProps {
  referrals: Referral[];
  institutions?: MedicalInstitution[];
  onUpdateStatus: (id: string, status: Status) => void;
  onAnalyze: (id: string, result: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export const ReferralList: React.FC<ReferralListProps> = ({ 
  referrals, 
  institutions = [],
  onUpdateStatus, 
  onAnalyze,
  onDelete,
  compact = false 
}) => {
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const handleAIAnalysis = async (referral: Referral) => {
    setAnalyzingId(referral.id);
    try {
      const result = await analyzeResults(referral);
      onAnalyze(referral.id, result);
    } catch (e) {
      alert("Analiz sırasında bir hata oluştu.");
    } finally {
      setAnalyzingId(null);
    }
  };

  const getInstitutionName = (id?: string) => {
    if (!id) return null;
    return institutions.find(i => i.id === id)?.name || "Bilinmeyen Kurum";
  };

  if (referrals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-800 rounded-xl border border-dashed border-slate-700">
        <FileText className="w-12 h-12 mb-2 opacity-50" />
        <p>Henüz kayıt bulunmamaktadır.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-700">
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Personel</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Firma</th>
              {!compact && <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Kurum</th>}
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tarih</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tetkikler</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Tutar</th>
              {!compact && <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">İşlemler</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {referrals.map((referral) => {
               const instName = getInstitutionName(referral.targetInstitutionId);
               return (
              <tr key={referral.id} className="hover:bg-slate-700/30 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-white text-sm whitespace-nowrap">{referral.employee.fullName}</span>
                    <span className="text-xs text-slate-500 font-mono">{referral.employee.tcNo}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                     <Building2 className="w-3 h-3 text-slate-500" />
                     <span className="text-sm text-slate-300 whitespace-nowrap">{referral.employee.company}</span>
                  </div>
                </td>
                {!compact && (
                  <td className="px-4 py-3">
                    {instName ? (
                      <div className="flex items-center space-x-2 text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20 w-fit whitespace-nowrap">
                         <MapPin className="w-3 h-3" />
                         <span className="text-xs font-medium">{instName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 italic">Kurum Seçilmedi</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-400 whitespace-nowrap">
                    {new Date(referral.referralDate).toLocaleDateString('tr-TR')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 min-w-[150px]">
                    {referral.exams.slice(0, compact ? 2 : 3).map((exam, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300 border border-slate-600 whitespace-nowrap">
                        {exam}
                      </span>
                    ))}
                    {referral.exams.length > (compact ? 2 : 3) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-400">
                        +{referral.exams.length - (compact ? 2 : 3)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-emerald-400 font-medium text-sm">₺{referral.totalPrice?.toLocaleString('tr-TR') || 0}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${referral.paymentMethod === 'CASH' ? 'text-emerald-300 bg-emerald-500/10' : 'text-blue-300 bg-blue-500/10'}`}>
                      {referral.paymentMethod === 'CASH' ? 'Nakit' : 'Cari'}
                    </span>
                  </div>
                </td>
                {!compact && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                       {/* AI Analysis Button */}
                       {!referral.aiAnalysis && (
                         <button 
                            onClick={() => handleAIAnalysis(referral)}
                            disabled={analyzingId === referral.id}
                            className="text-indigo-400 hover:bg-indigo-500/10 p-2 rounded-lg transition-colors flex items-center space-x-1"
                            title="AI ile Sonuçları Yorumla"
                         >
                            {analyzingId === referral.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                         </button>
                       )}
                       
                       {referral.aiAnalysis && (
                          <div className="relative group/tooltip">
                            <span className="text-indigo-400 cursor-help bg-indigo-500/10 px-2 py-1 rounded text-xs border border-indigo-500/30">
                              AI Raporu
                            </span>
                            <div className="absolute right-0 bottom-full mb-2 w-64 bg-slate-900 border border-slate-700 text-slate-300 text-xs p-3 rounded shadow-xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50">
                              {referral.aiAnalysis}
                            </div>
                          </div>
                       )}
                      
                      <button 
                        onClick={() => onDelete(referral.id)}
                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
};