"""
Indexe les enregistrements de l'espace enfants pour l'app.

1. Déposez les fichiers dans assets/audio/kids/lettres/ et assets/audio/kids/invocations/
   (noms : voir assets/audio/kids/LISEZMOI.md, ex. lettres/02-ba-nom.mp3)
2. Lancez :  python scripts/build-kids-audio.py
3. Rechargez l'app : les boutons correspondants s'activent.

Le script réécrit utils/kidsAudioManifest.ts (require() statiques, nécessaires
pour que Metro embarque les fichiers et qu'ils marchent hors ligne).
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "assets" / "audio" / "kids"
OUT = ROOT / "utils" / "kidsAudioManifest.ts"

PATTERNS = {
    "lettres": re.compile(r"^(\d{2})-([a-z]+)-(nom|voyelles|mot)\.(mp3|m4a)$"),
    "invocations": re.compile(r"^(\d{2})-([a-z-]+)-(ar|fr|wo)\.(mp3|m4a)$"),
}


def main():
    entries, ignored = [], []
    for folder, pattern in PATTERNS.items():
        for f in sorted((AUDIO / folder).glob("*")):
            if f.is_dir() or f.name.startswith("."):
                continue
            if pattern.match(f.name.lower()):
                key = f"{folder}/{f.stem.lower()}"
                rel = f"../assets/audio/kids/{folder}/{f.name}"
                entries.append(f"  '{key}': require('{rel}'),")
            elif f.suffix.lower() in (".mp3", ".m4a"):
                ignored.append(f"{folder}/{f.name}")

    body = "\n".join(entries)
    OUT.write_text(
        "// Fichier généré par scripts/build-kids-audio.py : ne pas modifier à la main.\n"
        "/* eslint-disable @typescript-eslint/no-require-imports */\n"
        "export const KIDS_AUDIO: Record<string, number> = {\n"
        + (body + "\n" if body else "")
        + "};\n",
        encoding="utf-8",
    )
    print(f"{len(entries)} enregistrement(s) indexé(s) dans {OUT.relative_to(ROOT)}")
    for name in ignored:
        print(f"  ignoré (nom non conforme) : {name}")


if __name__ == "__main__":
    main()
