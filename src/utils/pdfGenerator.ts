import { PDFDocument } from 'pdf-lib';
import {
  COMPRESSION_OPTIONS,
  MARGIN_OPTIONS,
  PAGE_DIMENSIONS_PT,
  type PageItem,
  type PdfSettings,
} from '../types/pdf';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

async function processImageToBytes(
  item: PageItem,
  quality: number | null,
  maxDim: number | null
): Promise<{ bytes: Uint8Array; format: 'jpeg' | 'png'; width: number; height: number }> {
  const isJpeg = item.file.type === 'image/jpeg' || item.file.type === 'image/jpg';
  const isPng = item.file.type === 'image/png';

  // If no compression and no rotation and already JPEG or PNG, embed raw bytes directly
  if (quality === null && item.rotation === 0 && (isJpeg || isPng)) {
    const buf = await item.file.arrayBuffer();
    return {
      bytes: new Uint8Array(buf),
      format: isJpeg ? 'jpeg' : 'png',
      width: item.width,
      height: item.height,
    };
  }

  const img = await loadImage(item.previewUrl);
  const rotated = item.rotation === 90 || item.rotation === 270;
  let targetW = rotated ? img.naturalHeight : img.naturalWidth;
  let targetH = rotated ? img.naturalWidth : img.naturalHeight;

  if (maxDim && (targetW > maxDim || targetH > maxDim)) {
    const scale = Math.min(maxDim / targetW, maxDim / targetH);
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // White background for JPEG (handles transparent PNG/WebP cleanly)
  if (quality !== null || !isPng) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
  }

  ctx.save();
  ctx.translate(targetW / 2, targetH / 2);
  ctx.rotate((item.rotation * Math.PI) / 180);
  const drawW = rotated ? targetH : targetW;
  const drawH = rotated ? targetW : targetH;
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const usePng = quality === null && isPng;
  const mime = usePng ? 'image/png' : 'image/jpeg';
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode image'))),
      mime,
      usePng ? undefined : (quality ?? 0.95)
    );
  });

  const buf = await blob.arrayBuffer();
  return {
    bytes: new Uint8Array(buf),
    format: usePng ? 'png' : 'jpeg',
    width: targetW,
    height: targetH,
  };
}

export async function generatePdf(
  items: PageItem[],
  settings: PdfSettings
): Promise<{ bytes: Uint8Array; size: number }> {
  const pdfDoc = await PDFDocument.create();
  const marginPts = MARGIN_OPTIONS.find((m) => m.id === settings.margin)?.pts ?? 0;
  const comp = COMPRESSION_OPTIONS.find((c) => c.id === settings.compression) ?? COMPRESSION_OPTIONS[0];

  for (const item of items) {
    if (item.isPdf) {
      const srcBytes = await item.file.arrayBuffer();
      const srcDoc = await PDFDocument.load(srcBytes);
      const copiedPages = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((p) => pdfDoc.addPage(p));
      continue;
    }

    const processed = await processImageToBytes(item, comp.quality, comp.maxDim);
    const embeddedImage =
      processed.format === 'jpeg'
        ? await pdfDoc.embedJpg(processed.bytes)
        : await pdfDoc.embedPng(processed.bytes);

    let pageW: number;
    let pageH: number;
    let effectiveMarginPts = marginPts;

    if (settings.pageSize === 'fit') {
      // 1 px = 0.75 pt (96 DPI -> 72 pt/in)
      const imgPtW = processed.width * 0.75;
      const imgPtH = processed.height * 0.75;
      // Scale margin proportionally to image size so small & large images keep consistent visual margins
      effectiveMarginPts = Math.min(imgPtW, imgPtH) * (marginPts / 595.28);
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

    const page = pdfDoc.addPage([pageW, pageH]);
    const availW = Math.max(10, pageW - effectiveMarginPts * 2);
    const availH = Math.max(10, pageH - effectiveMarginPts * 2);

    const scale = Math.min(availW / processed.width, availH / processed.height);
    const drawW = processed.width * scale;
    const drawH = processed.height * scale;

    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawW,
      height: drawH,
    });
  }

  const bytes = await pdfDoc.save({ useObjectStreams: settings.compression !== 'none' });
  return { bytes, size: bytes.byteLength };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
