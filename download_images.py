import urllib.request
import os
import sys

base = 'https://utouchdesign.com/themes/envato/altroznews/'
images = [
    'images/news/lifestyle/health1.jpg',
    'images/news/lifestyle/health2.jpg',
    'images/news/lifestyle/health3.jpg',
    'images/news/lifestyle/health4.jpg',
    'images/news/lifestyle/health5.jpg',
    'images/news/lifestyle/travel1.jpg',
    'images/news/lifestyle/travel2.jpg',
    'images/news/lifestyle/travel3.jpg',
    'images/news/lifestyle/travel5.jpg',
    'images/news/lifestyle/food1.jpg',
    'images/news/lifestyle/food2.jpg',
    'images/news/lifestyle/food3.jpg',
    'images/news/tech/gadget1.jpg',
    'images/news/tech/gadget2.jpg',
    'images/news/tech/gadget3.jpg',
    'images/news/tech/gadget4.jpg',
    'images/news/tech/game1.jpg',
    'images/news/tech/game2.jpg',
    'images/news/video/video1.jpg',
    'images/news/video/video2.jpg',
]

dest_dir = r'C:\Users\C-131\Downloads\corporate-news-platform\corporate-news-platform\apps\web\public\altroz'
headers = {'User-Agent': 'Mozilla/5.0'}

for img in images:
    url = base + img
    out_file = os.path.join(dest_dir, img.replace('/', os.sep))
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    if not os.path.exists(out_file):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = resp.read()
                with open(out_file, 'wb') as f:
                    f.write(data)
            print(f'OK: {img}', flush=True)
        except Exception as e:
            print(f'FAIL {img}: {e}', flush=True)
    else:
        print(f'EXISTS: {img}', flush=True)
print('Done!', flush=True)
