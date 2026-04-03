import { useState, useRef, useCallback } from 'react';
import { uploadPDF } from '../api';

export default function UploadPanel() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadPDF(file, setProgress);
      setUploads((prev) => [
        {
          filename: result.filename,
          chunks: result.chunks_ingested,
          time: new Date().toLocaleTimeString(),
          id: Date.now(),
        },
        ...prev,
      ]);
      // Trigger stats refresh in Header
      window.dispatchEvent(new Event('stats-refresh'));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Section Title */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent-500/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-surface-50">Upload Documents</h2>
          <p className="text-xs text-surface-200/50">PDF files up to 50 MB</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3 rounded-xl
          border-2 border-dashed cursor-pointer transition-all duration-300
          py-10 px-6 group
          ${dragOver
            ? 'drop-active'
            : 'border-surface-700/60 hover:border-accent-500/40 hover:bg-accent-500/[0.03]'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {uploading ? (
          <>
            {/* Upload progress */}
            <div className="w-12 h-12 rounded-full border-3 border-surface-700 border-t-accent-500 animate-spin" />
            <p className="text-sm font-medium text-surface-100">Uploading & processing...</p>
            <div className="w-full max-w-[200px] h-1.5 rounded-full bg-surface-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-surface-200/50">{progress}%</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-surface-800/80 flex items-center justify-center group-hover:bg-accent-500/15 transition-colors duration-300">
              <svg className="w-6 h-6 text-surface-200/40 group-hover:text-accent-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-surface-100">
                Drop your PDF here
              </p>
              <p className="text-xs text-surface-200/40 mt-1">or click to browse</p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger-500/10 ring-1 ring-danger-500/25 animate-fade-in">
          <svg className="w-4 h-4 text-danger-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <p className="text-xs text-danger-400">{error}</p>
        </div>
      )}

      {/* Upload History */}
      {uploads.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
          <p className="text-xs font-semibold text-surface-200/40 uppercase tracking-wider">History</p>
          {uploads.map((u) => (
            <div
              key={u.id}
              className="glass rounded-lg px-4 py-3 flex items-center gap-3 animate-slide-up"
            >
              <div className="w-8 h-8 rounded-lg bg-success-500/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-100 truncate">{u.filename}</p>
                <p className="text-xs text-surface-200/50">{u.chunks} chunks &middot; {u.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
