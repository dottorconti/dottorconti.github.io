# 🎯 WEB FLASHER SETUP INSTRUCTIONS

## 📍 FILE STRUCTURE

Questi 3 file devono essere creati nella tua repository **`dottorconti.github.io`** (NOT in firmware repo):

```
dottorconti.github.io/
├── (altri file del tuo sito)
└── ZacPin-Audio/                    ← NUOVA CARTELLA
    ├── index.html                   ← Web flasher UI
    ├── js/
    │   └── app.js                  ← JavaScript logica
    └── css/
        └── style.css               ← Styling
```

## 🔗 URL FINALE

```
https://dottorconti.github.io/ZacPin-Audio/
```

## 📥 COPY INSTRUCTIONS

### Opzione 1: Via Terminal
```bash
# Naviga alla tua repo GitHub Pages
cd /path/to/dottorconti.github.io

# Crea le cartelle
mkdir -p ZacPin-Audio/js
mkdir -p ZacPin-Audio/css

# Copia i file
cp /path/to/firmware/web-flasher/index.html ZacPin-Audio/
cp /path/to/firmware/web-flasher/js/app.js ZacPin-Audio/js/
cp /path/to/firmware/web-flasher/css/style.css ZacPin-Audio/css/

# Commit e push
git add ZacPin-Audio/
git commit -m "Add ZacPin Audio firmware installer"
git push
```

### Opzione 2: Via VS Code File Explorer
1. Apri VS Code nella repo `dottorconti.github.io`
2. Crea cartella `ZacPin-Audio`
3. Copia i 3 file (index.html, app.js, style.css) con relative folder structure

### Opzione 3: Scarica i file direttamente
- I file sono già in `firmware/web-flasher/` nel firmware repo
- Copiali manualmente nella pages repo

## 🔧 CONFIGURAZIONE FIREBASE (opzionale)

Se vuoi anche una versione hosted sul sito pages:

1. **GitHub Pages automatico**: Dopo push, automaticamente disponibile a:
   ```
   https://dottorconti.github.io/ZacPin-Audio/
   ```

2. **Test locale**:
   ```bash
   cd ZacPin-Audio
   python3 -m http.server 8000
   # Apri http://localhost:8000/
   ```

## ✅ TESTING CHECKLIST

Una volta che hai pushato i file:

- [ ] Visita `https://dottorconti.github.io/ZacPin-Audio/`
- [ ] Vedi la pagina con header blu?
- [ ] Dropdown board pieni di 8 varianti?
- [ ] Dropdown version popola da GitHub Releases?
- [ ] Stile CSS carica correttamente?
- [ ] Browser console (F12) NO errors?

## 📋 INTEGRARE NELLA HOME

Sulla pagina principale `https://dottorconti.github.io/`:

```html
<!-- In index.html o navbar -->
<a href="/ZacPin-Audio/" class="btn">
  🔧 ZacPin Audio Installer
</a>
```

Oppure un iframe:
```html
<iframe src="/ZacPin-Audio/" width="100%" height="800px"></iframe>
```

## 🚨 IMPORTANT: CORS & GitHub API

⚠️ **Problema potenziale**: GitHub API ha rate limit 60 req/ora per non autenticati

Se riscontri problemi di rate limit:

1. Genera un Personal Access Token:
   - GitHub Settings → Developer Settings → Personal Access Tokens
   - Crea token con scope `public_repo`

2. Modifica `js/app.js` riga ~31:
   ```javascript
   headers: {
       'Accept': 'application/vnd.github.v3+json',
       'Authorization': 'token YOUR_TOKEN_HERE'
   }
   ```

3. O usa environment variable (migliore per security):
   ```javascript
   const token = localStorage.getItem('github_token') || '';
   ```

## 🔄 WORKFLOW COMPLETO

### Sulla tua machine (firmware repo):
```bash
$ git tag v1.3
$ git push origin v1.3
# → GitHub Actions compila + crea Release v1.3 con 8 BIN
```

### Su GitHub Pages (entro 2-5 minuti):
```
https://dottorconti.github.io/ZacPin-Audio/
  ↓
Carica manifest.json da GitHub Releases
  ↓
Mostra dropdown con versioni + 8 board variants
  ↓
User seleziona board + versione
  ↓
Clicca Flash → scarica BIN → flasha via Web Serial
```

## 🐛 DEBUGGING

Se qualcosa non funziona:

1. **Apri Developer Console** (F12)
2. **Network tab**: Vedi se GitHub API calls hanno successo?
3. **Console tab**: Ci sono errori JavaScript?
4. **Common issues**:
   - `Manifest not found` → GitHub Actions non ha creato Release
   - `Firmware asset not found` → Nome del file BIN non matcha il board key
   - `CORS error` → Serve token GitHub o configurazione CORS

## 📖 PROSSIMI STEP

1. Crea folder e copia file in `dottorconti.github.io/ZacPin-Audio/`
2. Commit + push to GitHub
3. Attendi 2-5 minuti per GitHub Pages update
4. Visita URL e testa il caricamento
5. Crea tag release nel firmware repo per generare BIN
6. Testa flashing completo

## 🎉 Ready!

Una volta tutto testato, il flusso user sarà:

```
1. User visita https://dottorconti.github.io/ZacPin-Audio/
2. Seleziona board (es: "1B1146 v1")
3. Seleziona versione (es: "v1.3")
4. Collega ESP32 via USB
5. Clicca "Flash!"
6. Browser flasherà automaticamente
7. ✅ Done!
```

Niente compilazione locale, niente PlatformIO, niente USB drivers (Web Serial API lo gestisce).

**Domande?** Chiedi quando sei pronto a settare! 🚀
