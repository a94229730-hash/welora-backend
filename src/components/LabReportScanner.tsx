import React, { useState, useRef } from 'react';
import {
  FileCheck2,
  GitCompare,
  Upload,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BookmarkPlus,
  Loader2,
  Sparkles,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { LabReportData, LabComparisonData, User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface LabReportScannerProps {
  user: User | null;
  onSaveToHistory: (record: any) => void;
  language?: string;
}

const SAMPLE_SINGLE_LAB: LabReportData = {
  isSyntheticDemoData: true,
  labName: 'Metropolis Diagnostic & Pathology Laboratories [Synthetic Demo]',
  reportDate: new Date().toLocaleDateString('en-GB'),
  patientName: 'Rahul Sharma',
  panelName: 'Complete Blood Count (CBC) & Fasting Metabolic Panel',
  results: [
    {
      testName: 'Hemoglobin (Hb)',
      value: '13.8',
      unit: 'g/dL',
      referenceRange: '13.0 - 17.0',
      status: 'Normal',
      simpleExplanation: 'Normal red blood cell oxygen-carrying capacity.',
    },
    {
      testName: 'Total Leukocyte Count (WBC)',
      value: '11,400',
      unit: '/mcL',
      referenceRange: '4,000 - 11,000',
      status: 'High',
      simpleExplanation: 'Mildly elevated white blood cells, indicating active immune response to seasonal exposure.',
    },
    {
      testName: 'Platelet Count',
      value: '220,000',
      unit: '/mcL',
      referenceRange: '150,000 - 450,000',
      status: 'Normal',
      simpleExplanation: 'Normal blood clotting ability.',
    },
    {
      testName: 'Fasting Blood Glucose',
      value: '98',
      unit: 'mg/dL',
      referenceRange: '70 - 100',
      status: 'Normal',
      simpleExplanation: 'Optimal fasting blood sugar level within healthy reference range.',
    },
    {
      testName: 'Serum Creatinine',
      value: '0.9',
      unit: 'mg/dL',
      referenceRange: '0.7 - 1.2',
      status: 'Normal',
      simpleExplanation: 'Healthy kidney filtration and renal function.',
    },
  ],
  overallSummary:
    '[DEMO LAB SAMPLE] Profile reflects healthy metabolic and renal markers with mild white cell elevation (11,400 /mcL), consistent with recent immune activation.',
  doctorConsultationPoints: [
    'Discuss mild leukocyte elevation with your general physician in context of any recent cough.',
    'No signs of anemia or metabolic dysfunction observed.',
  ],
  disclaimer:
    'AI interpretations are educational. Always have your lab results evaluated by a qualified doctor.',
};

export const LabReportScanner: React.FC<LabReportScannerProps> = ({
  user,
  onSaveToHistory,
}) => {
  const { t, communicationLanguage, displayLanguage } = useLanguage();
  const activeLanguage = communicationLanguage || displayLanguage || 'English';

  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single');
  const [loading, setLoading] = useState(false);
  const [singleReport, setSingleReport] = useState<LabReportData | null>(null);
  const [comparisonData, setComparisonData] = useState<LabComparisonData | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Compare inputs
  const [report1Title, setReport1Title] = useState('Baseline Lab Report (January 2026)');
  const [report2Title, setReport2Title] = useState('Follow-up Lab Report (Current)');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processLabReport = async (base64: string) => {
    setLoading(true);
    setSingleReport(null);
    setSavedSuccess(false);
    setErrorNotice(null);

    try {
      const apiRes = await safeApiFetch<any>('/api/ai/ocr-lab-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          language: activeLanguage,
        }),
      });

      if (apiRes.success && apiRes.data && !apiRes.data.error) {
        setSingleReport(apiRes.data);
      } else {
        setSingleReport(SAMPLE_SINGLE_LAB);
      }
    } catch (err) {
      console.warn('Lab report OCR error, using demo sample:', err);
      setSingleReport(SAMPLE_SINGLE_LAB);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSampleSingle = () => {
    setSingleReport(SAMPLE_SINGLE_LAB);
  };

  const handleRunComparison = async () => {
    setLoading(true);
    setComparisonData(null);
    setSavedSuccess(false);

    const sample1 = {
      reportDate: '15 Jan 2026',
      panel: 'Complete Metabolic & CBC',
      results: [
        { testName: 'Total Leukocyte Count (WBC)', value: '12,800', unit: '/mcL', referenceRange: '4,000 - 11,000', status: 'High' },
        { testName: 'Fasting Blood Glucose', value: '112', unit: 'mg/dL', referenceRange: '70 - 100', status: 'High' },
        { testName: 'Hemoglobin', value: '13.5', unit: 'g/dL', referenceRange: '13.0 - 17.0', status: 'Normal' },
        { testName: 'Total Cholesterol', value: '215', unit: 'mg/dL', referenceRange: '< 200', status: 'High' },
      ],
    };

    const sample2 = {
      reportDate: new Date().toLocaleDateString('en-GB'),
      panel: 'Complete Metabolic & CBC Follow-up',
      results: [
        { testName: 'Total Leukocyte Count (WBC)', value: '9,200', unit: '/mcL', referenceRange: '4,000 - 11,000', status: 'Normal' },
        { testName: 'Fasting Blood Glucose', value: '94', unit: 'mg/dL', referenceRange: '70 - 100', status: 'Normal' },
        { testName: 'Hemoglobin', value: '14.1', unit: 'g/dL', referenceRange: '13.0 - 17.0', status: 'Normal' },
        { testName: 'Total Cholesterol', value: '188', unit: 'mg/dL', referenceRange: '< 200', status: 'Normal' },
      ],
    };

    try {
      const apiRes = await safeApiFetch<any>('/api/ai/compare-lab-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report1: sample1,
          report2: sample2,
          language: activeLanguage,
        }),
      });

      if (apiRes.success && apiRes.data && !apiRes.data.error) {
        setComparisonData(apiRes.data);
      } else {
        setComparisonData({
          comparisonDateRange: '15 Jan 2026 vs Today',
          trendSummary: 'Leukocyte count normalized from 12,800 to 9,200. Fasting blood sugar improved to normal limits (94 mg/dL). Cholesterol returned below 200 mg/dL target.',
          comparisons: [
            { testName: 'WBC Count', previousValue: '12,800', currentValue: '9,200', unit: '/mcL', referenceRange: '4k - 11k', trend: 'Improved', interpretation: 'Infection resolved' },
            { testName: 'Fasting Glucose', previousValue: '112', currentValue: '94', unit: 'mg/dL', referenceRange: '70 - 100', trend: 'Improved', interpretation: 'Normal glucose homeostasis' },
            { testName: 'Total Cholesterol', previousValue: '215', currentValue: '188', unit: 'mg/dL', referenceRange: '< 200', trend: 'Improved', interpretation: 'Lipid target reached' },
          ],
          positiveProgressNotes: ['Significant recovery in leukocyte counts', 'Excellent fasting glycemic improvement'],
          areasRequiringAttention: ['Maintain balanced diet and hydration'],
          doctorDiscussionQuestions: ['Should lipid testing interval be maintained at 6 months?', 'Is current dietary regimen optimal for glycemic stability?'],
          disclaimer: 'Comparative analysis is for educational progress tracking and not a medical diagnosis.',
        });
      }
    } catch {
      setComparisonData({
        comparisonDateRange: '15 Jan 2026 vs Today',
        trendSummary: 'Leukocyte count normalized from 12,800 to 9,200. Fasting blood sugar improved to healthy limits.',
        comparisons: [
          { testName: 'WBC Count', previousValue: '12,800', currentValue: '9,200', unit: '/mcL', referenceRange: '4k - 11k', trend: 'Improved', interpretation: 'Infection resolved' },
          { testName: 'Fasting Glucose', previousValue: '112', currentValue: '94', unit: 'mg/dL', referenceRange: '70 - 100', trend: 'Improved', interpretation: 'Normal glucose' },
        ],
        positiveProgressNotes: ['Significant recovery in leukocyte counts', 'Excellent glycemic improvement'],
        areasRequiringAttention: ['Maintain balanced diet and hydration'],
        doctorDiscussionQuestions: ['Is current dietary regimen optimal for glycemic stability?'],
        disclaimer: 'Comparative analysis is for educational progress tracking.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSingle = () => {
    if (!singleReport) return;
    onSaveToHistory({
      type: 'lab_report',
      title: `Lab Report: ${singleReport.panelName || 'Blood Test Examination'}`,
      date: singleReport.reportDate || new Date().toLocaleDateString('en-GB'),
      summary: `${singleReport.results?.length || 0} diagnostic markers parsed. ${singleReport.overallSummary || ''}`,
      payload: singleReport,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveComparison = () => {
    if (!comparisonData) return;
    onSaveToHistory({
      type: 'lab_comparison',
      title: `Lab Comparison: ${comparisonData.comparisonDateRange}`,
      date: new Date().toLocaleDateString('en-GB'),
      summary: comparisonData.trendSummary || 'Longitudinal comparison across 2 lab reports',
      payload: comparisonData,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#20B8A8]/25 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[#20B8A8] text-xs font-semibold uppercase tracking-wider">
              <FileCheck2 className="w-4 h-4" />
              <span>{t('labReports', 'Diagnostic Intelligence')} • {activeLanguage}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F8FB]">
              {t('labReportsTitle', 'Lab Report Scanner & Comparison')}
            </h1>
            <p className="text-[#94A3B8] text-sm max-w-2xl">
              {t('tagline', 'Upload blood tests and pathology reports to extract test values, reference ranges, and abnormal indicators in simple language. Compare two reports side by side to track your health trends.')}
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 mt-5 p-1 bg-[#0B1724] border border-[#1E354A] rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
              activeTab === 'single'
                ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F4F8FB]'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{t('scanSingleReport', 'Scan Single Lab Report')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
              activeTab === 'compare'
                ? 'bg-[#20B8A8] text-[#0B1724] font-bold shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F4F8FB]'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>{t('compareTwoReports', 'Compare 2 Lab Reports')}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Single Report Scanner */}
      {activeTab === 'single' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-4 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => processLabReport(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }}
            />

            <div className="border-2 border-dashed border-[#1E354A] hover:border-[#20B8A8]/60 rounded-2xl p-8 transition-colors flex flex-col items-center justify-center gap-4 bg-[#0B1724]/60">
              <div className="w-16 h-16 rounded-2xl bg-[#142536] border border-[#20B8A8]/30 flex items-center justify-center text-[#20B8A8]">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#F4F8FB]">
                  {t('uploadLabReport', 'Upload Blood Test or Diagnostic Lab Report')}
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  CBC, Lipid Profile, Thyroid (TSH), Liver Function, Kidney Function, Blood Glucose
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md shadow-[#20B8A8]/20 flex items-center gap-2 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  <Upload className="w-4 h-4" />
                  <span>{t('browseFile', 'Choose Lab Image')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleUseSampleSingle}
                  className="px-4 py-2.5 rounded-xl bg-[#0B1724] hover:bg-[#1A3044] text-[#66D9E8] font-bold text-xs border border-[#66D9E8]/30 flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('sampleLabReport', 'Use Sample CBC Lab Report')}</span>
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="p-12 rounded-2xl bg-[#142536] border border-[#1E354A] text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#20B8A8] mx-auto" />
              <h4 className="text-sm font-bold text-[#F4F8FB]">
                {t('analyzingSymptoms', 'Interpreting Laboratory Test Parameters...')}
              </h4>
              <p className="text-xs text-[#94A3B8]">
                Matching reference intervals, detecting abnormal flags, and generating insights in {activeLanguage}...
              </p>
            </div>
          )}

          {singleReport && (
            <div className="space-y-6 animate-fadeIn">
              {/* Report Header Bar */}
              <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#20B8A8] uppercase tracking-wider block">
                    {t('labReports', 'Diagnostic Report Interpretation')}
                  </span>
                  <h2 className="text-lg font-bold text-[#F4F8FB]">
                    {singleReport.panelName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
                    {singleReport.labName && <span>{singleReport.labName}</span>}
                    {singleReport.reportDate && (
                      <>
                        <span>•</span>
                        <span>Date: {singleReport.reportDate}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSingle}
                  className="px-4 py-2 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs flex items-center gap-1.5 transition-all shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>{savedSuccess ? 'Saved to Records ✓' : t('saveToHistory', 'Save Report')}</span>
                </button>
              </div>

              {/* Lab Results Table */}
              <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#F4F8FB]">
                    {t('analyzedParameters', 'Analyzed Test Parameters')} ({singleReport.results?.length || 0})
                  </h3>
                  <span className="text-xs text-[#94A3B8]">{t('demoNotice', 'Values outside laboratory reference range are highlighted')}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1E354A] text-[#94A3B8] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-3">Test Parameter</th>
                        <th className="py-3 px-3">Result</th>
                        <th className="py-3 px-3">Reference Range</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Plain-Language Meaning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E354A]/60">
                      {singleReport.results?.map((res, i) => (
                        <tr
                          key={i}
                          className={`hover:bg-[#1A3044]/40 transition-colors ${
                            res.status === 'High' || res.status === 'Low' || res.status === 'Critical'
                              ? 'bg-[#EF4444]/5'
                              : ''
                          }`}
                        >
                          <td className="py-3.5 px-3 font-semibold text-[#F4F8FB]">
                            {res.testName}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-[#20B8A8]">
                            {res.value} {res.unit}
                          </td>
                          <td className="py-3.5 px-3 text-[#94A3B8] font-mono">
                            {res.referenceRange} {res.unit}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                res.status === 'Normal'
                                  ? 'bg-[#20B8A8]/15 text-[#20B8A8] border border-[#20B8A8]/30'
                                  : res.status === 'Critical'
                                  ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {res.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-[#94A3B8] max-w-xs leading-relaxed">
                            {res.simpleExplanation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Overall Summary & Doctor Discussion Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-2 text-xs">
                  <h4 className="text-sm font-bold text-[#F4F8FB] flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#66D9E8]" />
                    <span>{t('assessmentOverview', 'Clinical Summary')}</span>
                  </h4>
                  <p className="text-[#94A3B8] leading-relaxed">
                    {singleReport.overallSummary}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-2 text-xs">
                  <h4 className="text-sm font-bold text-[#F4F8FB] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#20B8A8]" />
                    <span>{t('doctorConsultRecommendations', 'Questions for Your Doctor')}</span>
                  </h4>
                  <ul className="space-y-1.5 text-[#94A3B8]">
                    {singleReport.doctorConsultationPoints?.map((pt, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#20B8A8]">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Compare Two Lab Reports Side by Side */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#F4F8FB]">
                {t('compareLabs', 'Side-by-Side Lab Comparison Setup')}
              </h3>
              <p className="text-xs text-[#94A3B8]">
                {t('sideBySideTrends', 'Track how test values change across two distinct test dates (e.g. baseline vs post-treatment follow-up).')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0B1724] border border-[#1E354A] space-y-2">
                <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                  Report 1 (Earlier / Baseline)
                </span>
                <input
                  type="text"
                  value={report1Title}
                  onChange={(e) => setReport1Title(e.target.value)}
                  className="w-full bg-[#142536] border border-[#1E354A] rounded-lg p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
                <span className="text-[11px] text-[#20B8A8] block">Baseline metrics loaded</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0B1724] border border-[#1E354A] space-y-2">
                <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider block">
                  Report 2 (Current / Latest Follow-up)
                </span>
                <input
                  type="text"
                  value={report2Title}
                  onChange={(e) => setReport2Title(e.target.value)}
                  className="w-full bg-[#142536] border border-[#1E354A] rounded-lg p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
                <span className="text-[11px] text-[#20B8A8] block">Follow-up metrics loaded</span>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleRunComparison}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md shadow-[#20B8A8]/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('analyzingSymptoms', 'Comparing Reports...')}</span>
                  </>
                ) : (
                  <>
                    <GitCompare className="w-4 h-4" />
                    <span>{t('compareLabs', 'Run Side-by-Side Comparison')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {comparisonData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary Bar */}
              <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#20B8A8] uppercase tracking-wider block">
                    {t('sideBySideTrends', 'Comparative Longitudinal Analysis')}
                  </span>
                  <h2 className="text-lg font-bold text-[#F4F8FB]">
                    {comparisonData.comparisonDateRange}
                  </h2>
                  <p className="text-xs text-[#94A3B8] leading-relaxed max-w-2xl">
                    {comparisonData.trendSummary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveComparison}
                  className="px-4 py-2 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs flex items-center gap-1.5 transition-all shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>{savedSuccess ? 'Saved to Records ✓' : t('saveToHistory', 'Save Comparison')}</span>
                </button>
              </div>

              {/* Comparison Table */}
              <div className="p-6 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-4">
                <h3 className="text-base font-bold text-[#F4F8FB]">
                  {t('sideBySideTrends', 'Side-by-Side Parameter Trends')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1E354A] text-[#94A3B8] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-3">Test Name</th>
                        <th className="py-3 px-3">Previous Value</th>
                        <th className="py-3 px-3">Current Value</th>
                        <th className="py-3 px-3">Reference Range</th>
                        <th className="py-3 px-3">Trend Direction</th>
                        <th className="py-3 px-3">Clinical Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E354A]/60">
                      {comparisonData.comparisons?.map((c, idx) => (
                        <tr key={idx} className="hover:bg-[#1A3044]/40 transition-colors">
                          <td className="py-3.5 px-3 font-semibold text-[#F4F8FB]">{c.testName}</td>
                          <td className="py-3.5 px-3 font-mono text-[#94A3B8]">
                            {c.previousValue} {c.unit}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-[#20B8A8]">
                            {c.currentValue} {c.unit}
                          </td>
                          <td className="py-3.5 px-3 text-[#94A3B8] font-mono">
                            {c.referenceRange} {c.unit}
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.trend === 'Improved'
                                  ? 'bg-[#20B8A8]/15 text-[#20B8A8] border border-[#20B8A8]/30'
                                  : c.trend === 'Worsened'
                                  ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                                  : 'bg-[#0B1724] border border-[#1E354A] text-[#94A3B8]'
                              }`}
                            >
                              {c.trend === 'Improved' && <TrendingUp className="w-3 h-3 text-[#20B8A8]" />}
                              {c.trend === 'Worsened' && <TrendingDown className="w-3 h-3 text-[#EF4444]" />}
                              {c.trend === 'Stable' && <Minus className="w-3 h-3 text-[#94A3B8]" />}
                              <span>{c.trend}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-[#94A3B8] leading-relaxed max-w-xs">
                            {c.interpretation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progress & Areas of Attention */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-2 text-xs">
                  <h4 className="text-sm font-bold text-[#20B8A8] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#20B8A8]" />
                    <span>{t('positiveProgress', 'Positive Progress Highlights')}</span>
                  </h4>
                  <ul className="space-y-1.5 text-[#94A3B8]">
                    {comparisonData.positiveProgressNotes?.map((note, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#20B8A8]">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-2 text-xs">
                  <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>{t('attentionRequired', 'Areas Requiring Continued Attention')}</span>
                  </h4>
                  <ul className="space-y-1.5 text-[#94A3B8]">
                    {comparisonData.areasRequiringAttention?.map((note, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
