import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Globe,
  Radio,
  PhoneCall,
  Send,
  HelpCircle,
  Activity,
  HeartPulse,
  Square,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { WeloraLogo } from './WeloraLogo';
import { User } from '../types';
import { SUPPORTED_LANGUAGES, LanguageOption } from '../data/languages';
import { EmergencyCallConfirmModal } from './EmergencyCallConfirmModal';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface DedicatedVoiceAssistantProps {
  onClose: () => void;
  user: User | null;
  onOpenSOS: () => void;
  language?: string;
}

export type VoiceState =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

// Explicit STT Language mapping configuration with primary & fallback locale tags for all 13 languages
export interface STTLanguageConfig {
  primaryCode: string;
  fallbackCodes: string[];
  displayName: string;
  nativeName: string;
}

export const STT_LANGUAGE_MAP: Record<string, STTLanguageConfig> = {
  English: {
    primaryCode: 'en-IN',
    fallbackCodes: ['en-US', 'en-GB', 'en'],
    displayName: 'English (India)',
    nativeName: 'English',
  },
  Hindi: {
    primaryCode: 'hi-IN',
    fallbackCodes: ['hi'],
    displayName: 'Hindi',
    nativeName: 'हिन्दी',
  },
  Marathi: {
    primaryCode: 'mr-IN',
    fallbackCodes: ['mr'],
    displayName: 'Marathi',
    nativeName: 'मराठी',
  },
  Bengali: {
    primaryCode: 'bn-IN',
    fallbackCodes: ['bn-BD', 'bn'],
    displayName: 'Bengali',
    nativeName: 'বাংলা',
  },
  Gujarati: {
    primaryCode: 'gu-IN',
    fallbackCodes: ['gu'],
    displayName: 'Gujarati',
    nativeName: 'ગુજરાતી',
  },
  Kannada: {
    primaryCode: 'kn-IN',
    fallbackCodes: ['kn'],
    displayName: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
  },
  Tamil: {
    primaryCode: 'ta-IN',
    fallbackCodes: ['ta-LK', 'ta-SG', 'ta'],
    displayName: 'Tamil',
    nativeName: 'தமிழ்',
  },
  Telugu: {
    primaryCode: 'te-IN',
    fallbackCodes: ['te'],
    displayName: 'Telugu',
    nativeName: 'తెలుగు',
  },
  Malayalam: {
    primaryCode: 'ml-IN',
    fallbackCodes: ['ml'],
    displayName: 'Malayalam',
    nativeName: 'മലയാളം',
  },
  Punjabi: {
    primaryCode: 'pa-IN',
    fallbackCodes: ['pa-Guru-IN', 'pa-PK', 'pa'],
    displayName: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
  },
  Odia: {
    primaryCode: 'or-IN',
    fallbackCodes: ['ory-IN', 'or', 'hi-IN'],
    displayName: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
  },
  Assamese: {
    primaryCode: 'as-IN',
    fallbackCodes: ['as', 'bn-IN', 'hi-IN'],
    displayName: 'Assamese',
    nativeName: 'অসমীয়া',
  },
  Urdu: {
    primaryCode: 'ur-IN',
    fallbackCodes: ['ur-PK', 'ur'],
    displayName: 'Urdu',
    nativeName: 'اردو',
  },
};

