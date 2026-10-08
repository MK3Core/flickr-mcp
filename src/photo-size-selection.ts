/** Flickr `photos.getSizes` entry (subset of fields we use). */
export interface FlickrPhotoSize {
  label: string;
  source: string;
  width: string;
  height: string;
}

export type PhotoImageSize = 'medium' | 'large';

function longEdge(width: number, height: number): number {
  return Math.max(width, height);
}

function parseLongEdge(size: FlickrPhotoSize): number {
  const edge = longEdge(Number(size.width), Number(size.height));
  return Number.isFinite(edge) ? edge : -1;
}

/** Pick a size from `flickr.photos.getSizes` without constructing URLs manually. */
export function selectPhotoSizeFromFlickrSizes(
  sizes: FlickrPhotoSize[],
  imageSize: PhotoImageSize
): FlickrPhotoSize | null {
  if (!sizes.length) return null;

  if (imageSize === 'medium') {
    return (
      sizes.find(s => s.label === 'Medium') ??
      sizes.find(s => s.label === 'Small') ??
      sizes[0]
    );
  }

  const pool = sizes.filter(s => s.label !== 'Original');
  if (!pool.length) return null;

  const large1600 = pool.find(s => s.label === 'Large 1600');
  if (large1600) return large1600;

  let largest: FlickrPhotoSize | null = null;
  let largestEdge = -1;
  for (const size of pool) {
    const edge = parseLongEdge(size);
    if (edge > largestEdge) {
      largestEdge = edge;
      largest = size;
    }
  }
  return largest ?? pool[pool.length - 1] ?? null;
}
