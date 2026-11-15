// Next's internal request URL may use localhost; Host retains the browser-facing host.
// Do not trust arbitrary forwarded-host headers for CSRF checks.
export function sameRequestOrigin(request: Request) {
  const raw = request.headers.get("origin"),
    host = request.headers.get("host");
  if (!raw || !host) return false;
  try {
    const origin = new URL(raw);
    return (
      !origin.username &&
      !origin.password &&
      origin.host === host &&
      origin.protocol === new URL(request.url).protocol
    );
  } catch {
    return false;
  }
}
