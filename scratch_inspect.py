import json

with open(r'C:\Users\C-131\.gemini\antigravity\brain\751d508e-3a30-4283-996f-bee3ebaaa748\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i == 1897:
            d = json.loads(line)
            print(d.get('content'))
