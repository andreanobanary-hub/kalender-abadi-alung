/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
  Sparkles,
  BookOpen,
  CheckSquare,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  Info,
  CalendarDays,
  Flame,
  Globe,
  Settings2
} from 'lucide-react';

// Nama-nama bulan dalam Bahasa Indonesia
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Hari dalam Bahasa Indonesia
const DAYS_SUN_FIRST = [
  { short: 'Min', full: 'Minggu', isSunday: true, id: 0 },
  { short: 'Sen', full: 'Senin', isSunday: false, id: 1 },
  { short: 'Sel', full: 'Selasa', isSunday: false, id: 2 },
  { short: 'Rab', full: 'Rabu', isSunday: false, id: 3 },
  { short: 'Kam', full: 'Kamis', isSunday: false, id: 4 },
  { short: 'Jum', full: 'Jumat', isSunday: false, id: 5 },
  { short: 'Sab', full: 'Sabtu', isSunday: false, id: 6 },
];

const DAYS_MON_FIRST = [
  { short: 'Sen', full: 'Senin', isSunday: false, id: 1 },
  { short: 'Sel', full: 'Selasa', isSunday: false, id: 2 },
  { short: 'Rab', full: 'Rabu', isSunday: false, id: 3 },
  { short: 'Kam', full: 'Kamis', isSunday: false, id: 4 },
  { short: 'Jum', full: 'Jumat', isSunday: false, id: 5 },
  { short: 'Sab', full: 'Sabtu', isSunday: false, id: 6 },
  { short: 'Min', full: 'Minggu', isSunday: true, id: 0 },
];

// Pasaran Jawa
const PASARAN_NAMES = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];

/**
 * Aturan Tahun Kabisat Gregorian (Leap Year):
 * Habis dibagi 4 dan bukan abad, atau abad yang habis dibagi 400.
 */
function isLeapYear(year: number): boolean {
  if (year < 1) return false;
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Jumlah hari dalam suatu bulan
 */
function getDaysInMonth(year: number, monthIndex: number): number {
  if (monthIndex === 1) {
    return isLeapYear(year) ? 29 : 28;
  }
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[monthIndex];
}

/**
 * Algoritma Tomohiko Sakamoto: Menghitung hari dalam seminggu
 * Mengembalikan: 0 = Minggu, 1 = Senin, ..., 6 = Sabtu.
 * Bekerja presisi dari tahun 1 hingga 9999 Masehi.
 */
function getDayOfWeek(year: number, monthIndex: number, day: number = 1): number {
  const m = monthIndex + 1;
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  if (m < 3) {
    y -= 1;
  }
  const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + day) % 7;
  return (dow + 7) % 7;
}

/**
 * Julian Day Number untuk menghitung Pasaran Jawa
 */
