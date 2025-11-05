# 💎 Krysztalkowo

Aplikacja mobilna do motywowania dzieci poprzez system nagród oparty na zbieraniu kryształków.

## 📋 Spis treści

- [Opis](#opis)
- [Główne funkcje](#główne-funkcje)
- [System nagród](#system-nagród)
- [Panel administracyjny](#panel-administracyjny)
- [Technologie](#technologie)
- [Licencja](#licencja)

## 🎯 Opis

Krysztalkowo to aplikacja webowa przeznaczona dla rodziców, którzy chcą motywować swoje dzieci do wykonywania codziennych zadań. Dzieci zbierają kryształki za realizację kategorii (np. posprzątanie pokoju, zjedzenie warzyw), a po zgromadzeniu odpowiedniej liczby otrzymują losową nagrodę o różnych poziomach rzadkości.

## ✨ Główne funkcje

### 👶 Zarządzanie profilami dzieci

- **Wiele profili**: Dodawanie nieograniczonej liczby profili dzieci
- **Personalizacja**: Każde dziecko ma własny awatar, imię i płeć
- **Osobne profile**: Każde dziecko ma własne kategorie, nagrody i postępy
- **Auto-wybór**: Automatyczny wybór ostatnio używanego profilu po załadowaniu aplikacji
- **Szybkie przełączanie**: Natychmiastowa zmiana między profilami dzieci

### 🎨 System kategorii

- **Wielokolorowe karty**: Każda kategoria ma unikalny gradient kolorów
- **Obrazki**: Możliwość przypisania obrazków do kategorii (własne lub domyślne)
- **Podpowiedzi**: System sugeruje kategorie z innych profili dzieci
- **Sugestie obrazków**: Wyświetlanie obrazków używanych przez inne profile
- **Licznik kryształków**: Wizualizacja postępu (X / Y kryształków)
- **Cooldown**: 30-sekundowe opóźnienie między dodawaniem kryształków
- **Pulsujący kryształek**: Następny dostępny kryształek pulsuje podczas cooldownu
- **Interakcja dotykowa**: Przytrzymanie karty przez 1 sekundę dodaje kryształek
- **Opóźnienie mobile**: 500ms opóźnienie przed rozpoczęciem trzymania (zapobiega przypadkowym dodaniom podczas scrollowania)
- **Blokada menu kontekstowego**: Zablokowane menu na długie przytrzymanie podczas dodawania kryształków

### 🎁 System nagród

#### Rzadkości nagród

System wykorzystuje 5 poziomów rzadkości z różnymi kolorami i efektami:

- **Pospolita** (Common) - Szary - prawdopodobieństwo ≥15%
- **Nieczęsta** (Uncommon) - Zielony - prawdopodobieństwo 5-14.99%
- **Rzadka** (Rare) - Niebieski - prawdopodobieństwo 2-4.99%
- **Epicka** (Epic) - Złoty - prawdopodobieństwo 1-1.99%
- **Legendarna** (Legendary) - Fioletowy z tęczową animacją - prawdopodobieństwo <1%

#### Losowanie nagród

- **Animowane skrzynki**: System 3 losowych skrzynek z animacją otwierania
- **Efekty wizualne**: Konfetti, wibracje i animacje przy wygranej
- **Przywracanie modalu**: Jeśli użytkownik odświeży stronę podczas losowania, modal się przywraca
- **Czytelność**: Tekst dostosowany do koloru rzadkości (ciemny na jasłym tle, jasny na ciemnym)

#### Obsługa wylosowanych nagród

- **Natychmiastowa realizacja**: Możliwość oznaczenia nagrody jako zrealizowanej od razu
- **Lista zaległych**: Zapisywanie nagród do późniejszej realizacji
- **Weryfikacja hasłem**: Realizacja zaległych nagród wymaga podania hasła głównego
- **Reset karty**: Możliwość zresetowania kategorii po wylosowaniu nagrody (przytrzymanie karty)

### 🏆 System rankingu

- **Wyświetlanie zwycięstw**: Licznik wygranych dla każdej kategorii
- **Kategorie rywalizacyjne**: Osobna sekcja dla kategorii, w których rywalizuje więcej niż jedno dziecko
- **Kategorie solo**: Osobna sekcja dla kategorii przypisanych tylko do jednego dziecka
- **Ogólne prowadzenie**: Widżet pokazujący, kto ma więcej wygranych łącznie
- **Wykrywanie remisów**: Automatyczne wykrywanie i oznaczanie remisów
- **Kolory**: Personalizowane kolory według płci dziecka (niebieski/różowy)
- **Korona**: Kategorie z 3+ wygranych otrzymują pulsującą koronę

### ⚙️ Panel administracyjny

#### Zarządzanie dziećmi

- **Dodawanie profili**: Tworzenie nowych profili dzieci
- **Edycja profili**: Zmiana imienia, płci i awatara
- **Usuwanie profili**: Możliwość usunięcia profilu z weryfikacją hasłem

#### Zarządzanie kategoriami

- **Tworzenie kategorii**: Dodawanie nowych kategorii z nazwą, celem i obrazkiem
- **Edycja kategorii**: Modyfikacja istniejących kategorii
  - Nazwa kategorii
  - Cel (liczba kryształków do zebrania)
  - Obrazek (wybór z domyślnych lub od innych dzieci)
  - Aktualna liczba kryształków
- **Usuwanie kategorii**: Możliwość usunięcia kategorii
- **Podpowiedzi**: Automatyczne sugestie kategorii z innych profili dzieci
- **Duże pola**: Ulepszone UI z większymi polami i czcionkami

#### Zarządzanie nagrodami

- **Dodawanie nagród**: Tworzenie nagród z nazwą i prawdopodobieństwem
- **Edycja nagród**: Modyfikacja istniejących nagród
- **Usuwanie nagród**: Możliwość usunięcia nagrody
- **Prawdopodobieństwo**: Ustawianie szansy wylosowania (obsługa wartości dziesiętnych)
- **Automatyczna rzadkość**: System sam przypisuje rzadkość na podstawie prawdopodobieństwa
- **Podpowiedzi**: Automatyczne sugestie nagród z innych profili dzieci
- **Weryfikacja**: Ostrzeżenia przy zapisywaniu jeśli suma prawdopodobieństw ≠ 100%

#### Zaległe nagrody

- **Lista oczekujących**: Wyświetlanie wszystkich nagród zapisanych do realizacji później
- **Sortowanie**: Nagrody posortowane według daty dodania
- **Informacje**: Każda nagroda pokazuje dziecko, kategorię, nazwę i datę
- **Realizacja**: Przycisk do oznaczenia nagrody jako zrealizowanej
- **Weryfikacja hasłem**: Wymóg podania hasła przed realizacją nagrody
- **Modal sukcesu**: Estetyczny komunikat o pomyślnej realizacji

#### Reset rankingu

- **Resetowanie wszystkich statystyk**: Możliwość wyzerowania wszystkich zwycięstw
- **Weryfikacja hasłem**: Wymóg podania hasła głównego aplikacji
- **Ostrzeżenie**: Wyraźny komunikat, że operacji nie można cofnąć
- **Modal potwierdzenia**: Estetyczny komunikat sukcesu zamiast alert

### 🔐 System autoryzacji

- **Firebase Authentication**: Bezpieczna autentykacja użytkowników
- **Email + hasło**: Rejestracja i logowanie przez email
- **Weryfikacja działań**: Wybrane operacje (reset rankingu, realizacja nagród, usuwanie dzieci) wymagają ponownego podania hasła
- **Sesja**: Automatyczne utrzymywanie sesji zalogowanego użytkownika

### 📱 Optymalizacja mobile

- **Responsywny design**: Interfejs dostosowany do ekranów mobilnych
- **Touch events**: Obsługa gestów dotykowych
- **Opóźnienie przed dodaniem**: 500ms delay zapobiega przypadkowemu dodaniu podczas scrollowania
- **Detekcja scrollowania**: Automatyczne anulowanie akcji gdy wykryje scroll
- **Wibracje**: Haptyczne potwierdzenia akcji
- **Blokada menu**: Zablokowanie menu kontekstowego podczas interakcji

### 🎨 Efekty wizualne

- **Gradientowe tła**: Różne tła dla profili chłopców i dziewczynek
- **Animacje**: Płynne przejścia i animacje (pulsowanie korony, efekt wypełnienia)
- **Konfetti**: Eksplozja konfetti przy wygranej
- **Loader profilu**: Animowany loader podczas przełączania profili
- **Pulsujące przyciski**: Wskazówki dla nowych użytkowników
- **Tęczowa ramka**: Specjalny efekt dla nagród legendarnych
- **Czytelność**: Automatyczne dostosowanie koloru tekstu do tła

### 💾 Przechowywanie danych

- **Firebase Realtime Database**: Synchronizacja danych w czasie rzeczywistym
- **Cache lokalny**: Przechowywanie danych w pamięci dla szybkiego dostępu
- **Auto-zapis**: Automatyczne zapisywanie wszystkich zmian
- **Preloadowanie obrazków**: Cache obrazków dla lepszej wydajności
- **localStorage**: Zapamiętywanie ostatnio wybranego dziecka

### 🎯 Wskazówki i UX

- **Empty state guide**: Wskazówki dla nowych użytkowników bez dzieci/kategorii
- **Pulsujące przyciski**: Podpowiedzi kierujące do panelu admina
- **Wizualne strzałki**: Graficzne wskazówki gdzie kliknąć
- **Komunikaty modalne**: Estetyczne komunikaty sukcesu/błędu
- **Ikony**: Intuicyjne ikony emoji dla lepszej czytelności

## 🛠️ Technologie

- **Frontend**: HTML5, CSS3, JavaScript (ES6+ modules)
- **Backend**: Firebase Realtime Database
- **Autoryzacja**: Firebase Authentication
- **Hosting**: Firebase Hosting
- **Animacje**: CSS Keyframes, Canvas Confetti
- **Ikony**: Emoji (natywne)
- **Design**: Custom CSS z gradientami i animacjami

## 📂 Struktura projektu

```
krysztalkowo/
├── index.html              # Główny plik HTML
├── js/
│   ├── main.js            # Inicjalizacja aplikacji
│   ├── auth.js            # Autentykacja Firebase
│   ├── database.js        # Operacje na bazie danych
│   ├── state.js           # Zarządzanie stanem aplikacji
│   ├── ui.js              # Renderowanie interfejsu
│   ├── rewards.js         # System nagród i losowania
│   └── admin.js           # Panel administracyjny
├── styles/
│   ├── main.css           # Główne style
│   ├── modals.css         # Style modali
│   ├── categories.css     # Style kart kategorii
│   ├── admin.css          # Style panelu admina
│   ├── ranking.css        # Style rankingu
│   └── animations.css     # Animacje
└── images/                # Domyślne obrazki kategorii
```

## 🎮 Jak używać

1. **Pierwsze uruchomienie**: Zaloguj się lub zarejestruj
2. **Dodaj dziecko**: Wejdź do panelu admina i utwórz profil dziecka
3. **Dodaj kategorie**: Stwórz kategorie zadań (np. "Posprzątaj pokój")
4. **Dodaj nagrody**: Przypisz nagrody z prawdopodobieństwami
5. **Zbieraj kryształki**: Przytrzymaj kartę kategorii, aby dodać kryształek
6. **Losuj nagrody**: Po zebraniu wszystkich kryształków otwórz skrzynki
7. **Śledź postępy**: Sprawdzaj ranking, aby zobaczyć kto prowadzi

## 📊 System prawdopodobieństw

Prawdopodobieństwa wszystkich nagród w kategorii powinny sumować się do 100%.
System automatycznie przypisuje rzadkość na podstawie wartości:

- ≥ 15% → Pospolita (szary)
- 5-14.99% → Nieczęsta (zielony)
- 2-4.99% → Rzadka (niebieski)
- 1-1.99% → Epicka (złoty)
- < 1% → Legendarna (fioletowy + tęcza)

System obsługuje wartości dziesiętne (np. 0.5% dla bardzo rzadkich nagród).

## 🔒 Bezpieczeństwo

- Wszystkie wrażliwe operacje wymagają weryfikacji hasłem
- Dane przechowywane w zabezpieczonej bazie Firebase
- Autentykacja przez Firebase Authentication
- Sesje użytkowników zarządzane automatycznie
- Walidacja danych po stronie klienta i serwera

## 📱 Wymagania

- Przeglądarka z obsługą ES6+ (Chrome, Firefox, Safari, Edge)
- Połączenie z internetem (aplikacja wymaga Firebase)
- Zalecane: urządzenie z ekranem dotykowym dla pełnego doświadczenia

## 📄 Licencja

Wszystkie prawa zastrzeżone. Zobacz plik [LICENSE](LICENSE) dla szczegółów.

Żadna część tego oprogramowania nie może być kopiowana, modyfikowana, dystrybuowana ani wykorzystywana w jakikolwiek sposób bez pisemnej zgody właściciela.

---

**Krysztalkowo** - Motywuj swoje dzieci w zabawny sposób! 💎✨
