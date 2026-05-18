/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import React, { useState } from 'react';
import { setApiToken } from '../services/useServerData';
import { Stethoscope, Loader2 } from 'lucide-react';

interface AuthProps {
  onAuthenticated: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${baseUrl}api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!res.ok) {
        throw new Error('Yanlış şifre');
      }

      const data = await res.json();
      setApiToken(data.token);
      
      // Save token temporarily in sessionStorage
      sessionStorage.setItem('api_token', data.token);

      onAuthenticated();
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 items-center justify-center p-4">
      <div className="p-8 bg-slate-900 rounded-lg shadow-xl shadow-blue-900/20 w-full max-w-sm border border-slate-800 text-center">
        <Stethoscope className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">OSGB Tetkik Takip</h2>
        <p className="text-sm text-slate-400 mb-6">Sisteme girmek için şifrenizi girin</p>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs text-left p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="password"
            required
            className="w-full bg-slate-800 border border-slate-700 text-white rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-500"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-3 rounded font-medium transition-colors"
          >
            {loading ? 'İşleniyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
};
