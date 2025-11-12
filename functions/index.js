/**
 * Firebase Cloud Functions dla Kryształkowo
 * Obsługa wysyłki emaili aktywacyjnych przez Gmail SMTP
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

/**
 * Generuje 5-cyfrowy kod aktywacyjny
 */
function generateActivationCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

/**
 * Konfiguruje transporter nodemailer z Gmail SMTP
 */
function createEmailTransporter() {
  // Pobierz dane z Firebase Config
  // Ustaw je komendą: firebase functions:config:set gmail.email="twoj@gmail.com" gmail.password="haslo_aplikacji"
  const gmailEmail = functions.config().gmail?.email;
  const gmailPassword = functions.config().gmail?.password;

  if (!gmailEmail || !gmailPassword) {
    throw new Error('Gmail credentials nie są skonfigurowane. Ustaw je: firebase functions:config:set gmail.email="email" gmail.password="haslo"');
  }

  // Konfiguracja Gmail SMTP
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailEmail,
      pass: gmailPassword
    }
  });
}

/**
 * Cloud Function wywoływana przy rejestracji nowego użytkownika
 * Generuje kod aktywacyjny i wysyła email
 */
exports.sendActivationEmail = functions.https.onCall(async (data, context) => {
  const { email, name } = data;

  // Walidacja
  if (!email || !name) {
    throw new functions.https.HttpsError('invalid-argument', 'Email i imię są wymagane');
  }

  // Generuj kod aktywacyjny
  const activationCode = generateActivationCode();
  const expiresAt = Date.now() + (15 * 60 * 1000); // Ważny 15 minut

  try {
    // Zapisz kod w Realtime Database
    const db = admin.database();
    await db.ref(`activationCodes/${email.replace(/\./g, '_')}`).set({
      code: activationCode,
      email: email,
      name: name,
      createdAt: Date.now(),
      expiresAt: expiresAt,
      used: false
    });

    // Konfiguruj transporter email
    let transporter;
    try {
      transporter = createEmailTransporter();
    } catch (error) {
      console.error('Błąd konfiguracji emaila:', error);
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Serwis email nie jest skonfigurowany. Skontaktuj się z administratorem.'
      );
    }

    // Przygotuj email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 48px;
            margin-bottom: 10px;
          }
          .title {
            color: #6a11cb;
            font-size: 28px;
            font-weight: 700;
            margin: 0;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
          }
          .code-box {
            background: linear-gradient(135deg, #6a11cb, #8a2be2);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 8px 20px rgba(106, 17, 203, 0.3);
          }
          .code-label {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
            opacity: 0.9;
          }
          .code {
            font-size: 48px;
            font-weight: 700;
            letter-spacing: 8px;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          .info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #6a11cb;
          }
          .info ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .info li {
            margin: 5px 0;
          }
          .warning {
            color: #666;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 30px;
            border-top: 1px solid #e0e0e0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #999;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✨</div>
            <h1 class="title">Kryształkowo</h1>
          </div>

          <div class="greeting">
            Witaj <strong>${name}</strong>!
          </div>

          <p>Dziękujemy za rejestrację w aplikacji Kryształkowo.</p>

          <div class="code-box">
            <div class="code-label">Twój kod aktywacyjny</div>
            <div class="code">${activationCode}</div>
          </div>

          <div class="info">
            <strong>⏱️ Ważne informacje:</strong>
            <ul>
              <li>Kod jest ważny przez <strong>15 minut</strong></li>
              <li>Wprowadź go w aplikacji aby aktywować konto</li>
              <li>Nie udostępniaj kodu nikomu</li>
            </ul>
          </div>

          <div class="warning">
            Jeśli nie zakładałeś konta w Kryształkowo, zignoruj tego maila. Twoje dane są bezpieczne.
          </div>

          <div class="footer">
            <p>Pozdrawiamy,<br><strong>Zespół Kryształkowo</strong></p>
            <p>© 2025 Kryształkowo. Wszelkie prawa zastrzeżone.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Treść tekstowa (fallback)
    const textContent = `
Witaj ${name}!

Dziękujemy za rejestrację w aplikacji Kryształkowo.

Twój kod aktywacyjny: ${activationCode}

Kod jest ważny przez 15 minut.

Jeśli nie zakładałeś konta w Kryształkowo, zignoruj tego maila.

Pozdrawiamy,
Zespół Kryształkowo
    `.trim();

    // Opcje emaila
    const mailOptions = {
      from: {
        name: 'Kryształkowo',
        address: functions.config().gmail?.email
      },
      to: email,
      subject: 'Aktywacja konta',
      text: textContent,
      html: htmlContent
    };

    // Wyślij email
    await transporter.sendMail(mailOptions);

    console.log(`Email aktywacyjny wysłany do: ${email}`);

    return {
      success: true,
      message: 'Kod aktywacyjny został wysłany na podany adres email',
      expiresAt: expiresAt
    };

  } catch (error) {
    console.error('Błąd wysyłki email:', error);

    // Szczegółowe logowanie błędów
    if (error.message) {
      console.error('Error message:', error.message);
    }

    throw new functions.https.HttpsError(
      'internal',
      'Nie udało się wysłać emaila aktywacyjnego. Spróbuj ponownie później.'
    );
  }
});

