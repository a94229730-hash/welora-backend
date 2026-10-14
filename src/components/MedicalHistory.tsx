import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Calendar,
  HeartPulse,
  Pill,
  FileCheck2,
  GitCompare,
  Plus,
  Shield,
  Phone,
  Printer,
  ChevronDown,
  ChevronUp,
  Activity,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  Sparkles,
  Target,
  Droplet,
  Footprints,
  Moon,
  Timer,
  Edit2,
  Check,
  X,
  RotateCcw,
  Bell,
  BellRing,
  Clock,
  CheckCircle,
  BookOpen,
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
import { MedicalRecord, User, DailyHealthGoal, MedicationDose } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface MedicalHistoryProps {
  user: User | null;
  onUpdateUser: (updatedUser: User) => void;
  onNavigateTab?: (tab: string) => void;
  language?: string;
}

export const MedicalHistory: React.FC<MedicalHistoryProps> = ({
  user,
  onUpdateUser,
  onNavigateTab,
}) => {
  const { t, displayLanguage } = useLanguage();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // Weekly Health Activity Chart View
  const [chartView, setChartView] = useState<'trends' | 'breakdown' | 'stability'>('trends');

  // Compute 7-day weekly health activity data dynamically
  const weeklyData = useMemo(() => {
    const days: {
      day: string;
      fullDay: string;
      dateStr: string;
      consultations: number;
      prescriptions: number;
      diagnostics: number;
      appointments: number;
      total: number;
      wellnessScore: number;
    }[] = [];

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDay = d.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      let consultsCount = 0;
      let prescCount = 0;
      let diagCount = 0;
      let apptCount = 0;

      records.forEach((rec) => {
        let recDate: Date | null = null;
        if (rec.createdAt) {
          recDate = new Date(rec.createdAt);
        } else if (rec.date) {
          if (rec.date.includes('/')) {
            const parts = rec.date.split('/');
            if (parts.length === 3) {
              recDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            }
          } else {
            recDate = new Date(rec.date);
          }
        }

        if (recDate && !isNaN(recDate.getTime())) {
          const isSameDay =
            recDate.getFullYear() === d.getFullYear() &&
            recDate.getMonth() === d.getMonth() &&
            recDate.getDate() === d.getDate();

          if (isSameDay) {
            if (rec.type === 'symptom_consult') consultsCount++;
            else if (rec.type === 'prescription') prescCount++;
            else if (rec.type === 'lab_report' || rec.type === 'lab_comparison') diagCount++;
            else if (rec.type === 'appointment') apptCount++;
          }
        }
      });

      const totalEvents = consultsCount + prescCount + diagCount + apptCount;
      const wellnessScore = Math.min(99, Math.max(86, 91 + (totalEvents > 0 ? 3 : (i % 2 === 0 ? 2 : 0))));

      days.push({
        day: dayName,
        fullDay,
        dateStr,
        consultations: consultsCount,
        prescriptions: prescCount,
        diagnostics: diagCount,
        appointments: apptCount,
        total: totalEvents,
        wellnessScore,
      });
    }

    return days;
  }, [records]);

  // Aggregated Weekly KPI metrics
  const weeklyStats = useMemo(() => {
    const totalEvents = weeklyData.reduce((acc, d) => acc + d.total, 0);
    const totalConsults = weeklyData.reduce((acc, d) => acc + d.consultations, 0);
    const totalMeds = weeklyData.reduce((acc, d) => acc + d.prescriptions, 0);
    const totalLabs = weeklyData.reduce((acc, d) => acc + d.diagnostics + d.appointments, 0);
    const avgWellness = Math.round(weeklyData.reduce((acc, d) => acc + d.wellnessScore, 0) / weeklyData.length);

    return {
      totalEvents,
      totalConsults,
      totalMeds,
      totalLabs,
      avgWellness,
    };
  }, [weeklyData]);

  // Daily Health Goals State
  const defaultGoals: DailyHealthGoal[] = [
    {
      id: 'goal_water',
      type: 'water',
      title: 'Daily Hydration',
      target: 2500,
      current: 1750,
      unit: 'ml',
      stepIncrement: 250,
      iconName: 'Droplet',
      notes: 'Aim for 8-10 glasses (2.5L) throughout the day',
    },
    {
      id: 'goal_steps',
      type: 'steps',
      title: 'Physical Activity & Steps',
      target: 8000,
      current: 6200,
      unit: 'steps',
      stepIncrement: 500,
      iconName: 'Footprints',
      notes: 'Brisk walking or cardiovascular mobility',
    },
    {
      id: 'goal_sleep',
      type: 'sleep',
      title: 'Rest & Sleep Duration',
      target: 8,
      current: 7,
      unit: 'hrs',
      stepIncrement: 0.5,
      iconName: 'Moon',
      notes: 'Consistent sleep-wake cycle for restorative healing',
    },
    {
      id: 'goal_exercise',
      type: 'exercise',
      title: 'Cardio / Active Exercise',
      target: 30,
      current: 25,
      unit: 'mins',
      stepIncrement: 5,
      iconName: 'Timer',
      notes: 'Moderate-intensity cardiovascular or core exercise',
    },
  ];

  const [goals, setGoals] = useState<DailyHealthGoal[]>(() => {
    try {
      const local = localStorage.getItem(`welora_goals_${user?.id || 'demo'}`);
      if (local) return JSON.parse(local);
    } catch {}
    return defaultGoals;
  });

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<number>(0);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [newGoalType, setNewGoalType] = useState<DailyHealthGoal['type']>('water');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState<number>(2000);
  const [newGoalUnit, setNewGoalUnit] = useState('ml');
  const [newGoalNotes, setNewGoalNotes] = useState('');
  const [goalsSaveNotice, setGoalsSaveNotice] = useState<string | null>(null);

  // Medication Doses & Push Notification Simulation State
  const defaultMedicationDoses: MedicationDose[] = [
    {
      id: 'dose_1',
      medicineName: 'Cetirizine Hydrochloride',
      dosage: '10 mg (1 tablet)',
      scheduledTime: '09:00 PM',
      timeOfDay: 'Night',
      instructions: 'Take with warm water after dinner. Avoid driving.',
      isTaken: false,
      doctorName: 'Dr. Anita Roy',
      prescribedFor: 'Seasonal Allergic Rhinitis',
      urgency: 'Time-Sensitive',
    },
    {
      id: 'dose_2',
      medicineName: 'Vitamin D3 (Cholecalciferol)',
      dosage: '60,000 IU (1 capsule)',
      scheduledTime: '08:30 AM',
      timeOfDay: 'Morning',
      instructions: 'Take with milk or fatty meal once weekly.',
      isTaken: true,
      takenAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      doctorName: 'Dr. Anita Roy',
      prescribedFor: 'Bone Health & Vitamin Deficiency',
      urgency: 'Routine',
    },
    {
      id: 'dose_3',
      medicineName: 'Pantoprazole Gastro-Resistant',
      dosage: '40 mg (1 tablet)',
      scheduledTime: '07:30 AM',
      timeOfDay: 'Morning',
      instructions: 'Take 30 minutes before breakfast on an empty stomach.',
      isTaken: true,
      takenAt: new Date(Date.now() - 5 * 3600000).toISOString(),
      doctorName: 'Dr. Aarav Mehta',
      prescribedFor: 'Acid Reflux / Gastric Protection',
      urgency: 'Important',
    },
    {
      id: 'dose_4',
      medicineName: 'Omega-3 Fish Oil',
      dosage: '1000 mg (1 softgel)',
      scheduledTime: '01:30 PM',
      timeOfDay: 'Afternoon',
      instructions: 'Take with lunch for cardiovascular wellness.',
      isTaken: false,
      doctorName: 'Dr. Aarav Mehta',
      prescribedFor: 'Cardiovascular Support',
      urgency: 'Routine',
    },
  ];

  const [doses, setDoses] = useState<MedicationDose[]>(() => {
    try {
      const local = localStorage.getItem(`welora_doses_${user?.id || 'demo'}`);
      if (local) return JSON.parse(local);
    } catch {}
    return defaultMedicationDoses;
  });

  const [simulatedNotification, setSimulatedNotification] = useState<{
    id: string;
    title: string;
    message: string;
    timestamp: string;
    type: 'reminder' | 'taken_confirm' | 'scheduled';
  } | null>(null);

  const [dosesFilter, setDosesFilter] = useState<'all' | 'pending' | 'taken'>('all');
  const [showAddDoseModal, setShowAddDoseModal] = useState(false);
  const [newDoseName, setNewDoseName] = useState('');
  const [newDoseDosage, setNewDoseDosage] = useState('');
  const [newDoseTime, setNewDoseTime] = useState('08:00 AM');
  const [newDoseTimeOfDay, setNewDoseTimeOfDay] = useState<MedicationDose['timeOfDay']>('Morning');
  const [newDoseInstructions, setNewDoseInstructions] = useState('');
  const [newDoseDoctor, setNewDoseDoctor] = useState('');
  const [newDoseUrgency, setNewDoseUrgency] = useState<MedicationDose['urgency']>('Routine');

  // Manual Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState<MedicalRecord['type']>('symptom_consult');
  const [manualSummary, setManualSummary] = useState('');

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('welora_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchRecords = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await safeApiFetch<any>(`/api/medical-records/${user.id}`, {
        headers: getAuthHeaders(),
      });
      if (res.success && Array.isArray(res.data?.records) && res.data.records.length > 0) {
        setRecords(res.data.records);
        localStorage.setItem(`welora_records_${user.id}`, JSON.stringify(res.data.records));
      } else {
        const local = localStorage.getItem(`welora_records_${user.id}`);
        if (local) {
          setRecords(JSON.parse(local));
        } else {
          // Default initial records for new users
          const initial = [
            {
              id: 'rec_init_1',
              type: 'symptom_consult' as const,
              title: 'AI Consultation: Seasonal Rhinitis & Throat Check',
              date: new Date(Date.now() - 86400000).toLocaleDateString('en-GB'),
              summary: 'Mild nasal congestion and seasonal allergy evaluated. Recommended hydration and saline rinse. Triage: Home Care.',
              payload: { triage: 'HOME_CARE', symptoms: ['nasal congestion', 'sneezing'], severity: 'Mild' },
              createdAt: new Date(Date.now() - 86400000).toISOString(),
            },
            {
              id: 'rec_init_2',
              type: 'prescription' as const,
              title: 'Prescription Scan: Dr. Anita Roy (General Practice)',
              date: new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-GB'),
              summary: 'Validated Cetirizine 10mg once daily at night for 5 days. Verified safe with current health profile.',
              payload: { doctor: 'Dr. Anita Roy', medicines: [{ name: 'Cetirizine 10mg', frequency: 'OD at night', days: 5 }] },
              createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            },
          ];
          setRecords(initial);
          localStorage.setItem(`welora_records_${user.id}`, JSON.stringify(initial));
        }
      }
    } catch {
      const local = localStorage.getItem(`welora_records_${user.id}`);
      if (local) setRecords(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [user]);

  const syncGoalsToServer = async (updatedGoals: DailyHealthGoal[]) => {
    setGoals(updatedGoals);
    try {
      localStorage.setItem(`welora_goals_${user?.id || 'demo'}`, JSON.stringify(updatedGoals));
    } catch {}
    if (!user) return;
    try {
      await safeApiFetch(`/api/health-goals/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ goals: updatedGoals }),
      });
    } catch {}
  };

  const handleAdjustProgress = (goalId: string, delta: number) => {
    const nextGoals = goals.map((g) => {
      if (g.id === goalId) {
        const nextVal = Math.max(0, Math.round((g.current + delta) * 10) / 10);
        return { ...g, current: nextVal, updatedAt: new Date().toISOString() };
      }
      return g;
    });
    syncGoalsToServer(nextGoals);
  };

  const handleResetGoal = (goalId: string) => {
    const nextGoals = goals.map((g) => {
      if (g.id === goalId) {
        return { ...g, current: 0, updatedAt: new Date().toISOString() };
      }
      return g;
    });
    syncGoalsToServer(nextGoals);
  };

  const handleSaveTarget = (goalId: string) => {
    if (editingTarget <= 0) return;
    const nextGoals = goals.map((g) => {
      if (g.id === goalId) {
        return { ...g, target: editingTarget, updatedAt: new Date().toISOString() };
      }
      return g;
    });
    setEditingGoalId(null);
    syncGoalsToServer(nextGoals);
    setGoalsSaveNotice('Target updated successfully');
    setTimeout(() => setGoalsSaveNotice(null), 2500);
  };

  const handleCreateCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || newGoalTarget <= 0) return;

    let iconName = 'Target';
    let stepIncrement = 1;
    if (newGoalType === 'water') {
      iconName = 'Droplet';
      stepIncrement = 250;
    } else if (newGoalType === 'steps') {
      iconName = 'Footprints';
      stepIncrement = 500;
    } else if (newGoalType === 'sleep') {
      iconName = 'Moon';
      stepIncrement = 0.5;
    } else if (newGoalType === 'exercise') {
      iconName = 'Timer';
      stepIncrement = 5;
    }

    const created: DailyHealthGoal = {
      id: 'goal_' + Date.now(),
      type: newGoalType,
      title: newGoalTitle.trim(),
      target: newGoalTarget,
      current: 0,
      unit: newGoalUnit.trim() || 'units',
      stepIncrement,
      iconName,
      notes: newGoalNotes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    const nextGoals = [...goals, created];
    syncGoalsToServer(nextGoals);
    setShowAddGoalModal(false);
    setNewGoalTitle('');
    setNewGoalNotes('');
    setGoalsSaveNotice('New health goal created');
    setTimeout(() => setGoalsSaveNotice(null), 2500);
  };

  const triggerSimulatedPushNotification = (
    title: string,
    message: string,
    type: 'reminder' | 'taken_confirm' | 'scheduled' = 'reminder'
  ) => {
    const notif = {
      id: 'notif_' + Date.now(),
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
    };
    setSimulatedNotification(notif);

    // Audio chime synthesis
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {}

    setTimeout(() => {
      setSimulatedNotification((prev) => (prev?.id === notif.id ? null : prev));
    }, 6000);
  };

  const handleToggleDoseTaken = async (doseId: string) => {
    const target = doses.find((d) => d.id === doseId);
    if (!target) return;
    const willBeTaken = !target.isTaken;
    const nextDoses = doses.map((d) => {
      if (d.id === doseId) {
        return {
          ...d,
          isTaken: willBeTaken,
          takenAt: willBeTaken ? new Date().toISOString() : undefined,
        };
      }
      return d;
    });

    setDoses(nextDoses);
    try {
      localStorage.setItem(`welora_doses_${user?.id || 'demo'}`, JSON.stringify(nextDoses));
    } catch {}

    if (willBeTaken) {
      triggerSimulatedPushNotification(
        'Medication Dose Logged',
        `Confirmed taken: ${target.medicineName} (${target.dosage}). Logged to clinical records.`,
        'taken_confirm'
      );
    }

    if (!user) return;
    try {
      await safeApiFetch(`/api/medication-doses/${user.id}/${doseId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ isTaken: willBeTaken }),
      });
    } catch {}
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this medical record? This cannot be undone.')) {
      return;
    }
    const nextList = records.filter((r) => r.id !== recordId);
    setRecords(nextList);
    localStorage.setItem(`welora_records_${user.id}`, JSON.stringify(nextList));

    try {
      await safeApiFetch(`/api/medical-records/${user.id}/${recordId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
  };

  const handleClearAllRecords = async () => {
    if (!user) return;
    if (!window.confirm('WARNING: Erase all medical history records for this profile?')) return;
    setRecords([]);
    localStorage.setItem(`welora_records_${user.id}`, JSON.stringify([]));

    try {
      await safeApiFetch(`/api/medical-records/${user.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch {}
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `welora_medical_history_${user?.id || 'export'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCreateManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manualTitle.trim()) return;

    const newRec: MedicalRecord = {
      id: 'rec_' + Date.now(),
      type: manualType,
      title: manualTitle,
      date: new Date().toLocaleDateString('en-GB'),
      summary: manualSummary || 'Self-reported medical entry',
      payload: { note: manualSummary },
      createdAt: new Date().toISOString(),
    };

    const nextList = [newRec, ...records];
    setRecords(nextList);
    localStorage.setItem(`welora_records_${user.id}`, JSON.stringify(nextList));
    setShowAddModal(false);
    setManualTitle('');
    setManualSummary('');

    try {
      await safeApiFetch(`/api/medical-records/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(newRec),
      });
    } catch {}
  };

  const filteredRecords = records.filter((r) => {
    if (filterType === 'all') return true;
    return r.type === filterType;
  });

  const getRecordIcon = (type: MedicalRecord['type']) => {
    switch (type) {
      case 'symptom_consult':
        return <HeartPulse className="w-4 h-4 text-[#66D9E8]" />;
      case 'prescription':
        return <Pill className="w-4 h-4 text-[#20B8A8]" />;
      case 'lab_report':
        return <FileCheck2 className="w-4 h-4 text-[#20B8A8]" />;
      case 'lab_comparison':
        return <GitCompare className="w-4 h-4 text-[#66D9E8]" />;
      case 'appointment':
        return <Calendar className="w-4 h-4 text-[#20B8A8]" />;
      default:
        return <FileText className="w-4 h-4 text-[#94A3B8]" />;
    }
  };

  if (!user) {
    return (
      <div className="p-12 text-center text-[#94A3B8]">
        Please sign in or select a profile to view personal medical history.
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#20B8A8]/25 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[#20B8A8] text-xs font-semibold uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>{t('medicalHistory', 'Private Health Vault')} • {displayLanguage}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F8FB]">
              {t('medicalHistoryTitle', 'Personal Medical History')}
            </h1>
            <p className="text-[#94A3B8] text-sm max-w-2xl">
              {t('tagline', 'Centralized record of your AI symptom assessments, prescription scans, lab reports, doctor consultations, allergies, and emergency contacts.')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('journal')}
                className="px-3.5 py-2 rounded-xl bg-[#0B1724] hover:bg-[#1A3044] text-[#66D9E8] border border-[#1E354A] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#66D9E8]"
                title="Open Health Journal & Daily Wellness Diary"
              >
                <BookOpen className="w-4 h-4 text-[#66D9E8]" />
                <span>Health Journal</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs flex items-center gap-1.5 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
            >
              <Plus className="w-4 h-4" />
              <span>{t('add', 'Add Record')}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="px-3.5 py-2 rounded-xl bg-[#0B1724] hover:bg-[#1A3044] text-[#F4F8FB] font-semibold text-xs border border-[#1E354A] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
              title="Download structured JSON"
            >
              <Download className="w-4 h-4" />
              <span>{t('export', 'Export')}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-[#0B1724] hover:bg-[#1A3044] text-[#F4F8FB] text-xs border border-[#1E354A] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
              title={t('print', 'Print Summary')}
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Patient Health Profile Card */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E354A]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#20B8A8] flex items-center justify-center text-[#0B1724] font-bold text-lg">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F8FB]">{user.name}</h2>
              <span className="text-xs text-[#94A3B8]">
                Member ID: <span className="font-mono">{user.id}</span> • {user.email}
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#20B8A8] bg-[#0B1724] border border-[#20B8A8]/30 px-3 py-1 rounded-full">
            {t('healthProfile', 'Active Patient Account')}
          </span>
        </div>

        {/* Clinical Profile Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0B1724] border border-[#1E354A]">
            <span className="text-[#94A3B8] block text-[10px] uppercase font-semibold">{t('patientAgeLabel', 'Age')}</span>
            <strong className="text-[#F4F8FB] text-sm">{user.healthProfile.age} years</strong>
          </div>
          <div className="p-3 rounded-xl bg-[#0B1724] border border-[#1E354A]">
            <span className="text-[#94A3B8] block text-[10px] uppercase font-semibold">{t('bloodGroup', 'Blood Group')}</span>
            <strong className="text-[#EF4444] text-sm font-mono">{user.healthProfile.bloodGroup || 'B+'}</strong>
          </div>
          <div className="p-3 rounded-xl bg-[#0B1724] border border-[#1E354A]">
            <span className="text-[#94A3B8] block text-[10px] uppercase font-semibold">{t('knownAllergiesLabel', 'Known Allergies')}</span>
            <strong className="text-amber-300">
              {user.healthProfile.allergies?.length ? user.healthProfile.allergies.join(', ') : 'None'}
            </strong>
          </div>
          <div className="p-3 rounded-xl bg-[#0B1724] border border-[#1E354A]">
            <span className="text-[#94A3B8] block text-[10px] uppercase font-semibold">{t('currentMedications', 'Current Medications')}</span>
            <strong className="text-[#20B8A8]">
              {user.healthProfile.currentMedications?.length
                ? user.healthProfile.currentMedications.join(', ')
                : 'None'}
            </strong>
          </div>
        </div>

        {/* Emergency Contacts */}
        {user.emergencyContacts?.length > 0 && (
          <div className="pt-2 flex items-center gap-3 text-xs text-[#94A3B8]">
            <span className="font-semibold text-[#94A3B8] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>{t('emergencyHelplines', 'Primary Emergency Contact')}:</span>
            </span>
            <span className="text-[#F4F8FB]">
              {user.emergencyContacts[0].name} ({user.emergencyContacts[0].relation}) —{' '}
              <strong className="text-[#EF4444] font-mono">{user.emergencyContacts[0].phone}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Weekly Health Activity Summary & Trend Chart (Recharts) */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#1E354A]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[#20B8A8] text-xs font-semibold uppercase tracking-wider">
              <Activity className="w-4 h-4 text-[#20B8A8]" />
              <span>{t('weeklyHealthActivity', 'Weekly Health Activity & Trends')}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#F4F8FB] flex items-center gap-2">
              <span>7-Day Health Trajectory & Insights</span>
              <span className="text-xs font-normal text-[#20B8A8] bg-[#0B1724] border border-[#20B8A8]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#66D9E8]" />
                <span>Live Analytics</span>
              </span>
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Visualizing AI consultations, medication scans, diagnostic reports, and wellness trajectory.
            </p>
          </div>

          {/* Chart View Switcher */}
          <div className="flex items-center gap-1.5 bg-[#0B1724] p-1 rounded-xl border border-[#1E354A] text-xs">
            <button
              type="button"
              onClick={() => setChartView('trends')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                chartView === 'trends'
                  ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F4F8FB]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Activity Trends</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('breakdown')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                chartView === 'breakdown'
                  ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F4F8FB]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Breakdown</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('stability')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                chartView === 'stability'
                  ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F4F8FB]'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Wellness Index</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#0B1724] border border-[#1E354A] space-y-1">
            <span className="text-[#94A3B8] text-[10px] uppercase font-semibold block">7-Day Activity Total</span>
            <div className="flex items-baseline justify-between">
              <strong className="text-lg font-mono font-bold text-[#F4F8FB]">{weeklyStats.totalEvents} Events</strong>
              <span className="text-[10px] text-[#20B8A8] font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 text-[#20B8A8]" />
                <span>Logged</span>
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0B1724] border border-[#1E354A] space-y-1">
            <span className="text-[#94A3B8] text-[10px] uppercase font-semibold block">AI Consultations</span>
            <div className="flex items-baseline justify-between">
              <strong className="text-lg font-mono font-bold text-[#66D9E8]">{weeklyStats.totalConsults}</strong>
              <span className="text-[10px] text-[#66D9E8] bg-[#66D9E8]/10 px-1.5 py-0.5 rounded border border-[#66D9E8]/20">
                Symptom AI
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0B1724] border border-[#1E354A] space-y-1">
            <span className="text-[#94A3B8] text-[10px] uppercase font-semibold block">Prescriptions & Labs</span>
            <div className="flex items-baseline justify-between">
              <strong className="text-lg font-mono font-bold text-[#20B8A8]">
                {weeklyStats.totalMeds + weeklyStats.totalLabs}
              </strong>
              <span className="text-[10px] text-[#20B8A8] bg-[#20B8A8]/10 px-1.5 py-0.5 rounded border border-[#20B8A8]/20">
                Verified
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0B1724] border border-[#1E354A] space-y-1">
            <span className="text-[#94A3B8] text-[10px] uppercase font-semibold block">Health Stability Index</span>
            <div className="flex items-baseline justify-between">
              <strong className="text-lg font-mono font-bold text-[#20B8A8]">{weeklyStats.avgWellness}%</strong>
              <span className="text-[10px] text-[#20B8A8] font-semibold bg-[#20B8A8]/15 px-1.5 py-0.5 rounded">
                Optimal
              </span>
            </div>
          </div>
        </div>

        {/* Chart Canvas Area */}
        <div className="p-4 rounded-xl bg-[#0B1724] border border-[#1E354A] relative">
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'trends' ? (
                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weloraTealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#20B8A8" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#20B8A8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="weloraCyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#66D9E8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#66D9E8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1E354A" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E354A' }} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#142536] border border-[#1E354A] p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md min-w-[200px]">
                            <div className="flex items-center justify-between gap-3 border-b border-[#1E354A] pb-1.5">
                              <div>
                                <span className="font-bold text-[#F4F8FB] block">{data.fullDay}</span>
                                <span className="text-[10px] text-[#94A3B8]">{data.dateStr}</span>
                              </div>
                              <span className="text-[10px] font-semibold text-[#20B8A8] bg-[#0B1724] px-1.5 py-0.5 rounded border border-[#20B8A8]/30">
                                {data.total} Actions
                              </span>
                            </div>
                            <div className="space-y-1 pt-0.5">
                              <div className="flex items-center justify-between gap-2 text-[#66D9E8]">
                                <span>AI Consultations:</span>
                                <strong className="font-mono">{data.consultations}</strong>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-[#20B8A8]">
                                <span>Prescriptions:</span>
                                <strong className="font-mono">{data.prescriptions}</strong>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-[#38BDF8]">
                                <span>Diagnostics:</span>
                                <strong className="font-mono">{data.diagnostics}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', color: '#94A3B8' }} />
                  <Area type="monotone" dataKey="total" name="Daily Activity Events" stroke="#20B8A8" strokeWidth={2.5} fillOpacity={1} fill="url(#weloraTealGrad)" />
                  <Area type="monotone" dataKey="consultations" name="AI Consultations" stroke="#66D9E8" strokeWidth={2} fillOpacity={1} fill="url(#weloraCyanGrad)" />
                </AreaChart>
              ) : chartView === 'breakdown' ? (
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1E354A" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E354A' }} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', color: '#94A3B8' }} />
                  <Bar dataKey="consultations" name="AI Consults" fill="#66D9E8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="prescriptions" name="Prescriptions" fill="#20B8A8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="diagnostics" name="Lab Tests" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1E354A" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#1E354A' }} />
                  <YAxis domain={[80, 100]} stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', color: '#94A3B8' }} />
                  <Line type="monotone" dataKey="wellnessScore" name="Health Stability Index (%)" stroke="#20B8A8" strokeWidth={3} dot={{ fill: '#20B8A8', r: 4 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Health Goals Setting & Tracking Section */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#1E354A]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[#20B8A8] text-xs font-semibold uppercase tracking-wider">
              <Target className="w-4 h-4 text-[#20B8A8]" />
              <span>{t('dailyHealthGoals', 'Daily Health Goals & Vital Habits')}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#F4F8FB] flex items-center gap-2">
              <span>Track & Personalize Today&apos;s Health Milestones</span>
              {goalsSaveNotice && (
                <span className="text-xs font-medium text-[#20B8A8] bg-[#20B8A8]/10 border border-[#20B8A8]/30 px-2.5 py-0.5 rounded-full">
                  ✓ {goalsSaveNotice}
                </span>
              )}
            </h2>
            <p className="text-xs text-[#94A3B8]">
              {t('dailyGoalsSubtitle', 'Set daily hydration, steps, sleep, and physical goals with quick one-tap logging.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewGoalType('water');
              setNewGoalTitle('Hydration Tracker');
              setNewGoalTarget(2500);
              setNewGoalUnit('ml');
              setShowAddGoalModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Goal</span>
          </button>
        </div>

        {/* Goals Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {goals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
            const isCompleted = goal.current >= goal.target;
            const isEditing = editingGoalId === goal.id;

            const renderGoalIcon = () => {
              if (goal.type === 'water') return <Droplet className="w-5 h-5 text-[#38BDF8]" />;
              if (goal.type === 'steps') return <Footprints className="w-5 h-5 text-[#20B8A8]" />;
              if (goal.type === 'sleep') return <Moon className="w-5 h-5 text-[#A78BFA]" />;
              if (goal.type === 'exercise') return <Timer className="w-5 h-5 text-[#F59E0B]" />;
              return <Target className="w-5 h-5 text-[#20B8A8]" />;
            };

            return (
              <div
                key={goal.id}
                className={`p-4 rounded-xl bg-[#0B1724] border transition-all relative flex flex-col justify-between ${
                  isCompleted
                    ? 'border-[#20B8A8]/60 shadow-[0_0_15px_rgba(32,184,168,0.12)]'
                    : 'border-[#1E354A] hover:border-[#1E354A]/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[#142536] border border-[#1E354A]">
                        {renderGoalIcon()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#F4F8FB] line-clamp-1">{goal.title}</h3>
                        <span className="text-[10px] text-[#94A3B8] uppercase font-mono tracking-wider">
                          {goal.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Edit Target"
                        onClick={() => {
                          if (isEditing) {
                            setEditingGoalId(null);
                          } else {
                            setEditingGoalId(goal.id);
                            setEditingTarget(goal.target);
                          }
                        }}
                        className="p-1 rounded-md text-[#94A3B8] hover:text-[#20B8A8] hover:bg-[#142536] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Reset Today's Progress"
                        onClick={() => handleResetGoal(goal.id)}
                        className="p-1 rounded-md text-[#94A3B8] hover:text-[#66D9E8] hover:bg-[#142536] transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="my-2 p-2 rounded-lg bg-[#142536] border border-[#20B8A8]/40 space-y-2">
                      <label className="text-[10px] font-semibold text-[#66D9E8] block">
                        Set Daily Target ({goal.unit}):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step={goal.type === 'sleep' ? '0.5' : '1'}
                          min="1"
                          value={editingTarget}
                          onChange={(e) => setEditingTarget(Number(e.target.value))}
                          className="w-full bg-[#0B1724] border border-[#1E354A] rounded-md px-2 py-1 text-xs text-[#F4F8FB] font-mono focus:border-[#20B8A8] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveTarget(goal.id)}
                          className="p-1.5 rounded-md bg-[#20B8A8] text-[#0B1724] hover:bg-[#1AA394] font-bold"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGoalId(null)}
                          className="p-1.5 rounded-md bg-[#0B1724] text-[#94A3B8] hover:text-[#F4F8FB]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-1.5 my-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-xl font-bold font-mono text-[#F4F8FB]">
                          {goal.current}
                        </span>
                        <span className="text-xs text-[#94A3B8] ml-1">
                          / {goal.target} {goal.unit}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          isCompleted
                            ? 'text-[#20B8A8] bg-[#20B8A8]/15'
                            : 'text-[#66D9E8] bg-[#66D9E8]/10'
                        }`}
                      >
                        {percent}%
                      </span>
                    </div>

                    <div className="w-full bg-[#142536] h-2 rounded-full overflow-hidden border border-[#1E354A]">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isCompleted ? 'bg-[#20B8A8]' : 'bg-[#66D9E8]'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {goal.notes && (
                    <p className="text-[11px] text-[#94A3B8] leading-relaxed mb-3 line-clamp-2">
                      {goal.notes}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#1E354A] flex items-center justify-between gap-1.5">
                  <div className="text-[10px] text-[#94A3B8] font-mono">
                    Step: ±{goal.stepIncrement} {goal.unit}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={goal.current <= 0}
                      onClick={() => handleAdjustProgress(goal.id, -goal.stepIncrement)}
                      className="px-2 py-1 rounded-md bg-[#142536] hover:bg-[#1E354A] text-[#94A3B8] hover:text-[#F4F8FB] text-xs font-bold font-mono disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      -{goal.stepIncrement}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustProgress(goal.id, goal.stepIncrement)}
                      className="px-2.5 py-1 rounded-md bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] text-xs font-bold font-mono transition-colors shadow-sm flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{goal.stepIncrement}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated Mobile Push Notification Alert */}
      {simulatedNotification && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-sm w-full animate-fadeIn">
          <div className="p-4 rounded-2xl bg-[#142536] border-2 border-[#20B8A8] shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl relative flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#20B8A8]/20 border border-[#20B8A8]/40 text-[#20B8A8] shrink-0 mt-0.5">
              <BellRing className="w-5 h-5 text-[#20B8A8] animate-pulse" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#66D9E8] flex items-center gap-1">
                  <span>Welora Push Notification</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#20B8A8]"></span>
                </span>
                <span className="text-[10px] font-mono text-[#94A3B8]">{simulatedNotification.timestamp}</span>
              </div>
              <h4 className="text-xs font-bold text-[#F4F8FB] truncate">{simulatedNotification.title}</h4>
              <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">{simulatedNotification.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setSimulatedNotification(null)}
              className="absolute top-3 right-3 text-[#94A3B8] hover:text-[#F4F8FB] p-1 rounded-lg hover:bg-[#0B1724]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Medication Doses Module */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#1E354A]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[#20B8A8] text-xs font-semibold uppercase tracking-wider">
              <Pill className="w-4 h-4 text-[#20B8A8]" />
              <span>{t('upcomingMedicationDoses', 'Medication Doses & Daily Regimen')}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#F4F8FB] flex items-center gap-2">
              <span>Today&apos;s Medication Schedule & Adherence</span>
              <span className="text-xs font-normal text-[#20B8A8] bg-[#0B1724] border border-[#20B8A8]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#66D9E8]" />
                <span>
                  {doses.filter((d) => d.isTaken).length}/{doses.length} Taken
                </span>
              </span>
            </h2>
            <p className="text-xs text-[#94A3B8]">
              {t('medicationDosesSubtitle', 'Track time-sensitive prescriptions, mark doses taken, and trigger reminder alerts')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#0B1724] p-1 rounded-xl border border-[#1E354A] text-xs">
              <button
                type="button"
                onClick={() => setDosesFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  dosesFilter === 'all'
                    ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F4F8FB]'
                }`}
              >
                All ({doses.length})
              </button>
              <button
                type="button"
                onClick={() => setDosesFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  dosesFilter === 'pending'
                    ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F4F8FB]'
                }`}
              >
                Upcoming ({doses.filter((d) => !d.isTaken).length})
              </button>
              <button
                type="button"
                onClick={() => setDosesFilter('taken')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  dosesFilter === 'taken'
                    ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#F4F8FB]'
                }`}
              >
                Taken ({doses.filter((d) => d.isTaken).length})
              </button>
            </div>
          </div>
        </div>

        {/* Medication Doses List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doses
            .filter((d) => {
              if (dosesFilter === 'pending') return !d.isTaken;
              if (dosesFilter === 'taken') return d.isTaken;
              return true;
            })
            .map((dose) => {
              return (
                <div
                  key={dose.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    dose.isTaken
                      ? 'bg-[#0B1724]/60 border-[#1E354A] opacity-80'
                      : 'bg-[#0B1724] border-[#1E354A] hover:border-[#20B8A8]/40 shadow-sm'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#142536] border border-[#1E354A] text-[#F4F8FB] font-mono font-bold text-xs flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#20B8A8]" />
                          <span>{dose.scheduledTime}</span>
                        </span>
                        <span className="text-[10px] text-[#94A3B8] font-semibold uppercase px-2 py-0.5 rounded bg-[#142536]">
                          {dose.timeOfDay}
                        </span>
                      </div>
                      <button
                        type="button"
                        title="Simulate Push Reminder"
                        onClick={() => {
                          triggerSimulatedPushNotification(
                            `Medication Reminder: ${dose.medicineName}`,
                            `Time to take ${dose.dosage} (${dose.instructions}). Scheduled for ${dose.scheduledTime}.`,
                            'reminder'
                          );
                        }}
                        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#66D9E8] hover:bg-[#142536] transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h3
                        className={`text-sm sm:text-base font-bold transition-all ${
                          dose.isTaken ? 'line-through text-[#94A3B8]' : 'text-[#F4F8FB]'
                        }`}
                      >
                        {dose.medicineName}
                      </h3>
                      <div className="text-xs font-mono text-[#20B8A8] mt-0.5">{dose.dosage}</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#142536] border border-[#1E354A]/80 text-xs text-[#94A3B8] space-y-1">
                      <p className="text-[#F4F8FB] font-medium leading-relaxed">{dose.instructions}</p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#1E354A] flex items-center justify-between gap-3">
                    <div className="text-xs">
                      {dose.isTaken ? (
                        <span className="text-[#20B8A8] flex items-center gap-1.5 font-semibold">
                          <CheckCircle className="w-4 h-4 text-[#20B8A8]" />
                          <span>Dose Taken</span>
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping"></span>
                          <span>Pending dose</span>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDoseTaken(dose.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8] ${
                        dose.isTaken
                          ? 'bg-[#142536] hover:bg-[#1E354A] text-[#94A3B8] hover:text-[#F4F8FB] border border-[#1E354A]'
                          : 'bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724]'
                      }`}
                    >
                      {dose.isTaken ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Undo Take</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('markAsTaken', 'Mark as Taken')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Record Filters Strip */}
      <div className="p-4 rounded-2xl bg-[#142536] border border-[#1E354A] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: t('allRecords', 'All Records') },
            { id: 'symptom_consult', label: t('symptomChecker', 'AI Symptom Checks') },
            { id: 'prescription', label: t('prescriptionScan', 'Prescriptions') },
            { id: 'lab_report', label: t('labReports', 'Lab Reports') },
            { id: 'lab_comparison', label: t('compareLabs', 'Comparisons') },
            { id: 'appointment', label: t('appointments', 'Appointments') },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
                filterType === tab.id
                  ? 'bg-[#20B8A8] text-[#0B1724] font-bold'
                  : 'bg-[#0B1724] border border-[#1E354A] text-[#94A3B8] hover:text-[#F4F8FB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {records.length > 0 && (
          <button
            type="button"
            onClick={handleClearAllRecords}
            className="text-xs text-[#EF4444] hover:text-[#DC2626] transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#EF4444] rounded px-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('wipeHistory', 'Wipe All History')}</span>
          </button>
        )}
      </div>

      {/* Records List */}
      {loading ? (
        <div className="p-12 text-center text-[#94A3B8]">{t('analyzingSymptoms', 'Loading medical history...')}</div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center text-[#94A3B8] bg-[#142536] rounded-2xl border border-[#1E354A] space-y-2">
          <p className="text-sm">No records found in this category.</p>
          <p className="text-xs text-[#94A3B8]/80">
            Use the Symptom Checker, Prescription Scanner, Lab OCR, or Doctor Booking to automatically add verified records.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((rec) => {
            const isExpanded = expandedRecordId === rec.id;
            return (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/40 transition-all space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-[#0B1724] border border-[#1E354A] shrink-0 mt-0.5">
                      {getRecordIcon(rec.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#F4F8FB]">{rec.title}</h3>
                        <span className="text-[10px] uppercase font-semibold text-[#94A3B8] bg-[#0B1724] px-2 py-0.5 rounded border border-[#1E354A]">
                          {rec.type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-[#94A3B8] block font-mono">
                        Date: {rec.date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                      className="p-1.5 text-[#94A3B8] hover:text-[#F4F8FB] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(rec.id)}
                      className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#EF4444]"
                      title={t('delete', 'Delete record')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#94A3B8] leading-relaxed pl-12">
                  {rec.summary}
                </p>

                {isExpanded && rec.payload && (
                  <div className="ml-12 p-4 rounded-xl bg-[#0B1724] border border-[#1E354A] text-xs text-[#94A3B8] space-y-2">
                    <span className="text-[10px] font-semibold text-[#20B8A8] uppercase tracking-wider block">
                      Record Payload Inspection
                    </span>
                    <pre className="text-[11px] font-mono text-[#94A3B8] whitespace-pre-wrap overflow-x-auto max-h-60">
                      {JSON.stringify(rec.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#142536] border border-[#20B8A8]/40 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#F4F8FB]">{t('add', 'Add Health Record Note')}</h3>
            <form onSubmit={handleCreateManualRecord} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Record Category
                </label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as any)}
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                >
                  <option value="symptom_consult" className="bg-[#142536]">AI Health Consultation Note</option>
                  <option value="prescription" className="bg-[#142536]">Prescription Summary</option>
                  <option value="lab_report" className="bg-[#142536]">Diagnostic Lab Result</option>
                  <option value="appointment" className="bg-[#142536]">Doctor Consultation Entry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Annual Health Checkup / Cardiac Clearance"
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Clinical Summary & Notes
                </label>
                <textarea
                  rows={3}
                  value={manualSummary}
                  onChange={(e) => setManualSummary(e.target.value)}
                  placeholder="Summary of findings, advice, or medication instructions..."
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F4F8FB]"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  {t('confirm', 'Save Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Health Goal Modal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/80 backdrop-blur-sm">
          <div className="bg-[#142536] border border-[#1E354A] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E354A] pb-3">
              <div className="flex items-center gap-2 text-[#20B8A8]">
                <Target className="w-5 h-5 text-[#20B8A8]" />
                <h3 className="text-base font-bold text-[#F4F8FB]">Create Daily Health Goal</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGoalModal(false)}
                className="text-[#94A3B8] hover:text-[#F4F8FB] p-1 rounded-lg hover:bg-[#0B1724]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomGoal} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Goal Title / Name
                </label>
                <input
                  type="text"
                  required
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. Daily Pure Water Intake"
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Daily Target
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step={newGoalType === 'sleep' ? '0.5' : '1'}
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                    className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] font-mono outline-none focus:border-[#20B8A8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                    Measurement Unit
                  </label>
                  <input
                    type="text"
                    required
                    value={newGoalUnit}
                    onChange={(e) => setNewGoalUnit(e.target.value)}
                    placeholder="e.g. ml, steps, hrs"
                    className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] font-mono outline-none focus:border-[#20B8A8]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E354A]">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F4F8FB]"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  {t('confirm', 'Add Goal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
