import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  isOfficial: boolean;
}

export const OFFICIAL_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', isOfficial: true },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', isOfficial: true },
];

export const AUTO_LANGUAGES: LanguageOption[] = [
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ay', name: 'Aymara', nativeName: 'Aymar aru' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  { code: 'bm', name: 'Bambara', nativeName: 'Bamanankan' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano' },
  { code: 'ny', name: 'Chichewa', nativeName: 'Chichewa' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '中文 (简体)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文 (繁體)' },
  { code: 'co', name: 'Corsican', nativeName: 'Corsu' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'dv', name: 'Dhivehi', nativeName: 'ދިވެހި' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'ee', name: 'Ewe', nativeName: 'Eʋegbe' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'fy', name: 'Frisian', nativeName: 'Frysk' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'gn', name: 'Guarani', nativeName: "Avañe'ẽ" },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi' },
  { code: 'iw', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hmn', name: 'Hmong', nativeName: 'Hmoob' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
  { code: 'ilo', name: 'Ilocano', nativeName: 'Ilokano' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'jw', name: 'Javanese', nativeName: 'Basa Jawa' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Kinyarwanda' },
  { code: 'gom', name: 'Konkani', nativeName: 'कोंकणी' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'kri', name: 'Krio', nativeName: 'Krio' },
  { code: 'ku', name: 'Kurdish (Kurmanji)', nativeName: 'Kurdî' },
  { code: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'کوردی' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'ln', name: 'Lingala', nativeName: 'Lingála' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'lg', name: 'Luganda', nativeName: 'Luganda' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
  { code: 'mi', name: 'Maori', nativeName: 'Māori' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'mni-Mtei', name: 'Meiteilon (Manipuri)', nativeName: 'ꯃꯩꯇꯩꯂꯣꯟ' },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
  { code: 'my', name: 'Myanmar (Burmese)', nativeName: 'မြန်မာ' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'or', name: 'Odia (Oriya)', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'qu', name: 'Quechua', nativeName: 'Runasimi' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { code: 'gd', name: 'Scots Gaelic', nativeName: 'Gàidhlig' },
  { code: 'nso', name: 'Sepedi', nativeName: 'Sepedi' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'st', name: 'Sesotho', nativeName: 'Sesotho' },
  { code: 'sn', name: 'Shona', nativeName: 'ChiShona' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'tt', name: 'Tatar', nativeName: 'Татар' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ' },
  { code: 'ts', name: 'Tsonga', nativeName: 'Xitsonga' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe' },
  { code: 'ak', name: 'Twi', nativeName: 'Twi' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە' },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbek" },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
].map((l) => ({ ...l, isOfficial: false }));

export const ALL_LANGUAGES: LanguageOption[] = [...OFFICIAL_LANGUAGES, ...AUTO_LANGUAGES];

function loadAutoCache(prefix: string, lang: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`${prefix}_auto_${lang}`);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveAutoCache(prefix: string, lang: string, map: Record<string, string>): void {
  try {
    localStorage.setItem(`${prefix}_auto_${lang}`, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const tokens: string[] = [];
  const masked = text.replace(/\{\{(\w+)\}\}/g, (m) => {
    const idx = tokens.length;
    tokens.push(m);
    return `__VAR${idx}__`;
  });

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(
    targetLang
  )}&dt=t&q=${encodeURIComponent(masked)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as Array<Array<[string, string]>>;
  const translated = (data[0] ?? []).map((seg) => seg[0] ?? '').join('');
  return translated.replace(/__VAR(\d+)__/g, (_, i) => tokens[Number(i)] ?? _);
}

function collectStrings(node: unknown, out: Set<string>): void {
  if (typeof node === 'string') {
    if (node.trim()) out.add(node);
    return;
  }
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const val of Object.values(node)) {
      collectStrings(val, out);
    }
  }
}

function mapStrings<T>(node: T, lookup: (s: string) => string): T {
  if (typeof node === 'string') {
    return lookup(node) as T;
  }
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      res[k] = mapStrings(v, lookup);
    }
    return res as T;
  }
  return node;
}

export function useTranslatedPack<T extends object>(
  lang: string,
  officialPacks: Record<'en' | 'th', T>,
  storagePrefix: string,
  extraTemplates: Record<string, string> = {}
): { t: T; translateTemplate: (template: string, vars: Record<string, string | number>) => string } {
  const [cache, setCache] = useState<Record<string, Record<string, string>>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  const isOfficial = lang === 'en' || lang === 'th';

  useEffect(() => {
    if (isOfficial) return;

    const existing = cache[lang] ?? loadAutoCache(storagePrefix, lang);
    if (!cache[lang]) {
      setCache((prev) => ({ ...prev, [lang]: existing }));
    }

    const strings = new Set<string>();
    collectStrings(officialPacks.en, strings);
    for (const tpl of Object.values(extraTemplates)) {
      if (tpl.trim()) strings.add(tpl);
    }

    const missing = Array.from(strings).filter(
      (s) => !existing[s] && !inFlightRef.current.has(`${lang}::${s}`)
    );
    if (missing.length === 0) return;

    let cancelled = false;
    const run = async () => {
      const updated = { ...existing };
      const batchSize = 10;
      for (let i = 0; i < missing.length; i += batchSize) {
        if (cancelled) return;
        const batch = missing.slice(i, i + batchSize);
        batch.forEach((s) => inFlightRef.current.add(`${lang}::${s}`));
        await Promise.all(
          batch.map(async (src) => {
            try {
              const dst = await translateText(src, lang);
              if (dst && dst.trim()) {
                updated[src] = dst;
              }
            } catch {
              // Keep English fallback
            }
          })
        );
        if (cancelled) return;
        saveAutoCache(storagePrefix, lang, updated);
        setCache((prev) => ({ ...prev, [lang]: { ...updated } }));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [lang, isOfficial, officialPacks, storagePrefix, extraTemplates, cache]);

  const lookup = useCallback(
    (s: string) => {
      if (isOfficial) return s;
      return cache[lang]?.[s] || s;
    },
    [isOfficial, cache, lang]
  );

  const t = useMemo(() => {
    if (lang === 'th') return officialPacks.th;
    if (lang === 'en') return officialPacks.en;
    return mapStrings(officialPacks.en, lookup);
  }, [lang, officialPacks, lookup]);

  const translateTemplate = useCallback(
    (template: string, vars: Record<string, string | number>) => {
      const translated = lookup(template);
      return translated.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
        k in vars ? String(vars[k]) : `{{${k}}}`
      );
    },
    [lookup]
  );

  return { t, translateTemplate };
}
