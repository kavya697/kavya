import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  RefreshCw,
  Search,
  Send,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';

import heroImage from './assets/images/hero_luxury_travel_1790763254393.jpg';
import swissAlpsImage from './assets/images/dest_swiss_alps_1790763287143.jpg';
import santoriniImage from './assets/images/dest_santorini_caldera_1790763302515.jpg';

const N8N_FORM_URL =
  'https://alekhya-12.app.n8n.cloud/form/34089590-0cef-4d18-87e9-a6b2ec9d94c0';

interface TravelFormState {
  startLocation: string; // field-0: start location
  destination: string;   // field-1: Destination
  travelDate: string;    // field-2: travel date
  returnDate: string;    // field-3: return date
  travelers: string;     // field-4: no of people travelling
  budget: string;        // field-5: budget
  email: string;         // field-6: email
}

interface FieldErrors {
  startLocation?: string;
  destination?: string;
  travelDate?: string;
  returnDate?: string;
  travelers?: string;
  budget?: string;
  email?: string;
}

interface DispatchRecord {
  id: string;
  submittedAt: string;
  status: 'recorded' | 'failed';
  httpStatus: number;
  durationMs: number;
  responseMessage: string;
  payload: TravelFormState;
}

interface CuratedRoute {
  id: string;
  number: string;
  title: string;
  startLocation: string;
  destination: string;
  durationDays: number;
  recommendedTravelers: string;
  recommendedBudget: string;
  seasonNote: string;
  summary: string;
  imageUrl?: string;
}

const CURATED_ROUTES: CuratedRoute[] = [
  {
    id: 'alpine-rail',
    number: '01.',
    title: 'Swiss Alpine Panoramic Rail & Engadin Valley',
    startLocation: 'Zurich, Switzerland',
    destination: 'St. Moritz & Zermatt, Switzerland',
    durationDays: 7,
    recommendedTravelers: '2',
    recommendedBudget: '$6,800 USD',
    seasonNote: 'First-Class Glacier Express',
    summary:
      'Seven-day high-altitude rail itinerary linking Zurich, the Albula Viaduct, St. Moritz, and Zermatt with private mountain lodge transfers.',
    imageUrl: swissAlpsImage,
  },
  {
    id: 'aegean-caldera',
    number: '02.',
    title: 'Cycladic Caldera & Aegean Island Passage',
    startLocation: 'Athens, Greece',
    destination: 'Oia, Santorini & Naxos, Greece',
    durationDays: 8,
    recommendedTravelers: '2',
    recommendedBudget: '$5,400 USD',
    seasonNote: 'Private Catamaran & Cliffside Suite',
    summary:
      'Eight-day architectural coast journey from Athens through Naxos and Santorini with sunset catamaran charter and vineyard tastings.',
    imageUrl: santoriniImage,
  },
  {
    id: 'kyoto-ryokan',
    number: '03.',
    title: 'Kyoto Autumn Sanctuary & Arashiyama Cedar Retreat',
    startLocation: 'Tokyo, Japan',
    destination: 'Kyoto & Hakone, Japan',
    durationDays: 9,
    recommendedTravelers: '2',
    recommendedBudget: '$7,200 USD',
    seasonNote: 'Shinkansen Green Car & Traditional Ryokan',
    summary:
      'Nine-day cultural dispatch from Tokyo to Kyoto and Hakone featuring private temple garden access, kaiseki dining, and cedar onsen stays.',
  },
];

const QUICK_START_HUBS = [
  'New York, USA',
  'London, UK',
  'Hyderabad, India',
  'Singapore',
  'San Francisco, USA',
  'Dubai, UAE',
];

const QUICK_BUDGET_TIERS = [
  '$2,500 USD',
  '$4,500 USD',
  '$6,800 USD',
  '$10,000 USD',
  '₹2,50,000 INR',
];

