import { useContext, useState, useMemo } from "react";
import moment from "moment";
import { FiRefreshCw } from "react-icons/fi";
import {
  WiDaySunny, WiNightClear,
  WiDayCloudy, WiNightPartlyCloudy,
  WiDaySunnyOvercast, WiNightCloudy,
  WiCloudy,
  WiDayShowers, WiNightShowers,
  WiDayRain, WiNightRain,
  WiDayThunderstorm, WiNightThunderstorm,
  WiDaySnow, WiNightSnow,
  WiDayFog, WiNightFog,
} from "react-icons/wi";
import TeslaAppContext from "../context/TeslaAppContext";
import Spinner from "../shared/Spinner";

// OWM icon code → { Icon component, color }
const OWM_TO_WI = {
  '01d': { Icon: WiDaySunny,          color: '#FFB800' },
  '01n': { Icon: WiNightClear,        color: '#C8D8FF' },
  '02d': { Icon: WiDayCloudy,         color: '#7EB3E0' },
  '02n': { Icon: WiNightPartlyCloudy, color: '#8B9CC0' },
  '03d': { Icon: WiDaySunnyOvercast,  color: '#9BA8B8' },
  '03n': { Icon: WiNightCloudy,       color: '#788899' },
  '04d': { Icon: WiCloudy,            color: '#9BA8B8' },
  '04n': { Icon: WiCloudy,            color: '#788899' },
  '09d': { Icon: WiDayShowers,        color: '#5B9BD5' },
  '09n': { Icon: WiNightShowers,      color: '#4A88C0' },
  '10d': { Icon: WiDayRain,           color: '#4A88C0' },
  '10n': { Icon: WiNightRain,         color: '#3A78B0' },
  '11d': { Icon: WiDayThunderstorm,   color: '#8877CC' },
  '11n': { Icon: WiNightThunderstorm, color: '#7766BB' },
  '13d': { Icon: WiDaySnow,           color: '#A8C8FF' },
  '13n': { Icon: WiNightSnow,         color: '#98B8F0' },
  '50d': { Icon: WiDayFog,            color: '#9AABB8' },
  '50n': { Icon: WiNightFog,          color: '#7A8A97' },
};

const FALLBACK_WI = { Icon: WiDaySunny, color: '#FFB800' };

function WeatherIcon({ code, size }) {
  const { Icon, color } = OWM_TO_WI[code] ?? FALLBACK_WI;
  return <Icon size={size} color={color} style={{ flexShrink: 0 }} />;
}

const PRECIP_MAINS = new Set(['Rain', 'Drizzle', 'Thunderstorm', 'Snow']);

// ── Insight selectors ──────────────────────────────────────────────────────

function toF(c) { return Math.round(c * 9 / 5 + 32); }

function deriveDriving(data) {
  const tempF = toF(data.main.temp);
  const windMph = Math.round((data.wind?.speed || 0) * 2.237);
  const currentPrecip = PRECIP_MAINS.has(data.weather[0].main);
  const visMi = data.visibility ? data.visibility / 1609 : 10;
  const rangeImpact = tempF < 70 ? Math.round((70 - tempF) / 5) : 0;

  let headline;
  if (currentPrecip && visMi < 5) headline = 'Wet roads, low visibility';
  else if (currentPrecip) headline = 'Wet roads ahead';
  else if (windMph > 20) headline = `Strong winds — ${windMph} mph`;
  else headline = 'Good driving conditions';

  const parts = windMph > 0 ? [`Wind ${windMph} mph`] : [];
  parts.push(rangeImpact > 0 ? `Range impact: −${rangeImpact}% on highway` : 'Range unaffected');

  return { headline, sub: parts.join('. ') + '.' };
}

