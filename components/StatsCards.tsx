import React from 'react';
import { Users, Calendar, Wallet } from 'lucide-react';
import { Stats } from '../types';

interface StatsCardsProps {
  stats: Stats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Toplam Personel / Sevk */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm hover:shadow-md hover:border-slate-600 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Toplam Sevk</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="mt-4 text-xs text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 inline-block px-2 py-1 rounded">
          Tüm Kayıtlar
        </div>
      </div>

      {/* Bugünkü Sevkler */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm hover:shadow-md hover:border-slate-600 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Bugünkü Sevkler</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.today}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Calendar className="w-6 h-6 text-indigo-500" />
          </div>
        </div>
        <div className="mt-4 text-xs text-indigo-400 font-medium bg-indigo-500/10 border border-indigo-500/20 inline-block px-2 py-1 rounded">
          Bugün Oluşturulanlar
        </div>
      </div>

      {/* Toplam Gelir (Kasa) */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm hover:shadow-md hover:border-slate-600 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Toplam Kasa Geliri</p>
            <p className="text-3xl font-bold text-white mt-1">₺{stats.totalIncome.toLocaleString('tr-TR')}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Wallet className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
        <div className="mt-4 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 inline-block px-2 py-1 rounded">
          Tüm Tahsilatlar
        </div>
      </div>
    </div>
  );
};