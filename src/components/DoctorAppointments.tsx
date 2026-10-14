import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User as UserIcon,
  Search,
  Star,
  MapPin,
  CheckCircle,
  XCircle,
  RotateCcw,
  CalendarDays,
  BookmarkPlus,
  Loader2,
  Stethoscope,
} from 'lucide-react';
import { Doctor, Appointment, User } from '../types';
import { VERIFIED_DOCTORS } from '../data/mockDoctors';
import { DoctorAvatar } from './DoctorAvatar';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface DoctorAppointmentsProps {
  user: User | null;
  onSaveToHistory: (record: any) => void;
  language?: string;
}

export const DoctorAppointments: React.FC<DoctorAppointmentsProps> = ({
  user,
  onSaveToHistory,
}) => {
  const { t, displayLanguage } = useLanguage();
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [searchDoctor, setSearchDoctor] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Booking form state
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [patientName, setPatientName] = useState(user?.name || 'Rahul Sharma');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '+91-9876543210');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccessModal, setBookingSuccessModal] = useState<Appointment | null>(null);

  // User's active appointments
  const [userAppointments, setUserAppointments] = useState<Appointment[]>(() => {
    try {
      const local = localStorage.getItem(`welora_appts_${user?.id || 'demo'}`);
      if (local) return JSON.parse(local);
    } catch {}
    return [
      {
        id: 'apt_demo_init',
        doctorId: 'doc_1',
        doctorName: 'Dr. Aarav Mehta',
        specialty: 'General Physician & Internal Medicine',
        hospital: 'AIIMS & City Medical Centre',
        date: '2026-10-18',
        time: '11:00 AM',
        patientName: 'Rahul Sharma',
        patientPhone: '+91-9876543210',
        chiefComplaint: 'Post-viral follow-up & blood pressure check',
        status: 'Confirmed',
        consultationFee: 800,
        bookedAt: new Date().toISOString(),
      },
    ];
  });
  const [loadingAppts, setLoadingAppts] = useState(false);

  // Reschedule state
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const specialties = [
    'All Specialties',
    'General Physician',
    'Cardiologist',
    'Neurologist',
    'Pediatrician',
    'Orthopedic',
    'Dermatologist',
    'Gynecologist',
    'Pulmonologist',
  ];

  const cities = ['All Cities', 'Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad'];

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('welora_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchAppointments = async () => {
    if (!user) return;
    setLoadingAppts(true);
    try {
      const res = await safeApiFetch<any>(`/api/appointments/${user.id}`, {
        headers: getAuthHeaders(),
      });
      if (res.success && Array.isArray(res.data?.appointments) && res.data.appointments.length > 0) {
        setUserAppointments(res.data.appointments);
        localStorage.setItem(`welora_appts_${user.id}`, JSON.stringify(res.data.appointments));
      }
    } catch (err) {
      console.warn('Appointments fetch error, using local storage cache:', err);
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const filteredDoctors = VERIFIED_DOCTORS.filter((doc) => {
    const matchesSpec =
      selectedSpecialty === 'All Specialties' ||
      doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());
    const matchesCity =
      selectedCity === 'All Cities' || doc.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesSearch =
      !searchDoctor.trim() ||
      doc.name.toLowerCase().includes(searchDoctor.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(searchDoctor.toLowerCase());
    return matchesSpec && matchesCity && matchesSearch;
  });

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedTimeSlot || !user) return;

    setIsSubmitting(true);
    const appointmentPayload = {
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      specialty: selectedDoctor.specialty,
      hospital: selectedDoctor.hospital,
      date: bookingDate,
      time: selectedTimeSlot,
      patientName,
      patientPhone,
      chiefComplaint: chiefComplaint || 'Routine Medical Checkup',
      consultationFee: selectedDoctor.consultationFee,
    };

    try {
      const res = await safeApiFetch<any>(`/api/appointments/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(appointmentPayload),
      });

      let confirmedAppt: Appointment;
      if (res.success && res.data?.appointment) {
        confirmedAppt = res.data.appointment;
      } else {
        // Resilient fallback (Netlify static deploy ready)
        confirmedAppt = {
          ...appointmentPayload,
          id: 'apt_' + Date.now(),
          status: 'Confirmed',
          bookedAt: new Date().toISOString(),
          isDemoAppointment: true,
        };
      }

      const nextList = [confirmedAppt, ...userAppointments];
      setUserAppointments(nextList);
      localStorage.setItem(`welora_appts_${user.id}`, JSON.stringify(nextList));

      // Add to user medical history automatically
      onSaveToHistory({
        type: 'appointment',
        title: `Appointment Confirmed: Dr. ${selectedDoctor.name}`,
        date: bookingDate,
        summary: `Scheduled for ${bookingDate} at ${selectedTimeSlot} at ${selectedDoctor.hospital}. Complaint: ${appointmentPayload.chiefComplaint}`,
        payload: confirmedAppt,
      });

      setBookingSuccessModal(confirmedAppt);
      setSelectedDoctor(null);
      setChiefComplaint('');
      setSelectedTimeSlot('');
    } catch (err) {
      console.error('Appointment booking error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!user) return;
    const nextList = userAppointments.map((apt) =>
      apt.id === apptId ? { ...apt, status: 'Cancelled' as const } : apt
    );
    setUserAppointments(nextList);
    localStorage.setItem(`welora_appts_${user.id}`, JSON.stringify(nextList));

    try {
      await safeApiFetch(`/api/appointments/${user.id}/${apptId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status: 'Cancelled' }),
      });
    } catch {}
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reschedulingAppt || !newDate || !newTime) return;

    const nextList = userAppointments.map((apt) =>
      apt.id === reschedulingAppt.id
        ? { ...apt, date: newDate, time: newTime, status: 'Rescheduled' as const }
        : apt
    );
    setUserAppointments(nextList);
    localStorage.setItem(`welora_appts_${user.id}`, JSON.stringify(nextList));
    setReschedulingAppt(null);

    try {
      await safeApiFetch(`/api/appointments/${user.id}/${reschedulingAppt.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          date: newDate,
          time: newTime,
          status: 'Rescheduled',
        }),
      });
    } catch {}
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#20B8A8]/25 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[#20B8A8] text-xs font-semibold uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            <span>{t('appointments', 'Doctor Consultation Booking')} • {displayLanguage}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F8FB]">
            {t('appointmentBookingTitle', 'Doctor Appointment Booking & Reminders')}
          </h1>
          <p className="text-[#94A3B8] text-sm max-w-2xl">
            {t('tagline', 'Search verified physicians across 9 medical specialties, view hospital affiliations and verified credentials, schedule consultations, and manage weekly appointment reminders.')}
          </p>
        </div>
      </div>

      {/* User's Existing Appointments Strip */}
      {user && userAppointments.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F4F8FB] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#20B8A8]" />
              <span>{t('scheduledAppointments', 'Your Scheduled Appointments')} ({userAppointments.length})</span>
            </h3>
            <span className="text-[11px] text-[#94A3B8]">Weekly Consultation List</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {userAppointments.map((appt) => (
              <div
                key={appt.id}
                className="p-4 rounded-xl bg-[#0B1724] border border-[#1E354A] flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#20B8A8]">{appt.doctorName}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        appt.status === 'Confirmed'
                          ? 'bg-[#20B8A8]/15 text-[#20B8A8] border border-[#20B8A8]/30'
                          : appt.status === 'Cancelled'
                          ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">{appt.specialty}</div>
                  <div className="text-[11px] text-[#94A3B8]/80">{appt.hospital}</div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F8FB] pt-1">
                    <Calendar className="w-3.5 h-3.5 text-[#20B8A8]" />
                    <span>{appt.date}</span>
                    <Clock className="w-3.5 h-3.5 text-[#66D9E8] ml-1" />
                    <span>{appt.time}</span>
                  </div>
                </div>

                {appt.status !== 'Cancelled' && (
                  <div className="pt-2 border-t border-[#1E354A] flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setReschedulingAppt(appt);
                        setNewDate(appt.date);
                        setNewTime(appt.time);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[#94A3B8] hover:text-[#F4F8FB] bg-[#142536] border border-[#1E354A] transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('reschedule', 'Reschedule')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelAppointment(appt.id)}
                      className="px-2.5 py-1 rounded-lg text-[#EF4444] hover:text-[#DC2626] bg-[#EF4444]/10 border border-[#EF4444]/30 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#EF4444]"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>{t('cancel', 'Cancel')}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specialty and City Filters */}
      <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {specialties.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => setSelectedSpecialty(spec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
                  selectedSpecialty === spec
                    ? 'bg-[#20B8A8] text-[#0B1724] font-bold'
                    : 'bg-[#0B1724] border border-[#1E354A] text-[#94A3B8] hover:text-[#F4F8FB]'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchDoctor}
              onChange={(e) => setSearchDoctor(e.target.value)}
              placeholder={`Search doctor or hospital in ${displayLanguage}...`}
              className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F4F8FB] placeholder-[#94A3B8] outline-none focus:border-[#20B8A8]"
            />
          </div>
        </div>

        {/* City Filter */}
        <div className="flex items-center gap-2 text-xs text-[#94A3B8] pt-1 flex-wrap">
          <span className="font-semibold text-[#94A3B8]">City:</span>
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCity(c)}
              className={`hover:text-[#20B8A8] transition-colors ${
                selectedCity === c ? 'text-[#20B8A8] font-bold underline' : ''
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDoctors.map((doc) => (
          <div
            key={doc.id}
            className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/40 hover:bg-[#1A3044] transition-all flex flex-col justify-between space-y-4 shadow-lg"
          >
            <div className="flex items-start gap-4">
              <DoctorAvatar doctor={doc} size="md" allowCustomUpload={true} />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#F4F8FB]">{doc.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{doc.rating}</span>
                  </div>
                </div>
                <div className="text-xs text-[#20B8A8] font-medium">{doc.specialty}</div>
                <div className="text-[11px] text-[#94A3B8]">{doc.degrees} • {doc.experienceYears} yrs experience</div>
                <div className="text-xs text-[#94A3B8] flex items-center gap-1 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span>{doc.hospital}, {doc.city}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1E354A] flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Consultation Fee</span>
                <span className="text-sm font-extrabold text-[#F4F8FB]">₹ {doc.consultationFee}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDoctor(doc);
                  setSelectedTimeSlot(doc.timeSlots[0] || '10:00 AM');
                }}
                className="px-4 py-2 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md shadow-[#20B8A8]/20 active:scale-95 transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('bookConsultation', 'Book Consultation')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#142536] border border-[#20B8A8]/40 rounded-2xl p-6 shadow-2xl my-6">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#1E354A]">
              <DoctorAvatar doctor={selectedDoctor} size="md" />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#F4F8FB]">
                  Confirm Appointment with {selectedDoctor.name}
                </h3>
                <p className="text-xs text-[#20B8A8] font-medium">
                  {selectedDoctor.specialty} • {selectedDoctor.hospital} (Fee: ₹ {selectedDoctor.consultationFee})
                </p>
              </div>
            </div>

            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Select Consultation Date
                </label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Available Time Slots
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {selectedDoctor.timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`p-2 rounded-lg text-xs font-semibold text-center transition-colors border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
                        selectedTimeSlot === slot
                          ? 'bg-[#20B8A8] text-[#0B1724] border-[#20B8A8] font-bold'
                          : 'bg-[#0B1724] border-[#1E354A] text-[#94A3B8] hover:border-[#20B8A8]/40 hover:text-[#F4F8FB]'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Patient Full Name
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  Chief Health Complaint / Symptoms
                </label>
                <textarea
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Follow-up for hypertension, reviewing test results..."
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#94A3B8] hover:text-[#F4F8FB]"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedTimeSlot}
                  className="px-5 py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md shadow-[#20B8A8]/20 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{t('confirm', 'Confirm Appointment')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Success Modal */}
      {bookingSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#142536] border border-[#20B8A8]/40 rounded-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#20B8A8]/15 border border-[#20B8A8]/30 flex items-center justify-center text-[#20B8A8] mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B1724] border border-[#20B8A8]/30 text-[#20B8A8] text-xs font-bold uppercase tracking-wider mx-auto">
              <span>Appointment Confirmed</span>
            </div>
            <h3 className="text-xl font-bold text-[#F4F8FB]">
              Consultation Scheduled
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Your consultation with <strong className="text-[#F4F8FB]">{bookingSuccessModal.doctorName}</strong> is confirmed for <strong className="text-[#F4F8FB]">{bookingSuccessModal.date} at {bookingSuccessModal.time}</strong> at {bookingSuccessModal.hospital}.
            </p>
            <div className="p-3 bg-[#0B1724] rounded-xl text-xs text-[#94A3B8] border border-[#1E354A] text-left space-y-1">
              <div className="font-semibold text-[#F4F8FB]">Patient: {bookingSuccessModal.patientName}</div>
              <div className="text-[11px] text-[#94A3B8]">
                Appointment reference ID: <span className="font-mono text-[#20B8A8]">{bookingSuccessModal.id}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBookingSuccessModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
            >
              {t('confirm', 'Done & View Schedule')}
            </button>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1724]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#142536] border border-[#1E354A] rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#F4F8FB]">
              Reschedule Appointment with {reschedulingAppt.doctorName}
            </h3>
            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#F4F8FB] mb-1">
                  New Time Slot
                </label>
                <input
                  type="text"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="e.g. 11:30 AM"
                  className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl p-2.5 text-xs text-[#F4F8FB] outline-none focus:border-[#20B8A8]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReschedulingAppt(null)}
                  className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F4F8FB]"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                >
                  {t('reschedule', 'Update Booking')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
