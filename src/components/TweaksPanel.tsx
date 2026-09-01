export interface TweakState {
  mapStyle: 'radar' | 'chart';
  trails: boolean;
  labels: boolean;
  density: 'comfy' | 'dense';
  charter: boolean;
  followSelected: boolean;
}

interface TweaksPanelProps {
  open: boolean;
  state: TweakState;
  setState: (updater: (s: TweakState) => TweakState) => void;
}

export default function TweaksPanel({ open, state, setState }: TweaksPanelProps) {
  const set = <K extends keyof TweakState>(k: K, v: TweakState[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  return (
    <div className={`tweaks ${open ? 'open' : ''}`}>
      <h4>Display</h4>
      <div className="row-t">
        <span>Map style</span>
        <div className="seg">
          <button className={state.mapStyle === 'radar' ? 'on' : ''} onClick={() => set('mapStyle', 'radar')}>Radar</button>
          <button className={state.mapStyle === 'chart' ? 'on' : ''} onClick={() => set('mapStyle', 'chart')}>Chart</button>
        </div>
      </div>
      <div className="row-t">
        <span>Flight trails</span>
        <button className={`toggle ${state.trails ? 'on' : ''}`} onClick={() => set('trails', !state.trails)} />
      </div>
      <div className="row-t">
        <span>Show labels</span>
        <button className={`toggle ${state.labels ? 'on' : ''}`} onClick={() => set('labels', !state.labels)} />
      </div>
      <div className="row-t">
        <span>Follow selected</span>
        <button className={`toggle ${state.followSelected ? 'on' : ''}`} onClick={() => set('followSelected', !state.followSelected)} />
      </div>
      <div className="row-t">
        <span>Density</span>
        <div className="seg">
          <button className={state.density === 'comfy' ? 'on' : ''} onClick={() => set('density', 'comfy')}>Comfy</button>
          <button className={state.density === 'dense' ? 'on' : ''} onClick={() => set('density', 'dense')}>Dense</button>
        </div>
      </div>
      <h4 style={{ marginTop: 10 }}>Data</h4>
      <div className="row-t">
        <span>Include charter</span>
        <button className={`toggle ${state.charter ? 'on' : ''}`} onClick={() => set('charter', !state.charter)} />
      </div>
    </div>
  );
}
