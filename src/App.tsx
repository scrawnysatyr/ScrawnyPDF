import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  FilePlus2,
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
import { getPageSizeDisplay, TRANSLATIONS } from './i18n';
import { useTranslatedPack } from './utils/autoTranslate';
import { LanguageSelector } from './components/LanguageSelector';

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
  const [lang, setLang] = useState<string>(() => {
    const saved = localStorage.getItem('scrawny-pdf-lang');
    return saved || 'en';
  });
  const { t: rawT, translateTemplate } = useTranslatedPack(lang, TRANSLATIONS, 'scrawny_pdf', {
    pageCount: '{{count}} pages',
    downloadSuccess: 'Generated {{count}} pages ({{size}})',
  });
  const t =
    lang === 'en' || lang === 'th'
      ? rawT
      : {
          ...rawT,
          pageCount: (count: number) => translateTemplate('{{count}} pages', { count }),
          downloadSuccess: (count: number, size: string) =>
            translateTemplate('Generated {{count}} pages ({{size}})', { count, size }),
        };

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
    <div className="h-screen w-screen flex flex-col p-2.5 sm:p-3.5 gap-3 bg-[#050505] text-[#ffffff] overflow-hidden select-none relative">
      {/* ScrawnyMain Background Layers */}
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-glow" aria-hidden="true" />

      {/* Top Bar */}
      <header className="relative z-20 min-h-[48px] shrink-0 px-1 flex flex-wrap items-center justify-between gap-2">
        <a href="https://scrawny.site" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-[11px] bg-[#18181b] border border-[#222226] flex items-center justify-center text-[#ff7300] font-extrabold text-lg">
            S
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-none">
            <span className="text-[#ff7300]">pdf</span>.scrawny<span className="text-[#ff7300]">.site</span>
          </h1>
        </a>

        <div className="flex items-center flex-wrap gap-2">
          {pages.length > 0 && (
            <>
              <span className="text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-[8px] bg-[rgba(255,115,0,0.14)] text-[#ff943d] border border-[rgba(255,115,0,0.3)]">
                {t.pageCount(pages.length)}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#27272c] hover:bg-[#303036] text-[#ffffff] text-xs font-medium transition cursor-pointer border border-white/10 hover:border-[#ff7300]"
              >
                <FilePlus2 className="w-4 h-4 text-[#ff7300]" />
                {t.addFiles}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-medium transition cursor-pointer border border-rose-500/30"
              >
                <Trash2 className="w-4 h-4" />
                {t.clearAll}
              </button>
            </>
          )}

          <a
            href="https://scrawny.site"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#27272c] hover:bg-[#303036] border border-white/10 hover:border-[#ff7300] text-[#d4d4d8] hover:text-white text-xs font-medium transition"
          >
            <span>&larr; Hub</span>
          </a>

          {/* Buy Me Some Oranges */}
          <a
            href="https://www.buymeacoffee.com/scrawnysatyr"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center transition-transform hover:scale-[1.03]"
            title="Buy Me Some Oranges"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 56" className="h-9 w-auto">
              <rect x="2" y="2" width="256" height="52" rx="12" fill="#FFDD00" />
              <g transform="translate(15, 9) scale(0.58)" fill="none">
                <path d="M33 17C38 10 47 10 50 15C45 20 37 20 33 17Z" fill="#4CAF50" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M32 18C32 13 33.5 9 36 6" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M32 18C18.5 18 10 27 10 39.5C10 52 19.5 58 32 58C44.5 58 54 52 54 39.5C54 27 45.5 18 32 18Z" fill="#FF9800" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M27 21C29.5 22.5 34.5 22.5 37 21" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
                <path d="M17.5 35C18.5 29 22.5 25.5 27.5 24.5" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
                <circle cx="44" cy="43" r="1.8" fill="#000000" />
                <circle cx="39.5" cy="48.5" r="1.6" fill="#000000" />
                <circle cx="46" cy="37" r="1.5" fill="#000000" />
              </g>
              <text x="58" y="34" fontFamily="'Cookie', cursive, sans-serif" fontSize="23" fontWeight="bold" fill="#000000">
                Buy Me Some Oranges
              </text>
            </svg>
          </a>

          <a
            href="https://github.com/scrawnysatyr"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#27272c] hover:bg-[#303036] border border-white/10 hover:border-[#ff7300] text-[#d4d4d8] hover:text-white text-xs font-medium transition"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.02 11.02 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.26 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.66.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
            <span>@scrawnysatyr</span>
          </a>

          {/* Language Switcher */}
          <LanguageSelector lang={lang} onChange={setLang} />
        </div>
      </header>

      {/* Main Content: Left Ad Island + Center Grid Island + Right Settings Island */}
      <main className="relative z-10 flex-1 min-h-0 flex gap-3 overflow-hidden">
        {/* LEFT SIDE FULL-HEIGHT AD ISLAND */}
        <aside className="hidden xl:flex w-[184px] shrink-0 rounded-2xl border border-white/10 bg-[#18181b]/95 backdrop-blur-xl shadow-lg p-3 flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#ff943d]">
              <Megaphone className="w-3 h-3 text-[#ff7300]" />
              {t.sponsored}
            </span>
            <span className="text-[10px] text-[#8a8a93]">Ad</span>
          </div>
          <div className="flex-1 min-h-0 rounded-xl border border-dashed border-white/15 bg-[#202024]/70 flex flex-col items-center justify-center text-center p-3">
            <p className="text-xs text-[#8a8a93] whitespace-pre-line leading-relaxed">
              {t.adVerticalPlaceholder}
            </p>
          </div>
        </aside>

        {/* CENTER WORKSPACE: Transparent over signature grid + glow */}
        <section
          className={`flex-1 min-w-0 flex flex-col relative rounded-2xl transition-colors ${
            isDraggingFiles ? 'bg-[rgba(255,115,0,0.08)]' : 'bg-transparent'
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
                    : 'border-[#222226] bg-[#18181b]/70 hover:border-[#ff7300]/70 hover:bg-[#18181b]/90'
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
              <div className="shrink-0 px-3 pt-1 pb-2 flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm font-medium text-[#d4d4d8]">
                  {t.pageCount(pages.length)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#d4d4d8]">
                    <LayoutGrid className="w-4 h-4 text-[#ff7300]" />
                    {t.gridSizeLabel}
                  </span>
                  <div
                    role="group"
                    aria-label={t.gridSizeLabel}
                    className="inline-flex rounded-xl border border-white/10 bg-[#18181b] p-1"
                  >
                    {(['sm', 'md', 'lg'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          snapshotCardRects();
                          setGridSize(sz);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                            : 'border-[#222226] bg-[#18181b]/95 hover:border-[#ff7300]/70 hover:bg-[#222226] transition-colors'
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
                          <div className="px-3 py-2 border-t border-[#222226] bg-[#18181b] flex items-center justify-between gap-2">
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
                    className="aspect-square rounded-2xl border-2 border-dashed border-[#222226] hover:border-[#ff7300]/70 bg-[#18181b]/40 hover:bg-[#18181b]/80 flex flex-col items-center justify-center gap-2 text-[#d4d4d8] hover:text-[#ff7300] transition cursor-pointer"
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

        {/* RIGHT ISLAND: Settings + Ad Panel + Big CTA */}
        <aside className="w-[340px] lg:w-[370px] shrink-0 rounded-2xl border border-white/10 bg-[#18181b]/95 backdrop-blur-xl shadow-lg flex flex-col justify-between p-4 gap-3 overflow-hidden">
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
                          ? 'opacity-45 cursor-not-allowed bg-[#18181b]/60 border-[#222226] text-[#8a8a93]'
                          : isSelected
                          ? 'cursor-pointer bg-[rgba(255, 115, 0, 0.16)] border-[#ff7300] text-white'
                          : 'cursor-pointer bg-[#18181b] border-[#222226] text-[#d4d4d8] hover:border-[#ff7300]/50 hover:bg-[#222226] hover:text-white'
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
                          : 'bg-[#18181b] border-[#222226] text-[#d4d4d8] hover:border-[#ff7300]/50 hover:bg-[#222226] hover:text-white'
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
                              ? 'border-[#ff7300] bg-[#18181b]'
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
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-[#d4d4d8] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#ff7300]" />
                {t.compressionLabel}
              </label>
              <div className="flex flex-col gap-2">
                {COMPRESSION_OPTIONS.map((c) => {
                  const compText = t.compressions[c.id];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, compression: c.id }))}
                      className={`w-full px-3.5 py-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                        settings.compression === c.id
                          ? 'bg-[rgba(255,115,0,0.14)] border-[#ff7300] text-white'
                          : 'bg-[#222226] border-white/10 text-[#ffffff] hover:border-[#ff7300]/50 hover:bg-[#27272c]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{compText.label}</div>
                        <div className="text-xs text-[#d4d4d8] truncate">
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

          {/* Bottom Area: Big Generate Button */}
          <div className="flex flex-col gap-2.5 shrink-0 pt-2 border-t border-[#222226]">
            {/* Big Primary Action Button */}
            <button
              type="button"
              disabled={pages.length === 0 || isGenerating}
              onClick={handleGenerate}
              className={`w-full py-3.5 px-5 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 shadow-xl transition-all cursor-pointer ${
                pages.length === 0
                  ? 'bg-[#18181b] border border-[#222226] text-[#8a8a93] cursor-not-allowed shadow-none'
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
              className="flex flex-col rounded-2xl border-2 border-[#ff7300] bg-[#222226] overflow-hidden shadow-[0_20px_50px_rgba(255,115,0,0.3)] scale-[1.04]"
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
              <div className="px-3 py-2 border-t border-[#222226] bg-[#18181b] flex items-center justify-between gap-2">
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
