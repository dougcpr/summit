import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "@phosphor-icons/react";
import { THEMES, type ThemeId, getThemePreference, setThemePreference } from "../lib/preferences";

interface ThemePickerProps {
  variant: "sidebar" | "tabbar";
}

export function ThemePicker({ variant }: ThemePickerProps) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(getThemePreference);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const choose = (id: ThemeId) => {
    setTheme(id);
    setThemePreference(id);
    setOpen(false);
  };

  const isSidebar = variant === "sidebar";

  return (
    <div ref={ref} className={isSidebar ? "relative" : "relative flex-1 flex"}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        aria-expanded={open}
        className={
          isSidebar
            ? `flex flex-col items-center p-2 rounded-lg text-sm ${open ? "text-primary bg-primary/10" : "text-border/50 hover:text-border"}`
            : `flex-1 flex flex-col items-center py-2 text-sm ${open ? "text-primary" : "text-border/50"}`
        }
      >
        <Palette size={24} weight="bold" />
        {!isSidebar && <span>Theme</span>}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 w-52 p-1.5 rounded-lg border border-border/15 bg-card-bg shadow-lg ${
            isSidebar ? "left-full bottom-0 ml-2" : "bottom-full right-0 mb-2"
          }`}
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="menuitemradio"
              aria-checked={theme === t.id}
              onClick={() => choose(t.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-lg ${
                theme === t.id ? "bg-primary/15" : "hover:bg-border/5"
              }`}
            >
              <span className="flex -space-x-1.5">
                {t.swatches.map((c) => (
                  <span key={c} className="h-4 w-4 rounded-full border border-white/70" style={{ backgroundColor: c }} />
                ))}
              </span>
              <span className="flex-1">{t.label}</span>
              {theme === t.id && <Check size={16} weight="bold" className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
