# Adhans (muezzins)

Les adhans servent de son aux notifications de prière et peuvent être écoutés dans
Réglages > Heures de prière. Utilisez uniquement des enregistrements dont vous avez
l'autorisation (muezzin, mosquée ou radio).

## 1. Déposer les fichiers ici

- `<id>.mp3` : l'adhan, **obligatoire**
- `<id>_fajr.mp3` : variante du Fajr (avec « as-salâtu khayrun min an-nawm »), facultative

`<id>` : minuscules, chiffres et `_` uniquement (contrainte Android), sans accent ni tiret.
Exemple : `dakar_grande_mosquee.mp3`, `dakar_grande_mosquee_fajr.mp3`.

Format conseillé : mp3 mono 64–96 kb/s, volume normalisé, sans long silence au début.
Sur iPhone, un son de notification de plus de 30 s est remplacé par le son par défaut :
prévoyez une version courte si l'app doit sortir sur iOS.

## 2. Décrire les muezzins dans `muezzins.json`

```json
[
  { "id": "dakar_grande_mosquee", "name": "Nom du muezzin", "origin": "Grande Mosquée de Dakar", "default": true }
]
```

Un seul muezzin `"default": true` : c'est l'adhan utilisé tant que l'utilisateur n'en a pas choisi.

## 3. Indexer puis reconstruire

```
python scripts/build-adhan-audio.py
```

Le script met à jour `utils/adhanManifest.ts` et `app.json`. Il faut ensuite
**reconstruire l'APK** : Android embarque les sons de notification à la compilation.
