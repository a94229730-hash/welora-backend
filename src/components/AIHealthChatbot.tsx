import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Volume2,
  VolumeX,
  AlertTriangle,
  Sparkles,
  Bot,
  User as UserIcon,
  BookmarkPlus,
  Check,
  PhoneCall,
  Loader2,
} from 'lucide-react';
import { ChatMessage, User } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/languages';
import { EmergencyCallConfirmModal } from './EmergencyCallConfirmModal';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface AIHealthChatbotProps {
  user: User | null;
  onOpenSOS: () => void;
  onSaveToHistory: (record: any) => void;
  language?: string;
}

const CHAT_GREETINGS: Record<string, string> = {
  English: 'Hello! I am Welora, your AI Health Assistant. How can I help you understand your symptoms, medications, or general health today?',
  Hindi: 'नमस्ते! मैं वेलोरा हूँ, आपकी AI स्वास्थ्य सहायक। मैं आज आपके लक्षणों, दवाओं या सामान्य स्वास्थ्य को समझने में कैसे मदद कर सकती हूँ?',
  Marathi: 'नमस्कार! मी वेलोरा आहे, तुमची AI आरोग्य सहाय्यक. आज मी तुम्हाला तुमची लक्षणे, औषधे किंवा आरोग्याविषयी कशी मदत करू शकते?',
  Bengali: 'নমস্কার! আমি ওয়েলোরা, আপনার AI স্বাস্থ্য সহকারী। আজ আপনার উপসর্গ, ওষুধ বা স্বাস্থ্য সম্পর্কে আমি কীভাবে সাহায্য করতে পারি?',
  Gujarati: 'નમસ્તે! હું વેલોરા છું, તમારી AI સ્વાસ્થ્ય સહાયક. આજે હું તમારા લક્ષણો અથવા દવાઓ સમજવામાં કેવી રીતે મદદ કરી શકું?',
  Kannada: 'ನಮಸ್ಕಾರ! ನಾನು ವೆಲೋರಾ, ನಿಮ್ಮ AI ಆರೋಗ್ಯ ಸಹಾಯಕ. ಇಂದು ನಿಮ್ಮ ಆರೋಗ್ಯ ಅಥವಾ ಔಷಧಿಗಳ ಬಗ್ಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
  Tamil: 'வணக்கம்! நான் வெலோரா, உங்கள் AI மருத்துவ உதவியாளர். இன்று உங்கள் அறிகுறிகள் அல்லது மருந்துகளைப் பற்றி அறிய நான் எவ்வாறு உதவ முடியும்?',
  Telugu: 'నమస్కారం! నేను వెలోరా, మీ AI ఆరోగ్య సహాయకుడిని. ఈరోజు మీ లక్షణాలు లేదా ఔషధాల గురించి తెలుసుకోవడంలో నేను ఎలా సహాయపడగలను?',
  Malayalam: 'നമസ്കാരം! ഞാൻ വെലോറ, നിങ്ങളുടെ AI ആരോഗ്യ സഹായി. ഇന്ന് നിങ്ങളുടെ ലക്ഷണങ്ങളെക്കുറിച്ചോ മരുന്നുകളെക്കുറിച്ചോ അറിയാൻ ഞാൻ എങ്ങനെ സഹായിക്കണം?',
  Punjabi: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਵਿਲੋਰਾ ਹਾਂ, ਤੁਹਾਡੀ AI ਸਿਹਤ ਸਹਾਇਕ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੇ ਲੱਛਣਾਂ ਜਾਂ ਦਵਾਈਆਂ ਬਾਰੇ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?',
  Odia: 'ନମସ୍କାର! ମୁଁ ୱେଲୋରା, ଆପଣଙ୍କ AI ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ। ଆଜି ଆପଣଙ୍କ ଲକ୍ଷଣ କିମ୍ବା ଔଷଧ ବିଷୟରେ ମୁଁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?',
  Assamese: 'নমস্কাৰ! মই ৱেলোৰা, আপোনাৰ AI স্বাস্থ্য সহায়ক। আজি মই আপোনাৰ লক্ষণ বা ঔষধৰ বিষয়ে কেনেকৈ সহায় কৰিব পাৰো?',
  Urdu: 'السلام علیکم! میں ویلورا ہوں، آپ کی AI ہیلتھ اسسٹنٹ۔ آج میں آپ کی علامات یا ادویات کو سمجھنے میں کس طرح مدد کر سکتی ہوں؟',
};

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  English: [
    'Common causes of morning headaches',
    'Safe home relief for dry scratchy cough',
    'How does blood pressure medication work?',
  ],
  Hindi: [
    'सुबह सिरदर्द होने के मुख्य कारण',
    'सूखी खांसी के सुरक्षित घरेलू उपाय',
    'ब्लड प्रेशर की दवा कैसे काम करती है?',
  ],
  Marathi: [
    'सकाळी डोकेदुखी होण्याची सामान्य कारणे',
    'कोरड्या खोकल्यावर सुरक्षित घरगुती उपाय',
    'रक्तदाबाची औषधे कशी कार्य करतात?',
  ],
};

