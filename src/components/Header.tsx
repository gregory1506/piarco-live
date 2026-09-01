interface HeaderProps {
  clock: string;
  openSkyStatus: string;
}

export default function Header({ clock, openSkyStatus }: HeaderProps) {
  return (
    <div className="header">
      <div className="brand">
        <div className="brand-mark">TT</div>
        <div>
          <div className="brand-title">T&T Flight Board</div>
          <div className="brand-sub">POS/TTPP · TAB/TTCP</div>
        </div>
      </div>
      <div className="header-center">
        <div className="metar-strip">
          <span className="tag mono">METAR TTPP / TTCP</span>
          <span className="metar-item"><span className="k">POS Temp</span><span className="v mono">24°C</span></span>
          <span className="metar-item"><span className="k">TAB Temp</span><span className="v mono">26°C</span></span>
          <span className="metar-item"><span className="k">Wind</span><span className="v mono">090° / 09kt</span></span>
          <span className="metar-item"><span className="k">Vis</span><span className="v mono">10SM</span></span>
          <span className="metar-item"><span className="k">Clouds</span><span className="v mono">SCT024</span></span>
          <span className="metar-item"><span className="k">QNH</span><span className="v mono">1014</span></span>
          <span className="metar-item"><span className="k">Dew</span><span className="v mono">21°C</span></span>
          <span className="metar-item"><span className="k">Rwy</span><span className="v mono">POS 10 · TAB 11</span></span>
        </div>
      </div>
      <div className="header-right">
        <div className="live-dot" title={`ADS-B: ${openSkyStatus}`}></div>
        <span title={`ADS-B: ${openSkyStatus}`}>
          {openSkyStatus === 'ok' ? 'ADS-B LIVE' : openSkyStatus === 'loading' ? 'ADS-B CONNECTING' : 'ADS-B OFFLINE'}
        </span>
        <span className="mute">·</span>
        <span className="clock mono">{clock}</span>
        <span className="mute">AST</span>
      </div>
    </div>
  );
}
