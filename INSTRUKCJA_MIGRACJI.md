# 🔥 Instrukcja migracji danych - napraw błąd "Permission denied"

## Problem
Otrzymujesz błąd `Permission denied` ponieważ nowe reguły bezpieczeństwa nie zostały wdrożone do Firebase.

## ✅ ROZWIĄZANIE - Wdróż tymczasowe reguły przez konsolę Firebase

### Krok 1: Otwórz konsolę Firebase
1. Wejdź na: https://console.firebase.google.com/
2. Wybierz projekt: **krysztalkowo-561e4**
3. W menu po lewej kliknij **Realtime Database**
4. Przejdź do zakładki **Rules** (Reguły)

### Krok 2: Wdróż tymczasowe reguły (na czas migracji)

**Skopiuj i wklej te reguły:**

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**Te reguły pozwalają zalogowanym użytkownikom na dostęp do wszystkich danych - TYLKO TYMCZASOWO do migracji!**

### Krok 3: Opublikuj reguły
1. Kliknij przycisk **Publish** (Opublikuj)
2. Poczekaj na potwierdzenie

### Krok 4: Uruchom migrację danych
1. Wróć do aplikacji Kryształkowo
2. **Odśwież stronę** (F5 lub Ctrl+R)
3. Zaloguj się
4. Wejdź w **Panel administracyjny** (⚙️)
5. Przewiń do sekcji **"🔧 Migracja danych"**
6. Kliknij **"🔄 Uruchom migrację danych"**
7. Potwierdź w oknie dialogowym
8. Poczekaj na komunikat sukcesu
9. **Odśwież stronę ponownie**

### Krok 5: Wdróż finalne bezpieczne reguły

**Po udanej migracji**, wróć do konsoli Firebase i wklej te bezpieczne reguły:

```json
{
  "rules": {
    "children": {
      "$childId": {
        ".read": "auth != null && data.child('userId').val() === auth.uid",
        ".write": "auth != null && (!data.exists() || data.child('userId').val() === auth.uid) && newData.child('userId').val() === auth.uid",
        ".validate": "newData.hasChildren(['name', 'userId']) && newData.child('userId').val() === auth.uid"
      }
    },
    "users": {
      "$childId": {
        ".read": "auth != null && root.child('children').child($childId).child('userId').val() === auth.uid",
        ".write": "auth != null && root.child('children').child($childId).child('userId').val() === auth.uid",
        "categories": {
          "$categoryId": {
            ".validate": "newData.hasChildren(['name'])"
          }
        },
        "rewards": {
          "$rewardId": {
            ".validate": "newData.hasChildren(['name'])"
          }
        }
      }
    },
    "userProfiles": {
      "$userId": {
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null && auth.uid === $userId"
      }
    }
  }
}
```

### Krok 6: Opublikuj finalne reguły
1. Kliknij **Publish**
2. Gotowe! Twoje dane są teraz bezpiecznie odizolowane.

---

## 🎯 Szybka ścieżka (jeśli masz już Firebase CLI)

Jeśli masz zainstalowane Firebase CLI:

```bash
# 1. Zainstaluj Firebase CLI (jeśli nie masz)
npm install -g firebase-tools

# 2. Zaloguj się
firebase login

# 3. Wdróż reguły
firebase deploy --only database
```

---

## ❓ Pytania?

Jeśli masz problemy:
1. Sprawdź czy jesteś zalogowany w Firebase Console
2. Sprawdź czy wybrałeś właściwy projekt
3. Sprawdź logi w konsoli przeglądarki (F12)
4. Upewnij się, że kliknąłeś "Publish" po wklejeniu reguł

---

## 📝 Podsumowanie

**Kolejność działań:**
1. ✅ Wdróż tymczasowe reguły (otwarte)
2. ✅ Uruchom migrację danych w aplikacji
3. ✅ Wdróż finalne reguły (bezpieczne, z izolacją)

Po wykonaniu tych kroków będziesz mógł:
- ✅ Widzieć swoje dzieci, kategorie i nagrody
- ✅ Rejestrować nowych użytkowników
- ✅ Mieć pełną izolację między kontami