function getFutureDateString(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

export default function App() {
  const [formState, setFormState] = useState<TravelFormState>({
    startLocation: 'Hyderabad, India',
    destination: 'St. Moritz & Zermatt, Switzerland',
    travelDate: getFutureDateString(14),
    returnDate: getFutureDateString(21),
    travelers: '2',
    budget: '$6,800 USD',
    email: '',
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    'bespoke' | 'embed' | 'schema'
  >('bespoke');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    ok: boolean;
    status: number;
    durationMs: number;
    message: string;
    timestamp: string;
  } | null>(null);

  const [endpointHealth, setEndpointHealth] = useState<{
    checking: boolean;
    ok: boolean | null;
    latencyMs?: number;
    formTitle?: string;
  }>({
    checking: true,
    ok: null,
  });

  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [failedRouteImages, setFailedRouteImages] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'recorded' | 'failed'>('all');

  const [dispatchHistory, setDispatchHistory] = useState<DispatchRecord[]>(() => {
    try {
      const saved = localStorage.getItem('n8n_travelling_agent_ledger_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'n8n_travelling_agent_ledger_v1',
        JSON.stringify(dispatchHistory)
      );
    } catch {
      // ignore storage errors
    }
  }, [dispatchHistory]);

  const verifyN8nEndpoint = async () => {
    setEndpointHealth((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch('/api/verify-n8n-form');
      const data = await res.json();
      setEndpointHealth({
        checking: false,
        ok: Boolean(data.ok),
        latencyMs: data.latencyMs,
        formTitle: data.formTitle || 'Travelling Agent',
      });
    } catch {
      setEndpointHealth({
        checking: false,
        ok: false,
      });
    }
  };

  useEffect(() => {
    verifyN8nEndpoint();
  }, []);

  // Calculate trip metrics for live preview
  const tripMetrics = useMemo(() => {
    let days = 0;
    if (formState.travelDate && formState.returnDate) {
      const start = new Date(formState.travelDate);
      const end = new Date(formState.returnDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diff = Math.round(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        days = diff >= 0 ? diff || 1 : 0;
      }
    }

    const numTravelers = Math.max(
      1,
      parseInt(formState.travelers.replace(/[^0-9]/g, ''), 10) || 1
    );

    const numericBudget = parseFloat(
      formState.budget.replace(/[^0-9.]/g, '')
    );
    const currencySymbol = formState.budget.includes('₹')
      ? '₹'
      : formState.budget.includes('€')
      ? '€'
      : formState.budget.includes('£')
      ? '£'
      : '$';

    const perPerson =
      !isNaN(numericBudget) && numericBudget > 0
        ? Math.round(numericBudget / numTravelers)
        : null;

    const perDay =
      !isNaN(numericBudget) && numericBudget > 0 && days > 0
        ? Math.round(numericBudget / days)
        : null;

    return {
      days,
      numTravelers,
      currencySymbol,
      perPerson,
      perDay,
    };
  }, [
    formState.travelDate,
    formState.returnDate,
    formState.travelers,
    formState.budget,
  ]);

  const validateForm = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (!formState.startLocation.trim()) {
      nextErrors.startLocation = 'Start location (field-0) is required';
    }
    if (!formState.destination.trim()) {
      nextErrors.destination = 'Destination (field-1) is required';
    }
    if (!formState.travelDate.trim()) {
      nextErrors.travelDate = 'Travel date (field-2) is required';
    }
    if (!formState.returnDate.trim()) {
      nextErrors.returnDate = 'Return date (field-3) is required';
    } else if (formState.travelDate && formState.returnDate) {
      const start = new Date(formState.travelDate);
      const end = new Date(formState.returnDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        nextErrors.returnDate = 'Return date must be on or after the travel date';
      }
    }
    if (!formState.travelers.trim()) {
      nextErrors.travelers = 'Number of travellers (field-4) is required';
    }
    if (!formState.budget.trim()) {
      nextErrors.budget = 'Budget (field-5) is required';
    }
    const emailTrimmed = formState.email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailTrimmed) {
      nextErrors.email = 'Email address (field-6) is required';
    } else if (!emailRegex.test(emailTrimmed)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFieldChange = (field: keyof TravelFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const adjustTravelers = (delta: number) => {
    const current = parseInt(formState.travelers, 10) || 1;
    const next = Math.max(1, Math.min(50, current + delta));
    handleFieldChange('travelers', String(next));
  };

  const handleSelectCuratedRoute = (route: CuratedRoute) => {
    const start = getFutureDateString(14);
    const end = getFutureDateString(14 + route.durationDays);
    setFormState((prev) => ({
      ...prev,
      startLocation: route.startLocation,
      destination: route.destination,
      travelDate: start,
      returnDate: end,
      travelers: route.recommendedTravelers,
      budget: route.recommendedBudget,
    }));
    setErrors({});
    setActiveWorkspaceTab('bespoke');
    const el = document.getElementById('itinerary-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionResult(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/submit-travel-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formState,
          formUrl: N8N_FORM_URL,
        }),
      });

      const data = await response.json();
      const nowIso = new Date().toISOString();

      const record: DispatchRecord = {
        id: `DSP-${Date.now().toString().slice(-6)}`,
        submittedAt: nowIso,
        status: data.ok ? 'recorded' : 'failed',
        httpStatus: data.status || response.status,
        durationMs: data.durationMs || 0,
        responseMessage:
          data.message ||
          (data.ok
            ? 'Form Submitted — Your response has been recorded'
            : data.error || 'Submission error'),
        payload: { ...formState },
      };

      setDispatchHistory((prev) => [record, ...prev]);
      setSubmissionResult({
        ok: Boolean(data.ok),
        status: data.status || response.status,
        durationMs: data.durationMs || 0,
        message: record.responseMessage,
        timestamp: nowIso,
      });
    } catch (error) {
      const nowIso = new Date().toISOString();
      const message =
        error instanceof Error
          ? error.message
          : 'Network error while contacting n8n dispatch proxy.';
      setSubmissionResult({
        ok: false,
        status: 500,
        durationMs: 0,
        message,
        timestamp: nowIso,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const curlSnippet = useMemo(() => {
    const esc = (s: string) => s.replace(/"/g, '\\"');
    return `curl -X POST "${N8N_FORM_URL}" \\
  -F "field-0=${esc(formState.startLocation)}" \\
  -F "field-1=${esc(formState.destination)}" \\
  -F "field-2=${esc(formState.travelDate)}" \\
  -F "field-3=${esc(formState.returnDate)}" \\
  -F "field-4=${esc(formState.travelers)}" \\
  -F "field-5=${esc(formState.budget)}" \\
  -F "field-6=${esc(formState.email || 'traveller@example.com')}"`;
  }, [formState]);

  const filteredLedger = useMemo(() => {
    return dispatchHistory.filter((item) => {
      if (ledgerFilter !== 'all' && item.status !== ledgerFilter) {
        return false;
      }
      if (!ledgerSearch.trim()) {
        return true;
      }
      const q = ledgerSearch.toLowerCase();
      return (
        item.payload.startLocation.toLowerCase().includes(q) ||
        item.payload.destination.toLowerCase().includes(q) ||
        item.payload.email.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [dispatchHistory, ledgerFilter, ledgerSearch]);

  const handleExportLedgerCsv = () => {
    if (dispatchHistory.length === 0) return;
    const headers = [
      'Dispatch_ID',
      'Submitted_At',
      'Status',
      'HTTP_Status',
      'field-0_start_location',
      'field-1_Destination',
      'field-2_travel_date',
      'field-3_return_date',
      'field-4_no_of_people_travelling',
      'field-5_budget',
      'field-6_email',
    ];
    const rows = dispatchHistory.map((r) =>
      [
        r.id,
        r.submittedAt,
        r.status,
        r.httpStatus,
        `"${r.payload.startLocation.replace(/"/g, '""')}"`,
        `"${r.payload.destination.replace(/"/g, '""')}"`,
        `"${r.payload.travelDate.replace(/"/g, '""')}"`,
        `"${r.payload.returnDate.replace(/"/g, '""')}"`,
        `"${r.payload.travelers.replace(/"/g, '""')}"`,
        `"${r.payload.budget.replace(/"/g, '""')}"`,
        `"${r.payload.email.replace(/"/g, '""')}"`,
      ].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `travelling-agent-dispatches-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-sky-700 selection:text-white">
      {/* Top Bar Contract: Strictly 1 row, 3 zones (Brand wordmark | 4 nav links | 1 primary action) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#"
            className="font-display text-2xl tracking-tight text-slate-900 whitespace-nowrap"
          >
            Travelling Agent
          </a>

          {/* Zone 2: 4 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a
              href="#itinerary-form"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Dispatch Form
            </a>
            <a
              href="#curated-routes"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Curated Routes
            </a>
            <a
              href="#workflow-schema"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Field Mapping
            </a>
            <a
              href="#dispatch-ledger"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Submission Ledger
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3">
            <a
              href="#itinerary-form"
              onClick={() => setActiveWorkspaceTab('bespoke')}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              New Itinerary Request
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-[1200px] mx-auto px-6 pt-8 pb-12">
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 min-h-[420px] flex items-end">
            {!heroImgFailed ? (
              <img
                src={heroImage}
                alt="Sunlit coastal limestone arches overlooking the Mediterranean sea at golden hour"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            ) : (
              <div
                className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950"
                aria-hidden="true"
              />
            )}

            {/* Measured contrast scrim ensuring >= 4.5:1 contrast */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/20"
              aria-hidden="true"
            />

            <div className="relative z-10 w-full p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="max-w-2xl">
                <p className="text-xs font-medium text-sky-200 tracking-wide mb-3">
                  Automated Itinerary Intake · Connected to alekhya-12.app.n8n.cloud
                </p>
                <h1
                  className="font-display text-4xl sm:text-5xl md:text-[54px] text-white leading-[1.08] tracking-tight mb-4"
                  style={{ textWrap: 'balance' }}
                >
                  Bespoke Route Planning &amp; Automated Travel Dispatch
                </h1>
                <p className="text-slate-200 text-base leading-relaxed max-w-[64ch]">
                  Submit departure hubs, destination corridors, travel dates, party size, and budget parameters directly to the n8n Travelling Agent workflow for automated itinerary generation.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0">
                <a
                  href="#itinerary-form"
                  onClick={() => setActiveWorkspaceTab('bespoke')}
                  className="px-5 py-3 text-sm font-semibold text-slate-950 bg-white rounded-lg hover:bg-slate-100 transition-colors text-center whitespace-nowrap"
                >
                  Complete Dispatch Form
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setActiveWorkspaceTab('embed');
                    document
                      .getElementById('itinerary-form')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-200 hover:text-white underline underline-offset-4 transition-colors text-center whitespace-nowrap"
                >
                  Switch to Direct n8n Form Embed
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Primary Conversion & Interactive n8n Form Section */}
        <section
          id="itinerary-form"
          className="max-w-[1200px] mx-auto px-6 py-8 scroll-mt-20"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-500 mb-1">
                Form ID: 34089590-0cef-4d18-87e9-a6b2ec9d94c0 ·{' '}
                {endpointHealth.checking
                  ? 'Verifying n8n cloud endpoint...'
                  : endpointHealth.ok
                  ? `Connected to ${endpointHealth.formTitle || 'Travelling Agent'} (${endpointHealth.latencyMs}ms)`
                  : 'Direct Proxy Mode Ready'}
              </p>
              <h2
                className="font-display text-3xl sm:text-4xl text-slate-900 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                01. Travelling Agent Intake &amp; Dispatch
              </h2>
            </div>

            {/* Interactive Segmented Control (functional buttons with click handlers) */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg self-start md:self-auto">
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('bespoke')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeWorkspaceTab === 'bespoke'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bespoke Dispatch Form
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('embed')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeWorkspaceTab === 'embed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Direct n8n Form Embed
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('schema')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeWorkspaceTab === 'schema'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                cURL &amp; Payload Schema
              </button>
            </div>
          </div>

          {activeWorkspaceTab === 'bespoke' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 items-start">
              {/* Left 7 Columns: The 7 Required n8n Fields */}
              <form
                onSubmit={handleSubmit}
                noValidate
                className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Passenger &amp; Route Parameters
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All seven fields are required by the n8n Travelling Agent trigger.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormState({
                        startLocation: '',
                        destination: '',
                        travelDate: '',
                        returnDate: '',
                        travelers: '1',
                        budget: '',
                        email: '',
                      });
                      setErrors({});
                      setSubmissionResult(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap"
                  >
                    Clear Fields
                  </button>
                </div>

                {/* field-0: start location & field-1: Destination */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="field-0"
                        className="text-xs font-semibold text-slate-800"
                      >
                        Start Location <span className="text-red-600">*</span>
                      </label>
                      <span className="font-mono text-[11px] text-slate-400">
                        field-0
                      </span>
                    </div>
                    <input
                      id="field-0"
                      name="field-0"
                      type="text"
                      required
                      value={formState.startLocation}
                      onChange={(e) =>
                        handleFieldChange('startLocation', e.target.value)
                      }
                      placeholder="e.g., Hyderabad, India"
                      className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-colors ${
                        errors.startLocation
                          ? 'border-red-500'
                          : 'border-slate-300'
                      }`}
                    />
                    {errors.startLocation && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.startLocation}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="field-1"
                        className="text-xs font-semibold text-slate-800"
                      >
                        Destination <span className="text-red-600">*</span>
                      </label>
                      <span className="font-mono text-[11px] text-slate-400">
                        field-1
                      </span>
                    </div>
                    <input
                      id="field-1"
                      name="field-1"
                      type="text"
                      required
                      value={formState.destination}
                      onChange={(e) =>
                        handleFieldChange('destination', e.target.value)
                      }
                      placeholder="e.g., Kyoto & Hakone, Japan"
                      className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-colors ${
                        errors.destination
                          ? 'border-red-500'
                          : 'border-slate-300'
                      }`}
                    />
                    {errors.destination && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.destination}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Departure Hub Selector Buttons */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">
                    Quick departure hubs:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_START_HUBS.map((hub) => (
                      <button
                        key={hub}
                        type="button"
                        onClick={() => handleFieldChange('startLocation', hub)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap ${
                          formState.startLocation === hub
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {hub}
                      </button>
                    ))}
                  </div>
                </div>

                {/* field-2: travel date & field-3: return date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="field-2"
                        className="text-xs font-semibold text-slate-800"
                      >
                        Travel Date <span className="text-red-600">*</span>
                      </label>
                      <span className="font-mono text-[11px] text-slate-400">
                        field-2
                      </span>
                    </div>
                    <input
                      id="field-2"
                      name="field-2"
                      type="date"
                      required
                      value={formState.travelDate}
                      onChange={(e) =>
                        handleFieldChange('travelDate', e.target.value)
                      }
                      className={`w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-colors ${
                        errors.travelDate
                          ? 'border-red-500'
                          : 'border-slate-300'
                      }`}
                    />
                    {errors.travelDate && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.travelDate}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="field-3"
                        className="text-xs font-semibold text-slate-800"
                      >
                        Return Date <span className="text-red-600">*</span>
                      </label>
                      <span className="font-mono text-[11px] text-slate-400">
                        field-3
                      </span>
                    </div>
                    <input
                      id="field-3"
                      name="field-3"
                      type="date"
                      required
                      value={formState.returnDate}
                      min={formState.travelDate || undefined}
                      onChange={(e) =>
                        handleFieldChange('returnDate', e.target.value)
                      }
                      className={`w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-colors ${
                        errors.returnDate
                          ? 'border-red-500'
                          : 'border-slate-300'
                      }`}
                    />
                    {errors.returnDate && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.returnDate}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* field-4: no of people travelling & field-5: budget */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="field-4"
                        className="text-xs font-semibold text-slate-800"
                      >
                        No. of People Travelling{' '}
                        <span className="text-red-600">*</span>
                      </label>
                      <span className="font-mono text-[11px] text-slate-400">
                        field-4
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustTravelers(-1)}
                        aria-label="Decrease travellers"
                        className="w-10 h-10 flex items-center justify-center border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-mono text-base transition-colors shrink-0"
                      >
                        -
                      </button>
                      <input
                        id="field-4"
                        name="field-4"
                        type="text"
                        required
                        value={formState.travelers}
                        onChange={(e) =>
                          handleFieldChange('travelers', e.target.value)
                        }
                        placeholder="2"
                        className={`w-full px-3.5 py-2.5 text-center text-sm font-mono tabular-nums bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-colors ${
                          errors.travelers
                            ? 'border-red-500'
                            : 'border-slate-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => adjustTravelers(1)}
                        aria-label="Increase travellers"
                        className="w-10 h-10 flex items-center justify-center border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-mono text-base transition-colors shrink-0"
                      >
                        +
                      </button>
                    </div>
                    {errors.travelers && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.travelers}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="field-5"
                        className="text-xs font-semibold text-slate-800"
                      >
                        Budget <span className="text-red-600">*</span>
                      </label>
                      <span className="font-mono text-[11px] text-slate-400">
                        field-5
                      </span>
                    </div>
                    <input
                      id="field-5"
                      name="field-5"
                      type="text"
                      required
                      value={formState.budget}
                      onChange={(e) =>
                        handleFieldChange('budget', e.target.value)
                      }
                      placeholder="e.g., $6,800 USD or ₹2,50,000"
                      className={`w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-colors ${
                        errors.budget ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {errors.budget && (
                      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.budget}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Budget Presets */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">
                    Standard budget allocations:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_BUDGET_TIERS.map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => handleFieldChange('budget', tier)}
                        className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded-md border transition-colors whitespace-nowrap ${
                          formState.budget === tier
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                {/* field-6: email */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="field-6"
                      className="text-xs font-semibold text-slate-800"
                    >
                      Email Address for Itinerary Delivery{' '}
                      <span className="text-red-600">*</span>
                    </label>
                    <span className="font-mono text-[11px] text-slate-400">
                      field-6
                    </span>
                  </div>
                  <input
                    id="field-6"
                    name="field-6"
                    type="email"
                    required
                    value={formState.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="traveller@domain.com"
                    className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600 transition-colors ${
                      errors.email ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-5 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-400 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Transmitting to n8n Travelling Agent...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit to n8n Travelling Agent</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Submission Confirmation / Error Banner */}
                {submissionResult && (
                  <div
                    role="status"
                    className={`p-4 rounded-lg border text-sm ${
                      submissionResult.ok
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                        : 'bg-red-50/80 border-red-200 text-red-950'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {submissionResult.ok ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">
                          {submissionResult.ok
                            ? 'Form Submitted Successfully'
                            : 'Submission Issue Encountered'}
                        </p>
                        <p className="text-xs mt-1 opacity-90">
                          {submissionResult.message}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums mt-2 opacity-75">
                          HTTP {submissionResult.status} ·{' '}
                          {submissionResult.durationMs}ms · Recorded at{' '}
                          {new Date(
                            submissionResult.timestamp
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </form>

              {/* Right 5 Columns: Live Dispatch Summary & Allocation Breakdown (Single-Elevation Card) */}
              <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <p className="text-xs text-slate-500">
                    Live Pre-Flight Calculation
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                    Dispatch Dossier &amp; Allocation
                  </h3>
                </div>

                {/* Route Summary */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs">Origin Hub</span>
                    <span className="font-medium text-slate-900 text-right">
                      {formState.startLocation || '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs">Destination</span>
                    <span className="font-medium text-slate-900 text-right">
                      {formState.destination || '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs">
                      Travel Window
                    </span>
                    <span className="font-mono text-xs tabular-nums text-slate-900">
                      {formState.travelDate || 'YYYY-MM-DD'} →{' '}
                      {formState.returnDate || 'YYYY-MM-DD'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs">
                      Calculated Duration
                    </span>
                    <span className="font-mono text-xs tabular-nums font-semibold text-slate-900">
                      {tripMetrics.days > 0
                        ? `${tripMetrics.days} ${
                            tripMetrics.days === 1 ? 'Day' : 'Days'
                          }`
                        : 'Select valid dates'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs">Party Size</span>
                    <span className="font-mono text-xs tabular-nums text-slate-900">
                      {tripMetrics.numTravelers}{' '}
                      {tripMetrics.numTravelers === 1
                        ? 'Traveller'
                        : 'Travellers'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs">
                      Est. Budget / Traveller
                    </span>
                    <span className="font-mono text-xs tabular-nums font-semibold text-slate-900">
                      {tripMetrics.perPerson
                        ? `${tripMetrics.currencySymbol}${tripMetrics.perPerson.toLocaleString()}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 text-xs">
                      Est. Daily Allocation
                    </span>
                    <span className="font-mono text-xs tabular-nums font-semibold text-sky-800">
                      {tripMetrics.perDay
                        ? `${tripMetrics.currencySymbol}${tripMetrics.perDay.toLocaleString()} / day`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Live multipart/form-data Field Map */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      n8n Form Trigger Payload Preview
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      multipart/form-data
                    </span>
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs space-y-1.5 overflow-x-auto">
                    <div className="text-slate-400">
                      POST /form/34089590-0cef-4d18-87e9-a6b2ec9d94c0
                    </div>
                    <div>
                      <span className="text-sky-400">field-0</span>:{' '}
                      <span className="text-emerald-300">
                        "{formState.startLocation}"
                      </span>
                    </div>
                    <div>
                      <span className="text-sky-400">field-1</span>:{' '}
                      <span className="text-emerald-300">
                        "{formState.destination}"
                      </span>
                    </div>
                    <div>
                      <span className="text-sky-400">field-2</span>:{' '}
                      <span className="text-emerald-300">
                        "{formState.travelDate}"
                      </span>
                    </div>
                    <div>
                      <span className="text-sky-400">field-3</span>:{' '}
                      <span className="text-emerald-300">
                        "{formState.returnDate}"
                      </span>
                    </div>
                    <div>
                      <span className="text-sky-400">field-4</span>:{' '}
                      <span className="text-emerald-300">
                        "{formState.travelers}"
                      </span>
                    </div>
                    <div>
                      <span className="text-sky-400">field-5</span>:{' '}
                      <span className="text-emerald-300">
                        "{formState.budget}"
                      </span>
                    </div>
                    <div>
                      <span className="text-sky-400">field-6</span>:{' '}
                      <span className="text-emerald-300">
                        "{formState.email || '<required>'}"
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {activeWorkspaceTab === 'embed' && (
            <div className="pt-8">
              <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Hosted n8n Form View (alekhya-12.app.n8n.cloud)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Interact directly with the live hosted n8n Travelling Agent form below or copy the public form URL.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText('form-url', N8N_FORM_URL)}
                      className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {copiedKey === 'form-url' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Copied Form URL</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy n8n URL</span>
                        </>
                      )}
                    </button>
                    <a
                      href={N8N_FORM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <span>Open Hosted Tab</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="mt-6 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <iframe
                    src={N8N_FORM_URL}
                    title="n8n Travelling Agent Form"
                    className="w-full h-[760px] border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {activeWorkspaceTab === 'schema' && (
            <div className="pt-8">
              <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Direct cURL Request &amp; Webhook Specification
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Use this command to trigger the n8n Travelling Agent form from any terminal or automation script.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={verifyN8nEndpoint}
                      className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          endpointHealth.checking ? 'animate-spin' : ''
                        }`}
                      />
                      <span>Re-Verify Endpoint</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText('curl-cmd', curlSnippet)}
                      className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {copiedKey === 'curl-cmd' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied cURL</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy cURL Command</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <pre className="bg-slate-900 text-slate-100 p-5 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
                  {curlSnippet}
                </pre>
              </div>
            </div>
          )}
        </section>

        {/* Curated Route Templates (One-Click Form Auto-Fill) */}
        <section
          id="curated-routes"
          className="max-w-[1200px] mx-auto px-6 py-12 scroll-mt-20"
        >
          <div className="pb-8 border-b border-slate-200 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">
                Reference Itineraries · Instant Form Population
              </p>
              <h2
                className="font-display text-3xl sm:text-4xl text-slate-900 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                02. Curated Dispatch Corridors
              </h2>
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              Select any curated corridor below to pre-populate origin, destination, recommended duration, party size, and budget in the Travelling Agent form.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            {CURATED_ROUTES.map((route) => {
              const showImage =
                Boolean(route.imageUrl) && !failedRouteImages[route.id];

              return (
                <article
                  key={route.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* 4:3 Media Slot with Zero-Broken-Image Policy */}
                    <div className="aspect-[4/3] w-full bg-slate-900 relative overflow-hidden border-b border-slate-100">
                      {showImage ? (
                        <img
                          src={route.imageUrl}
                          alt={route.title}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedRouteImages((prev) => ({
                              ...prev,
                              [route.id]: true,
                            }))
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* Custom architectural illustration fallback for Kyoto / resilience */
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 flex flex-col justify-between text-white">
                          <div className="flex items-center justify-between text-xs text-amber-200/80 font-mono">
                            <span>35.0116° N, 135.7681° E</span>
                            <span>{route.durationDays} DAYS</span>
                          </div>
                          <svg
                            viewBox="0 0 240 100"
                            className="w-full h-24 stroke-amber-200/40 fill-none"
                            strokeWidth="1.2"
                            aria-hidden="true"
                          >
                            <path d="M10 85 L230 85" />
                            <path d="M40 85 L40 40 L200 40 L200 85" />
                            <path d="M25 42 Q120 15 215 42" strokeWidth="2" />
                            <path d="M32 30 Q120 8 208 30" strokeWidth="1.5" />
                            <path d="M85 85 L85 40 M155 85 L155 40" />
                            <circle cx="185" cy="24" r="8" className="fill-amber-400/20" />
                          </svg>
                          <div className="text-xs text-slate-300">
                            {route.seasonNote}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      {/* Zero-Pill Metadata: Clean unboxed text with · separators */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums mb-2">
                        <span>{route.number}</span>
                        <span aria-hidden="true">·</span>
                        <span>{route.durationDays} Days</span>
                        <span aria-hidden="true">·</span>
                        <span>{route.recommendedBudget}</span>
                      </div>

                      <h3 className="text-lg font-semibold text-slate-900 leading-snug mb-2">
                        {route.title}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        {route.summary}
                      </p>

                      <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                        <div>
                          <span className="font-medium text-slate-700">
                            Route:
                          </span>{' '}
                          {route.startLocation} → {route.destination}
                        </div>
                        <div>
                          <span className="font-medium text-slate-700">
                            Spec:
                          </span>{' '}
                          {route.seasonNote}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                    <button
                      type="button"
                      onClick={() => handleSelectCuratedRoute(route)}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Populate Dispatch Form
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Workflow Schema & Field Mapping Specification */}
        <section
          id="workflow-schema"
          className="max-w-[1200px] mx-auto px-6 py-12 scroll-mt-20"
        >
          <div className="pb-6 border-b border-slate-200">
            <p className="text-xs text-slate-500 mb-1">
              Technical Specification · n8n Form Trigger Contract
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl text-slate-900 tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              03. Travelling Agent Field Mapping
            </h2>
          </div>

          <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">n8n Field Key</th>
                    <th className="py-3 px-4">Form Label</th>
                    <th className="py-3 px-4">Input Type</th>
                    <th className="py-3 px-4">Validation Rule</th>
                    <th className="py-3 px-4 text-right">Current Active Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-sky-800">field-0</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      start location
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">text</td>
                    <td className="py-3 px-4 text-slate-600">
                      Required (.form-required)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formState.startLocation || '—'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-sky-800">field-1</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      Destination
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">text</td>
                    <td className="py-3 px-4 text-slate-600">
                      Required (.form-required)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formState.destination || '—'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-sky-800">field-2</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      travel date
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">text</td>
                    <td className="py-3 px-4 text-slate-600">
                      Required (.form-required)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formState.travelDate || '—'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-sky-800">field-3</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      return date
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">text</td>
                    <td className="py-3 px-4 text-slate-600">
                      Required (.form-required)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formState.returnDate || '—'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-sky-800">field-4</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      no of people travelling
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">text</td>
                    <td className="py-3 px-4 text-slate-600">
                      Required (.form-required)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formState.travelers || '—'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-sky-800">field-5</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      budget
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">text</td>
                    <td className="py-3 px-4 text-slate-600">
                      Required (.form-required)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formState.budget || '—'}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-sky-800">field-6</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      email
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">email</td>
                    <td className="py-3 px-4 text-slate-600">
                      Required + RFC Email Format
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formState.email || 'Not entered'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Submission Ledger & Dispatch Log */}
        <section
          id="dispatch-ledger"
          className="max-w-[1200px] mx-auto px-6 py-12 scroll-mt-20"
        >
          <div className="pb-6 border-b border-slate-200 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">
                Session &amp; Local Persistence · Tabular Audit Trail
              </p>
              <h2
                className="font-display text-3xl sm:text-4xl text-slate-900 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                04. Travelling Agent Submission Ledger
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Filter origin, destination, email..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
                {(['all', 'recorded', 'failed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setLedgerFilter(status)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                      ledgerFilter === status
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {dispatchHistory.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleExportLedgerCsv}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchHistory([])}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-slate-300 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Log</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {filteredLedger.length === 0 ? (
              <div className="p-12 text-center">
                <SlidersHorizontal className="w-6 h-6 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900">
                  No Dispatches Recorded Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                  When you submit the Travelling Agent form above, each dispatch response and its field-0 through field-6 payload will appear in this audit table.
                </p>
                <a
                  href="#itinerary-form"
                  onClick={() => setActiveWorkspaceTab('bespoke')}
                  className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  Create First Dispatch Request
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">ID &amp; Time</th>
                      <th className="py-3 px-4">Route (field-0 → field-1)</th>
                      <th className="py-3 px-4">Dates (field-2 → field-3)</th>
                      <th className="py-3 px-4 text-right">Party (field-4)</th>
                      <th className="py-3 px-4 text-right">Budget (field-5)</th>
                      <th className="py-3 px-4">Email (field-6)</th>
                      <th className="py-3 px-4">n8n Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredLedger.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {item.id}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(item.submittedAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-900">
                          <div className="font-medium">
                            {item.payload.startLocation} →{' '}
                            {item.payload.destination}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {item.payload.travelDate} · {item.payload.returnDate}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                          {item.payload.travelers}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                          {item.payload.budget}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {item.payload.email}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {item.status === 'recorded' ? (
                            <span className="text-emerald-700 font-medium">
                              Recorded (HTTP {item.httpStatus})
                            </span>
                          ) : (
                            <span className="text-red-700 font-medium">
                              Failed (HTTP {item.httpStatus})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setFormState({ ...item.payload });
                              setActiveWorkspaceTab('bespoke');
                              document
                                .getElementById('itinerary-form')
                                ?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-sky-800 hover:underline whitespace-nowrap"
                          >
                            Reload
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-display text-base text-slate-900">
              Travelling Agent
            </span>
            <span aria-hidden="true">·</span>
            <span>n8n Automated Form Trigger Portal</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#itinerary-form"
              className="hover:text-slate-900 transition-colors"
            >
              Dispatch Form
            </a>
            <a
              href="#curated-routes"
              className="hover:text-slate-900 transition-colors"
            >
              Curated Routes
            </a>
            <a
              href={N8N_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <span>Hosted n8n Form</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
