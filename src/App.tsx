import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  FilePlus2,
  FileText,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
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
  PAGE_DIMENSIONS_PT,
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

type GridSize = 'sm' | 'md' | 'lg';

const GRID_CLASS_MAP: Record<GridSize, string> = {
  sm: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-7 gap-3',
  md: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4',
  lg: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-5',
};

interface DragState {
  id: string;
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
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

  const [gridSize, setGridSize] = useState<GridSize>(() => {
    const saved = localStorage.getItem('scrawny-pdf-grid-size');
    return saved === 'sm' || saved === 'lg' ? saved : 'md';
  });

  useEffect(() => {
    localStorage.setItem('scrawny-pdf-grid-size', gridSize);
  }, [gridSize]);

  const [pages, setPages] = useState<PageItem[]>([]);
  const [settings, setSettings] = useState<PdfSettings>({
    pageSize: 'a4',
    orientation: 'portrait',
    margin: 'small',
    compression: 'balanced',
    filename: 'scrawny-document.pdf',
  });

  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<{ size: number; count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const pendingDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const lastSwapAtRef = useRef(0);

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
    if (dragState !== null) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const snapshotCardRects = useCallback(() => {
    const map = new Map<string, DOMRect>();
    cardRefs.current.forEach((el, id) => {
      map.set(id, el.getBoundingClientRect());
    });
    prevRectsRef.current = map;
  }, []);

  useLayoutEffect(() => {
    const prevRects = prevRectsRef.current;
    if (prevRects.size === 0) return;

    cardRefs.current.forEach((el, id) => {
      if (dragState?.id === id) return;
      const prev = prevRects.get(id);
      if (!prev) return;
      const curr = el.getBoundingClientRect();
      const dx = prev.left - curr.left;
      const dy = prev.top - curr.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      el.getBoundingClientRect();
      el.style.transition = 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      el.style.transform = '';
    });

    prevRectsRef.current = new Map();
  }, [pages, gridSize, dragState?.id]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pendingDragRef.current && !dragState) {
        const p = pendingDragRef.current;
        if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 5) {
          setDragState({
            id: p.id,
            pointerX: e.clientX,
            pointerY: e.clientY,
            offsetX: p.offsetX,
            offsetY: p.offsetY,
            width: p.width,
            height: p.height,
          });
          pendingDragRef.current = null;
        }
        return;
      }

      if (!dragState) return;

      setDragState((prev) =>
        prev ? { ...prev, pointerX: e.clientX, pointerY: e.clientY } : null
      );

      const now = performance.now();
      if (now - lastSwapAtRef.current < 90) return;

      const draggedIdx = pages.findIndex((p) => p.id === dragState.id);
      if (draggedIdx === -1) return;

      let targetIdx = -1;
      for (let i = 0; i < pages.length; i++) {
        if (i === draggedIdx) continue;
        const el = cardRefs.current.get(pages[i].id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        ) {
          targetIdx = i;
          break;
        }
      }

