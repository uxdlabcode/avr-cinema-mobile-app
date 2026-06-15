/**
 * Generates a signed Cloudinary URL for authenticated assets.
 * Only signs URLs containing "/authenticated/".
 */
export async function getSignedUrl(rawUrl: string): Promise<string> {
  if (!rawUrl) return "";

  // Decode the URL in case it contains URL-encoded characters (like %20, %2F, etc.)
  const decodedUrl = decodeURIComponent(rawUrl);

  // If the URL is not authenticated, return it as-is
  if (!decodedUrl.includes("/authenticated/")) {
    return rawUrl;
  }

  try {
    // Decode/strip any existing Cloudinary signature segment like "s--.../" or "s--...--/" right after "authenticated/"
    const cleanUrl = decodedUrl.replace(/\/authenticated\/s--[^/]*\//, "/authenticated/");

    const marker = "/authenticated/";
    const markerIndex = cleanUrl.indexOf(marker);
    if (markerIndex === -1) return cleanUrl;

    const basePath = cleanUrl.substring(0, markerIndex + marker.length);
    const pathParams = cleanUrl.substring(markerIndex + marker.length);

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
