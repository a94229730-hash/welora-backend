import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  PhoneCall,
  Search,
  Building2,
  ShieldCheck,
  Compass,
  ExternalLink,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Hospital } from '../types';
import { VERIFIED_HOSPITALS, calculateHaversineDistance } from '../data/hospitals';
import { EmergencyCallConfirmModal } from './EmergencyCallConfirmModal';
import { useLanguage } from '../context/LanguageContext';
import { safeApiFetch } from '../utils/apiClient';

interface NearbyHospitalsProps {
  language?: string;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Delhi: { lat: 28.6139, lng: 77.2090 },
  Mumbai: { lat: 18.9986, lng: 72.8427 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
};

export const NearbyHospitals: React.FC<NearbyHospitalsProps> = () => {
  const { t, displayLanguage } = useLanguage();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Location auto-detected or select city');
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospitalForCall, setSelectedHospitalForCall] = useState<Hospital | null>(null);

  const cities = ['All Cities', 'Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur'];

  // Pure client-side filtering and sorting for instant offline and Netlify static readiness
  const getFilteredHospitals = (
    lat?: number,
    lng?: number,
    city?: string,
    q?: string
  ): Hospital[] => {
    let list = [...VERIFIED_HOSPITALS];

    if (city && city !== 'All Cities') {
      const cLower = city.toLowerCase();
      list = list.filter((h) => h.city.toLowerCase().includes(cLower) || h.state.toLowerCase().includes(cLower));
    }

    if (q && q.trim()) {
      const query = q.toLowerCase().trim();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(query) ||
          h.address.toLowerCase().includes(query) ||
          h.city.toLowerCase().includes(query) ||
          h.specialties.some((s) => s.toLowerCase().includes(query))
      );
    }

    // Determine reference coordinates: GPS if granted, else city center coordinates
    const refLat = lat !== undefined ? lat : (city && CITY_COORDINATES[city] ? CITY_COORDINATES[city].lat : undefined);
    const refLng = lng !== undefined ? lng : (city && CITY_COORDINATES[city] ? CITY_COORDINATES[city].lng : undefined);

    if (refLat !== undefined && refLng !== undefined) {
      list = list.map((h) => ({
        ...h,
        distanceKm: calculateHaversineDistance(refLat, refLng, h.lat, h.lng),
      }));
      list.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    return list;
  };

  const fetchHospitals = async (lat?: number, lng?: number, city?: string, q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lat && lng) {
        params.append('lat', lat.toString());
        params.append('lng', lng.toString());
      }
      if (city && city !== 'All Cities') {
        params.append('city', city);
      }
      if (q) {
        params.append('search', q);
      }

