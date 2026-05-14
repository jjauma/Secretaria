# Secretària — Milgrup

App PWA per captura ràpida de tasques (professionals i personals) per veu o text, amb subtasques, venciments, prioritats, recordatoris i interpretació intel·ligent del dictat amb Claude.

## Novetats Fase 1.5

- ✅ Interfície tota en català
- ✅ Edició inline del text (toc al text → editar → Enter)
- ✅ Subtasques (botó `+` a la dreta de cada tasca)
- ✅ Venciment (chip "Venciment" al compositor, calendari)
- ✅ Prioritat: Urgent / Aquesta setmana / Quan pugui
- ✅ Recordatori "Avisa'm un dia abans" (notificació local)
- ✅ Pestanya **Arxiu** — les tasques fetes fa més de 7 dies hi van soles
- ✅ Tasques fetes (< 7 dies) marcades en verd suau amb tick verd
- ✅ Interpretació intel·ligent del dictat amb Claude API (opcional)

## Com actualitzar des de la versió anterior

Si ja tens la Fase 1 al GitHub, només has de:

1. Sobreescriure aquests 4 fitxers al repo: `index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`
2. GitHub Pages es refresca sol en 1-2 minuts
3. Al iPhone: tanca l'app, torna-la a obrir. Pot ser que hagis d'esperar un parell de minuts perquè el service worker descarregui la nova versió.

Les tasques que ja tenies es conserven (el codi migra l'estructura automàticament).

## Configuració de la interpretació intel·ligent (opcional)

Sense API key, l'app funciona bé però el dictat només omple el text. Amb API key, dius "trucar a la Laia divendres urgent" i ella detecta:
- Text: "trucar a la Laia"
- Categoria: Professional
- Venciment: divendres
- Prioritat: Urgent

### Com obtenir la clau

1. Ves a [console.anthropic.com](https://console.anthropic.com)
2. Registra't o fes login
3. Settings → API Keys → Create Key
4. Copia la clau (comença per `sk-ant-...`)
5. A l'app: icona de configuració (engranatge a dalt a la dreta) → enganxa la clau → Guardar

### Cost

Cada interpretació de dictat val ~0,0001 €. Encara que dictis 100 tasques al dia, gastaràs menys d'1 cèntim. Pots posar un límit mensual al panell d'Anthropic (recomanat: 5 €/mes — t'arribarà i sobrarà).

### Privacitat

La clau es guarda al teu navegador (localStorage), no es comparteix amb ningú. Cada vegada que dictes una tasca, el text es mana directament a Anthropic des del teu dispositiu (no passa per cap servidor meu ni de tercers).

## Notificacions a l'iPhone

Les notificacions push funcionen només si l'app està **instal·lada com a PWA** (pantalla d'inici, no en pestanya de Safari) i des d'**iOS 16.4 o superior**.

La primera vegada que activis "Avisa'm un dia abans" en una tasca, iOS et demanarà permís per notificacions. Accepta'l.

## Limitació coneguda

Encara no hi ha sincronització entre dispositius. Cada navegador té les seves tasques. Això s'arregla a la Fase 2 amb Supabase.

## Tecnologia

HTML/CSS/JS vanilla, sense build step. Funciona offline gràcies al service worker. Allotjable a GitHub Pages gratis.
