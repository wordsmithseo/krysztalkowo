# 📧 Setup Aktywacji Email w Kryształkowo

System aktywacji email wymaga konfiguracji SendGrid i własnej domeny email.

## 🔧 Krok 1: Konfiguracja SendGrid

1. **Załóż konto SendGrid:**
   - Wejdź na https://sendgrid.com
   - Załóż darmowe konto (100 emaili dziennie) lub płatne
   - Zweryfikuj swój email

2. **Wygeneruj API Key:**
   - W panelu SendGrid: Settings → API Keys
   - Kliknij "Create API Key"
   - Nazwa: `Krysztalkowo Production`
   - Uprawnienia: Full Access
   - **SKOPIUJ KLUCZ** (pokaże się tylko raz!)

3. **Zweryfikuj domenę krysztalkowo.pl:**
   - W SendGrid: Settings → Sender Authentication → Verify a Domain
   - Wpisz: `krysztalkowo.pl`
   - SendGrid poda rekordy DNS (CNAME, TXT)
   - Dodaj te rekordy w panelu domeny

## 🚀 Krok 2: Wdróż Firebase Functions

### Instalacja zależności

```bash
cd functions
npm install
```

### Konfiguracja API Key w Firebase

```bash
# Ustaw SendGrid API Key w Firebase Config
firebase functions:config:set sendgrid.api_key="TU_WKLEJ_API_KEY_Z_SENDGRID"

# Sprawdź konfigurację
firebase functions:config:get
```

### Deploy Functions do Firebase

```bash
# Deploy wszystkich functions
firebase deploy --only functions

# LUB deploy konkretnej funkcji
firebase deploy --only functions:sendActivationEmail
firebase deploy --only functions:verifyActivationCode
firebase deploy --only functions:cleanupExpiredCodes
```

## 📝 Krok 3: Zmień adres nadawcy (opcjonalnie)

Jeśli chcesz używać innego emaila niż `noreply@krysztalkowo.pl`:

1. Otwórz: `functions/index.js`
2. Znajdź linię:
   ```javascript
   from: {
     email: 'noreply@krysztalkowo.pl',
     name: 'Kryształkowo'
   }
   ```
3. Zmień na swój adres (np. `kontakt@krysztalkowo.pl`)
4. Zapisz i deploy ponownie

## ✅ Krok 4: Testowanie

### Test lokalny (emulator)

```bash
firebase emulators:start
```

### Test produkcyjny

1. Wejdź na stronę: https://krysztalkowo.pl
2. Kliknij "Zarejestruj się"
3. Wypełnij formularz
4. Sprawdź email (może trafić do SPAM!)
5. Wprowadź kod aktywacyjny

## 🔍 Monitorowanie

### Logi Functions

```bash
# Wszystkie logi
firebase functions:log

# Tylko ostatnie
firebase functions:log --limit 50

# W czasie rzeczywistym
firebase functions:log --follow
```

### Sprawdzanie statusu

W Firebase Console:
- Functions → Dashboard
- Zobacz wywołania, błędy, czas wykonania

## 🛠️ Troubleshooting

### Problem: "SendGrid API key nie jest skonfigurowany"

**Rozwiązanie:**
```bash
firebase functions:config:set sendgrid.api_key="YOUR_KEY"
firebase deploy --only functions
```

### Problem: Email nie dostarczony

**Sprawdź:**
1. Czy domena jest zweryfikowana w SendGrid?
2. Czy email nie trafił do SPAM?
3. Logi: `firebase functions:log`
4. SendGrid Activity Feed: https://app.sendgrid.com/email_activity

### Problem: "Domain not verified"

**Rozwiązanie:**
1. SendGrid → Settings → Sender Authentication
2. Sprawdź status domeny
3. Zweryfikuj rekordy DNS w panelu domeny
4. Poczekaj do 48h na propagację DNS

## 💰 Koszty

### SendGrid
- **Free Plan:** 100 emaili/dzień, bez limitu czasu
- **Essentials:** $19.95/miesiąc, 50,000 emaili
- **Pro:** Od $89.95/miesiąc

### Firebase Functions
- **Free (Spark):** 2M wywołań/miesiąc
- **Blaze (pay-as-you-go):** $0.40 za milion wywołań
- Pierwszy milion = free

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
- ✅ SendGrid API Key chroniony przez Firebase Config
- ✅ HTTPS wymagane dla wszystkich połączeń

## 📞 Wsparcie

Jeśli masz problemy:
1. Sprawdź logi: `firebase functions:log`
2. Sprawdź SendGrid Activity Feed
3. Sprawdź status domeny w SendGrid
4. Skontaktuj się z supportem SendGrid

## 🎉 Gotowe!

Po poprawnej konfiguracji:
- Nowi użytkownicy dostaną email z kodem
- Kody są automatycznie czyszczone
- System jest skalowalny i bezpieczny

---

**Ostatnia aktualizacja:** 2025-01-12
