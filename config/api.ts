/**
 * Configuration des APIs
 */

/** Garantit le suffixe /v1 attendu par le backend Laravel, sans double slash. */
function normalizeBaseUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

export const API_CONFIG = {
  // Source unique : EXPO_PUBLIC_API_URL dans .env (ex. http://192.168.1.47:8000/api)
  BACKEND_URL: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.47:8000/api'),

  // Timeouts
  REQUEST_TIMEOUT: 10000, // 10 secondes

  // Cache
  CACHE_DURATION: {
    TIMING_DATA: 3600000,    // 1 heure en ms
    RECITER_PROFILES: 86400000, // 24 heures en ms
  },

  // Endpoints
  ENDPOINTS: {
    WORD_SYNC: {
      TIMING_DATA: '/word-sync/timing-data',
      CURRENT_WORD: '/word-sync/current-word',
      RECITERS: '/word-sync/reciters',
      RECITER_PROFILE: '/word-sync/reciters/',
      CLEAR_CACHE: '/word-sync/cache',
      STATS: '/word-sync/stats',
    }
  }
};

// Fonction utilitaire pour construire des URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BACKEND_URL}${endpoint}`;
};

// Headers par défaut
export const getDefaultHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'QuranApp/1.0',
});

// Fonction pour gérer les erreurs d'API
export const handleApiError = (error: any, context: string = 'API Call') => {
  if (error.response) {
    // Erreur de réponse du serveur
    console.error(`❌ ${context}: Server Error ${error.response.status}:`, error.response.data);
    throw new Error(`Server Error: ${error.response.data?.message || 'Unknown server error'}`);
  } else if (error.request) {
    // Erreur de réseau
    console.error(`❌ ${context}: Network Error:`, error.request);
    throw new Error('Network Error: Unable to reach server');
  } else {
    // Autre erreur
    console.error(`❌ ${context}: Error:`, error.message);
    throw new Error(error.message || 'Unknown error occurred');
  }
};