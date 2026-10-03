import React, { useState } from 'react';
import { Shield, KeyRound, Loader2, Send } from 'lucide-react';

interface AdminAuthModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  apiToken: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ onSuccess, onCancel, apiToken }) => {
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOTP = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(baseUrl + 'api/admin/request-otp', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiToken
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sifre gonderilemedi.');
      setStep('VERIFY');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(baseUrl + 'api/admin/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiToken
        },
        body: JSON.stringify({ otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hatali sifre.');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-blue-500/10 rounded-full mb-3">
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-white text-center">Yonetici Dogrulamasi</h2>
          <p className="text-xs text-slate-400 text-center mt-2">
            Bu alana erismek icin sisteme bagli olan WhatsApp hesabina gonderilecek tek kullanimlik sifreyi (OTP) girmelisiniz.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {step === 'REQUEST' ? (
          <div className="space-y-4">
            <button
              onClick={requestOTP}
              disabled={loading}
              className="w-full flex items-center justify-center py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <div className="flex items-center"><Send className="w-4 h-4 mr-2" /> Sifre Gonder</div>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
              Iptal
            </button>
          </div>
        ) : (
          <form onSubmit={verifyOTP} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Gelen Sifre (6 Hane)</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white text-center text-xl tracking-[0.5em] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="------"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full flex items-center justify-center py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Dogrula ve Giris Yap'}
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
              Vazgec
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
