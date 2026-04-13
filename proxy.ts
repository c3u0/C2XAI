// proxy.ts - Version compatible avec Next.js 16
import { authkit } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

// Inlined from @/lib/api/response to avoid Edge runtime incompatibility
function extractErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return (err as any).message ?? "";
  }
  return "";
}

function isRateLimitError(err: unknown): boolean {
  const normalized = extractErrorMessage(err).toLowerCase();
  const statusCode = (err as any)?.status;
  const causeStatusCode = (err as any)?.cause?.status;
  return (
    statusCode === 429 ||
    causeStatusCode === 429 ||
    normalized.includes("rate limit exceeded") ||
    normalized.includes("too many requests")
  );
}

const UNAUTHENTICATED_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/logout",
  "/api/clear-auth-cookies",
  "/api/auth/desktop-callback",
  "/api/extra-usage/webhook",
  "/api/fraud/webhook",
  "/api/subscription/webhook",
  "/callback",
  "/desktop-login",
  "/desktop-callback",
  "/auth-error",
  "/privacy-policy",
  "/terms-of-service",
  "/download",
  "/manifest.json",
]);

function getRedirectUri(): string | undefined {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/callback`;
  }
  return undefined;
}

function isDesktopApp(request: NextRequest): boolean {
  const userAgent = request.headers.get("user-agent") || "";
  return userAgent.includes("HackerAI-Desktop");
}

function isUnauthenticatedPath(pathname: string): boolean {
  if (UNAUTHENTICATED_PATHS.has(pathname)) {
    return true;
  }
  if (pathname.startsWith("/share/")) {
    return true;
  }
  return false;
}

function isBrowserRequest(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

const SESSION_HEADER = "x-workos-session";

// Exporter comme "proxy" au lieu de "middleware"
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isDesktopApp(request)) {
    const hasSession = request.cookies.has("wos-session");

    if (!hasSession && !isUnauthenticatedPath(pathname)) {
      return NextResponse.redirect(
        new URL("/desktop-callback?error=unauthenticated", request.url),
      );
    }
  }

  let refreshHitRateLimit = false;
  const hadSessionCookie = request.cookies.has("wos-session");

  try {
    const { session, headers, authorizationUrl } = await authkit(request, {
      redirectUri: getRedirectUri(),
      eagerAuth: true,
      // CORRECTION ICI : le paramètre 'request' est optionnel
      onSessionRefreshError: ({ error }: { error?: unknown }) => {
        if (isRateLimitError(error)) {
          refreshHitRateLimit = true;
          console.warn(
            "[Auth Proxy] WorkOS rate limit hit during session refresh",
          );
        }
      },
    });

    const requestHeaders = buildRequestHeaders(request, headers);
    const responseHeaders = buildResponseHeaders(headers);

    if (session.user || isUnauthenticatedPath(pathname)) {
      return NextResponse.next({
        request: { headers: requestHeaders },
        headers: responseHeaders,
      });
    }

    if (hadSessionCookie && refreshHitRateLimit) {
      if (!isBrowserRequest(request)) {
        const rateLimitHeaders = new Headers(responseHeaders);
        rateLimitHeaders.set("Retry-After", "5");
        return NextResponse.json(
          { code: "rate_limited", message: "Please retry shortly." },
          { status: 503, headers: rateLimitHeaders },
        );
      }
      return NextResponse.next({
        request: { headers: requestHeaders },
        headers: responseHeaders,
      });
    }

    if (!isBrowserRequest(request)) {
      return NextResponse.json(
        {
          code: "unauthorized:auth",
          message: "You need to sign in before continuing.",
          cause: "Session expired or invalid",
        },
        { status: 401, headers: responseHeaders },
      );
    }

    if (!authorizationUrl) {
      console.error("[Auth Proxy] authorizationUrl unavailable", {
        pathname,
        hasSession: !!session.user,
      });
      const errorUrl = new URL("/auth-error", request.url);
      errorUrl.searchParams.set("code", "503");
      return NextResponse.redirect(errorUrl, { headers: responseHeaders });
    }

    return NextResponse.redirect(authorizationUrl, {
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[Auth Proxy] Fatal error:", error);
    // Fallback : permettre l'accès pour éviter un plantage total
    return NextResponse.next();
  }
}

function buildRequestHeaders(
  request: NextRequest,
  authkitHeaders: Headers,
): Headers {
  const merged = new Headers(request.headers);
  authkitHeaders.forEach((value, key) => {
    if (key.startsWith("x-")) {
      merged.set(key, value);
    }
  });
  return merged;
}

function buildResponseHeaders(authkitHeaders: Headers): Headers {
  const responseHeaders = new Headers(authkitHeaders);
  responseHeaders.delete(SESSION_HEADER);
  return responseHeaders;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
