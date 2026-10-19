import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('public/assets/tmm/culture/tmm_culture_catalog.json', encoding='utf-8') as f:
    catalog = json.load(f)

slides = catalog.get('slides', [])
target_ids = [
    'cul_1002', 'cul_3007', 'cul_7009', 'cul_4004', 'cul_4008',
    'cul_1007', 'cul_4005', 'cul_7010', 'cul_8008', 'cul_5008',
    'cul_8004', 'cul_1006', 'cul_1008', 'cul_8006', 'cul_5004',
    'cul_12007', 'cul_5007', 'cul_20011', 'cul_20012'
]

print(f"Found {len(slides)} total slides.")
for s in slides:
    if s.get('id') in target_ids:
        print("="*60)
        print(f"[{s['id']}] {s['title']} | Current Region: {s.get('region')}")
        print(f"Intro: {s.get('intro')}")
        print(f"ContentZh: {s.get('contentZh')}")
        q = s.get('quiz', {})
        print(f"Quiz Q: {q.get('question')}")
        print(f"Quiz opts: {q.get('options')}")
        print(f"Quiz ans: index {q.get('correctIndex')} | {q.get('explanation')}")
