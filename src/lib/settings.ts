export interface Settings {
  trails: boolean;
  labels: boolean;
  rings: boolean;
  /** ADS-B aircraft that match no POS/TAB schedule. */
  traffic: boolean;
  /** Cargo, helicopter and other non-passenger operators. */
  nonPassenger: boolean;
  density: 'comfy' | 'compact';
}

export const DEFAULT_SETTINGS: Settings = {
  trails: true,
  labels: true,
  rings: true,
  traffic: true,
  nonPassenger: false,
  density: 'comfy',
};