// Interpolate 3-hour OWM intervals → 12 hourly temp readings (°F)
function buildHourlyTemps(forecastList) {
  const intervals = (forecastList || []).slice(0, 5);
  if (intervals.length < 2) return [];
  const out = [];
  for (let i = 0; i < intervals.length - 1 && out.length < 12; i++) {
    const startF = toF(intervals[i].main.temp);
    const endF = toF(intervals[i + 1].main.temp);
    for (let h = 0; h < 3 && out.length < 12; h++) {
      out.push(Math.round(startF + (endF - startF) * (h / 3)));
    }
  }
  return out;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatTile({ label, value, unit }) {
  return (
    <div className="flex flex-col gap-0.5 bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/60 rounded-xl overflow-hidden" style={{ padding: 'clamp(4px, 1vh, 10px)' }}>
      <span className="text-gray-400 dark:text-gray-500 font-mono tracking-wide uppercase whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 'clamp(8px, 1.2vh, 10px)' }}>{label}</span>
      <span className="font-semibold text-gray-900 dark:text-white leading-none whitespace-nowrap" style={{ fontSize: 'clamp(11px, 2vh, 16px)' }}>
        {value}
        {unit && <span className="text-gray-400 dark:text-gray-500 font-normal ml-0.5" style={{ fontSize: 'clamp(9px, 1.6vh, 12px)' }}>{unit}</span>}
      </span>
    </div>
  );
}

function ForecastRow({ label, isActive, icon, description, primary, secondary }) {
  return (
    <div className={`flex-1 flex items-center gap-1.5 rounded-lg px-2 ${isActive ? 'bg-blue-600/10' : 'bg-gray-200/50 dark:bg-gray-900/40'}`} style={{ minHeight: 0 }}>
      <span className={`font-mono w-9 flex-shrink-0 ${isActive ? 'text-blue-500 dark:text-blue-300 font-semibold' : 'text-gray-500 dark:text-gray-400'}`} style={{ fontSize: 'clamp(9px, 1.5vh, 12px)' }}>
        {label}
      </span>
      {icon}
      <span className="text-gray-500 dark:text-gray-400 capitalize truncate flex-1" style={{ fontSize: 'clamp(9px, 1.5vh, 12px)' }}>{description}</span>
      <span className="font-semibold text-gray-900 dark:text-white w-7 text-right flex-shrink-0" style={{ fontSize: 'clamp(10px, 1.7vh, 14px)' }}>{primary}</span>
      <span className="text-gray-400 dark:text-gray-500 w-9 text-right flex-shrink-0" style={{ fontSize: 'clamp(9px, 1.5vh, 12px)' }}>{secondary}</span>
    </div>
  );
}

function InsightCard({ label, headline, sub }) {
  return (
    <div style={{ background: 'var(--surface-deep)', border: '1px solid var(--line)', borderRadius: 14, padding: 'clamp(6px, 1.4vh, 14px) clamp(8px, 1.8vh, 16px)', overflow: 'hidden' }}>
      <div style={{ font: '500 10px/1 \'JetBrains Mono\', monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)' }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 'clamp(12px, 2vh, 18px)', marginTop: 'clamp(3px, 0.8vh, 8px)', lineHeight: 1.2, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {headline}
      </div>
      <div style={{ fontSize: 'clamp(9px, 1.5vh, 13px)', color: 'var(--mute)', marginTop: 'clamp(2px, 0.6vh, 6px)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {sub}
      </div>
    </div>
  );
}

function SparkCard({ pts, nowTemp, endTemp }) {
  const W = 540, H = 80, pad = 6;
  const minV = Math.min(...pts) - 2;
  const maxV = Math.max(...pts) + 2;
  const range = maxV - minV || 1;
  const xs = pts.map((_, i) => pad + i * ((W - pad * 2) / (pts.length - 1)));
  const ys = pts.map(v => H - pad - ((v - minV) / range) * (H - pad * 2));
  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x} ${ys[i]}`).join(' ');
  const fillPath = `${linePath} L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`;

  return (
    <div style={{ background: 'var(--surface-deep)', border: '1px solid var(--line)', borderRadius: 14, padding: 'clamp(8px, 1.6vh, 16px) clamp(10px, 1.8vh, 18px)', marginTop: 'clamp(6px, 1.4vh, 14px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ font: '500 10px/1 \'JetBrains Mono\', monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)', whiteSpace: 'nowrap' }}>
          Next 12 hours
        </span>
        <span style={{ fontSize: 'clamp(10px, 1.6vh, 12px)', color: 'var(--mute)', whiteSpace: 'nowrap' }}>
          <strong style={{ color: 'var(--text)' }}>{nowTemp}°</strong> now → <strong style={{ color: 'var(--text)' }}>{endTemp}°</strong> in 12 h
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', marginTop: 'clamp(4px, 1vh, 10px)', maxHeight: 'clamp(28px, 6.5vh, 80px)' }}>
        <defs>
          <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4d7cff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#4d7cff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#grad)" />
        <path d={linePath} fill="none" stroke="#6db4ff" strokeWidth="2" strokeLinejoin="round" />
        {xs.map((x, i) => i % 3 === 0 && (
          <g key={i}>
            <circle cx={x} cy={ys[i]} r="3" fill="#6db4ff" />
            <text x={x} y={ys[i] - 8} fontSize="11" fontFamily="JetBrains Mono, monospace" fill="var(--mute)" textAnchor="middle">
              {pts[i]}°
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

function Weather() {
  const { data, forecastData, isLoading, refreshWeather } = useContext(TeslaAppContext);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHourly, setShowHourly] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refreshWeather(); } catch (e) { console.error(e); }
    finally { setIsRefreshing(false); }
  };

  const dailyForecast = useMemo(() => {
    if (!forecastData?.list) return [];
    const dailyData = {};
    forecastData.list.forEach(item => {
      const day = moment.unix(item.dt).format('YYYY-MM-DD');
      if (!dailyData[day]) dailyData[day] = { date: item.dt, temps: [], weather: item.weather[0], pop: item.pop };
      dailyData[day].temps.push(item.main.temp);
      if (item.pop > dailyData[day].pop) dailyData[day].pop = item.pop;
    });
    return Object.values(dailyData);
  }, [forecastData]);

  const forecastList = forecastData?.list || [];
  const driving = useMemo(() => data?.main ? deriveDriving(data) : null, [data]);
  const hourlyTemps = useMemo(() => buildHourlyTemps(forecastList), [forecastList]);

  if (isLoading) return <Spinner />;

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-xl mb-3 text-gray-500 dark:text-gray-300">No Weather Data</p>
        <p className="text-sm text-gray-400 mb-4">Please check your API key in the .env file</p>
        <button className="btn bg-blue-600 hover:bg-blue-700 border-blue-600 text-white" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? 'Loading…' : 'Retry'}
        </button>
      </div>
    );
  }

  if (data.cod && data.cod !== 200) {
    return (
      <div className="text-center p-6">
        <p className="text-xl mb-3 text-red-400">API Error</p>
        <p className="text-sm text-gray-400 mb-4">{data.message || `Error ${data.cod}`}</p>
        <button className="btn bg-blue-600 hover:bg-blue-700 border-blue-600 text-white" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? 'Loading…' : 'Retry'}
        </button>
      </div>
    );
  }

  if (!data.main || !data.weather || !data.sys) {
    return (
      <div className="text-center p-6">
        <p className="text-xl mb-3 text-yellow-400">Unexpected Data Format</p>
        <button className="btn bg-blue-600 hover:bg-blue-700 border-blue-600 text-white" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? 'Loading…' : 'Retry'}
        </button>
      </div>
    );
  }

  const tempF = Math.floor(data.main.temp * 9 / 5 + 32);
  const feelsF = Math.floor(data.main.feels_like * 9 / 5 + 32);
  const highF = Math.floor(data.main.temp_max * 9 / 5 + 32);
  const lowF = Math.floor(data.main.temp_min * 9 / 5 + 32);
  const windMph = Math.round((data.wind?.speed || 0) * 2.237);
  const sunriseTime = new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const sunsetTime = new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const currentIcon = data.weather[0].icon;
  const nowTemp = hourlyTemps[0] ?? tempF;
  const endTemp = hourlyTemps[hourlyTemps.length - 1] ?? tempF;

  return (
    <div className="h-full grid min-h-0" style={{ gridTemplateColumns: '1fr 1fr', gap: 'clamp(8px, 2vh, 16px)' }}>

      {/* ── LEFT: Hero card ── */}
      <div
        className="rounded-[18px] border flex flex-col overflow-auto min-w-0"
        style={{
          background: 'var(--hero-grad)',
          borderColor: 'var(--line)',
          padding: 'clamp(10px, 2.4vh, 24px)',
          position: 'relative',
        }}
      >
        {/* Header row: date + condition-sub on left, OWM icon on right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ font: '500 11px/1 \'JetBrains Mono\', monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--mute)' }}>
              {moment().format('dddd · MMMM D')}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: 'var(--mute)' }}>
              {data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1)} · Feels {feelsF}°
            </div>
          </div>
          <WeatherIcon code={currentIcon} size={52} />
        </div>

        {/* Temperature block — margin-top: auto fills dead space above it */}
        <div style={{ marginTop: 'auto' }}>
          {/* Numeric */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 200, fontSize: 'clamp(44px, 12.5vh, 168px)', lineHeight: 0.85, letterSpacing: '-0.06em', color: 'var(--text)' }}>
              {tempF}
            </span>
            <span style={{ fontSize: 'clamp(14px, 2.4vh, 30px)', color: 'var(--mute)', marginTop: 'clamp(6px, 1.6vh, 18px)', marginLeft: 4, fontWeight: 400 }}>
              °F
            </span>
          </div>
          {/* Condition + H/L */}
          <div style={{ fontSize: 'clamp(13px, 2.2vh, 22px)', fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.005em', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1)}
            <span style={{ color: 'var(--mute)', marginLeft: 12, fontSize: 'clamp(11px, 1.8vh, 15px)', fontWeight: 400 }}>
              H {highF}° · L {lowF}°
            </span>
          </div>
        </div>

        {/* ── Driving insight ── */}
        {driving && (
          <div style={{ marginTop: 'clamp(6px, 1.4vh, 16px)' }}>
            <InsightCard label="Driving" headline={driving.headline} sub={driving.sub} />
          </div>
        )}

        {/* ── Sparkline card ── */}
        {hourlyTemps.length >= 4 && (
          <SparkCard pts={hourlyTemps} nowTemp={nowTemp} endTemp={endTemp} />
        )}
      </div>

      {/* ── RIGHT: Conditions + Forecast stacked ── */}
      <div className="flex flex-col min-h-0 min-w-0" style={{ gap: 'clamp(8px, 1.6vh, 16px)' }}>

        {/* Conditions strip */}
        <div className="bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-2xl flex flex-col flex-shrink-0" style={{ padding: 'clamp(6px, 1.1vh, 12px)', gap: 'clamp(3px, 0.7vh, 8px)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono tracking-widest uppercase">Conditions</span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <StatTile label="Wind" value={windMph} unit=" mph" />
            <StatTile label="Humidity" value={`${data.main.humidity}`} unit="%" />
            <StatTile label="Sunrise" value={sunriseTime} />
            <StatTile label="Sunset" value={sunsetTime} />
          </div>
        </div>

        {/* Forecast panel */}
        <div className="bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-2xl flex-1 flex flex-col min-h-0 overflow-hidden" style={{ padding: 'clamp(10px, 2vh, 20px)', gap: 'clamp(6px, 1.4vh, 16px)' }}>
          <div className="flex items-center justify-between flex-shrink-0">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono tracking-widest uppercase">
              {showHourly ? '6-Hour Forecast' : '5-Day Forecast'}
            </span>
            <div className="flex gap-1 bg-gray-200 dark:bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setShowHourly(false)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${!showHourly ? 'bg-white text-gray-900 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Daily
              </button>
              <button
                onClick={() => setShowHourly(true)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${showHourly ? 'bg-white text-gray-900 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Hourly
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {showHourly ? (
              <div className="flex flex-col gap-0.5 h-full">
                {(() => {
                  const now = new Date();
                  const hourlyData = [];
                  for (let i = 1; i <= 6; i++) {
                    const hourTime = new Date(now.getTime() + i * 3600000);
                    let closest = null, minDiff = Infinity;
                    forecastData?.list?.forEach(item => {
                      const diff = Math.abs(new Date(item.dt * 1000) - hourTime);
                      if (diff < minDiff) { minDiff = diff; closest = item; }
                    });
                    if (closest) hourlyData.push({ time: hourTime, data: closest });
                  }
                  return hourlyData.map((hour, i) => {
                    const isNow = i === 0;
                    return (
                      <ForecastRow
                        key={i}
                        label={isNow ? 'Now' : hour.time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}
                        isActive={isNow}
                        icon={<WeatherIcon code={hour.data.weather[0].icon} size={15} />}
                        description={hour.data.weather[0].description}
                        primary={`${Math.round(hour.data.main.temp * 9 / 5 + 32)}°`}
                        secondary={hour.data.pop > 0.1 ? `${Math.round(hour.data.pop * 100)}%` : '—'}
                      />
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 h-full">
                {dailyForecast.map((day, i) => {
                  const isToday = i === 0;
                  const hi = Math.round(Math.max(...day.temps) * 9 / 5 + 32);
                  const lo = Math.round(Math.min(...day.temps) * 9 / 5 + 32);
                  return (
                    <ForecastRow
                      key={i}
                      label={isToday ? 'Today' : moment.unix(day.date).format('ddd')}
                      isActive={isToday}
                      icon={<WeatherIcon code={day.weather.icon} size={15} />}
                      description={day.weather.description}
                      primary={`${hi}°`}
                      secondary={`${lo}°`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Weather;
