/**
 * Webcams de playas de España desde Skylinewebcams.
 * Solo embeber desde la URL oficial. Fuente: https://www.skylinewebcams.com/es/webcam/espana.html
 * Imágenes: Wikimedia Commons (fotos reales de cada playa o zona).
 */

import { THUMB } from './webcamThumbnails';

const BASE = 'https://www.skylinewebcams.com/es/webcam/espana';

export const SKYLINEWEBCAMS_PLAYAS = [
  { id: 'playa-los-cristianos', title: 'Playa de Los Cristianos', city: 'Tenerife', location: 'Tenerife, Canarias', url: `${BASE}/canarias/santa-cruz-de-tenerife/playa-los-cristianos.html`, thumbnailUrl: THUMB.tenerife },
  { id: 'playa-las-vistas', title: 'Playa Las Vistas', city: 'Tenerife', location: 'Tenerife, Canarias', url: `${BASE}/canarias/santa-cruz-de-tenerife/playa-las-vistas.html`, thumbnailUrl: THUMB.tenerife },
  { id: 'playa-la-pinta', title: 'Costa Adeje - Playa La Pinta', city: 'Tenerife', location: 'Tenerife, Canarias', url: `${BASE}/canarias/santa-cruz-de-tenerife/playa-la-pinta.html`, thumbnailUrl: THUMB.tenerife },
  { id: 'playa-troya', title: 'Playa de Troya - Las Américas', city: 'Tenerife', location: 'Tenerife, Canarias', url: `${BASE}/canarias/santa-cruz-de-tenerife/playa-troya.html`, thumbnailUrl: THUMB.tenerife },
  { id: 'playa-grande-las-canteras', title: 'Playa Grande de Las Canteras', city: 'Gran Canaria', location: 'Gran Canaria', url: `${BASE}/canarias/las-palmas-gran-canaria/playa-grande-las-canteras.html`, thumbnailUrl: THUMB.granCanaria },
  { id: 'puerto-de-la-cruz', title: 'Puerto de la Cruz', city: 'Tenerife', location: 'Tenerife, Canarias', url: `${BASE}/canarias/santa-cruz-de-tenerife/puerto-de-la-cruz-tenerife.html`, thumbnailUrl: THUMB.tenerife },
  { id: 'playa-de-la-barrosa', title: 'Playa de la Barrosa', city: 'Cádiz', location: 'Chiclana de la Frontera, Cádiz', url: `${BASE}/andalucia/cadiz/chiclana-de-la-frontera-playa-de-la-barrosa.html`, thumbnailUrl: THUMB.cadiz },
  { id: 'playa-del-duque', title: 'Playa del Duque', city: 'Tenerife', location: 'Costa Adeje, Tenerife', url: `${BASE}/canarias/santa-cruz-de-tenerife/playa-del-duque.html`, thumbnailUrl: THUMB.tenerife },
  { id: 'playa-de-fanabe', title: 'Playa de Fañabé', city: 'Tenerife', location: 'Tenerife, Canarias', url: `${BASE}/canarias/santa-cruz-de-tenerife/playa-de-fanabe.html`, thumbnailUrl: THUMB.tenerife },
  { id: 'playa-de-el-medano', title: 'Playa de El Médano', city: 'Tenerife', location: 'Tenerife, Canarias', url: `${BASE}/canarias/santa-cruz-de-tenerife/playa-de-el-medano.html`, thumbnailUrl: THUMB.tenerife },
  { id: 'playa-del-sardinero', title: 'Playa del Sardinero', city: 'Santander', location: 'Santander, Cantabria', url: `${BASE}/cantabria/santander/playa-del-sardinero.html`, thumbnailUrl: THUMB.santanderSardinero },
  { id: 'benidorm-playa-poniente', title: 'Benidorm - Playa de Poniente', city: 'Alicante', location: 'Alicante, Comunidad Valenciana', url: `${BASE}/comunidad-valenciana/alicante/benidorm-playa-poniente.html`, thumbnailUrl: THUMB.benidorm },
  { id: 'benidorm-playa-poniente-sur', title: 'Benidorm - Playa de Poniente Sur', city: 'Alicante', location: 'Alicante', url: `${BASE}/comunidad-valenciana/alicante/benidorm-playa-poniente-sur.html`, thumbnailUrl: THUMB.benidorm },
  { id: 'playa-sant-sebastia', title: 'Playa de Sant Sebastià', city: 'Barcelona', location: 'Barcelona, Cataluña', url: `${BASE}/cataluna/barcelona/playa-sant-sebastia.html`, thumbnailUrl: THUMB.barcelona },
  { id: 'benidorm-playa-levante', title: 'Benidorm - Playa de Levante', city: 'Alicante', location: 'Alicante', url: `${BASE}/comunidad-valenciana/alicante/benidorm-playa-alicante.html`, thumbnailUrl: THUMB.benidorm },
  { id: 'puerto-del-carmen-pocillos', title: 'Puerto del Carmen - Playa Los Pocillos', city: 'Lanzarote', location: 'Lanzarote', url: `${BASE}/canarias/las-palmas-gran-canaria/puerto-del-carmen-playa-los-pocillos.html`, thumbnailUrl: THUMB.lanzarote },
  { id: 'santiago-puerto-santiago', title: 'Puerto de Santiago - Playa La Arena', city: 'Tenerife', location: 'Tenerife', url: `${BASE}/canarias/santa-cruz-de-tenerife/santiago-del-teide-puerto-de-santiago.html`, thumbnailUrl: THUMB.tenerife },
  { id: 'surf-medano', title: 'El Médano - Surf y kitesurf', city: 'Tenerife', location: 'Tenerife', url: `${BASE}/canarias/santa-cruz-de-tenerife/surf-kitesurf-medano.html`, thumbnailUrl: THUMB.tenerife },
  { id: 'lanzarote-puerto-carmen', title: 'Puerto del Carmen', city: 'Lanzarote', location: 'Lanzarote', url: `${BASE}/canarias/las-palmas-gran-canaria/lanzarote-puerto-del-carmen-tias.html`, thumbnailUrl: THUMB.lanzarote },
  { id: 'gran-playa-santa-pola', title: 'Santa Pola - Gran Playa', city: 'Alicante', location: 'Alicante', url: `${BASE}/comunidad-valenciana/santa-pola/gran-playa.html`, thumbnailUrl: THUMB.alicante },
  { id: 'lloret-de-mar', title: 'Lloret de Mar', city: 'Girona', location: 'Girona, Costa Brava', url: `${BASE}/cataluna/gerona/lloret-de-mar-costa-brava.html`, thumbnailUrl: THUMB.girona },
  { id: 'salinas-asturias', title: 'Salinas - Playa', city: 'Asturias', location: 'Asturias', url: `${BASE}/asturias/salinas/playa.html`, thumbnailUrl: THUMB.playaSalinas },
  { id: 'playa-las-canteras', title: 'Las Palmas - Playa de Las Canteras', city: 'Gran Canaria', location: 'Gran Canaria', url: `${BASE}/canarias/las-palmas-gran-canaria/playa-las-canteras.html`, thumbnailUrl: THUMB.granCanaria },
  { id: 'mogan', title: 'Mogán', city: 'Gran Canaria', location: 'Gran Canaria', url: `${BASE}/canarias/las-palmas-gran-canaria/mogan.html`, thumbnailUrl: THUMB.granCanaria },
  { id: 'fuerteventura-corralejo', title: 'Fuerteventura - Corralejo', city: 'Fuerteventura', location: 'Canarias', url: `${BASE}/canarias/corralejo/fuerteventura-corralejo.html`, thumbnailUrl: THUMB.fuerteventura },
  { id: 'marbella', title: 'Marbella', city: 'Málaga', location: 'Málaga', url: `${BASE}/andalucia/malaga/marbella.html`, thumbnailUrl: THUMB.malaga },
  { id: 'conil-fontanilla', title: 'Conil - Playa de la Fontanilla', city: 'Cádiz', location: 'Cádiz', url: `${BASE}/andalucia/cadiz/conil-de-la-frontera.html`, thumbnailUrl: THUMB.cadiz },
  { id: 'playa-mojacar', title: 'Playa de Mojácar', city: 'Almería', location: 'Almería', url: `${BASE}/andalucia/almeria/playa-de-mojacar.html`, thumbnailUrl: THUMB.almeria },
  { id: 'playa-los-locos', title: 'Suances - Playa de Los Locos', city: 'Cantabria', location: 'Cantabria', url: `${BASE}/cantabria/suances/playa-de-los-locos.html`, thumbnailUrl: THUMB.cantabria },
  { id: 'playa-la-concha-suances', title: 'Suances - Playa de la Concha', city: 'Cantabria', location: 'Cantabria', url: `${BASE}/cantabria/suances/playa-de-la-concha.html`, thumbnailUrl: THUMB.cantabria },
  { id: 'calella-palafrugell', title: 'Calella de Palafrugell', city: 'Girona', location: 'Girona, Costa Brava', url: `${BASE}/cataluna/gerona/calella-de-palafrugell-costa-brava.html`, thumbnailUrl: THUMB.girona },
  { id: 'cala-vadella', title: 'Cala Vadella', city: 'Ibiza', location: 'Ibiza', url: `${BASE}/islas-baleares/ibiza/cala-vadella-ibiza.html`, thumbnailUrl: THUMB.ibiza },
  { id: 'alicante-almadraba', title: 'Alicante - Playa de la Almadraba', city: 'Alicante', location: 'Alicante', url: `${BASE}/comunidad-valenciana/alicante/alicante-playa-almadraba.html`, thumbnailUrl: THUMB.alicante },
  { id: 'calpe-penon', title: 'Calpe - Peñón de Ifach', city: 'Alicante', location: 'Alicante', url: `${BASE}/comunidad-valenciana/alicante/calpe-penon-de-ifach.html`, thumbnailUrl: THUMB.alicante },
  { id: 'peniscola', title: 'Peñíscola', city: 'Castellón', location: 'Castellón', url: `${BASE}/comunidad-valenciana/castellon/peniscola.html`, thumbnailUrl: THUMB.castellon },
  { id: 'manga-mar-menor', title: 'La Manga del Mar Menor', city: 'Murcia', location: 'Murcia', url: `${BASE}/region-de-murcia/murcia/manga-mar-menor.html`, thumbnailUrl: THUMB.murcia },
  { id: 'almunecar', title: 'Almuñécar - Playa de San Cristóbal', city: 'Granada', location: 'Granada', url: `${BASE}/andalucia/granada/playa-de-san-cristobal-almunecar.html`, thumbnailUrl: THUMB.granada },
  { id: 'pollenca-bay', title: 'Mallorca - Bahía de Pollença', city: 'Baleares', location: 'Baleares', url: `${BASE}/islas-baleares/mallorca/pollenca-bay.html`, thumbnailUrl: THUMB.baleares },
];
