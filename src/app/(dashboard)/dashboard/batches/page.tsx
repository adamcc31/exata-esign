'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { BatchUploadForm } from '@/components/BatchUploadForm';
import * as xlsx from 'xlsx';

export default function BatchesPage() {
  const { data: session } = useSession();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  useEffect(() => { fetchBatches(); }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/batches');
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('Hapus batch ini beserta semua data klien? Aksi ini tidak dapat dibatalkan.')) return;
    try {
      const res = await fetch(`/api/batches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBatches(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) { console.error(err); }
  };

  const handleExport = async (id: string) => {
    try {
      const res = await fetch(`/api/batches/${id}/export`);
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    } catch (err) { alert('Gagal mengunduh file.'); }
  };

  const handleSaveRename = async (id: string) => {
    if (!editName.trim()) return setEditingBatchId(null);
    try {
      const res = await fetch(`/api/batches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_name: editName })
      });
      if (res.ok) {
        setBatches(prev => prev.map(b => b.id === id ? { ...b, batch_name: editName } : b));
      } else {
        alert('Gagal mengubah nama batch.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal mengubah nama batch.');
    } finally {
      setEditingBatchId(null);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = xlsx.utils.aoa_to_sheet([
      [
        'Nama Lengkap',
        'Tanggal Lahir',
        'PIC',
      ],
      [
        'Budi Santoso',
        '31/12/1990',
        'Admin Exata',
      ]
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Template');
    xlsx.writeFile(wb, 'Template_Speed_Nenkin.xlsx');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline text-[2rem] font-bold text-on-surface">Batch Upload</h1>
          <p className="font-body text-sm text-outline mt-1">
            {role === 'super_admin' ? 'Kelola semua batch' : 'Kelola batch Anda'}
          </p>
        </div>
          <div className="flex gap-3">
            <button onClick={handleDownloadTemplate} className="btn-secondary">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Download Template
            </button>
            <button onClick={() => setShowUpload(!showUpload)} className="btn-primary">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Upload Batch Baru
            </button>
          </div>
      </div>

      {showUpload && (
        <div className="mb-8 animate-slide-up">
          <BatchUploadForm onSuccess={() => { setShowUpload(false); fetchBatches(); }} />
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nama Batch</th>
                <th>Diupload Oleh</th>
                <th>Klien</th>
                <th>TTD</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-outline">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                    <span className="font-body text-sm">Memuat...</span>
                  </div>
                </td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10">
                  <span className="material-symbols-outlined text-[40px] text-outline/30 mb-2 block">folder_open</span>
                  <span className="font-body text-sm text-outline">Belum ada batch. Klik &quot;Upload Batch Baru&quot; untuk mulai.</span>
                </td></tr>
              ) : batches.map((b: any) => (
                <tr key={b.id}>
                  <td>
                    {editingBatchId === b.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="input py-1.5 px-3 text-sm"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveRename(b.id);
                            if (e.key === 'Escape') setEditingBatchId(null);
                          }}
                        />
                        <button onClick={() => handleSaveRename(b.id)} className="text-tertiary hover:text-tertiary-container text-xs font-medium font-body">Simpan</button>
                        <button onClick={() => setEditingBatchId(null)} className="text-outline hover:text-on-surface text-xs font-body">Batal</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        <a href={`/dashboard/batches/${b.id}`} className="text-primary font-medium font-body hover:opacity-80 transition-opacity">
                          {b.batch_name}
                        </a>
                        {(role === 'super_admin' || b.uploaded_by === userId) && (
                          <button
                            onClick={() => {
                              setEditingBatchId(b.id);
                              setEditName(b.batch_name);
                            }}
                            className="text-outline hover:text-primary transition-all"
                            title="Ubah Nama"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="font-body text-on-surface-variant">{b.uploader_name || '-'}</td>
                  <td className="font-body">{b.total_clients}</td>
                  <td><span className="badge-signed">{b.signed_count}/{b.total_clients}</span></td>
                  <td className="font-body text-xs text-outline">{new Date(b.uploaded_at).toLocaleDateString('id-ID')}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleExport(b.id)} className="text-outline hover:text-primary p-2 rounded-full hover:bg-surface-container transition-all" title="Download Excel">
                        <span className="material-symbols-outlined text-[15px]">download</span>
                      </button>
                      {role === 'super_admin' && (
                        <button onClick={() => handleDeleteBatch(b.id)} className="text-outline hover:text-error p-2 rounded-full hover:bg-error-container/30 transition-all" title="Hapus">
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
