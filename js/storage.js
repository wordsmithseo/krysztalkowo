// ===== FIREBASE STORAGE OPERATIONS =====
import { storage } from './config.js';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getCurrentAuthUser } from './auth.js';
import { getImageCache, setImageCache, invalidateImageCache, isCacheValid } from './imageCache.js';

// Funkcja do uploadowania obrazka
export const uploadImage = async (file, type = 'category') => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      throw new Error('Użytkownik nie jest zalogowany');
    }

    // Sprawdź czy plik jest obrazkiem
    if (!file.type.startsWith('image/')) {
      throw new Error('Plik musi być obrazkiem');
    }

    // Sprawdź rozmiar pliku (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Plik jest za duży. Maksymalny rozmiar to 5MB');
    }

    // Utwórz unikalną nazwę pliku
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const fileName = `${user.uid}/${type}/${timestamp}_${randomString}.${extension}`;

    // Upload do Firebase Storage
    const storageRef = ref(storage, `images/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);

    // Pobierz URL do obrazka
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Inwaliduj cache po dodaniu nowego obrazka
    invalidateImageCache();

    return {
      success: true,
      url: downloadURL,
      path: fileName
    };
  } catch (error) {
    console.error('Błąd podczas uploadowania obrazka:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Funkcja do usuwania obrazka (opcjonalna - gdy usuwamy kategorię/nagrodę)
export const deleteImage = async (imagePath) => {
  try {
    if (!imagePath) return { success: true };

    // Jeśli to jest pełny URL z Firebase Storage, wyciągnij ścieżkę
    let path = imagePath;
    if (imagePath.includes('firebase')) {
      // Wyciągnij ścieżkę z URL
      const matches = imagePath.match(/images%2F(.+?)\?/);
      if (matches && matches[1]) {
        path = decodeURIComponent(matches[1]);
      }
    }

    const storageRef = ref(storage, `images/${path}`);
    await deleteObject(storageRef);

    // Inwaliduj cache po usunięciu obrazka
    invalidateImageCache();

    return { success: true };
  } catch (error) {
    console.error('Błąd podczas usuwania obrazka:', error);
    // Nie rzucamy błędu - usuwanie obrazka nie powinno blokować usuwania kategorii
    return { success: false, error: error.message };
  }
};

// Funkcja do kompresji obrazka przed uploadem (ZOPTYMALIZOWANA dla lepszej wydajności)
export const compressImage = (file, maxWidth = 600, maxHeight = 600, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Oblicz nowe wymiary zachowując proporcje
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Włącz image smoothing dla lepszej jakości przy zmniejszaniu
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            }));
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Funkcja do pobierania wszystkich obrazków użytkownika
export const getAllUserImages = async (forceRefresh = false) => {
  try {
    const user = getCurrentAuthUser();
    if (!user) {
      throw new Error('Użytkownik nie jest zalogowany');
    }

    // Sprawdź cache jeśli nie wymuszono odświeżenia
    if (!forceRefresh && isCacheValid()) {
      const cache = getImageCache();
      console.log('✅ Pobrano z cache:', cache.count, 'obrazków');
      return {
        success: true,
        images: cache.images,
        totalSize: cache.totalSize,
        count: cache.count,
        fromCache: true
      };
    }

    console.log('🔄 Pobieranie z Firebase Storage...');
    const userFolderRef = ref(storage, `images/${user.uid}`);
    const result = await listAll(userFolderRef);

    const images = [];
    let totalSize = 0;

    // Przetwarzaj wszystkie pliki w folderze użytkownika (we wszystkich podfolderach)
    for (const folderRef of result.prefixes) {
      const folderResult = await listAll(folderRef);

      for (const itemRef of folderResult.items) {
        try {
          const metadata = await getMetadata(itemRef);
          const url = await getDownloadURL(itemRef);

          images.push({
            url,
            path: itemRef.fullPath,
            size: metadata.size,
            name: metadata.name,
            created: metadata.timeCreated
          });

          totalSize += metadata.size;
        } catch (error) {
          console.error('Błąd pobierania metadanych obrazka:', error);
        }
      }
    }

    // Zapisz do cache
    setImageCache(images, totalSize, images.length);

    return {
      success: true,
      images,
      totalSize,
      count: images.length,
      fromCache: false
    };
  } catch (error) {
    console.error('Błąd podczas pobierania obrazków:', error);
    return {
      success: false,
      error: error.message,
      images: [],
      totalSize: 0,
      count: 0
    };
  }
};

// Funkcja do usuwania obrazka po URL
export const deleteImageByUrl = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('firebase')) {
      throw new Error('Nieprawidłowy URL obrazka');
    }

    // Wyciągnij ścieżkę z URL
    const matches = imageUrl.match(/images%2F(.+?)\?/);
    if (!matches || !matches[1]) {
      throw new Error('Nie można wyciągnąć ścieżki z URL');
    }

    const path = decodeURIComponent(matches[1]);
    const storageRef = ref(storage, `images/${path}`);
    await deleteObject(storageRef);

    // Inwaliduj cache po usunięciu obrazka
    invalidateImageCache();

    return { success: true };
  } catch (error) {
    console.error('Błąd podczas usuwania obrazka:', error);
    return { success: false, error: error.message };
  }
};