// Sample clinical test queries for each of the 13 supported languages
const SAMPLE_QUERIES_BY_LANG: Record<string, Array<{ label: string; text: string; isSos?: boolean }>> = {
  English: [
    { label: 'Fever & Headache', text: 'I have mild fever and headache for two days, what should I do?' },
    { label: 'Chest Pressure (SOS)', text: 'Sudden severe crushing chest pain radiating to left arm with breathlessness.', isSos: true },
    { label: 'Acid Reflux Relief', text: 'Burning sensation in upper chest and acid reflux after dinner.' },
  ],
  Hindi: [
    { label: 'बुखार और सिरदर्द', text: 'मुझे दो दिनों से हल्का बुखार और सिरदर्द है, मुझे क्या करना चाहिए?' },
    { label: 'सीने में दर्द (SOS)', text: 'सीने में अचानक तेज दबाव और बाएं हाथ में दर्द के साथ सांस फूल रही है।', isSos: true },
    { label: 'एसिडिटी और गैस', text: 'खाने के बाद छाती में जलन और खट्टी डकारें आ रही हैं।' },
  ],
  Marathi: [
    { label: 'ताप आणि डोकेदुखी', text: 'मला दोन दिवसांपासून हलका ताप आणि डोकेदुखी जाणवत आहे.' },
    { label: 'छातीत तीव्र वेदना (SOS)', text: 'छातीत प्रचंड दाब आणि डाव्या हातात वेदना जाणवत असून श्वास घेण्यास त्रास होतोय.', isSos: true },
    { label: 'ॲसिडिटी आराम', text: 'जेवणानंतर छातीत जळजळ आणि पित्ताचा त्रास होत आहे.' },
  ],
  Bengali: [
    { label: 'জ্বর ও মাথাব্যথা', text: 'আমার দুই দিন ধরে হালকা জ্বর এবং মাথাব্যথা হচ্ছে।' },
    { label: 'বুকে তীব্র ব্যথা (SOS)', text: 'বুকে তীব্র চাপ এবং বাম হাতে ব্যথা সহ শ্বাসকষ্ট হচ্ছে।', isSos: true },
    { label: 'গ্যাস ও এসিডিটি', text: 'খাওয়ার পরে বুকে জ্বালাপোড়া এবং এসিডিটি হচ্ছে।' },
  ],
  Gujarati: [
    { label: 'તાવ અને માથાનો દુખાવો', text: 'મને બે દિવસથી હળવો તાવ અને માથાનો દુખાવો છે.' },
    { label: 'છાતીમાં દુખાવો (SOS)', text: 'છાતીમાં અચાનક ભારે દબાણ અને ડાબા હાથમાં દુખાવા સાથે શ્વાસ લેવામાં તકલીફ છે.', isSos: true },
    { label: 'એસિડિટી અને બળતરા', text: 'જમ્યા પછી છાતીમાં બળતરા અને એસિડિટી થાય છે.' },
  ],
  Kannada: [
    { label: 'ಜ್ವರ ಮತ್ತು ತಲೆನೋವು', text: 'ನನಗೆ ಎರಡು ದಿನಗಳಿಂದ ಲಘು ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ.' },
    { label: 'ಎದೆ ನೋವು (SOS)', text: 'ಎದೆಯಲ್ಲಿ ತೀವ್ರ ಒತ್ತಡ ಮತ್ತು ಎಡಗೈಯಲ್ಲಿ ನೋವಿನೊಂದಿಗೆ ಉಸಿರಾಟದ ತೊಂದರೆ ಇದೆ.', isSos: true },
    { label: 'ಅಸಿಡಿಟಿ ಪರಿಹಾರ', text: 'ಊಟದ ನಂತರ ಎದೆಯಲ್ಲಿ ಉರಿ ಮತ್ತು ಅಸಿಡಿಟಿ ಉಂಟಾಗುತ್ತಿದೆ.' },
  ],
  Tamil: [
    { label: 'காய்ச்சல் மற்றும் தலைவலி', text: 'எனக்கு இரண்டு நாட்களாக லேசான காய்ச்சலும் தலைவலியும் உள்ளது.' },
    { label: 'நெஞ்சு வலி (SOS)', text: 'நெஞ்சில் கடுமையான அழுத்தம் மற்றும் இடது கையில் வலியுடன் மூச்சுத் திணறல் உள்ளது.', isSos: true },
    { label: 'அசிடிட்டி தீர்வு', text: 'சாப்பிட்ட பிறகு நெஞ்செரிச்சல் மற்றும் அசிடிட்டி ஏற்படுகிறது.' },
  ],
  Telugu: [
    { label: 'జ్వరం మరియు తలనొప్పి', text: 'నాకు రెండు రోజులుగా తేలికపాటి జ్వరం మరియు తలనొప్పి ఉంది.' },
    { label: 'ఛాతీ నొప్పి (SOS)', text: 'ఛాతీలో తీవ్రమైన ఒత్తిడి మరియు ఎడమ చేతిలో నొప్పితో ఊపిరి తీసుకోవడం కష్టంగా ఉంది.', isSos: true },
    { label: 'ఎసిడిటీ ఉపశమనం', text: 'భోజనం తర్వాత గుండెల్లో మంట మరియు ఎసిడిటీగా ఉంది.' },
  ],
  Malayalam: [
    { label: 'പനിയും തലവേദനയും', text: 'എനിക്ക് രണ്ടു ദിവസമായി നേരിയ പനിയും തലവേദനയും ഉണ്ട്.' },
    { label: 'നെഞ്ചുവേദന (SOS)', text: 'നെഞ്ചിൽ കഠിനമായ സമ്മർദ്ദവും ഇടതുകൈയിൽ വേദനയും ശ്വാസതടസ്സവും ഉണ്ട്.', isSos: true },
    { label: 'അസിഡിറ്റി ശമനം', text: 'ഭക്ഷണത്തിന് ശേഷം നെഞ്ചെരിച്ചിലും അസിഡിറ്റിയും അനുഭവപ്പെടുന്നു.' },
  ],
  Punjabi: [
    { label: 'ਬੁਖਾਰ ਅਤੇ ਸਿਰਦਰਦ', text: 'ਮੈਨੂੰ ਦੋ ਦਿਨਾਂ ਤੋਂ ਹਲਕਾ ਬੁਖਾਰ ਅਤੇ ਸਿਰਦਰਦ ਹੈ।' },
    { label: 'ਛਾਤੀ ਵਿੱਚ ਦਰਦ (SOS)', text: 'ਛਾਤੀ ਵਿੱਚ ਅਚਾਨਕ ਭਾਰੀ ਦਬਾਅ ਅਤੇ ਖੱਬੇ ਹੱਥ ਵਿੱਚ ਦਰਦ ਨਾਲ ਸਾਹ ਲੈਣ ਵਿੱਚ ਤਕਲੀਫ਼ ਹੈ।', isSos: true },
    { label: 'ਐਸਿਡਿਟੀ ਤੋਂ ਰਾਹਤ', text: 'ਖਾਣਾ ਖਾਣ ਤੋਂ ਬਾਅਦ ਛਾਤੀ ਵਿੱਚ ਜਲਣ ਅਤੇ ਐਸਿਡਿਟੀ ਹੋ ਰਹੀ ਹੈ।' },
  ],
  Odia: [
    { label: 'ଜ୍ୱର ଏବଂ ମୁଣ୍ଡବିନ୍ଧା', text: 'ମୋତେ ଦୁଇ ଦିନ ଧରି ସାମାନ୍ୟ ଜ୍ୱର ଏବଂ ମୁଣ୍ଡବିନ୍ଧା ହେଉଛି।' },
    { label: 'ଛାତିରେ ଯନ୍ତ୍ରଣା (SOS)', text: 'ଛାତିରେ ଅତ୍ୟଧିକ ଚାପ ଏବଂ ବାମ ହାତରେ ଯନ୍ତ୍ରଣା ସହ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହେଉଛି।', isSos: true },
    { label: 'ଏସିଡିଟିରୁ ଉପଶମ', text: 'ଖାଇବା ପରେ ଛାତିରେ ଜଳାପୋଡ଼ା ଏବଂ ଏସିଡିଟି ହେଉଛି।' },
  ],
  Assamese: [
    { label: 'জ্বৰ আৰু মূৰৰ বিষ', text: 'মোৰ দুদিন ধৰি মৃদু জ্বৰ আৰু মূৰৰ বিষ হৈ আছে।' },
    { label: 'বুকুৰ বিষ (SOS)', text: 'বুকুত তীব্ৰ চাপ আৰু বাওঁ হাতত বিষৰ সৈতে উশাহ লোৱাত কষ্ট হৈছে।', isSos: true },
    { label: 'এচিডিটিৰ পৰা সকাহ', text: 'খোৱাৰ পিছত বুকুত জ্বলা-পোৰা আৰু এচিডিটি হৈছে।' },
  ],
  Urdu: [
    { label: 'بخار اور سردرد', text: 'مجھے دو دن سے ہلکا بخار اور سر میں درد ہے۔' },
    { label: 'سینے میں درد (SOS)', text: 'سینے میں شدید دباؤ اور بائیں بازو میں درد کے ساتھ سانس لینے میں دشواری ہو رہی ہے۔', isSos: true },
    { label: 'تیزابیت کا علاج', text: 'کھانے کے بعد سینے میں جلن اور تیزابیت محسوس ہو رہی ہے۔' },
  ],
};

