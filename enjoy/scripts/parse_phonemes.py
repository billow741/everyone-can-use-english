import re

with open("src/renderer/lib/phoneme-data.ts", encoding="utf-8") as f:
    content = f.read()

pairs = re.findall(r'"id":\s*"([^"]+)",\s*\n\s*"slug":\s*"([^"]+)"', content)
print(f"Total: {len(pairs)}")
import sys
sys.stdout.reconfigure(encoding="utf-8")
for i, (pid, slug) in enumerate(pairs, 1):
    print(f"{i:02d}: {pid} -> {slug}")
