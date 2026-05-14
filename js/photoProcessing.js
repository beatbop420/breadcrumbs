const PHOTO_NORMALIZATION_INPUT_TYPES = ['image/heic', 'image/heif'];
const PHOTO_NORMALIZATION_INPUT_EXTENSIONS = ['heic', 'heif'];
const PHOTO_NORMALIZATION_OUTPUT_TYPE = 'image/jpeg';
const PHOTO_NORMALIZATION_OUTPUT_EXTENSION = 'jpg';
const PHOTO_NORMALIZATION_OUTPUT_QUALITY = 0.92;

function normalizePhotoMimeType(rawMimeType) {
  return typeof rawMimeType === 'string' ? rawMimeType.trim().toLowerCase() : '';
}

function extractFileExtension(fileName) {
  if (typeof fileName !== 'string') return '';
  const trimmedName = fileName.trim().toLowerCase();
  if (!trimmedName.includes('.')) return '';
  return trimmedName.split('.').pop() || '';
}

function requiresPhotoNormalization(file) {
  if (!file) return false;
  const mimeType = normalizePhotoMimeType(file.type);
  if (PHOTO_NORMALIZATION_INPUT_TYPES.includes(mimeType)) return true;
  return PHOTO_NORMALIZATION_INPUT_EXTENSIONS.includes(extractFileExtension(file.name));
}

function buildNormalizedPhotoName(file) {
  const rawName = typeof file?.name === 'string' ? file.name.trim() : '';
  if (!rawName) return `photo.${PHOTO_NORMALIZATION_OUTPUT_EXTENSION}`;
  const normalizedName = rawName.replace(/\.[^.]+$/, '');
  return `${normalizedName || 'photo'}.${PHOTO_NORMALIZATION_OUTPUT_EXTENSION}`;
}

async function decodeImageSource(file, objectUrl, {
  createImageBitmapFn = globalThis.createImageBitmap,
  ImageCtor = globalThis.Image,
} = {}) {
  if (typeof createImageBitmapFn === 'function') {
    return createImageBitmapFn(file);
  }

  if (typeof ImageCtor !== 'function') {
    throw new Error('[Breadcrumbs] No supported image decoder is available for photo normalization.');
  }

  return new Promise((resolve, reject) => {
    const image = new ImageCtor();
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', () => {
      reject(new Error('[Breadcrumbs] Photo normalization failed while decoding the selected image.'));
    }, { once: true });
    image.src = objectUrl;
  });
}

function getImageDimensions(imageSource) {
  const width = imageSource?.width || imageSource?.naturalWidth || 0;
  const height = imageSource?.height || imageSource?.naturalHeight || 0;
  if (!width || !height) {
    throw new Error('[Breadcrumbs] Photo normalization requires a decoded image with dimensions.');
  }
  return { width, height };
}

function createCanvasElement({ createCanvasFn = null } = {}) {
  if (typeof createCanvasFn === 'function') return createCanvasFn();
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    return document.createElement('canvas');
  }
  throw new Error('[Breadcrumbs] No canvas implementation is available for photo normalization.');
}

async function canvasToBlob(canvas, type, quality) {
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type, quality });
  }

  if (typeof canvas.toBlob === 'function') {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('[Breadcrumbs] Canvas export returned an empty blob during photo normalization.'));
      }, type, quality);
    });
  }

  throw new Error('[Breadcrumbs] No supported canvas export path is available for photo normalization.');
}

function releaseImageSource(imageSource) {
  if (typeof imageSource?.close === 'function') {
    imageSource.close();
  }
}

async function normalizePhotoForUpload(file, {
  createObjectUrl = (blob) => URL.createObjectURL(blob),
  revokeObjectUrl = (objectUrl) => URL.revokeObjectURL(objectUrl),
  createImageBitmapFn = globalThis.createImageBitmap,
  ImageCtor = globalThis.Image,
  createCanvasFn = null,
  canvasToBlobFn = canvasToBlob,
  FileCtor = globalThis.File,
} = {}) {
  if (!requiresPhotoNormalization(file)) return file;
  if (typeof FileCtor !== 'function') {
    throw new Error('[Breadcrumbs] File construction is unavailable for photo normalization.');
  }

  const objectUrl = createObjectUrl(file);
  let imageSource = null;

  try {
    imageSource = await decodeImageSource(file, objectUrl, { createImageBitmapFn, ImageCtor });
    const { width, height } = getImageDimensions(imageSource);
    const canvas = createCanvasElement({ createCanvasFn });
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('[Breadcrumbs] Canvas 2D context is unavailable for photo normalization.');
    }

    context.drawImage(imageSource, 0, 0, width, height);

    const normalizedBlob = await canvasToBlobFn(
      canvas,
      PHOTO_NORMALIZATION_OUTPUT_TYPE,
      PHOTO_NORMALIZATION_OUTPUT_QUALITY
    );

    return new FileCtor(
      [normalizedBlob],
      buildNormalizedPhotoName(file),
      {
        type: PHOTO_NORMALIZATION_OUTPUT_TYPE,
        lastModified: Date.now(),
      }
    );
  } finally {
    releaseImageSource(imageSource);
    revokeObjectUrl(objectUrl);
  }
}

export {
  normalizePhotoMimeType,
  requiresPhotoNormalization,
  buildNormalizedPhotoName,
  normalizePhotoForUpload,
  PHOTO_NORMALIZATION_INPUT_TYPES,
  PHOTO_NORMALIZATION_OUTPUT_TYPE,
};
