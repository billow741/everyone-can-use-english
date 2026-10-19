import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('public/assets/tmm/culture/tmm_culture_catalog.json', encoding='utf-8') as f:
    data = json.load(f)

slides = data.get('slides', [])
print(f"Total stations: {len(slides)}")

template_matches = []
us_matches = []
all_regions = set()

for idx, item in enumerate(slides):
    region = item.get('region', '')
    all_regions.add(region)
    title = item.get('title', '')
    content_zh = item.get('contentZh', '')
    content_en = item.get('contentEn', '')
    cid = item.get('id', '')
    
    if '是英国极具代表性' in content_zh:
        template_matches.append((cid, title, region))

    us_signals = ['america', 'united states', 'u.s.', 'california', 'new york', 'wyoming', 'washington', 'florida', 'chicago', 'manhattan', 'hollywood']
    for s in us_signals:
        if s in content_en.lower() and region.startswith('英国'):
            us_matches.append((cid, title, region, s))
            break

print("\n--- ALL REGIONS IN DATA ---")
for r in sorted(all_regions):
    count = sum(1 for x in slides if x.get('region') == r)
    print(f"  {r}: {count} items")

print(f"\n--- ITEMS WITH UK TEMPLATE SENTENCE ({len(template_matches)}) ---")
for cid, title, reg in template_matches:
    print(f"  [{cid}] {title} (Region: {reg})")

print(f"\n--- ITEMS LABELED UK BUT CONTAIN US SIGNALS ({len(us_matches)}) ---")
for cid, title, reg, sig in us_matches:
    print(f"  [{cid}] {title} (Signal: {sig})")
