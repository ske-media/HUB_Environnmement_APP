import { PDFDocument, PDFForm, PDFImage, PDFTextField } from 'pdf-lib';
import { supabase } from '../supabase';
import { resolveSurveyPhotoUrl } from '../photos/surveyPhotoPipeline';
import { isBlobUrl } from '../safePhotoUrl';

/**
 * Utilitaire unique d'embarquement photo pour tous les générateurs PDF.
 *
 * Responsabilités :
 *  1. Récupérer les octets de l'image quelle que soit la source (data URI,
 *     Supabase Storage public/signé, URL HTTP standard).
 *  2. Corriger l'orientation EXIF via un canvas (JPEG uniquement – les PNG
 *     n'ont pas d'EXIF d'orientation).
 *  3. Embarquer l'image dans le document `pdf-lib`.
 *  4. La dessiner dans la zone d'un champ de formulaire en respectant un
 *     **fit proportionnel "contain"** (pas de déformation, centrée dans le
 *     rectangle du champ).
 */

const SURVEY_PHOTOS_BUCKET = 'survey-photos';

// ---------------------------------------------------------------------------
// 1. Téléchargement des octets
// ---------------------------------------------------------------------------

function extractPathFromSupabaseUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const patterns = [
      /\/storage\/v1\/object\/public\/[^/]+\/(.+)/,
      /\/storage\/v1\/object\/sign\/[^/]+\/(.+)/,
      /\/storage\/v1\/object\/[^/]+\/[^/]+\/(.+)/,
    ];
    for (const rx of patterns) {
      const m = urlObj.pathname.match(rx);
      if (m && m[1]) return decodeURIComponent(m[1]);
    }
  } catch (error) {
    console.warn('[embedPhoto] URL Supabase invalide:', url, error);
  }
  return null;
}

function base64ToBytes(dataUri: string): ArrayBuffer {
  const base64 = dataUri.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { headers: { Accept: 'image/*' } });
  if (!response.ok) {
    throw new Error(`Impossible de télécharger l'image (${response.status})`);
  }
  return await response.arrayBuffer();
}

async function loadImageBytes(rawImageUrl: string): Promise<ArrayBuffer> {
  if (rawImageUrl.startsWith('data:')) return base64ToBytes(rawImageUrl);

  // Normalise les valeurs héritées : chemin de stockage relatif résolu en URL
  // publique, `blob:` expiré court-circuité avec un message explicite.
  const imageUrl = resolveSurveyPhotoUrl(rawImageUrl);
  if (!imageUrl) {
    throw new Error(
      isBlobUrl(rawImageUrl)
        ? "Photo non synchronisée (lien local expiré) : elle ne peut pas être intégrée au PDF."
        : `Référence de photo inexploitable : ${rawImageUrl}`
    );
  }

  if (imageUrl.includes('supabase')) {
    const filePath = extractPathFromSupabaseUrl(imageUrl);
    if (filePath) {
      const { data, error } = await supabase.storage
        .from(SURVEY_PHOTOS_BUCKET)
        .download(filePath);
      if (!error && data) return await data.arrayBuffer();

      try {
        const { data: signed } = await supabase.storage
          .from(SURVEY_PHOTOS_BUCKET)
          .createSignedUrl(filePath, 3600);
        if (signed?.signedUrl) return await fetchBytes(signed.signedUrl);
      } catch (signedError) {
        console.warn('[embedPhoto] URL signée indisponible:', signedError);
      }
    }
  }

  return await fetchBytes(imageUrl);
}

// ---------------------------------------------------------------------------
// 2. Détection du type + correction EXIF
// ---------------------------------------------------------------------------

type ImageKind = 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'unknown';

function detectImageKind(bytes: Uint8Array): ImageKind {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg';
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'gif';
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'bmp';
  return 'unknown';
}

