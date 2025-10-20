/**
 * Utilitaires pour le traitement du texte arabe et unicode
 */

/**
 * Convertit les séquences unicode en caractères arabes réels
 * @param text - Texte contenant des séquences unicode
 * @returns Texte avec les caractères arabes convertis
 */
export function convertUnicodeToArabic(text: string): string {
  if (!text) return '';

  try {
    // Convertir les séquences unicode \uXXXX en caractères réels
    return text.replace(/\\u([\dA-Fa-f]{4})/g, function(match, grp) {
      return String.fromCharCode(parseInt(grp, 16));
    });
  } catch (error) {
    console.error('Erreur lors de la conversion unicode:', error);
    return text; // Retourner le texte original en cas d'erreur
  }
}

/**
 * Nettoie et formate le texte arabe pour l'affichage
 * @param text - Texte arabe à nettoyer
 * @returns Texte arabe nettoyé
 */
export function cleanArabicText(text: string): string {
  if (!text) return '';

  try {
    let cleaned = text;

    // Convertir d'abord les séquences unicode
    cleaned = convertUnicodeToArabic(cleaned);

    // Supprimer les caractères de contrôle mais garder l'arabe
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    // Nettoyer les espaces multiples
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  } catch (error) {
    console.error('Erreur lors du nettoyage du texte arabe:', error);
    return text;
  }
}

/**
 * Vérifie si un texte contient des séquences unicode malformées
 * @param text - Texte à vérifier
 * @returns true si le texte contient des séquences unicode malformées
 */
export function hasCorruptedUnicode(text: string): boolean {
  if (!text) return false;

  // Détecter les séquences unicode incomplètes ou malformées
  const corruptedPattern = /\\u[\dA-Fa-f]{0,3}(?![0-9A-Fa-f])/;
  return corruptedPattern.test(text);
}

/**
 * Valide que le texte arabe est correctement formaté
 * @param text - Texte arabe à valider
 * @returns true si le texte est valide
 */
export function isValidArabicText(text: string): boolean {
  if (!text) return false;

  // Vérifier qu'il n'y a pas de séquences unicode malformées
  if (hasCorruptedUnicode(text)) return false;

  // Vérifier qu'il contient des caractères arabes (plage Unicode 0600-06FF)
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text);
}

/**
 * Répare automatiquement le texte arabe corrompu
 * @param text - Texte potentiellement corrompu
 * @returns Texte réparé
 */
export function repairArabicText(text: string): string {
  if (!text) return '';

  let repaired = text;

  // Étape 1: Convertir les séquences unicode valides
  repaired = convertUnicodeToArabic(repaired);

  // Étape 2: Supprimer les séquences unicode malformées
  repaired = repaired.replace(/\\u[\dA-Fa-f]{0,3}(?![0-9A-Fa-f])/g, '');

  // Étape 3: Nettoyer le texte
  repaired = cleanArabicText(repaired);

  return repaired;
}