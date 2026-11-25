import urllib.request
import re

url = 'https://aspiri.in/'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print(f"Status 200, length {len(html)}")
        
        # Extract title
        title_match = re.search(r'<title>(.*?)</title>', html, re.I)
        if title_match:
            print("Title:", title_match.group(1).strip())
            
        # Extract image links
        img_urls = set(re.findall(r'(https?://[^\s"\'<>]+\.(?:jpg|jpeg|png|webp))', html, re.I))
        print(f"Found {len(img_urls)} image URLs:")
        for img in sorted(list(img_urls))[:20]:
            print("  ", img)
except Exception as e:
    print("Error fetching aspiri.in:", e)
