# Wiederholung Leistungsfach Sport – Anleitung

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Startseite mit Bandauswahl |
| `band1.html` (später `band2.html`) | Seite eines Bandes: Lerneinheit wählen, mit Karteikarten üben |
| `karten_band1.js` (später `karten_band2.js`) | alle Karteikarten des Bandes; nur diese Datei ändert sich, wenn Karten geändert werden |
| `app.js`, `app.css` | Programm und Aussehen, für alle Bände gleich |

Die Seite läuft ohne Server: direkt aus dem Ordner (Doppelklick auf `index.html`) und auf GitHub Pages.

## Auf GitHub Pages veröffentlichen

1. Auf github.com ein neues **öffentliches** Repository anlegen, zum Beispiel `sport-wiederholung`.
2. „Add file" → „Upload files": `index.html`, `band1.html`, `app.js`, `app.css`, `karten_band1.js` hochladen und mit „Commit changes" bestätigen. Diese Anleitung muss nicht mit hoch.
3. „Settings" → „Pages" → unter „Build and deployment" als Quelle „Deploy from a branch" wählen, Branch `main`, Ordner `/ (root)`, speichern.
4. Nach ein bis zwei Minuten ist die Seite unter `https://<Benutzername>.github.io/sport-wiederholung/` erreichbar. Diesen Link an die Schüler geben; am Handy lässt er sich über „Zum Home-Bildschirm" wie eine App ablegen.

Die Seite ist damit öffentlich abrufbar.

## Was wo gespeichert wird

- **Lernstand, eigene Karten und Änderungen der Schüler** liegen nur im Browser des jeweiligen Geräts. GitHub Pages speichert nichts. Unter „Eigene Karten sichern · Lehrermodus" kann jeder eine Sicherungsdatei erstellen und auf einem anderen Gerät einlesen.
- **Die Karten für alle** stehen in `karten_band1.js`.

## Karten für alle ändern (Lehrermodus)

1. Seite öffnen, Lerneinheit wählen, „Karten bearbeiten · eigene Karte anlegen": Karten ändern, ausblenden oder neu anlegen.
2. Auf der Bandseite unten „Eigene Karten sichern · Lehrermodus" → „Neue karten_band1.js erzeugen" → Datei speichern.
3. Im Repository `karten_band1.js` öffnen → Stift-Symbol oder „Upload files" → alte Datei durch die neue ersetzen → „Commit changes".
4. Auf dem eigenen Gerät „Lokale Änderungen verwerfen (nach dem Hochladen)" wählen, sonst erscheinen die eigenen Karten doppelt.
5. Dieselbe Datei auch im Projektordner `Eigene_Materialien/Wiederholung_Web/` ersetzen, damit beide Stände gleich bleiben.

Schüler sehen die neuen Karten beim nächsten Laden der Seite; ihr Lernstand bleibt erhalten.

## Karten aus den Skripten neu erzeugen

`python3 Vorlagen/Werkzeuge/karteikarten_erzeugen.py 1` ergänzt nur Lerneinheiten, die in der Kartendatei noch fehlen. Mit `--neu 2-3a` wird eine einzelne Lerneinheit (hier Kap. 2, LE 3a) neu aus dem Lösungsskript erzeugt; Handänderungen an dieser Lerneinheit gehen dabei verloren.
