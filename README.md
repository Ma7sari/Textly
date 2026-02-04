# Writing Assistant MVP

En enkel Chrome-extension + backend som skriver in utkast i webbaserade textfält på explicit trigger.

## Struktur

```
/extension
  manifest.json
  popup.html
  popup.css
  popup.js
  content.js
  background.js
/backend
  src/index.ts
  src/ai.ts
  src/validate.ts
  package.json
  tsconfig.json
  .env.example
```

## Kör backend

1) Gå till backend-mappen
```
cd "C:\Users\test\textly\backend"
```

2) Installera dependencies
```
npm install
```

3) Skapa `.env`
```
copy .env.example .env
```

4) Fyll i `OPENAI_API_KEY` i `.env`

5) Starta dev-server
```
npm run dev
```

Backend kör på `http://localhost:3001`.

## Ladda extension i Chrome

1) Öppna `chrome://extensions`
2) Aktivera **Developer mode**
3) Klicka **Load unpacked**
4) Välj mappen `C:\Users\test\textly\extension`

## Testa

1) Öppna valfri sida med textarea/contenteditable (t.ex. Gmail, Notion, Google Docs)
2) Klicka i ett textfält
3) Öppna popupen
4) Skriv instruktion och klicka **Skriv in vid markören**

## Hotkeys

- `Ctrl+Shift+K`: öppnar popup
- `Esc`: avbryter pågående typing

## Vanliga buggar – snabb checklista

- **Inget target hittas:** Klicka i ett textfält först (input/textarea/contenteditable).
- **Ingenting händer:** Kontrollera att backend körs på `http://localhost:3001`.
- **CORS fel:** Se till att backend är igång och att `cors()` är aktivt.
- **Events triggas inte:** Vissa appar kräver extra event; testa `input`/`change`/`keyup`.
- **Hotkey funkar inte:** Krock med annan extension eller ändra via `chrome://extensions/shortcuts`.

## Konfiguration att ändra snabbt

- Backend-URL i `extension/background.js` (`DEFAULT_BACKEND_URL`)
- Ton/typing speed/replace sparas i `chrome.storage.sync`
