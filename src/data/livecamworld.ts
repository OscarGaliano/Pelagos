/**
 * Webcams de playas de España desde LiveCamworld (WorldCams.tv).
 * Solo embeber desde la URL oficial. Fuente: https://worldcams.tv/spain/
 * Imágenes: Wikimedia Commons (fotos reales de cada playa o zona).
 */

import { THUMB } from './webcamThumbnails';

const BASE = 'https://worldcams.tv/spain';

export const LIVECAMWORLD_PLAYAS = [
  { id: 'spain-beaches', title: 'Spain Beaches', city: 'España', location: 'España - varias playas', url: `${BASE}/spain-beaches`, thumbnailUrl: THUMB.espana },
  { id: 'benidorm-beach', title: 'Benidorm Beach', city: 'Alicante', location: 'Alicante', url: `${BASE}/benidorm/beach`, thumbnailUrl: THUMB.benidorm },
  { id: 'tenerife-resorts', title: 'Tenerife Resorts', city: 'Tenerife', location: 'Tenerife, Canarias', url: `${BASE}/tenerife/resorts`, thumbnailUrl: THUMB.tenerife },
  { id: 'mallorca-beaches', title: 'Mallorca Beaches', city: 'Baleares', location: 'Baleares', url: `${BASE}/mallorca/beaches`, thumbnailUrl: THUMB.baleares },
  { id: 'puerto-del-carmen-beach', title: 'Puerto Del Carmen Beach', city: 'Lanzarote', location: 'Lanzarote', url: `${BASE}/lanzarote/puerto-del-carmen-beach`, thumbnailUrl: THUMB.lanzarote },
  { id: 'gran-canaria-beaches', title: 'Gran Canaria Beaches', city: 'Gran Canaria', location: 'Gran Canaria', url: `${BASE}/gran-canaria/beaches`, thumbnailUrl: THUMB.granCanaria },
  { id: 'beach-bar-costa-teguise', title: 'Beach Bar Costa Teguise', city: 'Lanzarote', location: 'Lanzarote', url: `${BASE}/lanzarote/beach-bar-costa-teguise`, thumbnailUrl: THUMB.lanzarote },
  { id: 'ibiza-port', title: "Ibiza - Port d'Eivissa", city: 'Baleares', location: 'Baleares', url: `${BASE}/balearic-islands/ibiza-port-d-eivissa`, thumbnailUrl: THUMB.ibiza },
  { id: 'port-las-palmas', title: 'Port of Las Palmas', city: 'Gran Canaria', location: 'Gran Canaria', url: `${BASE}/las-palmas/port`, thumbnailUrl: THUMB.granCanaria },
];
