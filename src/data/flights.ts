import type { Flight, FeedMeta } from './types';

export const FEED_META: Record<string, FeedMeta> = {
  TAB: {
    label: 'AeroAPI live schedule feed',
    source: 'FlightAware AeroAPI (Personal tier)',
    note: 'Falls back to illustrative demo flights if the live feed is unavailable.',
  }
};

export const TAB_LIVE_FEED: unknown[] = [
  { id:'BW1543', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'landed', sourceStatus:'Landed at 00:38', eta:'00:55', dep:'00:30', gate:'1', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:232, track:'landed', dist:0, delay:0, source:'tab-public-feed' },
  { id:'BW1500', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'06:10', dep:'05:45', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1502', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'06:50', dep:'06:25', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1501', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'07:20', dep:'06:55', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1504', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'07:30', dep:'07:05', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1503', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'08:00', dep:'07:35', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1506', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'08:30', dep:'08:05', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1508', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'09:10', dep:'08:45', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1507', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'09:40', dep:'09:15', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1510', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'09:50', dep:'09:25', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1509', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'10:20', dep:'09:55', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1512', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'11:00', dep:'10:35', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1514', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'11:40', dep:'11:15', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1513', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'12:10', dep:'11:45', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1516', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'12:20', dep:'11:55', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1515', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'12:50', dep:'12:25', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1520', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'14:15', dep:'13:50', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1521', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'15:25', dep:'15:00', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1524', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'15:55', dep:'15:30', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1523', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'16:25', dep:'16:00', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1526', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'16:35', dep:'16:10', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1525', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'17:05', dep:'16:40', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1527', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'17:45', dep:'17:20', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1530', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'18:25', dep:'18:00', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1529', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'18:55', dep:'18:30', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1532', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'19:05', dep:'18:40', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1531', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'19:35', dep:'19:10', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1533', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'20:15', dep:'19:50', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1535', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'21:25', dep:'21:00', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1540', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'21:40', dep:'21:15', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1541', airline:'Caribbean Airlines', type:'AT72', origin:'TAB', dest:'POS', status:'scheduled', sourceStatus:'Scheduled', eta:'22:45', dep:'22:20', gate:'1', lat:11.1497, lon:-60.8322, alt:0, spd:0, hdg:232, track:'gate', dist:51, delay:0, source:'tab-public-feed' },
  { id:'BW1542', airline:'Caribbean Airlines', type:'AT72', origin:'POS', dest:'TAB', status:'scheduled', sourceStatus:'Scheduled', eta:'23:55', dep:'23:30', gate:'2', lat:10.5954, lon:-61.3372, alt:0, spd:0, hdg:54, track:'gate', dist:51, delay:0, source:'tab-public-feed' }
];

// Base POS sample traffic remains mocked; TAB rows above are source-labeled public status rows.
export const FLIGHTS: Flight[] = [
  { id:'BW523', airline:'Caribbean Wings', type:'B738', origin:'JFK', dest:'POS', status:'enroute', eta:'14:32', dep:'11:10', gate:'7', lat:11.42, lon:-61.88, alt:31000, spd:478, hdg:168, track:'descending', dist:126, delay:0, routeProgress:0.94 },
  { id:'BW415', airline:'Caribbean Wings', type:'A320', origin:'POS', dest:'BGI', status:'departing', eta:'15:08', dep:'14:15', gate:'3', lat:10.58, lon:-61.18, alt:18400, spd:352, hdg:78, track:'climbing', dist:18, delay:0, routeProgress:0.16 },
  { id:'AA2290', airline:'American', type:'B738', origin:'MIA', dest:'POS', status:'enroute', eta:'14:55', dep:'11:30', gate:'5', lat:11.88, lon:-62.40, alt:35000, spd:512, hdg:142, track:'cruise', dist:198, delay:0, routeProgress:0.82 },
  { id:'UA1458', airline:'United', type:'B739', origin:'IAH', dest:'POS', status:'enroute', eta:'15:10', dep:'10:55', gate:'5', lat:16.95, lon:-72.10, alt:36000, spd:505, hdg:122, track:'cruise', dist:760, delay:0, routeProgress:0.68 },
  { id:'CM472', airline:'Copa', type:'B738', origin:'PTY', dest:'POS', status:'enroute', eta:'14:18', dep:'11:45', gate:'9', lat:10.15, lon:-64.20, alt:29000, spd:461, hdg:92, track:'descending', dist:172, delay:0, routeProgress:0.84 },
  { id:'VS097', airline:'Virgin Atlantic', type:'A333', origin:'LGW', dest:'POS', status:'enroute', eta:'14:44', dep:'03:20', gate:'11', lat:12.30, lon:-60.20, alt:37000, spd:488, hdg:218, track:'descending', dist:240, delay:0, routeProgress:0.92 },
  { id:'BW800', airline:'Caribbean Wings', type:'B738', origin:'POS', dest:'YYZ', status:'departing', eta:'19:55', dep:'14:10', gate:'8', lat:10.72, lon:-61.51, alt:12800, spd:298, hdg:338, track:'climbing', dist:22, delay:0, routeProgress:0.08 },
  { id:'KL771', airline:'KLM', type:'A333', origin:'AMS', dest:'POS', status:'enroute', eta:'15:20', dep:'05:40', gate:'12', lat:12.88, lon:-59.40, alt:38000, spd:496, hdg:226, track:'cruise', dist:320, delay:14, routeProgress:0.89 },
  { id:'BW485', airline:'Caribbean Wings', type:'B738', origin:'POS', dest:'JFK', status:'scheduled', eta:'21:05', dep:'15:45', gate:'6', lat:10.595, lon:-61.337, alt:0, spd:0, hdg:0, track:'gate', dist:0, delay:0, routeProgress:0 },
  { id:'LI377', airline:'LIAT', type:'AT42', origin:'ANU', dest:'POS', status:'enroute', eta:'14:28', dep:'12:55', gate:'4', lat:11.68, lon:-61.10, alt:22000, spd:284, hdg:190, track:'descending', dist:128, delay:0, routeProgress:0.78 },
  { id:'BA2157', airline:'British Airways', type:'B789', origin:'LGW', dest:'POS', status:'enroute', eta:'15:12', dep:'03:50', gate:'2', lat:13.20, lon:-60.40, alt:37000, spd:490, hdg:228, track:'descending', dist:190, delay:0, routeProgress:0.88 },
  { id:'BW419', airline:'Caribbean Wings', type:'B738', origin:'POS', dest:'MIA', status:'taxi', eta:'17:10', dep:'14:05', gate:'1', lat:10.604, lon:-61.342, alt:0, spd:14, hdg:280, track:'ground', dist:0, delay:5, routeProgress:0 },
  { id:'AC1619', airline:'Air Canada', type:'A220', origin:'YYZ', dest:'POS', status:'enroute', eta:'15:28', dep:'11:15', gate:'5', lat:19.20, lon:-68.50, alt:35000, spd:480, hdg:146, track:'cruise', dist:680, delay:0, routeProgress:0.72 },
  { id:'BW229', airline:'Caribbean Wings', type:'A320', origin:'POS', dest:'GEO', status:'scheduled', eta:'16:30', dep:'15:15', gate:'4', lat:10.595, lon:-61.337, alt:0, spd:0, hdg:0, track:'gate', dist:0, delay:0, routeProgress:0 },
  { id:'JY311', airline:'InterCaribbean', type:'SF34', origin:'UVF', dest:'POS', status:'enroute', eta:'14:36', dep:'13:10', gate:'3', lat:11.95, lon:-61.25, alt:19000, spd:232, hdg:188, track:'descending', dist:148, delay:22, routeProgress:0.74 },
  { id:'BW800R', airline:'Caribbean Wings', type:'B738', origin:'POS', dest:'LHR', status:'scheduled', eta:'06:25', dep:'17:40', gate:'12', lat:10.595, lon:-61.337, alt:0, spd:0, hdg:0, track:'gate', dist:0, delay:0, routeProgress:0 },
  { id:'9Y210', airline:'Island Charter', type:'C208', origin:'SVD', dest:'POS', status:'enroute', eta:'14:22', dep:'13:30', gate:'—', lat:11.40, lon:-61.60, alt:8500, spd:168, hdg:182, track:'descending', dist:90, delay:0, routeProgress:0.76 },
  { id:'BW602', airline:'Caribbean Airlines', type:'B738', origin:'JFK', dest:'TAB', status:'enroute', eta:'15:48', dep:'10:45', gate:'1', lat:22.40, lon:-66.20, alt:35000, spd:478, hdg:155, track:'cruise', dist:560, delay:0, routeProgress:0.71 },
  { id:'BW452', airline:'Caribbean Airlines', type:'AT72', origin:'BGI', dest:'TAB', status:'enroute', eta:'14:52', dep:'14:20', gate:'2', lat:12.18, lon:-60.14, alt:18000, spd:292, hdg:238, track:'cruise', dist:46, delay:0, routeProgress:0.58 },
  ...(TAB_LIVE_FEED as Omit<Flight, 'routeProgress'>[]).map((f) => ({
    ...f,
    routeProgress: (f as Partial<Flight>).routeProgress ?? 0,
  }))
];

export const CITIES: Record<string, string> = {
  JFK:'New York', MIA:'Miami', IAH:'Houston', ATL:'Atlanta', YYZ:'Toronto', LGW:'London Gatwick',
  LHR:'London Heathrow', AMS:'Amsterdam', FRA:'Frankfurt', PTY:'Panama City', BGI:'Bridgetown',
  ANU:'St. John’s', UVF:'St. Lucia', SVD:'Kingstown', BOG:'Bogotá', GEO:'Georgetown',
  TAB:'Tobago', POS:'Port of Spain'
};

export const AIRLINE_CODES: Record<string, string> = {
  'Caribbean Wings':'BW','Caribbean Airlines':'BW','American':'AA','Copa':'CM','Virgin Atlantic':'VS',
  'United':'UA','KLM':'KL','LIAT':'LI','Air Canada':'AC','InterCaribbean':'JY',
  'Island Charter':'9Y','British Airways':'BA','Condor':'DE'
};
