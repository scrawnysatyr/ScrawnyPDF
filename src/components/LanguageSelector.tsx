import React, { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { ALL_LANGUAGES } from '../utils/autoTranslate';

interface LanguageSelectorProps {
  lang: string;
  onChange: (code: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ lang, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const current = ALL_LANGUAGES.find((l) => l.code === lang) ?? ALL_LANGUAGES[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredLanguages = normalizedQuery
    ? ALL_LANGUAGES.filter(
        (opt) =>
          opt.name.toLowerCase().includes(normalizedQuery) ||
          opt.nativeName.toLowerCase().includes(normalizedQuery) ||
          opt.code.toLowerCase().includes(normalizedQuery)
      )
    : ALL_LANGUAGES;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Language"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#27272c] hover:bg-[#303036] border border-white/10 hover:border-[#ff7300] text-xs font-medium text-[#d4d4d8] hover:text-white transition cursor-pointer"
      >
        <Globe className="w-3.5 h-3.5 text-[#ff7300] shrink-0" />
        <span className="uppercase font-bold tracking-wider">
          {current.code.split('-')[0]}
        </span>
        <span
          className={`hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            current.isOfficial
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-sky-500/15 text-sky-400'
          }`}
        >
          {current.isOfficial ? '(Official)' : '(Auto)'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-64 max-h-80 overflow-y-auto rounded-xl bg-[#0c0c0d] border border-[#222226] shadow-2xl py-1.5 z-50">
          <div className="px-2.5 pb-1.5 pt-1 sticky top-0 bg-[#0c0c0d] border-b border-[#222226]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search language..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#18181b] border border-[#222226] focus:border-[#ff7300] outline-none text-xs text-white placeholder-[#8a8a93]"
            />
          </div>
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8a8a93]">
            Language ({filteredLanguages.length})
          </div>
          {filteredLanguages.map((opt) => {
            const selected = opt.code === lang;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  onChange(opt.code);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                  selected
                    ? 'bg-[#ff7300]/15 text-white'
                    : 'text-[#d4d4d8] hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold truncate">{opt.nativeName}</span>
                  <span className="text-[11px] text-[#8a8a93] truncate">{opt.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      opt.isOfficial
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-sky-500/15 text-sky-400'
                    }`}
                  >
                    {opt.isOfficial ? '(Official)' : '(Auto)'}
                  </span>
                  {selected && <Check className="w-3.5 h-3.5 text-[#ff7300]" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
