import type { CompressionLevel, MarginOption, PageSizeOption } from './types/pdf';

export type Language = 'en' | 'th';

export interface Translations {
  subtitle: string;
  pageCount: (count: number) => string;
  addFiles: string;
  clearAll: string;
  dropTitle: string;
  dropDesc: string;
  chooseFiles: string;
  rotateTitle: string;
  deleteTitle: string;
  dropOverlay: string;
  orientationLabel: string;
  orientationFitHint: string;
  portrait: string;
  landscape: string;
  pageSizeLabel: string;
  fitLabel: string;
  fitDesc: string;
  marginLabel: string;
  margins: Record<MarginOption, { short: string; title: string }>;
  compressionLabel: string;
  compressions: Record<CompressionLevel, { label: string; sublabel: string }>;
  sponsored: string;
  adPlaceholder: string;
  adVerticalPlaceholder: string;
  buyMeOrange: string;
  gridSizeLabel: string;
  gridSizes: { sm: string; md: string; lg: string };
  generating: string;
  generateCta: string;
  downloadSuccess: (count: number, size: string) => string;
  generateError: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    subtitle: 'Convert images & files to PDF • Reorder & compress in browser',
    pageCount: (count) => `${count} ${count === 1 ? 'page' : 'pages'}`,
    addFiles: 'Add files',
    clearAll: 'Clear all',
    dropTitle: 'Drag & drop files here, or click to select',
    dropDesc: 'Supports images (JPG, PNG, WebP, GIF, BMP) and PDFs. Drag cards to reorder pages.',
    chooseFiles: 'Choose files',
    rotateTitle: 'Rotate 90°',
    deleteTitle: 'Delete page',
    dropOverlay: 'Drop files to add pages',
    orientationLabel: 'Page orientation',
    orientationFitHint: 'Follows image',
    portrait: 'Portrait',
    landscape: 'Landscape',
    pageSizeLabel: 'Page size',
    fitLabel: 'Fit to image',
    fitDesc: 'Match each image size',
    marginLabel: 'Margin',
    margins: {
      none: { short: 'No margin', title: 'No margin (0)' },
      small: { short: 'Small', title: 'Small (10mm)' },
      medium: { short: 'Medium', title: 'Medium (20mm)' },
      large: { short: 'Big', title: 'Big (30mm)' },
    },
    compressionLabel: 'Compression',
    compressions: {
      none: { label: 'No compression (Original)', sublabel: '100% original quality' },
      high: { label: 'High quality', sublabel: 'Sharp, slight size reduction (90%)' },
      balanced: { label: 'Balanced', sublabel: 'Recommended • Good clarity & size (70%)' },
      compact: { label: 'Compact', sublabel: 'Much smaller, great for email (45%)' },
      smallest: { label: 'Smallest', sublabel: 'Max compression, fastest upload (25%)' },
    },
    sponsored: 'Sponsored',
    adPlaceholder: 'Ad banner space (300×60 / AdSense)',
    adVerticalPlaceholder: 'Ad space\n160 × 600',
    buyMeOrange: 'Buy me an orange',
    gridSizeLabel: 'Grid size',
    gridSizes: { sm: 'Small', md: 'Medium', lg: 'Large' },
    generating: 'Generating PDF...',
    generateCta: 'Create & Download PDF',
    downloadSuccess: (count, size) =>
      `Downloaded! (${count} ${count === 1 ? 'page' : 'pages'} • ${size})`,
    generateError: 'Failed to generate PDF. Please try again.',
  },
  th: {
    subtitle: 'แปลงรูปและไฟล์เป็น PDF • จัดลำดับหน้า & บีบอัดในเบราว์เซอร์',
    pageCount: (count) => `${count} หน้า`,
    addFiles: 'เพิ่มไฟล์',
    clearAll: 'ล้างทั้งหมด',
    dropTitle: 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์',
    dropDesc: 'รองรับไฟล์รูปภาพ (JPG, PNG, WebP, GIF, BMP) และไฟล์ PDF สามารถลากการ์ดเพื่อสลับลำดับหน้าได้',
    chooseFiles: 'เลือกไฟล์จากเครื่อง',
    rotateTitle: 'หมุนภาพ 90°',
    deleteTitle: 'ลบหน้านี้',
    dropOverlay: 'วางไฟล์เพื่อเพิ่มหน้าใหม่',
    orientationLabel: 'แนวกระดาษ (Orientation)',
    orientationFitHint: 'ตามขนาดภาพ',
    portrait: 'แนวตั้ง',
    landscape: 'แนวนอน',
    pageSizeLabel: 'ขนาดหน้ากระดาษ (Page size)',
    fitLabel: 'ตามขนาดรูป (Fit)',
    fitDesc: 'พอดีกับขนาดภาพแต่ละหน้า',
    marginLabel: 'ขอบกระดาษ (Margin)',
    margins: {
      none: { short: 'ไม่มี', title: 'ไม่มี (0)' },
      small: { short: 'เล็ก', title: 'เล็ก (10mm)' },
      medium: { short: 'กลาง', title: 'กลาง (20mm)' },
      large: { short: 'ใหญ่', title: 'ใหญ่ (30mm)' },
    },
    compressionLabel: 'การบีบอัดไฟล์ (Compress)',
    compressions: {
      none: { label: 'ไม่บีบอัด (Original)', sublabel: 'คุณภาพต้นฉบับ 100%' },
      high: { label: 'คุณภาพสูง (High)', sublabel: 'คมชัดมาก ลดขนาดเล็กน้อย (90%)' },
      balanced: { label: 'สมดุล (Balanced)', sublabel: 'แนะนำ • ชัดกำลังดี ไฟล์ไม่ใหญ่ (70%)' },
      compact: { label: 'ประหยัดพื้นที่ (Compact)', sublabel: 'ไฟล์เล็กลงมาก เหมาะส่งอีเมล (45%)' },
      smallest: { label: 'เล็กที่สุด (Smallest)', sublabel: 'บีบอัดสูงสุด ส่งไวที่สุด (25%)' },
    },
    sponsored: 'Sponsored • พื้นที่โฆษณา',
    adPlaceholder: 'พื้นที่สำหรับแบนเนอร์โฆษณา (300×60 / AdSense)',
    adVerticalPlaceholder: 'พื้นที่โฆษณา\n160 × 600',
    buyMeOrange: 'Buy me an orange',
    gridSizeLabel: 'ขนาดตาราง',
    gridSizes: { sm: 'เล็ก', md: 'กลาง', lg: 'ใหญ่' },
    generating: 'กำลังสร้าง PDF...',
    generateCta: 'สร้าง & ดาวน์โหลด PDF',
    downloadSuccess: (count, size) => `ดาวน์โหลดสำเร็จ! (${count} หน้า • ${size})`,
    generateError: 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF กรุณาลองใหม่อีกครั้ง',
  },
};

export function getPageSizeDisplay(
  id: PageSizeOption,
  defaultLabel: string,
  defaultDesc: string,
  t: Translations
): string {
  if (id === 'fit') return `${t.fitLabel} (${t.fitDesc})`;
  return `${defaultLabel} (${defaultDesc})`;
}
