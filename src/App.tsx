/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCcw,
  Sparkles,
  Download,
  Copy,
  Check,
  Info,
  Layers,
  Clock,
  Compass,
  CalendarDays,
  Bookmark,
  Share2
} from 'lucide-react';

// Nama-nama bulan dalam Bahasa Indonesia
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Nama-nama hari (Minggu indeks 0)
const DAY_NAMES = [
  { short: 'Min', full: 'Minggu', isSunday: true },
  { short: 'Sen', full: 'Senin', isSunday: false },
  { short: 'Sel', full: 'Selasa', isSunday: false },
  { short: 'Rab', full: 'Rabu', isSunday: false },
  { short: 'Kam', full: 'Kamis', isSunday: false },
  { short: 'Jum', full: 'Jumat', isSunday: false },
  { short: 'Sab', full: 'Sabtu', isSunday: false }
];

const PASARAN_NAMES = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];

/**
 * Logika Penentuan Tahun Kabisat (Gregorian Leap Year):
 * Tahun kabisat jika:
 * 1. Habis dibagi 4 DAN tidak habis dibagi 100, ATAU
 * 2. Habis dibagi 400.
 */
function isLeapYear(year: number): boolean {
  if (year < 1) return false;
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Menghitung jumlah hari dalam bulan tertentu (0-indexed: 0 = Januari, 11 = Desember)
 */
function getDaysInMonth(year: number, monthIndex: number): number {
  if (monthIndex === 1) {
    return isLeapYear(year) ? 29 : 28;
  }
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[monthIndex];
}

/**
 * Menghitung hari pertama (0 = Minggu, ..., 6 = Sabtu)
 * Menggunakan Algoritma Tomohiko Sakamoto yang deterministik dan presisi untuk tahun 1 - 9999.
 * Formula ini independen dari batasan implementasi Date JS bawaan (yang memetakan tahun 0-99 ke 1900-1999).
 */
function getDayOfWeek(year: number, monthIndex: number, day: number = 1): number {
  const m = monthIndex + 1; // 1-12
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  if (m < 3) {
    y -= 1;
  }
  const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + day) % 7;
  return (dow + 7) % 7;
}

/**
 * Menghitung Julian Day Number (JDN) untuk kalkulasi astronomis & Pasaran Jawa
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

/**
 * Menghitung Pasaran Jawa (Legi, Pahing, Pon, Wage, Kliwon)
 */
function getPasaran(year: number, monthIndex: number, day: number): string {
  const jdn = getJulianDayNumber(year, monthIndex, day);
  const index = ((jdn + 1) % 5 + 5) % 5;
  return PASARAN_NAMES[index];
}

/**
 * Menghitung urutan hari ke berapa dalam tahun tersebut (Day of Year)
 */
function getDayOfYear(year: number, monthIndex: number, day: number): number {
  let count = 0;
  for (let i = 0; i < monthIndex; i++) {
    count += getDaysInMonth(year, i);
  }
  return count + day;
}