const INITIAL_GREETINGS: Record<string, string> = {
  English: 'Hello, I am Welora, your personal Voice Avatar health companion. Tap the microphone or select a question below to start speaking.',
  Hindi: 'नमस्ते, मैं वेलोरा हूँ, आपकी AI स्वास्थ्य अवतार साथी। बोलने के लिए माइक्रोफ़ोन पर टैप करें या नीचे दिए गए किसी प्रश्न को चुनें।',
  Marathi: 'नमस्कार, मी वेलोरा आहे, तुमची AI आरोग्य अवतार सोबती. बोलण्यासाठी मायक्रोफोनवर टॅप करा किंवा खालील प्रश्न निवडा.',
  Bengali: 'নমস্কার, আমি ওয়েলোরা, আপনার AI স্বাস্থ্য অবতার সঙ্গী। কথা বলতে মাইক্রোফোনে ট্যাপ করুন அல்லது নিচের প্রশ্ন নির্বাচন করুন।',
  Gujarati: 'નમસ્તે, હું વેલોરા છું, તમારી AI સ્વાસ્થ્ય અવતાર સાથી. બોલવા માટે માઇક્રોફોન પર ટેપ કરો અથવા નીચેના પ્રશ્નો પસંદ કરો.',
  Kannada: 'ನಮಸ್ಕಾರ, ನಾನು ವೆಲೋರಾ, ನಿಮ್ಮ AI ಆರೋಗ್ಯ ಅವತಾರ ಸಹವರ್ತಿ. ಮಾತನಾಡಲು ಮೈಕ್ರೊಫೋನ್ ಟ್ಯಾಪ್ ಮಾಡಿ ಅಥವಾ ಕೆಳಗಿನ ಪ್ರಶ್ನೆಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
  Tamil: 'வணக்கம், நான் வெலோரா, உங்கள் AI மருத்துவ அவதார் தோழி. பேச மைக்ரோஃபோனைத் தட்டவும் அல்லது கீழேயுள்ள கேள்விகளைத் தேர்ந்தெடுக்கவும்.',
  Telugu: 'నమస్కారం, నేను వెలోరా, మీ AI ఆరోగ్య అవతార్ సహచరిని. మాట్లాడటానికి మైక్రోఫోన్ నొక్కండి లేదా క్రింది ప్రశ్నలను ఎంచుకోండి.',
  Malayalam: 'നമസ്കാരം, ഞാൻ വെലോറ, നിങ്ങളുടെ AI ആരോഗ്യ അവതാർ സഹായി. സംസാരിക്കാൻ മൈക്രോഫോൺ ടാപ്പ് ചെയ്യുക അല്ലെങ്കിൽ താഴെയുള്ള ചോദ്യങ്ങൾ തിരഞ്ഞെടുക്കുക.',
  Punjabi: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ ਵਿਲੋਰਾ ਹਾਂ, ਤੁਹਾਡੀ AI ਸਿਹਤ ਅਵਤਾਰ ਸਾਥੀ। ਬੋਲਣ ਲਈ ਮਾਈਕ੍ਰੋਫੋਨ ਤੇ ਟੈਪ ਕਰੋ ਜਾਂ ਹੇਠਾਂ ਦਿੱਤੇ ਸਵਾਲ ਚੁਣੋ।',
  Odia: 'ନମସ୍କାର, ମୁଁ ୱେଲୋରା, ଆପଣଙ୍କ AI ସ୍ୱାସ୍ଥ୍ୟ ଅବତାର ସାଥୀ। କହିବା ପାଇଁ ମାଇକ୍ରୋଫୋନ୍ ଟ୍ୟାପ୍ କରନ୍ତୁ କିମ୍ବା ତଳେ ଥିବା ପ୍ରଶ୍ନ ଚୟନ କରନ୍ତୁ।',
  Assamese: 'নমস্কাৰ, মই ৱেলোৰা, আপোনাৰ AI স্বাস্থ্য অৱতাৰ সংগী। কথা ক’বলৈ মাইক্ৰ’ফোনত টেপ কৰক বা তলত দিয়া প্ৰশ্ন বাছক।',
  Urdu: 'السلام علیکم، میں ویلورا ہوں، آپ کی AI ہیلتھ اوتار ساتھی۔ بولنے کے لیے مائیکروفون پر ٹیپ کریں یا نیچے دیئے گئے سوالات منتخب کریں۔',
};

