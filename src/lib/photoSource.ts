export type PhotoSource = 'camera' | 'gallery' | 'files';

export const PHOTO_SOURCE_INPUT_ATTR: Record<PhotoSource, { capture?: string; accept: string }> = {
  camera: { capture: 'environment', accept: 'image/*' },
  gallery: { accept: 'image/*' },
  files: { accept: '*/*' },
};
