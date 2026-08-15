/**
 * Minimal `next/server` stub for unit tests — NextResponse behaves like a
 * Response with JSON helpers. Keeps tests free of Next's bundler.
 */
export class NextResponse extends Response {
  static json(body: unknown, init?: ResponseInit): NextResponse {
    return new NextResponse(JSON.stringify(body), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  }
}

export class NextRequest extends Request {}
