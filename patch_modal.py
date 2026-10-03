import re

with open('components/AdminAuthModal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace states
code = code.replace("const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');", "const [step, setStep] = useState<'REQUEST' | 'VERIFY' | 'FALLBACK'>('REQUEST');\n  const [fallbackPassword, setFallbackPassword] = useState('');")

# Replace requestOTP logic
old_request = r'''      if (!res.ok) throw new Error(data.error || 'Şifre gönderilemedi.');
      setStep('VERIFY');'''
new_request = r'''      if (!res.ok) throw new Error(data.error || 'Şifre gönderilemedi.');
      if (data.fallback) {
          setStep('FALLBACK');
          setError('WhatsApp bağlı olmadığı için OTP gönderilemedi. Güvenlik için ana sistem şifrenizi girin.');
      } else {
          setStep('VERIFY');
      }'''
code = code.replace(old_request, new_request)

# Insert verifyFallback method
verify_fallback = r'''  const verifyFallback = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(${baseUrl}api/admin/verify-fallback, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': Bearer 
        },
        body: JSON.stringify({ password: fallbackPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hatalı şifre.');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };'''

code = code.replace("  const verifyOTP", verify_fallback + "\n\n  const verifyOTP")

# Add Lock import
code = code.replace("KeyRound, Loader2, Send }", "KeyRound, Loader2, Send, Lock }")

# Insert UI for Fallback
old_ui = r'''        ) : (
          <form onSubmit={verifyOTP} className="space-y-4">'''
new_ui = r'''        ) : step === 'FALLBACK' ? (
          <form onSubmit={verifyFallback} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ana Sistem Şifresi</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={fallbackPassword}
                  onChange={(e) => setFallbackPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Şifrenizi girin..."
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !fallbackPassword}
              className="w-full flex items-center justify-center py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Giriş Yap'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
              Vazgeç
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOTP} className="space-y-4">'''

code = code.replace(old_ui, new_ui)

with open('components/AdminAuthModal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