function getJulianDayNumber(year: number, monthIndex: number, day: number): number {
  const m = monthIndex + 1;
  const a = Math.floor((14 - m) / 12);
  const y = year + 4800 - a;
  const monthAdjusted = m + 12 * a - 3;
  return (
    day +
    Math.floor((153 * monthAdjusted + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function getPasaran(year: number, monthIndex: number, day: number): string {
  const jdn = getJulianDayNumber(year, monthIndex, day);
  const index = ((jdn + 1) % 5 + 5) % 5;
  return PASARAN_NAMES[index];
}

interface AgendaItem {
  id: string;
  dateKey: string; // YYYY-MM-DD
  title: string;
  time?: string;
  completed?: boolean;
}

export default function App() {
  // Real-time saat ini
  const [realTime, setRealTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setRealTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayYear = realTime.getFullYear();
  const todayMonth = realTime.getMonth();
  const todayDate = realTime.getDate();

  // State Kalender yang sedang dilihat
  const [currentYear, setCurrentYear] = useState<number>(todayYear);
  const [currentMonth, setCurrentMonth] = useState<number>(todayMonth);
  const [startOnMonday, setStartOnMonday] = useState<boolean>(true); // default Senin-Minggu sesuai permintaan
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number; day: number } | null>({
    year: todayYear,
    month: todayMonth,
    day: todayDate
  });

  // State Tab Navigasi Aktif
  const [activeTab, setActiveTab] = useState<'calendar' | 'agenda' | 'history'>('calendar');

  // Agenda/Notes (tersimpan di localStorage)
  const [agendas, setAgendas] = useState<AgendaItem[]>(() => {
    try {
      const saved = localStorage.getItem('kalender_abadi_agendas');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: '1', dateKey: `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`, title: 'Fokus kerja harian & cek kalender abadi', time: '09:00', completed: false }
    ];
  });

  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaTime, setNewAgendaTime] = useState('10:00');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('kalender_abadi_agendas', JSON.stringify(agendas));
    } catch {
      // ignore
    }
  }, [agendas]);

  // Handle tombol bulan
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      if (currentYear > 1) {
        setCurrentYear(prev => prev - 1);
        setCurrentMonth(11);
      }
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      if (currentYear < 9999) {
        setCurrentYear(prev => prev + 1);
        setCurrentMonth(0);
      }
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const jumpToToday = () => {
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
    setSelectedDate({ year: todayYear, month: todayMonth, day: todayDate });
  };

  const leap = isLeapYear(currentYear);

  // Perhitungan jam analog
  const secondsAngle = realTime.getSeconds() * 6;
  const minutesAngle = realTime.getMinutes() * 6 + realTime.getSeconds() * 0.1;
  const hoursAngle = ((realTime.getHours() % 12) + realTime.getMinutes() / 60) * 30;

  // Grid Hari
  const dayHeaders = startOnMonday ? DAYS_MON_FIRST : DAYS_SUN_FIRST;

  // Generate cells kalender
  const calendarCells = useMemo(() => {
    const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
    const rawStartDow = getDayOfWeek(currentYear, currentMonth, 1); // 0=Min, 1=Sen, ... 6=Sab
    
    // Sesuaikan offset hari pertama berdasarkan Senin atau Minggu pertama
    let offset = rawStartDow;
    if (startOnMonday) {
      offset = (rawStartDow + 6) % 7; // Sen=0, Sel=1, ..., Min=6
    }

    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthDays = prevYear >= 1 ? getDaysInMonth(prevYear, prevMonthIdx) : 31;

    const cells = [];

    // Hari bulan lalu (padding)
    for (let i = offset - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        month: prevMonthIdx,
        year: prevYear,
        isCurrentMonth: false,
        dow: (rawStartDow - 1 - i + 7) % 7
      });
    }

    // Hari bulan aktif
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dow = (rawStartDow + (d - 1)) % 7;
      cells.push({
        day: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        dow
      });
    }

    // Hari bulan depan (pelengkap grid 7 kolom)
    const remaining = (7 - (cells.length % 7)) % 7;
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    for (let d = 1; d <= remaining; d++) {
      const dow = (rawStartDow + daysInCurrentMonth + d - 1) % 7;
      cells.push({
        day: d,
        month: nextMonthIdx,
        year: nextYear,
        isCurrentMonth: false,
        dow
      });
    }

    return cells;
  }, [currentYear, currentMonth, startOnMonday]);

  // Format tanggal selected
  const selectedDateKey = useMemo(() => {
    if (!selectedDate) return '';
    return `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`;
  }, [selectedDate]);

  const selectedAgendas = useMemo(() => {
    return agendas.filter(a => a.dateKey === selectedDateKey);
  }, [agendas, selectedDateKey]);

  // Tambah agenda
  const handleAddAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgendaTitle.trim() || !selectedDateKey) return;
    const item: AgendaItem = {
      id: Date.now().toString(),
      dateKey: selectedDateKey,
      title: newAgendaTitle.trim(),
      time: newAgendaTime,
      completed: false
    };
    setAgendas(prev => [item, ...prev]);
    setNewAgendaTitle('');
  };

  const toggleAgenda = (id: string) => {
    setAgendas(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const deleteAgenda = (id: string) => {
    setAgendas(prev => prev.filter(a => a.id !== id));
  };

  // Preset sejarah
  const historicalEvents = [
    { year: 1945, month: 7, day: 17, title: 'Proklamasi Kemerdekaan Indonesia', desc: 'Jumat Legi, 17 Agustus 1945 — Pembacaan teks proklamasi oleh Ir. Soekarno.' },
    { year: 1928, month: 9, day: 28, title: 'Kongres Pemuda II (Sumpah Pemuda)', desc: 'Minggu, 28 Oktober 1928 — Lahirnya ikrar persatuan tanah air, bangsa, dan bahasa.' },
    { year: 2000, month: 0, day: 1, title: 'Pergantian Milenium Baru (Y2K)', desc: 'Sabtu, 1 Januari 2000 — Tahun kabisat abad ke-21 yang habis dibagi 400.' },
    { year: 1908, month: 4, day: 20, title: 'Hari Kebangkitan Nasional (Budi Utomo)', desc: 'Rabu, 20 Mei 1908 — Awal pergerakan nasional modern di Nusantara.' },
    { year: 1, month: 0, day: 1, title: 'Titik Awal Tarikh Masehi (1 M)', desc: 'Senin, 1 Januari 0001 — Titik awal perhitungan kalender Masehi Gregorian proleptik.' }
  ];

  // Kode Standalone HTML tunggal untuk unduhan / copy
  const standaloneSingleFileHtml = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kalender Abadi - Digital Dashboard</title>
  <!-- Tailwind CSS via CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
    .glass-card { background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.2); }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-3 md:p-6 lg:p-8">

  <!-- Dashboard Container Utama (Responsive Split Layout) -->
  <div class="w-full max-w-7xl bg-slate-950/80 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col lg:flex-row">
    
    <!-- SISI KIRI: PANEL INFORMASI "HARI INI" & JAM INTERAKTIF (1/3 Lebar Desktop) -->
    <aside class="lg:w-96 xl:w-[420px] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 md:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-indigo-900/40 relative overflow-hidden">
      
      <!-- Dekorasi Cahaya Latar Belakang -->
      <div class="absolute -top-24 -left-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute bottom-0 right-0 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 space-y-6">
        <!-- Brand Title -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-extrabold text-lg shadow-lg shadow-indigo-500/20">
              KA
            </div>
            <div>
              <h1 class="text-xl font-extrabold tracking-tight text-white leading-tight">Kalender Abadi</h1>
              <p class="text-xs text-indigo-200">Digital Smart Dashboard</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            1-9999 M
          </span>
        </div>

        <!-- Kartu Besar Dinamis "Hari Ini" dengan Jam Analog & Digital -->
        <div class="glass-card rounded-2xl p-6 text-white shadow-xl shadow-indigo-950/40 relative overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-semibold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Waktu Nyata
            </span>
            <div id="live-digital-clock" class="text-xs font-mono font-bold bg-black/30 px-2.5 py-1 rounded-lg border border-white/10 text-indigo-200">
              --:--:--
            </div>
          </div>

          <!-- Jam Analog Interaktif SVG -->
          <div class="flex justify-center my-3">
            <div class="relative w-28 h-28 rounded-full border-2 border-indigo-400/40 bg-indigo-950/60 shadow-inner flex items-center justify-center">
              <!-- Titik Angka Jam -->
              <span class="absolute top-1 text-[9px] font-bold text-indigo-300">12</span>
              <span class="absolute right-1 text-[9px] font-bold text-indigo-300">3</span>
              <span class="absolute bottom-1 text-[9px] font-bold text-indigo-300">6</span>
              <span class="absolute left-1 text-[9px] font-bold text-indigo-300">9</span>
              
              <!-- Jarum Jam -->
              <div id="clock-hour" class="absolute w-1 h-7 bg-indigo-200 rounded origin-bottom bottom-14 shadow transition-transform"></div>
              <!-- Jarum Menit -->
              <div id="clock-minute" class="absolute w-0.5 h-10 bg-indigo-100 rounded origin-bottom bottom-14 shadow transition-transform"></div>
              <!-- Jarum Detik -->
              <div id="clock-second" class="absolute w-0.5 h-11 bg-rose-400 rounded origin-bottom bottom-14 shadow transition-transform"></div>
              <!-- Titik Pusat -->
              <div class="w-2.5 h-2.5 bg-rose-500 rounded-full z-10 border-2 border-white"></div>
            </div>
          </div>

          <!-- Tanggal Hari Ini Dinamis -->
          <div class="text-center mt-4 pt-3 border-t border-white/10">
            <div id="live-day-name" class="text-sm font-semibold text-indigo-200">--</div>
            <div id="live-full-date" class="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-0.5">--</div>
            <div id="live-pasaran-text" class="text-xs text-indigo-300/80 mt-1">--</div>
          </div>
        </div>

        <!-- Fitur "Lompat ke Tahun/Bulan" Cepat Menyatu dalam Sisi Kiri -->
        <div class="bg-indigo-950/40 rounded-2xl p-5 border border-indigo-800/40 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-indigo-300">Lompat Tanggal</h3>
            <button id="btn-jump-today" class="text-xs text-indigo-300 hover:text-white font-medium transition cursor-pointer flex items-center gap-1">
              ↺ Hari Ini
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-indigo-300 font-semibold block mb-1">Bulan:</label>
              <select id="left-select-month" class="w-full bg-slate-900 border border-indigo-700/60 rounded-xl px-2.5 py-2 text-xs font-semibold text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none">
                <option value="0">Januari</option>
                <option value="1">Februari</option>
                <option value="2">Maret</option>
                <option value="3">April</option>
                <option value="4">Mei</option>
                <option value="5">Juni</option>
                <option value="6">Juli</option>
                <option value="7">Agustus</option>
                <option value="8">September</option>
                <option value="9">Oktober</option>
                <option value="10">November</option>
                <option value="11">Desember</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-indigo-300 font-semibold block mb-1">Tahun (1-9999):</label>
              <input id="left-input-year" type="number" min="1" max="9999" class="w-full bg-slate-900 border border-indigo-700/60 rounded-xl px-2.5 py-2 text-xs font-bold text-center text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none" />
            </div>
          </div>
        </div>

        <!-- Menu Statis Navigasi Sidebar Kiri -->
        <div class="space-y-1.5 text-xs">
          <div class="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2">Navigasi Utama</div>
          <button id="menu-kalender" class="w-full text-left px-3.5 py-2 rounded-xl bg-indigo-600/30 text-white font-semibold border border-indigo-500/40 flex items-center gap-2.5 transition">
            📅 Tampilan Kalender
          </button>
          <button id="menu-agenda" class="w-full text-left px-3.5 py-2 rounded-xl text-indigo-200 hover:bg-white/5 hover:text-white font-medium flex items-center gap-2.5 transition">
            📝 Catatan Agenda (<span id="agenda-count">0</span>)
          </button>
          <button id="menu-sejarah" class="w-full text-left px-3.5 py-2 rounded-xl text-indigo-200 hover:bg-white/5 hover:text-white font-medium flex items-center gap-2.5 transition">
            🏛️ Sejarah Hari Ini
          </button>
        </div>
      </div>

      <!-- Badge Kabisat Kiri Bawah -->
      <div class="mt-6 pt-4 border-t border-indigo-900/50">
        <div id="left-leap-status" class="text-xs text-indigo-200 text-center font-medium bg-black/20 py-2 px-3 rounded-xl border border-white/5">
          <!-- Diisi via JS -->
        </div>
      </div>
    </aside>

    <!-- SISI KANAN: AREA KALENDER UTAMA INTERAKTIF (2/3 Lebar Desktop) -->
    <main class="flex-1 p-6 md:p-8 flex flex-col justify-between bg-slate-900/70">
      
      <div>
        <!-- Top Navigation Bar Kalender Kanan -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div class="flex items-center gap-3">
              <h2 id="main-calendar-title" class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"></h2>
              <span id="badge-total-days" class="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold"></span>
            </div>
            <p id="main-calendar-desc" class="text-xs text-slate-400 mt-1"></p>
          </div>

          <!-- Tombol Navigasi (< > Today) -->
          <div class="flex items-center gap-2">
            <button id="btn-prev" class="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 transition cursor-pointer" title="Bulan Lalu">
              &#9664;
            </button>
            <button id="btn-today-main" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer">
              Today
            </button>
            <button id="btn-next" class="p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 transition cursor-pointer" title="Bulan Depan">
              &#9654;
            </button>
          </div>
        </div>

        <!-- 7 Kolom Header Hari (Senin-Minggu, Minggu Merah Khusus) -->
        <div class="grid grid-cols-7 gap-2 my-4 text-center text-xs sm:text-sm font-bold">
          <div class="py-2.5 rounded-xl text-slate-300 bg-slate-800/80 border border-slate-700/60">Senin</div>
          <div class="py-2.5 rounded-xl text-slate-300 bg-slate-800/80 border border-slate-700/60">Selasa</div>
          <div class="py-2.5 rounded-xl text-slate-300 bg-slate-800/80 border border-slate-700/60">Rabu</div>
          <div class="py-2.5 rounded-xl text-slate-300 bg-slate-800/80 border border-slate-700/60">Kamis</div>
          <div class="py-2.5 rounded-xl text-slate-300 bg-slate-800/80 border border-slate-700/60">Jumat</div>
          <div class="py-2.5 rounded-xl text-slate-300 bg-slate-800/80 border border-slate-700/60">Sabtu</div>
          <div class="py-2.5 rounded-xl text-rose-400 bg-rose-500/15 border border-rose-500/30 font-extrabold">Minggu</div>
        </div>

        <!-- Grid Tanggal Interaktif 7 Kolom -->
        <div id="main-grid" class="grid grid-cols-7 gap-2 sm:gap-2.5 min-h-[360px]">
          <!-- Diisi via JS -->
        </div>
      </div>

      <!-- Legenda & Keterangan Tahun Kabisat vs Tahun Biasa -->
      <div class="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-md bg-indigo-600"></span>
            <span>Hari Ini</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-md bg-rose-500/30 border border-rose-500/50"></span>
            <span class="text-rose-400 font-semibold">Minggu (Libur)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Ada Catatan</span>
          </div>
        </div>

        <div id="leap-legend-box" class="text-[11px] text-slate-400">
          <!-- Keterangan detail aturan kabisat -->
        </div>
      </div>

    </main>
  </div>

  <!-- Modal Interaktif Catatan Tanggal -->
  <div id="modal-date" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-left">
      <button id="modal-close-btn" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg p-1.5">✕</button>
      
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500 flex items-center justify-center text-indigo-400 text-xl font-bold">📅</div>
        <div>
          <h3 id="modal-date-title" class="text-lg font-bold text-white">Detail Tanggal</h3>
          <p id="modal-date-sub" class="text-xs text-indigo-300 font-medium"></p>
        </div>
      </div>

      <!-- Tambah Catatan -->
      <form id="form-add-agenda" class="mt-4 pt-3 border-t border-slate-800 space-y-2">
        <label class="text-xs font-semibold text-slate-300 block">Tambah Catatan Agenda:</label>
        <div class="flex gap-2">
          <input id="input-agenda-title" type="text" placeholder="Tulis rencana / catatan..." required class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">Simpan</button>
        </div>
      </form>

      <!-- Daftar Catatan Pada Tanggal Ini -->
      <div class="mt-4">
        <h4 class="text-xs font-bold text-slate-400 mb-2">Catatan Tersimpan:</h4>
        <div id="modal-agenda-list" class="space-y-1.5 max-h-40 overflow-y-auto text-xs">
          <!-- Diisi via JS -->
        </div>
      </div>
    </div>
  </div>

  <!-- JAVASCRIPT LOGIKA LENGKAP -->
  <script>
    const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const PASARAN_NAMES = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];

    const realNow = new Date();
    const REAL_TODAY = { year: realNow.getFullYear(), month: realNow.getMonth(), day: realNow.getDate() };

    let currentYear = REAL_TODAY.year;
    let currentMonth = REAL_TODAY.month;
    let selectedDateForModal = null;

    let savedAgendas = JSON.parse(localStorage.getItem('ka_standalone_agendas') || '[]');

    function saveAgendas() {
      localStorage.setItem('ka_standalone_agendas', JSON.stringify(savedAgendas));
      updateAgendaCountBadge();
    }

    function updateAgendaCountBadge() {
      const el = document.getElementById('agenda-count');
      if (el) el.textContent = savedAgendas.length;
    }

    // 1. Logika Kabisat Gregorian
    function isLeapYear(y) {
      if (y < 1) return false;
      return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    }

    // 2. Jumlah Hari dalam Bulan
    function getDaysInMonth(y, m) {
      if (m === 1) return isLeapYear(y) ? 29 : 28;
      const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return days[m];
    }

    // 3. Algoritma Tomohiko Sakamoto (0 = Minggu, ..., 6 = Sabtu)
    function getDayOfWeek(year, monthIndex, day = 1) {
      const m = monthIndex + 1;
      const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
      let y = year;
      if (m < 3) y -= 1;
      const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + day) % 7;
      return (dow + 7) % 7;
    }

    function getJulianDayNumber(year, monthIndex, day) {
      const m = monthIndex + 1;
      const a = Math.floor((14 - m) / 12);
      const y = year + 4800 - a;
      const ma = m + 12 * a - 3;
      return day + Math.floor((153 * ma + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    }

    function getPasaran(year, monthIndex, day) {
      const jdn = getJulianDayNumber(year, monthIndex, day);
      return PASARAN_NAMES[((jdn + 1) % 5 + 5) % 5];
    }

    // Jam Real-time (Digital + Analog)
    function updateClock() {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();

      document.getElementById('live-digital-clock').textContent = 
        \`\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}:\${String(s).padStart(2, '0')}\`;

      document.getElementById('clock-hour').style.transform = \`rotate(\${((h % 12) + m / 60) * 30}deg)\`;
      document.getElementById('clock-minute').style.transform = \`rotate(\${m * 6 + s * 0.1}deg)\`;
      document.getElementById('clock-second').style.transform = \`rotate(\${s * 6}deg)\`;

      document.getElementById('live-day-name').textContent = DAY_NAMES[now.getDay()];
      document.getElementById('live-full-date').textContent = \`\${now.getDate()} \${MONTH_NAMES[now.getMonth()]} \${now.getFullYear()}\`;
      document.getElementById('live-pasaran-text').textContent = \`Pasaran: \${getPasaran(now.getFullYear(), now.getMonth(), now.getDate())}\`;
    }
    setInterval(updateClock, 1000);
    updateClock();
    updateAgendaCountBadge();

    // Render Kalender Utama
    function renderMainCalendar() {
      if (currentYear < 1) currentYear = 1;
      if (currentYear > 9999) currentYear = 9999;

      // Sinkronisasi kontrol sisi kiri
      document.getElementById('left-select-month').value = currentMonth;
      document.getElementById('left-input-year').value = currentYear;

      const daysInM = getDaysInMonth(currentYear, currentMonth);
      const leap = isLeapYear(currentYear);

      // Judul Kanan
      document.getElementById('main-calendar-title').textContent = \`\${MONTH_NAMES[currentMonth]} \${currentYear}\`;
      document.getElementById('badge-total-days').textContent = \`\${daysInM} Hari\`;
      document.getElementById('main-calendar-desc').textContent = \`Tahun \${currentYear} \${leap ? 'adalah Tahun Kabisat (366 hari)' : 'adalah Tahun Biasa (365 hari)'}\`;

      // Status Kabisat Kiri
      document.getElementById('left-leap-status').innerHTML = leap 
        ? '✨ <strong class="text-emerald-400">Tahun Kabisat</strong> (366 hari, Feb 29 hari)'
        : '🗓️ <strong class="text-indigo-300">Tahun Biasa</strong> (365 hari, Feb 28 hari)';

      // Legenda bawah
      document.getElementById('leap-legend-box').innerHTML = leap 
        ? '<span class="text-emerald-400 font-semibold">Tahun Kabisat:</span> Habis dibagi 4 / abad habis dibagi 400.'
        : '<span class="text-slate-400">Tahun Biasa:</span> 365 hari standar.';

      // Grid Rendering (Senin-Minggu, offset: Sen=0, ..., Min=6)
      const rawStart = getDayOfWeek(currentYear, currentMonth, 1);
      const offset = (rawStart + 6) % 7;

      const grid = document.getElementById('main-grid');
      grid.innerHTML = '';

      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevDays = prevY >= 1 ? getDaysInMonth(prevY, prevM) : 31;

      // Padding Bulan Lalu
      for (let i = offset - 1; i >= 0; i--) {
        const d = prevDays - i;
        const cell = document.createElement('div');
        cell.className = 'h-16 sm:h-20 p-2 rounded-2xl bg-slate-900/40 border border-slate-800/40 text-slate-600 flex flex-col justify-between select-none';
        cell.innerHTML = \`<span class="text-xs font-semibold">\${d}</span>\`;
        grid.appendChild(cell);
      }

      // Hari Bulan Ini
      for (let d = 1; d <= daysInM; d++) {
        const dow = (rawStart + d - 1) % 7;
        const isSun = dow === 0;
        const isToday = currentYear === REAL_TODAY.year && currentMonth === REAL_TODAY.month && d === REAL_TODAY.day;
        const dateKey = \`\${currentYear}-\${String(currentMonth + 1).padStart(2, '0')}-\${String(d).padStart(2, '0')}\`;
        const hasNotes = savedAgendas.some(a => a.dateKey === dateKey);

        const cell = document.createElement('div');
        cell.className = \`h-16 sm:h-20 p-2 sm:p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.03] hover:shadow-lg \${
          isToday
            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/40 ring-2 ring-indigo-400'
            : isSun
            ? 'bg-slate-900/80 border-rose-500/30 hover:border-rose-400 hover:bg-rose-950/20 text-rose-400'
            : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500 hover:bg-slate-800/90 text-slate-200'
        }\`;

        cell.innerHTML = \`
          <div class="flex items-center justify-between">
            <span class="text-sm sm:text-base font-extrabold \${isToday ? 'text-white' : isSun ? 'text-rose-400' : 'text-slate-100'}">\${d}</span>
            <div class="flex items-center gap-1">
              \${hasNotes ? '<span class="w-2 h-2 rounded-full bg-amber-400"></span>' : ''}
              \${isToday ? '<span class="text-[9px] bg-white text-indigo-700 px-1 rounded font-black">HARI INI</span>' : ''}
            </div>
          </div>
          <div class="flex items-center justify-between text-[10px] opacity-70">
            <span>\${DAY_NAMES[dow]}</span>
            <span>\${getPasaran(currentYear, currentMonth, d)}</span>
          </div>
        \`;

        cell.addEventListener('click', () => openModal(currentYear, currentMonth, d));
        grid.appendChild(cell);
      }

      // Padding Bulan Depan
      const totalRendered = offset + daysInM;
      const remaining = (7 - (totalRendered % 7)) % 7;
      for (let d = 1; d <= remaining; d++) {
        const cell = document.createElement('div');
        cell.className = 'h-16 sm:h-20 p-2 rounded-2xl bg-slate-900/40 border border-slate-800/40 text-slate-600 flex flex-col justify-between select-none';
        cell.innerHTML = \`<span class="text-xs font-semibold">\${d}</span>\`;
        grid.appendChild(cell);
      }
    }

    // Modal Catatan Tanggal
    function openModal(y, m, d) {
      selectedDateForModal = { y, m, d };
      const dow = getDayOfWeek(y, m, d);
      document.getElementById('modal-date-title').textContent = \`\${d} \${MONTH_NAMES[m]} \${y}\`;
      document.getElementById('modal-date-sub').textContent = \`Hari \${DAY_NAMES[dow]} \${getPasaran(y, m, d)}\`;
      renderModalAgendas();
      document.getElementById('modal-date').classList.remove('hidden');
    }

    function renderModalAgendas() {
      if (!selectedDateForModal) return;
      const { y, m, d } = selectedDateForModal;
      const key = \`\${y}-\${String(m + 1).padStart(2, '0')}-\${String(d).padStart(2, '0')}\`;
      const list = document.getElementById('modal-agenda-list');
      const matches = savedAgendas.filter(a => a.dateKey === key);

      if (matches.length === 0) {
        list.innerHTML = '<div class="text-slate-500 italic py-2">Belum ada catatan pada tanggal ini.</div>';
        return;
      }

      list.innerHTML = matches.map(item => \`
        <div class="p-2.5 bg-slate-800 rounded-xl flex items-center justify-between border border-slate-700/60">
          <span class="text-slate-200">\${item.title}</span>
          <button onclick="removeAgenda('\${item.id}')" class="text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5">✕</button>
        </div>
      \`).join('');
    }

    window.removeAgenda = function(id) {
      savedAgendas = savedAgendas.filter(a => a.id !== id);
      saveAgendas();
      renderModalAgendas();
      renderMainCalendar();
    };

    document.getElementById('form-add-agenda').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-agenda-title');
      const val = input.value.trim();
      if (!val || !selectedDateForModal) return;
      const { y, m, d } = selectedDateForModal;
      savedAgendas.unshift({
        id: Date.now().toString(),
        dateKey: \`\${y}-\${String(m + 1).padStart(2, '0')}-\${String(d).padStart(2, '0')}\`,
        title: val
      });
      saveAgendas();
      input.value = '';
      renderModalAgendas();
      renderMainCalendar();
    });

    document.getElementById('modal-close-btn').addEventListener('click', () => {
      document.getElementById('modal-date').classList.add('hidden');
    });

    // Kontrol Navigasi Kanan
    document.getElementById('btn-prev').addEventListener('click', () => {
      if (currentMonth === 0) {
        if (currentYear > 1) { currentYear--; currentMonth = 11; }
      } else { currentMonth--; }
      renderMainCalendar();
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      if (currentMonth === 11) {
        if (currentYear < 9999) { currentYear++; currentMonth = 0; }
      } else { currentMonth++; }
      renderMainCalendar();
    });

    document.getElementById('btn-today-main').addEventListener('click', () => {
      currentYear = REAL_TODAY.year;
      currentMonth = REAL_TODAY.month;
      renderMainCalendar();
    });

    document.getElementById('btn-jump-today').addEventListener('click', () => {
      currentYear = REAL_TODAY.year;
      currentMonth = REAL_TODAY.month;
      renderMainCalendar();
    });

    // Sinkronisasi Sisi Kiri
    document.getElementById('left-select-month').addEventListener('change', (e) => {
      currentMonth = parseInt(e.target.value, 10);
      renderMainCalendar();
    });

    document.getElementById('left-input-year').addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 9999) val = 9999;
      currentYear = val;
      renderMainCalendar();
    });

    // Navigasi Menu Kiri (Alert Info Cepat)
    document.getElementById('menu-agenda').addEventListener('click', () => {
      if (savedAgendas.length === 0) {
        alert('Belum ada catatan tersimpan. Klik tanggal mana saja pada kalender untuk menambahkan agenda!');
      } else {
        alert(\`Total ada \${savedAgendas.length} agenda tersimpan dalam kalender!\`);
      }
    });

    document.getElementById('menu-sejarah').addEventListener('click', () => {
      alert('Sejarah Terkenal:\\n- 17 Agu 1945: Proklamasi RI\\n- 28 Okt 1928: Sumpah Pemuda\\n- 1 Jan 2000: Pergantian Milenium');
    });

    // Jalankan render awal
    renderMainCalendar();
  </script>
</body>
</html>`;
  }, []);

  const handleDownloadStandaloneHtml = () => {
    const blob = new Blob([standaloneSingleFileHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KalenderAbadi_Dashboard_${currentYear}_${MONTH_NAMES[currentMonth]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyStandaloneHtml = () => {
    navigator.clipboard.writeText(standaloneSingleFileHtml);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-35">
        <div className="absolute -top-40 left-1/3 w-[550px] h-[550px] bg-indigo-600 rounded-full blur-[160px]" />
        <div className="absolute bottom-10 -right-20 w-[450px] h-[450px] bg-purple-600 rounded-full blur-[160px]" />
      </div>

      {/* DASHBOARD UTAMA (Split Layout 2 Kolom) */}
      <div className="relative w-full max-w-7xl bg-slate-950/90 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/50 overflow-hidden flex flex-col lg:flex-row">
        
        {/* ============================================================== */}
        {/* PANEL INFORMASI "HARI INI" & KONTROL CEPAT (Sisi Kiri, 1/3)     */}
        {/* ============================================================== */}
        <aside className="lg:w-96 xl:w-[420px] bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 md:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-indigo-900/30 relative overflow-hidden">
          
          {/* Subtle glow highlight */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

          <div className="relative z-10 space-y-6">
            
            {/* Header Brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
                  KA
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                    Kalender Abadi
                  </h1>
                  <p className="text-xs text-indigo-300 font-medium">Digital Smart Dashboard</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm">
                1 - 9999 M
              </span>
            </div>

            {/* Kartu Besar Dinamis "Hari Ini" dengan Gradasi Ungu/Biru & Jam Analog */}
            <div className="relative rounded-2xl p-5 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-blue-600/10 border border-indigo-500/30 backdrop-blur-md shadow-xl shadow-indigo-950/40 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Waktu Nyata
                </span>

                {/* Digital Clock */}
                <div className="text-xs font-mono font-bold bg-slate-950/70 px-2.5 py-1 rounded-lg border border-indigo-500/30 text-indigo-200">
                  {realTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>

              {/* Jam Analog Interaktif */}
              <div className="flex justify-center my-3">
                <div className="relative w-28 h-28 rounded-full border-2 border-indigo-400/30 bg-slate-950/80 shadow-inner flex items-center justify-center">
                  {/* Jam markers */}
                  <span className="absolute top-1 text-[9px] font-bold text-indigo-300">12</span>
                  <span className="absolute right-1 text-[9px] font-bold text-indigo-300">3</span>
                  <span className="absolute bottom-1 text-[9px] font-bold text-indigo-300">6</span>
                  <span className="absolute left-1 text-[9px] font-bold text-indigo-300">9</span>

                  {/* Jarum Jam */}
                  <div
                    className="absolute w-1 h-7 bg-indigo-200 rounded origin-bottom bottom-14 shadow transition-transform duration-150"
                    style={{ transform: `rotate(${hoursAngle}deg)` }}
                  />
                  {/* Jarum Menit */}
                  <div
                    className="absolute w-0.5 h-10 bg-indigo-100 rounded origin-bottom bottom-14 shadow transition-transform duration-150"
                    style={{ transform: `rotate(${minutesAngle}deg)` }}
                  />
                  {/* Jarum Detik */}
                  <div
                    className="absolute w-0.5 h-11 bg-rose-400 rounded origin-bottom bottom-14 shadow transition-transform duration-75"
                    style={{ transform: `rotate(${secondsAngle}deg)` }}
                  />
                  {/* Pivot center */}
                  <div className="w-2.5 h-2.5 bg-rose-500 rounded-full z-10 border-2 border-white" />
                </div>
              </div>

              {/* Teks Tanggal Real-Time Lengkap */}
              <div className="text-center mt-3 pt-3 border-t border-indigo-500/20">
                <div className="text-xs font-semibold text-indigo-300">
                  {DAYS_SUN_FIRST[realTime.getDay()].full}
                </div>
                <div className="text-xl md:text-2xl font-extrabold text-white tracking-tight mt-0.5">
                  {todayDate} {MONTH_NAMES[todayMonth]} {todayYear}
                </div>
                <div className="text-xs text-indigo-300/80 mt-1 flex items-center justify-center gap-1.5">
                  <span>Pasaran Jawa:</span>
                  <span className="font-semibold text-white">
                    {getPasaran(todayYear, todayMonth, todayDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Fitur "Lompat ke Tahun/Bulan" Cepat Menyatu dalam Sisi Kiri */}
            <div className="bg-slate-900/80 rounded-2xl p-4 border border-indigo-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Lompat Cepat</h3>
                <button
                  onClick={jumpToToday}
                  className="text-xs text-indigo-400 hover:text-indigo-200 font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Hari Ini
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Bulan:</label>
                  <select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Tahun (1-9999):</label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={currentYear}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= 9999) setCurrentYear(val);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-center text-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Sidebar Kecil: Menu Statis (Home / Catatan Agenda / Sejarah Hari Ini) */}
            <nav className="space-y-1.5 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Navigasi Tab</div>
              
              <button
                onClick={() => setActiveTab('calendar')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-semibold flex items-center justify-between transition cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="w-4 h-4" />
                  <span>Tampilan Kalender</span>
                </div>
                <span className="text-[10px] opacity-75">Utama</span>
              </button>

              <button
                onClick={() => setActiveTab('agenda')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium flex items-center justify-between transition cursor-pointer ${
                  activeTab === 'agenda'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <span>Catatan Agenda</span>
                </div>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                  {agendas.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium flex items-center justify-between transition cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span>Sejarah Hari Ini</span>
                </div>
                <span className="text-[10px] text-purple-300">5 Era</span>
              </button>
            </nav>
          </div>

          {/* Bagian Bawah Sisi Kiri: Status Tahun Kabisat & Aksi Unduh */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
            <div className={`p-3 rounded-xl border text-xs text-center font-medium ${
              leap
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-900/80 text-slate-300 border-slate-800'
            }`}>
              {leap ? (
                <span>✨ <strong>Tahun Kabisat</strong> (366 hari, Feb 29 hari)</span>
              ) : (
                <span>🗓️ <strong>Tahun Biasa</strong> (365 hari, Feb 28 hari)</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadStandaloneHtml}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Unduh satu file HTML mandiri"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                Unduh HTML
              </button>

              <button
                onClick={handleCopyStandaloneHtml}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Salin kode HTML"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* AREA KALENDER INTERAKTIF UTAMA (Sisi Kanan, 2/3)                 */}
        {/* ============================================================== */}
        <main className="flex-1 p-5 sm:p-6 md:p-8 flex flex-col justify-between bg-slate-950/40">
          
          <div>
            {/* Top Bar Kalender Kanan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>{MONTH_NAMES[currentMonth]}</span>
                    <span className="text-indigo-400">{currentYear}</span>
                  </h2>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                    {getDaysInMonth(currentYear, currentMonth)} Hari
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Hari pertama: <span className="text-slate-200 font-semibold">{DAYS_SUN_FIRST[getDayOfWeek(currentYear, currentMonth, 1)].full}</span> &bull; Status: {leap ? 'Tahun Kabisat (Feb 29 hari)' : 'Tahun Biasa (Feb 28 hari)'}
                </p>
              </div>

              {/* Kontrol Navigasi Kanan (<, >, Today, Toggle Mulai Senin/Minggu) */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Toggle Mulai Senin / Minggu */}
                <button
                  onClick={() => setStartOnMonday(!startOnMonday)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-xs hover:border-slate-600 transition flex items-center gap-1.5 cursor-pointer"
                  title="Ganti hari pertama kolom (Senin atau Minggu)"
                >
                  <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
                  Mulai: {startOnMonday ? 'Senin' : 'Minggu'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    disabled={currentYear === 1 && currentMonth === 0}
                    className="p-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 transition disabled:opacity-30 cursor-pointer"
                    title="Bulan Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={jumpToToday}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer"
                  >
                    Today
                  </button>

                  <button
                    onClick={handleNextMonth}
                    disabled={currentYear === 9999 && currentMonth === 11}
                    className="p-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 transition disabled:opacity-30 cursor-pointer"
                    title="Bulan Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* TAB KONTEN 1: KALENDER GRID */}
            {activeTab === 'calendar' && (
              <div className="mt-4">
                {/* 7 Kolom Header Hari (Senin-Minggu, Minggu Merah Khusus) */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2.5 text-center text-xs sm:text-sm font-bold">
                  {dayHeaders.map((dh) => (
                    <div
                      key={dh.short}
                      className={`py-2 rounded-xl border ${
                        dh.isSunday
                          ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 font-extrabold'
                          : 'text-slate-300 bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <span className="hidden sm:inline">{dh.full}</span>
                      <span className="sm:hidden">{dh.short}</span>
                    </div>
                  ))}
                </div>

                {/* Grid Kotak Tanggal */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 min-h-[350px]">
                  {calendarCells.map((cell, idx) => {
                    const isSunday = cell.dow === 0;
                    const isRealToday =
                      cell.year === todayYear &&
                      cell.month === todayMonth &&
                      cell.day === todayDate;
                    const dateKey = `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
                    const hasAgenda = agendas.some(a => a.dateKey === dateKey);

                    return (
                      <div
                        key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                        onClick={() => {
                          if (!cell.isCurrentMonth) {
                            setCurrentYear(cell.year);
                            setCurrentMonth(cell.month);
                          }
                          setSelectedDate({ year: cell.year, month: cell.month, day: cell.day });
                        }}
                        className={`group relative h-16 sm:h-20 p-2 sm:p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:scale-[1.03] hover:shadow-lg ${
                          !cell.isCurrentMonth
                            ? 'bg-slate-950/40 border-slate-900 text-slate-600 hover:border-slate-800'
                            : isRealToday
                            ? 'bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/40 ring-2 ring-indigo-400'
                            : isSunday
                            ? 'bg-slate-900/80 border-slate-800 hover:border-rose-500/50 hover:bg-rose-950/20 text-rose-400'
                            : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        {/* Header Cell */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm sm:text-base font-extrabold ${
                              !cell.isCurrentMonth
                                ? 'text-slate-600'
                                : isRealToday
                                ? 'text-white'
                                : isSunday
                                ? 'text-rose-400'
                                : 'text-slate-100'
                            }`}
                          >
                            {cell.day}
                          </span>

                          <div className="flex items-center gap-1">
                            {hasAgenda && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Ada Catatan Agenda" />
                            )}
                            {isRealToday && (
                              <span className="text-[9px] bg-white text-indigo-700 px-1 py-0.2 rounded font-black tracking-wide">
                                HARI INI
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Footer Cell */}
                        <div className="flex items-center justify-between text-[10px] opacity-70">
                          <span className={isSunday ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                            {DAYS_SUN_FIRST[cell.dow].short}
                          </span>
                          {cell.isCurrentMonth && (
                            <span className="text-slate-500 group-hover:text-slate-300">
                              {getPasaran(cell.year, cell.month, cell.day)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB KONTEN 2: CATATAN AGENDA LENGKAP */}
            {activeTab === 'agenda' && (
              <div className="mt-4 p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-indigo-400" />
                      Catatan Agenda untuk {selectedDate ? `${selectedDate.day} ${MONTH_NAMES[selectedDate.month]} ${selectedDate.year}` : 'Tanggal Terpilih'}
                    </h3>
                    <p className="text-xs text-slate-400">Kelola kegiatan dan memo penting yang tersimpan secara lokal.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    Kembali ke Kalender &rarr;
                  </button>
                </div>

                {/* Form Input Tambah Agenda */}
                <form onSubmit={handleAddAgenda} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newAgendaTitle}
                    onChange={(e) => setNewAgendaTitle(e.target.value)}
                    placeholder="Tulis judul agenda / memo..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="time"
                    value={newAgendaTime}
                    onChange={(e) => setNewAgendaTime(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah
                  </button>
                </form>

                {/* List Agenda */}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedAgendas.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs italic">
                      Belum ada agenda pada tanggal {selectedDateKey}. Tambahkan agenda pertama Anda di atas!
                    </div>
                  ) : (
                    selectedAgendas.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleAgenda(item.id)}
                            className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                          />
                          <div>
                            <span className={`font-medium ${item.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                              {item.title}
                            </span>
                            {item.time && (
                              <span className="ml-2 text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                                {item.time}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => deleteAgenda(item.id)}
                          className="text-slate-400 hover:text-rose-400 transition p-1 cursor-pointer"
                          title="Hapus Agenda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB KONTEN 3: SEJARAH HARI INI */}
            {activeTab === 'history' && (
              <div className="mt-4 p-5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                      Peristiwa Sejarah Penting & Uji Kalender Abadi
                    </h3>
                    <p className="text-xs text-slate-400">Klik salah satu peristiwa untuk langsung melompat ke tanggal tersebut di kalender.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                  >
                    Kembali ke Kalender &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                  {historicalEvents.map((evt) => (
                    <div
                      key={evt.title}
                      onClick={() => {
                        setCurrentYear(evt.year);
                        setCurrentMonth(evt.month);
                        setSelectedDate({ year: evt.year, month: evt.month, day: evt.day });
                        setActiveTab('calendar');
                      }}
                      className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/60 hover:bg-indigo-950/20 transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-indigo-400">
                            {evt.day} {MONTH_NAMES[evt.month]} {evt.year}
                          </span>
                          <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                            Lompat
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{evt.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{evt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Legenda & Keterangan Tahun Kabisat vs Biasa di Bagian Bawah */}
          <footer className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-indigo-600" />
                <span>Hari Ini</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-400" />
                <span className="text-rose-400 font-semibold">Minggu (Libur)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Ada Agenda</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-right">
              {leap ? (
                <span className="text-emerald-400 font-semibold">
                  Tahun Kabisat (366 hari): Habis dibagi 4 / 400.
                </span>
              ) : (
                <span>
                  Tahun Biasa (365 hari): Februari memiliki 28 hari.
                </span>
              )}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
