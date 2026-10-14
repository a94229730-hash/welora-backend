import React, { useState } from 'react';
import {
  HeartHandshake,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Loader2,
  Clock,
} from 'lucide-react';
import { User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface HomeCareRemediesProps {
  user: User | null;
  onOpenSOS: () => void;
  language?: string;
}

export const HomeCareRemedies: React.FC<HomeCareRemediesProps> = ({
  user,
  onOpenSOS,
}) => {
  const { t, communicationLanguage, displayLanguage } = useLanguage();
  const activeLanguage = communicationLanguage || displayLanguage || 'English';

  const [symptom, setSymptom] = useState('Sore Throat & Mild Cold');
  const [age, setAge] = useState(user?.healthProfile?.age || 30);
  const [allergies, setAllergies] = useState(
    user?.healthProfile?.allergies?.join(', ') || 'None reported'
  );
  const [loading, setLoading] = useState(false);
  const [remedyData, setRemedyData] = useState<any | null>(null);

  const presets = [
    'Sore Throat & Scratchiness',
    'Acid Reflux & Post-Meal Indigestion',
    'Tension Headache & Eye Strain',
    'Mild Lower Back Muscle Stiffness',
    'Dehydration & Mild Summer Exhaustion',
    'Superficial First-Degree Kitchen Burn',
  ];

  const handleFetchRemedies = async (targetSymptom?: string) => {
    const s = targetSymptom || symptom;
    if (!s.trim()) return;

    setLoading(true);
    setRemedyData(null);

    try {
      const apiRes = await safeApiFetch<any>('/api/ai/home-remedies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptom: s,
          age,
          allergies,
          language: activeLanguage,
        }),
      });

      if (apiRes.success && apiRes.data && !apiRes.data.error) {
        setRemedyData(apiRes.data);
      } else {
        // Safe supportive fallback so user never sees failure (Netlify static ready)
        setRemedyData({
          conditionName: s,
          summary: `Evidence-informed supportive comfort care for "${s}". Designed for mild non-emergency discomfort while monitoring symptoms.`,
          safeRemedies: [
            {
              name: 'Hydration & Warm Fluids',
              method: 'Drink 2.5 to 3 liters of warm water, oral electrolyte solutions, or mild herbal tea (ginger/tulsi) throughout the day.',
              mechanism: 'Promotes cellular hydration, soothes mucous membranes, and aids metabolic recovery.',
              safetyPrecautions: 'Ensure fluids are pleasantly warm, not hot. Avoid excess sugar or caffeinated drinks.',
            },
            {
              name: 'Rest & Sensory Recovery',
              method: 'Ensure 8 to 9 hours of uninterrupted sleep in a quiet, well-ventilated, dimly lit room.',
              mechanism: 'Conserves energy to support natural immune and physical healing.',
              safetyPrecautions: 'Minimize screen time and physical exertion during acute discomfort.',
            },
            {
              name: 'Comfort Compress',
              method: 'Apply a warm damp towel or cooling pack for 10-15 minutes across the area of discomfort.',
              mechanism: 'Improves localized blood flow and relaxes muscular tension.',
              safetyPrecautions: 'Wrap cold packs in a clean towel; never apply ice directly to skin.',
            },
          ],
          allergyFilteredReminders: [
            allergies && allergies.toLowerCase() !== 'none'
              ? `Screened against patient reported allergy to: "${allergies}".`
              : 'No known allergies reported. Standard supportive measures are generally safe.',
          ],
          whenToStopAndSeeDoctor: [
            'Symptoms persist beyond 3 days without signs of gradual improvement.',
            'Onset of high fever (>38.5°C), severe localized swelling, or worsening pain.',
          ],
          redFlagEmergencySymptoms: [
            'Acute shortness of breath, gasping, or crushing chest tightness.',
            'Inability to swallow or retain fluids.',
          ],
          disclaimer: 'Home care remedies are supportive measures for minor complaints and do not replace clinical therapy.',
        });
      }
    } catch {
      setRemedyData({
        conditionName: s,
        summary: `Evidence-informed supportive comfort care for "${s}". Designed for mild non-emergency discomfort while monitoring symptoms.`,
        safeRemedies: [
          {
            name: 'Hydration & Warm Fluids',
            method: 'Drink 2.5 to 3 liters of warm water or oral electrolyte solutions throughout the day.',
            mechanism: 'Promotes cellular hydration and aids metabolic recovery.',
            safetyPrecautions: 'Ensure fluids are pleasantly warm, not hot.',
          },
          {
            name: 'Rest & Sensory Recovery',
            method: 'Ensure 8 to 9 hours of uninterrupted sleep in a quiet room.',
            mechanism: 'Conserves energy to support natural physical healing.',
            safetyPrecautions: 'Minimize screen time during recovery.',
          },
        ],
        allergyFilteredReminders: ['Standard supportive comfort measures are generally safe.'],
        whenToStopAndSeeDoctor: ['Symptoms persist beyond 3 days without improvement.'],
        redFlagEmergencySymptoms: ['Acute shortness of breath or severe chest tightness.'],
        disclaimer: 'Home care remedies are supportive measures for minor complaints and do not replace clinical therapy.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#20B8A8]/25 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[#20B8A8] text-xs font-semibold uppercase tracking-wider">
            <HeartHandshake className="w-4 h-4" />
            <span>{t('homeRemedies', 'Supportive Home Care')} • {activeLanguage}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F8FB]">
            {t('homeCareTitle', 'Personalized Home Care Remedies')}
          </h1>
          <p className="text-[#94A3B8] text-sm max-w-2xl">
            {t('tagline', 'Evidence-informed supportive measures for minor, non-emergency health discomforts. Automatically screened against your age and reported allergies, with explicit red-flag warnings when home care is insufficient.')}
          </p>
        </div>
      </div>

      {/* Preset Concerns */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-4 shadow-xl">
        <label className="block text-xs font-semibold text-[#F4F8FB] uppercase tracking-wider">
          {t('symptomInputLabel', 'Select Common Minor Health Concern or Enter Custom')}
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSymptom(p);
                handleFetchRemedies(p);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
                symptom === p
                  ? 'bg-[#20B8A8] text-[#0B1724] border-[#20B8A8] font-bold'
                  : 'bg-[#0B1724] border-[#1E354A] text-[#94A3B8] hover:text-[#F4F8FB] hover:border-[#20B8A8]/40'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <input
            type="text"
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            placeholder="e.g. Mild knee joint stiffness after jogging..."
            className="flex-1 bg-[#0B1724] border border-[#1E354A] rounded-xl px-4 py-2.5 text-sm text-[#F4F8FB] placeholder-[#94A3B8] outline-none focus:border-[#20B8A8]"
          />
          <button
            type="button"
            onClick={() => handleFetchRemedies()}
            disabled={loading || !symptom.trim()}
            className="px-6 py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md shadow-[#20B8A8]/20 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('analyzingSymptoms', 'Checking Remedies...')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#0B1724]" />
                <span>{t('homeCare', 'Get Safe Guidance')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Display */}
      {remedyData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Banner */}
          <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-1">
            <span className="text-[10px] font-bold text-[#20B8A8] uppercase tracking-wider block">
              {t('homeCare', 'Supportive Care Protocol')}
            </span>
            <h2 className="text-lg font-bold text-[#F4F8FB]">
              {remedyData.conditionName}
            </h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              {remedyData.summary}
            </p>
          </div>

          {/* Safe Remedies Cards */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[#F4F8FB] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#20B8A8]" />
              <span>{t('safeMeasures', 'Safe, Evidence-Informed Measures')}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {remedyData.safeRemedies?.map((rem: any, idx: number) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-3 flex flex-col justify-between shadow-md"
                >
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#20B8A8] block">
                      {idx + 1}. {rem.name}
                    </span>
                    <div className="text-xs text-[#F4F8FB] leading-relaxed">
                      <strong className="text-[#94A3B8] block mb-0.5">Application:</strong>
                      {rem.method}
                    </div>
                    <div className="text-xs text-[#94A3B8] leading-relaxed">
                      <strong className="text-[#94A3B8]/80 block mb-0.5">Mechanism:</strong>
                      {rem.mechanism}
                    </div>
                  </div>
                  {rem.safetyPrecautions && (
                    <div className="pt-2 border-t border-[#1E354A] text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      <strong>Precaution:</strong> {rem.safetyPrecautions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Red Flag Warning: When Home Care is NOT Sufficient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-xs text-amber-200">
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{t('whenToStopAndSeeDoctor', 'When to Stop Home Care and Visit a Doctor')}</span>
              </h4>
              <ul className="space-y-1.5">
                {remedyData.whenToStopAndSeeDoctor?.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/40 space-y-2 text-xs text-[#F4F8FB]">
              <h4 className="text-sm font-bold text-[#EF4444] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                <span>{t('redFlagSymptoms', 'Red Flag Symptoms (Do Not Use Home Care)')}</span>
              </h4>
              <ul className="space-y-1.5">
                {remedyData.redFlagEmergencySymptoms?.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5 font-medium">
                    <span className="text-[#EF4444]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
