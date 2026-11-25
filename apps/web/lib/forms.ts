import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'

/** 303 redirect back to a page with a message in the query string (POST → GET). */
export function back(req: NextRequest, path: string, params: Record<string, string> = {}) {
  const url = new URL(path, req.nextUrl.origin)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return NextResponse.redirect(url, 303)
}

export const field = (form: FormData, name: string, max = 500) => {
  const v = form.get(name)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