/**
 * Cloud Function do weryfikacji kodu aktywacyjnego
 */
exports.verifyActivationCode = functions.https.onCall(async (data, context) => {
  const { email, code } = data;

  // Walidacja
  if (!email || !code) {
    throw new functions.https.HttpsError('invalid-argument', 'Email i kod są wymagane');
  }

  try {
    const db = admin.database();
    const emailKey = email.replace(/\./g, '_');
    const codeRef = db.ref(`activationCodes/${emailKey}`);
    const snapshot = await codeRef.once('value');
    const codeData = snapshot.val();

    // Sprawdź czy kod istnieje
    if (!codeData) {
      throw new functions.https.HttpsError('not-found', 'Kod aktywacyjny nie został znaleziony');
    }

    // Sprawdź czy kod już został użyty
    if (codeData.used) {
      throw new functions.https.HttpsError('already-exists', 'Kod aktywacyjny został już użyty');
    }

    // Sprawdź czy kod wygasł
    if (Date.now() > codeData.expiresAt) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Kod aktywacyjny wygasł');
    }

    // Sprawdź czy kod się zgadza
    if (codeData.code !== code) {
      throw new functions.https.HttpsError('invalid-argument', 'Nieprawidłowy kod aktywacyjny');
    }

    // Oznacz kod jako użyty
    await codeRef.update({
      used: true,
      usedAt: Date.now()
    });

    console.log(`Kod aktywacyjny zweryfikowany dla: ${email}`);

    return {
      success: true,
      message: 'Kod aktywacyjny jest prawidłowy'
    };

  } catch (error) {
    // Jeśli to już jest HttpsError, rzuć go dalej
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    console.error('Błąd weryfikacji kodu:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Nie udało się zweryfikować kodu. Spróbuj ponownie.'
    );
  }
});

/**
 * Funkcja do czyszczenia wygasłych kodów (uruchamiana codziennie)
 */
exports.cleanupExpiredCodes = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const db = admin.database();
  const codesRef = db.ref('activationCodes');
  const snapshot = await codesRef.once('value');
  const codes = snapshot.val() || {};

  const now = Date.now();
  const updates = {};

  // Znajdź wygasłe kody
  for (const [key, codeData] of Object.entries(codes)) {
    if (now > codeData.expiresAt) {
      updates[key] = null; // Usuń wygasły kod
    }
  }

  // Wykonaj aktualizację
  if (Object.keys(updates).length > 0) {
    await codesRef.update(updates);
    console.log(`Usunięto ${Object.keys(updates).length} wygasłych kodów aktywacyjnych`);
  }

  return null;
});
