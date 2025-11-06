# Instrukcje wdrożenia zasad Firebase Storage

## Problem
Galeria obrazków i podpowiedzi z obrazkami nie działają z powodu błędu uprawnień Firebase Storage (403 Forbidden).

## Rozwiązanie

Aby naprawić ten problem, musisz wdrożyć zasady Firebase Storage do swojego projektu Firebase.

### Krok 1: Zaloguj się do Firebase CLI

```bash
firebase login
```

Postępuj zgodnie z instrukcjami w przeglądarce, aby zalogować się do swojego konta Google/Firebase.

### Krok 2: Wdróż zasady Storage

```bash
firebase deploy --only storage
```

Ta komenda wdroży plik `storage.rules` do twojego projektu Firebase.

### Alternatywnie: Ustaw zasady ręcznie w konsoli Firebase

Jeśli nie możesz użyć Firebase CLI, możesz ustawić zasady ręcznie:

1. Przejdź do [Firebase Console](https://console.firebase.google.com/)
2. Wybierz swój projekt: **krysztalkowo-561e4**
3. W menu bocznym kliknij **Storage**
4. Kliknij zakładkę **Rules**
5. Skopiuj i wklej następujące zasady:

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    match /images/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

6. Kliknij **Publish** (Publikuj)

## Weryfikacja

Po wdrożeniu zasad:
1. Odśwież aplikację w przeglądarce
2. Spróbuj otworzyć galerię obrazków
3. Spróbuj edytować kategorię i zobaczyć podpowiedzi obrazków

Obrazki powinny się teraz poprawnie ładować!

## Notatki

- Zasady pozwalają każdemu zalogowanemu użytkownikowi na odczyt i zapis **tylko swoich własnych plików** w folderze `images/{userId}/`
- To zapewnia bezpieczeństwo - użytkownicy nie mogą zobaczyć ani modyfikować plików innych użytkowników
- Niezalogowani użytkownicy nie mają dostępu do żadnych plików
