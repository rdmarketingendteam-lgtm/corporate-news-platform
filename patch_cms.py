import re

cms_path = r'C:\Users\C-131\Downloads\corporate-news-platform\corporate-news-platform\apps\web\lib\cms.ts'
with open(cms_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Enhance cleanHtmlText
old_clean_html = """function cleanHtmlText(text?: string | null): string {
  if (!text) return ''
  let t = text
  // Strip image tags first
  t = t.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, '')
  // Strip all other HTML tags
  t = t.replace(/<[^>]+>/g, ' ')
  // Decode HTML entities
  t = t.replace(/&quot;/g, '"')
       .replace(/&amp;/g, '&')
       .replace(/&apos;|&#39;/g, "'")
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&nbsp;|\\u00a0/g, ' ')
       .replace(/&hellip;|&#8230;/g, '...')
       .replace(/&#8217;|&#8216;/g, "'")
       .replace(/&#8220;|&#8221;/g, '"')
  // Fix mojibake
  t = t.replace(/â\\x80\\x99|â€™/g, "'")
       .replace(/â\\x80\\x9c|â€œ|â\\x80\\x9d|â€\\x9d|â€/g, '"')
       .replace(/â\\x80\\x94|â€”/g, '—')
       .replace(/â\\x80\\x93|â€“/g, '–')
       .replace(/(\\w)âs\\b/gi, "$1's")
       .replace(/â([^â\\n]+)â/g, "'$1'")
       .replace(/â/g, "'")

  // Strip syndication and promotional boilerplate
  t = t.replace(/\\(This story has not been edited by[^\\)]*\\)/gi, ' ')
       .replace(/\\(This story is auto-generated[^\\)]*\\)/gi, ' ')
       .replace(/\\(With inputs from[^\\)]*\\)/gi, ' ')
       .replace(/Also Read\\s*\\|\\s*[^\\n]+/gi, ' ')
       .replace(/Published by:[^\\n]+/gi, ' ')
       .replace(/Stay updated with the latest sports news across Cricket, Football, Chess, and more\\./gi, ' ')
       .replace(/Catch all the action with real-time live cricket score updates and in-depth coverage of ongoing matches\\./gi, ' ')
  // Collapse whitespace
  return t.replace(/\\s+/g, ' ').trim()
}"""

new_clean_html = """function cleanHtmlText(text?: string | null): string {
  if (!text) return ''
  let t = text

  // 1. First pass: strip obvious image tags and raw HTML tags
  t = t.replace(/<img[^>]*>/gi, '')
  t = t.replace(/<[^>]+>/g, ' ')

  // 2. Decode HTML entities (both named and numeric)
  t = t.replace(/&quot;/g, '"')
       .replace(/&amp;/g, '&')
       .replace(/&apos;|&#39;/g, "'")
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&nbsp;|\\u00a0/g, ' ')
       .replace(/&hellip;|&#8230;/g, '...')
       .replace(/&#8217;|&#8216;/g, "'")
       .replace(/&#8220;|&#8221;/g, '"')

  // 3. Second pass: strip any newly exposed HTML or image tags after entity decoding
  t = t.replace(/<img[^>]*>/gi, '')
  t = t.replace(/<[^>]+>/g, ' ')

  // 4. Strip any leaked external publisher image URLs or publisher domains
  t = t.replace(/https?:\\/\\/[^\\s]*timesofindia[^\\s]*/gi, '')
       .replace(/https?:\\/\\/[^\\s]*indiatimes[^\\s]*/gi, '')
       .replace(/https?:\\/\\/[^\\s]*indianexpress[^\\s]*/gi, '')
       .replace(/https?:\\/\\/[^\\s]*ndtv[^\\s]*/gi, '')
       .replace(/https?:\\/\\/[^\\s]*news18[^\\s]*/gi, '')

  // 5. Fix mojibake
  t = t.replace(/â\\x80\\x99|â€™/g, "'")
       .replace(/â\\x80\\x9c|â€œ|â\\x80\\x9d|â€\\x9d|â€/g, '"')
       .replace(/â\\x80\\x94|â€”/g, '—')
       .replace(/â\\x80\\x93|â€“/g, '–')
       .replace(/(\\w)âs\\b/gi, "$1's")
       .replace(/â([^â\\n]+)â/g, "'$1'")
       .replace(/â/g, "'")

  // 6. Strip syndication and promotional boilerplate
  t = t.replace(/\\(This story has not been edited by[^\\)]*\\)/gi, ' ')
       .replace(/\\(This story is auto-generated[^\\)]*\\)/gi, ' ')
       .replace(/\\(With inputs from[^\\)]*\\)/gi, ' ')
       .replace(/Also Read\\s*\\|\\s*[^\\n]+/gi, ' ')
       .replace(/Published by:[^\\n]+/gi, ' ')
       .replace(/Stay updated with the latest sports news across Cricket, Football, Chess, and more\\./gi, ' ')
       .replace(/Catch all the action with real-time live cricket score updates and in-depth coverage of ongoing matches\\./gi, ' ')

  // 7. Strip orphaned leading quotes/commas at start of text
  t = t.replace(/^['"’“”]*,\s*/, '')

  // Collapse whitespace
  return t.replace(/\\s+/g, ' ').trim()
}"""

if old_clean_html in content:
    content = content.replace(old_clean_html, new_clean_html)
    print("Replaced cleanHtmlText successfully.")
else:
    print("Could not find exact old_clean_html, performing regex replacement...")
    clean_html_regex = r"function cleanHtmlText\(text\?: string \| null\): string \{[\s\S]*?\n\}"
    content = re.sub(clean_html_regex, new_clean_html, content, count=1)
    print("Regex replacement of cleanHtmlText performed.")

# Enhance paragraph handling in textToLexical
old_lexical = """  const children: LexicalNode[] = finalParagraphs.map(p => {
    // Check if line is a bullet item
    if (p.startsWith('- ') || p.startsWith('* ') || p.startsWith('• ')) {
      return {
        type: 'paragraph',
        format: '',
        children: [{ type: 'text', text: p.replace(/^[-*•]\\s*/, '• ') }]
      }
    }
    // Check if line is an actual quoted dialogue or statement
    const isQuote = (p.startsWith('“') || p.startsWith('"')) && (p.endsWith('”') || p.endsWith('"')) && p.length > 20
    if (isQuote && !p.startsWith('",') && !p.startsWith('”,') && !p.startsWith("',")) {
      return {
        type: 'quote',
        format: '',
        children: [{ type: 'text', text: p }]
      }
    }
    return {
      type: 'paragraph',
      format: '',
      children: [{ type: 'text', text: p }]
    }
  })"""

new_lexical = """  const children: LexicalNode[] = finalParagraphs.map(rawP => {
    // Strip any leading orphaned punctuation like "', " or '", ' or orphaned commas
    let p = rawP.replace(/^['"’“”]*,\s*/, '').trim()
    if (p && p.charAt(0) >= 'a' && p.charAt(0) <= 'z') {
      p = p.charAt(0).toUpperCase() + p.slice(1)
    }
    // Check if line is a bullet item
    if (p.startsWith('- ') || p.startsWith('* ') || p.startsWith('• ')) {
      return {
        type: 'paragraph',
        format: '',
        children: [{ type: 'text', text: p.replace(/^[-*•]\\s*/, '• ') }]
      }
    }
    // Check if line is an actual quoted dialogue or statement (never an orphaned fragment)
    const isQuote = (p.startsWith('“') || p.startsWith('"')) && (p.endsWith('”') || p.endsWith('"')) && p.length > 20
    if (isQuote && !p.startsWith('",') && !p.startsWith('”,') && !p.startsWith("',") && !p.startsWith('", ') && !p.startsWith("', ")) {
      return {
        type: 'quote',
        format: '',
        children: [{ type: 'text', text: p }]
      }
    }
    return {
      type: 'paragraph',
      format: '',
      children: [{ type: 'text', text: p }]
    }
  })"""

if old_lexical in content:
    content = content.replace(old_lexical, new_lexical)
    print("Replaced textToLexical children mapper successfully.")
else:
    print("Could not find exact old_lexical, performing regex replacement...")
    lexical_regex = r"  const children: LexicalNode\[\] = finalParagraphs\.map\(p => \{[\s\S]*?\n  \}\)"
    content = re.sub(lexical_regex, new_lexical, content, count=1)
    print("Regex replacement of textToLexical performed.")

with open(cms_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated cms.ts.")
