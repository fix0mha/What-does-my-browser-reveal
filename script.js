"use strict";

const output = document.getElementById("output");
let report = {};        // { section title: { label: value } } in the current language
let sections = [];      // raw data: { id, rows: [[rowId, value, param?], ...] }
let ipSection = null;   // only filled after the user clicks the IP button
let ipState = "idle";   // idle | loading | done
let lang = "en";

const li = () => (lang === "de" ? 0 : 1);

/* =====================================================================
   Translations
   ===================================================================== */

/* Static interface texts: key: [German, English] */
const UI = {
  docTitle: ["Was verrät mein Browser?", "What does my browser reveal?"],
  h1: ["Was verrät mein Browser?", "What does my browser reveal?"],
  intro: [
    "Alle Informationen, die dein Browser und dein Gerät beim Surfen an Webseiten preisgeben (können). Die Auswertung läuft komplett lokal in deinem Browser – es wird nichts gespeichert oder gesendet.",
    "All the information your browser and device reveal (or can reveal) to websites while you surf. Everything is evaluated locally in your browser – nothing is stored or sent.",
  ],
  btnIp: ["IP-Adresse & Standort abfragen", "Look up IP address & location"],
  btnIpLoading: ["Frage ab …", "Looking up …"],
  btnIpAgain: ["IP-Abfrage wiederholen", "Repeat IP lookup"],
  btnRefresh: ["Neu laden", "Refresh"],
  btnCopy: ["Als JSON kopieren", "Copy as JSON"],
  btnCopied: ["Kopiert ✓", "Copied ✓"],
  btnCopyFail: ["Kopieren nicht möglich", "Copy not possible"],
  btnDownload: ["JSON herunterladen", "Download JSON"],
  tip: [
    "Tipp: Fahre mit der Maus über einen unterstrichenen Eintrag (am Handy: antippen), um eine Erklärung zu sehen.",
    "Tip: Hover over an underlined entry (on a phone: tap it) to see an explanation.",
  ],
  ipHint: [
    "Hinweis: Die öffentliche IP-Adresse kennt nur ein Server. Per Klick wird dafür ein Dienst (ipify.org / ipapi.co) angefragt – dabei erfährt dieser Dienst deine IP.",
    "Note: Only a server can know your public IP address. Clicking the button queries an external service (ipify.org / ipapi.co), which will see your IP.",
  ],
  filterPh: ["Einträge filtern …", "Filter entries …"],
  loading: ["Sammle Informationen …", "Collecting information …"],
  footer: [
    "Alle Werte stammen aus Standard-Browser-APIs. Manche Browser (Firefox, Brave, Safari, Tor) blockieren oder verfälschen einzelne Angaben gezielt.",
    "All values come from standard browser APIs. Some browsers (Firefox, Brave, Safari, Tor) deliberately block or falsify certain values.",
  ],
  yes: ["Ja", "Yes"],
  no: ["Nein", "No"],
};
const t = (k) => UI[k][li()];

/* Section titles and descriptions: id: [DE title, DE description, EN title, EN description] */
const SEC = {
  http: ["Anfrage-Header (HTTP)", "Diese Angaben sendet dein Browser bei jeder Anfrage automatisch mit.",
         "Request headers (HTTP)", "Your browser sends this information automatically with every request."],
  clienthints: ["Client Hints (Sec-CH-UA)", "Moderne, strukturierte Browser-Infos (Chromium-basierte Browser).",
                "Client Hints (Sec-CH-UA)", "Modern, structured browser information (Chromium-based browsers)."],
  system: ["System & Hardware", "Angaben zu deinem Gerät, die Skripte auslesen können.",
           "System & hardware", "Details about your device that scripts can read."],
  screen: ["Bildschirm & Fenster", "Auflösung, Farbtiefe und Fenstergröße.",
           "Screen & window", "Resolution, color depth and window size."],
  prefs: ["Darstellungs-Einstellungen", "System-Einstellungen, die der Browser per CSS-Media-Query verrät.",
          "Display preferences", "System settings that the browser reveals through CSS media queries."],
  locale: ["Zeit, Region & Format", "Zeitzone und Formate verraten oft ungefähr deinen Standort.",
           "Time, region & format", "Time zone and formats often reveal your approximate location."],
  network: ["Netzwerk (Browser-Sicht)", "Was der Browser über deine Verbindung preisgibt.",
            "Network (browser view)", "What the browser reveals about your connection."],
  gpu: ["Grafikkarte (WebGL)", "Die Grafikkarte ist ein starkes Merkmal beim Fingerprinting.",
        "Graphics card (WebGL)", "The graphics card is a strong fingerprinting feature."],
  fingerprint: ["Fingerprint-Merkmale", "Kombiniert ergeben diese Werte eine oft einzigartige Kennung deines Browsers.",
                "Fingerprint traits", "Combined, these values often form a unique identifier for your browser."],
  media: ["Geräte, Berechtigungen & Akku", "Anzahl der Geräte (ohne Namen) und bereits erteilte Rechte.",
          "Devices, permissions & battery", "Number of devices (without names) and permissions already granted."],
  storage: ["Speicher & Verlauf", "Browser-Speicher, in dem Webseiten Daten ablegen können.",
            "Storage & history", "Browser storage where websites can keep data."],
  features: ["Browser-Funktionen", "Unterstützte Web-Techniken – auch das trägt zur Identifizierbarkeit bei.",
             "Browser features", "Supported web technologies – this also contributes to identifiability."],
  ip: ["IP-Adresse & Standort", "Diese Infos kennt jeder Server, den du besuchst – ermittelt über externe Dienste.",
       "IP address & location", "Every server you visit knows this – determined here via external services."],
};

