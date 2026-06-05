/**
 * Generates a signed Cloudinary URL for authenticated assets.
 * Only signs URLs containing "/authenticated/".
 */
export async function getSignedUrl(rawUrl: string): Promise<string> {
  if (!rawUrl) return "";

  // If the URL is already signed or not authenticated, return it as-is
  if (rawUrl.includes("/s--") || !rawUrl.includes("/authenticated/")) {
    return rawUrl;
  }

  try {
    const marker = "/authenticated/";
    const markerIndex = rawUrl.indexOf(marker);
    if (markerIndex === -1) return rawUrl;

    const basePath = rawUrl.substring(0, markerIndex + marker.length);
    const pathParams = rawUrl.substring(markerIndex + marker.length);

    // Concatenate the path part with the API secret
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET || "";
    const stringToSign = pathParams + apiSecret;

    // Use Web Crypto API to hash with SHA-1
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);

    // Convert hash buffer to URL-safe Base64
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const binaryString = hashArray.map((b) => String.fromCharCode(b)).join("");
    const base64 = btoa(binaryString);
    const urlSafeBase64 = base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Cloudinary signatures use the first 8 characters
    const signature = urlSafeBase64.substring(0, 8);

    return `${basePath}s--${signature}--/${pathParams}`;
  } catch (error) {
    console.error("Error signing Cloudinary URL:", error);
    return rawUrl;
  }
}