      if (targetIdx !== -1 && targetIdx !== draggedIdx) {
        lastSwapAtRef.current = now;
        snapshotCardRects();
        setPages((prev) => {
          const from = prev.findIndex((p) => p.id === dragState.id);
          if (from === -1 || targetIdx < 0 || targetIdx >= prev.length) return prev;
          const updated = [...prev];
          const [moved] = updated.splice(from, 1);
          updated.splice(targetIdx, 0, moved);
          return updated;
        });
      }
    };

    const handlePointerUp = () => {
      pendingDragRef.current = null;
      if (dragState) setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragState, pages, snapshotCardRects]);

  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pendingDragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
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
    <div className="h-screen w-screen flex flex-col bg-[#050505] text-[#ffffff] overflow-hidden select-none relative">
      {/* ScrawnyMain Background Layers */}
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-glow" aria-hidden="true" />

      {/* Top Bar */}
      <header className="relative z-10 h-14 shrink-0 border-b border-[#222226] bg-[#0c0c0d]/85 backdrop-blur px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0c0c0d] border border-[#222226] flex items-center justify-center shadow-[inset_0_0_18px_rgba(255, 115, 0, 0.16)]">
            <FileText className="w-5 h-5 text-[#ff7300]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              Scrawny<span className="text-[#ff7300]">PDF</span>
            </h1>
            <p className="text-[11px] text-[#d4d4d8] mt-0.5">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c0c0d] hover:bg-[#141416] text-[#ffffff] text-xs font-medium transition cursor-pointer border border-[#222226] hover:border-[#ff7300]"
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

          {/* Buy me an orange */}
          <a
            href="https://buymeacoffee.com/scrawnysatyr"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0c0c0d] hover:bg-[#141416] border border-[#222226] hover:border-[#ff7300] text-[#ffffff] text-xs font-semibold transition"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#ff7300]"
              aria-hidden="true"
            >
              <circle cx="12" cy="13.5" r="7.5" fill="currentColor" fillOpacity="0.2" />
              <path d="M12 6c0-2 1.5-3.5 3.5-3.5" />
              <path d="M12 6c-1.5-1.5-3.5-1.5-4.5-.5 1 1 3 1 4.5.5Z" fill="currentColor" />
            </svg>
            <span>
              Buy me an <span className="text-[#ff7300]">orange</span>
            </span>
          </a>

          {/* Language Switcher */}
          <div
            role="group"
            aria-label="Language"
            className="flex items-center rounded-lg bg-[#050505] p-0.5 border border-[#222226]"
          >
            {(['en', 'th'] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition cursor-pointer ${
                  lang === code
                    ? 'bg-[#ff7300] text-[#050505]'
                    : 'text-[#d4d4d8] hover:text-white'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content: Left Ad Rail + Center Grid + Right Settings */}
      <main className="relative z-10 flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT SIDE FULL-HEIGHT AD RAIL */}
        <aside className="hidden xl:flex w-[184px] shrink-0 border-r border-[#222226] bg-[#0c0c0d]/80 backdrop-blur p-3 flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#ff943d]">
              <Megaphone className="w-3 h-3 text-[#ff7300]" />
              {t.sponsored}
            </span>
            <span className="text-[10px] text-[#8a8a93]">Ad</span>
          </div>
          <div className="flex-1 min-h-0 rounded-2xl border border-dashed border-[#222226] bg-[#050505]/70 flex flex-col items-center justify-center text-center p-3">
            <p className="text-xs text-[#8a8a93] whitespace-pre-line leading-relaxed">
              {t.adVerticalPlaceholder}
            </p>
          </div>
        </aside>

        {/* CENTER PANEL: Dropzone + Scrollable Draggable Grid */}
        <section
          className={`flex-1 min-w-0 flex flex-col relative transition-colors ${
            isDraggingFiles ? 'bg-[rgba(255,115,0,0.06)]' : 'bg-transparent'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (dragState === null) setIsDraggingFiles(true);
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
                    : 'border-[#222226] bg-[#0c0c0d]/70 hover:border-[#ff7300]/70 hover:bg-[#0c0c0d]/90'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-[rgba(255,115,0,0.14)] border border-[rgba(255,115,0,0.28)] flex items-center justify-center mb-5">
                  <UploadCloud className="w-8 h-8 text-[#ff7300]" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-1.5">
                  {t.dropTitle}
                </h2>
                <p className="text-sm text-[#d4d4d8] max-w-md">
                  {t.dropDesc}
                </p>
                <div className="mt-6 px-5 py-2.5 rounded-xl bg-[#ff7300] hover:bg-[#ff851f] text-[#050505] text-sm font-bold shadow-lg shadow-[#ff7300]/20 transition">
                  {t.chooseFiles}
                </div>
              </div>
            </div>
          ) : (
            /* Scrollable Page Grid */
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Grid Size Toolbar */}
              <div className="shrink-0 px-5 pt-3 pb-1 flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium text-[#8a8a93]">
                  {t.pageCount(pages.length)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#8a8a93]">
                    <LayoutGrid className="w-3.5 h-3.5 text-[#ff7300]" />
                    {t.gridSizeLabel}
                  </span>
                  <div
                    role="group"
                    aria-label={t.gridSizeLabel}
                    className="inline-flex rounded-lg border border-[#222226] bg-[#0c0c0d] p-0.5"
                  >
                    {(['sm', 'md', 'lg'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          snapshotCardRects();
                          setGridSize(sz);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                          gridSize === sz
                            ? 'bg-[#ff7300] text-[#050505]'
                            : 'text-[#d4d4d8] hover:text-white'
                        }`}
                      >
                        {t.gridSizes[sz]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto grid-scroll p-5 pt-3">
                <div className={`grid ${GRID_CLASS_MAP[gridSize]} pb-6`}>
                  {pages.map((page, index) => {
                    const isBeingDragged = dragState?.id === page.id;

                    return (
                      <div
                        key={page.id}
                        ref={(el) => {
                          if (el) cardRefs.current.set(page.id, el);
                          else cardRefs.current.delete(page.id);
                        }}
                        onPointerDown={(e) => handleCardPointerDown(e, page.id)}
                        className={`group relative flex flex-col rounded-2xl border overflow-hidden cursor-grab active:cursor-grabbing touch-none ${
                          isBeingDragged
                            ? 'border-2 border-dashed border-[#ff7300]/75 bg-[#ff7300]/10 shadow-inner'
                            : 'border-[#222226] bg-[#0c0c0d]/95 hover:border-[#ff7300]/70 hover:bg-[#141416] transition-colors'
                        }`}
                      >
                        <div className={isBeingDragged ? 'opacity-0 pointer-events-none' : ''}>
                          {/* Page Number & Drag Handle */}
                          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#050505]/90 backdrop-blur text-[11px] font-bold text-white border border-[#222226]">
                            <GripVertical className="w-3 h-3 text-[#ff7300]" />
                            <span>#{index + 1}</span>
                          </div>

                          {/* Quick Actions (Rotate / Delete) */}
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!page.isPdf && (
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rotatePage(page.id);
                                }}
                                title={t.rotateTitle}
                                className="p-1.5 rounded-lg bg-[#050505]/90 hover:bg-[#ff7300] text-[#ffffff] hover:text-[#050505] border border-[#222226] transition cursor-pointer"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                removePage(page.id);
                              }}
                              title={t.deleteTitle}
                              className="p-1.5 rounded-lg bg-[#050505]/90 hover:bg-rose-600 text-[#ffffff] hover:text-white border border-[#222226] transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Thumbnail: Live Paper Preview */}
                          <div className="relative aspect-square w-full bg-[#050505]/85 overflow-hidden">
                            <div className="absolute inset-3 flex items-center justify-center">
                              {page.isPdf ? (
                                <div className="flex flex-col items-center justify-center text-[#d4d4d8] gap-2">
                                  <FileText className="w-12 h-12 text-[#ff7300]" />
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[rgba(255,115,0,0.14)] text-[#ff943d] border border-[rgba(255,115,0,0.28)]">
                                    PDF
                                  </span>
                                </div>
                              ) : (
                                (() => {
                                  const marginPts =
                                    MARGIN_OPTIONS.find((m) => m.id === settings.margin)?.pts ?? 0;
                                  const rotated = page.rotation === 90 || page.rotation === 270;
                                  const imgW = rotated ? page.height : page.width;
                                  const imgH = rotated ? page.width : page.height;

                                  let pageW: number;
                                  let pageH: number;
                                  let effectiveMarginPts = marginPts;
                                  if (settings.pageSize === 'fit') {
                                    const imgPtW = imgW * 0.75;
                                    const imgPtH = imgH * 0.75;
                                    effectiveMarginPts =
                                      Math.min(imgPtW, imgPtH) * (marginPts / 595.28);
                                    pageW = imgPtW + effectiveMarginPts * 2;
                                    pageH = imgPtH + effectiveMarginPts * 2;
                                  } else {
                                    const [baseW, baseH] = PAGE_DIMENSIONS_PT[settings.pageSize];
                                    if (settings.orientation === 'landscape') {
                                      pageW = Math.max(baseW, baseH);
                                      pageH = Math.min(baseW, baseH);
                                    } else {
                                      pageW = Math.min(baseW, baseH);
                                      pageH = Math.max(baseW, baseH);
                                    }
                                  }

                                  const pageRatio = pageW / pageH;
                                  const availW = Math.max(10, pageW - effectiveMarginPts * 2);
                                  const availH = Math.max(10, pageH - effectiveMarginPts * 2);
                                  const scale = Math.min(availW / imgW, availH / imgH);
                                  const drawWpct = ((imgW * scale) / availW) * 100;
                                  const drawHpct = ((imgH * scale) / availH) * 100;
                                  const printableWpct = (availW / pageW) * 100;
                                  const printableHpct = (availH / pageH) * 100;

                                  return (
                                    <div
                                      style={{
                                        aspectRatio: `${pageW} / ${pageH}`,
                                        width: pageRatio >= 1 ? '100%' : 'auto',
                                        height: pageRatio >= 1 ? 'auto' : '100%',
                                      }}
                                      className="max-w-full max-h-full bg-white rounded-[3px] shadow-[0_6px_20px_rgba(0,0,0,0.55)] ring-1 ring-black/15 flex items-center justify-center overflow-hidden transition-all duration-200"
                                    >
                                      <div
                                        style={{
                                          width: `${printableWpct}%`,
                                          height: `${printableHpct}%`,
                                          containerType: 'size',
                                        }}
                                        className="relative flex items-center justify-center overflow-hidden"
                                      >
                                        <img
                                          src={page.previewUrl}
                                          alt={page.name}
                                          style={{
                                            width: rotated ? `${drawHpct}cqh` : `${drawWpct}cqw`,
                                            height: rotated ? `${drawWpct}cqw` : `${drawHpct}cqh`,
                                            transform: `rotate(${page.rotation}deg)`,
                                          }}
                                          className="max-w-none max-h-none object-contain transition-transform duration-200 pointer-events-none"
                                        />
                                      </div>
                                    </div>
                                  );
                                })()
                              )}
                            </div>
                          </div>

                          {/* Footer Info */}
                          <div className="px-3 py-2 border-t border-[#222226] bg-[#0c0c0d] flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-[#ffffff] truncate" title={page.name}>
                                {page.name}
                              </p>
                              <p className="text-[10px] text-[#d4d4d8]">
                                {formatBytes(page.size)}
                                {!page.isPdf && ` • ${page.width}×${page.height}`}
                              </p>
                            </div>
                            {!page.isPdf && <ImageIcon className="w-3.5 h-3.5 text-[#8a8a93] shrink-0" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add More Card */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-[#222226] hover:border-[#ff7300]/70 bg-[#0c0c0d]/40 hover:bg-[#0c0c0d]/80 flex flex-col items-center justify-center gap-2 text-[#d4d4d8] hover:text-[#ff7300] transition cursor-pointer"
                  >
                    <FilePlus2 className="w-7 h-7" />
                    <span className="text-xs font-medium">{t.addFiles}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Drag-over Overlay when pages already exist */}
          {isDraggingFiles && pages.length > 0 && (
            <div className="absolute inset-0 z-20 bg-[#050505]/80 backdrop-blur-sm border-2 border-dashed border-[#ff7300] m-3 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
              <UploadCloud className="w-12 h-12 text-[#ff7300] mb-2" />
              <p className="text-base font-semibold text-white">{t.dropOverlay}</p>
            </div>
          )}
        </section>

        {/* RIGHT PANEL: Settings + Ad Panel + Big CTA */}
        <aside className="w-[340px] lg:w-[370px] shrink-0 border-l border-[#222226] bg-[#0c0c0d]/95 backdrop-blur flex flex-col justify-between p-4 gap-3 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto grid-scroll flex flex-col gap-4 pr-0.5">
            {/* Page Orientation */}
            <fieldset className="space-y-2 border-0 p-0 m-0" disabled={settings.pageSize === 'fit'}>
              <legend className="text-xs font-semibold text-[#d4d4d8] uppercase tracking-wider flex items-center justify-between w-full">
                <span>{t.orientationLabel}</span>
                {settings.pageSize === 'fit' && (
                  <span className="text-[10px] font-normal normal-case text-[#8a8a93]">
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
                          ? 'opacity-45 cursor-not-allowed bg-[#0c0c0d]/60 border-[#222226] text-[#8a8a93]'
                          : isSelected
                          ? 'cursor-pointer bg-[rgba(255, 115, 0, 0.16)] border-[#ff7300] text-white'
                          : 'cursor-pointer bg-[#0c0c0d] border-[#222226] text-[#d4d4d8] hover:border-[#ff7300]/50 hover:bg-[#141416] hover:text-white'
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
                            ? 'border-[#ff7300] bg-[rgba(255, 115, 0, 0.16)]'
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
                className="block text-xs font-semibold text-[#d4d4d8] uppercase tracking-wider"
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
                  className="scrawny-select-chevron w-4 h-4 text-[#d4d4d8] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                />
              </div>
            </div>

            {/* Margin */}
            <fieldset className="space-y-2 border-0 p-0 m-0">
              <legend className="text-xs font-semibold text-[#d4d4d8] uppercase tracking-wider">
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
                          ? 'bg-[rgba(255, 115, 0, 0.16)] border-[#ff7300] text-white'
                          : 'bg-[#0c0c0d] border-[#222226] text-[#d4d4d8] hover:border-[#ff7300]/50 hover:bg-[#141416] hover:text-white'
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
                              ? 'border-[#ff7300] bg-[#0c0c0d]'
                              : 'border-current bg-[#050505]'
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
              <label className="text-xs font-semibold text-[#d4d4d8] uppercase tracking-wider flex items-center gap-1.5">
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
                          : 'bg-[#0c0c0d] border-[#222226] text-[#ffffff] hover:border-[#ff7300]/50 hover:bg-[#141416]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{compText.label}</div>
                        <div className="text-[10px] text-[#d4d4d8] truncate">
                          {compText.sublabel}
                        </div>
                      </div>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ml-2 ${
                          settings.compression === c.id
                            ? 'border-[#ff943d] bg-[#ff7300]'
                            : 'border-[#8a8a93]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Area: Ad Panel + Big Generate Button */}
          <div className="flex flex-col gap-2.5 shrink-0 pt-2 border-t border-[#222226]">
            {/* Ad Panel */}
            <div className="rounded-2xl border border-[#222226] bg-[#0c0c0d] p-2.5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#ff943d]">
                  <Megaphone className="w-3 h-3 text-[#ff7300]" />
                  {t.sponsored}
                </span>
                <span className="text-[10px] text-[#8a8a93]">Ad</span>
              </div>
              <div className="h-12 rounded-xl border border-dashed border-[#222226] bg-[#050505]/70 flex items-center justify-center text-center px-3">
                <p className="text-xs text-[#d4d4d8]">
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
                  ? 'bg-[#0c0c0d] border border-[#222226] text-[#8a8a93] cursor-not-allowed shadow-none'
                  : isGenerating
                  ? 'bg-[#ff7300]/80 text-[#050505] cursor-wait'
                  : 'bg-[#ff7300] hover:bg-[#ff851f] text-[#050505] shadow-[#ff7300]/25 active:scale-[0.99]'
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

      {/* Floating Held Card Overlay */}
      {dragState &&
        (() => {
          const heldIndex = pages.findIndex((p) => p.id === dragState.id);
          const heldPage = heldIndex !== -1 ? pages[heldIndex] : null;
          if (!heldPage) return null;
          return (
            <div
              style={{
                position: 'fixed',
                left: dragState.pointerX - dragState.offsetX,
                top: dragState.pointerY - dragState.offsetY,
                width: dragState.width,
                height: dragState.height,
                zIndex: 50,
                pointerEvents: 'none',
              }}
              className="flex flex-col rounded-2xl border-2 border-[#ff7300] bg-[#141416] overflow-hidden shadow-[0_20px_50px_rgba(255,115,0,0.3)] scale-[1.04]"
            >
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ff7300] text-[11px] font-bold text-[#050505]">
                <GripVertical className="w-3 h-3" />
                <span>#{heldIndex + 1}</span>
              </div>
              <div className="relative aspect-square w-full bg-[#050505]/90 overflow-hidden flex items-center justify-center p-3">
                {heldPage.isPdf ? (
                  <FileText className="w-12 h-12 text-[#ff7300]" />
                ) : (
                  <img
                    src={heldPage.previewUrl}
                    alt={heldPage.name}
                    style={{ transform: `rotate(${heldPage.rotation}deg)` }}
                    className="max-w-full max-h-full object-contain rounded-[3px] shadow-md"
                  />
                )}
              </div>
              <div className="px-3 py-2 border-t border-[#222226] bg-[#0c0c0d] flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#ffffff] truncate">{heldPage.name}</p>
                  <p className="text-[10px] text-[#d4d4d8]">
                    {formatBytes(heldPage.size)}
                    {!heldPage.isPdf && ` • ${heldPage.width}×${heldPage.height}`}
                  </p>
                </div>
                {!heldPage.isPdf && <ImageIcon className="w-3.5 h-3.5 text-[#ff7300] shrink-0" />}
              </div>
            </div>
          );
        })()}
    </div>
  );
}

export default App;
