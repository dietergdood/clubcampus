"""
ClubCampus — scripts/check_imports_fix.py
Ergänzt fehlende Konstanten-Imports automatisch.
Ausführen nach jedem grossen Refactoring:
  python3 scripts/check_imports_fix.py

ACHTUNG: Immer danach Build prüfen mit: npm run build
"""
import re, glob, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src')
BASE = os.path.abspath(BASE)

with open(f'{BASE}/constants.js') as f:
    constants_content = f.read()
exported = re.findall(r'export const (\w+)', constants_content)

files = glob.glob(f'{BASE}/**/*.jsx', recursive=True)
files += glob.glob(f'{BASE}/**/*.js', recursive=True)

fixed = []

for path in files:
    if 'node_modules' in path or '__tests__' in path or 'constants.js' in path:
        continue

    with open(path) as f:
        content = f.read()

    const_import_match = re.search(
        r'(import \{)([^}]+)(\} from ["\'])(\.\.?/?(?:\.\.?/)*)constants\.js(["\'])',
        content
    )
    imported = set()
    if const_import_match:
        imported = set(re.findall(r'\b(\w+)\b', const_import_match.group(2)))

    code = re.sub(r'^import.*$', '', content, flags=re.MULTILINE)
    used = set()
    for const in exported:
        if re.search(rf'\b{const}\b', code):
            used.add(const)

    missing = used - imported
    if not missing:
        continue

    rel = path.replace(BASE + '/', '')

    if const_import_match:
        # Bestehenden Import erweitern
        existing = const_import_match.group(2).rstrip()
        for m in sorted(missing):
            existing += f', {m}'
        new_import = f'{const_import_match.group(1)}{existing}{const_import_match.group(3)}{const_import_match.group(4)}constants.js{const_import_match.group(5)}'
        content = content[:const_import_match.start()] + new_import + content[const_import_match.end():]
        print(f"Erweitert: {rel} (+{sorted(missing)})")
    else:
        # Relativen Pfad zu constants.js bestimmen
        depth = rel.count('/')
        prefix = '../' * depth if depth > 0 else './'
        first_import_end = content.find('\n', content.find('import ')) + 1
        new_import = f'import {{ {", ".join(sorted(missing))} }} from "{prefix}constants.js";\n'
        content = content[:first_import_end] + new_import + content[first_import_end:]
        print(f"Neu: {rel} (+{sorted(missing)})")

    with open(path, 'w') as f:
        f.write(content)
    fixed.append(rel)

if fixed:
    print(f"\n✅ {len(fixed)} Datei(en) korrigiert.")
    print("⚠️  Bitte Build prüfen: npm run build")
else:
    print("✅ Keine fehlenden Imports gefunden.")
