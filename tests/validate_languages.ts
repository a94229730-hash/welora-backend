import { SUPPORTED_LANGUAGES, UI_TRANSLATIONS, CANONICAL_TRANSLATION_KEYS } from '../src/data/languages.js';

console.log('--- VALIDATING ALL 13 TRANSLATION DICTIONARIES ---');
let hasErrors = false;

const languageCount = SUPPORTED_LANGUAGES.length;
if (languageCount !== 13) {
  console.error(`FAIL: Expected 13 languages, found ${languageCount}`);
  hasErrors = true;
} else {
  console.log(`PASS: Found exact 13 supported languages.`);
}

SUPPORTED_LANGUAGES.forEach((lang) => {
  const dict = UI_TRANSLATIONS[lang.name];
  if (!dict) {
    console.error(`FAIL: Missing dictionary for language "${lang.name}"`);
    hasErrors = true;
    return;
  }

  const missingKeys: string[] = [];
  const emptyKeys: string[] = [];

  CANONICAL_TRANSLATION_KEYS.forEach((key) => {
    if (!(key in dict)) {
      missingKeys.push(key);
    } else if (!dict[key] || dict[key].trim() === '') {
      emptyKeys.push(key);
    }
  });

  if (missingKeys.length > 0) {
    console.error(`FAIL: Language "${lang.name}" is missing ${missingKeys.length} keys: ${missingKeys.slice(0, 5).join(', ')}...`);
    hasErrors = true;
  } else if (emptyKeys.length > 0) {
    console.error(`FAIL: Language "${lang.name}" has empty values for keys: ${emptyKeys.join(', ')}`);
    hasErrors = true;
  } else {
    console.log(`PASS: Language "${lang.name}" (${lang.nativeName}, ${lang.code}) has 100% complete keys (${CANONICAL_TRANSLATION_KEYS.length}/${CANONICAL_TRANSLATION_KEYS.length}).`);
  }

  if (lang.name === 'Urdu' && !lang.isRTL) {
    console.error('FAIL: Urdu must have isRTL set to true');
    hasErrors = true;
  }
});

if (hasErrors) {
  console.error('\nResult: VALIDATION FAILED');
  process.exit(1);
} else {
  console.log('\nResult: ALL 13 LANGUAGES VALIDATED SUCCESSFULLY (100% COMPLETE)');
  process.exit(0);
}
