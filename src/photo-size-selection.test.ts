import { describe, expect, it } from 'vitest';
import {
  selectPhotoSizeFromFlickrSizes,
  type FlickrPhotoSize,
} from './photo-size-selection.js';

function mockSize(label: string, width: number, height: number): FlickrPhotoSize {
  return {
    label,
    source: `https://live.staticflickr.com/0000/photo_${label.replace(/\s+/g, '_')}.jpg`,
    width: String(width),
    height: String(height),
  };
}

/** Typical Flickr getSizes labels; order intentionally varies per test. */
const fullSizeList = (): FlickrPhotoSize[] => [
  mockSize('Square', 75, 75),
  mockSize('Thumb', 100, 67),
  mockSize('Small', 240, 160),
  mockSize('Medium', 500, 333),
  mockSize('Large', 1024, 683),
  mockSize('Large 1600', 1600, 1067),
  mockSize('Original', 4000, 2667),
];

describe('selectPhotoSizeFromFlickrSizes', () => {
  it('selects Medium when image_size is omitted (default medium path)', () => {
    const selected = selectPhotoSizeFromFlickrSizes(fullSizeList(), 'medium');
    expect(selected?.label).toBe('Medium');
    expect(selected?.width).toBe('500');
    expect(selected?.height).toBe('333');
  });

  it('selects Flickr Medium (~500px long edge) for image_size medium', () => {
    const selected = selectPhotoSizeFromFlickrSizes(fullSizeList(), 'medium');
    expect(selected?.label).toBe('Medium');
    expect(Number(selected?.width)).toBe(500);
    expect(Number(selected?.height)).toBe(333);
  });

  it('prefers Large 1600 for image_size large when available', () => {
    const selected = selectPhotoSizeFromFlickrSizes(fullSizeList(), 'large');
    expect(selected?.label).toBe('Large 1600');
    expect(selected?.width).toBe('1600');
    expect(selected?.height).toBe('1067');
  });

  it('falls back to the largest non-original size when Large 1600 is unavailable', () => {
    const sizes = fullSizeList().filter(s => s.label !== 'Large 1600');
    const selected = selectPhotoSizeFromFlickrSizes(sizes, 'large');
    expect(selected?.label).toBe('Large');
    expect(Number(selected?.width)).toBe(1024);
  });

  it('never selects Original for image_size large', () => {
    expect(selectPhotoSizeFromFlickrSizes([mockSize('Original', 4000, 2667)], 'large')).toBeNull();

    const originalFirst = [
      mockSize('Original', 4000, 2667),
      mockSize('Medium', 500, 333),
      mockSize('Large', 1024, 683),
    ];
    const selected = selectPhotoSizeFromFlickrSizes(originalFirst, 'large');
    expect(selected?.label).not.toBe('Original');
    expect(selected?.label).toBe('Large');
  });

  it('handles unsorted size lists (Large 1600 not last)', () => {
    const shuffled = [
      mockSize('Large 1600', 1600, 1067),
      mockSize('Original', 4000, 2667),
      mockSize('Thumb', 100, 67),
      mockSize('Large', 1024, 683),
      mockSize('Medium', 500, 333),
    ];
    const selected = selectPhotoSizeFromFlickrSizes(shuffled, 'large');
    expect(selected?.label).toBe('Large 1600');
  });

  it('returns null for an empty size list', () => {
    expect(selectPhotoSizeFromFlickrSizes([], 'medium')).toBeNull();
    expect(selectPhotoSizeFromFlickrSizes([], 'large')).toBeNull();
  });

  it('handles missing or non-numeric dimensions when choosing large fallback', () => {
    const sizes: FlickrPhotoSize[] = [
      { label: 'Large', source: 'https://example.com/l.jpg', width: 'n/a', height: 'n/a' },
      { label: 'Medium', source: 'https://example.com/m.jpg', width: '500', height: '333' },
    ];
    const selected = selectPhotoSizeFromFlickrSizes(sizes, 'large');
    expect(selected?.label).toBe('Medium');
  });

  it('medium falls back to Small then first entry when Medium is absent', () => {
    const withoutMedium = fullSizeList().filter(s => s.label !== 'Medium');
    expect(selectPhotoSizeFromFlickrSizes(withoutMedium, 'medium')?.label).toBe('Small');

    const onlyThumb = [mockSize('Thumb', 100, 67)];
    expect(selectPhotoSizeFromFlickrSizes(onlyThumb, 'medium')?.label).toBe('Thumb');
  });
});
