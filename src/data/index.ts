import { HISPACAMS_PLAYAS } from './hispacams';
import { LIVECAMWORLD_PLAYAS } from './livecamworld';
import { SKYLINEWEBCAMS_PLAYAS } from './skylinewebcams';
import type { WebcamProvider } from './webcamSources';

const hispacams: WebcamProvider = {
  id: 'hispacams',
  name: 'Hispacams',
  description: 'Red líder de webcams en directo en España',
  items: HISPACAMS_PLAYAS,
};

const skylinewebcams: WebcamProvider = {
  id: 'skylinewebcams',
  name: 'Skylinewebcams',
  description: 'Cámaras en vivo de playas y costas',
  items: SKYLINEWEBCAMS_PLAYAS,
};

const livecamworld: WebcamProvider = {
  id: 'livecamworld',
  name: 'LiveCamworld',
  description: 'Webcams en directo (WorldCams.tv)',
  items: LIVECAMWORLD_PLAYAS,
};

export const WEBCAM_PROVIDERS: WebcamProvider[] = [hispacams, skylinewebcams, livecamworld];

export { HISPACAMS_PLAYAS } from './hispacams';
export type { HispacamsPlaya } from './hispacams';
export { LIVECAMWORLD_PLAYAS } from './livecamworld';
export { SKYLINEWEBCAMS_PLAYAS } from './skylinewebcams';
export type { WebcamItem, WebcamProvider, WebcamProviderId } from './webcamSources';

