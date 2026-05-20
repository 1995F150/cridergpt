import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',     flag: '🇺🇸' },
  { code: 'es', label: 'Español',     flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch',     flag: '🇩🇪' },
  { code: 'fr', label: 'Français',    flag: '🇫🇷' },
  { code: 'pt', label: 'Português',   flag: '🇵🇹' },
  { code: 'ja', label: '日本語',       flag: '🇯🇵' },
  { code: 'zh', label: '中文',         flag: '🇨🇳' },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      de: { translation: de },
      fr: { translation: fr },
      pt: { translation: pt },
      ja: { translation: ja },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'cridergpt_lang',
    },
  });

document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
