// Detail.jsx - flight detail drawer
function DetailDrawer({ flight, onClose }) {
  if (!flight) return <div className="detail closed"></div>;
  const isArrival = flight.dest === 'POS';
  const origin = flight.origin;
  const dest = flight.dest;

  // progress along route
  const est = 1 - Math.min(1, flight.dist/700);
  const pct = flight.alt < 500 ? 0 : Math.max(0.02, Math.min(0.98, est));

  const facts = [
    ['Aircraft', flight.type + ' · ' + (flight.airline)],
    ['Registration', 'N' + (flight.id.replace(/\D/g,'').padStart(4,'0'))],
    ['Track', flight.track.toUpperCase()],
    ['Delay', flight.delay > 0 ? flight.delay + ' min' : 'On time'],
    ['Filed route', `${origin} → ${dest}`],
    ['Flight ID', flight.id],
  ];

  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <div className="detail-title">{flight.id} <span className="mute" style={{fontSize:12,letterSpacing:0.04}}>· {flight.airline}</span></div>
          <div className="detail-sub">{CITIES[origin] || origin} ({origin}) → {CITIES[dest] || dest} ({dest}) · {flight.type}</div>
        </div>
        <button className="detail-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="route-viz">
        <div className="rv-port">
          <div className="code">{origin}</div>
          <div className="name">{CITIES[origin] || ''}</div>
          <div className="tm mono">{flight.dep} LCL</div>
        </div>
        <div className="rv-line">
          <span className="rv-dot left"></span>
          <span className="rv-dot right"></span>
          <span className="rv-plane" style={{left: (pct*100)+'%'}}>
            <svg width="16" height="16" viewBox="-8 -8 16 16" style={{transform:'rotate(90deg)'}}>
              <polygon points="0,-6 4,4 0,2 -4,4" fill="currentColor" />
            </svg>
          </span>
        </div>
        <div className="rv-port" style={{textAlign:'right'}}>
          <div className="code">{dest}</div>
          <div className="name">{CITIES[dest] || ''}</div>
          <div className="tm mono">{flight.eta} LCL</div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric"><div className="k">Altitude</div><div className="v">{flight.alt.toLocaleString()}<small>ft</small></div></div>
        <div className="metric"><div className="k">Ground spd</div><div className="v">{flight.spd}<small>kt</small></div></div>
        <div className="metric"><div className="k">Heading</div><div className="v">{String(flight.hdg).padStart(3,'0')}<small>°</small></div></div>
        <div className="metric"><div className="k">{isArrival?'Distance':'Gate'}</div><div className="v">{isArrival ? flight.dist + 'nm' : flight.gate}</div></div>
      </div>

      <div className="detail-facts">
        {facts.map(([k,v]) => (
          <div className="fact" key={k}>
            <span className="k">{k}</span>
            <span className="v">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.DetailDrawer = DetailDrawer;
