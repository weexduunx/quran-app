"""
Indexe les adhans (muezzins) pour l'app et les notifications.

1. Déposez les fichiers dans assets/audio/adhan/  (voir assets/audio/adhan/LISEZMOI.md)
   - <id>.mp3        : l'adhan (obligatoire)
   - <id>_fajr.mp3   : variante du Fajr avec « as-salâtu khayrun min an-nawm » (facultatif)
   <id> : minuscules, chiffres et _ uniquement (contrainte Android), ex. dakar_grande_mosquee
2. Renseignez les noms affichés dans assets/audio/adhan/muezzins.json
3. Lancez :  python scripts/build-adhan-audio.py
4. Reconstruisez l'APK (les sons de notification sont embarqués à la compilation).

Le script réécrit utils/adhanManifest.ts et la liste « sounds » du plugin
expo-notifications dans app.json.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "assets" / "audio" / "adhan"
OUT = ROOT / "utils" / "adhanManifest.ts"
APP_JSON = ROOT / "app.json"
ID = re.compile(r"^[a-z0-9_]+$")


def ts(value):
    return json.dumps(value, ensure_ascii=False)


def main():
    meta_file = AUDIO / "muezzins.json"
    meta = json.loads(meta_file.read_text(encoding="utf-8")) if meta_file.exists() else []
    meta_by_id = {m["id"]: m for m in meta}

    files = {f.stem: f for f in AUDIO.glob("*") if f.suffix.lower() in (".mp3", ".wav", ".m4a")}
    # Le muezzin par défaut en tête de liste, puis l'ordre alphabétique
    ids = sorted((i for i in files if not i.endswith("_fajr")), key=lambda i: (not meta_by_id.get(i, {}).get("default"), i))
    entries, sounds, problems = [], [], []

    for i in ids:
        if not ID.match(i):
            problems.append(f"{files[i].name} : nom invalide (minuscules, chiffres et _ uniquement)")
            continue
        m = meta_by_id.get(i, {})
        main_file = files[i]
        fajr_file = files.get(f"{i}_fajr")
        sounds.append(f"./assets/audio/adhan/{main_file.name}")
        lines = [
            f"    id: {ts(i)},",
            f"    name: {ts(m.get('name', i.replace('_', ' ').title()))},",
            f"    origin: {ts(m.get('origin', ''))},",
            f"    isDefault: {'true' if m.get('default') else 'false'},",
            f"    file: {ts(main_file.name)},",
            f"    source: require('../assets/audio/adhan/{main_file.name}'),",
        ]
        if fajr_file:
            sounds.append(f"./assets/audio/adhan/{fajr_file.name}")
            lines.append(f"    fajrFile: {ts(fajr_file.name)},")
            lines.append(f"    fajrSource: require('../assets/audio/adhan/{fajr_file.name}'),")
        entries.append("  {\n" + "\n".join(lines) + "\n  },")

    for m in meta:
        if m["id"] not in ids:
            problems.append(f"muezzins.json : « {m['id']} » n'a pas de fichier audio")

    OUT.write_text(
        "// Fichier généré par scripts/build-adhan-audio.py : ne pas modifier à la main.\n"
        "/* eslint-disable @typescript-eslint/no-require-imports */\n"
        "export interface AdhanEntry {\n"
        "  id: string;\n  name: string;\n  origin: string;\n  isDefault: boolean;\n"
        "  /** Nom du fichier, utilisé comme son de notification */\n  file: string;\n  source: number;\n"
        "  fajrFile?: string;\n  fajrSource?: number;\n}\n\n"
        "export const ADHANS: AdhanEntry[] = [\n" + ("\n".join(entries) + "\n" if entries else "") + "];\n",
        encoding="utf-8",
    )

    # Déclare les sons auprès d'expo-notifications (embarqués dans l'APK)
    app = json.loads(APP_JSON.read_text(encoding="utf-8"))
    plugins = app["expo"]["plugins"]
    plugins[:] = [p for p in plugins if not (p == "expo-notifications" or (isinstance(p, list) and p[0] == "expo-notifications"))]
    plugins.append(["expo-notifications", {"color": "#0B3D2E", "sounds": sounds}])
    APP_JSON.write_text(json.dumps(app, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"{len(entries)} adhan(s) indexé(s) · {len(sounds)} son(s) de notification déclaré(s) dans app.json")
    if entries and not any(meta_by_id.get(i, {}).get("default") for i in ids):
        print("  attention : aucun muezzin n'a \"default\": true, le premier de la liste sera utilisé")
    for p in problems:
        print("  " + p)


if __name__ == "__main__":
    main()
