export type PageSizeOption = 'fit' | 'a4' | 'letter' | 'legal' | 'a3' | 'a5';
export type OrientationOption = 'portrait' | 'landscape';
export type MarginOption = 'none' | 'small' | 'medium' | 'large';
export type CompressionLevel = 'none' | 'high' | 'balanced' | 'compact' | 'smallest';

export interface PageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  isPdf: boolean;
}

export interface PdfSettings {
  pageSize: PageSizeOption;
  orientation: OrientationOption;
  margin: MarginOption;
  compression: CompressionLevel;
  filename: string;
}

export const COMPRESSION_OPTIONS: {
  id: CompressionLevel;
  label: string;
  sublabel: string;
  quality: number | null;
  maxDim: number | null;
}[] = [
  {
    id: 'none',
    label: 'ไม่บีบอัด (Original)',
    sublabel: 'คุณภาพต้นฉบับ 100%',
    quality: null,
    maxDim: null,
  },
  {
    id: 'high',
    label: 'คุณภาพสูง (High)',
    sublabel: 'คมชัดมาก ลดขนาดเล็กน้อย (90%)',
    quality: 0.9,
    maxDim: 3200,
  },
  {
    id: 'balanced',
    label: 'สมดุล (Balanced)',
    sublabel: 'แนะนำ • ชัดกำลังดี ไฟล์ไม่ใหญ่ (70%)',
    quality: 0.7,
    maxDim: 2200,
  },
  {
    id: 'compact',
    label: 'ประหยัดพื้นที่ (Compact)',
    sublabel: 'ไฟล์เล็กลงมาก เหมาะส่งอีเมล (45%)',
    quality: 0.45,
    maxDim: 1600,
  },
  {
    id: 'smallest',
    label: 'เล็กที่สุด (Smallest)',
    sublabel: 'บีบอัดสูงสุด ส่งไวที่สุด (25%)',
    quality: 0.25,
    maxDim: 1200,
  },
];

export const PAGE_SIZE_OPTIONS: { id: PageSizeOption; label: string; desc: string }[] = [
  { id: 'fit', label: 'ตามขนาดรูป (Fit)', desc: 'พอดีกับขนาดภาพแต่ละหน้า' },
  { id: 'a4', label: 'A4', desc: '210 × 297 mm' },
  { id: 'letter', label: 'Letter', desc: '8.5 × 11 in' },
  { id: 'legal', label: 'Legal', desc: '8.5 × 14 in' },
  { id: 'a3', label: 'A3', desc: '297 × 420 mm' },
  { id: 'a5', label: 'A5', desc: '148 × 210 mm' },
];

export const MARGIN_OPTIONS: { id: MarginOption; label: string; pts: number }[] = [
  { id: 'none', label: 'ไม่มี (0)', pts: 0 },
  { id: 'small', label: 'เล็ก (10mm)', pts: 28.35 },
  { id: 'medium', label: 'กลาง (20mm)', pts: 56.69 },
  { id: 'large', label: 'ใหญ่ (30mm)', pts: 85.04 },
];

// Standard PDF page sizes in points (1 inch = 72 pt)
export const PAGE_DIMENSIONS_PT: Record<Exclude<PageSizeOption, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
  a3: [841.89, 1190.55],
  a5: [419.53, 595.28],
};
