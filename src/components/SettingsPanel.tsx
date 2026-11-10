import { useEffect, useRef } from 'react';
import type { Settings } from '../lib/settings';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  setSettings: (update: (s: Settings) => Settings) => void;
}

const TOGGLES: { key: Exclude<keyof Settings, 'density'>; label: string; hint?: string }[] = [
  { key: 'trails', label: 'Flight routes' },
  { key: 'labels', label: 'Aircraft labels' },
  { key: 'rings', label: 'Range rings' },
  { key: 'traffic', label: 'Other ADS-B traffic', hint: 'Aircraft near T&T with no POS/TAB schedule' },
  { key: 'nonPassenger', label: 'Cargo & non-passenger', hint: 'Freighters, helicopters, positioning' },
];

const SHORTCUTS: [string, string][] = [
  ['/', 'Search flights'],
  ['A / D', 'Arrivals / departures'],
  ['↑ ↓', 'Move through the board'],
  ['Esc', 'Close panel'],
  ['R', 'Recenter on T&T'],
  ['W', 'Wide Atlantic view'],
  ['F', 'Follow selected aircraft'],
  ['N', 'Timeline back to now'],
  ['?', 'This panel'],
];

export default function SettingsPanel({ open, onClose, settings, setSettings }: SettingsPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element;
      if (!ref.current?.contains(target) && !target.closest('[aria-label="Display settings"]')) onClose();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="settings" role="dialog" aria-label="Display settings" ref={ref} tabIndex={-1}>
      <h4>Display</h4>
      {TOGGLES.map((t) => (
        <label className="setting" key={t.key}>
          <span>
            {t.label}
            {t.hint && <small>{t.hint}</small>}
          </span>
          <button
            role="switch"
            aria-checked={settings[t.key]}
            className={`toggle ${settings[t.key] ? 'on' : ''}`}
            onClick={() => setSettings((s) => ({ ...s, [t.key]: !s[t.key] }))}
          />
        </label>
      ))}
      <div className="setting">
        <span>Board density</span>
        <div className="seg" role="radiogroup" aria-label="Board density">
          {(['comfy', 'compact'] as const).map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={settings.density === d}
              className={settings.density === d ? 'on' : ''}
              onClick={() => setSettings((s) => ({ ...s, density: d }))}
            >
              {d === 'comfy' ? 'Comfy' : 'Compact'}
            </button>
          ))}
        </div>
      </div>

      <h4>Keyboard</h4>
      <dl className="shortcuts">
        {SHORTCUTS.map(([k, v]) => (
          <div key={k}>
            <dt><kbd>{k}</kbd></dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <h4>Data</h4>
      <p className="sources">
        Schedules: FlightAware AeroAPI · Positions: OpenSky Network · Weather: NOAA Aviation Weather Center · Coastlines:
        Natural Earth. Hollow aircraft markers are estimated from the schedule; solid markers are live ADS-B fixes.
      </p>
    </div>
  );
}
