# Riko OS – nasadenie

Balík obsahuje:
- `web/` – webovú aplikáciu a ikony pre GitHub Pages
- `worker/worker.js` – Cloudflare Worker, ktorý bezpečne sprostredkuje volania AI API

## 1. Priprav API kľúče
- OpenAI: vytvor API kľúč v OpenAI Platform.
- Gemini: vytvor API kľúč v Google AI Studio.
- Kľúče nikdy nevkladaj do `index.html` ani do verejného GitHub repozitára.
- Ak si už niekedy zverejnil starý kľúč, zruš ho a vytvor nový.

Používanie API môže byť spoplatnené podľa cenníkov poskytovateľov. Skontroluj limity a fakturáciu.

## 2. Nasadenie Cloudflare Worker
1. Prihlás sa na Cloudflare: Workers & Pages → Create → Worker.
2. Vytvor Worker, otvor Edit code a nahraď obsah kódom z `worker/worker.js`.
3. Klikni Deploy.
4. V Settings → Variables and Secrets nastav:
   - `ALLOWED_ORIGIN` (Text): `https://TVOJE-MENO.github.io`
     (bez názvu repozitára a bez koncovej lomky)
   - `OPENAI_API_KEY` (Secret): tvoj OpenAI API kľúč
   - `GEMINI_API_KEY` (Secret): tvoj Gemini API kľúč
   - voliteľne `CHAT_MODEL` (Text): `gpt-4o-mini`
   - voliteľne `IMAGE_MODEL` (Text): `gemini-2.5-flash-image`
5. Skopíruj adresu Workeru, napr. `https://riko-xxxx.workers.dev`.

## 3. Nasadenie webovej aplikácie na GitHub Pages
1. Vytvor verejný GitHub repozitár, napr. `riko`.
2. Nahraj **obsah priečinka `web/`** do koreňového priečinka repozitára.
3. V Settings → Pages nastav Deploy from a branch, branch `main`, folder `/ (root)`.
4. Po zverejnení bude aplikácia dostupná na `https://TVOJE-MENO.github.io/riko/`.

## 4. Prvé spustenie
1. Otvor aplikáciu a po výzve vlož adresu Cloudflare Workeru.
2. Adresa sa uloží v tomto prehliadači.
3. Na iPhone otvor stránku v Safari → Zdieľať → Pridať na plochu.

## Poznámky
- Chat a generovanie obrázkov potrebujú internetové pripojenie a správne nastavený Worker.
- História četov sa ukladá lokálne v prehliadači daného zariadenia.
- Aplikácia nie je automaticky synchronizovaná medzi zariadeniami.
- API kľúče zostávajú na Cloudflare Worker serveri; neposielajú sa do webovej aplikácie.
- Worker povoľuje požiadavky iba z presnej adresy nastavenej v `ALLOWED_ORIGIN`.
