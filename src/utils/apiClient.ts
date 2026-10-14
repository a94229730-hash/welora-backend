/**
 * Welora Avatar AI - Robust Healthcare API Client
 * Safely handles API requests, prevents JSON parsing crashes on HTML fallbacks/502s,
 * validates content-types, and provides typed error reporting with retry capabilities.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status: number;
  canRetry?: boolean;
  isHtml?: boolean;
  isEmergency?: boolean;
}

export async function safeApiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const rawBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
    const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    const cleanEndpoint = url.startsWith('/') ? url : `/${url}`;
    const targetUrl = cleanBaseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : url;

    const res = await fetch(targetUrl, options);
    const contentType = res.headers.get('content-type') || '';

    // Guard against static hosting (e.g. Netlify SPA redirect) returning index.html for /api routes
    if (contentType.includes('text/html')) {
      const text = await res.text();
      const isHtmlDoc = text.toLowerCase().includes('<!doctype') || text.toLowerCase().includes('<html');
      return {
        success: false,
        status: res.status,
        error: 'HTML_RESPONSE_RECEIVED',
        message: isHtmlDoc
          ? `Endpoint "${url}" returned an HTML document instead of API JSON (status ${res.status}).`
          : `Unexpected HTML response format received from "${url}".`,
        isHtml: true,
        canRetry: true,
      };
    }

    const text = await res.text();
    if (!text.trim()) {
      if (res.ok) {
        return { success: true, status: res.status, data: {} as T };
      }
      return {
        success: false,
        status: res.status,
        error: 'EMPTY_RESPONSE',
        message: `Empty response received from server (status ${res.status}).`,
        canRetry: res.status >= 500,
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        success: false,
        status: res.status,
        error: 'INVALID_JSON_RESPONSE',
        message: `Malformed JSON received from "${url}" (status ${res.status}).`,
        canRetry: true,
      };
    }

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: parsed.error || `HTTP_${res.status}`,
        message: parsed.message || `Request to "${url}" failed with HTTP status ${res.status}.`,
        canRetry: parsed.canRetry ?? (res.status >= 500 || res.status === 429),
        data: parsed,
        isEmergency: Boolean(parsed.isEmergency),
      };
    }

    return {
      success: true,
      status: res.status,
      data: parsed as T,
      isEmergency: Boolean(parsed?.isEmergency),
    };
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError';
    return {
      success: false,
      status: 0,
      error: isAbort ? 'ABORTED' : 'NETWORK_ERROR',
      message: isAbort
        ? 'Request was cancelled.'
        : 'Network request failed. Operating in offline/client resilient mode.',
      canRetry: !isAbort,
    };
  }
}
