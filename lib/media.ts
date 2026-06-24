// Helper to download an image from a URL and convert it to base64
export async function downloadImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    data: buffer.toString("base64"),
    mimeType: contentType
  };
}

// Helper to download WhatsApp media url first, then download the image
export async function downloadWhatsAppImageAsBase64(mediaId: string, accessToken: string): Promise<{ data: string; mimeType: string }> {
  // Step 1: Get media URL from Meta Graph API
  const metaUrl = `https://graph.facebook.com/v21.0/${mediaId}`;
  const res = await fetch(metaUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to get WhatsApp media URL: ${res.statusText}`);
  }
  const mediaData = await res.json();
  const downloadUrl = mediaData.url;
  if (!downloadUrl) {
    throw new Error(`No download URL returned for WhatsApp media ID: ${mediaId}`);
  }

  // Step 2: Download the media file using accessToken
  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to download WhatsApp media file: ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type") || mediaData.mime_type || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    data: buffer.toString("base64"),
    mimeType: contentType
  };
}
