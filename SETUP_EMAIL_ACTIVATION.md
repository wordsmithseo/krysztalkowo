# 📧 Setup Aktywacji Email w Kryształkowo (Gmail SMTP)

System aktywacji email używa **Gmail SMTP** przez nodemailer - **całkowicie DARMOWE**, bez dodatkowych usług!

## 🆓 Dlaczego Gmail?

- ✅ **Całkowicie darmowe** - nie musisz płacić za dodatkowe usługi
- ✅ **500 emaili dziennie** - wystarczy dla większości aplikacji
- ✅ **Proste w konfiguracji** - tylko hasło aplikacji Gmail
- ✅ **Niezawodne** - infrastruktura Google

## 🔧 Krok 1: Przygotowanie konta Gmail

### 1.1. Załóż lub użyj istniejącego konta Gmail

Możesz użyć:
- Swojego prywatnego konta Gmail
- **Rekomendowane:** Stwórz nowe konto dedykowane dla aplikacji (np. `krysztalkowo.app@gmail.com`)

### 1.2. Włącz weryfikację dwuetapową (2FA)

1. Wejdź na: https://myaccount.google.com/security
2. Znajdź **"Weryfikacja dwuetapowa"**
3. Kliknij **"Włącz"** i postępuj zgodnie z instrukcjami
4. Użyj telefonu do weryfikacji

### 1.3. Wygeneruj hasło aplikacji

1. Wejdź na: https://myaccount.google.com/apppasswords
   - Lub: Google Account → Zabezpieczenia → Hasła aplikacji
2. Kliknij **"Wybierz aplikację"** → **"Inna (nazwa niestandardowa)"**
3. Wpisz: `Krysztalkowo`
4. Kliknij **"Generuj"**
5. **SKOPIUJ 16-ZNAKOWE HASŁO** (np. `abcd efgh ijkl mnop`)
   - Pokaże się tylko raz!
   - Zapisz w bezpiecznym miejscu

## 🚀 Krok 2: Wdróż Firebase Functions

### 2.1. Instalacja zależności

```bash
cd functions
npm install
```

### 2.2. Konfiguracja Gmail w Firebase

```bash
# Ustaw email Gmail i hasło aplikacji
firebase functions:config:set \
  gmail.email="twoj-email@gmail.com" \
  gmail.password="abcd efgh ijkl mnop"

# UWAGA: Wklej hasło aplikacji DOKŁADNIE jak wygenerowało Google (ze spacjami!)

# Sprawdź konfigurację
firebase functions:config:get
```

Powinieneś zobaczyć:
```json
{
  "gmail": {
    "email": "twoj-email@gmail.com",
    "password": "abcd efgh ijkl mnop"
  }
}
```

### 2.3. Deploy Functions do Firebase

```bash
# Deploy wszystkich functions
firebase deploy --only functions

# LUB deploy konkretnej funkcji
firebase deploy --only functions:sendActivationEmail
firebase deploy --only functions:verifyActivationCode
firebase deploy --only functions:cleanupExpiredCodes
```

Powinieneś zobaczyć:
```
✔ functions[sendActivationEmail(us-central1)] Successful create operation.
✔ functions[verifyActivationCode(us-central1)] Successful create operation.
✔ functions[cleanupExpiredCodes(us-central1)] Successful create operation.
```

## ✅ Krok 3: Testowanie

### Test lokalny (emulator)

```bash
# Skopiuj config do .runtimeconfig.json dla emulatora
firebase functions:config:get > functions/.runtimeconfig.json

# Uruchom emulator
firebase emulators:start --only functions
```

### Test produkcyjny

1. Wejdź na stronę: https://krysztalkowo.pl
2. Kliknij **"Zarejestruj się"**
3. Wypełnij formularz (imię, email, hasło)
4. Email powinien przyjść w **kilka sekund**
5. Sprawdź:
   - Skrzynkę odbiorczą
   - Folder SPAM (pierwszy raz może trafić tam)
6. Skopiuj **5-cyfrowy kod**
7. Wprowadź kod w aplikacji

## 🔍 Monitorowanie

### Logi Functions

```bash
# Wszystkie logi
firebase functions:log

# Tylko ostatnie 50
firebase functions:log --limit 50

# W czasie rzeczywistym
firebase functions:log --follow
```

### Sprawdzanie statusu

W **Firebase Console**:
1. Wejdź na: https://console.firebase.google.com
2. Wybierz projekt: **krysztalkowo-561e4**
3. Functions → Dashboard
4. Zobacz:
   - Liczba wywołań
   - Błędy
   - Czas wykonania
   - Koszty

## 🛠️ Troubleshooting

### Problem: "Gmail credentials nie są skonfigurowane"

**Rozwiązanie:**
```bash
# Sprawdź czy config jest ustawiony
firebase functions:config:get

# Jeśli pusty, ustaw ponownie
firebase functions:config:set \
  gmail.email="twoj@gmail.com" \
  gmail.password="haslo-aplikacji"

# Deploy ponownie
firebase deploy --only functions
```

### Problem: Email nie dostarczony

**Sprawdź:**
1. **Folder SPAM** - pierwsze emaile mogą tam trafić
2. **Hasło aplikacji** - czy jest poprawne (16 znaków)?
3. **Weryfikacja dwuetapowa** - czy jest włączona?
4. **Logi:**
   ```bash
   firebase functions:log --limit 10
   ```
