import React, { useCallback, useRef, useState } from 'react';
import {
  FilePlus2,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  RotateCw,
  Sparkles,
  Trash2,
  UploadCloud,
  Download,
  Megaphone,
} from 'lucide-react';
import {
  COMPRESSION_OPTIONS,
  MARGIN_OPTIONS,
  PAGE_SIZE_OPTIONS,
  type PageItem,
  type PdfSettings,
} from './types/pdf';
import { formatBytes, generatePdf } from './utils/pdfGenerator';

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 800, height: 600 });
    img.src = url;
  });
}

export function App() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [settings, setSettings] = useState<PdfSettings>({
    pageSize: 'a4',
    orientation: 'portrait',
    margin: 'small',
    compression: 'balanced',
    filename: 'scrawny-document.pdf',
  });

  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<{ size: number; count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const validFiles = Array.from(fileList).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    if (validFiles.length === 0) return;

    const newItems: PageItem[] = await Promise.all(
      validFiles.map(async (file) => {
        const isPdf = file.type === 'application/pdf';
        const previewUrl = isPdf ? '' : URL.createObjectURL(file);
        const dims = isPdf ? { width: 595, height: 842 } : await readImageDimensions(previewUrl);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl,
          width: dims.width,
          height: dims.height,
          rotation: 0,
          isPdf,
        };
      })
    );

    setPages((prev) => [...prev, ...newItems]);
    setLastResult(null);
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    if (draggedIndex !== null) return; // Ignore internal card reorder drops
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleCardDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleCardDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setPages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(draggedIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const rotatePage = (id: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, rotation: ((p.rotation + 90) % 360) as 0 | 90 | 180 | 270 } : p
      )
    );
  };

  const removePage = (id: string) => {
    setPages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearAll = () => {
    pages.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPages([]);
    setLastResult(null);
  };

  const handleGenerate = async () => {
    if (pages.length === 0 || isGenerating) return;
    setIsGenerating(true);
    try {
      const { bytes, size } = await generatePdf(pages, settings);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = settings.filename.trim() || 'scrawny-document.pdf';
      a.download = cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastResult({ size, count: pages.length });
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Bar */}
      <header className="h-14 shrink-0 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              ScrawnyPDF
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              แปลงรูปและไฟล์เป็น PDF • จัดลำดับหน้า &amp; บีบอัดในเบราว์เซอร์
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {pages.length > 0 && (
            <>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {pages.length} หน้า
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer border border-slate-700"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                เพิ่มไฟล์
              </button>
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition cursor-pointer border border-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ล้างทั้งหมด
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content: Left Grid + Right Settings */}
      <main className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT PANEL: Dropzone + Scrollable Draggable Grid */}
        <section
          className={`flex-1 min-w-0 flex flex-col relative transition-colors ${
            isDraggingFiles ? 'bg-indigo-950/30' : 'bg-slate-950'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggedIndex === null) setIsDraggingFiles(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget === e.target) setIsDraggingFiles(false);
          }}
          onDrop={handleFileDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {pages.length === 0 ? (
            /* Empty State Dropzone */
            <div className="flex-1 flex items-center justify-center p-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-xl border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDraggingFiles
                    ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                    : 'border-slate-700/80 bg-slate-900/40 hover:border-indigo-500/60 hover:bg-slate-900/70'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mb-5">
                  <UploadCloud className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-1.5">
                  ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </h2>
                <p className="text-sm text-slate-400 max-w-md">
                  รองรับไฟล์รูปภาพ (JPG, PNG, WebP, GIF, BMP) และไฟล์ PDF สามารถลากการ์ดเพื่อสลับลำดับหน้าได้
                </p>
                <div className="mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/25 transition">
                  เลือกไฟล์จากเครื่อง
                </div>
              </div>
            </div>
          ) : (
            /* Scrollable Page Grid */
            <div className="flex-1 overflow-y-auto grid-scroll p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 pb-6">
                {pages.map((page, index) => {
                  const isBeingDragged = draggedIndex === index;
                  const isDropTarget = dragOverIndex === index && draggedIndex !== index;

                  return (
                    <div
                      key={page.id}
                      draggable
                      onDragStart={() => handleCardDragStart(index)}
                      onDragOver={(e) => handleCardDragOver(e, index)}
                      onDrop={(e) => handleCardDrop(e, index)}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`group relative flex flex-col rounded-2xl border bg-slate-900/90 overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                        isBeingDragged
                          ? 'opacity-40 scale-95 border-indigo-500'
                          : isDropTarget
                          ? 'border-indigo-400 ring-2 ring-indigo-400/40 scale-[1.02]'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {/* Page Number & Drag Handle */}
                      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur text-[11px] font-bold text-white border border-slate-700/70">
                        <GripVertical className="w-3 h-3 text-slate-400" />
                        <span>#{index + 1}</span>
                      </div>

                      {/* Quick Actions (Rotate / Delete) */}
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!page.isPdf && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              rotatePage(page.id);
                            }}
                            title="หมุนภาพ 90°"
                            className="p-1.5 rounded-lg bg-slate-950/85 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700/70 transition cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePage(page.id);
                          }}
                          title="ลบหน้านี้"
                          className="p-1.5 rounded-lg bg-slate-950/85 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700/70 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Thumbnail */}
                      <div className="aspect-[3/4] w-full bg-slate-950/60 flex items-center justify-center p-3 overflow-hidden">
                        {page.isPdf ? (
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                            <FileText className="w-12 h-12 text-rose-400" />
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                              PDF
                            </span>
                          </div>
                        ) : (
                          <img
                            src={page.previewUrl}
                            alt={page.name}
                            style={{ transform: `rotate(${page.rotation}deg)` }}
                            className="max-w-full max-h-full object-contain rounded transition-transform duration-200 pointer-events-none"
                          />
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-900 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-200 truncate" title={page.name}>
                            {page.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatBytes(page.size)}
                            {!page.isPdf && ` • ${page.width}×${page.height}`}
                          </p>
                        </div>
                        {!page.isPdf && <ImageIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                      </div>
                    </div>
                  );
                })}

                {/* Add More Card */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/30 hover:bg-slate-900/60 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-300 transition cursor-pointer"
                >
                  <FilePlus2 className="w-7 h-7" />
                  <span className="text-xs font-medium">เพิ่มไฟล์</span>
                </button>
              </div>
            </div>
          )}

          {/* Drag-over Overlay when pages already exist */}
          {isDraggingFiles && pages.length > 0 && (
            <div className="absolute inset-0 z-20 bg-indigo-950/70 backdrop-blur-sm border-2 border-dashed border-indigo-400 m-3 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
              <UploadCloud className="w-12 h-12 text-indigo-300 mb-2" />
              <p className="text-base font-semibold text-white">วางไฟล์เพื่อเพิ่มหน้าใหม่</p>
            </div>
          )}
        </section>

        {/* RIGHT PANEL: Settings + Ad Panel + Big CTA */}
        <aside className="w-[340px] lg:w-[370px] shrink-0 border-l border-slate-800/80 bg-slate-900/95 flex flex-col justify-between p-4 gap-3 overflow-hidden">
          <div className="flex flex-col gap-3.5 min-h-0">
            {/* Page Size & Orientation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  ขนาดหน้ากระดาษ
                </label>
                {settings.pageSize !== 'fit' && (
                  <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                    {(['portrait', 'landscape'] as const).map((ori) => (
                      <button
                        key={ori}
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, orientation: ori }))}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition cursor-pointer ${
                          settings.orientation === ori
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {ori === 'portrait' ? 'แนวตั้ง' : 'แนวนอน'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, pageSize: opt.id }))}
                    className={`px-2.5 py-1.5 rounded-xl border text-left transition cursor-pointer ${
                      settings.pageSize === opt.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Margin */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                ขอบกระดาษ (Margin)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {MARGIN_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, margin: m.id }))}
                    className={`py-1.5 px-1 rounded-xl border text-center text-[11px] font-medium transition cursor-pointer ${
                      settings.margin === m.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compression (5 options: No compression + 4 levels) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                การบีบอัดไฟล์ (Compress)
              </label>
              <div className="flex flex-col gap-1.5">
                {COMPRESSION_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, compression: c.id }))}
                    className={`w-full px-3 py-1.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      settings.compression === c.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">{c.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{c.sublabel}</div>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ml-2 ${
                        settings.compression === c.id
                          ? 'border-indigo-400 bg-indigo-500'
                          : 'border-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Area: Ad Panel + Big Generate Button */}
          <div className="flex flex-col gap-3 shrink-0">
            {/* Ad Panel */}
            <div className="rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-800/90 to-slate-900 p-3 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
                  <Megaphone className="w-3 h-3" />
                  Sponsored • พื้นที่โฆษณา
                </span>
                <span className="text-[10px] text-slate-500">Ad</span>
              </div>
              <div className="h-14 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 flex items-center justify-center text-center px-3">
                <p className="text-xs text-slate-400">
                  พื้นที่สำหรับแบนเนอร์โฆษณา (300×60 / AdSense)
                </p>
              </div>
            </div>

            {/* Big Primary Action Button */}
            <button
              type="button"
              disabled={pages.length === 0 || isGenerating}
              onClick={handleGenerate}
              className={`w-full py-4 px-5 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 shadow-xl transition-all cursor-pointer ${
                pages.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                  : isGenerating
                  ? 'bg-indigo-600/80 text-white cursor-wait'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30 active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  กำลังสร้าง PDF...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  สร้าง &amp; ดาวน์โหลด PDF
                </>
              )}
            </button>

            {lastResult && (
              <p className="text-center text-[11px] text-emerald-400 font-medium -mt-1">
                ดาวน์โหลดสำเร็จ! ({lastResult.count} หน้า • {formatBytes(lastResult.size)})
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