/* Row labels and tooltips: id: [DE label, DE tooltip, EN label, EN tooltip] */
const R = {
  // HTTP
  ua: ["User-Agent", "Textkennung deines Browsers mit Name, Version, Betriebssystem und Gerätetyp. Wird bei jeder Anfrage an jeden Server mitgesendet.",
       "User-Agent", "Text identifier of your browser with name, version, operating system and device type. Sent to every server with every request."],
  acceptLang: ["Accept-Language", "Liste deiner bevorzugten Sprachen in Reihenfolge. Server nutzen sie, um die passende Sprachversion auszuliefern. Sie verrät aber auch deine Sprach-Vorlieben.",
               "Accept-Language", "Ordered list of your preferred languages. Servers use it to deliver the right language version, but it also reveals your language preferences."],
  langPrimary: ["Sprache (primär)", "Die Hauptsprache deines Browsers (z. B. de-DE).",
                "Language (primary)", "The main language of your browser (e.g. en-US)."],
  referrer: ["Referrer", "Die Seite, von der du hierher gekommen bist. Verrät Webseiten, woher du kommst. Leer bei direktem Aufruf oder wenn der Browser ihn unterdrückt.",
             "Referrer", "The page you came from. Tells websites where you arrived from. Empty for direct visits or when the browser suppresses it."],
  dnt: ["Do Not Track", "Bitte an Webseiten, dich nicht zu verfolgen. Rein freiwillig: Seiten dürfen es ignorieren, und es gilt heute als veraltet.",
        "Do Not Track", "A request to websites not to track you. Purely voluntary: sites may ignore it, and it is considered obsolete today."],
  gpc: ["Global Privacy Control", "Modernes Datenschutz-Signal, mit dem du dem Verkauf oder der Weitergabe deiner Daten widersprichst. In einigen Rechtsräumen (z. B. Kalifornien) rechtlich verbindlich.",
        "Global Privacy Control", "Modern privacy signal with which you object to the sale or sharing of your data. Legally binding in some jurisdictions (e.g. California)."],
  cookiesOn: ["Cookies erlaubt", "Ob dein Browser das Speichern von Cookies grundsätzlich zulässt.",
              "Cookies enabled", "Whether your browser allows storing cookies in general."],
  cookiesHere: ["Cookies für diese Seite", "Anzahl der Cookies, die für diese Seite gespeichert sind (nur ohne HttpOnly-Flag sichtbar).",
                "Cookies for this page", "Number of cookies stored for this page (only visible without the HttpOnly flag)."],
  protocol: ["Protokoll", "Übertragungsart der Seite. https bedeutet verschlüsselt, http unverschlüsselt, file bedeutet lokale Datei.",
             "Protocol", "How the page was transferred. https means encrypted, http unencrypted, file means a local file."],
  host: ["Host", "Adresse (Domain und Port) des Servers, von dem die Seite geladen wurde.",
         "Host", "Address (domain and port) of the server the page was loaded from."],
  path: ["Pfad", "Pfad der aktuell geöffneten Seite auf dem Server.",
         "Path", "Path of the currently opened page on the server."],

  // Client hints
  chSupported: ["Unterstützt", "Ob dein Browser die Client-Hints-Schnittstelle bietet.",
                "Supported", "Whether your browser offers the Client Hints interface."],
  brands: ["Marken", "Strukturierte Liste von Browser-Marken und Versionen. Der moderne Nachfolger des User-Agent-Textes.",
           "Brands", "Structured list of browser brands and versions. The modern successor of the User-Agent text."],
  mobile: ["Mobil", "Ob der Browser sich als mobiles Gerät meldet.",
           "Mobile", "Whether the browser reports itself as a mobile device."],
  platform: ["Plattform", "Betriebssystem oder Plattform, auf der der Browser läuft (z. B. Windows, macOS, Linux, Android).",
             "Platform", "Operating system or platform the browser runs on (e.g. Windows, macOS, Linux, Android)."],
  arch: ["Architektur", "CPU-Architektur, z. B. x86 oder arm. Ein Fingerprinting-Merkmal.",
         "Architecture", "CPU architecture, e.g. x86 or arm. A fingerprinting feature."],
  bitness: ["Bitness", "Ob dein System 32 oder 64 Bit nutzt.",
            "Bitness", "Whether your system uses 32 or 64 bit."],
  model: ["Gerätemodell", "Modellbezeichnung des Geräts. Meist nur bei Android-Handys gefüllt.",
          "Device model", "Model name of the device. Usually only filled on Android phones."],
  platVersion: ["Plattform-Version", "Genaue Version deines Betriebssystems. Hilft Seiten, sich an dein System anzupassen, macht dich aber leichter wiedererkennbar.",
                "Platform version", "Exact version of your operating system. Helps sites adapt to your system but makes you easier to recognize."],
  fullVersion: ["Volle Browser-Version", "Exakte Versionsnummer deines Browsers inklusive Build.",
                "Full browser version", "Exact version number of your browser including the build."],
  wow64: ["WoW64", "Zeigt an, ob ein 32-Bit-Browser auf einem 64-Bit-Windows läuft.",
          "WoW64", "Indicates whether a 32-bit browser runs on 64-bit Windows."],
  chDetails: ["Detail-Werte", "Detailliertere Client Hints konnten nicht abgefragt werden.",
              "Detail values", "More detailed Client Hints could not be queried."],

  // System
  vendor: ["Hersteller (vendor)", "Hersteller der Browser-Engine, z. B. Google Inc. oder Apple Computer, Inc.",
           "Vendor", "Vendor of the browser engine, e.g. Google Inc. or Apple Computer, Inc."],
  cores: ["CPU-Kerne (logisch)", "Anzahl der logischen Prozessorkerne. Ein häufig genutztes Fingerprinting-Merkmal.",
          "CPU cores (logical)", "Number of logical processor cores. A commonly used fingerprinting feature."],
  memory: ["Arbeitsspeicher (ca.)", "Grob gerundeter Arbeitsspeicher deines Geräts (aus Datenschutzgründen gerundet und nach oben begrenzt).",
           "Memory (approx.)", "Roughly rounded memory of your device (rounded and capped for privacy reasons)."],
  touchPoints: ["Touch-Punkte (max.)", "Wie viele gleichzeitige Berührungspunkte dein Gerät unterstützt. 0 bedeutet kein Touchscreen.",
                "Touch points (max.)", "How many simultaneous touch points your device supports. 0 means no touchscreen."],
  touchSupport: ["Touch-Unterstützung", "Ob dein Gerät Touch-Eingaben erkennt.",
                 "Touch support", "Whether your device detects touch input."],
  online: ["Online", "Ob der Browser glaubt, mit einem Netzwerk verbunden zu sein.",
           "Online", "Whether the browser thinks it is connected to a network."],
  webdriver: ["Automatisiert (webdriver)", "Wird auf Ja gesetzt, wenn der Browser von Testwerkzeugen oder Bots gesteuert wird. Webseiten nutzen das zur Bot-Erkennung.",
              "Automated (webdriver)", "Set to Yes when the browser is controlled by test tools or bots. Websites use this for bot detection."],
  pdfViewer: ["PDF-Viewer integriert", "Ob dein Browser PDFs selbst anzeigen kann.",
              "Built-in PDF viewer", "Whether your browser can display PDFs itself."],
  java: ["Java aktiviert", "Ob Java-Applets erlaubt sind. Heute praktisch immer Nein.",
         "Java enabled", "Whether Java applets are allowed. Practically always No today."],

  // Screen
  screenRes: ["Bildschirmauflösung", "Gesamte Auflösung deines Monitors in Pixeln.",
              "Screen resolution", "Total resolution of your monitor in pixels."],
  availRes: ["Verfügbarer Bereich", "Auflösung abzüglich Taskleiste und festen Systemleisten.",
             "Available area", "Resolution minus taskbar and fixed system bars."],
  winInner: ["Fenster (innen)", "Größe des sichtbaren Seitenbereichs im Browserfenster. Ändert sich beim Verkleinern oder Vergrößern.",
             "Window (inner)", "Size of the visible page area in the browser window. Changes when you resize."],
  winOuter: ["Fenster (außen)", "Gesamtgröße des Browserfensters inklusive Tabs und Adressleiste.",
             "Window (outer)", "Total size of the browser window including tabs and address bar."],
  colorDepth: ["Farbtiefe", "Bits pro Pixel für die Farbdarstellung. 24 Bit entsprechen ca. 16,7 Mio. Farben.",
               "Color depth", "Bits per pixel for color display. 24 bit equals about 16.7 million colors."],
  dpr: ["Pixeldichte (DPR)", "Verhältnis von physischen zu CSS-Pixeln. 2 bedeutet hochauflösendes Display (Retina). Wird auch durch Windows-Skalierung oder Browser-Zoom beeinflusst.",
        "Pixel density (DPR)", "Ratio of physical to CSS pixels. 2 means a high-resolution display (Retina). Also affected by Windows scaling or browser zoom."],
  orientation: ["Orientierung", "Ausrichtung deines Bildschirms (Quer- oder Hochformat) und Drehwinkel.",
                "Orientation", "Orientation of your screen (landscape or portrait) and rotation angle."],
  p3: ["Farbraum P3", "Ob dein Display den erweiterten Display-P3-Farbraum darstellen kann (mehr Farben als sRGB).",
       "P3 color space", "Whether your display can show the wide Display-P3 color space (more colors than sRGB)."],
  rec2020: ["Farbraum Rec.2020", "Ob dein Display den sehr großen Rec.2020-Farbraum (HDR/4K) unterstützt.",
            "Rec.2020 color space", "Whether your display supports the very large Rec.2020 color space (HDR/4K)."],
  hdr: ["HDR", "Ob dein Bildschirm High Dynamic Range (besonders hohe Helligkeit und Kontrast) unterstützt.",
        "HDR", "Whether your screen supports High Dynamic Range (particularly high brightness and contrast)."],
  fullscreen: ["Vollbild", "Ob diese Seite gerade im Vollbildmodus angezeigt wird.",
               "Fullscreen", "Whether this page is currently shown in fullscreen mode."],
  zoom: ["Zoom (ca.)", "Grobe Schätzung des Browser-Zooms anhand des Fensterverhältnisses. Kann ungenau sein.",
         "Zoom (approx.)", "Rough estimate of the browser zoom based on the window ratio. May be inaccurate."],

  // Preferences
  dark: ["Dunkles Farbschema", "Ob dein System den dunklen Modus bevorzugt. Webseiten können sich automatisch anpassen.",
         "Dark color scheme", "Whether your system prefers dark mode. Websites can adapt automatically."],
  reducedMotion: ["Weniger Animationen", "Ob du in den Systemeinstellungen reduzierte Bewegung gewünscht hast (Barrierefreiheit).",
                  "Reduced motion", "Whether you requested reduced motion in your system settings (accessibility)."],
  highContrast: ["Erhöhter Kontrast", "Ob du in deinem System einen höheren Kontrast aktiviert hast.",
                 "Increased contrast", "Whether you enabled higher contrast in your system."],
  reducedTransp: ["Weniger Transparenz", "Ob du reduzierte Transparenzeffekte eingestellt hast.",
                  "Reduced transparency", "Whether you set reduced transparency effects."],
  forcedColors: ["Erzwungene Farben", "Aktiv bei Hochkontrast-Modi (z. B. Windows-Kontrastdesigns).",
                 "Forced colors", "Active in high-contrast modes (e.g. Windows contrast themes)."],
  inverted: ["Invertierte Farben", "Ob dein System die Bildschirmfarben invertiert (Barrierefreiheit).",
             "Inverted colors", "Whether your system inverts the screen colors (accessibility)."],
  hover: ["Hover-Fähigkeit", "Ob dein Hauptgerät Elemente mit dem Mauszeiger überfahren kann. Bei Touchscreens meist Nein.",
          "Hover capability", "Whether your primary input can hover over elements. Usually No on touchscreens."],
  pointer: ["Zeigergenauigkeit", "Fein bedeutet Maus oder Trackpad, grob bedeutet Fingereingabe.",
            "Pointer precision", "Fine means mouse or trackpad, coarse means finger input."],
  saveData: ["Datensparmodus", "Ob dein Browser Webseiten bittet, weniger Daten zu laden (Data Saver).",
             "Data saver", "Whether your browser asks websites to load less data (Data Saver)."],

  // Locale
  timezone: ["Zeitzone", "Deine eingestellte Zeitzone. Verrät grob deinen Standort, auch bei aktivem VPN.",
             "Time zone", "Your configured time zone. Roughly reveals your location, even with an active VPN."],
  utcOffset: ["UTC-Offset", "Abweichung deiner lokalen Zeit von der Weltzeit (UTC), inklusive Sommerzeit.",
              "UTC offset", "Difference between your local time and universal time (UTC), including daylight saving."],
  localTime: ["Lokale Zeit", "Aktuelle Uhrzeit deines Geräts. Seiten können sie mit der Serverzeit vergleichen.",
              "Local time", "Current time of your device. Sites can compare it with the server time."],
  locale: ["Locale", "Sprach- und Regionseinstellung, die Datums-, Zahlen- und Währungsformate bestimmt.",
           "Locale", "Language and region setting that determines date, number and currency formats."],
  calendar: ["Kalender", "Standardkalender deiner Region (meist gregory).",
             "Calendar", "Default calendar of your region (usually gregory)."],
  numbering: ["Zahlensystem", "Ziffernsystem deiner Region (latn bedeutet westliche Ziffern 0–9).",
              "Numbering system", "Digit system of your region (latn means Western digits 0–9)."],
  sampleNumber: ["Beispiel Zahl", "Zeigt, wie dein Browser Zahlen formatiert (Tausender- und Dezimaltrennzeichen).",
                 "Sample number", "Shows how your browser formats numbers (thousands and decimal separators)."],
  weekStart: ["Wochenbeginn", "Erster Tag der Woche in deiner Region.",
              "Week start", "First day of the week in your region."],
  currency: ["Währung (lokal)", "Beispiel, wie dein Browser Euro-Beträge formatiert.",
             "Currency (local)", "Example of how your browser formats euro amounts."],

  // Network
  onlineStatus: ["Online-Status", "Ob der Browser glaubt, mit einem Netzwerk verbunden zu sein.",
                 "Online status", "Whether the browser thinks it is connected to a network."],
  connType: ["Verbindungstyp", "Art der Verbindung (z. B. WLAN, Mobilfunk, Ethernet), sofern der Browser sie nennt.",
             "Connection type", "Type of connection (e.g. Wi-Fi, cellular, Ethernet), if the browser reports it."],
  effType: ["Effektiver Typ", "Geschätzte Verbindungsqualität (slow-2g, 2g, 3g oder 4g) anhand der gemessenen Leistung.",
            "Effective type", "Estimated connection quality (slow-2g, 2g, 3g or 4g) based on measured performance."],
  downlink: ["Downlink (ca.)", "Geschätzte Download-Geschwindigkeit in Megabit pro Sekunde (gerundet).",
             "Downlink (approx.)", "Estimated download speed in megabits per second (rounded)."],
  rtt: ["Latenz (RTT)", "Geschätzte Round-Trip-Time: Wie lange eine Anfrage zum Server und zurück dauert.",
        "Latency (RTT)", "Estimated round-trip time: how long a request to the server and back takes."],
  netApi: ["Network Information API", "Browser-Schnittstelle für Verbindungsinfos. Firefox und Safari bieten sie nicht an.",
           "Network Information API", "Browser interface for connection info. Firefox and Safari do not offer it."],

  // GPU
  webglVersion: ["WebGL-Version", "Version der 3D-Grafikschnittstelle deines Browsers.",
                 "WebGL version", "Version of your browser's 3D graphics interface."],
  gpuVendor: ["Grafik-Hersteller", "Hersteller deiner Grafikhardware (z. B. NVIDIA, AMD, Intel).",
              "GPU vendor", "Manufacturer of your graphics hardware (e.g. NVIDIA, AMD, Intel)."],
  gpuRenderer: ["Grafikkarte / Renderer", "Genaue Bezeichnung deiner Grafikkarte bzw. des Treibers. Ein sehr aussagekräftiges Fingerprinting-Merkmal.",
                "Graphics card / renderer", "Exact name of your graphics card or driver. A very telling fingerprinting feature."],
  maxTexture: ["Max. Texturgröße", "Größte Textur, die deine Grafikkarte verarbeiten kann. Hängt von der Hardware ab.",
               "Max. texture size", "Largest texture your graphics card can handle. Depends on the hardware."],
  glExt: ["Anzahl Erweiterungen", "Anzahl der unterstützten WebGL-Erweiterungen. Variiert je nach Grafikkarte und Treiber.",
          "Number of extensions", "Number of supported WebGL extensions. Varies by graphics card and driver."],
  webgl: ["WebGL", "3D-Grafikschnittstelle des Browsers. Hier nicht verfügbar oder deaktiviert.",
          "WebGL", "3D graphics interface of the browser. Not available or disabled here."],
  webgpu: ["WebGPU", "Neue, schnellere Grafik-Schnittstelle als Nachfolger von WebGL.",
           "WebGPU", "New, faster graphics interface as the successor of WebGL."],

  // Fingerprint
  canvas: ["Canvas-Hash", "Prüfsumme eines unsichtbar gezeichneten Bildes. Kleine Unterschiede bei Grafik, Treiber und Schriften machen den Wert auf vielen Geräten einzigartig, ein verbreitetes Tracking-Verfahren.",
           "Canvas hash", "Checksum of an invisibly drawn image. Tiny differences in graphics, drivers and fonts make the value unique on many devices – a widespread tracking technique."],
  fonts: ["Erkannte Schriftarten", "Welche der getesteten Schriften auf deinem System installiert sind. Die Schriftenliste ist oft sehr individuell.",
          "Detected fonts", "Which of the tested fonts are installed on your system. The font list is often very individual."],
  audio: ["Audio-Kontext", "Abtastrate und Kanäle deiner Audio-Hardware. Auch ein Fingerprinting-Merkmal.",
          "Audio context", "Sample rate and channels of your audio hardware. Also a fingerprinting feature."],
  plugins: ["Plugins", "Vom Browser gemeldete Plugins (heute meist nur noch der PDF-Viewer).",
            "Plugins", "Plugins reported by the browser (today usually only the PDF viewer)."],
  mimeTypes: ["MIME-Typen", "Anzahl der Dateitypen, die der Browser selbst darstellen kann.",
              "MIME types", "Number of file types the browser can display itself."],

  // Media
  cams: ["Kameras", "Anzahl der angeschlossenen Kameras. Namen werden erst nach Freigabe sichtbar.",
         "Cameras", "Number of connected cameras. Names only become visible after permission is granted."],
  mics: ["Mikrofone", "Anzahl der angeschlossenen Mikrofone.",
         "Microphones", "Number of connected microphones."],
  speakers: ["Lautsprecher/Ausgänge", "Anzahl der Audio-Ausgabegeräte.",
             "Speakers/outputs", "Number of audio output devices."],
  devices: ["Geräte", "Geräteliste konnte nicht abgerufen werden.",
            "Devices", "The device list could not be retrieved."],
  perm: ["Berechtigung: {0}", "Aktueller Status dieser Berechtigung für diese Seite: granted (erlaubt), denied (verweigert) oder prompt (es wird gefragt).",
         "Permission: {0}", "Current status of this permission for this page: granted, denied or prompt (you will be asked)."],
  battery: ["Akku-Ladestand", "Aktueller Ladestand deines Akkus (nur in einigen Browsern).",
            "Battery level", "Current charge level of your battery (only in some browsers)."],
  charging: ["Lädt gerade", "Ob dein Gerät gerade am Netzteil hängt.",
             "Charging", "Whether your device is currently plugged in."],
  batteryApi: ["Akku-API", "Schnittstelle für den Akkustatus. Wurde aus Datenschutzgründen in Firefox und Safari entfernt.",
               "Battery API", "Interface for the battery status. Removed from Firefox and Safari for privacy reasons."],

  // Storage
  localStorage: ["localStorage", "Dauerhafter Browser-Speicher, in dem Webseiten Daten ablegen können. Bleibt auch nach dem Schließen erhalten.",
                 "localStorage", "Persistent browser storage where websites can keep data. Survives closing the browser."],
  sessionStorage: ["sessionStorage", "Temporärer Speicher, der beim Schließen des Tabs gelöscht wird.",
                   "sessionStorage", "Temporary storage that is deleted when the tab is closed."],
  indexedDB: ["IndexedDB", "Datenbank im Browser für größere Datenmengen (z. B. für Offline-Apps).",
              "IndexedDB", "In-browser database for larger amounts of data (e.g. for offline apps)."],
  serviceWorker: ["Service Worker", "Hintergrundskripte, die Offline-Betrieb und Push-Nachrichten ermöglichen.",
                  "Service Worker", "Background scripts that enable offline use and push notifications."],
  quota: ["Speicherquota", "Wie viel Speicherplatz Webseiten insgesamt im Browser belegen dürfen.",
          "Storage quota", "How much storage websites may use in total in the browser."],
  usage: ["Davon genutzt", "Wie viel Speicher diese Seite bereits belegt.",
          "Used", "How much storage this page already uses."],
  historyLen: ["Verlauf (History-Einträge)", "Anzahl der Einträge im Verlauf dieses Tabs. Die Adressen selbst sind für Webseiten nicht auslesbar.",
               "History (entries)", "Number of entries in this tab's history. The addresses themselves cannot be read by websites."],

  // Features
  webrtc: ["WebRTC", "Technik für Video- und Sprachanrufe im Browser. Kann deine lokale IP-Adresse preisgeben.",
           "WebRTC", "Technology for video and voice calls in the browser. Can reveal your local IP address."],
  wasm: ["WebAssembly", "Format für schnellen Programmcode im Browser (z. B. für Spiele oder Bildbearbeitung).",
         "WebAssembly", "Format for fast program code in the browser (e.g. for games or image editing)."],
  websockets: ["WebSockets", "Dauerhafte Verbindung zwischen Seite und Server (z. B. für Chats).",
               "WebSockets", "Persistent connection between page and server (e.g. for chats)."],
  workers: ["Web Workers", "Erlaubt Skripten, im Hintergrund zu rechnen, ohne die Seite zu blockieren.",
            "Web Workers", "Lets scripts compute in the background without blocking the page."],
  geoloc: ["Geolocation", "Schnittstelle für den genauen Standort. Erfordert immer deine Zustimmung.",
           "Geolocation", "Interface for your precise location. Always requires your consent."],
  bluetooth: ["Bluetooth", "Ob Webseiten (nach deiner Zustimmung) Bluetooth-Geräte ansprechen können.",
              "Bluetooth", "Whether websites can talk to Bluetooth devices (with your consent)."],
  usb: ["USB", "Ob Webseiten (nach deiner Zustimmung) USB-Geräte ansprechen können.",
        "USB", "Whether websites can talk to USB devices (with your consent)."],
  gamepad: ["Gamepad", "Ob Controller und Gamepads ausgelesen werden können.",
            "Gamepad", "Whether controllers and gamepads can be read."],
  vibration: ["Vibration", "Ob die Seite dein Gerät vibrieren lassen kann (meist Smartphones).",
              "Vibration", "Whether the page can make your device vibrate (mostly smartphones)."],
  notifications: ["Benachrichtigungen", "Ob Webseiten Desktop-Benachrichtigungen anzeigen können (mit deiner Erlaubnis).",
                  "Notifications", "Whether websites can show desktop notifications (with your permission)."],
  clipboard: ["Zwischenablage", "Ob Webseiten (mit Erlaubnis) auf die Zwischenablage zugreifen können.",
              "Clipboard", "Whether websites can access the clipboard (with permission)."],
  share: ["Web Share", "Ob die Seite das System-Teilen-Menü öffnen kann.",
          "Web Share", "Whether the page can open the system share menu."],
  speechRec: ["Spracherkennung", "Ob der Browser gesprochene Sprache in Text umwandeln kann.",
              "Speech recognition", "Whether the browser can convert spoken language into text."],
  speechSynth: ["Sprachausgabe", "Ob der Browser Text vorlesen kann.",
                "Speech synthesis", "Whether the browser can read text aloud."],
  secure: ["Sicherer Kontext (HTTPS)", "Viele sensible Funktionen funktionieren nur über HTTPS oder auf localhost.",
           "Secure context (HTTPS)", "Many sensitive features only work over HTTPS or on localhost."],
  coi: ["Cross-Origin-Isolated", "Erweiterter Isolationsmodus der Seite, nötig für bestimmte Hochleistungsfunktionen.",
        "Cross-origin isolated", "Extended isolation mode of the page, required for certain high-performance features."],

  // IP
  ip: ["Öffentliche IP-Adresse", "Deine Adresse im Internet, die jeder besuchte Server sieht. Wird vom Internetanbieter oder VPN zugewiesen.",
       "Public IP address", "Your address on the internet, seen by every server you visit. Assigned by your internet provider or VPN."],
  ipCity: ["Ort (anhand der IP)", "Ungefährer Ort, den Dienste aus deiner IP ableiten. Oft auf Stadt- oder Regionsebene, kann aber falsch sein.",
           "Place (based on IP)", "Approximate place that services derive from your IP. Often city or region level, but can be wrong."],
  ipZip: ["Postleitzahl", "Ungefähre PLZ laut IP-Datenbank. Oft die des Anbieters, nicht deine.",
          "Postal code", "Approximate postal code from the IP database. Often the provider's, not yours."],
  ipCoords: ["Koordinaten (ca.)", "Grobe Position laut IP-Datenbank, meist nur auf Stadtebene genau.",
             "Coordinates (approx.)", "Rough position from the IP database, usually only accurate to city level."],
  isp: ["Internetanbieter (ISP)", "Organisation, der deine IP-Adresse gehört (z. B. dein Provider oder VPN-Anbieter).",
        "Internet provider (ISP)", "Organization that owns your IP address (e.g. your provider or VPN service)."],
  asn: ["ASN", "Nummer des Netzwerks (Autonomes System), zu dem deine IP gehört.",
        "ASN", "Number of the network (autonomous system) your IP belongs to."],
  ipTz: ["Zeitzone laut IP", "Zeitzone, die zum IP-Standort passt. Weicht sie von deiner Browser-Zeitzone ab, deutet das auf VPN oder Proxy hin.",
         "Time zone per IP", "Time zone matching the IP location. If it differs from your browser time zone, it hints at a VPN or proxy."],
  webrtcLeak: ["WebRTC-IP-Leak-Test", "Zeigt IPs, die per WebRTC sichtbar werden. Erscheint hier deine echte IP trotz VPN, liegt ein Leak vor.",
               "WebRTC IP leak test", "Shows IPs that become visible via WebRTC. If your real IP appears here despite a VPN, there is a leak."],
  geoData: ["Standort-Daten", "Die Standort-Abfrage hat nicht funktioniert.",
            "Location data", "The location lookup did not work."],
};

