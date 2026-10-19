import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

for path in ['d:/SunnyBridge/alignment_work/oxford_all_books.json', 'd:/SunnyBridge/alignment_work/oxford_content.json', 'd:/SunnyBridge/catalog_local.json']:
    try:
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
        books = d if isinstance(d, list) else d.get('stories', d.get('books', []))
        print(f"Checking {path}, total {len(books)} books")
        for b in books:
            title = b.get('title', '')
            bid = b.get('id', '')
            bslug = b.get('slug', '')
            b_str = json.dumps(b, ensure_ascii=False).lower()
            if 'a_good_trick' in b_str or 'nurser)' in b_str:
                print(f"  [Found] ID: {bid} | Title: {title} | Slug: {bslug}")
                if 'nurser)' in b_str:
                    print("    -> Contains 'nurser)'")
                if 'a_good_trick' in b_str:
                    print("    -> Contains 'a_good_trick'")
    except Exception as e:
        print(f"Error reading {path}: {e}")