function mimeFromKind(kind: ImageKind): string {
  switch (kind) {
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Lit le tag EXIF Orientation (0x0112) dans un flux JPEG. Retourne 1 (upright)
 * si absent ou illisible. Valeurs possibles :
 *   1: normal, 3: 180°, 6: 90° CW, 8: 90° CCW (autres : miroirs).
 */
function readJpegOrientation(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;

  while (offset < view.byteLength) {
    const marker = view.getUint16(offset);
    offset += 2;
    if (marker === 0xffe1) {
      // APP1
      const segmentSize = view.getUint16(offset);
      if (view.getUint32(offset + 2) !== 0x45786966) return 1; // "Exif"
      const tiffStart = offset + 8;
      const little = view.getUint16(tiffStart) === 0x4949;
      const get16 = (o: number) => view.getUint16(o, little);
      const get32 = (o: number) => view.getUint32(o, little);

      if (get16(tiffStart + 2) !== 0x002a) return 1;
      const ifdOffset = tiffStart + get32(tiffStart + 4);
      const tagCount = get16(ifdOffset);
      for (let i = 0; i < tagCount; i++) {
        const entry = ifdOffset + 2 + i * 12;
        if (get16(entry) === 0x0112) {
          return get16(entry + 8) || 1;
        }
      }
      offset += segmentSize;
    } else if ((marker & 0xff00) !== 0xff00) {
      break;
    } else {
      const size = view.getUint16(offset);
      offset += size;
    }
  }
  return 1;
}

async function decodeImage(bytes: Uint8Array, mime: string): Promise<HTMLImageElement> {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Décode un JPEG sans appliquer l'auto-orientation EXIF du moteur de rendu,
 * afin que la matrice de correction soit appliquée de façon déterministe.
 */
async function decodeJpegWithoutAutoOrientation(
  bytes: Uint8Array,
): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  const blob = new Blob([bytes], { type: 'image/jpeg' });

  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'none' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fallback vers HTMLImageElement ci-dessous.
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.style.imageOrientation = 'none';
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Ré-encode un JPEG « droit » (orientation EXIF neutralisée = 1) via un canvas.
 *
 * Applique systématiquement la matrice EXIF lue dans les métadonnées sur des
 * pixels bruts (sans auto-orientation navigateur), puis ré-encode en JPEG sans
 * tag d'orientation — ce qui évite les double-rotations dans les Webviews Android.
 *
 * Si l'orientation est déjà 1, si le canvas est indisponible ou en cas d'échec,
 * renvoie les octets d'origine sans bloquer la génération du PDF.
 */
async function normalizeJpegOrientation(bytes: Uint8Array): Promise<Uint8Array> {
  const orientation = readJpegOrientation(bytes);
  if (orientation === 1) return bytes;
  if (typeof document === 'undefined') return bytes;

  let decoded: { source: CanvasImageSource; width: number; height: number; close?: () => void } | null =
    null;

  try {
    decoded = await decodeJpegWithoutAutoOrientation(bytes);
    const { source, width: imgW, height: imgH } = decoded;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return bytes;

    const swapOrientation = orientation >= 5 && orientation <= 8;
    canvas.width = swapOrientation ? imgH : imgW;
    canvas.height = swapOrientation ? imgW : imgH;

    switch (orientation) {
      case 2:
        ctx.transform(-1, 0, 0, 1, imgW, 0);
        break;
      case 3:
        ctx.transform(-1, 0, 0, -1, imgW, imgH);
        break;
      case 4:
        ctx.transform(1, 0, 0, -1, 0, imgH);
        break;
      case 5:
        ctx.transform(0, 1, 1, 0, 0, 0);
        break;
      case 6:
        ctx.transform(0, 1, -1, 0, imgH, 0);
        break;
      case 7:
        ctx.transform(0, -1, -1, 0, imgH, imgW);
        break;
      case 8:
        ctx.transform(0, -1, 1, 0, 0, imgW);
        break;
      default:
        break;
    }
    ctx.drawImage(source, 0, 0);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    );
    if (!blob) return bytes;
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  } catch (error) {
    console.warn('[embedPhoto] Impossible de normaliser l\'orientation EXIF:', error);
    return bytes;
  } finally {
    decoded?.close?.();
  }
}

/**
 * Convertit une image en PNG via canvas pour les formats non supportés
 * nativement par pdf-lib (WEBP, GIF, BMP, etc.).
 */
async function transcodeToPng(bytes: Uint8Array, mime: string): Promise<Uint8Array | null> {
  if (typeof document === 'undefined') return null;

  try {
    const img = await decodeImage(bytes, mime);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) return null;

    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  } catch (error) {
    console.warn('[embedPhoto] Conversion PNG impossible:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 3. Embarquement pdf-lib + rendu fit proportionnel
// ---------------------------------------------------------------------------

async function embedImage(pdfDoc: PDFDocument, rawBytes: ArrayBuffer): Promise<PDFImage> {
  const first = new Uint8Array(rawBytes);
  const kind = detectImageKind(first);

  if (kind === 'png') return await pdfDoc.embedPng(rawBytes);

  if (kind === 'jpeg') {
    const normalized = await normalizeJpegOrientation(first);
    return await pdfDoc.embedJpg(normalized);
  }

  // WEBP/GIF/BMP/unknown : conversion en PNG via canvas.
  const convertedPng = await transcodeToPng(first, mimeFromKind(kind));
  if (convertedPng) {
    return await pdfDoc.embedPng(convertedPng);
  }

  // Dernier recours : tenter quand même PNG puis JPEG pour les cas exotiques.
  try {
    return await pdfDoc.embedPng(first);
  } catch {
    return await pdfDoc.embedJpg(first);
  }
}

interface FitRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calcule le rectangle de dessin en mode "contain" (fit proportionnel), centré
 * dans le rectangle du champ.
 */
function computeContainRect(
  fieldRect: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): FitRect {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return fieldRect;
  }
  const scale = Math.min(fieldRect.width / imageWidth, fieldRect.height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  return {
    x: fieldRect.x + (fieldRect.width - drawWidth) / 2,
    y: fieldRect.y + (fieldRect.height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  };
}

function findPlaceholder(form: PDFForm, fieldName: string): PDFTextField | null {
  try {
    return form.getTextField(fieldName);
  } catch {
    // ignore
  }
  // Recherche tolérante (camelCase/underscore etc.)
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = normalize(fieldName);
  const matched = form.getFields().find((f) => {
    const name = f.getName();
    return (
      name === fieldName ||
      normalize(name) === target ||
      name.includes(fieldName) ||
      fieldName.includes(name)
    );
  });
  return matched instanceof PDFTextField ? matched : null;
}

/**
 * Charge + normalise + embarque + dessine une photo dans le rectangle d'un
 * champ PDF (fit proportionnel). Non bloquant : journalise un warning si ça
 * échoue.
 *
 * @returns `true` si la photo a été dessinée, `false` sinon.
 */
export async function embedPhotoInField(
  pdfDoc: PDFDocument,
  form: PDFForm,
  fieldName: string,
  imageUrl: string | null | undefined,
): Promise<boolean> {
  if (!imageUrl) return false;

  const placeholder = findPlaceholder(form, fieldName);
  if (!placeholder) {
    console.warn(`[embedPhoto] Aucun placeholder trouvé pour "${fieldName}"`);
    return false;
  }

  try {
    const bytes = await loadImageBytes(imageUrl);
    const image = await embedImage(pdfDoc, bytes);

    const widgets = placeholder.acroField.getWidgets();
    if (widgets.length === 0) return false;
    const widget = widgets[0];
    const rectangle = widget.getRectangle();

    // Retrouver la page qui héberge réellement le widget.
    const widgetPageRef = widget.P();
    const targetPage =
      pdfDoc.getPages().find((p) => p.ref === widgetPageRef) ?? pdfDoc.getPages()[0];

    const fit = computeContainRect(
      { x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height },
      image.width,
      image.height,
    );

    targetPage.drawImage(image, {
      x: fit.x,
      y: fit.y,
      width: fit.width,
      height: fit.height,
    });

    try {
      placeholder.setText('');
    } catch {
      // ignore — certains champs read-only ne peuvent pas être vidés.
    }
    return true;
  } catch (error) {
    console.warn(`[embedPhoto] Échec d'insertion de l'image "${fieldName}":`, error);
    return false;
  }
}

/**
 * Variante qui tente plusieurs noms de champ (utile pour les templates
 * historiques avec des placeholders nommés différemment).
 */
export async function embedPhotoInFirstMatchingField(
  pdfDoc: PDFDocument,
  form: PDFForm,
  fieldNames: string[],
  imageUrl: string | null | undefined,
): Promise<boolean> {
  if (!imageUrl) return false;
  for (const name of fieldNames) {
    const done = await embedPhotoInField(pdfDoc, form, name, imageUrl);
    if (done) return true;
  }
  return false;
}