/* Translatable values: key: [German, English] ({0}, {1} = parameters) */
const VT = {
  na: ["Nicht verfügbar", "Not available"],
  unknown: ["Unbekannt", "Unknown"],
  notset: ["Nicht gesetzt", "Not set"],
  active: ["Aktiv", "Active"],
  inactive: ["Nicht aktiv", "Not active"],
  direct: ["Keiner (direkter Aufruf)", "None (direct visit)"],
  localfile: ["(lokale Datei)", "(local file)"],
  empty: ["(leer)", "(empty)"],
  none: ["Keine", "None"],
  cookiesN: ["{0} vorhanden", "{0} present"],
  chNo: ["Nein (z. B. Firefox/Safari)", "No (e.g. Firefox/Safari)"],
  notretrievable: ["Nicht abrufbar", "Not retrievable"],
  notsupported: ["Nicht unterstützt", "Not supported"],
  ptrFine: ["Fein (Maus/Trackpad)", "Fine (mouse/trackpad)"],
  ptrCoarse: ["Grob (Touch)", "Coarse (touch)"],
  audioFmt: ["{0} Hz, max. {1} Kanäle", "{0} Hz, max. {1} channels"],
  noneDetected: ["Keine erkannt", "None detected"],
  ipFail: ["Abfrage fehlgeschlagen (Adblocker/Offline?)", "Request failed (ad blocker/offline?)"],
  geoFail: ["Nicht abrufbar (Limit/Blocker?)", "Not retrievable (rate limit/blocker?)"],
  webrtcNA: ["WebRTC nicht verfügbar", "WebRTC not available"],
  webrtcNone: ["Keine IPs sichtbar (gut)", "No IPs visible (good)"],
  error: ["Fehler", "Error"],
  wd1: ["Montag", "Monday"],
  wd2: ["Dienstag", "Tuesday"],
  wd3: ["Mittwoch", "Wednesday"],
  wd4: ["Donnerstag", "Thursday"],
  wd5: ["Freitag", "Friday"],
  wd6: ["Samstag", "Saturday"],
  wd7: ["Sonntag", "Sunday"],
};

