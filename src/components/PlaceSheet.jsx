import { FiMic, FiExternalLink } from "react-icons/fi";
import DetailSheet, { Stat, Block, C } from "./DetailSheet";
import { openDirections } from "../shared/directions";
import { formatPhone, websiteLabel, shortAddress, voicePhrase } from "../shared/placeDetails";

/**
 * Details for a place, shown instead of leaving the app: what to say to the
 * car's voice assistant (the browser can't hand a destination to the car's
 * navigation), plus address, phone and website. No map: for a place, the name
 * and address to say matter more than where it sits. Google Maps directions
 * stay one tap away.
 *
 * place: { name, voiceName?, subtitle?, address?, phone?, website?, stats?, lat, lon }
 *   stats: [{ label, value, unit?, note?, color? }] — up to 3 tiles across the top
 *   voiceName: null = say the address only (saved places: "Work" isn't searchable)
 * from:  { lat, lon } — the app's current location, used as the directions origin
 */
export default function PlaceSheet({ place, from, onClose }) {
  if (!place) return null;
  const address = shortAddress(place.address);
  const phone = formatPhone(place.phone);
  const site = websiteLabel(place.website);
  const phrase = voicePhrase({ name: place.voiceName === undefined ? place.name : place.voiceName, address });
  const stats = (place.stats || []).slice(0, 3);

  return (
    <DetailSheet
      title={place.name}
      subtitle={place.subtitle}
      maxWidth={620}
      onClose={onClose}
      secondary={{ label: "Google Maps directions", icon: FiExternalLink, onClick: () => openDirections(from, place) }}
    >
      <div className="flex flex-col gap-3">
        {stats.length > 0 && (
          <div className={`grid gap-2 ${stats.length === 3 ? "grid-cols-3" : stats.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {stats.map((s) => <Stat key={s.label} {...s} />)}
          </div>
        )}

        {/* The main way to start navigation from here */}
        <Block label="Say to your car" icon={FiMic} accent>
          <div className="font-semibold" style={{ fontSize: "clamp(18px, 2.8vw, 23px)", lineHeight: 1.3 }}>“{phrase}”</div>
          <div className="mt-1" style={{ color: C.mute, fontSize: "clamp(12px, 1.7vw, 14px)" }}>
            Press the voice button on the steering wheel, or say “Hey Grok” first
          </div>
        </Block>

        {/* Side by side when both exist, to keep the sheet short at 601 px tall */}
        <div className={`grid gap-3 ${address && (phone || site) ? "sm:grid-cols-2" : ""}`}>
          {address && <Block label="Address">{address}</Block>}

          {(phone || site) && (
            <Block label="Contact">
              {phone && <div className="tabular-nums">{phone}</div>}
              {site && (
                <a
                  href={place.website.split(";")[0].trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline break-all"
                  style={{ color: C.accent }}
                >
                  {site}
                </a>
              )}
            </Block>
          )}
        </div>
      </div>
    </DetailSheet>
  );
}
