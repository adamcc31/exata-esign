'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params.id as string;
  const { data: session } = useSession();
  const [batch, setBatch] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [picFilter, setPicFilter] = useState('');

  const role = (session?.user as any)?.role;
  const userName = (session?.user as any)?.name || '';

  useEffect(() => { fetchDetail(); }, [batchId]);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/batches/${batchId}`);
      const data = await res.json();
      setBatch(data.batch);
      setClients(data.clients || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Extract unique PIC names for the filter dropdown
  const picNames = useMemo(() => {
    const names = new Set<string>();
    clients.forEach(c => { if (c.pic_name) names.add(c.pic_name); });
    return Array.from(names).sort();
  }, [clients]);

  // Filter clients based on role and PIC filter
  const filteredClients = useMemo(() => {
    let list = clients;

    // Staff users can only see their own PIC data
    if (role === 'staff') {
      list = list.filter(c =>
        c.pic_name && c.pic_name.toLowerCase() === userName.toLowerCase()
      );
    }

    // Super admin PIC dropdown filter
    if (role === 'super_admin' && picFilter) {
      list = list.filter(c => c.pic_name === picFilter);
    }

    return list;
  }, [clients, role, userName, picFilter]);

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/sign/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadPdf = async (clientId: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/pdf`);
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    } catch (err) { alert('Gagal mengunduh PDF.'); }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'signed': return (
        <span className="badge-signed">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          Ditandatangani
        </span>
      );
      case 'expired': return (
        <span className="badge-expired">
          <span className="material-symbols-outlined text-[14px]">cancel</span>
          Kedaluwarsa
        </span>
      );
      default: return (
        <span className="badge-pending">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          Menunggu
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-outline">
          <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
          <span className="font-body text-sm">Memuat...</span>
        </div>
      </div>
    );
  }

  const signedCount = filteredClients.filter(c => c.status === 'signed').length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <a href="/dashboard/batches" className="text-primary font-body text-sm hover:opacity-80 transition-opacity mb-3 inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Kembali ke Batch
        </a>
        <h1 className="font-headline text-[2rem] font-bold text-on-surface">{batch?.batch_name}</h1>
        <div className="flex items-center gap-4 mt-2 font-body text-sm text-outline">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            {batch && new Date(batch.uploaded_at).toLocaleDateString('id-ID')}
          </span>
          <span className="text-outline-variant">•</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">group</span>
            {filteredClients.length} Klien
          </span>
          <span className="text-outline-variant">•</span>
          <span className="flex items-center gap-1 text-tertiary font-medium">
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
            {signedCount} Sudah TTD
          </span>
        </div>
      </div>

      {/* Clients Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-headline text-base font-bold text-on-surface">Daftar Klien</h2>

          {/* PIC Filter — Super Admin only */}
          {role === 'super_admin' && picNames.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-outline font-body">Filter PIC:</label>
              <div className="relative">
                <select
                  className="input py-2 px-3 text-sm w-48 appearance-none pr-8"
                  value={picFilter}
                  onChange={e => setPicFilter(e.target.value)}
                >
                  <option value="">Semua PIC</option>
                  {picNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>NIK</th>
                <th>Tanggal Lahir</th>
                <th>PIC</th>
                <th>Status</th>
                <th>TTD</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10">
                  <span className="material-symbols-outlined text-[40px] text-outline/30 mb-2 block">person_off</span>
                  <span className="font-body text-sm text-outline">Tidak ada data klien.</span>
                </td></tr>
              ) : filteredClients.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-medium font-body">{c.full_name}</td>
                  <td className="text-xs font-mono text-on-surface-variant">{c.nik}</td>
                  <td className="text-xs font-body text-on-surface-variant">{c.birth_date_str}</td>
                  <td className="text-xs font-body text-on-surface-variant">{c.pic_name || '-'}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td className="text-xs font-body text-outline">
                    {c.signed_at ? new Date(c.signed_at).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {c.status === 'pending' && (
                        <button
                          onClick={() => copyLink(c.slug)}
                          className={`btn-ghost btn-sm font-body ${copied === c.slug ? 'text-tertiary' : 'text-primary'}`}
                          title="Salin Link"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {copied === c.slug ? 'check' : 'content_copy'}
                          </span>
                          {copied === c.slug ? 'Tersalin' : 'Salin Link'}
                        </button>
                      )}
                      {c.status === 'signed' && (
                        <button
                          onClick={() => downloadPdf(c.id)}
                          className="btn-ghost btn-sm text-tertiary font-body"
                          title="Download PDF"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                          Download PDF
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
