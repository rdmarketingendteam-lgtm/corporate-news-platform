/**
 * Authorised digital sellers. Set ADS_TXT to the lines Google Ad Manager gives you,
 * separated by newlines or "\n", e.g. "google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0".
 */
export const revalidate = 3600

export function GET() {
  const body = (process.env.ADS_TXT ?? '').replace(/\\n/g, '\n').trim()
  return new Response(body ? `${body}\n` : '# ads.txt not configured\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