export const AIHealthChatbot: React.FC<AIHealthChatbotProps> = ({
  user,
  onOpenSOS,
  onSaveToHistory,
}) => {
  const { communicationLanguage, displayLanguage, t } = useLanguage();
  const commLanguage = communicationLanguage || displayLanguage || 'English';
  const langObj = SUPPORTED_LANGUAGES.find((l) => l.name === commLanguage) || SUPPORTED_LANGUAGES[0];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content: CHAT_GREETINGS[commLanguage] || CHAT_GREETINGS.English,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [showCallConfirm, setShowCallConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [
          {
            ...prev[0],
            content: CHAT_GREETINGS[commLanguage] || CHAT_GREETINGS.English,
          },
        ];
      }
      return prev;
    });
  }, [commLanguage]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    const isEmergencyUser = /chest pain|heart attack|cannot breathe|108|112|stroke|poison|unconscious/i.test(text);

    try {
      const apiRes = await safeApiFetch<any>('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          userProfile: user?.healthProfile,
          language: commLanguage,
        }),
      });

      let replyContent = '';
      let isEmergency = isEmergencyUser;

      if (apiRes.success && apiRes.data?.reply) {
        replyContent = apiRes.data.reply;
        isEmergency = Boolean(apiRes.data.isEmergency || isEmergencyUser);
      } else {
        // Resilient fallback (ensures Netlify static and offline works)
        if (isEmergencyUser) {
          replyContent = `EMERGENCY ALERT: Your reported symptoms indicate acute medical urgency. Please dial 108 or 112 immediately or reach the nearest emergency trauma center without delay.`;
          isEmergency = true;
        } else {
          replyContent = `I have noted your inquiry regarding "${text.slice(0, 80)}". For safe management, please maintain good hydration, rest comfortably, and consult a qualified healthcare provider if symptoms persist or worsen.`;
        }
      }

      const assistantMessage: ChatMessage = {
        id: 'ast_' + Date.now(),
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isEmergency,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const fallbackMsg: ChatMessage = {
        id: 'ast_' + Date.now(),
        role: 'assistant',
        content: `I have noted your inquiry regarding "${text.slice(0, 80)}". Please rest comfortably, drink warm fluids, and consult a healthcare provider if symptoms persist.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isEmergency: isEmergencyUser,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
    setMessages([
      {
        id: 'msg_welcome_' + Date.now(),
        role: 'assistant',
        content: CHAT_GREETINGS[commLanguage] || CHAT_GREETINGS.English,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSpeakMessage = (msg: ChatMessage) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingMsgId === msg.id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingMsgId(msg.id);

    const clean = msg.content.replace(/[*_#`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = langObj.code;
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const prefix = langObj.code.split('-')[0].toLowerCase();
    const matchingVoice = voices.find(
      (v) =>
        v.lang.toLowerCase() === langObj.code.toLowerCase() ||
        v.lang.toLowerCase().startsWith(prefix)
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      setSpeakingMsgId(null);
    };
    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSaveMessage = (msg: ChatMessage) => {
    onSaveToHistory({
      type: 'symptom_consult',
      title: `AI Health Chat Consultation (${commLanguage})`,
      date: new Date().toLocaleDateString('en-GB'),
      summary: msg.content.slice(0, 150) + '...',
      payload: { conversationSnippet: msg.content },
    });
    setSavedSuccessId(msg.id);
    setTimeout(() => setSavedSuccessId(null), 3000);
  };

  const promptSuggestions =
    SUGGESTED_PROMPTS[commLanguage] || SUGGESTED_PROMPTS.English;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[550px] animate-fadeIn pb-4">
      {/* Header bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#142536] border border-[#20B8A8]/25 flex items-center justify-between gap-4 shadow-xl mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B1724] border border-[#20B8A8]/30 flex items-center justify-center text-[#66D9E8]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#F4F8FB] flex items-center gap-2">
              <span>{t('aiAssistant', 'AI Avatar Health Assistant')}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0B1724] border border-[#20B8A8]/40 text-[#20B8A8] font-semibold">
                {commLanguage} ({langObj.nativeName})
              </span>
            </h2>
            <p className="text-xs text-[#94A3B8]">
              {t('tagline', 'Continuous multi-turn health guidance with clinical context and voice playback')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearChat}
          className="px-3 py-1.5 rounded-xl bg-[#0B1724] border border-[#1E354A] hover:border-[#20B8A8]/40 text-xs text-[#94A3B8] hover:text-[#F4F8FB] transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
          title={t('clearChat', 'Clear Chat')}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('clearChat', 'Clear Chat')}</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2 rounded-2xl bg-[#0B1724]/70 border border-[#1E354A] p-4 sm:p-6">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSpeaking = speakingMsgId === msg.id;
          const isSaved = savedSuccessId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-fadeIn`}
            >
              <div
                className={`flex items-start gap-2.5 max-w-[88%] sm:max-w-[78%] ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-[#20B8A8] text-[#0B1724]'
                      : msg.isEmergency
                      ? 'bg-[#EF4444] text-white animate-pulse'
                      : 'bg-[#142536] border border-[#20B8A8]/30 text-[#66D9E8]'
                  }`}
                >
                  {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-md ${
                    isUser
                      ? 'bg-[#20B8A8] text-[#0B1724] font-medium rounded-tr-none'
                      : msg.isEmergency
                      ? 'bg-[#EF4444]/20 border border-[#EF4444] text-[#F4F8FB] rounded-tl-none'
                      : 'bg-[#142536] border border-[#1E354A] text-[#F4F8FB] rounded-tl-none'
                  }`}
                >
                  {msg.isEmergency && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#EF4444] uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                      <span>{t('criticalAlert', 'URGENT MEDICAL ALERT')}</span>
                    </div>
                  )}

                  <div>{msg.content}</div>

                  {msg.isEmergency && (
                    <div className="mt-3 pt-2.5 border-t border-[#EF4444]/30 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCallConfirm(true)}
                        className="px-3 py-1 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>{t('callNow', 'Call 108')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={onOpenSOS}
                        className="px-3 py-1 rounded-lg bg-[#142536] text-[#EF4444] border border-[#EF4444]/40 text-xs font-semibold hover:bg-[#1A3044]"
                      >
                        {t('sosButton', 'Open SOS')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Message metadata and actions */}
              <div
                className={`flex items-center gap-3 text-[10px] text-[#94A3B8] px-1 ${
                  isUser ? 'pr-9' : 'pl-9'
                }`}
              >
                <span>{msg.timestamp}</span>
                {!isUser && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSpeakMessage(msg)}
                      className={`hover:text-[#20B8A8] flex items-center gap-1 transition-colors ${
                        isSpeaking ? 'text-[#20B8A8] font-bold' : ''
                      }`}
                      title={isSpeaking ? t('stopSiren', 'Stop Reading') : t('replayAudio', 'Read Aloud')}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3 h-3" />
                          <span>{t('stopSiren', 'Stop')}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span>{t('replayAudio', 'Speak')}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveMessage(msg)}
                      className="hover:text-[#20B8A8] flex items-center gap-1 transition-colors"
                      title={t('saveToHistory', 'Save to History')}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3 h-3 text-[#20B8A8]" />
                          <span className="text-[#20B8A8]">Saved ✓</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3 h-3" />
                          <span>{t('saveToHistory', 'Save')}</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 pl-9 text-[#94A3B8] text-xs animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-[#20B8A8]" />
            <span>Welora is analyzing clinical context in {commLanguage}...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested quick prompt chips */}
      <div className="py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
        <span className="text-[11px] text-[#94A3B8] shrink-0">Suggestions:</span>
        {promptSuggestions.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(prompt)}
            className="px-3 py-1 rounded-full bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/50 text-[#94A3B8] hover:text-[#F4F8FB] shrink-0 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-2 sm:p-2.5 rounded-2xl bg-[#142536] border border-[#1E354A] flex items-center gap-2 shadow-xl shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Type a health question in ${commLanguage} (${langObj.nativeName})...`}
          className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-[#F4F8FB] placeholder-[#94A3B8] outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] disabled:opacity-40 text-[#0B1724] font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#20B8A8]/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">{t('send', 'Send')}</span>
        </button>
      </form>

      {/* Call confirmation popup */}
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
