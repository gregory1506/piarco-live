import { MINUTE, formatHM, formatOffset } from '../lib/time';

interface ScrubberProps {
  value: number;
  setValue: (v: number) => void;
  now: number;
}

const RANGE = 120;
const TICKS = [-120, -60, 0, 60, 120];

export default function Scrubber({ value, setValue, now }: ScrubberProps) {
  return (
    <footer className="footer">
      <span className="footer-label">Timeline</span>
      <div className="scrub">
        <input
          className="scrub-input"
          type="range"
          min={-RANGE}
          max={RANGE}
          step={5}
          value={value}
          aria-label="Time offset for aircraft positions"
          aria-valuetext={value === 0 ? 'Now' : `${formatOffset(value)}, ${formatHM(now + value * MINUTE)} AST`}
          onChange={(e) => setValue(Number(e.target.value))}
          style={{ ['--pct' as string]: `${((value + RANGE) / (2 * RANGE)) * 100}%` }}
        />
        <div className="scrub-ticks" aria-hidden="true">
          {TICKS.map((t) => (
            <span key={t}>{t === 0 ? 'now' : formatOffset(t)}</span>
          ))}
        </div>
      </div>
      <div className="scrub-readout mono">
        {value === 0 ? (
          <span className="live-now">● Now</span>
        ) : (
          <>
            <span>{formatOffset(value)}</span>
            <span className="mute">{formatHM(now + value * MINUTE)}</span>
            <button className="btn btn-sm" onClick={() => setValue(0)}>
              Now
            </button>
          </>
        )}
      </div>
    </footer>
  );
}
