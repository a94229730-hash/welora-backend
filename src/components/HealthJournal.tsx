import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Minus,
  Search,
  Filter,
  Smile,
  Meh,
  Frown,
  Heart,
  Zap,
  Activity,
  Calendar,
  Clock,
  Tag,
  Stethoscope,
  Trash2,
  Edit3,
  BookmarkCheck,
  CheckCircle2,
  Download,
  Share2,
  X,
  AlertCircle,
  TrendingUp,
  Droplets,
  Moon,
  Flame,
  FileText,
  Copy,
  Sparkles,
  Target,
  HeartPulse,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { HealthJournalEntry, JournalMood, User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface HealthJournalProps {
  user: User | null;
  onSaveToHistory?: (record: any) => void;
  language?: string;
}

const MOOD_CONFIG: Record<
  JournalMood,
  { label: string; icon: typeof Smile; color: string; bg: string }
> = {
  great: {
    label: 'Energized & Great',
    icon: Smile,
    color: 'text-[#20B8A8]',
    bg: 'bg-[#20B8A8]/10 border-[#20B8A8]/30',
  },
  good: {
    label: 'Good & Calm',
    icon: Smile,
    color: 'text-[#66D9E8]',
    bg: 'bg-[#66D9E8]/10 border-[#66D9E8]/30',
  },
  neutral: {
    label: 'Neutral / Fair',
    icon: Meh,
    color: 'text-[#94A3B8]',
    bg: 'bg-[#94A3B8]/10 border-[#94A3B8]/30',
  },
  poor: {
    label: 'Tired / Discomfort',
    icon: Frown,
    color: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/30',
  },
  unwell: {
    label: 'Unwell / High Pain',
    icon: Frown,
    color: 'text-[#EF4444]',
    bg: 'bg-[#EF4444]/10 border-[#EF4444]/30',
  },
};

const COMMON_SYMPTOMS = [
  'Headache',
  'Fatigue',
  'Nausea',
  'Joint Pain',
  'Muscle Soreness',
  'Backache',
  'Anxiety',
  'Insomnia',
  'Acid Reflux',
  'Cough / Cold',
  'Dizziness',
  'Skin Rash',
];

const SUGGESTED_TAGS = [
  '#morningWalk',
  '#hydration',
  '#goodSleep',
  '#screenTime',
  '#medicationTaken',
  '#workout',
  '#stressManagement',
  '#dietClean',
  '#headache',
  '#bpNormal',
];

export const HealthJournal: React.FC<HealthJournalProps> = ({
  user,
  onSaveToHistory,
}) => {
  const { t } = useLanguage();
  const userId = user?.id || 'usr_default_rahul';
  const [entries, setEntries] = useState<HealthJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [onlyFlaggedDoctor, setOnlyFlaggedDoctor] = useState(false);

  // Daily Goals State
  const [journalChartView, setJournalChartView] = useState<'energy' | 'sleep_water' | 'symptoms'>('energy');
  const [waterMl, setWaterMl] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`welora_journal_water_${userId}`);
      return saved ? Number(saved) : 2250;
    } catch {
      return 2250;
    }
  });
  const [stepsCount, setStepsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`welora_journal_steps_${userId}`);
      return saved ? Number(saved) : 6800;
    } catch {
      return 6800;
    }
  });
  const [sleepActualHours, setSleepActualHours] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`welora_journal_sleep_${userId}`);
      return saved ? Number(saved) : 7.5;
    } catch {
      return 7.5;
    }
  });
  const [goalsNotice, setGoalsNotice] = useState<string | null>(null);

  // Modal states
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showSummaryExportModal, setShowSummaryExportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [formTitle, setFormTitle] = useState('');
  const [formMood, setFormMood] = useState<JournalMood>('good');
  const [formEnergy, setFormEnergy] = useState<number>(7);
  const [formContent, setFormContent] = useState('');
  const [formMealQuality, setFormMealQuality] = useState<'healthy' | 'moderate' | 'indulgent' | 'fasted'>('healthy');
  const [formSystolic, setFormSystolic] = useState<string>('');
  const [formDiastolic, setFormDiastolic] = useState<string>('');
  const [formHeartRate, setFormHeartRate] = useState<string>('');
  const [formSleepHours, setFormSleepHours] = useState<string>('7.5');
  const [formWaterLiters, setFormWaterLiters] = useState<string>('2.5');
  const [formGlucose, setFormGlucose] = useState<string>('');
  const [formWeight, setFormWeight] = useState<string>('');
  const [formTemp, setFormTemp] = useState<string>('');
  const [formQuestions, setFormQuestions] = useState('');
  const [formFlagged, setFormFlagged] = useState(false);
  const [formSymptoms, setFormSymptoms] = useState<{ name: string; severity: 1 | 2 | 3 | 4 | 5 }[]>([]);
  const [customSymptomInput, setCustomSymptomInput] = useState('');
  const [customSymptomSeverity, setCustomSymptomSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('welora_token');
      const res = await safeApiFetch<any>(`/api/health-journal/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.success && res.data?.entries) {
        setEntries(res.data.entries);
        localStorage.setItem(`welora_journal_${userId}`, JSON.stringify(res.data.entries));
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Backend journal fetch error, checking local store:', e);
    }

    const saved = localStorage.getItem(`welora_journal_${userId}`);
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (err) {}
    } else {
      // Default initial mock entries
      const initEntries: HealthJournalEntry[] = [
        {
          id: 'journal_1',
          date: new Date().toISOString().split('T')[0],
          time: '08:45 AM',
          mood: 'good',
          energyLevel: 8,
          title: 'Morning Post-Walk & Hydration Check-in',
          content: 'Woke up feeling refreshed after 7.5 hours of sleep. Completed a 35-minute morning brisk walk around the community park. Took blood pressure reading 15 minutes after rest. Hydration is on track with 750ml consumed before breakfast.',
          symptoms: [],
          vitals: {
            systolicBP: 118,
            diastolicBP: 76,
            heartRate: 68,
            bloodGlucose: 94,
            sleepHours: 7.5,
            waterIntakeLiters: 2.5,
            weightKg: 72.4,
            temperatureF: 98.4,
          },
          mealQuality: 'healthy',
          tags: ['#morningWalk', '#hydration', '#bpNormal', '#goodSleep'],
          questionsForDoctor: 'Should I keep multivitamin timing with breakfast or lunch?',
          isFlaggedForDoctor: false,
          createdAt: new Date().toISOString(),
        },
      ];
      setEntries(initEntries);
      localStorage.setItem(`welora_journal_${userId}`, JSON.stringify(initEntries));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [userId]);

  const resetForm = () => {
    const now = new Date();
    setFormDate(now.toISOString().split('T')[0]);
    setFormTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setFormTitle('');
    setFormMood('good');
    setFormEnergy(7);
    setFormContent('');
    setFormMealQuality('healthy');
    setFormSystolic('');
    setFormDiastolic('');
    setFormHeartRate('');
    setFormSleepHours('7.5');
    setFormWaterLiters('2.5');
    setFormGlucose('');
    setFormWeight('');
    setFormTemp('');
    setFormQuestions('');
    setFormFlagged(false);
    setFormSymptoms([]);
    setFormTags(['#dailyHealth']);
    setEditingEntryId(null);
  };

  const openNewEntryModal = (template?: 'morning' | 'evening' | 'symptom') => {
    resetForm();
    if (template === 'morning') {
      setFormTitle('Morning Readiness & Vitals Check');
      setFormContent('Woke up rested. Had a warm glass of water. Checked baseline morning blood pressure and energy.');
      setFormMood('good');
      setFormEnergy(8);
      setFormTags(['#morningCheck', '#hydration', '#bpBaseline']);
    } else if (template === 'evening') {
      setFormTitle('Evening Wellness & Day Reflection');
      setFormContent('Reflecting on physical activity, meals, and hydration throughout the day. Getting ready for rest.');
      setFormMood('good');
      setFormEnergy(6);
      setFormTags(['#eveningReflection', '#goodSleep']);
    } else if (template === 'symptom') {
      setFormTitle('Symptom Flare-up Log');
      setFormContent('Noticed onset of discomfort. Recording triggers, location, and severity for doctor consultation.');
      setFormMood('poor');
      setFormEnergy(4);
      setFormFlagged(true);
      setFormTags(['#symptomFlare', '#forDoctor']);
    }
    setIsEntryModalOpen(true);
  };

  const handleEditEntry = (entry: HealthJournalEntry) => {
    setEditingEntryId(entry.id);
    setFormDate(entry.date);
    setFormTime(entry.time);
    setFormTitle(entry.title);
    setFormMood(entry.mood);
    setFormEnergy(entry.energyLevel);
    setFormContent(entry.content);
    setFormMealQuality(entry.mealQuality || 'healthy');
    setFormSystolic(entry.vitals?.systolicBP ? String(entry.vitals.systolicBP) : '');
    setFormDiastolic(entry.vitals?.diastolicBP ? String(entry.vitals.diastolicBP) : '');
    setFormHeartRate(entry.vitals?.heartRate ? String(entry.vitals.heartRate) : '');
    setFormSleepHours(entry.vitals?.sleepHours ? String(entry.vitals.sleepHours) : '');
    setFormWaterLiters(entry.vitals?.waterIntakeLiters ? String(entry.vitals.waterIntakeLiters) : '');
    setFormGlucose(entry.vitals?.bloodGlucose ? String(entry.vitals.bloodGlucose) : '');
    setFormWeight(entry.vitals?.weightKg ? String(entry.vitals.weightKg) : '');
    setFormTemp(entry.vitals?.temperatureF ? String(entry.vitals.temperatureF) : '');
    setFormQuestions(entry.questionsForDoctor || '');
    setFormFlagged(Boolean(entry.isFlaggedForDoctor));
    setFormSymptoms(entry.symptoms || []);
    setFormTags(entry.tags || []);
    setIsEntryModalOpen(true);
  };

  const handleAddSymptom = (name: string, severity: 1 | 2 | 3 | 4 | 5) => {
    if (!name.trim()) return;
    if (formSymptoms.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) return;
    setFormSymptoms([...formSymptoms, { name: name.trim(), severity }]);
    setCustomSymptomInput('');
  };

  const handleRemoveSymptom = (index: number) => {
    setFormSymptoms(formSymptoms.filter((_, i) => i !== index));
  };

  const handleAddTag = (tag: string) => {
    const formatted = tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`;
    if (!formatted || formatted === '#') return;
    if (!formTags.includes(formatted)) {
      setFormTags([...formTags, formatted]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Please enter an entry title');
      return;
    }

    const vitalsObj: any = {};
    if (formSystolic) vitalsObj.systolicBP = Number(formSystolic);
    if (formDiastolic) vitalsObj.diastolicBP = Number(formDiastolic);
    if (formHeartRate) vitalsObj.heartRate = Number(formHeartRate);
    if (formSleepHours) vitalsObj.sleepHours = Number(formSleepHours);
    if (formWaterLiters) vitalsObj.waterIntakeLiters = Number(formWaterLiters);
    if (formGlucose) vitalsObj.bloodGlucose = Number(formGlucose);
    if (formWeight) vitalsObj.weightKg = Number(formWeight);
    if (formTemp) vitalsObj.temperatureF = Number(formTemp);

    const payload = {
      date: formDate,
      time: formTime,
      title: formTitle.trim(),
      mood: formMood,
      energyLevel: formEnergy,
      content: formContent.trim(),
      mealQuality: formMealQuality,
      vitals: Object.keys(vitalsObj).length > 0 ? vitalsObj : undefined,
      symptoms: formSymptoms,
      tags: formTags,
      questionsForDoctor: formQuestions.trim(),
      isFlaggedForDoctor: formFlagged,
    };

    try {
      const token = localStorage.getItem('welora_token');
      if (editingEntryId) {
        const res = await safeApiFetch<any>(`/api/health-journal/${userId}/${editingEntryId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        const updated = entries.map((item) =>
          item.id === editingEntryId ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item
        );
        setEntries(updated);
        localStorage.setItem(`welora_journal_${userId}`, JSON.stringify(updated));
        showToast('Journal entry updated successfully');
      } else {
        const newEntry: HealthJournalEntry = {
          id: 'journal_' + Date.now(),
          ...payload,
          createdAt: new Date().toISOString(),
        };
        const next = [newEntry, ...entries];
        setEntries(next);
        localStorage.setItem(`welora_journal_${userId}`, JSON.stringify(next));

        safeApiFetch<any>(`/api/health-journal/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        }).catch(() => {});

        showToast('New journal entry recorded');
      }
    } catch {
      showToast('Saved to local storage');
    }

    setIsEntryModalOpen(false);
    resetForm();
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Delete this journal entry?')) return;
    const updated = entries.filter((e) => e.id !== entryId);
    setEntries(updated);
    localStorage.setItem(`welora_journal_${userId}`, JSON.stringify(updated));

    try {
      const token = localStorage.getItem('welora_token');
      await safeApiFetch(`/api/health-journal/${userId}/${entryId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    showToast('Entry removed');
  };

  const handlePromoteToRecord = (entry: HealthJournalEntry) => {
    if (onSaveToHistory) {
      onSaveToHistory({
        id: 'rec_journal_' + Date.now(),
        date: entry.date,
        title: `[Journal] ${entry.title}`,
        type: 'symptom_consult',
        summary: entry.content || 'Health Journal entry with vitals and observations.',
        details: entry,
        doctorOrFacility: 'Personal Health Journal',
      });
      showToast(`Saved "${entry.title}" to permanent Medical Records!`);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      if (selectedMoodFilter !== 'all' && item.mood !== selectedMoodFilter) {
        return false;
      }
      if (onlyFlaggedDoctor && !item.isFlaggedForDoctor) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesContent = item.content.toLowerCase().includes(query);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));
        const matchesQuestions = item.questionsForDoctor?.toLowerCase().includes(query);
        const matchesSymptoms = item.symptoms.some((s) => s.name.toLowerCase().includes(query));
        return matchesTitle || matchesContent || matchesTags || matchesQuestions || matchesSymptoms;
      }
      return true;
    });
  }, [entries, selectedMoodFilter, onlyFlaggedDoctor, searchQuery]);

  const stats = useMemo(() => {
    const total = entries.length;
    if (total === 0) return { total: 0, avgEnergy: 0, flaggedCount: 0, activeDays: 0 };
    const avgEnergy = (
      entries.reduce((acc, curr) => acc + (curr.energyLevel || 5), 0) / total
    ).toFixed(1);
    const flaggedCount = entries.filter((e) => e.isFlaggedForDoctor).length;
    const uniqueDates = new Set(entries.map((e) => e.date)).size;
    return {
      total,
      avgEnergy,
      flaggedCount,
      activeDays: uniqueDates,
    };
  }, [entries]);

  const doctorSummaryText = useMemo(() => {
    if (entries.length === 0) return 'No journal entries available.';
    const lines: string[] = [
      `=== WELORA HEALTHCARE — CLINICAL JOURNAL SUMMARY ===`,
      `Patient: ${user?.name || 'Rahul Sharma'} | Generated: ${new Date().toLocaleDateString()}`,
      `Total Logged Entries: ${entries.length} | Unique Observation Days: ${stats.activeDays}`,
      `Average Energy Rating: ${stats.avgEnergy} / 10`,
      `--------------------------------------------------`,
      `ITEMS FLAGGED FOR CLINICAL REVIEW:`,
    ];

    const flagged = entries.filter((e) => e.isFlaggedForDoctor || (e.questionsForDoctor && e.questionsForDoctor.trim().length > 0));
    if (flagged.length === 0) {
      lines.push(`(No entries flagged for doctor review)`);
    } else {
      flagged.forEach((f) => {
        lines.push(`\n• Date: ${f.date} (${f.time}) — ${f.title}`);
        if (f.questionsForDoctor) lines.push(`  Questions for Doctor: ${f.questionsForDoctor}`);
        if (f.symptoms && f.symptoms.length > 0) {
          lines.push(`  Symptoms: ${f.symptoms.map((s) => `${s.name} (severity ${s.severity}/5)`).join(', ')}`);
        }
        if (f.vitals) {
          const vParts: string[] = [];
          if (f.vitals.systolicBP) vParts.push(`BP: ${f.vitals.systolicBP}/${f.vitals.diastolicBP} mmHg`);
          if (f.vitals.heartRate) vParts.push(`Pulse: ${f.vitals.heartRate} bpm`);
          if (f.vitals.bloodGlucose) vParts.push(`Glucose: ${f.vitals.bloodGlucose} mg/dL`);
          if (vParts.length > 0) lines.push(`  Vitals: ${vParts.join(', ')}`);
        }
      });
    }

    lines.push(`\n--------------------------------------------------`);
    lines.push(`RECENT LOGGED ENTRIES:`);
    entries.slice(0, 5).forEach((e) => {
      lines.push(`\n[${e.date} ${e.time}] ${e.title} (Mood: ${e.mood}, Energy: ${e.energyLevel}/10)`);
      if (e.content) lines.push(`Notes: ${e.content}`);
    });
    lines.push(`\n==================================================`);
    return lines.join('\n');
  }, [entries, user, stats]);

  const copyDoctorSummary = () => {
    navigator.clipboard.writeText(doctorSummaryText);
    showToast('Doctor Summary copied to clipboard!');
  };

  const todayIso = new Date().toISOString().split('T')[0];
  const hasJournalToday = entries.some((e) => e.date === todayIso);

  const weeklyTrendsData = useMemo(() => {
    const days: {
      day: string;
      dateStr: string;
      energy: number;
      sleep: number;
      water: number;
      symptoms: number;
      wellnessScore: number;
    }[] = [];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateIso = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const dayEntries = entries.filter((e) => e.date === dateIso);
      let energy = 7.5;
      let sleep = 7.5;
      let water = 2.4;
      let symptoms = 0;

      if (dayEntries.length > 0) {
        const energies = dayEntries.map((e) => e.energyLevel || 7);
        energy = Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10;
        const sleepVals = dayEntries.map((e) => e.vitals?.sleepHours).filter(Boolean) as number[];
        if (sleepVals.length > 0) {
          sleep = Math.round((sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length) * 10) / 10;
        }
        const waterVals = dayEntries.map((e) => e.vitals?.waterIntakeLiters).filter(Boolean) as number[];
        if (waterVals.length > 0) {
          water = Math.round((waterVals.reduce((a, b) => a + b, 0) / waterVals.length) * 10) / 10;
        }
        symptoms = dayEntries.reduce((acc, e) => acc + (e.symptoms ? e.symptoms.length : 0), 0);
      } else {
        const pseudoMod = (i % 3) - 1;
        energy = Math.max(5, Math.min(10, Math.round((7.4 + pseudoMod * 0.4) * 10) / 10));
        sleep = Math.round((7.2 + ((i % 2) * 0.4)) * 10) / 10;
        water = Math.round((2.2 + ((i % 3) * 0.2)) * 10) / 10;
        symptoms = i % 4 === 0 ? 1 : 0;
      }

      const wellnessScore = Math.min(100, Math.max(55, Math.round((energy * 7.5) + (sleep * 2.5) - (symptoms * 5))));

      days.push({
        day: dayName,
        dateStr,
        energy,
        sleep,
        water,
        symptoms,
        wellnessScore,
      });
    }

    return days;
  }, [entries]);

  const updateWater = (deltaMl: number) => {
    setWaterMl((prev) => {
      const next = Math.max(0, Math.min(5000, prev + deltaMl));
      try {
        localStorage.setItem(`welora_journal_water_${userId}`, String(next));
      } catch {}
      setGoalsNotice(`Hydration: ${(next / 1000).toFixed(2)}L`);
      setTimeout(() => setGoalsNotice(null), 2500);
      return next;
    });
  };

  const updateSteps = (deltaSteps: number) => {
    setStepsCount((prev) => {
      const next = Math.max(0, Math.min(30000, prev + deltaSteps));
      try {
        localStorage.setItem(`welora_journal_steps_${userId}`, String(next));
      } catch {}
      setGoalsNotice(`Steps: ${next.toLocaleString()}`);
      setTimeout(() => setGoalsNotice(null), 2500);
      return next;
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-fadeIn">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#142536] border border-[#20B8A8] text-[#F4F8FB] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-[#20B8A8] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Strip */}
      <div className="relative overflow-hidden rounded-3xl bg-[#142536] border border-[#1E354A] p-6 sm:p-8 shadow-xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#20B8A8]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#66D9E8]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B1724] border border-[#20B8A8]/30 text-[#20B8A8] text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-[#66D9E8]" />
              <span>{t('healthJournalTitle', 'Personal Health Journal')} • {t('nextGenIntelligence', 'Next Generation Healthcare Intelligence')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F8FB] tracking-tight">
              {t('healthJournal', 'Health Journal')} & Daily Log
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              {t('healthJournalDesc', 'Daily wellness log, symptoms diary, energy & vitals tracker, and doctor visit questions.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSummaryExportModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0B1724] hover:bg-[#1A3044] text-[#66D9E8] border border-[#1E354A] font-bold text-xs flex items-center gap-2 transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66D9E8]"
            >
              <FileText className="w-4 h-4 text-[#66D9E8]" />
              <span>{t('doctorVisitSummary', 'Doctor Visit Summary')}</span>
            </button>
            <button
              type="button"
              onClick={() => openNewEntryModal()}
              className="px-5 py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-extrabold text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
            >
              <Plus className="w-4 h-4" />
              <span>{t('newJournalEntry', 'New Journal Entry')}</span>
            </button>
          </div>
        </div>

        {/* Quick Log Templates Strip */}
        <div className="relative z-10 mt-6 pt-5 border-t border-[#1E354A] flex flex-wrap items-center gap-3 text-xs">
          <span className="text-[#94A3B8] font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#20B8A8]" />
            {t('quickLogTemplates', 'Quick Log Templates')}:
          </span>
          <button
            type="button"
            onClick={() => openNewEntryModal('morning')}
            className="px-3 py-1.5 rounded-lg bg-[#0B1724] hover:bg-[#1A3044] border border-[#1E354A] text-[#F4F8FB] transition-colors flex items-center gap-1.5"
          >
            <span>☀️ {t('morningReadiness', 'Morning Readiness')}</span>
          </button>
          <button
            type="button"
            onClick={() => openNewEntryModal('evening')}
            className="px-3 py-1.5 rounded-lg bg-[#0B1724] hover:bg-[#1A3044] border border-[#1E354A] text-[#F4F8FB] transition-colors flex items-center gap-1.5"
          >
            <span>🌙 {t('eveningReflection', 'Evening Reflection')}</span>
          </button>
          <button
            type="button"
            onClick={() => openNewEntryModal('symptom')}
            className="px-3 py-1.5 rounded-lg bg-[#0B1724] hover:bg-[#1A3044] border border-[#EF4444]/30 text-[#EF4444] transition-colors flex items-center gap-1.5"
          >
            <span>⚡ {t('symptomFlare', 'Flare-up Record')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Snapshot Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#142536] border border-[#1E354A] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0B1724] text-[#20B8A8] border border-[#20B8A8]/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#94A3B8] font-semibold">{t('totalEntries', 'Total Entries')}</div>
            <div className="text-xl font-bold text-[#F4F8FB]">{stats.total}</div>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#142536] border border-[#1E354A] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0B1724] text-[#66D9E8] border border-[#66D9E8]/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#94A3B8] font-semibold">{t('avgEnergy', 'Avg Energy')}</div>
            <div className="text-xl font-bold text-[#F4F8FB]">{stats.avgEnergy} <span className="text-xs text-[#94A3B8]">/ 10</span></div>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#142536] border border-[#1E354A] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0B1724] text-[#20B8A8] border border-[#20B8A8]/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#94A3B8] font-semibold">{t('activeDays', 'Active Days')}</div>
            <div className="text-xl font-bold text-[#F4F8FB]">{stats.activeDays}</div>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#142536] border border-[#1E354A] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0B1724] text-[#F59E0B] border border-[#F59E0B]/20">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-[#94A3B8] font-semibold">{t('doctorFlags', 'Doctor Flags')}</div>
            <div className="text-xl font-bold text-[#F4F8FB]">{stats.flaggedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 rounded-2xl bg-[#142536] border border-[#1E354A] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchJournalPlaceholder', 'Search journal entries, symptoms, vitals, or tags...')}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0B1724] border border-[#1E354A] text-xs text-[#F4F8FB] placeholder-[#94A3B8]/60 focus:border-[#20B8A8] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F4F8FB]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0B1724] p-1 rounded-xl border border-[#1E354A] text-xs">
            <button
              type="button"
              onClick={() => setSelectedMoodFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedMoodFilter === 'all'
                  ? 'bg-[#142536] text-[#20B8A8] font-bold'
                  : 'text-[#94A3B8] hover:text-[#F4F8FB]'
              }`}
            >
              {t('allMoods', 'All Moods')}
            </button>
            {(Object.keys(MOOD_CONFIG) as JournalMood[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMoodFilter(m)}
                className={`px-2 py-1 rounded-lg capitalize transition-colors ${
                  selectedMoodFilter === m
                    ? 'bg-[#142536] text-[#20B8A8] font-bold'
                    : 'text-[#94A3B8] hover:text-[#F4F8FB]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOnlyFlaggedDoctor(!onlyFlaggedDoctor)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              onlyFlaggedDoctor
                ? 'bg-[#0B1724] text-[#F59E0B] border-[#F59E0B]/50 font-bold'
                : 'bg-[#0B1724] text-[#94A3B8] border-[#1E354A] hover:text-[#F4F8FB]'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{t('doctorQuestions', 'Doctor Questions')}</span>
          </button>
        </div>
      </div>

      {/* Main Journal Entries Feed */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-[#94A3B8] space-y-3">
            <div className="w-8 h-8 border-2 border-[#20B8A8] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading health journal records...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#142536] border border-[#1E354A] text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0B1724] text-[#94A3B8] flex items-center justify-center mx-auto border border-[#1E354A]">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#F4F8FB]">{t('noJournalEntries', 'No Journal Entries Found')}</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                {searchQuery || selectedMoodFilter !== 'all' || onlyFlaggedDoctor
                  ? 'No entries match your current search and filter criteria.'
                  : 'Start your health journal by recording your first wellness check-in, vitals, or daily symptoms.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openNewEntryModal()}
              className="px-5 py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs inline-flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{t('createFirstEntry', 'Create First Entry')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredEntries.map((entry) => {
              const moodInfo = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.good;
              const MoodIcon = moodInfo.icon;
              return (
                <div
                  key={entry.id}
                  className="group p-5 sm:p-6 rounded-2xl bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/40 transition-all space-y-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${moodInfo.bg} ${moodInfo.color} shrink-0`}>
                        <MoodIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-[#F4F8FB]">{entry.date}</span>
                          <span className="text-[#1E354A]">•</span>
                          <span className="text-[#94A3B8] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {entry.time}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#94A3B8] flex items-center gap-2 mt-0.5">
                          <span className={moodInfo.color}>{moodInfo.label}</span>
                          <span>•</span>
                          <span>Energy: <strong className="text-[#F4F8FB]">{entry.energyLevel}/10</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePromoteToRecord(entry)}
                        title={t('saveToMedicalRecords', 'Save to Medical Records')}
                        className="px-3 py-1.5 rounded-lg bg-[#0B1724] hover:bg-[#1E354A] text-[#20B8A8] border border-[#20B8A8]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('saveToMedicalRecords', 'Save to Records')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditEntry(entry)}
                        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#66D9E8] hover:bg-[#0B1724] transition-colors"
                        title={t('edit', 'Edit')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#0B1724] transition-colors"
                        title={t('delete', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#F4F8FB] tracking-tight">
                      {entry.title}
                    </h3>
                    {entry.content && (
                      <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed mt-1.5 whitespace-pre-line">
                        {entry.content}
                      </p>
                    )}
                  </div>

                  {entry.vitals && Object.keys(entry.vitals).length > 0 && (
                    <div className="p-3 rounded-xl bg-[#0B1724] border border-[#1E354A] flex flex-wrap items-center gap-4 text-xs text-[#94A3B8]">
                      {entry.vitals.systolicBP && entry.vitals.diastolicBP && (
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-[#20B8A8]" />
                          <span>BP: <strong className="text-[#F4F8FB]">{entry.vitals.systolicBP}/{entry.vitals.diastolicBP}</strong> mmHg</span>
                        </div>
                      )}
                      {entry.vitals.heartRate && (
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-[#EF4444]" />
                          <span>Pulse: <strong className="text-[#F4F8FB]">{entry.vitals.heartRate}</strong> bpm</span>
                        </div>
                      )}
                      {entry.vitals.sleepHours && (
                        <div className="flex items-center gap-1.5">
                          <Moon className="w-3.5 h-3.5 text-[#66D9E8]" />
                          <span>Sleep: <strong className="text-[#F4F8FB]">{entry.vitals.sleepHours}</strong> hrs</span>
                        </div>
                      )}
                      {entry.vitals.waterIntakeLiters && (
                        <div className="flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-[#66D9E8]" />
                          <span>Water: <strong className="text-[#F4F8FB]">{entry.vitals.waterIntakeLiters}</strong> L</span>
                        </div>
                      )}
                      {entry.vitals.bloodGlucose && (
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-[#F59E0B]" />
                          <span>Glucose: <strong className="text-[#F4F8FB]">{entry.vitals.bloodGlucose}</strong> mg/dL</span>
                        </div>
                      )}
                    </div>
                  )}

                  {entry.symptoms && entry.symptoms.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-[#94A3B8]">{t('symptomsReported', 'Symptoms Reported')}:</div>
                      <div className="flex flex-wrap gap-2">
                        {entry.symptoms.map((s, idx) => (
                          <div
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-[#0B1724] border border-[#1E354A] text-xs flex items-center gap-1.5 text-[#F4F8FB]"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                            <span>{s.name}</span>
                            <span className="text-[10px] text-[#94A3B8]">lvl {s.severity}/5</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.questionsForDoctor && (
                    <div className="p-3 rounded-xl bg-[#0B1724] border border-[#F59E0B]/30 flex items-start gap-2.5 text-xs">
                      <Stethoscope className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#F59E0B] text-[11px]">{t('flaggedForDoctor', 'Flagged for Doctor Review')}:</div>
                        <div className="text-[#F4F8FB]">{entry.questionsForDoctor}</div>
                      </div>
                    </div>
                  )}

                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-[#66D9E8]/80">
                      {entry.tags.map((tg, i) => (
                        <span key={i} className="hover:text-[#66D9E8] transition-colors">
                          {tg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT ENTRY MODAL */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1724]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#142536] border border-[#1E354A] w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E354A]">
              <div>
                <h3 className="text-lg font-bold text-[#F4F8FB]">
                  {editingEntryId ? 'Edit Health Journal Entry' : 'Record Health Journal Entry'}
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Track how you feel, record vital signs, and note questions for medical care.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEntryModalOpen(false);
                  resetForm();
                }}
                className="p-2 text-[#94A3B8] hover:text-[#F4F8FB] rounded-xl hover:bg-[#0B1724]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B1724] border border-[#1E354A] text-xs text-[#F4F8FB] focus:border-[#20B8A8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Time</label>
                  <input
                    type="text"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="08:30 AM"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B1724] border border-[#1E354A] text-xs text-[#F4F8FB] focus:border-[#20B8A8] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                  Entry Title <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Morning Post-Walk Check-in, Afternoon Headache, etc."
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1724] border border-[#1E354A] text-xs text-[#F4F8FB] focus:border-[#20B8A8] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                  General Well-being / Mood
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(MOOD_CONFIG) as JournalMood[]).map((m) => {
                    const cfg = MOOD_CONFIG[m];
                    const Icon = cfg.icon;
                    const isSelected = formMood === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormMood(m)}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-[#0B1724] border-[#20B8A8] text-[#20B8A8] font-bold shadow-md'
                            : 'bg-[#0B1724] border-[#1E354A] text-[#94A3B8] hover:text-[#F4F8FB]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] capitalize">{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#94A3B8]">Energy Level (1-10)</span>
                  <span className="font-bold text-[#20B8A8]">{formEnergy} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formEnergy}
                  onChange={(e) => setFormEnergy(Number(e.target.value))}
                  className="w-full accent-[#20B8A8] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1">
                  Daily Observations & Reflections
                </label>
                <textarea
                  rows={3}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="How did you feel today? Any physical changes, stress levels, exercise, or food responses?"
                  className="w-full px-3 py-2 rounded-xl bg-[#0B1724] border border-[#1E354A] text-xs text-[#F4F8FB] focus:border-[#20B8A8] focus:outline-none"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#0B1724] border border-[#1E354A] space-y-3">
                <div className="text-xs font-bold text-[#F4F8FB] flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#20B8A8]" />
                  <span>Physical Vitals & Biomarkers (Optional)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] mb-1">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={formSystolic}
                      onChange={(e) => setFormSystolic(e.target.value)}
                      placeholder="e.g. 120"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#142536] border border-[#1E354A] text-xs text-[#F4F8FB] focus:border-[#20B8A8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] mb-1">Diastolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={formDiastolic}
                      onChange={(e) => setFormDiastolic(e.target.value)}
                      placeholder="e.g. 80"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#142536] border border-[#1E354A] text-xs text-[#F4F8FB] focus:border-[#20B8A8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] mb-1">Pulse Rate (bpm)</label>
                    <input
                      type="number"
                      value={formHeartRate}
                      onChange={(e) => setFormHeartRate(e.target.value)}
                      placeholder="e.g. 72"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#142536] border border-[#1E354A] text-xs text-[#F4F8FB] focus:border-[#20B8A8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] mb-1">Sleep (hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formSleepHours}
                      onChange={(e) => setFormSleepHours(e.target.value)}
                      placeholder="e.g. 7.5"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#142536] border border-[#1E354A] text-xs text-[#F4F8FB] focus:border-[#20B8A8] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#94A3B8]">
                  Log Symptoms & Discomfort
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SYMPTOMS.map((sym) => {
                    const isAdded = formSymptoms.some((s) => s.name.toLowerCase() === sym.toLowerCase());
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            setFormSymptoms(formSymptoms.filter((s) => s.name.toLowerCase() !== sym.toLowerCase()));
                          } else {
                            handleAddSymptom(sym, 2);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          isAdded
                            ? 'bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444] font-bold'
                            : 'bg-[#0B1724] border border-[#1E354A] text-[#94A3B8] hover:text-[#F4F8FB]'
                        }`}
                      >
                        {sym} {isAdded && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E354A]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEntryModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#0B1724] hover:bg-[#1E354A] text-[#94A3B8] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-extrabold text-xs shadow-lg active:scale-95 transition-all"
                >
                  {editingEntryId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCTOR VISIT SUMMARY EXPORT MODAL */}
      {showSummaryExportModal && (
        <div className="fixed inset-0 z-50 bg-[#0B1724]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#142536] border border-[#1E354A] w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E354A]">
              <div>
                <h3 className="text-lg font-bold text-[#F4F8FB]">Doctor Visit Summary</h3>
                <p className="text-xs text-[#94A3B8]">
                  Formatted report ready to share with your physician or specialist.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryExportModal(false)}
                className="p-2 text-[#94A3B8] hover:text-[#F4F8FB] rounded-xl hover:bg-[#0B1724]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-[#0B1724] border border-[#1E354A] font-mono text-xs text-[#F4F8FB] whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
              {doctorSummaryText}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-[#94A3B8]">
                Confidential health data generated for clinical consultation.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyDoctorSummary}
                  className="px-4 py-2 rounded-xl bg-[#0B1724] hover:bg-[#1A3044] text-[#20B8A8] border border-[#20B8A8]/30 font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([doctorSummaryText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Welora_HealthJournal_Summary_${new Date().toISOString().split('T')[0]}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast('Summary report downloaded!');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-extrabold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .TXT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