/* =====================================================================
   Helpers
   ===================================================================== */

/* Marks a value that has to be translated at render time */
const V = (key, ...params) => ({ vt: key, p: params });

const safe = (fn, fallback = V("na")) => {
  try {
    const r = fn();
    return r === undefined || r === null || r === "" ? fallback : r;
  } catch {
    return fallback;
  }
};

async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const mq = (q) => window.matchMedia(q).matches;

function resolveValue(v) {
  if (typeof v === "boolean") return { text: t(v ? "yes" : "no"), cls: v ? "yes" : "no" };
  if (v && typeof v === "object" && v.vt) {
    let s = VT[v.vt] ? VT[v.vt][li()] : v.vt;
    (v.p || []).forEach((p, i) => { s = s.replace("{" + i + "}", p); });
    return { text: s };
  }
  return { text: String(v) };
}

function rowText(id, param) {
  const r = R[id];
  const base = li() === 0 ? 0 : 2;
  let label = r[base];
  if (param !== undefined) label = label.replace("{0}", param);
  return { label, tip: r[base + 1] };
}

/* =====================================================================
   Collectors – they return raw data only, texts are resolved on render
   ===================================================================== */

function collectHttp() {
  const nav = navigator;
  return {
    id: "http",
    rows: [
      ["ua", nav.userAgent],
      ["acceptLang", safe(() => nav.languages.join(", "))],
      ["langPrimary", nav.language],
      ["referrer", document.referrer || V("direct")],
      ["dnt", safe(() => nav.doNotTrack ?? window.doNotTrack, V("notset"))],
      ["gpc", safe(() => (nav.globalPrivacyControl ? V("active") : V("inactive")))],
      ["cookiesOn", nav.cookieEnabled],
      ["cookiesHere", document.cookie ? V("cookiesN", document.cookie.split(";").length) : V("none")],
      ["protocol", location.protocol],
      ["host", location.host || V("localfile")],
      ["path", location.pathname],
    ],
  };
}

