const TICKER: [string, string, string, string][] = [
  ['ARRIVED', 'BW523 ex JFK', 'On stand G7', 'up'],
  ['TAB', 'BW1500 ex POS', '06:10 scheduled', 'up'],
  ['TAB', 'BW1543 to POS', 'landed 00:38', 'up'],
  ['WX', 'TTPP 24°C · TTCP 26°C', 'VIS 10SM', ''],
  ['NOTAM', 'TTPP / TTCP', 'normal ops', ''],
  ['ARR', 'CM472 ex PTY', 'ETA 14:18', 'up'],
  ['TAB', 'BW1520 ex POS', 'ETA 14:15', 'up'],
  ['DELAY', 'JY311 ex UVF to POS', '+22 min', 'down'],
];

export default function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="ticker">
      <div className="ticker-label">TT AIRPORTS · LIVE</div>
      <div className="ticker-track">
        {items.map((t, i) => (
          <span className="ticker-item" key={i}>
            <span className={t[3]}>{t[0]}</span> <b>{t[1]}</b> <span className="mute">·</span> {t[2]}
          </span>
        ))}
      </div>
    </div>
  );
}
