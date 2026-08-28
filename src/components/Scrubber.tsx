interface ScrubberProps {
  value: number;
  setValue: (v: number) => void;
  clock: string;
}

export default function Scrubber({ value, setValue, clock }: ScrubberProps) {
  const label = (v: number) => {
    if (v === 0) return 'NOW';
    const sign = v > 0 ? '+' : '−';
    const abs = Math.abs(v);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return sign + (h ? h + 'h ' : '') + m + 'm';
  };
  const ticks = [-120, -60, 0, 60, 120];
  return (
    <div className="footer">
      <div className="footer-left">
        <b>Timeline</b>
        <span className="mono">{clock}</span>
      </div>
      <div className="scrub">
        <div className="scrub-track">
          <div className="scrub-now" style={{ left: '50%' }}></div>
          <div className="scrub-handle" style={{ left: ((value + 120) / 240) * 100 + '%' }}></div>
          <input
            className="scrub-input"
            type="range"
            min="-120"
            max="120"
            step="5"
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value, 10))}
          />
          <div className="scrub-ticks">
            {ticks.map((t) => (
              <span key={t}>{t === 0 ? 'NOW' : t > 0 ? '+' + t + 'm' : t + 'm'}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="scrub-label mono">{label(value)}</div>
    </div>
  );
}
