import { useContext, useState, useRef, useMemo } from "react";
import moment from "moment";
import { FiRefreshCw } from "react-icons/fi";
import TeslaAppContext from "../context/TeslaAppContext";
import Spinner from "../shared/Spinner";

const owmIcon = (icon, size = '2x') =>
  `https://openweathermap.org/img/wn/${icon}@${size}.png`;

const PRECIP_MAINS = new Set(['Rain', 'Drizzle', 'Thunderstorm', 'Snow']);

// ── Insight selectors ──────────────────────────────────────────────────────

function fmtHour(dt) {
  const d = new Date(dt * 1000);
  const h = d.getHours();
  return `${h > 12 ? h - 12 : h || 12} ${h >= 12 ? 'PM' : 'AM'}`;
}

function toF(c) { return Math.round(c * 9 / 5 + 32); }

function deriveWhatToExpect(data, forecastList) {
  const next = (forecastList || []).slice(0, 4); // 4 × 3h = 12h
  if (!next.length) return { headline: 'Clear conditions', sub: `High ${toF(data.main.temp_max)}°, low ${toF(data.main.temp_min)}°.` };

  const currentPrecip = PRECIP_MAINS.has(data.weather[0].main);
  const nightLow = toF(Math.min(...next.map(f => f.main.temp)));

  if (currentPrecip) {
    const clearIdx = next.findIndex(f => !PRECIP_MAINS.has(f.weather[0].main));
    if (clearIdx > 0) {
      return {
        headline: `Rain easing by ${fmtHour(next[clearIdx].dt)}`,
        sub: `Then ${next[clearIdx].weather[0].description}. Overnight low ${nightLow}°.`,
      };
    }
    return {
      headline: 'Rain through the evening',
      sub: `${data.weather[0].description}. Low ${toF(data.main.temp_min)}°.`,
    };
  }

  const precipStart = next.findIndex(f => PRECIP_MAINS.has(f.weather[0].main));
  if (precipStart > 0) {
    return {
      headline: `Rain starting around ${fmtHour(next[precipStart].dt)}`,
      sub: `Currently ${data.weather[0].description}. Overnight low ${nightLow}°.`,
    };
  }

  const currentF = toF(data.main.temp);
  const minFuture = toF(Math.min(...next.map(f => f.main.temp)));
  if (currentF - minFuture > 8) {
    const coldIdx = next.reduce((a, f, i) => f.main.temp < next[a].main.temp ? i : a, 0);
    return {
      headline: `Cooling to ${minFuture}° by ${fmtHour(next[coldIdx].dt)}`,
      sub: `Currently ${currentF}° and ${data.weather[0].description.toLowerCase()}.`,
    };
  }

  const last = next[next.length - 1];
  return {
    headline: `Clear through ${fmtHour(last.dt)}`,
    sub: `${data.weather[0].description}. High ${toF(data.main.temp_max)}°, low ${toF(data.main.temp_min)}°.`,
  };
}

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
    <div className="flex flex-col gap-1 bg-gray-900/60 border border-gray-700/60 rounded-xl p-3">
      <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">{label}</span>
      <span className="text-lg font-semibold text-white leading-none">
        {value}
        {unit && <span className="text-xs text-gray-500 font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

function InsightCard({ label, headline, sub }) {
  return (
    <div style={{ background: '#0f1218', border: '1px solid #232932', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ font: '500 10px/1 \'JetBrains Mono\', monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a93a0' }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 18, marginTop: 8, lineHeight: 1.2, color: '#e8eaed' }}>
        {headline}
      </div>
      <div style={{ fontSize: 13, color: '#8a93a0', marginTop: 6, lineHeight: 1.4 }}>
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
    <div style={{ background: '#0f1218', border: '1px solid #232932', borderRadius: 14, padding: '16px 18px', marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: '500 10px/1 \'JetBrains Mono\', monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a93a0' }}>
          Temperature · next 12 hours
        </span>
        <span style={{ fontSize: 12, color: '#8a93a0' }}>
          <strong style={{ color: '#e8eaed' }}>{nowTemp}°</strong> now → <strong style={{ color: '#e8eaed' }}>{endTemp}°</strong> in 12 h
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', marginTop: 10 }}>
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
            <text x={x} y={ys[i] - 8} fontSize="11" fontFamily="JetBrains Mono, monospace" fill="#8a93a0" textAnchor="middle">
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
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refreshWeather(); } catch (e) { console.error(e); }
    finally { setIsRefreshing(false); }
  };

  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
  };
  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollContainerRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
  };
  const handleMouseUp = () => { setIsDragging(false); if (scrollContainerRef.current) scrollContainerRef.current.style.cursor = 'grab'; };
  const handleMouseLeave = () => { setIsDragging(false); if (scrollContainerRef.current) scrollContainerRef.current.style.cursor = 'grab'; };
  const handleTouchStart = (e) => { if (!scrollContainerRef.current) return; setIsDragging(true); setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft); setScrollLeft(scrollContainerRef.current.scrollLeft); };
  const handleTouchMove = (e) => { if (!isDragging || !scrollContainerRef.current) return; const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft; scrollContainerRef.current.scrollLeft = scrollLeft - (x - startX) * 2; };
  const handleTouchEnd = () => setIsDragging(false);

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
  const whatToExpect = useMemo(() => data?.main ? deriveWhatToExpect(data, forecastList) : null, [data, forecastList]);
  const driving = useMemo(() => data?.main ? deriveDriving(data) : null, [data]);
  const hourlyTemps = useMemo(() => buildHourlyTemps(forecastList), [forecastList]);

  if (isLoading) return <Spinner />;

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-xl mb-3 text-gray-300">No Weather Data</p>
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
    <div className="h-full grid gap-4 min-h-0" style={{ gridTemplateColumns: '1.4fr 1fr' }}>

      {/* ── LEFT: Hero card ── */}
      <div
        className="rounded-[18px] border flex flex-col overflow-auto"
        style={{
          background: 'linear-gradient(180deg, #161b24 0%, #11151c 100%)',
          borderColor: '#232932',
          padding: 24,
          position: 'relative',
        }}
      >
        {/* Header row: date + condition-sub on left, OWM icon on right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ font: '500 11px/1 \'JetBrains Mono\', monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a93a0' }}>
              {moment().format('dddd · MMMM D')}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: '#8a93a0' }}>
              {data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1)} · Feels {feelsF}°
            </div>
          </div>
          <img
            src={owmIcon(currentIcon, '4x')}
            alt={data.weather[0].description}
            style={{ width: 78, height: 78, opacity: 0.92, filter: 'drop-shadow(0 12px 30px rgba(120,160,220,0.18))', flexShrink: 0 }}
          />
        </div>

        {/* Temperature block — margin-top: auto fills dead space above it */}
        <div style={{ marginTop: 'auto' }}>
          {/* Numeric */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 200, fontSize: 168, lineHeight: 0.85, letterSpacing: '-0.06em', color: '#e8eaed' }}>
              {tempF}
            </span>
            <span style={{ fontSize: 30, color: '#8a93a0', marginTop: 18, marginLeft: 4, fontWeight: 400 }}>
              °F
            </span>
          </div>
          {/* Condition + H/L */}
          <div style={{ fontSize: 22, fontWeight: 500, color: '#e8eaed', letterSpacing: '-0.005em', marginTop: 4 }}>
            {data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1)}
            <span style={{ color: '#8a93a0', marginLeft: 12, fontSize: 15, fontWeight: 400 }}>
              H {highF}° · L {lowF}°
            </span>
          </div>
        </div>

        {/* ── Insight row ── */}
        {whatToExpect && driving && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
            <InsightCard label="What to expect" headline={whatToExpect.headline} sub={whatToExpect.sub} />
            <InsightCard label="Driving" headline={driving.headline} sub={driving.sub} />
          </div>
        )}

        {/* ── Sparkline card ── */}
        {hourlyTemps.length >= 4 && (
          <SparkCard pts={hourlyTemps} nowTemp={nowTemp} endTemp={endTemp} />
        )}
      </div>

      {/* ── RIGHT: Conditions + Forecast stacked ── */}
      <div className="flex flex-col gap-4 min-h-0">

        {/* Conditions strip */}
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5 flex flex-col gap-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Conditions</span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatTile label="Wind" value={windMph} unit=" mph" />
            <StatTile label="Humidity" value={`${data.main.humidity}`} unit="%" />
            <StatTile label="Sunrise" value={sunriseTime} />
            <StatTile label="Sunset" value={sunsetTime} />
          </div>
        </div>

        {/* Forecast panel */}
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-5 flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between flex-shrink-0">
            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
              {showHourly ? '6-Hour Forecast' : '5-Day Forecast'}
            </span>
            <div className="flex gap-1 bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setShowHourly(false)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${!showHourly ? 'bg-white text-gray-900 font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                Daily
              </button>
              <button
                onClick={() => setShowHourly(true)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${showHourly ? 'bg-white text-gray-900 font-semibold' : 'text-gray-400 hover:text-white'}`}
              >
                Hourly
              </button>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto overflow-y-hidden cursor-grab select-none min-h-0"
            style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {showHourly ? (
              <div className="flex gap-2 h-full pb-1">
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
                      <div key={i} className={`flex-shrink-0 flex flex-col items-center justify-between rounded-xl p-3 border gap-1 w-[100px] ${isNow ? 'bg-blue-600/10 border-blue-500/40' : 'bg-gray-900/50 border-gray-700/50'}`}>
                        <span className={`text-[10px] font-mono tracking-wide ${isNow ? 'text-blue-300' : 'text-gray-500'}`}>
                          {isNow ? 'Now' : hour.time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}
                        </span>
                        <img src={owmIcon(hour.data.weather[0].icon)} alt={hour.data.weather[0].description} className="w-12 h-12 flex-shrink-0" />
                        <span className="text-[11px] text-gray-400 capitalize text-center leading-tight line-clamp-2">{hour.data.weather[0].description}</span>
                        <span className="text-lg font-semibold text-white">{Math.round(hour.data.main.temp * 9 / 5 + 32)}°</span>
                        <span className="text-[10px] text-blue-400">
                          {hour.data.pop > 0.1 ? `${Math.round(hour.data.pop * 100)}%` : ' '}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="flex gap-2 h-full pb-1">
                {dailyForecast.map((day, i) => {
                  const isToday = i === 0;
                  return (
                    <div key={i} className={`flex-shrink-0 flex flex-col items-center justify-between rounded-xl p-3 border gap-1 w-[100px] ${isToday ? 'bg-blue-600/10 border-blue-500/40' : 'bg-gray-900/50 border-gray-700/50'}`}>
                      <span className={`text-[10px] font-mono tracking-wide ${isToday ? 'text-blue-300' : 'text-gray-500'}`}>
                        {isToday ? 'Today' : moment.unix(day.date).format('ddd')}
                      </span>
                      <img src={owmIcon(day.weather.icon)} alt={day.weather.description} className="w-12 h-12 flex-shrink-0" />
                      <span className="text-[11px] text-gray-400 capitalize text-center leading-tight line-clamp-2">{day.weather.description}</span>
                      <span className="text-base font-semibold text-white">{Math.round(Math.max(...day.temps) * 9 / 5 + 32)}°</span>
                      <span className="text-[11px] text-gray-500">{Math.round(Math.min(...day.temps) * 9 / 5 + 32)}°</span>
                    </div>
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
