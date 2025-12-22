
// ---------------- CONFIG ----------------
const CACHE_TTL_DOWNLOAD = 5 * 60; // 5 minute memory cache
const CACHE_TTL_GITHUB = 60; // 60 seconds

// FIXME: Replace with real repo
const MANAGER_PROPS_URL =
  "https://raw.githubusercontent.com/HundEdFeteTree/HappyFunTest/refs/heads/main/gradle.properties";
const MANAGER_FALLBACK_DOWNLOAD_URL =
  "https://github.com/MorpheApp/morphe-manager/releases";

// In-memory cache
let cachedDownload = { url: null, ts: 0 };

function redirect(url, cacheTtlSeconds) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": `public, max-age=${cacheTtlSeconds}`,
    },
  });
}

// functions/download.js
export async function onRequest(context) {
    const now = Date.now();

    // Serve from in-memory cache if valid
    if (cachedDownload.url && now - cachedDownload.ts < CACHE_TTL_DOWNLOAD * 1000) {
      return redirect(cachedDownload.url, CACHE_TTL_DOWNLOAD);
    }

    try {
      // Fetch gradle.properties from GitHub with edge caching
      const res = await fetch(MANAGER_PROPS_URL, { cf: { cacheTtl: CACHE_TTL_GITHUB } });
      if (!res.ok) throw new Error(`Failed to fetch gradle.properties (${res.status})`);

      const text = await res.text();
      const match = text.match(/^\s*version\s*=\s*([^\s#]+)\s*$/m);
	  if (!match) throw new Error("Version not found in gradle.properties");

      const version = match[1].trim();
      const downloadUrl = `https://github.com/MorpheApp/morphe-manager/releases/download/v${version}/morphe-manager-${version}.apk`;

      // Update in-memory cache
      cachedDownload = { url: downloadUrl, ts: now };

      return redirect(downloadUrl, CACHE_TTL_DOWNLOAD);
    } catch (err) {
      console.error("Download link resolution failed", err);

      // Fallback to releases page
      return redirect(MANAGER_FALLBACK_DOWNLOAD_URL, 60); // short fallback cache
    }
}
