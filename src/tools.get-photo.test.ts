import { describe, expect, it, vi } from 'vitest';
import type { FlickrClient, FlickrPhotoDetail } from './flickr-client.js';
import { TOOLS, handleTool } from './tools.js';

const stubPhoto: FlickrPhotoDetail = {
  id: '55558002485',
  title: { _content: 'Test photo' },
  description: { _content: '' },
  tags: { tag: [] },
  urls: { url: [{ type: 'photopage', _content: 'https://www.flickr.com/photos/example/55558002485/' }] },
  dates: { taken: '2024-01-01 12:00:00', posted: '1700000000' },
};

function createMockClient(): FlickrClient {
  return {
    getPhoto: vi.fn().mockResolvedValue(stubPhoto),
    getPhotoImageBase64: vi.fn().mockResolvedValue({
      data: 'base64data',
      mimeType: 'image/jpeg',
      label: 'Medium',
      width: 500,
      height: 333,
    }),
  } as unknown as FlickrClient;
}

describe('flickr_get_photo image_size', () => {
  it('uses Medium when include_image is true and image_size is omitted', async () => {
    const client = createMockClient();
    await handleTool('flickr_get_photo', { photo_id: '55558002485', include_image: true }, client);

    expect(client.getPhotoImageBase64).toHaveBeenCalledOnce();
    expect(client.getPhotoImageBase64).toHaveBeenCalledWith('55558002485', 'medium');
  });

  it('passes large to getPhotoImageBase64 when image_size is large', async () => {
    const client = createMockClient();
    await handleTool(
      'flickr_get_photo',
      { photo_id: '55558002485', include_image: true, image_size: 'large' },
      client
    );

    expect(client.getPhotoImageBase64).toHaveBeenCalledWith('55558002485', 'large');
  });

  it('defaults unknown image_size values to medium at runtime', async () => {
    const client = createMockClient();
    await handleTool(
      'flickr_get_photo',
      { photo_id: '55558002485', include_image: true, image_size: 'original' },
      client
    );

    expect(client.getPhotoImageBase64).toHaveBeenCalledWith('55558002485', 'medium');
  });
});

describe('flickr_get_photo tool schema', () => {
  it('restricts image_size to medium and large', () => {
    const tool = TOOLS.find(t => t.name === 'flickr_get_photo');
    expect(tool).toBeDefined();
    const schema = tool!.inputSchema as {
      properties: { image_size?: { enum?: string[] } };
    };
    expect(schema.properties.image_size?.enum).toEqual(['medium', 'large']);
  });
});
