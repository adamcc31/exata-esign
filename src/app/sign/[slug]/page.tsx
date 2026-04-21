'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SigningCanvas } from '@/components/SigningCanvas';

type SlugStatus = 'loading' | 'invalid' | 'expired' | 'signed' | 'pending' | 'verify' | 'preview' | 'success';

export default function SignPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [status, setStatus] = useState<SlugStatus>('loading');
  const [firstName, setFirstName] = useState('');
  const [clientData, setClientData] = useState<any>(null);
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  // Initial slug check on mount
  useEffect(() => {
    checkSlug();
  }, [slug]);

  const checkSlug = async () => {
    try {
      const res = await fetch(`/api/sign/${slug}`);
      const data = await res.json();
      setFirstName(data.firstName || '');

      switch (data.status) {
        case 'invalid': setStatus('invalid'); break;
        case 'expired': setStatus('expired'); break;
        case 'signed': setStatus('signed'); break;
        case 'pending': setStatus('verify'); break;
        default: setStatus('invalid');
      }
    } catch {
      setStatus('invalid');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/sign/${slug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setClientData(data.clientData);
      setStatus('preview');
    } catch (err: any) {
      setError(err.message || 'Verifikasi gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (base64Sign: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/sign/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureImageBase64: base64Sign }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus('success');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim tanda tangan');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/sign/${slug}/download`);
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    } catch {
      alert('Gagal mengunduh dokumen.');
    }
  };

  const loadPdf = async () => {
    setLoadingPdf(true);
    try {
      const res = await fetch(`/api/sign/${slug}/preview`);
      const data = await res.json();
      if (data.url) {
        setPdfUrl(data.url);
        setShowPdf(true);
      }
    } catch {
      alert('Gagal memuat PDF.');
    } finally {
      setLoadingPdf(false);
    }
  };

  // === RENDER STATES ===

  // Loading
  if (status === 'loading') {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
        </div>
      </PageWrapper>
    );
  }

  // Invalid
  if (status === 'invalid') {
    return (
      <PageWrapper>
        <StatusCard icon="link_off" title="Link Tidak Valid" color="error">
          <p className="font-body text-sm text-outline">Link yang Anda akses tidak ditemukan atau tidak valid.</p>
          <p className="font-body text-xs text-outline/60 mt-4">Jika Anda merasa ini adalah kesalahan, silakan hubungi PT. Sumber Rezeki Exata Indonesia.</p>
        </StatusCard>
      </PageWrapper>
    );
  }

  // Expired
  if (status === 'expired') {
    return (
      <PageWrapper>
        <StatusCard icon="timer_off" title="Link Kedaluwarsa" color="warning">
          <p className="font-body text-sm text-outline">
            Halo {firstName}, link penandatanganan Anda sudah melewati batas waktu.
          </p>
          <div className="mt-4 bg-secondary-fixed/30 border border-secondary/20 rounded-DEFAULT p-4">
            <p className="font-body text-xs text-on-secondary-fixed">
              Silakan hubungi PT. Sumber Rezeki Exata Indonesia untuk mendapatkan link baru.
            </p>
          </div>
        </StatusCard>
      </PageWrapper>
    );
  }

  // Already Signed
  if (status === 'signed') {
    return (
      <PageWrapper>
        <StatusCard icon="verified" title="Dokumen Sudah Ditandatangani" color="success">
          <p className="font-body text-sm text-outline">
            Halo {firstName}, dokumen Anda sudah berhasil ditandatangani sebelumnya.
          </p>
          <button onClick={handleDownload} className="btn-primary mt-5 w-full">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Unduh Dokumen
          </button>
        </StatusCard>
      </PageWrapper>
    );
  }

  // Success (just signed)
  if (status === 'success') {
    return (
      <PageWrapper>
        <StatusCard icon="celebration" title="Terima Kasih!" color="success">
          <p className="font-body text-sm text-outline mb-5">
            Dokumen Anda telah berhasil ditandatangani secara digital. Anda dapat mengunduh salinan dokumen di bawah ini.
          </p>
          <button onClick={handleDownload} className="btn-primary w-full">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Unduh Dokumen
          </button>
          <p className="font-body text-xs text-outline/50 mt-4 text-center">
            Anda juga dapat menghubungi PT. Sumber Rezeki Exata Indonesia untuk salinan dokumen.
          </p>
        </StatusCard>
      </PageWrapper>
    );
  }

  // Birth date verification
  if (status === 'verify') {
    return (
      <PageWrapper>
        <div className="w-full max-w-md mx-auto animate-slide-up">
          <div className="card p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-lg bg-primary-fixed flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-on-primary-fixed-variant text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
              </div>
              <h1 className="font-headline text-xl font-bold text-on-surface">Verifikasi Identitas</h1>
              <p className="font-body text-sm text-outline mt-1">
                Halo {firstName}, masukkan tanggal lahir Anda untuk membuka dokumen.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="label">Tanggal Lahir</label>
                <input
                  type="date"
                  required
                  className="input text-center text-lg"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={loading}
                  id="verify-birthdate"
                />
              </div>

              {error && (
                <div className="bg-error-container border border-error/20 rounded-DEFAULT px-4 py-3 text-on-error-container text-sm font-body flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
                id="verify-submit"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Memeriksa...
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">lock_open</span>
                    Buka Dokumen
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Document preview + signing
  if (status === 'preview' && clientData) {
    return (
      <PageWrapper>
        <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
          {/* Client Data Summary */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-headline text-base font-bold text-on-surface">Data Anda</h2>
              <p className="font-body text-xs text-outline mt-0.5">No. Surat: {clientData.letterNumber}</p>
            </div>
            <div className="card-body">
              <div className="bg-surface-container-low rounded-DEFAULT p-5 space-y-3 text-sm font-body">
                <div className="flex"><span className="w-40 text-outline font-medium shrink-0">Nama Lengkap</span><span className="text-on-surface">: {clientData.fullName}</span></div>
                <div className="flex"><span className="w-40 text-outline font-medium shrink-0">Tanggal Lahir</span><span className="text-on-surface">: {clientData.birthDate}</span></div>
                <div className="flex"><span className="w-40 text-outline font-medium shrink-0">No. KTP / NIK</span><span className="text-on-surface font-mono">: {clientData.nik}</span></div>
                <div className="flex"><span className="w-40 text-outline font-medium shrink-0">Alamat Sesuai KTP</span><span className="text-on-surface">: {clientData.address}</span></div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-secondary-fixed/30 border border-secondary/20 rounded-DEFAULT p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <div>
                <p className="font-body text-sm text-on-secondary-fixed font-semibold mb-1">Perhatian</p>
                <p className="font-body text-xs text-on-secondary-fixed/80">
                  Silakan baca dokumen PDF dengan seksama sebelum menandatangani. 
                  Dengan menandatangani, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan yang berlaku.
                </p>
              </div>
            </div>
          </div>

          {/* PDF View Section */}
          <div className="card border border-error/30">
            <div className="p-5 bg-error-container/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-error/10">
              <div>
                <h2 className="font-headline text-base font-bold text-on-error-container flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                  PRATINJAU DOKUMEN (WAJIB)
                </h2>
                <p className="font-body text-xs text-on-error-container/70 mt-1">Anda diwajibkan untuk membaca dokumen sebelum menandatangani.</p>
              </div>
              {!showPdf && (
                <button
                  onClick={loadPdf}
                  disabled={loadingPdf}
                  className="bg-error hover:bg-error/90 text-on-error px-5 py-3 rounded-DEFAULT text-sm font-semibold font-body transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
                >
                  {loadingPdf ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Memuat...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                      Lihat Dokumen PDF
                    </>
                  )}
                </button>
              )}
            </div>
            
            {showPdf && pdfUrl && (
              <div>
                <iframe
                  src={pdfUrl}
                  className="w-full"
                  style={{ height: '600px' }}
                  title="Preview Surat Pernyataan"
                />
                
                <div className="p-5 bg-surface-container-low border-t border-surface-variant/50">
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 transition-shadow"
                        checked={hasAgreed}
                        onChange={(e) => setHasAgreed(e.target.checked)}
                      />
                    </div>
                    <div>
                      <span className="font-body text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                        Saya sudah membaca, memahami, dan menyetujui isi dan maksud dari dokumen Surat Pernyataan ini.
                      </span>
                      <p className="font-body text-outline text-xs mt-1">
                        Klik centang kotak ini untuk melanjutkan ke tahap penandatanganan.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Signature Canvas */}
          {hasAgreed && (
            <div className="card card-body animate-slide-up">
              <h3 className="font-headline text-base font-bold text-on-surface mb-4">Tanda Tangan Digital</h3>
              <SigningCanvas onSignComplete={handleSign} disabled={loading} />
              {error && (
                <div className="mt-3 bg-error-container border border-error/20 rounded-DEFAULT px-4 py-3 text-on-error-container text-sm font-body flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}
              {loading && (
                <div className="mt-3 flex items-center justify-center gap-2 text-outline text-sm font-body">
                  <span className="material-symbols-outlined text-[18px] animate-spin text-primary">progress_activity</span>
                  Memproses tanda tangan Anda...
                </div>
              )}
            </div>
          )}
        </div>
      </PageWrapper>
    );
  }

  return null;
}

// Wrapper with EXATA branding for public pages
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface-container-lowest border-b border-surface-variant/50 px-6 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-DEFAULT bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-on-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
          </div>
          <div>
            <p className="font-headline text-sm font-bold text-on-surface">EXATA — Speed Nenkin 20%</p>
            <p className="font-body text-xs text-outline">Penandatanganan Digital</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-variant/50 px-6 py-5 text-center">
        <p className="font-body text-xs text-outline/50">
          © {new Date().getFullYear()} PT. Sumber Rezeki Exata Indonesia. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function StatusCard({ icon, title, color, children }: { icon: string; title: string; color: string; children: React.ReactNode }) {
  const colorMap: Record<string, { border: string; iconBg: string; iconColor: string }> = {
    error: {
      border: 'border-t-4 border-t-error',
      iconBg: 'bg-error-container',
      iconColor: 'text-on-error-container',
    },
    warning: {
      border: 'border-t-4 border-t-secondary',
      iconBg: 'bg-secondary-fixed',
      iconColor: 'text-on-secondary-fixed-variant',
    },
    success: {
      border: 'border-t-4 border-t-tertiary',
      iconBg: 'bg-tertiary-fixed',
      iconColor: 'text-on-tertiary-fixed-variant',
    },
  };

  const scheme = colorMap[color] || colorMap.error;

  return (
    <div className={`card p-8 text-center ${scheme.border} max-w-md mx-auto animate-scale-in`}>
      <div className={`w-16 h-16 rounded-full ${scheme.iconBg} flex items-center justify-center mx-auto mb-5`}>
        <span className={`material-symbols-outlined text-[32px] ${scheme.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
      </div>
      <h2 className="font-headline text-xl font-bold text-on-surface mb-3">{title}</h2>
      {children}
    </div>
  );
}
