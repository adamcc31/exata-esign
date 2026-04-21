'use client';

import React, { useState, useCallback } from 'react';

interface Props {
  onSuccess?: () => void;
}

export const BatchUploadForm = ({ onSuccess }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.xlsx')) {
      alert('Format file harus .xlsx');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5 MB.');
      return;
    }
    setFile(f);
    setResult(null);
    setErrors([]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setErrors([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/batches/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else alert(data.error || 'Upload gagal');
      } else {
        setResult(data);
        onSuccess?.();
      }
    } catch {
      alert('Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-body">
      <h3 className="font-headline text-base font-bold text-on-surface mb-5">Upload File Excel</h3>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-DEFAULT p-10 text-center transition-all duration-300 ${
          dragOver ? 'border-primary bg-primary-fixed/20' : 'border-outline-variant hover:border-outline'
        }`}
      >
        <span className="material-symbols-outlined text-[40px] text-outline/40 mb-3 block">
          {file ? 'description' : 'cloud_upload'}
        </span>
        {file ? (
          <div>
            <p className="font-body text-sm font-medium text-on-surface">{file.name}</p>
            <p className="font-body text-xs text-outline mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="font-body text-sm text-on-surface-variant">Drag & drop file .xlsx di sini</p>
            <p className="font-body text-xs text-outline mt-1">atau</p>
          </div>
        )}
        <label className="inline-block mt-4 cursor-pointer">
          <input type="file" accept=".xlsx" onChange={(e) => e.target.files && handleFile(e.target.files[0])} className="hidden" />
          <span className="btn-secondary btn-sm">
            <span className="material-symbols-outlined text-[16px]">folder_open</span>
            Pilih File
          </span>
        </label>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="mt-5 bg-error-container/50 border border-error/20 rounded-DEFAULT p-5 max-h-48 overflow-y-auto">
          <p className="font-body text-sm font-semibold text-on-error-container mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            Validasi Gagal — {errors.length} error:
          </p>
          <ul className="space-y-1.5">
            {errors.map((err: any, i: number) => (
              <li key={i} className="font-body text-xs text-on-error-container/80">
                <span className="font-mono font-medium">Baris {err.row}</span> — {err.column}: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="mt-5 bg-tertiary-fixed/30 border border-tertiary/20 rounded-DEFAULT p-5">
          <p className="font-body text-sm font-semibold text-on-tertiary-fixed flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Upload Berhasil
          </p>
          <p className="font-body text-xs text-on-tertiary-fixed/80 mt-1">Batch ID: {result.batchId} — {result.recordsProcessed} klien diproses.</p>
        </div>
      )}

      {/* Upload button */}
      <div className="mt-5 flex justify-end">
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="btn-primary"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              Memproses...
            </span>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Upload & Proses
            </>
          )}
        </button>
      </div>
    </div>
  );
};
