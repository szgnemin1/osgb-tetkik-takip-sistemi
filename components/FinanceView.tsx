import React, { useState, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, Minus, FileText } from 'lucide-react';
import { SafeTransaction } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface FinanceViewProps {
  transactions: SafeTransaction[];
  onAddTransaction: (transaction: SafeTransaction) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ transactions, onAddTransaction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const balance = useMemo(() => {
    return transactions.reduce((acc, curr) => {
      return curr.type === 'INCOME' ? acc + curr.amount : acc - curr.amount;
    }, 0);
  }, [transactions]);

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTx: SafeTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: txType,
      amount: parseFloat(amount),
      description,
      date: new Date().toISOString()
    };
    onAddTransaction(newTx);
    setIsModalOpen(false);
    setAmount('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-medium">Toplam Kasa Bakiyesi</p>
            <h2 className="text-4xl font-bold text-white mt-2">₺{balance.toLocaleString('tr-TR')}</h2>
          </div>
          <div className="absolute right-4 top-4 opacity-10">
            <Wallet className="w-24 h-24 text-blue-500" />
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <TrendingUp className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">Toplam Tahsilat</p>
              <h3 className="text-2xl font-bold text-emerald-400">₺{totalIncome.toLocaleString('tr-TR')}</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">Toplam Çıkış</p>
              <h3 className="text-2xl font-bold text-red-400">₺{totalExpense.toLocaleString('tr-TR')}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
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

      {/* Transaction History */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">Son İşlemler</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-3">Tarih</th>
                <th className="px-6 py-3">Açıklama</th>
                <th className="px-6 py-3">Tür</th>
                <th className="px-6 py-3 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {transactions.slice().reverse().map(tx => (
                <tr key={tx.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {new Date(tx.date).toLocaleDateString('tr-TR')} {new Date(tx.date).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-medium">{tx.description}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${tx.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {tx.type === 'INCOME' ? 'Giriş' : 'Çıkış'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'} ₺{tx.amount.toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
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