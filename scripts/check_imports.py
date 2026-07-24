"""
ClubCampus — scripts/check_imports.py
Prüft ob alle Konstanten aus constants.js korrekt importiert werden.
Ausführen nach jedem grossen Refactoring:
  python3 scripts/check_imports.py
"""
import re, glob, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src')
BASE = os.path.abspath(BASE)

# Alle Konstanten aus constants.js
with open(f'{BASE}/constants.js') as f:
    constants_content = f.read()
exported = re.findall(r'export const (\w+)', constants_content)

# Alle Source-Dateien prüfen
files = glob.glob(f'{BASE}/**/*.jsx', recursive=True)
files += glob.glob(f'{BASE}/**/*.js', recursive=True)

problems = []

for path in files:
    if 'node_modules' in path or '__tests__' in path or 'constants.js' in path:
        continue

    with open(path) as f:
        content = f.read()

    # Finde constants.js import
    const_import_match = re.search(
        r'import \{([^}]+)\} from ["\']\.\.?/?(?:\.\.?/)*constants\.js["\']',
        content
    )
    imported = set()
    if const_import_match:
        imported = set(re.findall(r'\b(\w+)\b', const_import_match.group(1)))

    # Welche Konstanten kommen im Code vor (ausserhalb imports)?
    code = re.sub(r'^import.*$', '', content, flags=re.MULTILINE)
    used = set()
    for const in exported:
        if re.search(rf'\b{const}\b', code):
            used.add(const)

    missing = used - imported
    if missing:
        rel = path.replace(BASE + '/', '')
        problems.append((rel, sorted(missing)))

if problems:
    print(f"\n⚠️  {len(problems)} Datei(en) mit fehlenden Konstanten-Imports:\n")
    for rel, missing in problems:
        print(f"  {rel}")
        print(f"    FEHLT: {missing}\n")
    print("Fix: Imports manuell ergänzen oder check_imports_fix.py ausführen.")
else:
    print("✅ Alle Konstanten-Imports OK.")