5. **Quota Gmail:**
   - Limit: 500 emaili/dzień
   - Sprawdź: https://myaccount.google.com/

### Problem: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Przyczyny:**
1. **Hasło aplikacji niepoprawne** - wygeneruj nowe
2. **Weryfikacja dwuetapowa wyłączona** - włącz ją
3. **Less secure apps** - NIE UŻYWAJ tego, użyj hasła aplikacji!

**Rozwiązanie:**
```bash
# Wygeneruj NOWE hasło aplikacji
# Krok 1: https://myaccount.google.com/apppasswords
# Krok 2: Wygeneruj nowe hasło

# Ustaw nowe hasło w Firebase
firebase functions:config:set gmail.password="NOWE-HASLO"

# Deploy
firebase deploy --only functions
```

### Problem: "Error: Greeting never received"

**Rozwiązanie:**
1. Sprawdź połączenie internetowe Firebase Functions
2. Sprawdź czy Gmail nie blokuje połączeń
3. Poczekaj 5 minut i spróbuj ponownie

### Problem: Kody wygasają za szybko

**Zmiana czasu wygaśnięcia:**

W pliku `functions/index.js` linia 56:
```javascript
// Zmień 15 na inną liczbę minut (np. 30)
const expiresAt = Date.now() + (15 * 60 * 1000);
```

Zapisz i deploy:
```bash
firebase deploy --only functions:sendActivationEmail
```

## 💰 Koszty

### Gmail SMTP
- **FREE:** 500 emaili/dzień
- **FREE:** Bez limitu czasu
- **FREE:** Bez płatnych planów

### Firebase Functions
- **Spark (Free):** 2M wywołań/miesiąc
- **Blaze (Pay-as-you-go):**
  - Wywołania: $0.40 za milion
  - Pierwszy milion: FREE

**Szacunkowe koszty:**
- **1000 użytkowników/miesiąc:** $0 (w limicie free)
- **10,000 użytkowników/miesiąc:** ~$2-3
- **100,000 użytkowników/miesiąc:** ~$20-30

## 📊 Struktura Bazy Danych

Kody aktywacyjne przechowywane są w:
```
activationCodes/
  {email_z_kropkami_zamienionymi_na_podkreslniki}/
    code: "12345"
    email: "user@example.com"
    name: "Jan Kowalski"
    createdAt: 1234567890
    expiresAt: 1234568790  // +15 minut
    used: false
    usedAt: null  // timestamp gdy użyty
```

Wygasłe kody są automatycznie czyszczone co 24h przez funkcję `cleanupExpiredCodes`.

## 🔐 Bezpieczeństwo

- ✅ Kody wygasają po 15 minutach
- ✅ Kod można użyć tylko raz
- ✅ Email walidowany po stronie klienta i serwera
- ✅ Hasło aplikacji chronione przez Firebase Config
- ✅ HTTPS wymagane dla wszystkich połączeń
- ✅ Nie przechowujemy hasła aplikacji w kodzie
- ✅ Rate limiting Gmail (500/dzień) zapobiega spamowi

## ⚡ Optymalizacja

### Przyspiesz wysyłkę email

Jeśli emaile przychodzą za wolno, możesz:
1. Użyć lepszego planu Firebase (Blaze)
2. Zmienić region Functions na bliższy użytkownikom
3. Cache transporter nodemailer (obecnie tworzy nowy za każdym razem)

### Cache transporter (opcjonalne)

W `functions/index.js` dodaj na górze:
```javascript
let cachedTransporter = null;

function createEmailTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // ... reszta kodu ...

  cachedTransporter = transporter;
  return transporter;
}
```

## 📞 Limity Gmail

| Limit | Wartość |
|-------|---------|
| Emaili/dzień | 500 |
| Rozmiar załącznika | 25 MB |
| Odbiorców na email | 100 |
| Długość Subject | 998 znaków |

Jeśli przekroczysz limity:
- Gmail zablokuje wysyłkę na 24h
- Dostaniesz error: "Daily sending quota exceeded"
- Rozwiązanie: Poczekaj 24h lub użyj innego konta

## 🎉 Gotowe!

Po poprawnej konfiguracji:
- ✅ Nowi użytkownicy dostaną email z kodem w kilka sekund
- ✅ Kody są automatycznie czyszczone co 24h
- ✅ System jest darmowy i skalowalny do 500 emaili/dzień
- ✅ Nie potrzebujesz żadnych dodatkowych usług poza Firebase

## 🔄 Aktualizacja

Jeśli chcesz zmienić email nadawcy:

```bash
# Ustaw nowy email
firebase functions:config:set gmail.email="nowy@gmail.com" gmail.password="nowe-haslo"

# Deploy
firebase deploy --only functions
```

## 🆘 Wsparcie

Jeśli masz problemy:

1. **Sprawdź logi:**
   ```bash
   firebase functions:log --limit 20
   ```

2. **Sprawdź config:**
   ```bash
   firebase functions:config:get
   ```

3. **Sprawdź quota Gmail:**
   https://myaccount.google.com/

4. **Firebase Console:**
   https://console.firebase.google.com → Functions → Logs

5. **Stack Overflow:**
   - Tag: `firebase-functions`
   - Tag: `nodemailer`

---

**Ostatnia aktualizacja:** 2025-01-12
**Wersja:** 2.0 (Gmail SMTP)