async function collectClientHints() {
  const uad = navigator.userAgentData;
  if (!uad) return { id: "clienthints", rows: [["chSupported", V("chNo")]] };

  const rows = [
    ["brands", uad.brands.map((b) => `${b.brand} ${b.version}`).join(", ")],
    ["mobile", uad.mobile],
    ["platform", uad.platform],
  ];
  try {
    const h = await uad.getHighEntropyValues([
      "architecture", "bitness", "model", "platformVersion",
      "uaFullVersion", "fullVersionList", "wow64",
    ]);
    rows.push(
      ["arch", h.architecture || "?"],
      ["bitness", h.bitness || "?"],
      ["model", h.model || V("empty")],
      ["platVersion", h.platformVersion || "?"],
      ["fullVersion", h.uaFullVersion || "?"],
      ["wow64", !!h.wow64]
    );
  } catch {
    rows.push(["chDetails", V("notretrievable")]);
  }
  return { id: "clienthints", rows };
}

function collectSystem() {
  const nav = navigator;
  return {
    id: "system",
    rows: [
      ["platform", safe(() => nav.platform)],
      ["vendor", safe(() => nav.vendor, V("empty"))],
      ["cores", safe(() => nav.hardwareConcurrency)],
      ["memory", safe(() => (nav.deviceMemory ? nav.deviceMemory + " GB" : null))],
      ["touchPoints", safe(() => nav.maxTouchPoints)],
      ["touchSupport", "ontouchstart" in window || nav.maxTouchPoints > 0],
      ["online", nav.onLine],
      ["webdriver", !!nav.webdriver],
      ["pdfViewer", safe(() => nav.pdfViewerEnabled)],
      ["java", safe(() => nav.javaEnabled())],
    ],
  };
}

