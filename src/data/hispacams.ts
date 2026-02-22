/**
 * Listado estático de webcams de playas de España desde Hispacams.
 * Solo se embeberá el contenido desde la URL oficial; no se descarga ni redistribuye el vídeo.
 * Fuente: https://www.hispacams.com/playas/
 * Imágenes: Wikimedia Commons (fotos reales de cada playa o zona).
 */

import { THUMB } from './webcamThumbnails';

const BASE = 'https://www.hispacams.com';

export interface HispacamsPlaya {
  id: string;
  title: string;
  city: string;
  location: string;
  url: string;
  thumbnailUrl?: string;
}

export const HISPACAMS_PLAYAS: HispacamsPlaya[] = [
  { id: 'playa-de-la-griega-ii', title: 'Playa de La Griega II', city: 'Asturias', location: 'Asturias, Colunga', url: `${BASE}/webcams/playa-de-la-griega-ii/`, thumbnailUrl: THUMB.asturiasColunga },
  { id: 'playa-de-san-pedro-de-la-ribera', title: 'Playa de San Pedro de La Ribera', city: 'Asturias', location: 'Asturias, Cudillero', url: `${BASE}/webcams/playa-de-san-pedro-de-la-ribera/`, thumbnailUrl: THUMB.cudillero },
  { id: 'playa-de-xago-ii', title: 'Playa de Xagó II', city: 'Asturias', location: 'Asturias, Gozón, Xagó', url: `${BASE}/webcams/playa-de-xago-ii/`, thumbnailUrl: THUMB.playaXago },
  { id: 'playa-del-sablon-cubos', title: 'Playa del Sablón II – Cubos de la Memoria', city: 'Asturias', location: 'Asturias, Llanes', url: `${BASE}/webcams/playa-del-sablon-cubos-de-la-memoria-llanes/`, thumbnailUrl: THUMB.playaBorizuLlanes },
  { id: 'santa-marina-barra-ribadesella', title: 'Santa Marina – Barra de Ribadesella', city: 'Asturias', location: 'Asturias, Ribadesella', url: `${BASE}/webcams/santa-marina-barra-de-ribadesella/`, thumbnailUrl: THUMB.asturiasRibadesella },
  { id: 'playa-de-cobreces', title: 'Playa de Luaña, Cóbreces', city: 'Cantabria', location: 'Cantabria, Alfoz de Lloredo, Cóbreces', url: `${BASE}/webcams/playa-de-cobreces/`, thumbnailUrl: THUMB.cantabria },
  { id: 'sanxenxo-ii', title: 'Sanxenxo II', city: 'Pontevedra', location: 'Pontevedra, Sanxenxo', url: `${BASE}/webcams/sanxenxo-ii/`, thumbnailUrl: THUMB.pontevedra },
  { id: 'playa-de-san-juan-de-la-canal', title: 'Playa de San Juan de la Canal', city: 'Cantabria', location: 'Cantabria, Santa Cruz de Bezana, Soto de la Marina', url: `${BASE}/webcams/playa-de-san-juan-de-la-canal/`, thumbnailUrl: THUMB.cantabria },
  { id: 'playa-de-la-palombina', title: 'Playa de La Palombina', city: 'Asturias', location: 'Asturias, Llanes, Celorio', url: `${BASE}/webcams/playa-de-la-palombina/`, thumbnailUrl: THUMB.playaBorizuLlanes },
  { id: 'playa-de-barro-ii', title: 'Playa de Barro II', city: 'Asturias', location: 'Asturias, Llanes, Barro', url: `${BASE}/webcams/playa-de-barro-ii/`, thumbnailUrl: THUMB.playaBorizuLlanes },
  { id: 'puente-puerto-ribadesella', title: 'Puente y Puerto deportivo de Ribadesella', city: 'Asturias', location: 'Asturias, Ribadesella', url: `${BASE}/webcams/puente-y-puerto-deportivo-de-ribadesella/`, thumbnailUrl: THUMB.asturiasRibadesella },
  { id: 'cudillero', title: 'Cudillero', city: 'Asturias', location: 'Asturias, Cudillero', url: `${BASE}/webcams/cudillero/`, thumbnailUrl: THUMB.cudillero },
  { id: 'playa-de-rodiles-i', title: 'Playa de Rodiles I', city: 'Asturias', location: 'Asturias, Villaviciosa', url: `${BASE}/webcams/playa-de-rodiles-i/`, thumbnailUrl: THUMB.playaRodiles },
  { id: 'playa-de-poniente-fomento', title: 'Playa de Poniente – Fomento – El Musel', city: 'Asturias', location: 'Asturias, Gijón', url: `${BASE}/webcams/playa-de-poniente-fomento/`, thumbnailUrl: THUMB.gijonSanLorenzo },
  { id: 'estany-des-peix', title: 'Estany des Peix', city: 'Formentera', location: 'Formentera, Formentera', url: `${BASE}/webcams/estany-des-peix/`, thumbnailUrl: THUMB.formentera },
  { id: 'ria-de-ribadesella', title: 'Ría de Ribadesella', city: 'Asturias', location: 'Asturias, Ribadesella', url: `${BASE}/webcams/ria-de-ribadesella/`, thumbnailUrl: THUMB.asturiasRibadesella },
  { id: 'costa-caravia-arenal-moris', title: 'Costa de Caravia – Arenal de Morís', city: 'Asturias', location: 'Asturias, Caravia', url: `${BASE}/webcams/costa-de-caravia-arenal-de-moris/`, thumbnailUrl: THUMB.asturiasCaravia },
  { id: 'playa-santa-marina-ii', title: 'Playa de Santa Marina II', city: 'Asturias', location: 'Asturias, Ribadesella', url: `${BASE}/webcams/playa-de-santa-marina-ii/`, thumbnailUrl: THUMB.asturiasRibadesella },
  { id: 'playa-santa-marina-i', title: 'Playa de Santa Marina I', city: 'Asturias', location: 'Asturias, Ribadesella', url: `${BASE}/webcams/playa-de-santa-marina-i/`, thumbnailUrl: THUMB.asturiasRibadesella },
  { id: 'playa-de-les-teyes', title: 'Playa de Les Teyes – Arenal de Morís', city: 'Asturias', location: 'Asturias, Caravia', url: `${BASE}/webcams/playa-de-les-teyes-arenal-de-moris/`, thumbnailUrl: THUMB.asturiasCaravia },
  { id: 'playa-de-barro-i', title: 'Playa de Barro I', city: 'Asturias', location: 'Asturias, Llanes, Barro', url: `${BASE}/webcams/playa-de-barro/`, thumbnailUrl: THUMB.playaBorizuLlanes },
  { id: 'playa-de-portelo', title: 'Playa de Portelo', city: 'Lugo', location: 'Lugo, Burela', url: `${BASE}/webcams/playa-de-portelo/`, thumbnailUrl: THUMB.lugo },
  { id: 'playa-san-lorenzo-san-pedro', title: 'Playa de San Lorenzo – San Pedro', city: 'Gijón', location: 'Gijón', url: `${BASE}/webcams/playa-de-san-lorenzo-san-pedro/`, thumbnailUrl: THUMB.gijonSanLorenzo },
  { id: 'playa-espana', title: 'Playa España', city: 'Asturias', location: 'Asturias, Villaviciosa, Quintes', url: `${BASE}/webcams/playa-espana/`, thumbnailUrl: THUMB.playaRodiles },
  { id: 'playa-de-la-griega-i', title: 'Playa de La Griega I', city: 'Asturias', location: 'Asturias, Colunga', url: `${BASE}/webcams/playa-de-la-griega-i/`, thumbnailUrl: THUMB.asturiasColunga },
  { id: 'playa-de-la-marosa', title: 'Playa de La Marosa', city: 'Lugo', location: 'Lugo, Burela', url: `${BASE}/webcams/playa-de-la-marosa/`, thumbnailUrl: THUMB.lugo },
  { id: 'playa-de-navia', title: 'Playa de Navia', city: 'Asturias', location: 'Asturias, Navia', url: `${BASE}/webcams/playa-de-navia/`, thumbnailUrl: THUMB.playaPenarronda },
  { id: 'playa-de-la-rapadoira', title: 'Foz – Playa de La Rapadoira', city: 'Lugo', location: 'Lugo, Foz', url: `${BASE}/webcams/playa-de-la-rapadoira/`, thumbnailUrl: THUMB.lugo },
  { id: 'playa-de-frejulfe', title: 'Playa de Frejulfe', city: 'Asturias', location: 'Asturias, Navia', url: `${BASE}/webcams/playa-de-frejulfe/`, thumbnailUrl: THUMB.playaPenarronda },
  { id: 'playa-del-viso-la-espasa', title: 'Playa del Viso – La Espasa', city: 'Asturias', location: 'Asturias, Caravia', url: `${BASE}/webcams/playa-del-viso-la-espasa/`, thumbnailUrl: THUMB.asturiasCaravia },
  { id: 'playa-de-aguilar-ii', title: 'Playa de Aguilar II', city: 'Asturias', location: 'Asturias, Muros de Nalón', url: `${BASE}/webcams/playa-de-aguilar-ii/`, thumbnailUrl: THUMB.asturiasMurosNalon },
  { id: 'playa-de-la-espasa-ii', title: 'Playa de La Espasa II', city: 'Asturias', location: 'Asturias, Caravia', url: `${BASE}/webcams/playa-de-la-espasa-ii/`, thumbnailUrl: THUMB.asturiasCaravia },
  { id: 'playa-de-la-espasa-i', title: 'Playa de la Espasa I', city: 'Asturias', location: 'Asturias, Caravia', url: `${BASE}/webcams/playa-de-la-espasa-i/`, thumbnailUrl: THUMB.asturiasCaravia },
  { id: 'playa-de-tazones', title: 'Playa de Tazones', city: 'Asturias', location: 'Asturias, Villaviciosa, Tazones', url: `${BASE}/webcams/playa-de-tazones/`, thumbnailUrl: THUMB.playaRodiles },
  { id: 'playa-de-penarronda', title: 'Playa de Penarronda I', city: 'Asturias', location: 'Asturias, Castropol', url: `${BASE}/webcams/playa-de-penarronda/`, thumbnailUrl: THUMB.playaPenarronda },
  { id: 'mirador-playa-de-toro', title: 'Mirador – Playa de Toró', city: 'Asturias', location: 'Asturias, Llanes', url: `${BASE}/webcams/mirador-playa-de-toro/`, thumbnailUrl: THUMB.playaBorizuLlanes },
  { id: 'playa-de-san-antolin', title: 'Playa de San Antolín', city: 'Asturias', location: 'Asturias, Llanes', url: `${BASE}/webcams/playa-de-san-antolin/`, thumbnailUrl: THUMB.playaBorizuLlanes },
  { id: 'playa-de-la-franca', title: 'Playa de La Franca', city: 'Asturias', location: 'Asturias, Ribadedeva, La Franca', url: `${BASE}/webcams/playa-de-la-franca/`, thumbnailUrl: THUMB.asturiasRibadedeva },
  { id: 'playa-del-sablon', title: 'Playa del Sablón', city: 'Asturias', location: 'Asturias, Llanes', url: `${BASE}/webcams/playa-del-sablon/`, thumbnailUrl: THUMB.playaBorizuLlanes },
  { id: 'playa-de-san-lorenzo-bahia', title: 'Playa de San Lorenzo – Bahía de Gijón', city: 'Asturias', location: 'Asturias, Gijón', url: `${BASE}/webcams/playa-de-san-lorenzo-bahia-de-gijon/`, thumbnailUrl: THUMB.gijonSanLorenzo },
  { id: 'playa-de-vega', title: 'Playa de Vega', city: 'Asturias', location: 'Asturias, Ribadesella, Vega', url: `${BASE}/webcams/playa-de-vega/`, thumbnailUrl: THUMB.asturiasRibadesella },
  { id: 'playa-salinas', title: 'Playa Salinas', city: 'Asturias', location: 'Asturias, Castrillón, Salinas', url: `${BASE}/webcams/playa-salinas/`, thumbnailUrl: THUMB.playaSalinas },
  { id: 'playa-de-xago-i', title: 'Playa de Xagó I', city: 'Asturias', location: 'Asturias, Gozón, Xagó', url: `${BASE}/webcams/playa-de-xago/`, thumbnailUrl: THUMB.playaXago },
  { id: 'playa-de-aguilar-i', title: 'Playa de Aguilar I', city: 'Asturias', location: 'Asturias, Muros de Nalón', url: `${BASE}/webcams/playa-de-aguilar/`, thumbnailUrl: THUMB.asturiasMurosNalon },
  { id: 'playa-san-lorenzo-rinconin', title: 'Playa de San Lorenzo – El Rinconín', city: 'Asturias', location: 'Asturias, Gijón', url: `${BASE}/webcams/playa-de-san-lorenzo-el-rinconin/`, thumbnailUrl: THUMB.gijonSanLorenzo },
  { id: 'arenal-de-moris', title: 'Arenal de Morís', city: 'Asturias', location: 'Asturias, Caravia', url: `${BASE}/webcams/arenal-de-moris/`, thumbnailUrl: THUMB.asturiasCaravia },
  { id: 'sanxenxo-playa-silgar', title: 'Sanxenxo I – Playa de Silgar', city: 'Pontevedra', location: 'Pontevedra, Sanxenxo', url: `${BASE}/webcams/sanxenxo-playa-de-silgar/`, thumbnailUrl: THUMB.pontevedra },
  { id: 'roquetas-de-mar', title: 'Roquetas de Mar – Playa de la Urbanización', city: 'Almería', location: 'Almería, Roquetas de Mar', url: `${BASE}/webcams/roquetas-de-mar-playa-de-la-urbanizacion/`, thumbnailUrl: THUMB.almeria },
  { id: 'playa-de-oyambre', title: 'Playa de Oyambre – San Vicente de la Barquera', city: 'Cantabria', location: 'Cantabria, San Vicente de la Barquera', url: `${BASE}/webcams/san-vicente-de-la-barquera-oyambre-playa-de-oyambre-pajaro-amarillo/`, thumbnailUrl: THUMB.cantabria },
  { id: 'coruxo-playa-o-vao', title: 'Coruxo – Playa de O Vao – Toralla', city: 'Pontevedra', location: 'Pontevedra, Vigo, Coruxo', url: `${BASE}/webcams/coruxo-playa-de-o-vao-toralla/`, thumbnailUrl: THUMB.pontevedra },
  { id: 'playa-san-lorenzo-tostaderu', title: 'Playa de San Lorenzo – El Tostaderu', city: 'Asturias', location: 'Asturias, Gijón', url: `${BASE}/webcams/playa-de-san-lorenzo-tostaderu/`, thumbnailUrl: THUMB.gijonSanLorenzo },
];
