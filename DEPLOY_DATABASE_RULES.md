# Instrukcja wdrożenia poprawionych reguł Firebase

## Problemy
1. Reguły Firebase blokowały usuwanie dzieci
2. Brak reguł dla `pendingRewards` - błąd PERMISSION_DENIED

## Rozwiązania

### 1. Poprawiono regułę dla usuwania dzieci
Reguła w `database.rules.json:7` blokowała usuwanie, ponieważ przy operacji `remove()` warunek `newData.child('userId').val() === auth.uid` zawsze zwracał `false`.

**Przed:**
```json
".write": "auth != null && (!data.exists() || data.child('userId').val() === auth.uid) && newData.child('userId').val() === auth.uid"
```

**Po:**
```json
".write": "auth != null && (!data.exists() || data.child('userId').val() === auth.uid) && (!newData.exists() || newData.child('userId').val() === auth.uid)"
```

Nowa reguła pozwala na:
- **Tworzenie**: Tylko gdy `newData.userId === auth.uid`
- **Usuwanie**: Tylko gdy `data.userId === auth.uid` (nie wymaga już `newData`)
- **Aktualizacja**: Tylko gdy `data.userId === auth.uid` i `newData.userId === auth.uid`

### 2. Dodano reguły dla pendingRewards
Dodano nową sekcję w `database.rules.json` dla zaległych nagród:

```json
"pendingRewards": {
  ".read": "auth != null",
  "$rewardId": {
    ".write": "auth != null && (!data.exists() || data.child('userId').val() === auth.uid) && (!newData.exists() || newData.child('userId').val() === auth.uid)",
    ".validate": "newData.hasChildren(['childId', 'categoryId', 'userId']) && newData.child('userId').val() === auth.uid"
  }
}
```

Reguły zapewniają:
- **Odczyt**: Wszyscy zalogowani użytkownicy (filtrowanie po stronie klienta)
- **Zapis**: Tylko właściciel nagrody (na podstawie `userId`)
- **Walidacja**: Wymagane pola `childId`, `categoryId`, `userId` i zgodność `userId` z `auth.uid`

## Wdrożenie

### Krok 1: Zaloguj się do Firebase CLI
```bash
firebase login
```

### Krok 2: Wdróż reguły bazy danych
```bash
firebase deploy --only database
```

### Krok 3: Zweryfikuj wdrożenie
Po wdrożeniu sprawdź w konsoli Firebase czy reguły zostały zaktualizowane:
- Otwórz https://console.firebase.google.com
- Wybierz projekt
- Przejdź do Realtime Database > Rules
- Zweryfikuj, że reguła `.write` dla `$childId` zawiera nowy warunek

### Alternatywnie: Ręczne wdrożenie przez konsolę
Jeśli nie masz dostępu do Firebase CLI:
1. Otwórz https://console.firebase.google.com
2. Wybierz projekt
3. Przejdź do Realtime Database > Rules
4. Skopiuj całą zawartość z pliku `database.rules.json`
5. Kliknij "Publish"

## Testowanie
Po wdrożeniu przetestuj usuwanie dziecka:
1. Zaloguj się na swoje konto
2. Dodaj dziecko
3. Usuń dziecko
4. Sprawdź w konsoli przeglądarki - nie powinno być błędu `PERMISSION_DENIED`
