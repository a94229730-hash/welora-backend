import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SUPPORTED_LANGUAGES, LanguageOption, getTranslation } from '../data/languages';

interface LanguageContextType {
  displayLanguage: string;
  communicationLanguage: string;
  setDisplayLanguage: (lang: string) => void;
  setCommunicationLanguage: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
  currentLangObj: LanguageOption;
  commLangObj: LanguageOption;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY_DISPLAY = 'welora_display_lang';
const STORAGE_KEY_COMM = 'welora_comm_lang';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [displayLanguage, setDisplayLanguageState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DISPLAY);
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.name.toLowerCase() === saved.toLowerCase())) {
        const found = SUPPORTED_LANGUAGES.find((l) => l.name.toLowerCase() === saved.toLowerCase());
        return found ? found.name : 'English';
      }
      const userSaved = localStorage.getItem('welora_user');
      if (userSaved) {
        const parsed = JSON.parse(userSaved);
        if (parsed.displayLanguage && SUPPORTED_LANGUAGES.some((l) => l.name.toLowerCase() === parsed.displayLanguage.toLowerCase())) {
          const found = SUPPORTED_LANGUAGES.find((l) => l.name.toLowerCase() === parsed.displayLanguage.toLowerCase());
          return found ? found.name : 'English';
        }
      }
    } catch (e) {}
    return 'English';
  });

  const [communicationLanguage, setCommunicationLanguageState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COMM);
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.name.toLowerCase() === saved.toLowerCase())) {
        const found = SUPPORTED_LANGUAGES.find((l) => l.name.toLowerCase() === saved.toLowerCase());
        return found ? found.name : 'English';
      }
      const userSaved = localStorage.getItem('welora_user');
      if (userSaved) {
        const parsed = JSON.parse(userSaved);
        if (parsed.communicationLanguage && SUPPORTED_LANGUAGES.some((l) => l.name.toLowerCase() === parsed.communicationLanguage.toLowerCase())) {
          const found = SUPPORTED_LANGUAGES.find((l) => l.name.toLowerCase() === parsed.communicationLanguage.toLowerCase());
          return found ? found.name : 'English';
        }
      }
    } catch (e) {}
    return 'English';
  });

  const setDisplayLanguage = useCallback((lang: string) => {
    const valid = SUPPORTED_LANGUAGES.find(
      (l) =>
        l.name.toLowerCase() === lang.toLowerCase() ||
        l.id.toLowerCase() === lang.toLowerCase() ||
        l.code.toLowerCase() === lang.toLowerCase()
    );
    const targetName = valid ? valid.name : 'English';
    setDisplayLanguageState(targetName);
    try {
      localStorage.setItem(STORAGE_KEY_DISPLAY, targetName);
      const userRaw = localStorage.getItem('welora_user');
      if (userRaw) {
        const userObj = JSON.parse(userRaw);
        userObj.displayLanguage = targetName;
        localStorage.setItem('welora_user', JSON.stringify(userObj));
      }
    } catch (e) {}
  }, []);

  const setCommunicationLanguage = useCallback((lang: string) => {
    const valid = SUPPORTED_LANGUAGES.find(
      (l) =>
        l.name.toLowerCase() === lang.toLowerCase() ||
        l.id.toLowerCase() === lang.toLowerCase() ||
        l.code.toLowerCase() === lang.toLowerCase()
    );
    const targetName = valid ? valid.name : 'English';
    setCommunicationLanguageState(targetName);
    try {
      localStorage.setItem(STORAGE_KEY_COMM, targetName);
      const userRaw = localStorage.getItem('welora_user');
      if (userRaw) {
        const userObj = JSON.parse(userRaw);
        userObj.communicationLanguage = targetName;
        localStorage.setItem('welora_user', JSON.stringify(userObj));
      }
    } catch (e) {}
  }, []);

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.name === displayLanguage) || SUPPORTED_LANGUAGES[0];
  const commLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.name === communicationLanguage) || SUPPORTED_LANGUAGES[0];
  const isRTL = Boolean(currentLangObj.isRTL);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLangObj.code || 'en';
  }, [isRTL, currentLangObj.code]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      return getTranslation(displayLanguage, key, fallback);
    },
    [displayLanguage]
  );

  const value = {
    displayLanguage,
    communicationLanguage,
    setDisplayLanguage,
    setCommunicationLanguage,
    t,
    currentLangObj,
    commLangObj,
    isRTL,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
