/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import React, { useState, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, Minus, FileText, Trash2 } from 'lucide-react';
import { SafeTransaction } from '../types';

interface FinanceViewProps {
  transactions: SafeTransaction[];
  onAddTransaction: (transaction: SafeTransaction) => void;
  onResetSafe?: () => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ transactions, onAddTransaction, onResetSafe }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'POS' | 'INVOICE'>('CASH');
  const [tableFilter, setTableFilter] = useState<'ALL' | 'CASH_ONLY' | 'POS_ONLY'>('ALL');

  const balance = useMemo(() => {
    return transactions.reduce((acc, curr) => {
      // Sadece Nakit girişleri ve tüm çıkışları (giderleri) hesapla (POS kesinlikle nakit kasaya girmez)
      if (curr.type === 'INCOME') {
        return (curr.paymentMethod === 'CASH' || !curr.paymentMethod) ? acc + curr.amount : acc;
      }
      return acc - curr.amount;
    }, 0);
  }, [transactions]);

  const totalCashIncome = transactions.filter(t => t.type === 'INCOME' && (t.paymentMethod === 'CASH' || !t.paymentMethod)).reduce((acc, curr) => acc + curr.amount, 0);
  const totalPosIncome = transactions.filter(t => t.type === 'INCOME' && t.paymentMethod === 'POS').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (tableFilter === 'CASH_ONLY') {
        return tx.type === 'EXPENSE' || (tx.type === 'INCOME' && (tx.paymentMethod === 'CASH' || !tx.paymentMethod));
      }
      if (tableFilter === 'POS_ONLY') {
        return tx.type === 'INCOME' && tx.paymentMethod === 'POS';
      }
      return true;
    });
  }, [transactions, tableFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTx: SafeTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: txType,
      amount: parseFloat(amount),
      description,
      date: new Date().toISOString(),
      paymentMethod: txType === 'INCOME' ? paymentMethod : undefined
    };
    onAddTransaction(newTx);
    setIsModalOpen(false);
    setAmount('');
    setDescription('');
    setPaymentMethod('CASH');
  };

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-emerald-500/30 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-400 text-sm font-bold">💵 Net Nakit Kasa Bakiyesi (Çekmece)</p>
            <h2 className="text-4xl font-bold text-white mt-2">₺{balance.toLocaleString('tr-TR')}</h2>
            <p className="text-[11px] text-slate-400 mt-1.5">Sadece elden nakit giriş-çıkışlarıdır. POS ödemeleri buraya dahil edilmez.</p>
          </div>
          <div className="absolute right-4 top-4 opacity-10">
            <Wallet className="w-24 h-24 text-emerald-500" />
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm font-medium">Nakit Kasa Özeti</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Elden Nakit Giriş:</span>
                  <span className="text-sm font-bold text-emerald-400">+ ₺{totalCashIncome.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Nakit Çıkış (Gider):</span>
                  <span className="text-sm font-bold text-red-400">- ₺{totalExpense.toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-purple-500/30 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="text-purple-300 text-sm font-bold">💳 Banka (POS) Tahsilatı (Ayrı)</p>
              <h3 className="text-2xl font-bold text-purple-400 mt-1">₺{totalPosIncome.toLocaleString('tr-TR')}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Bankaya yatan POS çekimleri (Nakit kasaya karışmaz)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        {onResetSafe && (
            <button 
                onClick={() => onResetSafe()}
                className="flex items-center space-x-2 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-2 rounded transition-colors"
                title="Tüm kasa hareketlerini siler ve bakiyeyi sıfırlar."
            >
                <Trash2 className="w-4 h-4" />
                <span>Kasayı Sıfırla</span>
            </button>
        )}
        <div className="flex space-x-3 ml-auto">
            <button 
            onClick={() => { setTxType('EXPENSE'); setIsModalOpen(true); }}
            className="flex items-center space-x-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 px-4 py-2 rounded-lg border border-red-600/20 transition-all"
            >
            <Minus className="w-4 h-4" />
            <span>Para Çıkışı Ekle</span>
            </button>
            <button 
            onClick={() => { setTxType('INCOME'); setIsModalOpen(true); }}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg shadow-emerald-900/20 transition-all"
            >
            <Plus className="w-4 h-4" />
            <span>Tahsilat Ekle</span>
            </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-bold text-white">Son İşlemler</h3>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setTableFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                tableFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              Tümü ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setTableFilter('CASH_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                tableFilter === 'CASH_ONLY' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-emerald-400 hover:bg-slate-700 border border-emerald-500/30'
              }`}
            >
              💵 Sadece Nakit Kasa
            </button>
            <button
              type="button"
              onClick={() => setTableFilter('POS_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                tableFilter === 'POS_ONLY' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-purple-400 hover:bg-slate-700 border border-purple-500/30'
              }`}
            >
              💳 Sadece POS (Banka)
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">Tarih</th>
                <th className="px-6 py-3">Açıklama</th>
                <th className="px-6 py-3">Tür</th>
                <th className="px-6 py-3">İşlendiği Yer / Ödeme</th>
                <th className="px-6 py-3 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredTransactions.slice().reverse().map(tx => {
                const isPos = tx.type === 'INCOME' && tx.paymentMethod === 'POS';
                return (
                <tr key={tx.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {new Date(tx.date).toLocaleDateString('tr-TR')} {new Date(tx.date).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{tx.description}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${
                      tx.type === 'EXPENSE'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : isPos
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {tx.type === 'INCOME' ? (isPos ? 'Banka Girişi (POS)' : 'Nakit Giriş') : 'Nakit Çıkış'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {tx.type === 'INCOME' ? (
                      isPos ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          💳 Banka / POS (Nakit Kasaya İşlemez)
                        </span>
                      ) : tx.paymentMethod === 'INVOICE' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          📄 Fatura / Havale
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          💵 Nakit Kasa (Çekmece)
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30">
                        💸 Nakit Kasadan Çıkış
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${
                    tx.type === 'EXPENSE' ? 'text-red-400' : isPos ? 'text-purple-400' : 'text-emerald-400'
                  }`}>
                    {tx.type === 'INCOME' ? '+' : '-'} ₺{tx.amount.toLocaleString('tr-TR')}
                  </td>
                </tr>
              );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    Kasa hareketi bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/50">
              <h3 className="text-lg font-bold text-white">
                {txType === 'INCOME' ? 'Tahsilat Ekle' : 'Ödeme/Gider Ekle'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tutar (TL)</label>
                <input 
                  autoFocus
                  required
                  type="number" 
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Açıklama</label>
                <input 
                  required
                  type="text" 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="İşlem açıklaması..."
                />
              </div>
              {txType === 'INCOME' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Ödeme Yöntemi</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="CASH">Nakit</option>
                    <option value="POS">POS / Kredi Kartı</option>
                    <option value="INVOICE">Fatura / Havale</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button 
                  type="submit"
                  className={`px-6 py-2 text-white font-medium rounded-lg shadow-lg transition-all ${txType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};