function collectScreen() {
  const s = screen;
  const o = s.orientation;
  return {
    id: "screen",
    rows: [
      ["screenRes", `${s.width} × ${s.height} px`],
      ["availRes", `${s.availWidth} × ${s.availHeight} px`],
      ["winInner", `${window.innerWidth} × ${window.innerHeight} px`],
      ["winOuter", `${window.outerWidth} × ${window.outerHeight} px`],
      ["colorDepth", `${s.colorDepth} Bit`],
      ["dpr", window.devicePixelRatio],
      ["orientation", o ? `${o.type} (${o.angle}°)` : V("unknown")],
      ["p3", mq("(color-gamut: p3)")],
      ["rec2020", mq("(color-gamut: rec2020)")],
      ["hdr", mq("(dynamic-range: high)")],
      ["fullscreen", !!document.fullscreenElement],
      ["zoom", Math.round((window.outerWidth / window.innerWidth) * 100) + " %"],
    ],
  };
}

function collectPrefs() {
  return {
    id: "prefs",
    rows: [
      ["dark", mq("(prefers-color-scheme: dark)")],
      ["reducedMotion", mq("(prefers-reduced-motion: reduce)")],
      ["highContrast", mq("(prefers-contrast: more)")],
      ["reducedTransp", mq("(prefers-reduced-transparency: reduce)")],
      ["forcedColors", mq("(forced-colors: active)")],
      ["inverted", mq("(inverted-colors: inverted)")],
      ["hover", mq("(hover: hover)")],
      ["pointer", mq("(pointer: fine)") ? V("ptrFine") : mq("(pointer: coarse)") ? V("ptrCoarse") : V("none")],
      ["saveData", safe(() => (navigator.connection.saveData === undefined ? null : !!navigator.connection.saveData))],
    ],
  };
}

