import type { PlacedFlight } from '../data/types';
import { isHomeAirport } from '../data/airports';
import { delayMinutes, statusLabel, type BoardMode } from '../lib/flights';
import { dayOffset, formatAge, formatHM } from '../lib/time';

interface DetailProps {
  flight: PlacedFlight;
  now: number;
  watched: boolean;
  toggleWatch: (id: string) => void;
  onClose: () => void;
  onCenter: () => void;
  follow: boolean;
  setFollow: (v: boolean) => void;
}

function Clock({ label, sched, actual, now }: { label: string; sched?: number; actual?: number; now: number }) {
  const diff = sched != null && actual != null ? Math.round((actual - sched) / 60_000) : 0;
  const day = actual != null ? dayOffset(actual, now) : sched != null ? dayOffset(sched, now) : 0;
  return (
    <div className="rv-time">
      <span className={`big ${diff >= 15 ? 'late' : ''}`}>
        {formatHM(actual ?? sched)}
        {day !== 0 && <sup className="day" title={day > 0 ? 'Tomorrow' : 'Yesterday'}>{day > 0 ? `+${day}d` : `${day}d`}</sup>}
      </span>
      <span className="small">
        {label}
        {Math.abs(diff) >= 5 && sched != null && <> · sched {formatHM(sched)}</>}
      </span>
    </div>
  );
}

const PHASE_LABEL: Record<string, string> = {
  gate: 'At gate',
  taxi: 'Taxiing',
  climb: 'Climbing',
  cruise: 'Cruising',
  descent: 'Descending',
  landed: 'Landed',
};

export default function Detail({ flight: f, now, watched, toggleWatch, onClose, onCenter, follow, setFollow }: DetailProps) {
  const pos = f.pos;
  const traffic = f.kind === 'traffic';
  const mode: BoardMode = isHomeAirport(f.dest) ? 'arrivals' : 'departures';
  const status = statusLabel(f, mode);
  const delay = delayMinutes(f, mode);
  const departed = f.status === 'enroute' || f.status === 'landed' || f.status === 'arrived';
  const arrived = f.status === 'arrived' || f.status === 'landed';
  const airborne = pos && pos.phase !== 'gate' && pos.phase !== 'taxi' && pos.phase !== 'landed';

  const facts: [string, string][] = traffic
    ? [
        ['Callsign', f.callsign],
        ['ICAO 24-bit', f.live?.icao24.toUpperCase() ?? '—'],
        ['Last fix', f.live ? formatAge(f.live.fixAt, now) : '—'],
      ]
    : [
        ['Status', f.sourceStatus ?? status.text],
        ['Delay', f.status === 'canceled' ? '—' : delay >= 5 ? `${delay} min late` : delay <= -5 ? `${-delay} min early` : 'On time'],
        ['Dep. gate', f.gateDep ?? '—'],
        ['Arr. gate', f.gateArr ?? '—'],
        ['Aircraft', f.type || '—'],
        ['Registration', f.registration ?? '—'],
        ['Callsign', f.callsign],
        ['Position', pos ? (pos.live ? `ADS-B · ${f.live ? formatAge(f.live.fixAt, now) : ''}` : 'Estimated from schedule') : 'Not on map'],
      ];

  return (
    <section className="detail" aria-label={`Flight ${f.id} details`}>
      <div className="detail-head">
        <div className="detail-id">
          <h2 className="detail-title mono">{f.id}</h2>
          <span className="detail-airline">{traffic ? 'Unscheduled ADS-B traffic' : f.airline}</span>
          {!traffic && <span className={`status tone-${status.tone}`}>{status.text}</span>}
        </div>
        <div className="detail-actions">
          {!traffic && (
            <button
              className={`icon-btn star-btn ${watched ? 'active' : ''}`}
              aria-pressed={watched}
              aria-label={watched ? `Stop watching ${f.id}` : `Watch ${f.id}`}
              title={watched ? 'Watching' : 'Watch this flight'}
              onClick={() => toggleWatch(f.id)}
            >
              ★
            </button>
          )}
          <button className="icon-btn" onClick={onClose} aria-label="Close details" title="Close (Esc)">
            ✕
          </button>
        </div>
      </div>

      {!traffic && (
        <div className="route-viz">
          <div className="rv-end">
            <span className="code mono">{f.origin}</span>
            <span className="name">{f.originCity}</span>
            <Clock label={departed ? 'Departed' : 'Departs'} sched={f.schedDep} actual={f.estDep} now={now} />
          </div>
          <div className="rv-line" aria-hidden="true">
            <span className="rv-flown" style={{ width: `${(pos?.progress ?? (arrived ? 1 : 0)) * 100}%` }} />
            <span className="rv-plane" style={{ left: `${(pos?.progress ?? (arrived ? 1 : 0)) * 100}%` }}>
              <svg width="14" height="14" viewBox="-8 -8 16 16">
                <polygon points="0,-7 5,5 0,2.5 -5,5" fill="currentColor" transform="rotate(90)" />
              </svg>
            </span>
          </div>
          <div className="rv-end right">
            <span className="code mono">{f.dest}</span>
            <span className="name">{f.destCity}</span>
            <Clock label={arrived ? 'Arrived' : 'Arrives'} sched={f.schedArr} actual={f.estArr} now={now} />
          </div>
        </div>
      )}

      {pos && (
        <div className="metrics">
          <div className="metric">
            <span className="k">Altitude</span>
            <span className="v">
              {airborne ? pos.altFt.toLocaleString() : '—'}
              {airborne && <small>ft</small>}
            </span>
          </div>
          <div className="metric">
            <span className="k">Speed</span>
            <span className="v">
              {pos.spdKt || '—'}
              {pos.spdKt > 0 && <small>kt</small>}
            </span>
          </div>
          <div className="metric">
            <span className="k">Heading</span>
            <span className="v">
              {String(Math.round(pos.hdg) % 360).padStart(3, '0')}
              <small>°</small>
            </span>
          </div>
          <div className="metric">
            <span className="k">{airborne && pos.remainingNm != null ? 'To go' : 'Phase'}</span>
            <span className="v">
              {airborne && pos.remainingNm != null ? (
                <>
                  {Math.round(pos.remainingNm).toLocaleString()}
                  <small>nm</small>
                </>
              ) : (
                PHASE_LABEL[pos.phase]
              )}
            </span>
          </div>
        </div>
      )}
      {airborne && !pos.live && <p className="est-note">Hollow marker: position estimated from the schedule, not an ADS-B fix.</p>}

      <dl className="detail-facts">
        {facts.map(([k, v]) => (
          <div className="fact" key={k}>
            <dt>{k}</dt>
            <dd className="mono">{v}</dd>
          </div>
        ))}
      </dl>

      {pos && (
        <div className="detail-foot">
          <button className="btn" onClick={onCenter}>Center on map</button>
          <button className={`btn ${follow ? 'on' : ''}`} aria-pressed={follow} onClick={() => setFollow(!follow)}>
            {follow ? 'Following' : 'Follow'}
          </button>
        </div>
      )}
    </section>
  );
}
