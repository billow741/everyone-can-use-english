import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

root_dir = 'd:/SunnyBridge'
targets = ['a_good_trick', 'nurser) school', 'nurser)', 'good_trick', 'a good trick', 'nursery school']

for r, d, fs in os.walk(root_dir):
    if 'node_modules' in r or '.git' in r or 'dist' in r:
        continue
    for f in fs:
        if f.endswith(('.json', '.ts', '.tsx', '.js', '.md', '.html', '.txt')):
            path = os.path.join(r, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read().lower()
                    for t in targets:
                        if t in content:
                            print(f'Found "{t}" in {path}')
            except Exception:
                pass
