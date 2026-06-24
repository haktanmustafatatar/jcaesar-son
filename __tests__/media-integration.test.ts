import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadImageAsBase64, downloadWhatsAppImageAsBase64 } from '../lib/media';

// Mock the fetch function globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Media Downloads and Proxy Helpers', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should successfully download a standard image and convert it to base64', async () => {
    const fakeBuffer = Buffer.from('fake-image-data');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => name === 'content-type' ? 'image/png' : null,
      },
      arrayBuffer: async () => new Uint8Array(fakeBuffer).buffer,
    } as any);

    const result = await downloadImageAsBase64('https://example.com/photo.png');

    expect(result.data).toBe(fakeBuffer.toString('base64'));
    expect(result.mimeType).toBe('image/png');
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/photo.png');
  });

  it('should successfully fetch WhatsApp media URL and download the file', async () => {
    const fakeBuffer = Buffer.from('whatsapp-image-data');
    
    // First fetch: Meta Graph API call to resolve media ID to media URL
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments/123',
        mime_type: 'image/jpeg',
      }),
    } as any);

    // Second fetch: Downloading the actual file from lookaside
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => name === 'content-type' ? 'image/jpeg' : null,
      },
      arrayBuffer: async () => new Uint8Array(fakeBuffer).buffer,
    } as any);

    const result = await downloadWhatsAppImageAsBase64('media_id_999', 'fake_access_token');

    expect(result.data).toBe(fakeBuffer.toString('base64'));
    expect(result.mimeType).toBe('image/jpeg');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
