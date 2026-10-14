import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Stethoscope,
  Activity,
  Pill,
  Clock,
  ShieldCheck,
  CheckCircle,
  BookmarkPlus,
  Loader2,
  ChevronRight,
  Info,
  Volume2,
  VolumeX,
  PhoneCall,
} from 'lucide-react';
import { User } from '../types';
import { EmergencyCallConfirmModal } from './EmergencyCallConfirmModal';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface SymptomCheckerProps {
  user: User | null;
  onOpenSOS: () => void;
  onSaveToHistory: (record: any) => void;
  language?: string;
}

export const SymptomChecker: React.FC<SymptomCheckerProps> = ({
  user,
  onOpenSOS,
  onSaveToHistory,
}) => {
  const { t, communicationLanguage, displayLanguage } = useLanguage();
  const activeLanguage = communicationLanguage || displayLanguage || 'English';

  const [symptomsInput, setSymptomsInput] = useState('');
  const [duration, setDuration] = useState('1-3 days');
  const [severity, setSeverity] = useState('Moderate');
  const [age, setAge] = useState<number>(user?.healthProfile?.age || 30);
  const [allergies, setAllergies] = useState<string>(
    user?.healthProfile?.allergies?.join(', ') || 'None reported'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);

  // SOS Signal & Siren Alert state
  const [isSosSignalActive, setIsSosSignalActive] = useState(false);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<any>(null);

  const stopSirenAudio = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {}
      oscRef.current = null;
    }
    setIsSirenPlaying(false);
  };

  const startSosSignal = (isCritical: boolean) => {
    setIsSosSignalActive(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      stopSirenAudio();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isCritical ? 'sawtooth' : 'sine';
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);

      const baseFreq = isCritical ? 600 : 720;
      const peakFreq = isCritical ? 960 : 860;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.start();
      oscRef.current = osc;
      gainRef.current = gain;
      setIsSirenPlaying(true);

      let high = false;
      intervalRef.current = setInterval(() => {
        if (!oscRef.current || !audioCtxRef.current) return;
        const now = audioCtxRef.current.currentTime;
        oscRef.current.frequency.cancelScheduledValues(now);
        oscRef.current.frequency.linearRampToValueAtTime(high ? peakFreq : baseFreq, now + 0.32);
        high = !high;
      }, 350);

      // Auto-stop siren audio after 10 seconds to avoid disturbing user continuously
      setTimeout(() => {
        stopSirenAudio();
      }, 10000);
    } catch (e) {
      console.warn('AudioContext SOS signal initialization:', e);
      setIsSirenPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      stopSirenAudio();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  const quickSymptoms = [
    { label: 'Fever & Fatigue', text: 'Low-grade fever with mild body ache and fatigue' },
    { label: 'Throat & Cough', text: 'Dry cough and scratchy sore throat' },
    { label: 'Stomach Pain & Acidity', text: 'Upper abdominal burning and acid reflux after meals' },
    { label: 'Severe Chest Pressure (Demo SOS)', text: 'Sudden crushing chest pressure radiating to left arm and shortness of breath' },
  ];

  const generateClientAssessment = (params: {
    symptoms: string;
    duration: string;
    severity: string;
    age: number;
    allergies: string;
    language?: string;
  }) => {
    const { symptoms, duration, severity, allergies, language } = params;
    const symLower = symptoms.toLowerCase();
    const isEmergency = /chest pain|heart attack|cannot breathe|severe breathlessness|loss of consciousness|stroke|slurred speech|sudden weakness|poison|suicide/i.test(symLower);

    let triageLevel = 'HOME_CARE';
    if (isEmergency) {
      triageLevel = 'EMERGENCY_RED';
    } else if (severity === 'Severe' || /high fever|stiff neck|blood in vomit|black stool|severe abdominal rigidity|unbearable/i.test(symLower)) {
      triageLevel = 'URGENT_ATTENTION';
    } else if (severity === 'Moderate' || /persistent|spreading|worsening|3 days|4 days|week/i.test(symLower)) {
      triageLevel = 'ROUTINE_CARE';
    }

    const isResp = /cough|throat|cold|fever|sneeze|runny nose|congestion|flu|pharyngitis|tonsil|sinus/i.test(symLower);
    const isHead = /headache|migraine|head pain|dizziness|vertigo|temple/i.test(symLower);
    const isGI = /stomach|abdomen|nausea|vomit|diarrhea|acidity|gas|constipation|reflux|cramp|heartburn/i.test(symLower);

    let emergencyWarning: string | null = null;
    if (isEmergency) {
      emergencyWarning = language === 'Hindi'
        ? 'गंभीर चेतावनी: यह लक्षण संभावित आपातकाल का संकेत दे सकते हैं। तुरंत एम्बुलेंस 108 या 112 डायल करें।'
        : language === 'Marathi'
        ? 'अति-गंभीर इशारा: ही लक्षणे तीव्र आपत्कालीन परिस्थिती दर्शवू शकतात. तातडीने 108 किंवा 112 डायल करा.'
        : 'CRITICAL WARNING: The reported symptoms may indicate an acute medical emergency. Please contact emergency services (108 / 112) or reach the nearest hospital trauma centre immediately.';
    }

    let summary = `Clinical assessment for reported "${symptoms}" lasting ${duration} (${severity} severity). Primary presentation indicates non-critical symptomatic onset suitable for supportive home comfort and structured clinical monitoring.`;
    if (isEmergency) {
      summary = `ACUTE MEDICAL WARNING: Reported symptoms ("${symptoms}") include red-flag warning signs that indicate potential acute cardiovascular or respiratory urgency. Immediate hospital emergency assessment is required.`;
    }

    let possibleCauses: Array<{ name: string; probability: string; description: string }> = [
      {
        name: 'Acute Symptomatic Functional Reaction',
        probability: 'High',
        description: `Early clinical manifestation of reported "${symptoms}". Clinical presentation is consistent with mild self-limiting onset.`,
      },
      {
        name: 'Physical Fatigue & Immune Activation',
        probability: 'Medium',
        description: 'Systemic bodily fatigue responding well to restorative rest and oral fluid replenishment.',
      },
    ];

    if (isResp) {
      possibleCauses = [
        {
          name: 'Viral Upper Respiratory Tract Infection (URTI)',
          probability: 'High',
          description: 'Common seasonal viral infection affecting upper respiratory mucosa with mild pyrexia and mucosal irritation.',
        },
        {
          name: 'Viral Pharyngitis & Throat Irritation',
          probability: 'Medium',
          description: 'Inflammation of pharyngeal tissues presenting with scratchy throat, dry cough, and mild fatigue.',
        },
      ];
    } else if (isHead) {
      possibleCauses = [
        {
          name: 'Tension-Type Headache',
          probability: 'High',
          description: 'Bilateral steady aching discomfort commonly precipitated by physical fatigue, mental stress, or ocular strain.',
        },
        {
          name: 'Dehydration & Digital Screen Fatigue',
          probability: 'Medium',
          description: 'Cerebrovascular tightness due to inadequate fluid consumption and prolonged visual display exposure.',
        },
      ];
    } else if (isGI) {
      possibleCauses = [
        {
          name: 'Gastroesophageal Reflux & Dyspepsia',
          probability: 'High',
          description: 'Transient gastric hyperacidity and stomach lining irritation commonly triggered by spicy meals or irregular meal times.',
        },
        {
          name: 'Dietary Indigestion / Functional Gastritis',
          probability: 'Medium',
          description: 'Acute non-ulcer stomach inflammation responding to light meals and digestive hydration.',
        },
      ];
    }

    const followUpQuestions = [
      `How many days have you been experiencing "${symptoms.slice(0, 40)}"?`,
      'Have you taken your body temperature with a thermometer, and what was the reading?',
      'Are you able to swallow liquids comfortably and keep fluids down?',
      'Do you have any new symptoms such as a rash, dizziness, or shortness of breath?',
    ];

    const recommendedNextSteps = isEmergency
      ? [
          'Call national emergency ambulance (108 / 112) immediately.',
          'Sit upright, loosen tight clothing, and remain calm.',
          'Do not drive yourself; await emergency medical responders.',
        ]
      : [
          'Maintain oral hydration with 2 to 3 liters of warm water, clear broths, or electrolyte solutions daily.',
          'Ensure 8 to 9 hours of undisturbed restful sleep to support immune recovery.',
          'Monitor symptom progression twice daily and log observations in your Health Journal.',
          'Consult a general physician if symptoms do not improve after 48-72 hours or if fever exceeds 38.5°C.',
        ];

    const commonMedicinesInfo = [
      {
        genericName: 'Paracetamol (Acetaminophen) 500mg-650mg',
        intendedUse: 'Mild to moderate fever reduction and temporary body ache / headache relief.',
        precautions: 'Do not exceed 4,000 mg in 24 hours. Avoid concurrent alcohol consumption or in severe liver disease.',
        safetyNotes: 'Always check over-the-counter cough and cold combination syrups to avoid accidental duplicate paracetamol dosing.',
      },
      {
        genericName: 'Oral Rehydration Salts (ORS)',
        intendedUse: 'Maintains optimal fluid, sodium, and potassium balance during illness or dehydration.',
        precautions: 'Reconstitute accurately according to package instructions (standard 1 liter per sachet).',
        safetyNotes: 'Safe across all age groups; essential if nausea, sweating, or loose stools are present.',
      },
    ];

    const allergyAndContraindicationNotes =
      allergies && allergies.toLowerCase() !== 'none' && allergies.toLowerCase() !== 'none reported'
        ? `Patient reported known allergies: "${allergies}". Avoid all pharmaceutical formulations, excipients, or herbal extracts containing these active components.`
        : 'No known drug allergies reported. Standard over-the-counter supportive medications are generally safe when taken according to package instructions.';

    const homeCareGuidance = isEmergency
      ? ['Await emergency response team. Keep medical history and emergency contacts readily available.']
      : [
          'Hydration: Drink warm water, herbal ginger-tulsi tea, or electrolyte fluids regularly throughout the day.',
          'Rest: Minimize physical exertion and digital screen exposure to facilitate natural bodily recovery.',
          'Comfort: Keep room temperature well-ventilated and use a warm compress or steam inhalation if congested.',
          'Nutrition: Consume light, freshly prepared, easily digestible meals (warm soups, boiled lentils, rice porridge).',
        ];

    const whenToSeekImmediateCare = [
      'Sudden severe chest pain, crushing pressure, or pain spreading to left arm or jaw.',
      'Acute shortness of breath, gasping, or inability to speak in full sentences.',
      'High fever (>39°C / 102.2°F) that does not respond to antipyretics or persists beyond 3 days.',
      'Sudden weakness, facial drooping, numbness, or difficulty speaking.',
      'Persistent severe vomiting or inability to retain fluids for more than 12 hours.',
      'New onset dark purple or non-blanching skin rash.',
    ];

    const medicalDisclaimer =
      'This is AI-generated educational health information and does not replace professional medical advice, clinical diagnosis, or physician treatment.';

    return {
      triageLevel,
      isEmergency,
      emergencyWarning,
      summary,
      possibleCauses,
      followUpQuestions,
      recommendedNextSteps,
      commonMedicinesInfo,
      allergyAndContraindicationNotes,
      homeCareGuidance,
      whenToSeekImmediateCare,
      medicalDisclaimer,
    };
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symptomsInput.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setSavedSuccess(false);

    try {
      const apiRes = await safeApiFetch<any>('/api/ai/symptom-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: symptomsInput,
          duration,
          severity,
          age,
          allergies,
          language: activeLanguage,
        }),
      });

      let finalResult = apiRes.data;
      if (!apiRes.success || !apiRes.data || apiRes.data.error) {
        finalResult = generateClientAssessment({
          symptoms: symptomsInput,
          duration,
          severity,
          age,
          allergies,
          language: activeLanguage,
        });
      }

      setResult(finalResult);

      const needsUrgentOrEmergency =
        finalResult.isEmergency ||
        finalResult.triageLevel === 'EMERGENCY_RED' ||
        finalResult.triageLevel === 'URGENT_ATTENTION' ||
        severity === 'Severe';

      if (needsUrgentOrEmergency) {
        startSosSignal(finalResult.isEmergency || finalResult.triageLevel === 'EMERGENCY_RED');
      } else {
        stopSirenAudio();
        setIsSosSignalActive(false);
      }
    } catch {
      const clientAssessment = generateClientAssessment({
        symptoms: symptomsInput,
        duration,
        severity,
        age,
        allergies,
        language: activeLanguage,
      });
      setResult(clientAssessment);

      const needsUrgentOrEmergency =
        clientAssessment.isEmergency ||
        clientAssessment.triageLevel === 'EMERGENCY_RED' ||
        clientAssessment.triageLevel === 'URGENT_ATTENTION' ||
        severity === 'Severe';

      if (needsUrgentOrEmergency) {
        startSosSignal(clientAssessment.isEmergency || clientAssessment.triageLevel === 'EMERGENCY_RED');
      } else {
        stopSirenAudio();
        setIsSosSignalActive(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssessment = () => {
    if (!result) return;
    onSaveToHistory({
      type: 'symptom_consult',
      title: `Symptom Check: ${symptomsInput.slice(0, 40)}`,
      date: new Date().toLocaleDateString('en-GB'),
      summary: result.summary,
      payload: result,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#20B8A8]/25 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[#20B8A8] text-xs font-semibold uppercase tracking-wider">
              <Stethoscope className="w-4 h-4" />
              <span>{t('symptomChecker', 'Clinical Triage Intelligence')} • {activeLanguage}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F8FB]">
              {t('symptomChecker', 'AI Symptom Checker & Health Guidance')}
            </h1>
            <p className="text-[#94A3B8] text-sm max-w-2xl">
              {t('tagline', 'Describe your symptoms in detail. Welora provides evidence-based analysis, safety triage, medication precautions, and home care advice.')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Input Form */}
      <form
        onSubmit={handleAnalyze}
        className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-5 shadow-xl"
      >
        <div>
          <label className="block text-xs font-semibold text-[#F4F8FB] uppercase tracking-wider mb-2">
            {t('symptomInputLabel', 'What symptoms are you experiencing?')} <span className="text-[#EF4444]">*</span>
          </label>
          <textarea
            rows={3}
            value={symptomsInput}
            onChange={(e) => setSymptomsInput(e.target.value)}
            placeholder="e.g., Throbbing headache on the right side for 2 days, sensitivity to light, mild nausea..."
            className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-3.5 text-sm text-[#F4F8FB] placeholder-[#94A3B8] outline-none focus:border-[#20B8A8] transition-colors"
            required
          />

          {/* Quick presets */}
          <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[11px] text-[#94A3B8] shrink-0">Try preset:</span>
            {quickSymptoms.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSymptomsInput(q.text)}
                className="px-2.5 py-1 rounded-full bg-[#0B1724] hover:bg-[#1A3044] text-[#94A3B8] hover:text-[#F4F8FB] border border-[#1E354A] shrink-0 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clinical Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              {t('durationLabel', 'Duration of Symptoms')}
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl px-3 py-2.5 text-sm text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
            >
              <option value="Just started (<24 hours)" className="bg-[#142536] text-[#F4F8FB]">Just started (&lt;24 hours)</option>
              <option value="1-3 days" className="bg-[#142536] text-[#F4F8FB]">1 to 3 days</option>
              <option value="4-7 days" className="bg-[#142536] text-[#F4F8FB]">4 to 7 days</option>
              <option value="1-2 weeks" className="bg-[#142536] text-[#F4F8FB]">1 to 2 weeks</option>
              <option value="Chronic / More than 2 weeks" className="bg-[#142536] text-[#F4F8FB]">Chronic / &gt;2 weeks</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              {t('severityLabel', 'Current Severity')}
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl px-3 py-2.5 text-sm text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
            >
              <option value="Mild (Noticeable but easily managed)" className="bg-[#142536] text-[#F4F8FB]">Mild (Noticeable)</option>
              <option value="Moderate (Affects daily tasks)" className="bg-[#142536] text-[#F4F8FB]">Moderate (Interferes with routine)</option>
              <option value="Severe (Intense, debilitating)" className="bg-[#142536] text-[#F4F8FB]">Severe (Debilitating / Acute)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              {t('patientAgeLabel', 'Patient Age')}
            </label>
            <input
              type="number"
              min={1}
              max={110}
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value, 10) || 25)}
              className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl px-3 py-2.5 text-sm text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              {t('knownAllergiesLabel', 'Known Allergies')}
            </label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g., Penicillin, Sulfa, Dust"
              className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl px-3 py-2.5 text-sm text-[#F4F8FB] placeholder-[#94A3B8] outline-none focus:border-[#20B8A8]"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-[#94A3B8]">
            {t('demoNotice', 'Confidential evaluation • Checked against emergency red-flag protocols')}
          </span>
          <button
            type="submit"
            disabled={!symptomsInput.trim() || loading}
            className="px-6 py-3 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-sm shadow-lg shadow-[#20B8A8]/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('analyzingSymptoms', 'Consulting AI Engine...')}</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                <span>{t('analyzeSymptoms', 'Analyze Symptoms')}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Analysis Results Display */}
      {result && (
        <div className="space-y-6 animate-fadeIn">
          {/* SOS Signal Alert Banner (Specifically triggered when Emergency or Urgent Attention is needed) */}
          {(result.triageLevel === 'EMERGENCY_RED' ||
            result.triageLevel === 'URGENT_ATTENTION' ||
            result.isEmergency ||
            isSosSignalActive) && (
            <div
              className={`p-6 rounded-2xl border-2 text-[#F4F8FB] shadow-2xl space-y-4 animate-pulse-gentle transition-all ${
                result.triageLevel === 'EMERGENCY_RED' || result.isEmergency
                  ? 'bg-[#EF4444]/25 border-[#EF4444] shadow-[#EF4444]/40 ring-2 ring-[#EF4444]/50'
                  : 'bg-amber-500/20 border-amber-500 shadow-amber-500/30 ring-2 ring-amber-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`relative p-3.5 rounded-2xl text-[#F4F8FB] shadow-lg shrink-0 ${
                      result.triageLevel === 'EMERGENCY_RED' || result.isEmergency
                        ? 'bg-[#EF4444] animate-bounce'
                        : 'bg-amber-500'
                    }`}
                  >
                    <AlertTriangle className="w-8 h-8" />
                    <span className="absolute inset-0 rounded-2xl bg-current opacity-30 animate-ping" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-600 text-white animate-pulse">
                        SOS SIGNAL ACTIVE
                      </span>
                      <span
                        className={`text-xs font-bold uppercase tracking-widest ${
                          result.triageLevel === 'EMERGENCY_RED' || result.isEmergency
                            ? 'text-[#EF4444]'
                            : 'text-amber-400'
                        }`}
                      >
                        {result.triageLevel === 'EMERGENCY_RED' || result.isEmergency
                          ? t('criticalAlert', 'CRITICAL EMERGENCY DETECTED')
                          : t('urgentAttention', 'URGENT MEDICAL ATTENTION REQUIRED')}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#F4F8FB] mt-0.5">
                      {result.triageLevel === 'EMERGENCY_RED' || result.isEmergency
                        ? '⚠️ RED ALERT: IMMEDIATE EMERGENCY MEDICAL ACTION NEEDED'
                        : '⚠️ HIGH PRIORITY: URGENT CLINICAL EVALUATION RECOMMENDED'}
                    </h2>
                  </div>
                </div>

                {/* Direct Action Controls */}
                <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (isSirenPlaying) {
                        stopSirenAudio();
                      } else {
                        startSosSignal(result.triageLevel === 'EMERGENCY_RED' || result.isEmergency);
                      }
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                      isSirenPlaying
                        ? 'bg-[#EF4444] text-white border-red-400 animate-pulse'
                        : 'bg-[#142536] text-[#94A3B8] border-[#1E354A] hover:text-[#F4F8FB]'
                    }`}
                    title={isSirenPlaying ? 'Mute SOS Siren' : 'Play SOS Siren Audio'}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isSirenPlaying ? 'Mute Siren' : 'Sound Siren'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCallConfirm(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-[#F4F8FB] font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
                  >
                    <PhoneCall className="w-4 h-4 text-[#F4F8FB]" />
                    <span>{t('callNow', 'Call 108 / 112')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenSOS}
                    className="px-4 py-2.5 rounded-xl bg-[#0B1724] text-[#EF4444] border-2 border-[#EF4444] font-black text-xs sm:text-sm hover:bg-[#142536] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]"
                  >
                    {t('sosButton', 'Open SOS Dispatch')}
                  </button>
                </div>
              </div>

              {/* Warning Statement */}
              <div className="text-sm text-[#F4F8FB] font-medium leading-relaxed bg-[#0B1724]/80 p-4 rounded-xl border border-white/10 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {result.emergencyWarning ||
                      (result.triageLevel === 'URGENT_ATTENTION'
                        ? 'Your reported symptoms indicate rapid onset or high severity that requires prompt consultation at an urgent care clinic or outpatient hospital within 6-12 hours.'
                        : t('emergencyWarning', 'Your reported symptoms may correspond to an acute medical emergency. Seek urgent hospital emergency evaluation.'))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Non-emergency Triage Badge (shown if not emergency/urgent) */}
          {result.triageLevel !== 'EMERGENCY_RED' &&
            result.triageLevel !== 'URGENT_ATTENTION' &&
            !result.isEmergency && (
            <div className="p-4 rounded-xl bg-[#142536] border border-[#20B8A8]/30 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-[#20B8A8] font-semibold">
                <ShieldCheck className="w-5 h-5 text-[#20B8A8]" />
                <span>
                  {t('assessmentOverview', 'Triage Assessment Level')}:{' '}
                  <strong className="text-[#F4F8FB] uppercase font-bold tracking-wider">
                    {result.triageLevel === 'ROUTINE_CARE'
                      ? t('routineCare', 'Routine Care')
                      : result.triageLevel === 'HOME_CARE'
                      ? t('homeCare', 'Home Care')
                      : result.triageLevel === 'URGENT_ATTENTION'
                      ? t('urgentAttention', 'Urgent Attention')
                      : result.triageLevel?.replace('_', ' ') || t('routineCare', 'Routine Care')}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleSaveAssessment}
                className="px-3.5 py-1.5 rounded-lg bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{savedSuccess ? 'Saved ✓' : t('saveToHistory', 'Save to History')}</span>
              </button>
            </div>
          )}

          {/* Clinical Summary */}
          {result.summary && (
            <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-3">
              <h3 className="text-base font-bold text-[#F4F8FB] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#66D9E8]" />
                <span>{t('assessmentOverview', 'Assessment Overview')}</span>
              </h3>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                {result.summary}
              </p>
            </div>
          )}

          {/* Possible Explanations */}
          {result.possibleCauses && result.possibleCauses.length > 0 && (
            <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-4">
              <h3 className="text-base font-bold text-[#F4F8FB] flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#20B8A8]" />
                <span>{t('possibleCauses', 'Possible Causes')}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.possibleCauses.map((cause: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#0B1724] border border-[#1E354A] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#F4F8FB]">{cause.name}</span>
                      <span className="text-[10px] font-semibold text-[#94A3B8]">
                        Probability: {cause.probability}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{cause.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Medicines Information & Safety Precautions */}
          {result.commonMedicinesInfo && result.commonMedicinesInfo.length > 0 && (
            <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#F4F8FB] flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#20B8A8]" />
                  <span>{t('commonMedicines', 'Common Medicines & Safety Information')}</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-1">
                  {t('demoNotice', 'Educational reference only. Welora does not prescribe individual medication dosages without clinical oversight.')}
                </p>
              </div>

              <div className="space-y-3">
                {result.commonMedicinesInfo.map((med: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#0B1724] border border-[#1E354A] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#20B8A8]">{med.genericName}</span>
                      <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Doctor / Pharmacist Supervision Required
                      </span>
                    </div>
                    <div className="text-[#94A3B8]">
                      <strong className="text-[#F4F8FB] block mb-0.5">Intended Use:</strong>
                      {med.intendedUse}
                    </div>
                    <div className="text-[#94A3B8]">
                      <strong className="text-[#F4F8FB] block mb-0.5">Precautions & Contraindications:</strong>
                      {med.precautions}
                    </div>
                    {med.safetyNotes && (
                      <div className="text-[#66D9E8] pt-1">
                        <strong>Safety Note:</strong> {med.safetyNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {result.allergyAndContraindicationNotes && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{result.allergyAndContraindicationNotes}</span>
                </div>
              )}
            </div>
          )}

          {/* Follow-up Questions & Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.recommendedNextSteps && (
              <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-3">
                <h4 className="text-sm font-bold text-[#F4F8FB] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#20B8A8]" />
                  <span>{t('recommendedNextSteps', 'Recommended Next Steps')}</span>
                </h4>
                <ul className="space-y-2 text-xs text-[#94A3B8]">
                  {result.recommendedNextSteps.map((step: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-[#20B8A8] shrink-0 mt-0.5 rtl:rotate-180" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.whenToSeekImmediateCare && (
              <div className="p-5 rounded-2xl bg-[#142536] border border-[#EF4444]/40 space-y-3">
                <h4 className="text-sm font-bold text-[#EF4444] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                  <span>{t('whenToSeekImmediateCare', 'When to Seek Immediate Emergency Care')}</span>
                </h4>
                <ul className="space-y-2 text-xs text-[#94A3B8]">
                  {result.whenToSeekImmediateCare.map((warn: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0 mt-1.5" />
                      <span className="text-[#F4F8FB]">{warn}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Call Confirm Modal */}
      <EmergencyCallConfirmModal
        isOpen={showCallConfirm}
        serviceName="Emergency Ambulance Services"
        phoneNumber="108"
        onConfirm={() => setShowCallConfirm(false)}
        onCancel={() => setShowCallConfirm(false)}
        language={activeLanguage}
      />
    </div>
  );
};