      const res = await safeApiFetch<any>(`/api/hospitals?${params.toString()}`);
      if (res.success && Array.isArray(res.data?.hospitals)) {
        setHospitals(res.data.hospitals);
      } else {
        // Resilient client fallback (Netlify static support)
        const fallbackList = getFilteredHospitals(lat, lng, city, q);
        setHospitals(fallbackList);
      }
    } catch {
      const fallbackList = getFilteredHospitals(lat, lng, city, q);
      setHospitals(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser. Using city directory.');
      return;
    }

    setLocationStatus('Locating your position via GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setLocationStatus(`GPS Locked: ${coords.lat.toFixed(3)}°N, ${coords.lng.toFixed(3)}°E — Sorted by nearest`);
        fetchHospitals(coords.lat, coords.lng, selectedCity, searchQuery);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocationStatus('GPS access not granted. Showing verified emergency centers by city.');
        fetchHospitals(undefined, undefined, selectedCity, searchQuery);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    fetchHospitals(userLocation?.lat, userLocation?.lng, city, searchQuery);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHospitals(userLocation?.lat, userLocation?.lng, selectedCity, searchQuery);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#142536] border border-[#20B8A8]/25 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[#20B8A8] text-xs font-semibold uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>{t('nearbyHospitals', 'Verified Hospital Directory')} • {displayLanguage}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F8FB]">
              {t('findHospitalsTitle', 'Find Nearby Hospitals & Emergency Trauma Facilities')}
            </h1>
            <p className="text-[#94A3B8] text-sm max-w-2xl">
              {t('tagline', 'Verified multi-specialty trauma centers, government apex institutes, and emergency rooms with real calculated distances and telephone call authorization.')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestLocation}
            className="px-5 py-2.5 rounded-xl bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs shadow-md shadow-[#20B8A8]/20 flex items-center gap-2 transition-all active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
          >
            <Navigation className="w-4 h-4" />
            <span>{t('useMyLocation', 'Use My Location')}</span>
          </button>
        </div>

        {locationStatus && (
          <div className="mt-4 text-xs text-[#66D9E8] flex items-center gap-2 bg-[#0B1724] px-3.5 py-2 rounded-xl border border-[#1E354A]">
            <MapPin className="w-3.5 h-3.5 text-[#20B8A8] shrink-0" />
            <span>{locationStatus}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xl">
        {/* City Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => handleCityChange(city)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8] ${
                selectedCity === city
                  ? 'bg-[#20B8A8] text-[#0B1724] font-bold'
                  : 'bg-[#0B1724] border border-[#1E354A] text-[#94A3B8] hover:text-[#F4F8FB]'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Text Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search hospital or specialty in ${displayLanguage}...`}
              className="w-full bg-[#0B1724] border border-[#1E354A] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F4F8FB] placeholder-[#94A3B8] outline-none focus:border-[#20B8A8]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#0B1724] hover:bg-[#1A3044] text-[#F4F8FB] text-xs font-semibold border border-[#1E354A] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
          >
            {t('search', 'Search')}
          </button>
        </form>
      </div>

      {/* Hospital Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-[#94A3B8] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#20B8A8] mx-auto" />
          <p className="text-xs">{t('analyzingSymptoms', 'Locating verified medical facilities...')}</p>
        </div>
      ) : hospitals.length === 0 ? (
        <div className="p-12 text-center text-[#94A3B8] bg-[#142536] rounded-2xl border border-[#1E354A]">
          No hospitals found matching your criteria. Try choosing &ldquo;All Cities&rdquo;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hospitals.map((hosp) => (
            <div
              key={hosp.id}
              className="p-5 rounded-2xl bg-[#142536] border border-[#1E354A] hover:border-[#20B8A8]/40 hover:bg-[#1A3044] transition-all flex flex-col justify-between space-y-4 shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#20B8A8] uppercase tracking-wider block">
                      {hosp.city}, {hosp.state} • {hosp.type}
                    </span>
                    <h3 className="text-base font-bold text-[#F4F8FB] mt-0.5">
                      {hosp.name}
                    </h3>
                  </div>
                  {hosp.distanceKm !== undefined && (
                    <span className="text-xs font-mono font-bold text-[#66D9E8] bg-[#0B1724] border border-[#66D9E8]/30 px-2.5 py-1 rounded-lg shrink-0">
                      {hosp.distanceKm} km away
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#94A3B8] flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mt-0.5" />
                  <span>{hosp.address}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] font-semibold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 px-2 py-0.5 rounded">
                    {hosp.traumaLevel}
                  </span>
                  <span className="text-[10px] font-semibold bg-[#20B8A8]/15 text-[#20B8A8] border border-[#20B8A8]/30 px-2 py-0.5 rounded">
                    {hosp.bedsAvailable}
                  </span>
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hosp.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-[#0B1724] text-[#94A3B8] px-2 py-0.5 rounded border border-[#1E354A]"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#1E354A] flex items-center justify-between gap-2">
                <div className="text-xs text-[#94A3B8]">
                  <span>Emergency Desk: </span>
                  <strong className="text-[#EF4444] font-mono">{hosp.emergencyPhone}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${hosp.lat},${hosp.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#0B1724] hover:bg-[#1A3044] text-[#F4F8FB] text-xs font-medium border border-[#1E354A] flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#20B8A8]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t('directions', 'Directions')}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setSelectedHospitalForCall(hosp)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#20B8A8] hover:bg-[#1AA394] text-[#0B1724] font-bold text-xs flex items-center gap-1.5 transition-all shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20B8A8]"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{t('callNow', 'Call Desk')}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Call Confirmation Popup */}
      {selectedHospitalForCall && (
        <EmergencyCallConfirmModal
          isOpen={Boolean(selectedHospitalForCall)}
          serviceName={`${selectedHospitalForCall.name} (Emergency Casualty)`}
          phoneNumber={selectedHospitalForCall.emergencyPhone || selectedHospitalForCall.phone}
          onConfirm={() => setSelectedHospitalForCall(null)}
          onCancel={() => setSelectedHospitalForCall(null)}
          language={displayLanguage}
        />
      )}
    </div>
  );
};
