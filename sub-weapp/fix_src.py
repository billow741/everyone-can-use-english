import os
import re

dest_dir = r"d:\SunnyBridge\sub-weapp\src"

for root, dirs, files in os.walk(dest_dir):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx') or file.endswith('.ts') or file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # replace cssExt
            content = re.sub(r'\{\{\s*cssExt\s*\}\}', 'scss', content)
            
            # replace PageName
            content = re.sub(r'\{\{\s*pageName\s*\}\}', 'Index', content)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)

print('Fixed js files.')
