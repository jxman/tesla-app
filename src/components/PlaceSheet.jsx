import { useEffect } from "react";
import { FiX, FiMic, FiMapPin, FiClock, FiPhone, FiGlobe, FiNavigation, FiExternalLink } from "react-icons/fi";
import { openDirections } from "../shared/directions";
import { formatPhone, websiteLabel, shortAddress, voicePhrase } from "../shared/placeDetails";

// Design tokens (values live in src/index.css and switch with .dark)
const C = {
  card: "var(--card)",
  deep: "var(--surface-deep)",
  line: "var(--line)",
  text: "var(--text)",
  mute: "var(--mute)",
  accent: "var(--arrowBlue)",
  ok: "var(--open-fg)",
  bad: "var(--closed-fg)",
};

function Row({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: C.mute }} />
      <div className="min-w-0 flex-1" style={{ color: C.text, fontSize: "clamp(15px, 2.2vw, 18px)", lineHeight: 1.35 }}>{children}</div>
    </div>
  );
}

/**
 * Details for a place, shown instead of leaving the app: what to say to the
 * car's voice assistant (the browser can't hand a destination to the car's
 * navigation), plus address, hours, phone and website. Google Maps directions
 * stay one tap away.
 *
 * place: { name, voiceName?, subtitle?, address?, phone?, website?, openNow?, hoursLabel?, travel?, lat, lon }
 * from:  { lat, lon } — the app's current location, used as the directions origin
 */
export default function PlaceSheet({ place, from, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!place) return null;
  const address = shortAddress(place.address);
  const phone = formatPhone(place.phone);
  const site = websiteLabel(place.website);
  // voiceName: null = say the address only (saved places: "Work" isn't searchable)
  const phrase = voicePhrase({ name: place.voiceName === undefined ? place.name : place.voiceName, address });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={place.name}
    >
      <div
        className="w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth: 620, maxHeight: "calc(100vh - 32px)", background: C.card, border: `1px solid ${C.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-2">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold truncate" style={{ color: C.text, fontSize: "clamp(20px, 3vw, 26px)", lineHeight: 1.2 }}>{place.name}</h2>
            {place.subtitle && (
              <div className="truncate" style={{ color: C.mute, fontSize: "clamp(13px, 1.9vw, 16px)" }}>{place.subtitle}</div>
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

        <div className="overflow-y-auto px-5 pb-2 flex flex-col gap-3">
          {/* Voice command — the main way to start navigation from here */}
          <div className="rounded-xl px-4 py-3" style={{ background: C.deep, border: `1.5px solid ${C.accent}` }}>
            <div className="flex items-center gap-2 font-mono uppercase tracking-wider" style={{ color: C.accent, fontSize: 12 }}>
              <FiMic className="w-4 h-4" /> Say to your car
            </div>
            <div className="font-semibold mt-1" style={{ color: C.text, fontSize: "clamp(18px, 2.8vw, 23px)", lineHeight: 1.3 }}>
              “{phrase}”
            </div>
            <div className="mt-1" style={{ color: C.mute, fontSize: "clamp(12px, 1.7vw, 14px)" }}>
              Press the voice button on the steering wheel, or say “Hey Grok” first
            </div>
          </div>

          {address && <Row icon={FiMapPin}>{address}</Row>}
          {place.travel && <Row icon={FiNavigation}>{place.travel}</Row>}
          {(place.openNow != null || place.hoursLabel) && (
            <Row icon={FiClock}>
              {place.openNow != null && (
                <span className="font-semibold" style={{ color: place.openNow ? C.ok : C.bad }}>
                  {place.openNow ? "Open" : "Closed"}
                </span>
              )}
              {place.hoursLabel && <span style={{ color: C.mute }}>{place.openNow != null ? " · " : ""}{place.hoursLabel}</span>}
            </Row>
          )}
          {phone && <Row icon={FiPhone}><span className="tabular-nums">{phone}</span></Row>}
          {site && (
            <Row icon={FiGlobe}>
              <a href={place.website.split(";")[0].trim()} target="_blank" rel="noopener noreferrer" className="underline break-all" style={{ color: C.accent }}>
                {site}
              </a>
            </Row>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={() => openDirections(from, place)}
            className="flex-1 h-14 flex items-center justify-center gap-2 rounded-xl font-medium"
            style={{ color: C.text, background: C.deep, border: `1px solid ${C.line}`, fontSize: 16 }}
          >
            <FiExternalLink className="w-5 h-5" /> Google Maps directions
          </button>
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