// Emergency keywords detector across languages
const EMERGENCY_REGEX =
  /chest pain|heart attack|cannot breathe|breathlessness|stroke|unconscious|poison|severe bleeding|108|112|सीने में दर्द|दिल का दौरा|सांस फूलना|बेहोश|छातीत दुखणे|छातीत वेदना|हृदयविकार|বুকে ব্যথা|হার্ট অ্যাটাক|শ্বাসকষ্ট|છાતીમાં દુખાવો|હાર્ટ એટેક|ಎದೆ ನೋವು|ಹೃದಯಾಘಾತ|ನೆஞ்சு வலி|மாரடைப்பு|ఛాతీ నొప్పి|గుండెపోటు|നെഞ്ചുവേദന|ഹൃദയാഘാതം|ਛਾਤੀ ਵਿੱਚ ਦਰਦ|ਦਿਲ ਦਾ ਦੌਰਾ|ଛାତି ଯନ୍ତ୍ରଣା|ହାର୍ଟ ଆଟାକ୍|বুকুৰ বিষ|হাৰ্ট এটেক|سینے میں درد|دل کا دورہ/i;

export const DedicatedVoiceAssistant: React.FC<DedicatedVoiceAssistantProps> = ({
  onClose,
  user,
  onOpenSOS,
}) => {
  const { communicationLanguage, setCommunicationLanguage, t } = useLanguage();
  const [commLanguage, setCommLanguage] = useState<string>(
    user?.communicationLanguage || communicationLanguage || 'English'
  );
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [typedInput, setTypedInput] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>(
    INITIAL_GREETINGS[commLanguage] || INITIAL_GREETINGS.English
  );
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEmergencyDetected, setIsEmergencyDetected] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0); // 0-100 real microphone/speech energy
  const [speechVolumeBars, setSpeechVolumeBars] = useState<number[]>([15, 25, 40, 20, 30, 45, 20]);

  // Session lifecycle and audio management references
  const isListeningRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const hasSubmittedRef = useRef<boolean>(false);
  const sessionIdRef = useRef<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechAnimTimerRef = useRef<any>(null);

  // Look up language configuration
  const sttConfig: STTLanguageConfig =
    STT_LANGUAGE_MAP[commLanguage] || STT_LANGUAGE_MAP.English;

  const selectedLangObj: LanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.name === commLanguage) || SUPPORTED_LANGUAGES[0];

  // Load available browser voices safely
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        try {
          const voices = window.speechSynthesis.getVoices();
          setAvailableVoices(voices);
        } catch {}
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Update greeting when language changes
  useEffect(() => {
    const greeting = INITIAL_GREETINGS[commLanguage] || INITIAL_GREETINGS.English;
    setLastResponse(greeting);
    setTranscript('');
    setInterimTranscript('');
  }, [commLanguage]);

  // Clean up Web Audio stream and tracks safely
  const cleanupAudioInput = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch {}
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Stop active speech output
  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (speechAnimTimerRef.current) {
      clearInterval(speechAnimTimerRef.current);
      speechAnimTimerRef.current = null;
    }
    if (voiceState === 'speaking') {
      setVoiceState('idle');
    }
  }, [voiceState]);

  // Text to Speech synthesis with enhanced voice matching across all 13 languages
  const speakText = useCallback(
    (text: string) => {
      if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) {
        setVoiceState('idle');
        return;
      }
      stopSpeech();
      setVoiceState('speaking');

      // Animated speech output visualizer bars
      if (speechAnimTimerRef.current) clearInterval(speechAnimTimerRef.current);
      speechAnimTimerRef.current = setInterval(() => {
        setSpeechVolumeBars([
          15 + Math.random() * 55,
          25 + Math.random() * 70,
          35 + Math.random() * 60,
          45 + Math.random() * 50,
          30 + Math.random() * 65,
          20 + Math.random() * 75,
          15 + Math.random() * 50,
        ]);
      }, 120);

      const cleanText = text.replace(/[*_#`~]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);

      const targetCodes = [sttConfig.primaryCode, ...sttConfig.fallbackCodes];
      utterance.lang = sttConfig.primaryCode;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices =
        availableVoices.length > 0
          ? availableVoices
          : window.speechSynthesis.getVoices();

      // Find best matched voice
      let matchingVoice = voices.find((v) =>
        targetCodes.some((code) => v.lang.toLowerCase() === code.toLowerCase())
      );

      if (!matchingVoice) {
        matchingVoice = voices.find((v) =>
          targetCodes.some((code) => {
            const prefix = code.split('-')[0].toLowerCase();
            return v.lang.toLowerCase().startsWith(prefix);
          })
        );
      }

      if (!matchingVoice) {
        matchingVoice = voices.find(
          (v) =>
            v.name.toLowerCase().includes(commLanguage.toLowerCase()) ||
            v.name.includes(sttConfig.nativeName)
        );
      }

      if (matchingVoice) {
        utterance.voice = matchingVoice;
        utterance.lang = matchingVoice.lang;
      }

      utterance.onstart = () => {
        setVoiceState('speaking');
      };

      utterance.onend = () => {
        if (speechAnimTimerRef.current) {
          clearInterval(speechAnimTimerRef.current);
          speechAnimTimerRef.current = null;
        }
        setVoiceState('idle');
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis event:', e);
        if (speechAnimTimerRef.current) {
          clearInterval(speechAnimTimerRef.current);
          speechAnimTimerRef.current = null;
        }
        setVoiceState('idle');
      };

      synthesisUtteranceRef.current = utterance;
      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis failed:', err);
        setVoiceState('idle');
      }
    },
    [availableVoices, commLanguage, isMuted, sttConfig, stopSpeech]
  );

  // Submit transcript to the REAL backend AI service (/api/ai/voice-respond)
  const processSpokenInput = useCallback(
    async (spokenText: string) => {
      const cleanInput = spokenText.trim();
      if (!cleanInput) {
        setVoiceState('idle');
        return;
      }

      // Increment session ID to cancel out any older pending async responses
      const thisSessionId = ++sessionIdRef.current;

      stopSpeech();
      cleanupAudioInput();
      setVoiceState('processing');
      setTranscript(cleanInput);
      setInterimTranscript('');
      setErrorMessage(null);

      const isEmergencyQuery = EMERGENCY_REGEX.test(cleanInput);
      if (isEmergencyQuery) {
        setIsEmergencyDetected(true);
      }

      try {
        // Call the real backend route with proper headers & payload
        const apiRes = await safeApiFetch<{ voiceReply: string; isEmergency?: boolean }>(
          '/api/ai/voice-respond',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              spokenText: cleanInput,
              language: commLanguage,
              userProfile: user?.healthProfile,
            }),
          }
        );

        // Discard if user already initiated a new query
        if (sessionIdRef.current !== thisSessionId) {
          return;
        }

        if (apiRes.success && apiRes.data?.voiceReply) {
          const reply = apiRes.data.voiceReply;
          const isEmergency = Boolean(apiRes.data.isEmergency || isEmergencyQuery);

          setLastResponse(reply);
          if (isEmergency) {
            setIsEmergencyDetected(true);
          }
          speakText(reply);
        } else {
          // Honest backend failure handling - DO NOT silently fabricate answers
          const failMsg =
            apiRes.message ||
            apiRes.error ||
            'Unable to reach the Healthcare AI service. Please check your internet connection or use typed input below.';
          setErrorMessage(failMsg);
          setVoiceState('error');
        }
      } catch (err: any) {
        if (sessionIdRef.current !== thisSessionId) return;
        console.error('Error contacting backend AI:', err);
        setErrorMessage(
          err?.message || 'Connection error contacting Welora AI. Typed input remains available.'
        );
        setVoiceState('error');
      }
    },
    [cleanupAudioInput, commLanguage, speakText, stopSpeech, user?.healthProfile]
  );

  // Start real-time audio analyzer using Web Audio API on the granted microphone stream
  const attachAudioAnalyzer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current || !isListeningRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Normalize 0 - 100 based on actual mic energy
        const normalized = Math.min(Math.round((avg / 128) * 100), 100);
        setAudioLevel(normalized);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('Audio analysis initialization note:', err);
    }
  };

  // Start speech recognition with verified permission & state lifecycle
  const startListening = async () => {
    if (isStartingRef.current || isListeningRef.current) {
      return;
    }

    isStartingRef.current = true;
    stopSpeech();
    setErrorMessage(null);
    setTranscript('');
    setInterimTranscript('');
    hasSubmittedRef.current = false;

    // Check browser Web Speech API support
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      isStartingRef.current = false;
      setErrorMessage(
        `Web Speech Recognition is not natively supported in this browser window. Please use the typed input box below or select one of the test queries.`
      );
      setVoiceState('error');
      return;
    }

    // Step 1: Transition to 'requesting_permission' state
    setVoiceState('requesting_permission');

    let stream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        attachAudioAnalyzer(stream);
      }
    } catch (err: any) {
      isStartingRef.current = false;
      cleanupAudioInput();
      console.warn('Microphone permission or hardware access notice:', err);

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Microphone permission was denied. Please allow microphone access in your browser address bar or use typed input below.'
        );
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setErrorMessage(
          'No microphone was found on this device. You can type your query in the box below.'
        );
      } else {
        setErrorMessage(
          `Microphone initialization error: ${err?.message || 'Access blocked'}. Typed input is ready.`
        );
      }
      setVoiceState('error');
      return;
    }

    // Step 2: Initialize Speech Recognition instance
    try {
      // Abort any existing instance if present
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRec();
      const targetCodes = [sttConfig.primaryCode, ...sttConfig.fallbackCodes];
      recognition.lang = targetCodes[0];
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      let finalCaptured = '';

      recognition.onstart = () => {
        isStartingRef.current = false;
        isListeningRef.current = true;
        setVoiceState('listening');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalCaptured += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (interim) {
          setInterimTranscript(interim);
        }
        if (finalCaptured) {
          setTranscript(finalCaptured);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        isStartingRef.current = false;
        isListeningRef.current = false;
        cleanupAudioInput();

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMessage(
            'Microphone access was denied or blocked by browser permissions policy. Please use the typed input box below.'
          );
          setVoiceState('error');
        } else if (event.error === 'language-not-supported') {
          setErrorMessage(
            `Speech recognition locale "${sttConfig.primaryCode}" is not supported by your browser engine. You can type in ${commLanguage} below.`
          );
          setVoiceState('error');
        } else if (event.error === 'no-speech') {
          // No speech heard: return cleanly to idle without a red error card
          setVoiceState('idle');
        } else if (event.error === 'aborted') {
          // Intentionally aborted
          setVoiceState('idle');
        } else {
          setErrorMessage(`Speech recognition notice: ${event.error}. You can also type your question.`);
          setVoiceState('error');
        }
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        isListeningRef.current = false;
        cleanupAudioInput();

        // Submit only once per session
        const spoken = (finalCaptured || interimTranscript).trim();
        if (spoken && !hasSubmittedRef.current) {
          hasSubmittedRef.current = true;
          processSpokenInput(spoken);
        } else if (!hasSubmittedRef.current) {
          setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      isStartingRef.current = false;
      isListeningRef.current = false;
      cleanupAudioInput();
      console.error('Failed to start speech recognition:', err);
      setErrorMessage(
        `Failed to start speech recognition (${err?.message || 'Unknown error'}). Typed input is ready below.`
      );
      setVoiceState('error');
    }
  };

  // Stop listening gracefully
  const stopListening = () => {
    isListeningRef.current = false;
    isStartingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    cleanupAudioInput();
    setVoiceState('idle');
  };

  // Submit typed query through the REAL backend AI flow
  const handleTypedSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedInput.trim()) return;
    const text = typedInput.trim();
    setTypedInput('');
    processSpokenInput(text);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      isStartingRef.current = false;
      stopSpeech();
      cleanupAudioInput();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [cleanupAudioInput, stopSpeech]);

  const sampleQueries =
    SAMPLE_QUERIES_BY_LANG[commLanguage] || SAMPLE_QUERIES_BY_LANG.English;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0B1724] text-[#F4F8FB] p-3 sm:p-6 overflow-x-hidden overflow-y-auto w-full max-w-full animate-fadeIn select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full max-w-5xl mx-auto z-30 shrink-0 gap-2 pb-2 border-b border-[#1E354A]/60 sm:border-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <WeloraLogo size="sm" showSubtitle={false} horizontal />
          <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#142536] border border-[#20B8A8]/30 text-[#66D9E8] text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-[#20B8A8] animate-pulse" />
            <span>
              Voice Avatar • {commLanguage} ({sttConfig.primaryCode})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Communication Language Selector for all 13 supported languages */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#142536] border border-[#1E354A] text-xs text-[#94A3B8] hover:border-[#20B8A8]/50 transition-colors">
            <Globe className="w-3.5 h-3.5 text-[#20B8A8] shrink-0" />
            <select
              value={commLanguage}
              onChange={(e) => {
                const target = e.target.value;
                setCommLanguage(target);
                setCommunicationLanguage(target);
                stopSpeech();
                stopListening();
              }}
              className="bg-transparent text-[#20B8A8] font-bold outline-none cursor-pointer text-xs max-w-[100px] sm:max-w-none truncate"
              aria-label="Select Voice Language"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.name} className="bg-[#142536] text-[#F4F8FB]">
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {/* Mute audio toggle */}
          <button
            type="button"
            onClick={() => {
              setIsMuted(!isMuted);
              if (!isMuted) stopSpeech();
            }}
            className={`p-2 rounded-xl border transition-colors shrink-0 ${
              isMuted
                ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]'
                : 'bg-[#142536] border-[#1E354A] text-[#94A3B8] hover:text-[#F4F8FB]'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Close Session Button */}
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              stopListening();
              onClose();
            }}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#142536] hover:bg-[#1A3044] text-[#F4F8FB] text-xs font-bold border border-[#1E354A] hover:border-[#20B8A8]/60 transition-all flex items-center gap-1.5 shrink-0 active:scale-95 shadow-md"
            title="Close Voice Avatar Mode"
            aria-label="Close Voice Avatar Mode"
          >
            <X className="w-4 h-4 text-[#94A3B8]" />
            <span>{t('close', 'Close')}</span>
          </button>
        </div>
      </div>

      {/* Emergency Alert Banner if Detected */}
      {isEmergencyDetected && (
        <div className="w-full max-w-3xl mx-auto my-2 p-3.5 rounded-2xl bg-[#EF4444]/20 border-2 border-[#EF4444] text-[#F4F8FB] text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl shadow-[#EF4444]/25 animate-pulse-gentle">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
            <span>
              <strong className="text-[#EF4444]">{t('emergencyWarning', 'EMERGENCY WARNING DETECTED')}:</strong>{' '}
              {t('criticalAlert', 'Immediate Emergency Evaluation Required.')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCallConfirm(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-black text-xs flex items-center gap-1 shadow"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{t('callNow', 'Call 108')}</span>
            </button>
            <button
              onClick={onOpenSOS}
              className="px-3.5 py-1.5 rounded-xl bg-[#142536] text-[#EF4444] border border-[#EF4444]/40 font-bold text-xs hover:bg-[#1A3044]"
            >
              {t('sosButton', 'Open SOS')}
            </button>
          </div>
        </div>
      )}

      {/* Central Animated Circular Avatar Interface mapped directly to real state machine */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-4">
        <div className="relative flex items-center justify-center">
          {/* Listening State: Concentric Rings scaled to REAL audioLevel (Audio Input) */}
          {voiceState === 'listening' && (
            <>
              <div
                className="absolute rounded-full border border-[#66D9E8]/40 transition-transform duration-75 ease-out"
                style={{
                  width: `${260 + audioLevel * 1.5}px`,
                  height: `${260 + audioLevel * 1.5}px`,
                  opacity: 0.3 + (audioLevel / 100) * 0.5,
                }}
              />
              <div
                className="absolute rounded-full border-2 border-[#20B8A8]/60 transition-transform duration-75 ease-out animate-pulse"
                style={{
                  width: `${220 + audioLevel * 1.0}px`,
                  height: `${220 + audioLevel * 1.0}px`,
                  opacity: 0.4 + (audioLevel / 100) * 0.6,
                }}
              />
              <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-[#66D9E8]/20 animate-ping opacity-30" />
            </>
          )}

          {/* Speaking State: Harmonic Concentric Sound Waves (Audio Output) */}
          {voiceState === 'speaking' && (
            <>
              <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border-2 border-[#20B8A8]/40 animate-ping opacity-40 duration-1000" />
              <div className="absolute w-60 h-60 sm:w-80 sm:h-80 rounded-full border border-[#66D9E8]/50 animate-pulse" />
              <div className="absolute w-52 h-52 sm:w-68 sm:h-68 rounded-full bg-[#20B8A8]/10 blur-xl animate-pulse" />
            </>
          )}

          {/* Processing State: Multi-Tiered Rotating Gyroscopic Hologram Rings */}
          {voiceState === 'processing' && (
            <>
              <div className="absolute w-60 h-60 sm:w-76 sm:h-76 rounded-full border-2 border-dashed border-[#66D9E8]/50 animate-spin" />
              <div className="absolute w-52 h-52 sm:w-68 sm:h-68 rounded-full border-2 border-[#20B8A8]/60 border-t-transparent border-b-transparent animate-spin duration-700" />
            </>
          )}

          {/* Requesting Permission State: Pulsing Prompt Rings */}
          {voiceState === 'requesting_permission' && (
            <div className="absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 border-amber-400/60 animate-pulse" />
          )}

          {/* Error State: Red Accent Halo */}
          {voiceState === 'error' && (
            <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30" />
          )}

          {/* Idle State: Calm, Subtle Medical Teal Halo Breathing Glow */}
          {voiceState === 'idle' && (
            <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-[#20B8A8]/5 border border-[#20B8A8]/20 animate-pulse duration-3000" />
          )}

          {/* Main Interactive Circular Avatar Core */}
          <button
            type="button"
            onClick={() => {
              if (voiceState === 'listening') {
                stopListening();
              } else if (voiceState === 'speaking') {
                stopSpeech();
              } else {
                startListening();
              }
            }}
            style={{
              transform:
                voiceState === 'listening'
                  ? `scale(${1.02 + Math.min(audioLevel / 200, 0.12)})`
                  : undefined,
            }}
            className={`relative z-10 w-48 h-48 sm:w-60 sm:h-60 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#20B8A8] ${
              voiceState === 'listening'
                ? 'bg-gradient-to-tr from-[#142536] via-[#20B8A8] to-[#66D9E8] shadow-[#20B8A8]/70 ring-8 ring-[#20B8A8]/40 text-[#0B1724]'
                : voiceState === 'speaking'
                ? 'bg-gradient-to-tr from-[#0B1724] via-[#142536] to-[#20B8A8] shadow-[#66D9E8]/50 ring-8 ring-[#66D9E8]/40 text-[#F4F8FB]'
                : voiceState === 'processing'
                ? 'bg-gradient-to-tr from-[#0B1724] via-[#142536] to-[#1A3044] shadow-[#66D9E8]/30 ring-4 ring-[#66D9E8]/20'
                : voiceState === 'requesting_permission'
                ? 'bg-gradient-to-tr from-[#142536] via-amber-950 to-[#142536] border-2 border-amber-400/60 text-amber-300 shadow-amber-500/20'
                : voiceState === 'error'
                ? 'bg-gradient-to-tr from-[#0B1724] via-[#142536] to-[#0B1724] border-2 border-[#EF4444]/60 text-[#EF4444] shadow-[#EF4444]/20'
                : 'bg-gradient-to-tr from-[#0B1724] via-[#142536] to-[#0B1724] border-2 border-[#20B8A8]/50 hover:border-[#66D9E8] shadow-[#142536]/90'
            }`}
          >
            {/* Visual Iconography & Animated Labels Inside Core */}
            {voiceState === 'listening' ? (
              <div className="flex flex-col items-center text-[#0B1724] px-4 text-center">
                <Mic className="w-12 h-12 stroke-[2.5] animate-pulse" />
                <span className="text-xs font-black tracking-widest uppercase mt-2">
                  {t('listening', 'Listening...')}
                </span>
                <span className="text-[10px] font-bold opacity-80 mt-0.5">
                  Tap to Stop
                </span>
              </div>
            ) : voiceState === 'speaking' ? (
              <div className="flex flex-col items-center text-[#66D9E8] px-4 text-center">
                <Volume2 className="w-12 h-12 animate-bounce stroke-[2.2]" />
                <span className="text-xs font-black tracking-widest uppercase mt-2 text-[#F4F8FB]">
                  {t('speaking', 'Welora Speaking')}
                </span>
                <span className="text-[10px] font-semibold text-[#66D9E8] mt-0.5 flex items-center gap-1">
                  <Square className="w-2.5 h-2.5 fill-current" /> Tap to Stop
                </span>
              </div>
            ) : voiceState === 'processing' ? (
              <div className="flex flex-col items-center text-[#66D9E8] px-4 text-center">
                <RefreshCw className="w-10 h-10 animate-spin" />
                <span className="text-xs font-bold tracking-widest uppercase mt-2">
                  {t('thinking', 'Consulting AI...')}
                </span>
              </div>
            ) : voiceState === 'requesting_permission' ? (
              <div className="flex flex-col items-center text-amber-300 px-4 text-center">
                <Loader2 className="w-10 h-10 animate-spin" />
                <span className="text-xs font-bold tracking-widest uppercase mt-2">
                  Allow Mic
                </span>
                <span className="text-[10px] text-amber-200/80 mt-0.5">
                  Check Browser Prompt
                </span>
              </div>
            ) : voiceState === 'error' ? (
              <div className="flex flex-col items-center text-[#EF4444] px-4 text-center">
                <MicOff className="w-10 h-10 text-[#EF4444]" />
                <span className="text-xs font-bold tracking-widest uppercase mt-2">
                  Tap to Retry
                </span>
                <span className="text-[10px] text-[#94A3B8] mt-0.5">
                  Or use typed chat
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-[#20B8A8] px-4 text-center group">
                <div className="p-3 rounded-full bg-[#20B8A8]/10 group-hover:bg-[#20B8A8]/20 transition-colors">
                  <Mic className="w-10 h-10 text-[#66D9E8] group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-extrabold tracking-widest uppercase mt-2 text-[#66D9E8]">
                  {t('tapToSpeak', 'Tap to Speak')}
                </span>
                <span className="text-[10px] text-[#94A3B8] font-medium mt-0.5">
                  {commLanguage} ({selectedLangObj.nativeName})
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Real-time Dynamic Waveform Equalizer Display */}
        <div className="h-10 flex items-center justify-center gap-1.5 mt-5">
          {voiceState === 'listening' ? (
            // Dynamic Audio Input Equalizer responsive to live microphone volume
            [12, 28, 50, 75, 90, 60, 40, 20, 10].map((baseHeight, i) => {
              const dynamicHeight = Math.max(
                8,
                Math.min(baseHeight * (0.3 + (audioLevel / 100) * 1.4), 38)
              );
              return (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-[#20B8A8] to-[#66D9E8] rounded-full transition-all duration-75"
                  style={{ height: `${dynamicHeight}px` }}
                />
              );
            })
          ) : voiceState === 'speaking' ? (
            // Dynamic Audio Output Equalizer during Welora speech
            speechVolumeBars.map((height, i) => (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-[#66D9E8] to-[#20B8A8] rounded-full transition-all duration-100 animate-pulse"
                style={{ height: `${Math.max(8, height * 0.45)}px` }}
              />
            ))
          ) : voiceState === 'processing' ? (
            <div className="flex items-center gap-1.5 text-xs text-[#66D9E8] font-mono tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#66D9E8] animate-ping" />
              <span>CLINICAL AI TRIAGE</span>
            </div>
          ) : voiceState === 'requesting_permission' ? (
            <div className="text-xs text-amber-300 font-medium animate-pulse">
              Requesting microphone permission...
            </div>
          ) : (
            <div className="flex items-center gap-1 opacity-40">
              {[8, 14, 20, 14, 8].map((h, i) => (
                <div key={i} className="w-1 bg-[#20B8A8] rounded-full" style={{ height: `${h}px` }} />
              ))}
            </div>
          )}
        </div>

        {/* Avatar Status Label & Speech Output Display */}
        <div className="mt-2 text-center max-w-2xl px-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#66D9E8] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#66D9E8]" />
            <span>
              {voiceState === 'requesting_permission'
                ? 'Microphone Permission Prompt'
                : voiceState === 'listening'
                ? `Listening in ${commLanguage} (${selectedLangObj.nativeName})...`
                : voiceState === 'speaking'
                ? `Welora Speaking (${commLanguage})`
                : voiceState === 'processing'
                ? 'Processing response via Gemini Healthcare Engine...'
                : voiceState === 'error'
                ? 'Action Required'
                : `${t('voiceAssistant', 'Natural Voice Companion')} • ${selectedLangObj.nativeName}`}
            </span>
          </div>

          {/* Current Spoken Transcript / Live Interim Stream or Avatar's Last Spoken Reply */}
          {voiceState === 'listening' && (transcript || interimTranscript) ? (
            <div className="p-3 rounded-2xl bg-[#142536]/80 border border-[#20B8A8]/40 max-w-xl mx-auto shadow-inner">
              <p className="text-base sm:text-lg font-medium text-[#66D9E8] italic">
                &ldquo;{transcript} {interimTranscript}&rdquo;
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#142536]/60 border border-[#1E354A] max-w-xl mx-auto">
              <p className="text-sm sm:text-base text-[#F4F8FB] font-normal leading-relaxed">
                &ldquo;{lastResponse}&rdquo;
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl max-w-md mx-auto flex items-start justify-between gap-3 text-left">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={startListening}
                className="shrink-0 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg font-bold"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* 13-Language Interactive 1-Click Clinical Test Queries */}
        <div className="mt-4 w-full max-w-2xl px-2">
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider text-center mb-2 flex items-center justify-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#20B8A8]" />
            <span>1-Click Test Scenarios (Real AI Backend + Voice):</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => processSpokenInput(q.text)}
                disabled={voiceState === 'processing'}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                  q.isSos
                    ? 'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border-[#EF4444]/50 text-[#EF4444]'
                    : 'bg-[#142536] hover:bg-[#1A3044] border-[#1E354A] hover:border-[#20B8A8]/50 text-[#F4F8FB]'
                }`}
                title={q.text}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Typed Input Fallback (Connected to Real Backend AI) */}
        <form
          onSubmit={handleTypedSubmit}
          className="mt-3 w-full max-w-xl px-4 flex items-center gap-2"
        >
          <input
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder={`Type a question in ${commLanguage} (${selectedLangObj.nativeName})...`}
            className="flex-1 bg-[#142536] border border-[#1E354A] rounded-xl px-3.5 py-2 text-xs text-[#F4F8FB] placeholder-[#94A3B8] outline-none focus:border-[#20B8A8]"
          />
          <button
            type="submit"
            disabled={!typedInput.trim() || voiceState === 'processing'}
            className="px-4 py-2 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] disabled:opacity-40 text-[#0B1724] font-bold text-xs flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('send', 'Send')}</span>
          </button>
        </form>
      </div>

      {/* Bottom Controls Strip */}
      <div className="w-full max-w-3xl mx-auto z-20 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 pt-3 border-t border-[#1E354A] shrink-0">
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <span>{t('commLangLabel', 'Language')}:</span>
          <strong className="text-[#20B8A8]">{commLanguage}</strong>
          <span>•</span>
          <span className="font-mono text-[11px] text-[#66D9E8]">{sttConfig.primaryCode}</span>
          <span>•</span>
          <span>{isMuted ? 'Muted' : 'Audio Active'}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (voiceState === 'speaking') {
                stopSpeech();
              } else if (lastResponse) {
                speakText(lastResponse);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/40 text-xs text-[#F4F8FB] flex items-center gap-1.5 transition-colors"
          >
            {voiceState === 'speaking' ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current text-[#EF4444]" />
                <span>{t('stopSiren', 'Stop Speaking')}</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('replayAudio', 'Replay')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (voiceState === 'listening' || voiceState === 'requesting_permission') {
                stopListening();
              } else {
                startListening();
              }
            }}
            className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8] ${
              voiceState === 'listening' || voiceState === 'requesting_permission'
                ? 'bg-[#EF4444] text-white shadow-[#EF4444]/30 hover:bg-[#DC2626]'
                : 'bg-[#20B8A8] text-[#0B1724] shadow-[#20B8A8]/30 hover:bg-[#1AA394]'
            }`}
          >
            {voiceState === 'listening' || voiceState === 'requesting_permission' ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>{t('speakToWelora', 'Speak to Welora')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Emergency Call confirmation modal */}
      <EmergencyCallConfirmModal
        isOpen={showCallConfirm}
        serviceName="National Emergency Ambulance"
        phoneNumber="108"
        onConfirm={() => setShowCallConfirm(false)}
        onCancel={() => setShowCallConfirm(false)}
        language={commLanguage}
      />
    </div>
  );
};
