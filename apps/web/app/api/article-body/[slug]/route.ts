import { NextResponse, type NextRequest } from 'next/server'

import { getArticleBodyForReader } from '../../../../lib/cms'
import { TOKEN_COOKIE, getReader, setFlags } from '../../../../lib/session'

const noStore = { 'cache-control': 'private, no-store' }

/**
 * Full body of a subscriber-only story for the signed-in reader's browser.
 * The CMS decides access from the reader's token; we also refresh the UI flag cookie
 * so a just-purchased subscription takes effect without signing in again.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = req.cookies.get(TOKEN_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'signed_out' }, { status: 401, headers: noStore })
  try {
    const [body, reader] = await Promise.all([getArticleBodyForReader(slug, token), getReader(token)])
    const res = body
      ? NextResponse.json({ body }, { headers: noStore })
      : NextResponse.json({ error: 'not_entitled' }, { status: 403, headers: noStore })
    setFlags(res, reader)
    return res
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 502, headers: noStore })
  }
}
