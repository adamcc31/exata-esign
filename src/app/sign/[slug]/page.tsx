'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SigningCanvas } from '@/components/SigningCanvas';

type SlugStatus = 'loading' | 'invalid' | 'expired' | 'signed' | 'pending' | 'verify' | 'fill-data' | 'preview' | 'success';

interface ClientData {
  id: string;
  fullName: string;
  birthDate: string;
  nik: string;
  address: string;
  city: string;
  email?: string;
  letterNumber: string;
  signingDate?: string;  // Current date (WIB) for display
}

// Helper: generate current date in WIB formatted as "22 April 2026"
function getCurrentDateWIB(): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export default function SignPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [status, setStatus] = useState<SlugStatus>('loading');
  const [firstName, setFirstName] = useState('');
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  // Additional data form state (for when NIK/address/city are missing)
  const [additionalNik, setAdditionalNik] = useState('');
  const [additionalAddress, setAdditionalAddress] = useState('');
  const [additionalCity, setAdditionalCity] = useState('');
  const [additionalEmail, setAdditionalEmail] = useState('');
  const [needsAdditionalData, setNeedsAdditionalData] = useState(false);

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

      // Attach current date (WIB) for display purposes
      const enrichedData = { ...data.clientData, signingDate: getCurrentDateWIB() };
      setClientData(enrichedData);
      setNeedsAdditionalData(data.needsAdditionalData || false);

      if (data.needsAdditionalData) {
        // Pre-fill with whatever data we have from DB
        setAdditionalNik(data.clientData.nik || '');
        setAdditionalAddress(data.clientData.address || '');
        setAdditionalCity(data.clientData.city || '');
        setAdditionalEmail(data.clientData.email || '');
        setStatus('fill-data');
      } else {
        setStatus('preview');
      }
    } catch (err: any) {
      setError(err.message || 'Verifikasi gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleAdditionalDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation (backend re-validates)
    if (!additionalNik || !/^\d{16}$/.test(additionalNik)) {
      setError('NIK harus terdiri dari 16 digit angka.');
      return;
    }
    if (!additionalAddress.trim()) {
      setError('Alamat Sesuai KTP wajib diisi.');
      return;
    }
    if (!additionalCity.trim()) {
      setError('Kota wajib diisi.');
      return;
    }
    if (!additionalEmail.trim() || !/^\S+@\S+\.\S+$/.test(additionalEmail)) {
      setError('Alamat email valid wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      // Save data and regenerate blank PDF with date
      const res = await fetch(`/api/sign/${slug}/update-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: additionalNik,
          address: additionalAddress.trim(),
          city: additionalCity.trim(),
          email: additionalEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update clientData with the verified response + current date
      setClientData(data.clientData);
      
      setStatus('preview');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (base64Sign: string) => {
    setLoading(true);
    setError('');

    try {
      // Build payload — include additional data if it was filled by the client
      const payload: any = { signatureImageBase64: base64Sign };
      if (needsAdditionalData) {
        payload.nik = additionalNik;
        payload.address = additionalAddress.trim();
        payload.city = additionalCity.trim();
        payload.email = additionalEmail.trim();
      }

      const res = await fetch(`/api/sign/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        <StatusCard icon="mark_email_read" title="Penandatanganan Berhasil!" color="primary">
          <p className="font-body text-sm text-outline mb-4">
            Terima kasih, dokumen Anda telah berhasil ditandatangani dan disimpan secara aman.
          </p>
          <div className="bg-primary-container/30 border border-primary/20 rounded-DEFAULT p-4 text-left">
            <p className="font-body text-xs text-on-primary-container flex items-center gap-2 mb-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
              Salinan PDF Terkirim
            </p>
            <p className="font-body text-xs text-outline leading-relaxed">
              Salinan resmi Surat Pernyataan Anda telah dikirimkan ke email: <strong className="text-on-surface">{clientData?.email || additionalEmail}</strong>. Silakan periksa kotak masuk (atau folder spam) Anda.
            </p>
          </div>
        </StatusCard>
      </PageWrapper>
    );
  }

  // Success (just signed)
  if (status === 'success') {
    return (
      <PageWrapper>
        <StatusCard icon="celebration" title="Terima Kasih!" color="success">
          <p className="font-body text-sm text-outline mb-4">
            Dokumen Anda telah berhasil ditandatangani secara digital. Salinan resmi Surat Pernyataan Anda telah dikirimkan ke alamat email Anda.
          </p>
          <div className="bg-primary-container/30 border border-primary/20 rounded-DEFAULT p-4 text-left">
            <p className="font-body text-xs text-on-primary-container flex items-center gap-2 mb-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
              Salinan PDF Terkirim
            </p>
            <p className="font-body text-xs text-outline leading-relaxed">
              Email dikirim ke: <strong className="text-on-surface">{clientData?.email || additionalEmail}</strong>. Silakan periksa kotak masuk (atau folder spam) Anda.
            </p>
          </div>
          <p className="font-body text-xs text-outline/50 mt-5 text-center">
            Anda dapat menutup halaman ini sekarang.
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
          {/* Step indicator */}
          <StepIndicator currentStep={1} totalSteps={needsAdditionalData ? 4 : 3} />

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

  // Fill additional data (NIK, Alamat, Kota) — NEW STEP
  if (status === 'fill-data') {
    return (
      <PageWrapper>
        <div className="w-full max-w-md mx-auto animate-slide-up">
          <StepIndicator currentStep={2} totalSteps={4} />

          <div className="card p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-lg bg-tertiary-fixed flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  edit_note
                </span>
              </div>
              <h1 className="font-headline text-xl font-bold text-on-surface">Lengkapi Data Anda</h1>
              <p className="font-body text-sm text-outline mt-1">
                Mohon lengkapi data berikut sebelum menandatangani dokumen.
              </p>
            </div>

            <form onSubmit={handleAdditionalDataSubmit} className="space-y-5">
              {/* NIK */}
              {!clientData?.nik && (
                <div>
                  <label className="label" htmlFor="fill-nik">
                    No. KTP / NIK <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    id="fill-nik"
                    required
                    maxLength={16}
                    pattern="\d{16}"
                    inputMode="numeric"
                    className="input font-mono tracking-wider"
                    placeholder="Masukkan 16 digit NIK"
                    value={additionalNik}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                      setAdditionalNik(val);
                    }}
                  />
                  <p className="font-body text-xs text-outline mt-1.5">
                    {additionalNik.length}/16 digit
                  </p>
                </div>
              )}

              {/* Alamat */}
              {!clientData?.address && (
                <div>
                  <label className="label" htmlFor="fill-address">
                    Alamat Sesuai KTP <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="fill-address"
                    required
                    rows={3}
                    className="input resize-none"
                    placeholder="Masukkan alamat lengkap sesuai KTP"
                    value={additionalAddress}
                    onChange={(e) => setAdditionalAddress(e.target.value)}
                  />
                </div>
              )}

              {/* Kota */}
              {!clientData?.city && (
                <div>
                  <label className="label" htmlFor="fill-city">
                    Kota <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    id="fill-city"
                    required
                    className="input"
                    placeholder="Contoh: Jakarta, Surabaya, Bandung"
                    value={additionalCity}
                    onChange={(e) => setAdditionalCity(e.target.value)}
                  />
                </div>
              )}

              {/* Email */}
              {!clientData?.email && (
                <div>
                  <label className="label" htmlFor="fill-email">
                    Alamat Email (Pengiriman PDF) <span className="text-error">*</span>
                  </label>
                  <input
                    type="email"
                    id="fill-email"
                    required
                    className="input"
                    placeholder="Contoh: budi@gmail.com"
                    value={additionalEmail}
                    onChange={(e) => setAdditionalEmail(e.target.value)}
                  />
                  <p className="font-body text-[11px] text-outline mt-1.5">
                    Salinan PDF yang telah ditandatangani akan dikirim ke email ini.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-error-container border border-error/20 rounded-DEFAULT px-4 py-3 text-on-error-container text-sm font-body flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              <div className="bg-secondary-fixed/30 border border-secondary/20 rounded-DEFAULT p-4">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                  <p className="font-body text-xs text-on-secondary-fixed/80">
                    Pastikan data yang Anda isi sesuai dengan KTP Anda. Data ini akan digunakan dalam dokumen resmi.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                id="fill-data-submit"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                Lanjutkan
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
          {/* Step indicator */}
          <StepIndicator currentStep={needsAdditionalData ? 3 : 2} totalSteps={needsAdditionalData ? 4 : 3} />

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
                <div className="flex"><span className="w-40 text-outline font-medium shrink-0">No. KTP / NIK</span><span className="text-on-surface font-mono">: {clientData.nik || '—'}</span></div>
                <div className="flex"><span className="w-40 text-outline font-medium shrink-0">Alamat Sesuai KTP</span><span className="text-on-surface">: {clientData.address || '—'}</span></div>
                <div className="flex"><span className="w-40 text-outline font-medium shrink-0">Kota</span><span className="text-on-surface">: {clientData.city || '—'}</span></div>
                <div className="flex"><span className="w-40 text-outline font-medium shrink-0">Email Tujuan</span><span className="text-on-surface font-medium text-primary">: {clientData.email || '—'}</span></div>
                <div className="flex"><span className="w-40 text-outline font-medium shrink-0">Tanggal</span><span className="text-on-surface">: {clientData.signingDate || getCurrentDateWIB()}</span></div>
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
                  Tanggal pada dokumen akan otomatis terisi saat Anda menandatangani.
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
                <div className="bg-primary/5 border-b border-primary/10 p-3 flex items-center justify-between gap-4">
                  <p className="font-body text-xs text-on-surface-variant">
                    Jika dokumen terpotong atau tidak bisa di-scroll (khusus pengguna iPhone/Safari), silakan buka layar penuh.
                  </p>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary py-1.5 px-3 text-xs shrink-0 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Buka Layar Penuh
                  </a>
                </div>
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

// ═══════════════════════════════════════════════════════
// Step Indicator Component
// ═══════════════════════════════════════════════════════
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const stepLabels = totalSteps === 4
    ? ['Verifikasi', 'Lengkapi Data', 'Pratinjau', 'Tanda Tangan']
    : ['Verifikasi', 'Pratinjau', 'Tanda Tangan'];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-center gap-1.5">
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div className={`h-0.5 w-8 sm:w-12 rounded-full transition-colors ${isCompleted ? 'bg-primary' : 'bg-surface-variant'}`} />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-body transition-all ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm scale-110'
                    : isCompleted
                      ? 'bg-primary/20 text-primary'
                      : 'bg-surface-container text-outline'
                }`}>
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : stepNum}
                </div>
                <span className={`text-[10px] font-body font-medium hidden sm:block ${
                  isActive ? 'text-primary' : isCompleted ? 'text-primary/60' : 'text-outline/60'
                }`}>
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
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
