/**
 * Configuration des polices Uthmanic pour le Quran
 * Utilise Google Fonts et polices système arabes
 */

export const UTHMANIC_FONTS = {
  // Polices Uthmanic principales
  primary: 'Amiri-Quran', // Police Amiri spécialement pour le Quran
  fallback: [
    'Scheherazade New', // Police SIL pour l'arabe
    'Noto Naskh Arabic', // Google Fonts
    'Arial Unicode MS', // Système
    'Tahoma', // Fallback Windows
    'sans-serif' // Fallback final
  ],

  // Polices pour différents contextes
  verse: 'Amiri-Quran',
  title: 'Amiri',
  number: 'Amiri',
};

export const getFontFamily = (context: 'verse' | 'title' | 'number' = 'verse'): string => {
  const font = UTHMANIC_FONTS[context];
  const fallbacks = UTHMANIC_FONTS.fallback.join(', ');
  return `${font}, ${fallbacks}`;
};