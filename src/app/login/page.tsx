'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Email atau password salah.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-inverse-surface p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-primary-container mb-5 shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-on-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-inverse-on-surface">Speed Nenkin 20%</h1>
          <p className="font-body text-inverse-on-surface/50 text-sm mt-1">Digital Signature Platform — EXATA</p>
        </div>

        {/* Card */}
        <div className="bg-white/8 backdrop-blur-xl rounded-lg border border-white/10 p-8 shadow-2xl">
          <h2 className="font-headline text-lg font-bold text-inverse-on-surface mb-6">Masuk ke Dashboard</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-body text-sm font-medium text-inverse-on-surface/70 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-DEFAULT border border-white/10 bg-white/5 px-4 py-3 text-inverse-on-surface placeholder:text-inverse-on-surface/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body text-sm"
                placeholder="admin@exata.co.id"
                id="login-email"
              />
            </div>
            <div>
              <label className="block font-body text-sm font-medium text-inverse-on-surface/70 mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-DEFAULT border border-white/10 bg-white/5 px-4 py-3 text-inverse-on-surface placeholder:text-inverse-on-surface/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-body text-sm"
                placeholder="••••••••"
                id="login-password"
              />
            </div>

            {error && (
              <div className="bg-error/15 border border-error/20 rounded-DEFAULT px-4 py-3 text-error-container text-sm font-body flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-DEFAULT bg-gradient-to-r from-primary to-primary-container px-4 py-3.5 text-on-primary font-semibold font-body hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50 shadow-lg shadow-primary/25"
              id="login-submit"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                  Memproses...
                </span>
              ) : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-inverse-on-surface/25 text-xs mt-8 font-body">
          PT. Sumber Rezeki Exata Indonesia © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