export default function App() {
  const today = useMemo(() => {
    const d = new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate()
    };
  }, []);

  const [currentYear, setCurrentYear] = useState<number>(today.year);
  const [currentMonth, setCurrentMonth] = useState<number>(today.month);
  const [yearInput, setYearInput] = useState<string>(String(today.year));
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number; day: number } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync year input ketika currentYear berubah
  useEffect(() => {
    setYearInput(String(currentYear));
  }, [currentYear]);

  // Handle pergantian bulan
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

  // Navigasi cepat tahun
  const changeYearBy = (delta: number) => {
    const newY = Math.min(9999, Math.max(1, currentYear + delta));
    setCurrentYear(newY);
  };

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYearInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1 && num <= 9999) {
      setCurrentYear(num);
    }
  };

  const handleYearInputBlur = () => {
    const num = parseInt(yearInput, 10);
    if (isNaN(num) || num < 1) {
      setCurrentYear(1);
      setYearInput('1');
    } else if (num > 9999) {
      setCurrentYear(9999);
      setYearInput('9999');
    }
  };

  // Loncat ke hari ini
  const jumpToToday = () => {
    setCurrentYear(today.year);
    setCurrentMonth(today.month);
    setSelectedDate({ year: today.year, month: today.month, day: today.day });
  };

  // Preset sejarah terkenal
  const presets = [
    { label: 'Hari Ini', y: today.year, m: today.month, d: today.day },
    { label: '17 Agu 1945 (Proklamasi)', y: 1945, m: 7, d: 17 },
    { label: '1 Jan 2000 (Milenium)', y: 2000, m: 0, d: 1 },
    { label: '1 Jan 0001 (Awal Masehi)', y: 1, m: 0, d: 1 },
    { label: '31 Des 9999 (Maksimal)', y: 9999, m: 11, d: 31 },
  ];

  // Hitung grid kalender untuk bulan aktif
  const calendarCells = useMemo(() => {
    const daysCount = getDaysInMonth(currentYear, currentMonth);
    const startDayOfWeek = getDayOfWeek(currentYear, currentMonth, 1); // 0 (Minggu) s.d. 6 (Sabtu)

    // Hari dari bulan sebelumnya untuk padding
    const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevDaysCount = prevYear >= 1 ? getDaysInMonth(prevYear, prevMonthIndex) : 31;

    const cells = [];

    // Hari bulan sebelumnya
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        day: prevDaysCount - i,
        month: prevMonthIndex,
        year: prevYear,
        isCurrentMonth: false,
        dayOfWeek: (startDayOfWeek - 1 - i) % 7
      });
    }

    // Hari bulan sekarang
    for (let d = 1; d <= daysCount; d++) {
      const dow = (startDayOfWeek + (d - 1)) % 7;
      cells.push({
        day: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        dayOfWeek: dow
      });
    }

    // Hari bulan berikutnya untuk melengkapi kelipatan 7 (grid penuh)
    const remaining = (7 - (cells.length % 7)) % 7;
    const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    for (let d = 1; d <= remaining; d++) {
      const dow = (startDayOfWeek + daysCount + d - 1) % 7;
      cells.push({
        day: d,
        month: nextMonthIndex,
        year: nextYear,
        isCurrentMonth: false,
        dayOfWeek: dow
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  const leap = isLeapYear(currentYear);

  // Kode HTML Standalone siap unduh
  const standaloneHtmlCode = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kalender Abadi (1 - 9999 Masehi)</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col items-center p-4 md:p-8">

  <div class="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
    <!-- Header -->
    <header class="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white p-6 md:p-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm mb-2">
            ✨ Presisi Gregorian 1 - 9999 M
          </span>
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight">Kalender Abadi</h1>
          <p class="text-indigo-100 text-sm mt-1">Kalkulator penanggalan abadi dengan aturan kabisat presisi</p>
        </div>
        <button id="btn-today" class="self-start md:self-auto px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl text-sm shadow-md transition active:scale-95 flex items-center gap-2">
          📅 Hari Ini
        </button>
      </div>
    </header>

    <!-- Kontrol & Navigasi -->
    <div class="p-6 border-b border-slate-100 bg-slate-50/50">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <!-- Pilihan Bulan -->
        <div class="md:col-span-5 flex items-center gap-2">
          <button id="btn-prev-month" class="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition" title="Bulan Sebelumnya">
            &#9664;
          </button>
          <select id="select-month" class="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
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
          <button id="btn-next-month" class="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition" title="Bulan Berikutnya">
            &#9654;
          </button>
        </div>

        <!-- Pilihan Tahun -->
        <div class="md:col-span-4 flex items-center gap-2">
          <span class="text-sm font-semibold text-slate-500">Tahun:</span>
          <input id="input-year" type="number" min="1" max="9999" class="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
        </div>

        <!-- Status Kabisat -->
        <div class="md:col-span-3">
          <div id="leap-badge" class="px-3 py-2 rounded-xl text-xs font-semibold text-center border">
            <!-- Diisi lewat JS -->
          </div>
        </div>
      </div>

      <!-- Presets Cepat -->
      <div class="mt-4 flex flex-wrap gap-2 items-center text-xs text-slate-500">
        <span class="font-medium">Lompat Cepat:</span>
        <button class="preset-btn px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition" data-y="1945" data-m="7">17 Agu 1945</button>
        <button class="preset-btn px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition" data-y="2000" data-m="0">1 Jan 2000</button>
        <button class="preset-btn px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition" data-y="1" data-m="0">Tahun 1 M</button>
        <button class="preset-btn px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition" data-y="9999" data-m="11">Tahun 9999 M</button>
      </div>
    </div>

    <!-- Tampilan Nama Bulan & Tahun yang Aktif -->
    <div class="py-4 px-6 bg-white flex items-center justify-between border-b border-slate-100">
      <h2 id="calendar-title" class="text-2xl font-bold text-slate-800"></h2>
      <div id="calendar-subtitle" class="text-sm font-medium text-slate-500"></div>
    </div>

    <!-- Grid Kalender -->
    <div class="p-4 md:p-6">
      <!-- Header Nama Hari (7 Kolom, Minggu Merah) -->
      <div class="grid grid-cols-7 gap-2 mb-2 text-center text-xs md:text-sm font-bold">
        <div class="py-2 text-rose-600 bg-rose-50/70 rounded-lg">Minggu</div>
        <div class="py-2 text-slate-700 bg-slate-100/70 rounded-lg">Senin</div>
        <div class="py-2 text-slate-700 bg-slate-100/70 rounded-lg">Selasa</div>
        <div class="py-2 text-slate-700 bg-slate-100/70 rounded-lg">Rabu</div>
        <div class="py-2 text-slate-700 bg-slate-100/70 rounded-lg">Kamis</div>
        <div class="py-2 text-slate-700 bg-slate-100/70 rounded-lg">Jumat</div>
        <div class="py-2 text-slate-700 bg-slate-100/70 rounded-lg">Sabtu</div>
      </div>

      <!-- Kotak Tanggal (Di-render lewat JS) -->
      <div id="calendar-grid" class="grid grid-cols-7 gap-1.5 md:gap-2"></div>
    </div>

    <!-- Footer Keterangan Algoritma -->
    <footer class="p-6 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 space-y-2">
      <p><strong>Aturan Tahun Kabisat Gregorian:</strong> Sebuah tahun adalah kabisat jika habis dibagi 4, kecuali tahun pergantian abad (habis dibagi 100) yang harus habis dibagi 400.</p>
      <p><strong>Algoritma Sakamoto:</strong> Perhitungan hari pertama bulan dihitung secara presisi murni matematis dari tahun 1 hingga 9999 tanpa bergantung batasan Date Javascript tahun 1900-an.</p>
    </footer>
  </div>

  <script>
    // Konstanta Bulan
    const MONTH_NAMES = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Status Tanggal Hari Ini (Real-Time)
    const now = new Date();
    const realToday = {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate()
    };

    // State Aplikasi
    let currentYear = realToday.year;
    let currentMonth = realToday.month;

    // ELEMEN DOM
    const selectMonth = document.getElementById('select-month');
    const inputYear = document.getElementById('input-year');
    const btnPrevMonth = document.getElementById('btn-prev-month');
    const btnNextMonth = document.getElementById('btn-next-month');
    const btnToday = document.getElementById('btn-today');
    const leapBadge = document.getElementById('leap-badge');
    const calendarTitle = document.getElementById('calendar-title');
    const calendarSubtitle = document.getElementById('calendar-subtitle');
    const calendarGrid = document.getElementById('calendar-grid');

    /**
     * 1. LOGIKA KALKULASI TAHUN KABISAT GREGORIAN
     * Tahun kabisat jika habis dibagi 4 dan bukan abad, atau abad yang habis dibagi 400.
     */
    function isLeapYear(y) {
      if (y < 1) return false;
      return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    }

    /**
     * 2. LOGIKA JUMLAH HARI DALAM BULAN
     */
    function getDaysInMonth(y, m) {
      if (m === 1) return isLeapYear(y) ? 29 : 28;
      const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      return days[m];
    }

    /**
     * 3. LOGIKA ALGORITMA TOMOHIKO SAKAMOTO
     * Menghitung hari pertama dalam seminggu (0 = Minggu, 1 = Senin, ..., 6 = Sabtu).
     * Bekerja akurat dari tahun 1 hingga 9999 Masehi.
     */
    function getDayOfWeek(year, monthIndex, day = 1) {
      const m = monthIndex + 1; // Konversi ke bulan 1-12
      const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
      let y = year;
      if (m < 3) {
        y -= 1;
      }
      const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + day) % 7;
      return (dow + 7) % 7;
    }

    // FUNGSI RENDER UTAMA
    function renderCalendar() {
      // Validasi batas tahun
      if (currentYear < 1) currentYear = 1;
      if (currentYear > 9999) currentYear = 9999;

      // Update Form Kontrol
      selectMonth.value = currentMonth;
      inputYear.value = currentYear;

      // Update Judul
      calendarTitle.textContent = \`\${MONTH_NAMES[currentMonth]} \${currentYear}\`;
      const daysInThisMonth = getDaysInMonth(currentYear, currentMonth);
      calendarSubtitle.textContent = \`\${daysInThisMonth} Hari\`;

      // Update Status Kabisat
      const leap = isLeapYear(currentYear);
      if (leap) {
        leapBadge.className = "px-3 py-2 rounded-xl text-xs font-semibold text-center border bg-emerald-50 text-emerald-700 border-emerald-200";
        leapBadge.innerHTML = "✨ <strong>Tahun Kabisat</strong> (366 hari)";
      } else {
        leapBadge.className = "px-3 py-2 rounded-xl text-xs font-semibold text-center border bg-slate-100 text-slate-700 border-slate-200";
        leapBadge.innerHTML = "🗓️ <strong>Tahun Biasa</strong> (365 hari)";
      }

      // Bersihkan Grid
      calendarGrid.innerHTML = '';

      // Hitung Hari Awal & Padding Bulan Sebelumnya
      const firstDayOfWeek = getDayOfWeek(currentYear, currentMonth, 1); // 0=Minggu, 6=Sabtu
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthDays = prevYear >= 1 ? getDaysInMonth(prevYear, prevMonth) : 31;

      // Render Hari dari Bulan Sebelumnya (Warna Pudar)
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const d = prevMonthDays - i;
        const cell = document.createElement('div');
        cell.className = "h-14 md:h-20 p-2 rounded-xl border border-transparent bg-slate-50/50 text-slate-300 flex flex-col justify-between select-none";
        cell.innerHTML = \`<span class="text-xs md:text-sm font-medium">\${d}</span>\`;
        calendarGrid.appendChild(cell);
      }

      // Render Hari Bulan Sekarang
      for (let d = 1; d <= daysInThisMonth; d++) {
        const dow = (firstDayOfWeek + (d - 1)) % 7;
        const isSunday = dow === 0;
        const isToday = currentYear === realToday.year && currentMonth === realToday.month && d === realToday.day;

        const cell = document.createElement('div');
        cell.className = \`h-14 md:h-20 p-2 rounded-xl border transition cursor-pointer flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 \${
          isToday
            ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400 ring-offset-2 border-indigo-600 shadow-md'
            : isSunday
            ? 'bg-white hover:bg-rose-50/40 border-rose-100 text-rose-600'
            : 'bg-white hover:bg-indigo-50/40 border-slate-200 text-slate-800'
        }\`;

        cell.innerHTML = \`
          <div class="flex items-center justify-between">
            <span class="text-sm md:text-base font-bold \${isToday ? 'text-white' : isSunday ? 'text-rose-600' : 'text-slate-800'}">\${d}</span>
            \${isToday ? '<span class="text-[10px] uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded font-extrabold text-white">Hari Ini</span>' : ''}
          </div>
          <span class="text-[10px] md:text-xs opacity-70">\${isSunday ? 'Minggu' : ''}</span>
        \`;

        // Interaksi Klik
        cell.addEventListener('click', () => {
          alert(\`Tanggal Terpilih: \${d} \${MONTH_NAMES[currentMonth]} \${currentYear}\\nHari: \${['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dow]}\`);
        });

        calendarGrid.appendChild(cell);
      }

      // Render Hari dari Bulan Berikutnya (Melengkapi baris 7 kolom)
      const totalRendered = firstDayOfWeek + daysInThisMonth;
      const remaining = (7 - (totalRendered % 7)) % 7;
      for (let d = 1; d <= remaining; d++) {
        const cell = document.createElement('div');
        cell.className = "h-14 md:h-20 p-2 rounded-xl border border-transparent bg-slate-50/50 text-slate-300 flex flex-col justify-between select-none";
        cell.innerHTML = \`<span class="text-xs md:text-sm font-medium">\${d}</span>\`;
        calendarGrid.appendChild(cell);
      }
    }

    // EVENT LISTENERS
    selectMonth.addEventListener('change', (e) => {
      currentMonth = parseInt(e.target.value, 10);
      renderCalendar();
    });

    inputYear.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 1 && val <= 9999) {
        currentYear = val;
        renderCalendar();
      }
    });

    btnPrevMonth.addEventListener('click', () => {
      if (currentMonth === 0) {
        if (currentYear > 1) {
          currentYear--;
          currentMonth = 11;
        }
      } else {
        currentMonth--;
      }
      renderCalendar();
    });

    btnNextMonth.addEventListener('click', () => {
      if (currentMonth === 11) {
        if (currentYear < 9999) {
          currentYear++;
          currentMonth = 0;
        }
      } else {
        currentMonth++;
      }
      renderCalendar();
    });

    btnToday.addEventListener('click', () => {
      currentYear = realToday.year;
      currentMonth = realToday.month;
      renderCalendar();
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentYear = parseInt(btn.dataset.y, 10);
        currentMonth = parseInt(btn.dataset.m, 10);
        renderCalendar();
      });
    });

    // Inisialisasi awal
    renderCalendar();
  </script>
</body>
</html>`;
  }, []);

  const handleDownloadStandaloneHtml = () => {
    const blob = new Blob([standaloneHtmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KalenderAbadi_${currentYear}_${MONTH_NAMES[currentMonth]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyStandaloneHtml = () => {
    navigator.clipboard.writeText(standaloneHtmlCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Kalkulasi detail untuk modal inspector tanggal terpilih
  const selectedDetails = useMemo(() => {
    if (!selectedDate) return null;
    const { year, month, day } = selectedDate;
    const dow = getDayOfWeek(year, month, day);
    const dayName = DAY_NAMES[dow].full;
    const pasaran = getPasaran(year, month, day);
    const dayOfYear = getDayOfYear(year, month, day);
    const totalDaysInYear = isLeapYear(year) ? 366 : 365;
    const daysLeftInYear = totalDaysInYear - dayOfYear;
    const weekNumber = Math.ceil(dayOfYear / 7);

    // Selisih hari dari real-time hari ini
    const todayJdn = getJulianDayNumber(today.year, today.month, today.day);
    const thisJdn = getJulianDayNumber(year, month, day);
    const diffDays = thisJdn - todayJdn;

    return {
      dateStr: `${day} ${MONTH_NAMES[month]} ${year}`,
      dayName,
      pasaran,
      dayOfYear,
      totalDaysInYear,
      daysLeftInYear,
      weekNumber,
      diffDays,
      isToday: year === today.year && month === today.month && day === today.day
    };
  }, [selectedDate, today]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-3 sm:p-6 md:p-8 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-rose-600 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-5xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/40 overflow-hidden flex flex-col">
        {/* Top Header */}
        <header className="p-6 md:p-8 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Presisi Tahun 1 - 9999 Masehi
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Kalender Gregorian
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <CalendarIcon className="w-8 h-8 text-indigo-400" />
                Kalender Abadi
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-xl">
                Aplikasi penanggalan abadi interaktif dengan algoritma tahun kabisat dan kalkulasi hari deterministik tanpa batas.
              </p>
            </div>

            {/* Aksi Cepat Header */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={jumpToToday}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer"
                title="Kembali ke Tanggal Hari Ini"
              >
                <RotateCcw className="w-4 h-4" />
                Hari Ini
              </button>

              <button
                onClick={handleDownloadStandaloneHtml}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-medium rounded-xl text-sm border border-slate-700 transition flex items-center gap-2 cursor-pointer"
                title="Unduh versi satu file HTML mandiri"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Unduh HTML</span>
              </button>

              <button
                onClick={handleCopyStandaloneHtml}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-medium rounded-xl text-sm border border-slate-700 transition flex items-center gap-2 cursor-pointer"
                title="Salin kode satu file HTML ke clipboard"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span className="hidden sm:inline">Salin Kode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Kontrol Navigasi & Input Form */}
        <section className="p-5 md:p-6 bg-slate-900/60 border-b border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Navigasi Bulan */}
            <div className="md:col-span-5 flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                disabled={currentYear === 1 && currentMonth === 0}
                className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="relative flex-1">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
                  className="w-full appearance-none px-4 py-2.5 bg-slate-800 border border-slate-700 text-white font-semibold text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>

              <button
                onClick={handleNextMonth}
                disabled={currentYear === 9999 && currentMonth === 11}
                className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Bulan Berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Input Angka Tahun Langsung */}
            <div className="md:col-span-4 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tahun:</span>
              <div className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => changeYearBy(-1)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer"
                  title="Kurang 1 Tahun"
                >
                  -1
                </button>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={yearInput}
                  onChange={handleYearInputChange}
                  onBlur={handleYearInputBlur}
                  className="w-full text-center py-2.5 px-3 bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 text-white font-bold text-base rounded-xl focus:outline-none transition"
                  placeholder="1 - 9999"
                />
                <button
                  onClick={() => changeYearBy(1)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer"
                  title="Tambah 1 Tahun"
                >
                  +1
                </button>
              </div>
            </div>

            {/* Indikator Teks Status Tahun Kabisat vs Biasa */}
            <div className="md:col-span-3">
              {leap ? (
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-950/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold">Tahun Kabisat</span> (366 hari)
                </div>
              ) : (
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex items-center justify-center gap-2 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="font-medium">Tahun Biasa</span> (365 hari)
                </div>
              )}
            </div>
          </div>

          {/* Stepper Cepat Abad / Dekade & Presets */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-medium mr-1">Lompatan:</span>
              <button
                onClick={() => changeYearBy(-100)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-300 transition cursor-pointer"
              >
                -100 Thn
              </button>
              <button
                onClick={() => changeYearBy(-10)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-300 transition cursor-pointer"
              >
                -10 Thn
              </button>
              <button
                onClick={() => changeYearBy(10)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-300 transition cursor-pointer"
              >
                +10 Thn
              </button>
              <button
                onClick={() => changeYearBy(100)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-300 transition cursor-pointer"
              >
                +100 Thn
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-medium mr-1">Preset Sejarah:</span>
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setCurrentYear(p.y);
                    setCurrentMonth(p.m);
                    setSelectedDate({ year: p.y, month: p.m, day: p.d });
                  }}
                  className="px-2.5 py-1 bg-slate-800/80 hover:bg-indigo-900/40 hover:border-indigo-500/50 hover:text-indigo-300 border border-slate-700 rounded-lg text-slate-300 transition cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Bar Judul Kalender & View Switcher */}
        <div className="py-4 px-6 bg-slate-900 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>{MONTH_NAMES[currentMonth]}</span>
              <span className="text-indigo-400">{currentYear}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Total {getDaysInMonth(currentYear, currentMonth)} hari &bull; Hari pertama:{' '}
              {DAY_NAMES[getDayOfWeek(currentYear, currentMonth, 1)].full}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center text-xs">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'month'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Bulanan
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'year'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Tahunan (12 Bln)
              </button>
            </div>
          </div>
        </div>

        {/* TAMPILAN BULANAN UTAMA */}
        {viewMode === 'month' && (
          <div className="p-4 sm:p-6 flex-1 flex flex-col">
            {/* 7 Kolom Header Hari dengan penanda merah khusus Minggu */}
            <div className="grid grid-cols-7 gap-2 mb-3 text-center">
              {DAY_NAMES.map((d) => (
                <div
                  key={d.short}
                  className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm border ${
                    d.isSunday
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-slate-800/60 text-slate-300 border-slate-800'
                  }`}
                >
                  <span className="hidden sm:inline">{d.full}</span>
                  <span className="sm:hidden">{d.short}</span>
                </div>
              ))}
            </div>

            {/* Grid Tanggal */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 flex-1">
              {calendarCells.map((cell, idx) => {
                const isSunday = cell.dayOfWeek === 0;
                const isRealToday =
                  cell.year === today.year &&
                  cell.month === today.month &&
                  cell.day === today.day;
                const isSelected =
                  selectedDate?.year === cell.year &&
                  selectedDate?.month === cell.month &&
                  selectedDate?.day === cell.day;

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
                    className={`group relative min-h-[70px] sm:min-h-[90px] p-2 sm:p-2.5 rounded-2xl border transition duration-200 cursor-pointer flex flex-col justify-between overflow-hidden ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-900/30 border-slate-800/40 text-slate-600 hover:border-slate-700'
                        : isRealToday
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-400 ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-600/30'
                        : isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/60 text-white'
                        : isSunday
                        ? 'bg-slate-900/80 border-slate-800 hover:border-rose-500/50 hover:bg-rose-950/20 text-rose-400'
                        : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 text-slate-200'
                    } hover:-translate-y-0.5 hover:shadow-md`}
                  >
                    {/* Header Kotak Tanggal */}
                    <div className="flex items-start justify-between">
                      <span
                        className={`text-base sm:text-lg font-bold leading-none ${
                          !cell.isCurrentMonth
                            ? 'text-slate-600'
                            : isRealToday
                            ? 'text-white'
                            : isSunday
                            ? 'text-rose-400 font-extrabold'
                            : 'text-slate-100'
                        }`}
                      >
                        {cell.day}
                      </span>

                      {/* Penanda Khusus Real Today */}
                      {isRealToday && (
                        <span className="text-[10px] tracking-wider uppercase font-black px-1.5 py-0.5 rounded bg-white text-indigo-700 shadow-sm">
                          Hari Ini
                        </span>
                      )}

                      {/* Pasaran Mini */}
                      {cell.isCurrentMonth && !isRealToday && (
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition">
                          {getPasaran(cell.year, cell.month, cell.day)}
                        </span>
                      )}
                    </div>

                    {/* Footer Info Kotak Tanggal */}
                    <div className="flex items-center justify-between text-[10px] opacity-75">
                      <span className={isSunday ? 'text-rose-400/90' : 'text-slate-400'}>
                        {DAY_NAMES[cell.dayOfWeek].short}
                      </span>
                      {cell.isCurrentMonth && (
                        <span className="text-slate-500 group-hover:text-slate-300">
                          #{getDayOfYear(cell.year, cell.month, cell.day)}
                        </span>
                      )}
                    </div>

                    {/* Hover Glow Accent */}
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAMPILAN TAHUNAN (12 Bulan Ringkas) */}
        {viewMode === 'year' && (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[750px] overflow-y-auto">
            {MONTH_NAMES.map((monthName, mIdx) => {
              const daysInM = getDaysInMonth(currentYear, mIdx);
              const startDow = getDayOfWeek(currentYear, mIdx, 1);
              const blanks = Array.from({ length: startDow });
              const days = Array.from({ length: daysInM }, (_, i) => i + 1);

              return (
                <div
                  key={monthName}
                  onClick={() => {
                    setCurrentMonth(mIdx);
                    setViewMode('month');
                  }}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer group hover:-translate-y-1 ${
                    mIdx === currentMonth
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-white group-hover:text-indigo-400 transition">
                      {monthName}
                    </h3>
                    <span className="text-[10px] text-slate-500">{daysInM} hari</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-[10px] text-center mb-1 text-slate-500 font-semibold">
                    <span className="text-rose-400">M</span>
                    <span>S</span>
                    <span>S</span>
                    <span>R</span>
                    <span>K</span>
                    <span>J</span>
                    <span>S</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-[10px] text-center">
                    {blanks.map((_, i) => (
                      <span key={`b-${i}`} className="text-transparent">
                        .
                      </span>
                    ))}
                    {days.map((d) => {
                      const dow = (startDow + d - 1) % 7;
                      const isSun = dow === 0;
                      const isReal =
                        currentYear === today.year &&
                        mIdx === today.month &&
                        d === today.day;

                      return (
                        <span
                          key={`d-${d}`}
                          className={`rounded py-0.5 ${
                            isReal
                              ? 'bg-indigo-600 text-white font-bold'
                              : isSun
                              ? 'text-rose-400 font-semibold'
                              : 'text-slate-300'
                          }`}
                        >
                          {d}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL / INSPECTOR DETAIL TANGGAL */}
        {selectedDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-left">
              <button
                onClick={() => setSelectedDate(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedDetails.dateStr}</h3>
                  <p className="text-xs text-indigo-400 font-medium">
                    {selectedDetails.dayName} {selectedDetails.pasaran} (Pasaran Jawa)
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-800/70 rounded-xl flex items-center justify-between border border-slate-700/50">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-400" /> Hari dalam Tahun Ini
                  </span>
                  <span className="font-bold text-white">
                    Hari ke-{selectedDetails.dayOfYear} dari {selectedDetails.totalDaysInYear} hari
                  </span>
                </div>

                <div className="p-3 bg-slate-800/70 rounded-xl flex items-center justify-between border border-slate-700/50">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> Sisa Hari di Tahun {selectedDate?.year}
                  </span>
                  <span className="font-bold text-white">{selectedDetails.daysLeftInYear} hari lagi</span>
                </div>

                <div className="p-3 bg-slate-800/70 rounded-xl flex items-center justify-between border border-slate-700/50">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Minggu ke-
                  </span>
                  <span className="font-bold text-white">Minggu ke-{selectedDetails.weekNumber}</span>
                </div>

                <div className="p-3 bg-slate-800/70 rounded-xl flex items-center justify-between border border-slate-700/50">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-400" /> Jarak dari Hari Ini
                  </span>
                  <span className="font-bold text-white">
                    {selectedDetails.diffDays === 0
                      ? 'Hari ini tepat!'
                      : selectedDetails.diffDays > 0
                      ? `${selectedDetails.diffDays} hari lagi di masa depan`
                      : `${Math.abs(selectedDetails.diffDays)} hari yang lalu`}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedDate(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Dokumentasi & Algoritma */}
        <footer className="p-5 md:p-6 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 font-semibold text-slate-300">
                <Info className="w-4 h-4 text-indigo-400" />
                Aturan Tahun Kabisat Kalender Gregorian:
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Tahun kabisat (366 hari) berlaku jika tahun habis dibagi 4 (<code className="text-indigo-300">year % 4 === 0</code>) dan tidak habis dibagi 100 (<code className="text-indigo-300">year % 100 !== 0</code>), atau pergantian abad yang habis dibagi 400 (<code className="text-indigo-300">year % 400 === 0</code>).
              </p>
            </div>
            <div className="text-[11px] text-slate-500 md:text-right">
              Algoritma Sakamoto &bull; Rentang Tahun 1 - 9999 Masehi
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
