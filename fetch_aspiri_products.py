import urllib.request
import json

url = 'https://aspiri.in/products.json'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        products = data.get('products', [])
        print(f"Total products fetched: {len(products)}")
        for p in products[:10]:
            print("Product:", p.get('title'))
            images = p.get('images', [])
            if images:
                print("  Image:", images[0].get('src'))
except Exception as e:
    print("Error fetching products.json:", e)
