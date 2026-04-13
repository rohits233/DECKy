'use client';

import { useState, useRef } from 'react';
import type { Document } from '@/types';

interface FileUploadProps {
  projectId: string;
  documents: Document[];
  onRefresh: () => void;
}

type UploadingFile = {
  name: string;
  kind: 'document' | 'video';
  status: 'uploading' | 'transcribing' | 'done' | 'error';
  error?: string;
};

const DOC_ACCEPT = '.pdf,.doc,.docx,.txt';
const VID_ACCEPT = '.mp4,.mov,.webm,.m4a,.mp3,.wav';
const isDoc = (f: File) => /\.(pdf|doc|docx|txt)$/i.test(f.name);
const isVid = (f: File) => /\.(mp4|mov|webm|m4a|mp3|wav)$/i.test(f.name);

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === 'pending')
    return <span className="text-[10px] text-white/25 font-medium uppercase tracking-wide">pending</span>;
  if (status === 'processing')
    return <span className="text-[10px] text-amber-400 font-medium uppercase tracking-wide animate-pulse">processing</span>;
  if (status === 'ready')
    return <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wide">ready</span>;
  if (status === 'failed')
    return <span className="text-[10px] text-red-400 font-medium uppercase tracking-wide">failed</span>;
  return null;
}

export default function FileUpload({ projectId, documents, onRefresh }: FileUploadProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const docRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  const setStatus = (name: string, patch: Partial<UploadingFile>) =>
    setUploading(prev => prev.map(u => (u.name === name ? { ...u, ...patch } : u)));

  const uploadDoc = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('projectId', projectId);
    const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || 'Upload failed');
    }
  };

  const uploadVideo = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('projectId', projectId);
    const res = await fetch('/api/videos/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || 'Video upload failed');
    }
  };

  const processFiles = async (files: File[]) => {
    for (const file of files) {
      const kind = isDoc(file) ? 'document' : isVid(file) ? 'video' : null;
      if (!kind) continue;

      setUploading(prev => [...prev, { name: file.name, kind, status: 'uploading' }]);

      try {
        if (kind === 'document') {
          await uploadDoc(file);
        } else {
          setStatus(file.name, { status: 'transcribing' });
          await uploadVideo(file);
        }
        setStatus(file.name, { status: 'done' });
        onRefresh();
        setTimeout(() => {
          setUploading(prev => prev.filter(u => !(u.name === file.name && u.status === 'done')));
        }, 2000);
      } catch (err: any) {
        setStatus(file.name, { status: 'error', error: err.message });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const deleteDoc = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition-all ${
          dragging
            ? 'border-emerald-500/50 bg-emerald-500/[0.05]'
            : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'
        }`}
      >
        <p className="text-[13px] text-white/40 mb-3">Drop files here or choose a type</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => docRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-[12px] text-white/60 hover:bg-white/[0.09] hover:text-white transition"
          >
            📄 <span>Document</span>
          </button>
          <button
            onClick={() => vidRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-[12px] text-white/60 hover:bg-white/[0.09] hover:text-white transition"
          >
            🎥 <span>Video</span>
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-3">PDF · DOCX · TXT · MP4 · MOV · MP3 · WAV</p>

        <input
          ref={docRef}
          type="file"
          className="hidden"
          accept={DOC_ACCEPT}
          multiple
          onChange={e => e.target.files && processFiles(Array.from(e.target.files))}
        />
        <input
          ref={vidRef}
          type="file"
          className="hidden"
          accept={VID_ACCEPT}
          onChange={e => e.target.files && processFiles(Array.from(e.target.files))}
        />
      </div>

      {/* In-progress uploads */}
      {uploading.map((u, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg"
        >
          <span className="text-sm flex-shrink-0">{u.kind === 'video' ? '🎥' : '📄'}</span>
          <span className="flex-1 text-[12px] text-white/60 truncate">{u.name}</span>
          {u.status === 'uploading' && (
            <span className="text-[11px] text-blue-400 animate-pulse flex-shrink-0">Uploading…</span>
          )}
          {u.status === 'transcribing' && (
            <span className="text-[11px] text-amber-400 animate-pulse flex-shrink-0">Transcribing…</span>
          )}
          {u.status === 'done' && (
            <span className="text-[11px] text-emerald-400 flex-shrink-0">Done ✓</span>
          )}
          {u.status === 'error' && (
            <span className="text-[11px] text-red-400 flex-shrink-0" title={u.error}>Failed</span>
          )}
        </div>
      ))}

      {/* Uploaded files list */}
      {documents.length > 0 && (
        <div className="space-y-1 max-h-44 overflow-y-auto">
          {documents.map(d => (
            <div
              key={d.id}
              className="group flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.02] border border-white/[0.05] rounded-lg hover:bg-white/[0.04] transition"
            >
              <span className="text-sm flex-shrink-0">
                {d.type === 'transcript' ? '🎤' : '📄'}
              </span>
              <span className="flex-1 text-[12px] text-white/65 truncate">{d.filename}</span>
              <StatusBadge status={d.status} />
              <button
                onClick={() => deleteDoc(d.id)}
                className="opacity-0 group-hover:opacity-100 ml-1 text-white/25 hover:text-red-400 transition text-lg leading-none flex-shrink-0"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
