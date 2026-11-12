import { useEffect } from "react";
import { FiX } from "react-icons/fi";

// Shared frame for the details windows (PlaceSheet, IncidentSheet): overlay,
// header with close button, scrolling body, and two bottom buttons. Stat and
// Block are the glanceable building blocks used inside the body.

export const C = {
  card: "var(--card)",
  deep: "var(--surface-deep)",
  line: "var(--line)",
  text: "var(--text)",
  mute: "var(--mute)",
  accent: "var(--arrowBlue)",
};

const LABEL_STYLE = { color: C.mute, fontSize: 12, letterSpacing: "0.06em" };

/** Big number tile: LABEL / value unit / optional note line. */
export function Stat({ label, value, unit, note, color }) {
  return (
    <div className="rounded-xl px-3 py-2 min-w-0" style={{ background: C.deep, border: `1px solid ${C.line}` }}>
      <div className="font-mono uppercase truncate" style={LABEL_STYLE}>{label}</div>
      <div className="leading-tight mt-0.5 whitespace-nowrap truncate">
        <span className="font-semibold tabular-nums" style={{ color: color || C.text, fontSize: "clamp(20px, 3.2vw, 28px)" }}>{value}</span>
        {unit && <span style={{ color: C.mute, fontSize: "clamp(12px, 1.7vw, 15px)" }}> {unit}</span>}
      </div>
      {note && <div className="truncate" style={{ color: C.mute, fontSize: "clamp(12px, 1.6vw, 14px)" }}>{note}</div>}
    </div>
  );
}

/** Labelled block of text; `accent` highlights the main action (voice command). */
export function Block({ label, icon: Icon, accent, children }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: C.deep, border: accent ? `1.5px solid ${C.accent}` : `1px solid ${C.line}` }}
    >
      <div className="font-mono uppercase mb-1 flex items-center gap-1.5" style={{ ...LABEL_STYLE, color: accent ? C.accent : C.mute }}>
        {Icon && <Icon className="w-3.5 h-3.5" />} {label}
      </div>
      <div style={{ color: C.text, fontSize: "clamp(14px, 2vw, 17px)", lineHeight: 1.35 }}>{children}</div>
    </div>
  );
}

/**
 * title, subtitle, subtitleColor, icon, iconColor — header
 * secondary: { label, icon, onClick } — left bottom button (Close is always right)
 * maxWidth — 560–760 depending on content
 */
export default function DetailSheet({
  title, subtitle, subtitleColor, icon: Icon, iconColor, secondary, maxWidth = 620, onClose, children,
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const SecondaryIcon = secondary?.icon;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth, maxHeight: "calc(100vh - 32px)", background: C.card, border: `1px solid ${C.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 pt-4 pb-2">
          {Icon && <Icon className="w-7 h-7 flex-shrink-0 mt-0.5" style={{ color: iconColor || C.mute }} />}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold truncate" style={{ color: C.text, fontSize: "clamp(20px, 3vw, 26px)", lineHeight: 1.2 }}>{title}</h2>
            {subtitle && (
              <div className="truncate" style={{ color: subtitleColor || C.mute, fontSize: "clamp(13px, 1.9vw, 16px)" }}>{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl"
            style={{ color: C.text, background: C.deep, border: `1px solid ${C.line}` }}
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 pb-2">{children}</div>

        <div className="flex gap-2 px-5 py-4">
          {secondary && (
            <button
              onClick={secondary.onClick}
              className="flex-1 h-14 flex items-center justify-center gap-2 rounded-xl font-medium"
              style={{ color: C.text, background: C.deep, border: `1px solid ${C.line}`, fontSize: 16 }}
            >
              {SecondaryIcon && <SecondaryIcon className="w-5 h-5" />} {secondary.label}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-xl font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900"
            style={{ fontSize: 16 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
