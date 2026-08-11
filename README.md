# 🛡️ SENTRIX — Case Study

## 📝 Opis
Rozbudowana strona typu **case study / portfolio**, prezentująca wizualizację fikcyjnego projektu systemu AI do wykrywania zagrożeń i anomalii w ruchu sieciowym firmy w czasie rzeczywistym. Strona ma formę "raportu incydentu" podzielonego na sekcje (Problem, Podejście, Architektura, Wynik), z konsekwentnym motywem cyberbezpieczeństwa w warstwie wizualnej i treściowej. 

W sekcji hero znajduje się **interaktywna wizualizacja sieci w Three.js** (canvas z węzłami i połączeniami) wraz z nakładką **HUD** (liczba aktywnych węzłów, poziom zagrożenia, przepustowość, czas działania) oraz symulowanym **terminalem logów zdarzeń**, aktualizowanym na żywo. Dodano przycisk **"Symuluj atak"**, który w czasie rzeczywistym zmienia poziom zagrożenia w HUD-zie i generuje nowe wpisy w logu terminala. 

Dodatkowo zaimplementowano:
- animowane liczniki statystyk uruchamiane w viewport (Intersection Observer)
- płynne animacje pojawiania się elementów przy scrollu (`data-reveal` z konfigurowalnym kierunkiem i opóźnieniem)
- sekcję ze stosem technologicznym projektu

Strona zoptymalizowana pod dostępność (`prefers-reduced-motion`) oraz urządzenia mobilne.

## 🔗 Demo
👉 [Zobacz stronę na żywo](https://migacz-dawid.github.io/sentrix-case-study-threejs/)

## 💻 Technologie
- HTML5
- SASS/SCSS (custom properties, animacje, `prefers-reduced-motion`)
- JavaScript (vanilla JS)
- Three.js — interaktywna wizualizacja sieci na canvasieo

## 🎨 Design
- Paleta: stonowana, ciemna, typowa dla narzędzi security/monitoring
- Typografia: Inter, JetBrains Mono (Google Fonts)

## 📂 Uruchomienie projektu
1. **Sklonuj repozytorium**  
   ```bash
   git clone https://github.com/migacz-dawid/sentrix-case-study-threejs
   ```
2. **Przejdź do katalogu projektu**  
   ```bash
   cd sentrix-case-study-threejs
   ```
3. **Otwórz plik `index.html` w przeglądarce**  
   Projekt korzysta z modułów Three.js, dlatego wymaga uruchomienia przez lokalny serwer (np. rozszerzenie **Live Server** w VS Code) — bezpośrednie otwarcie pliku przez `file://` nie zadziała poprawnie ze względu na ograniczenia CORS.
