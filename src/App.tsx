import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
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
  type MarginOption,
  type PageItem,
  type PageSizeOption,
  type PdfSettings,
} from './types/pdf';
import { formatBytes, generatePdf } from './utils/pdfGenerator';
import { getPageSizeDisplay, TRANSLATIONS, type Language } from './i18n';

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 800, height: 600 });
    img.src = url;
  });
}

export function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('scrawny-pdf-lang');
    return saved === 'th' ? 'th' : 'en';
  });
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    localStorage.setItem('scrawny-pdf-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

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
    if (draggedIndex !== null) return;
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
      alert(t.generateError);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#141418] text-[#f4f4f5] overflow-hidden select-none relative">
      {/* ScrawnyMain Background Layers */}
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-glow" aria-hidden="true" />

      {/* Top Bar */}
      <header className="relative z-10 h-14 shrink-0 border-b border-[#2c2c36] bg-[#18181e]/85 backdrop-blur px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1c1c22] border border-[#2c2c36] flex items-center justify-center shadow-[inset_0_0_18px_rgba(255,115,0,0.12)]">
            <FileText className="w-5 h-5 text-[#ff7300]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              Scrawny<span className="text-[#ff7300]">PDF</span>
            </h1>
            <p className="text-[11px] text-[#a1a1aa] mt-0.5">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {pages.length > 0 && (
            <>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(255,115,0,0.14)] text-[#ff943d] border border-[rgba(255,115,0,0.3)]">
                {t.pageCount(pages.length)}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1c22] hover:bg-[#22222a] text-[#f4f4f5] text-xs font-medium transition cursor-pointer border border-[#2c2c36] hover:border-[#ff7300]"
              >
                <FilePlus2 className="w-3.5 h-3.5 text-[#ff7300]" />
                {t.addFiles}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition cursor-pointer border border-rose-500/25"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t.clearAll}
              </button>
            </>
          )}

          {/* Language Switcher */}
          <div
            role="group"
            aria-label="Language"
            className="flex items-center rounded-lg bg-[#141418] p-0.5 border border-[#2c2c36]"
          >
            {(['en', 'th'] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition cursor-pointer ${
                  lang === code
                    ? 'bg-[#ff7300] text-[#141418]'
                    : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content: Left Grid + Right Settings */}
      <main className="relative z-10 flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT PANEL: Dropzone + Scrollable Draggable Grid */}
        <section
          className={`flex-1 min-w-0 flex flex-col relative transition-colors ${
            isDraggingFiles ? 'bg-[rgba(255,115,0,0.06)]' : 'bg-transparent'
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
                    ? 'border-[#ff7300] bg-[rgba(255,115,0,0.1)] scale-[1.01]'
                    : 'border-[#2c2c36] bg-[#1c1c22]/70 hover:border-[#ff7300]/70 hover:bg-[#1c1c22]/90'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-[rgba(255,115,0,0.14)] border border-[rgba(255,115,0,0.28)] flex items-center justify-center mb-5">
                  <UploadCloud className="w-8 h-8 text-[#ff7300]" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-1.5">
                  {t.dropTitle}
                </h2>
                <p className="text-sm text-[#a1a1aa] max-w-md">
                  {t.dropDesc}
                </p>
                <div className="mt-6 px-5 py-2.5 rounded-xl bg-[#ff7300] hover:bg-[#ff851f] text-[#141418] text-sm font-bold shadow-lg shadow-[#ff7300]/20 transition">
                  {t.chooseFiles}
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
                      className={`group relative flex flex-col rounded-2xl border bg-[#1c1c22]/95 overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                        isBeingDragged
                          ? 'opacity-40 scale-95 border-[#ff7300]'
                          : isDropTarget
                          ? 'border-[#ff7300] ring-2 ring-[#ff7300]/40 scale-[1.02]'
                          : 'border-[#2c2c36] hover:border-[#ff7300]/70 hover:bg-[#22222a]'
                      }`}
                    >
                      {/* Page Number & Drag Handle */}
                      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#141418]/90 backdrop-blur text-[11px] font-bold text-white border border-[#2c2c36]">
                        <GripVertical className="w-3 h-3 text-[#ff7300]" />
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
                            title={t.rotateTitle}
                            className="p-1.5 rounded-lg bg-[#141418]/90 hover:bg-[#ff7300] text-[#f4f4f5] hover:text-[#141418] border border-[#2c2c36] transition cursor-pointer"
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
                          title={t.deleteTitle}
                          className="p-1.5 rounded-lg bg-[#141418]/90 hover:bg-rose-600 text-[#f4f4f5] hover:text-white border border-[#2c2c36] transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Thumbnail */}
                      <div className="aspect-[3/4] w-full bg-[#141418]/80 flex items-center justify-center p-3 overflow-hidden">
                        {page.isPdf ? (
                          <div className="flex flex-col items-center justify-center text-[#a1a1aa] gap-2">
                            <FileText className="w-12 h-12 text-[#ff7300]" />
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[rgba(255,115,0,0.14)] text-[#ff943d] border border-[rgba(255,115,0,0.28)]">
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
                      <div className="px-3 py-2 border-t border-[#2c2c36] bg-[#1c1c22] flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[#f4f4f5] truncate" title={page.name}>
                            {page.name}
                          </p>
                          <p className="text-[10px] text-[#a1a1aa]">
                            {formatBytes(page.size)}
                            {!page.isPdf && ` • ${page.width}×${page.height}`}
                          </p>
                        </div>
                        {!page.isPdf && <ImageIcon className="w-3.5 h-3.5 text-[#71717a] shrink-0" />}
                      </div>
                    </div>
                  );
                })}

                {/* Add More Card */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[#2c2c36] hover:border-[#ff7300]/70 bg-[#1c1c22]/40 hover:bg-[#1c1c22]/80 flex flex-col items-center justify-center gap-2 text-[#a1a1aa] hover:text-[#ff7300] transition cursor-pointer"
                >
                  <FilePlus2 className="w-7 h-7" />
                  <span className="text-xs font-medium">{t.addFiles}</span>
                </button>
              </div>
            </div>
          )}

          {/* Drag-over Overlay when pages already exist */}
          {isDraggingFiles && pages.length > 0 && (
            <div className="absolute inset-0 z-20 bg-[#141418]/80 backdrop-blur-sm border-2 border-dashed border-[#ff7300] m-3 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
              <UploadCloud className="w-12 h-12 text-[#ff7300] mb-2" />
              <p className="text-base font-semibold text-white">{t.dropOverlay}</p>
            </div>
          )}
        </section>

        {/* RIGHT PANEL: Settings + Ad Panel + Big CTA */}
        <aside className="w-[340px] lg:w-[370px] shrink-0 border-l border-[#2c2c36] bg-[#18181e]/95 backdrop-blur flex flex-col justify-between p-4 gap-3 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto grid-scroll flex flex-col gap-4 pr-0.5">
            {/* Page Orientation */}
            <fieldset className="space-y-2 border-0 p-0 m-0" disabled={settings.pageSize === 'fit'}>
              <legend className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center justify-between w-full">
                <span>{t.orientationLabel}</span>
                {settings.pageSize === 'fit' && (
                  <span className="text-[10px] font-normal normal-case text-[#71717a]">
                    {t.orientationFitHint}
                  </span>
                )}
              </legend>
              <div className="grid grid-cols-2 gap-2.5">
                {(['portrait', 'landscape'] as const).map((ori) => {
                  const isSelected = settings.orientation === ori;
                  const isDisabled = settings.pageSize === 'fit';
                  return (
                    <label
                      key={ori}
                      className={`relative flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl border transition select-none ${
                        isDisabled
                          ? 'opacity-45 cursor-not-allowed bg-[#1c1c22]/60 border-[#2c2c36] text-[#71717a]'
                          : isSelected
                          ? 'cursor-pointer bg-[rgba(255,115,0,0.12)] border-[#ff7300] text-white'
                          : 'cursor-pointer bg-[#1c1c22] border-[#2c2c36] text-[#a1a1aa] hover:border-[#ff7300]/50 hover:bg-[#22222a] hover:text-white'
                      } has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#ff7300] has-[:focus-visible]:outline-offset-2`}
                    >
                      <input
                        type="radio"
                        name="orientation"
                        value={ori}
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => setSettings((s) => ({ ...s, orientation: ori }))}
                        className="visually-hidden"
                      />
                      <span
                        aria-hidden="true"
                        className={`rounded-[3px] border-2 transition-colors ${
                          ori === 'portrait' ? 'w-5 h-7' : 'w-7 h-5'
                        } ${
                          isSelected && !isDisabled
                            ? 'border-[#ff7300] bg-[rgba(255,115,0,0.12)]'
                            : 'border-current'
                        }`}
                      />
                      <span className="text-xs font-semibold leading-none">
                        {ori === 'portrait' ? t.portrait : t.landscape}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Page Size Dropdown */}
            <div className="space-y-2">
              <label
                htmlFor="page-size-select"
                className="block text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider"
              >
                {t.pageSizeLabel}
              </label>
              <div className="relative">
                <select
                  id="page-size-select"
                  name="pageSize"
                  value={settings.pageSize}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, pageSize: e.target.value as PageSizeOption }))
                  }
                  className="scrawny-select"
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {getPageSizeDisplay(opt.id, opt.label, opt.desc, t)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="scrawny-select-chevron w-4 h-4 text-[#a1a1aa] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                />
              </div>
            </div>

            {/* Margin */}
            <fieldset className="space-y-2 border-0 p-0 m-0">
              <legend className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
                {t.marginLabel}
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {MARGIN_OPTIONS.map((m) => {
                  const isSelected = settings.margin === m.id;
                  const marginPreviewPad: Record<MarginOption, string> = {
                    none: 'p-0',
                    small: 'p-1',
                    medium: 'p-1.5',
                    large: 'p-2',
                  };
                  const marginText = t.margins[m.id];
                  return (
                    <label
                      key={m.id}
                      title={marginText.title}
                      className={`relative flex flex-col items-center justify-center gap-2 py-2.5 px-1 rounded-xl border transition cursor-pointer select-none ${
                        isSelected
                          ? 'bg-[rgba(255,115,0,0.12)] border-[#ff7300] text-white'
                          : 'bg-[#1c1c22] border-[#2c2c36] text-[#a1a1aa] hover:border-[#ff7300]/50 hover:bg-[#22222a] hover:text-white'
                      } has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#ff7300] has-[:focus-visible]:outline-offset-2`}
                    >
                      <input
                        type="radio"
                        name="margin"
                        value={m.id}
                        checked={isSelected}
                        onChange={() => setSettings((s) => ({ ...s, margin: m.id }))}
                        className="visually-hidden"
                      />
                      <span
                        aria-hidden="true"
                        className={`w-8 h-8 rounded flex items-center justify-center ${
                          m.id === 'none'
                            ? ''
                            : isSelected
                            ? 'margin-checker-active'
                            : 'margin-checker'
                        } ${marginPreviewPad[m.id]}`}
                      >
                        <span
                          className={`w-full h-full rounded-[2px] border-[1.5px] flex items-center justify-center ${
                            isSelected
                              ? 'border-[#ff7300] bg-[#18181e]'
                              : 'border-current bg-[#141418]'
                          }`}
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </span>
                      </span>
                      <span className="text-[11px] font-semibold leading-none">
                        {marginText.short}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Compression (5 options: No compression + 4 levels) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ff7300]" />
                {t.compressionLabel}
              </label>
              <div className="flex flex-col gap-1.5">
                {COMPRESSION_OPTIONS.map((c) => {
                  const compText = t.compressions[c.id];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, compression: c.id }))}
                      className={`w-full px-3 py-1.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        settings.compression === c.id
                          ? 'bg-[rgba(255,115,0,0.14)] border-[#ff7300] text-white'
                          : 'bg-[#1c1c22] border-[#2c2c36] text-[#f4f4f5] hover:border-[#ff7300]/50 hover:bg-[#22222a]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{compText.label}</div>
                        <div className="text-[10px] text-[#a1a1aa] truncate">
                          {compText.sublabel}
                        </div>
                      </div>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ml-2 ${
                          settings.compression === c.id
                            ? 'border-[#ff943d] bg-[#ff7300]'
                            : 'border-[#71717a]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Area: Ad Panel + Big Generate Button */}
          <div className="flex flex-col gap-2.5 shrink-0 pt-2 border-t border-[#2c2c36]">
            {/* Ad Panel */}
            <div className="rounded-2xl border border-[#2c2c36] bg-[#1c1c22] p-2.5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#ff943d]">
                  <Megaphone className="w-3 h-3 text-[#ff7300]" />
                  {t.sponsored}
                </span>
                <span className="text-[10px] text-[#71717a]">Ad</span>
              </div>
              <div className="h-12 rounded-xl border border-dashed border-[#2c2c36] bg-[#141418]/70 flex items-center justify-center text-center px-3">
                <p className="text-xs text-[#a1a1aa]">
                  {t.adPlaceholder}
                </p>
              </div>
            </div>

            {/* Big Primary Action Button */}
            <button
              type="button"
              disabled={pages.length === 0 || isGenerating}
              onClick={handleGenerate}
              className={`w-full py-3.5 px-5 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 shadow-xl transition-all cursor-pointer ${
                pages.length === 0
                  ? 'bg-[#1c1c22] border border-[#2c2c36] text-[#71717a] cursor-not-allowed shadow-none'
                  : isGenerating
                  ? 'bg-[#ff7300]/80 text-[#141418] cursor-wait'
                  : 'bg-[#ff7300] hover:bg-[#ff851f] text-[#141418] shadow-[#ff7300]/25 active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.generating}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {t.generateCta}
                </>
              )}
            </button>

            {lastResult && (
              <p className="text-center text-[11px] text-emerald-400 font-medium -mt-1">
                {t.downloadSuccess(lastResult.count, formatBytes(lastResult.size))}
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