function collectLocale() {
  const dtf = Intl.DateTimeFormat().resolvedOptions();
  const now = new Date();
  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return {
    id: "locale",
    rows: [
      ["timezone", dtf.timeZone],
      ["utcOffset", `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`],
      ["localTime", now.toLocaleString()],
      ["locale", dtf.locale],
      ["calendar", dtf.calendar],
      ["numbering", dtf.numberingSystem],
      ["sampleNumber", (1234567.89).toLocaleString()],
      ["weekStart", safe(() => {
        const loc = new Intl.Locale(dtf.locale);
        const w = loc.weekInfo || (loc.getWeekInfo && loc.getWeekInfo());
        return V("wd" + w.firstDay);
      })],
      ["currency", safe(() => new Intl.NumberFormat(dtf.locale, { style: "currency", currency: "EUR" }).format(12.5))],
    ],
  };
}

function collectNetwork() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const rows = c
    ? [
        ["connType", c.type || V("unknown")],
        ["effType", c.effectiveType || "?"],
        ["downlink", c.downlink != null ? c.downlink + " Mbit/s" : "?"],
        ["rtt", c.rtt != null ? c.rtt + " ms" : "?"],
        ["saveData", !!c.saveData],
      ]
    : [["netApi", V("notsupported")]];
  rows.unshift(["onlineStatus", navigator.onLine]);
  return { id: "network", rows };
}

function getWebGLInfo() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return null;
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    version: gl.getParameter(gl.VERSION),
    vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    extensions: (gl.getSupportedExtensions() || []).length,
  };
}

function collectGPU() {
  const info = safe(getWebGLInfo, null);
  const rows = info
    ? [
        ["webglVersion", info.version],
        ["gpuVendor", info.vendor],
        ["gpuRenderer", info.renderer],
        ["maxTexture", info.maxTexture],
        ["glExt", info.extensions],
      ]
    : [["webgl", V("na")]];
  rows.push(["webgpu", "gpu" in navigator]);
  return { id: "gpu", rows };
}

async function collectFingerprint() {
  // Canvas
  let canvasHash = V("na");
  try {
    const c = document.createElement("canvas");
    c.width = 240; c.height = 60;
    const ctx = c.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "16px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 5, 80, 30);
    ctx.fillStyle = "#069";
    ctx.fillText("Browser-Fingerprint äöü 😀", 4, 10);
    ctx.fillStyle = "rgba(102,204,0,0.6)";
    ctx.fillText("Browser-Fingerprint äöü 😀", 6, 14);
    canvasHash = (await sha256(c.toDataURL())).slice(0, 32);
  } catch {}

  // Fonts
  const testFonts = [
    "Arial", "Verdana", "Times New Roman", "Courier New", "Georgia", "Trebuchet MS",
    "Comic Sans MS", "Impact", "Calibri", "Cambria", "Consolas", "Segoe UI",
    "Helvetica", "Helvetica Neue", "Menlo", "Monaco", "Roboto", "Ubuntu",
    "DejaVu Sans", "Liberation Sans", "Noto Sans", "SF Pro Text", "Futura", "Garamond",
  ];
  const found = [];
  try {
    const base = ["monospace", "sans-serif", "serif"];
    const span = document.createElement("span");
    span.style.cssText = "position:absolute;left:-9999px;font-size:72px;visibility:hidden";
    span.textContent = "mmmmmmmmmmlli";
    document.body.appendChild(span);
    const baseW = {};
    base.forEach((b) => { span.style.fontFamily = b; baseW[b] = span.offsetWidth; });
    testFonts.forEach((f) => {
      if (base.some((b) => { span.style.fontFamily = `'${f}',${b}`; return span.offsetWidth !== baseW[b]; })) found.push(f);
    });
    span.remove();
  } catch {}

  // Audio
  let audioInfo = V("na");
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    audioInfo = V("audioFmt", ac.sampleRate, ac.destination.maxChannelCount);
    ac.close();
  } catch {}

  return {
    id: "fingerprint",
    rows: [
      ["canvas", canvasHash],
      ["fonts", found.length ? `${found.length}: ${found.join(", ")}` : V("noneDetected")],
      ["audio", audioInfo],
      ["plugins", safe(() => (navigator.plugins.length ? [...navigator.plugins].map((p) => p.name).join(", ") : V("none")))],
      ["mimeTypes", safe(() => navigator.mimeTypes.length)],
    ],
  };
}

async function collectMedia() {
  const rows = [];
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const count = (k) => devs.filter((d) => d.kind === k).length;
    rows.push(
      ["cams", count("videoinput")],
      ["mics", count("audioinput")],
      ["speakers", count("audiooutput")]
    );
  } catch {
    rows.push(["devices", V("notretrievable")]);
  }

  const perms = ["geolocation", "notifications", "camera", "microphone", "clipboard-read", "persistent-storage"];
  for (const p of perms) {
    try {
      const st = await navigator.permissions.query({ name: p });
      rows.push(["perm", st.state, p]);
    } catch {
      /* not supported in this browser */
    }
  }

  try {
    const b = await navigator.getBattery();
    rows.push(["battery", Math.round(b.level * 100) + " %"], ["charging", b.charging]);
  } catch {
    rows.push(["batteryApi", V("na")]);
  }
  return { id: "media", rows };
}

async function collectStorage() {
  const rows = [
    ["localStorage", safe(() => !!window.localStorage, false)],
    ["sessionStorage", safe(() => !!window.sessionStorage, false)],
    ["indexedDB", "indexedDB" in window],
    ["serviceWorker", "serviceWorker" in navigator],
  ];
  try {
    const est = await navigator.storage.estimate();
    rows.push(
      ["quota", (est.quota / 1024 / 1024 / 1024).toFixed(1) + " GB"],
      ["usage", (est.usage / 1024 / 1024).toFixed(2) + " MB"]
    );
  } catch {}
  rows.push(["historyLen", history.length]);
  return { id: "storage", rows };
}

