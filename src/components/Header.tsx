import type { Metar } from '../data/metar';
import { activeRunway } from '../data/metar';
import { RUNWAYS, type HomeAirport } from '../data/airports';
import type { FeedStatus } from '../hooks/usePolling';
import type { ScheduleSource } from '../hooks/useFlightData';
import { useNow } from '../hooks/useNow';
import { formatAge, formatHM, formatHMS } from '../lib/time';

interface HeaderProps {
  metars: Metar[];
  metarStatus: FeedStatus;
  source: ScheduleSource;
  scheduleUpdatedAt: number | undefined;
  adsb: { status: FeedStatus; count: number };
  onOpenSettings: () => void;
  settingsOpen: boolean;
}

const STATIONS: { icao: string; home: HomeAirport }[] = [
  { icao: 'TTPP', home: 'POS' },
  { icao: 'TTCP', home: 'TAB' },
];

function wind(m: Metar): string {
  if (m.windKt < 1) return 'Calm';
  const dir = m.windDir == null ? 'VRB' : `${String(m.windDir).padStart(3, '0')}°`;
  return `${dir} ${m.windKt}${m.gustKt ? `G${m.gustKt}` : ''}kt`;
}

function Station({ icao, home, metar, now }: { icao: string; home: HomeAirport; metar?: Metar; now: number }) {
  if (!metar) {
    return (
      <div className="wx">
        <span className="wx-station mono">{home}</span>
        <span className="mute">No METAR</span>
      </div>
    );
  }
  const rwy = activeRunway(RUNWAYS[home].heading, metar.windDir, metar.windKt);
  return (
    <div className="wx" title={`${metar.raw}\nObserved ${formatHM(metar.obsAt)} AST (${formatAge(metar.obsAt, now)})`}>
      <span className="wx-station mono">{home}</span>
      {metar.category && <span className={`wx-cat cat-${metar.category.toLowerCase()}`}>{metar.category}</span>}
      <span className="wx-item wx-temp"><span className="k">Temp</span><span className="v">{metar.tempC ?? '—'}°C</span></span>
      <span className="wx-item wx-wind"><span className="k">Wind</span><span className="v">{wind(metar)}</span></span>
      <span className="wx-item wx-vis"><span className="k">Vis</span><span className="v">{metar.visibility}SM</span></span>
      <span className="wx-item wx-sky"><span className="k">Sky</span><span className="v">{metar.clouds}</span></span>
      <span className="wx-item wx-qnh"><span className="k">QNH</span><span className="v">{metar.qnhHpa ?? '—'}</span></span>
      <span className="wx-item wx-rwy"><span className="k">Rwy</span><span className="v">{rwy}</span></span>
      <span className="sr-only">{icao}</span>
    </div>
  );
}

function ScheduleBadge({ source, updatedAt, now }: { source: ScheduleSource; updatedAt?: number; now: number }) {
  if (source === 'loading') return <span className="pill">Schedule · loading</span>;
  if (source === 'demo')
    return (
      <span className="pill pill-warn" title="The live schedule feed is unreachable. Flights shown are illustrative.">
        Demo data
      </span>
    );
  return (
    <span className="pill pill-ok" title={`FlightAware AeroAPI · updated ${updatedAt ? formatAge(updatedAt, now) : ''}`}>
      <span className="dot" /> Schedule live
    </span>
  );
}

function AdsbBadge({ status, count }: { status: FeedStatus; count: number }) {
  if (status === 'loading') return <span className="pill">ADS-B · connecting</span>;
  if (status === 'error')
    return (
      <span className="pill pill-err" title="OpenSky positions unavailable; aircraft are placed from schedule estimates.">
        ADS-B offline
      </span>
    );
  return (
    <span className="pill pill-ok" title="Live positions from the OpenSky Network">
      <span className="dot pulse" /> ADS-B · {count}
    </span>
  );
}

export default function Header({ metars, metarStatus, source, scheduleUpdatedAt, adsb, onOpenSettings, settingsOpen }: HeaderProps) {
  const now = useNow(1000);
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">TT</div>
        <div className="brand-text">
          <div className="brand-title">T&amp;T Flight Board</div>
          <div className="brand-sub">POS · TAB</div>
        </div>
      </div>

      <div className="wx-strip" aria-label="Airport weather (METAR)">
        {metarStatus === 'loading' && metars.length === 0 ? (
          <span className="mute">Loading weather…</span>
        ) : metarStatus === 'error' && metars.length === 0 ? (
          <span className="mute">Weather unavailable</span>
        ) : (
          STATIONS.map((s) => <Station key={s.icao} {...s} metar={metars.find((m) => m.station === s.icao)} now={now} />)
        )}
      </div>

      <div className="header-right">
        <div className="feeds">
          <ScheduleBadge source={source} updatedAt={scheduleUpdatedAt} now={now} />
          <AdsbBadge status={adsb.status} count={adsb.count} />
        </div>
        <time className="clock mono" dateTime={new Date(now).toISOString()}>
          {formatHMS(now)} <span className="mute">AST</span>
        </time>
        <button
          className={`icon-btn ${settingsOpen ? 'active' : ''}`}
          onClick={onOpenSettings}
          aria-label="Display settings"
          aria-expanded={settingsOpen}
          title="Settings & shortcuts (?)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2.2" fill="var(--panel)" />
            <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2.2" fill="var(--panel)" />
            <line x1="4" y1="18" x2="20" y2="18" /><circle cx="7" cy="18" r="2.2" fill="var(--panel)" />
          </svg>
        </button>
      </div>
    </header>
  );
}
