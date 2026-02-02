# 📦 ZacPin Audio - Web Flasher

Template HTML/CSS/JS per web flasher hosted su GitHub Pages.

## 📍 Ubicazione

Questi file sono nel firmware repo per **version control**, ma vanno **copiati** su:
```
https://github.com/dottorconti/dottorconti.github.io/
└── ZacPin-Audio/
    ├── index.html
    ├── js/app.js
    └── css/style.css
```

## 🔗 URL Finale

```
https://dottorconti.github.io/ZacPin-Audio/
```

## 📋 File Included

- **index.html** - UI web per selezionare board/versione e flashare
- **css/style.css** - Styling responsive
- **js/app.js** - Logica JavaScript (fetch releases, flashing)
- **SETUP_INSTRUCTIONS.md** - Guida dettagliata per setup

## 🚀 Quick Start

1. **Copia file** da qui a pages repo (vedi SETUP_INSTRUCTIONS.md)
2. **Commit + push** alla repo pages
3. **Test locale**:
   ```bash
   cd ZacPin-Audio
   python3 -m http.server 8000
   # Apri http://localhost:8000/
   ```
4. **Publish** live a GitHub Pages

## 📊 Componenti

### **Frontend**
- Board selector dropdown (8 varianti)
- Version selector (carica da GitHub Releases API)
- Flash button con progress bar
- Troubleshooting guide interattivo

### **Backend (GitHub)**
- GitHub Releases API per fetch firmware versions
- Download BIN assets da Releases
- Manifest generation (auto da GitHub Actions)

### **Flashing**
- Web Serial API (browser → USB → ESP32)
- Reset to bootload automatico
- Progress tracking

## 🔌 Browser Support

✅ Chrome/Chromium 89+  
✅ Edge 89+  
❌ Firefox (Web Serial API not supported)  
❌ Safari (Web Serial API not supported)  

## ⚙️ Configuration

### **GitHub Repo**
Modifica nel file `js/app.js`:
```javascript
const GITHUB_REPO = 'dottorconti/ZacPin-Audio';  // ← Change if needed
```

### **Board Definitions**
Array `BOARDS` in `js/app.js` contiene le 8 varianti configurate.

### **Custom Styling**
Edit `css/style.css` per cambiare colori/layout.

## 🔐 API Rate Limiting

GitHub API ha limite di 60 req/ora per non autenticati.

Se riscontri errori di rate limit, aggiungi Personal Access Token (vedi SETUP_INSTRUCTIONS.md).

## 📈 Data Flow

```
User Browser
    ↓
index.html (HTML UI)
    ↓
app.js (JavaScript)
    ├→ GitHub API (fetch Releases)
    ├→ Display dropdown versioni
    └→ Download BIN + Flash via Web Serial
         ↓
      ESP32 (USB)
```

## 🐛 Debugging

1. **Apri Developer Console** (F12)
2. **Network tab**: Vedi GitHub API calls?
3. **Console tab**: Errori JavaScript?
4. **Common issues**:
   - API calls falliscono → rate limit o CORS
   - Versioni non appaiono → GitHub Actions non ha creato Release
   - Flashing fallisce → USB driver issue

## 📖 Full Setup Guide

Vedi **SETUP_INSTRUCTIONS.md** in questa cartella per:
- Come copiare file su pages repo
- Test locale setup
- CORS configuration
- Deployment
- Troubleshooting

## 🔄 Sync con Firmware Repo

Per tenere allineato il web flasher con il firmware:

1. Modifiche al web flasher vanno in `firmware/web-flasher/`
2. Poi ripeti copy su pages repo
3. Commit su entrambe le repo

## 🎯 Workflow Completo

```
1. Modifica firmware → git commit
2. Test localmente → pio run
3. Crea tag release → git tag v1.3.0
4. Push tag → GitHub Actions compila
5. Release creata con 8 BIN
6. User visita web flasher
7. Seleziona board + versione
8. Clicca Flash → done!
```

## 📞 Support

Per problemi con il web flasher, controlla:
- Browser console (F12) → errori?
- Network tab → GitHub API calls OK?
- Is ESP32 connected via USB?
- Browser è Chrome/Edge (supported)?

---

**Last Updated**: 2 Febbraio 2026  
**Status**: ✅ Ready for deployment