function collectFeatures() {
  const f = [
    ["webrtc", "RTCPeerConnection" in window],
    ["wasm", typeof WebAssembly === "object"],
    ["websockets", "WebSocket" in window],
    ["workers", "Worker" in window],
    ["geoloc", "geolocation" in navigator],
    ["bluetooth", "bluetooth" in navigator],
    ["usb", "usb" in navigator],
    ["gamepad", "getGamepads" in navigator],
    ["vibration", "vibrate" in navigator],
    ["notifications", "Notification" in window],
    ["clipboard", "clipboard" in navigator],
    ["share", "share" in navigator],
    ["speechRec", "SpeechRecognition" in window || "webkitSpeechRecognition" in window],
    ["speechSynth", "speechSynthesis" in window],
    ["secure", window.isSecureContext],
    ["coi", !!window.crossOriginIsolated],
  ];
  return { id: "features", rows: f };
}

/* Optional: IP address & location (external services, only after a click) */

async function collectIp() {
  const rows = [];
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    rows.push(["ip", j.ip]);
  } catch {
    rows.push(["ip", V("ipFail")]);
  }
  try {
    const r = await fetch("https://ipapi.co/json/");
    const j = await r.json();
    if (j.error) throw new Error(j.reason);
    rows.push(
      ["ipCity", [j.city, j.region, j.country_name].filter(Boolean).join(", ")],
      ["ipZip", j.postal || "?"],
      ["ipCoords", `${j.latitude}, ${j.longitude}`],
      ["isp", j.org || "?"],
      ["asn", j.asn || "?"],
      ["ipTz", j.timezone || "?"]
    );
  } catch {
    rows.push(["geoData", V("geoFail")]);
  }
  rows.push(["webrtcLeak", await collectWebRtc()]);
  return { id: "ip", rows };
}

function collectWebRtc() {
  return new Promise((resolve) => {
    if (!("RTCPeerConnection" in window)) return resolve(V("webrtcNA"));
    const ips = new Set();
    const result = () => (ips.size ? [...ips].join(", ") : V("webrtcNone"));
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.createDataChannel("x");
    pc.onicecandidate = (e) => {
      if (!e.candidate) { pc.close(); return resolve(result()); }
      const m = e.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9:]{6,})/i);
      if (m) ips.add(m[1]);
    };
    pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => resolve(V("error")));
    setTimeout(() => { try { pc.close(); } catch {} resolve(result()); }, 3000);
  });
}

/* =====================================================================
   Rendering
   ===================================================================== */

function render() {
  output.replaceChildren();
  const all = ipSection ? [...sections, ipSection] : sections;
  report = {};

  all.forEach((sec) => {
    const base = li() === 0 ? 0 : 2;
    const title = SEC[sec.id][base];
    const desc = SEC[sec.id][base + 1];
    report[title] = {};

    const card = document.createElement("section");
    card.className = "card";
    const h = document.createElement("h2");
    h.textContent = title;
    const d = document.createElement("p");
    d.className = "desc";
    d.textContent = desc;
    card.append(h, d);

    sec.rows.forEach(([id, value, param]) => {
      const { label, tip } = rowText(id, param);
      const res = resolveValue(value);
      report[title][label] = res.text;

      const row = document.createElement("div");
      row.className = "row";
      const kk = document.createElement("div");
      kk.className = "k";
      kk.textContent = label;
      if (tip) {
        kk.dataset.tip = tip;
        kk.tabIndex = 0; // tooltip also reachable via keyboard and touch
      }
      const vv = document.createElement("div");
      vv.className = "v";
      vv.textContent = res.text;
      if (res.cls) vv.classList.add(res.cls);
      row.append(kk, vv);
      card.append(row);
    });
    output.append(card);
  });
  applyFilter();
}

function applyFilter() {
  const q = document.getElementById("filter").value.trim().toLowerCase();
  document.querySelectorAll(".card").forEach((card) => {
    let any = false;
    const titleHit = card.querySelector("h2").textContent.toLowerCase().includes(q);
    card.querySelectorAll(".row").forEach((row) => {
      const hit = !q || titleHit || row.textContent.toLowerCase().includes(q);
      row.classList.toggle("hidden", !hit);
      if (hit) any = true;
    });
    card.classList.toggle("hidden", !any);
  });
}

/* Static texts of the page (header, buttons, footer ...) */
function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t("docTitle");
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });

  document.getElementById("btn-ip").textContent =
    t(ipState === "loading" ? "btnIpLoading" : ipState === "done" ? "btnIpAgain" : "btnIp");
  document.getElementById("btn-copy").textContent = t("btnCopy");

  document.querySelectorAll(".lang-switch button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
  });
}

function setLang(l) {
  lang = l === "de" ? "de" : "en";
  try { localStorage.setItem("lang", lang); } catch {}
  applyStatic();
  if (sections.length) render();
  else output.innerHTML = "";
}

async function collectAll() {
  output.replaceChildren();
  const p = document.createElement("p");
  p.className = "loading";
  p.textContent = t("loading");
  output.append(p);

  sections = [
    collectHttp(),
    await collectClientHints(),
    collectSystem(),
    collectScreen(),
    collectPrefs(),
    collectLocale(),
    collectNetwork(),
    collectGPU(),
    await collectFingerprint(),
    await collectMedia(),
    await collectStorage(),
    collectFeatures(),
  ];
  render();
}

/* =====================================================================
   Events
   ===================================================================== */

document.getElementById("filter").addEventListener("input", applyFilter);
document.getElementById("btn-refresh").addEventListener("click", collectAll);

document.querySelectorAll(".lang-switch button").forEach((b) => {
  b.addEventListener("click", () => setLang(b.dataset.lang));
});

document.getElementById("btn-ip").addEventListener("click", async () => {
  const btn = document.getElementById("btn-ip");
  ipState = "loading";
  btn.disabled = true;
  applyStatic();
  ipSection = await collectIp();
  ipState = "done";
  btn.disabled = false;
  applyStatic();
  if (sections.length) render();
  const ipCard = [...document.querySelectorAll(".card")].pop();
  if (ipCard) ipCard.scrollIntoView({ behavior: "smooth", block: "center" });
});

document.getElementById("btn-copy").addEventListener("click", async () => {
  const btn = document.getElementById("btn-copy");
  try {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    btn.textContent = t("btnCopied");
  } catch {
    btn.textContent = t("btnCopyFail");
  }
  setTimeout(() => { btn.textContent = t("btnCopy"); }, 2000);
});

document.getElementById("btn-download").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "browser-information.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (sections.length) { sections[3] = collectScreen(); render(); }
  }, 200);
});

/* =====================================================================
   Start: stored language, otherwise browser language (German or English)
   ===================================================================== */

(function init() {
  let stored = null;
  try { stored = localStorage.getItem("lang"); } catch {}
  lang = stored === "de" || stored === "en"
    ? stored
    : (navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
  applyStatic();
  collectAll();
})();
