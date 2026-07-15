import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, 
  Search, 
  MapPin, 
  Briefcase, 
  Award,
  Activity,
  LayoutDashboard,
  Store,
  Filter,
  TrendingUp,
  ShoppingCart,
  Target,
  Building2,
  Calendar,
  RefreshCcw,
  Clock,
  UserCheck,
  Users,
  Percent,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  ClipboardList,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  LineChart
} from 'recharts';

const parseCSV = (str) => {
  const arr = [];
  let quote = false;
  let row = 0, col = 0, c = 0;
  for (; c < str.length; c++) {
      let cc = str[c], nc = str[c+1];
      arr[row] = arr[row] || [];
      arr[row][col] = arr[row][col] || '';
      if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
      if (cc == '"') { quote = !quote; continue; }
      if (cc == ',' && !quote) { ++col; continue; }
      if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
      if (cc == '\n' && !quote) { ++row; col = 0; continue; }
      if (cc == '\r' && !quote) { ++row; col = 0; continue; }
      arr[row][col] += cc;
  }
  
  const headers = arr[0] ? arr[0].map(h => h ? h.trim().replace(/^\ufeff/, '') : '') : [];
  const data = [];
  for (let i = 1; i < arr.length; i++) {
      if (arr[i].length === 1 && arr[i][0] === '') continue; 
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
          if (headers[j]) obj[headers[j]] = arr[i][j] ? arr[i][j].trim() : '';
      }
      obj['_RAW_ROW'] = arr[i]; // Menyimpan baris mentah asal untuk rujukan indeks fizikal
      data.push(obj);
  }
  return data;
};

const normalizeBulan = (val) => {
  if (!val) return 'Tiada';
  const clean = val.toString().trim().toLowerCase();
  
  if (clean === '1' || clean === '01' || clean.includes('jan')) return 'Jan';
  if (clean === '2' || clean === '02' || clean.includes('feb')) return 'Feb';
  if (clean === '3' || clean === '03' || clean.includes('mac') || clean.includes('mar')) return 'Mac';
  if (clean === '4' || clean === '04' || clean.includes('apr')) return 'Apr';
  if (clean === '5' || clean === '05' || clean.includes('mei') || clean.includes('may')) return 'Mei';
  if (clean === '6' || clean === '06' || clean.includes('jun')) return 'Jun';
  if (clean === '7' || clean === '07' || clean.includes('jul')) return 'Jul';
  if (clean === '8' || clean === '08' || clean.includes('ogo') || clean.includes('aug')) return 'Ogo';
  if (clean === '9' || clean === '09' || clean.includes('sep')) return 'Sep';
  if (clean === '10' || clean === 'okt') return 'Okt';
  if (clean === '11' || clean === 'nov') return 'Nov';
  if (clean === '12' || clean === 'dis' || clean.includes('dec')) return 'Dis';
  
  return val;
};

const normalizeDateToISO = (val) => {
  if (!val) return '';
  const clean = val.toString().trim().split(' ')[0]; // Membuang sebarang timestamp masa jika ada
  
  // Format DD/MM/YYYY atau DD-MM-YYYY
  let match = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    let day = match[1].padStart(2, '0');
    let month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  
  // Format YYYY/MM/DD atau YYYY-MM-DD
  match = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (match) {
    let year = match[1];
    let month = match[2].padStart(2, '0');
    let day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
};

const matchPICName = (dbName, picListValue) => {
  if (!dbName || !picListValue) return false;
  
  const cleanStr = (str) => {
    return str.toString()
      .toLowerCase()
      .replace(/[\s\._()\-]/g, '') // Buang ruang, titik, sempang, kurungan
      .replace(/binti|bte|bin|bt/g, ''); // Permudah padanan bin/binti
  };
  
  const cDb = cleanStr(dbName);
  const cList = cleanStr(picListValue);
  
  if (cDb === cList) return true;
  
  // Fuzzy match: Sekiranya nama pendek di dalam sheet terkandung dalam nama panjang senarai, atau sebaliknya
  if (cDb.length > 4 && cList.length > 4) {
    if (cDb.includes(cList) || cList.includes(cDb)) {
      return true;
    }
  }
  
  return false;
};

const formatLocalYYYYMMDD = (date) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getWeekLabel = (weekNum, year = 2026) => {
  if (weekNum < 1 || weekNum > 53) return `Minggu ${weekNum}`;
  const startDate = new Date(year, 0, 1 + (weekNum - 1) * 7);
  const endDate = new Date(year, 0, weekNum * 7);
  
  const startDay = startDate.getDate();
  const startMonth = startDate.toLocaleDateString('ms-MY', { month: 'short' });
  const endDay = endDate.getDate();
  const endMonth = endDate.toLocaleDateString('ms-MY', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth}`;
  } else {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  }
};

const generateMockTransaksi = () => {
  const data = [];
  const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const pics = [
    'Elvy Yulinda Sudirman',
    'Mohammad Syauqi Mohd Jamil',
    'Mohd Rosaidil AB Rafar',
    'Tajul Rosli Abd Hamid',
    'Noorshazana Ishak',
    'Norfirdaus Ahmad',
    'Norreshida Mohd Kori',
    'Nur Ilyana Izzati',
    'Nurul Amiza Paimin',
    'Nurul Hasna binti Khalil'
  ];
  const categories = ['Runcit', 'Borong', 'Pasaraya Besar', 'Kedai Serbaneka', 'Koperasi Sekolah', 'NonCoop'];
  const states = ['Selangor', 'Kuala Lumpur', 'Johor', 'Pulau Pinang', 'Perak', 'Kedah', 'Sabah', 'Sarawak'];
  const koperasis = Array.from({length: 30}, (_, i) => `Koperasi Pembangunan ${i+1} Bhd`);

  const currentMonthIdx = 6; // Julai

  for (let i = 0; i < 900; i++) {
    const monthIdx = Math.floor(Math.random() * (currentMonthIdx + 1)); 
    const poAmount = Math.floor(Math.random() * 50000) + 5000;
    const invAmount = poAmount * (Math.random() * 0.2 + 0.8);
    
    const weekStart = (monthIdx * 4) + 1;
    const weekEnd = (monthIdx * 4) + 4;
    const minggu = Math.floor(Math.random() * (weekEnd - weekStart + 1)) + weekStart;
    
    const day = Math.floor(Math.random() * 28) + 1;
    const monthNum = monthIdx + 1;
    const tarikhStr = `2026-${monthNum.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    data.push({
      'TAHUN': '2026',
      'BULAN': months[monthIdx],
      'MINGGU': minggu,
      'DISTRIBUTION TYPE': Math.random() > 0.5 ? 'Direct' : 'Distributor',
      'BRAND': 'KPNiaga Brand ' + (Math.floor(Math.random() * 3) + 1),
      'KOPERASI': koperasis[Math.floor(Math.random() * koperasis.length)],
      'OUTLET': `Outlet Cawangan ${Math.floor(Math.random() * 100)}`,
      'PO AMOUNT (RM)': poAmount,
      'INVOICE AMOUNT (RM)': invAmount,
      'P.I.C. SALES': pics[Math.floor(Math.random() * pics.length)],
      'KATEGORI OUTLET': categories[Math.floor(Math.random() * categories.length)],
      'NEGERI': states[Math.floor(Math.random() * states.length)],
      'TARIKH': tarikhStr
    });
  }
  return data;
};

const generateMockOutlet = () => {
  const data = [];
  const jkans = [
    'Johor', 'Selangor', 'Negeri Sembilan', 'Kedah', 'Kelantan', 'Wilayah Persekutuan',
    'Melaka', 'Pahang Barat', 'Pahang Tengah', 'Pahang Timur', 'Perak', 'Perlis',
    'Pulau Pinang', 'Sabah', 'Sarawak', 'Terengganu'
  ];
  const koperasis = Array.from({length: 3655}, (_, i) => `Koperasi KPNiaga ${i+1} Bhd`);

  koperasis.forEach((kop, i) => {
    const isAktif = Math.random() < 0.4; 
    const year = 2019 + Math.floor(Math.random() * 8); 
    const month = Math.floor(Math.random() * 12) + 1;
    const totalSales = isAktif ? Math.floor(Math.random() * 500000) + 10000 : 0;

    data.push({
      'NO': i + 1,
      'NAMA SYARIKAT': kop,
      'DUN': `DUN ${Math.floor(Math.random() * 50)}`,
      'PARLIMEN': `P${Math.floor(Math.random() * 100) + 100}`,
      'JKAN': jkans[Math.floor(Math.random() * jkans.length)],
      'KATEGORI': 'Pengguna',
      'TARIKH DAFTAR': `${year}-${month.toString().padStart(2, '0')}-${Math.floor(Math.random() * 28) + 1}`,
      'TAHUN DAFTAR': year,
      'BULAN DAFTAR': normalizeBulan(month),
      'MINGGU DAFTAR': Math.floor(Math.random() * 52) + 1,
      'JUMLAH JUALAN': totalSales,
      'AKTIF': totalSales > 0
    });
  });
  return data;
};

const stableMockTransaksi = generateMockTransaksi();
const stableMockOutlet = generateMockOutlet();

const formatRM = (val) => new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
const formatNum = (val) => new Intl.NumberFormat('ms-MY').format(val);
const COLORS = ['#2563eb', '#0d9488', '#e11d48', '#d97706', '#7c3aed', '#0284c7', '#059669', '#dc2626', '#14b8a6', '#f43f5e'];

const KPICard = ({ title, value, icon: Icon, colorClass, subtitle, valueColorClass }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center justify-between transition-transform hover:-translate-y-1 duration-200">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className={`text-2xl font-bold ${valueColorClass || 'text-slate-800'}`}>{value}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
    <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${colorClass.split(' ')[1] || 'text-blue-600'}`} />
    </div>
  </div>
);

const renderCustomizedLabel = (props) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name, index } = props;
  const RADIAN = Math.PI / 180;
  
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  
  const sx = cx + (outerRadius + 2) * cos;
  const sy = cy + (outerRadius + 2) * sin;
  const mx = cx + (outerRadius + 18) * cos;
  const my = cy + (outerRadius + 18) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 15;
  const ey = my;
  
  const textAnchor = cos >= 0 ? 'start' : 'end';
  const percentage = percent ? `${(percent * 100).toFixed(0)}%` : '0%';
  const color = COLORS[index % COLORS.length];

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={color} strokeWidth={1.5} fill="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 5}
        y={ey}
        textAnchor={textAnchor}
        fill={color}
        dominantBaseline="middle"
        className="text-[11px] font-semibold"
      >
        {`${name} ${percentage}`}
      </text>
    </g>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('pegawai'); 
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const [dataTransaksi, setDataTransaksi] = useState([]);
  const [dataOutlet, setDataOutlet] = useState([]);

  const [filterT, setFilterT] = useState({ bulan: 'Semua', minggu: 'Semua', pic: 'Semua', kategori: 'Semua', negeri: 'Semua' });
  const [filterO, setFilterO] = useState({ tahun: 'Semua', bulan: 'Semua', minggu: 'Semua', jkan: 'Semua' });
  
  const [pegawaiTimeUnit, setPegawaiTimeUnit] = useState('bulan'); 
  const [selectedPegawaiFilter, setSelectedPegawaiFilter] = useState('Keseluruhan'); 

  const TARGET_SALES = 13475500;

  const allowedPICsList = useMemo(() => [
    'Elvy Yulinda Sudirman',
    'Mohammad Syauqi Mohd Jamil',
    'Mohd Rosaidil AB Rafar',
    'Tajul Rosli Abd Hamid',
    'Noorshazana Ishak',
    'Norfirdaus Ahmad',
    'Norreshida Mohd Kori',
    'Nur Ilyana Izzati',
    'Nurul Amiza Paimin',
    'Nurul Hasna binti Khalil'
  ], []);

  const allowedPICs = useMemo(() => allowedPICsList.map(name => name.trim().toLowerCase()), [allowedPICsList]);

  const fetchLiveDatabase = async (isBackground = false) => {
    if (isBackground) {
      setSyncing(true);
    } else {
      setLoading(true);
    }

    try {
      const cacheBust = Date.now();
      const urlTransaksi = `https://docs.google.com/spreadsheets/d/e/2PACX-1vR6i7so7I2PFFuiBfZFkLLZcEP8WPxp0d_USe0OJgdcAe8tSJcshuiquOJ-3rqjv2BiJtyrPeemDP_A/pub?output=csv&single=true&_t=${cacheBust}`;
      const resT = await fetch(urlTransaksi);
      const textT = await resT.text();
      const parsedT = parseCSV(textT);
      
      // 1. Khas: Imbas 20 baris pertama untuk mengesan nama kolum PIC & Tarikh secara dinamik
      let picColumnKey = '';
      let dateColumnKey = '';
      
      for (let i = 0; i < Math.min(parsedT.length, 20); i++) {
        const r = parsedT[i];
        
        if (!picColumnKey) {
          for (const key in r) {
            if (key === '_RAW_ROW') continue;
            const val = r[key] || '';
            if (allowedPICsList.some(pic => matchPICName(val, pic))) {
              picColumnKey = key;
            }
          }
        }
        
        if (!dateColumnKey) {
          for (const key in r) {
            if (key === '_RAW_ROW') continue;
            const cleanK = key.toLowerCase().replace(/[\s\._()\-]/g, '');
            if (cleanK.includes('tarikh') || cleanK.includes('date')) {
              dateColumnKey = key;
            }
          }
        }
      }

      // 2. Fungsi penstandardan kolum kebal
      const standardizeRow = (row) => {
        const std = {};
        const findValue = (possibleNames) => {
          for (const name of possibleNames) {
            const cleanTarget = name.toLowerCase().replace(/[\s\._()\-]/g, '');
            for (const k in row) {
              const cleanKey = k.toLowerCase().replace(/[\s\._()\-]/g, '');
              if (cleanKey === cleanTarget) {
                return row[k];
              }
            }
          }
          return undefined;
        };

        std['TAHUN'] = findValue(['TAHUN', 'YEAR', 'THN']) || '2026';
        std['BULAN'] = findValue(['BULAN', 'MONTH', 'BLN']) || '';
        std['MINGGU'] = findValue(['MINGGU', 'WEEK', 'MGG', 'MG']) || '0';
        std['KATEGORI OUTLET'] = findValue(['KATEGORI OUTLET', 'KATEGORI', 'CATEGORY', 'OUTLET CATEGORY']) || '';
        std['NEGERI'] = findValue(['NEGERI', 'STATE', 'NEG']) || '';
        std['KOPERASI'] = findValue(['KOPERASI', 'COOPERATIVE', 'NAMA KOPERASI', 'KOP']) || '';
        std['PO AMOUNT (RM)'] = findValue(['PO AMOUNT (RM)', 'PO AMOUNT', 'PO', 'PO RM', 'JUMLAH PO']) || '0';
        std['INVOICE AMOUNT (RM)'] = findValue(['INVOICE AMOUNT (RM)', 'INVOICE AMOUNT', 'INVOICE', 'INV', 'INV RM', 'JUMLAH INVOIS']) || '0';
        std['DISTRIBUTION TYPE'] = findValue(['DISTRIBUTION TYPE', 'DISTRIBUTION', 'TYPE']) || '';
        std['BRAND'] = findValue(['BRAND', 'JENAMA']) || '';
        std['OUTLET'] = findValue(['OUTLET', 'CAWANGAN']) || '';
        std['_RAW_ROW'] = row['_RAW_ROW'];
        return std;
      };

      const formatT = parsedT
        .map(row => {
          const std = standardizeRow(row);
          
          // Memaksimumkan ketepatan kolum PIC jika dikesan secara automatik
          if (picColumnKey && row[picColumnKey]) {
            std['P.I.C. SALES'] = row[picColumnKey];
          } else {
            // Lalai fallback
            std['P.I.C. SALES'] = row['P.I.C. SALES'] || row['PIC SALES'] || row['P.I.C SALES'] || row['PIC'] || '';
          }

          // Pemetaan tarikh kebal (Mengekstrak daripada dikesan, Kolum M, atau imbasan sebaris)
          let tarikhVal = '';
          if (dateColumnKey && row[dateColumnKey]) {
            tarikhVal = row[dateColumnKey];
          } else if (row['_RAW_ROW'] && row['_RAW_ROW'][12]) {
            tarikhVal = row['_RAW_ROW'][12]; // Fizikal Kolum M (Indeks 12)
          }

          // Imbasan sandaran sebaris sekiranya semua di atas gagal
          if (!tarikhVal && row['_RAW_ROW']) {
            for (const cellVal of row['_RAW_ROW']) {
              if (cellVal) {
                const cv = cellVal.trim();
                if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cv) || /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(cv)) {
                  tarikhVal = cv;
                  break;
                }
              }
            }
          }

          std['TARIKH'] = normalizeDateToISO(tarikhVal);
          return std;
        })
        .filter(row => row['TAHUN'] || row['BULAN']) // Tapis baris kosong
        .map(row => ({
          ...row,
          'BULAN': normalizeBulan(row['BULAN']),
          'PO AMOUNT (RM)': parseFloat(row['PO AMOUNT (RM)']?.toString().replace(/,/g, '') || 0),
          'INVOICE AMOUNT (RM)': parseFloat(row['INVOICE AMOUNT (RM)']?.toString().replace(/,/g, '') || 0),
          'MINGGU': parseInt(row['MINGGU'] || 0)
        }));
      
      if (formatT.length > 0) {
        setDataTransaksi(formatT);
      } else {
        setDataTransaksi(stableMockTransaksi);
      }

      const urlOutlet = `https://docs.google.com/spreadsheets/d/e/2PACX-1vR6i7so7I2PFFuiBfZFkLLZcEP8WPxp0d_USe0OJgdcAe8tSJcshuiquOJ-3rqjv2BiJtyrPeemDP_A/pub?output=csv&single=true&gid=1114526685&_t=${cacheBust}`;
      
      try {
        const resO = await fetch(urlOutlet);
        const textO = await resO.text();
        const parsedO = parseCSV(textO);
        
        if (parsedO.length > 0 && parsedO[0]['JKAN'] !== undefined) {
          const formatO = parsedO
            .filter(row => row['NAMA SYARIKAT'])
            .map(row => {
              const jualan = parseFloat(row['JUMLAH JUALAN']?.replace(/,/g, '') || 0);
              let tDaftar = row['TARIKH DAFTAR'] || '';
              let tTahun = 'Tiada', tBulan = 'Tiada', tMinggu = '1';
              if (tDaftar) {
                  const match1 = tDaftar.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/); 
                  const match2 = tDaftar.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/); 
                  if (match1) {
                      tTahun = match1[1]; tBulan = normalizeBulan(parseInt(match1[2]));
                  } else if (match2) {
                      tTahun = match2[3]; tBulan = normalizeBulan(parseInt(match2[2]));
                  }
              }
              
              return {
                ...row,
                'TAHUN DAFTAR': tTahun,
                'BULAN DAFTAR': tBulan,
                'MINGGU DAFTAR': tMinggu,
                'JUMLAH JUALAN': jualan,
                'AKTIF': jualan > 0
              };
            });
          setDataOutlet(formatO);
        } else {
          setDataOutlet(stableMockOutlet);
        }
      } catch(e) {
        console.warn("Gagal fetch Outlet. Menggunakan Data Simulasi.", e);
        setDataOutlet(stableMockOutlet);
      }

      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    } catch (error) {
      console.error("Gagal menarik data langsung, kembali kepada Data Simulasi.", error);
      if (dataTransaksi.length === 0) {
        setDataTransaksi(stableMockTransaksi);
        setDataOutlet(stableMockOutlet);
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchLiveDatabase();
    const intervalId = setInterval(() => {
      fetchLiveDatabase(true);
    }, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const filteredTransaksi = useMemo(() => {
    return dataTransaksi.filter(d => {
      return (filterT.bulan === 'Semua' || d.BULAN === filterT.bulan) &&
             (filterT.minggu === 'Semua' || d.MINGGU.toString() === filterT.minggu.toString()) &&
             (filterT.pic === 'Semua' || matchPICName(d['P.I.C. SALES'] || '', filterT.pic)) &&
             (filterT.kategori === 'Semua' || d['KATEGORI OUTLET'] === filterT.kategori) &&
             (filterT.negeri === 'Semua' || d.NEGERI === filterT.negeri);
    });
  }, [dataTransaksi, filterT]);

  const statsT = useMemo(() => {
    const jumlahJualan = filteredTransaksi.reduce((acc, curr) => acc + curr['INVOICE AMOUNT (RM)'], 0);
    const jumlahTempahan = filteredTransaksi.reduce((acc, curr) => acc + curr['PO AMOUNT (RM)'], 0);
    const pencapaian = (jumlahJualan / TARGET_SALES) * 100;
    const uniqueKoperasi = new Set(filteredTransaksi.map(d => d.KOPERASI)).size;
    
    let valueColorClass = 'text-emerald-600';
    if (pencapaian < 50) {
      valueColorClass = 'text-rose-600';
    } else if (pencapaian < 80) {
      valueColorClass = 'text-amber-500';
    }

    return { jumlahJualan, jumlahTempahan, pencapaian, uniqueKoperasi, valueColorClass };
  }, [filteredTransaksi, TARGET_SALES]);

  const chartTrendJualan = useMemo(() => {
    const grouped = filteredTransaksi.reduce((acc, curr) => {
      if (!acc[curr.BULAN]) acc[curr.BULAN] = 0;
      acc[curr.BULAN] += curr['INVOICE AMOUNT (RM)'];
      return acc;
    }, {});
    const order = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
    return order
      .filter(m => grouped[m] !== undefined && grouped[m] > 0)
      .map(m => ({ name: m, Jualan: grouped[m] }));
  }, [filteredTransaksi]);

  const chartTaburanKategori = useMemo(() => {
    const grouped = filteredTransaksi.reduce((acc, curr) => {
      if (!acc[curr['KATEGORI OUTLET']]) acc[curr['KATEGORI OUTLET']] = 0;
      acc[curr['KATEGORI OUTLET']] += curr['INVOICE AMOUNT (RM)'];
      return acc;
    }, {});
    return Object.keys(grouped).map(k => ({ name: k, value: grouped[k] }));
  }, [filteredTransaksi]);

  const tableSenaraiKoperasi = useMemo(() => {
    const grouped = filteredTransaksi.reduce((acc, curr) => {
      const kopName = (curr.KOPERASI || '').trim();
      const catOutlet = (curr['KATEGORI OUTLET'] || '').trim().toLowerCase();
      
      if (kopName.toLowerCase().includes('noncoop') || catOutlet === 'noncoop') {
        return acc;
      }

      const kopUpper = kopName.toUpperCase();
      if (!acc[kopUpper]) acc[kopUpper] = { name: kopUpper, tempahan: 0, jualan: 0 };
      acc[kopUpper].tempahan += curr['PO AMOUNT (RM)'];
      acc[kopUpper].jualan += curr['INVOICE AMOUNT (RM)'];
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.jualan - a.jualan).slice(0, 100); 
  }, [filteredTransaksi]);

  const filteredOutlet = useMemo(() => {
    return dataOutlet.filter(d => {
      return (filterO.tahun === 'Semua' || d['TAHUN DAFTAR'].toString() === filterO.tahun.toString()) &&
             (filterO.bulan === 'Semua' || d['BULAN DAFTAR'].toString() === filterO.bulan.toString()) &&
             (filterO.minggu === 'Semua' || d['MINGGU DAFTAR'].toString() === filterO.minggu.toString()) &&
             (filterO.jkan === 'Semua' || d.JKAN === filterO.jkan);
    });
  }, [dataOutlet, filterO]);

  const statsO = useMemo(() => {
    const totalDaftar = filteredOutlet.length;
    const totalAktif = filteredOutlet.filter(d => d.AKTIF).length;
    return { totalDaftar, totalAktif };
  }, [filteredOutlet]);

  const chartPendaftaran = useMemo(() => {
    const key = filterO.tahun === 'Semua' ? 'TAHUN DAFTAR' : 'BULAN DAFTAR';
    
    const grouped = filteredOutlet.reduce((acc, curr) => {
      const val = curr[key];
      if (val === 'Tiada' || val === undefined) return acc;
      if (!acc[val]) {
        acc[val] = { daftar: 0, aktif: 0 };
      }
      acc[val].daftar++;
      if (curr.AKTIF) {
        acc[val].aktif++;
      }
      return acc;
    }, {});

    const monthOrder = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];

    return Object.keys(grouped)
      .sort((a, b) => {
        if (filterO.tahun === 'Semua') return parseInt(a) - parseInt(b);
        return monthOrder.indexOf(a) - monthOrder.indexOf(b);
      })
      .map(k => ({ 
        name: k, 
        Daftar: grouped[k].daftar,
        Aktif: grouped[k].aktif
      }));
  }, [filteredOutlet, filterO.tahun]);

  const chartJkan = useMemo(() => {
    const grouped = filteredOutlet.reduce((acc, curr) => {
      const jkan = curr.JKAN || 'Tiada JKAN';
      if (!acc[jkan]) {
        acc[jkan] = { daftar: 0, aktif: 0 };
      }
      acc[jkan].daftar++;
      if (curr.AKTIF) {
        acc[jkan].aktif++;
      }
      return acc;
    }, {});

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map(k => ({ 
        name: k, 
        Daftar: grouped[k].daftar,
        Aktif: grouped[k].aktif
      }));
  }, [filteredOutlet]);

  const comboChartData = useMemo(() => {
    let sourceData = dataTransaksi;
    
    if (selectedPegawaiFilter !== 'Keseluruhan') {
      sourceData = dataTransaksi.filter(d => 
        matchPICName(d['P.I.C. SALES'] || '', selectedPegawaiFilter)
      );
    } else {
      sourceData = dataTransaksi.filter(d => 
        allowedPICs.includes((d['P.I.C. SALES'] || '').trim().toLowerCase())
      );
    }

    if (pegawaiTimeUnit === 'bulan') {
      const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
      return months.map(m => {
        const monthRows = sourceData.filter(d => d.BULAN === m);
        const totalPO = monthRows.reduce((sum, r) => sum + (r['PO AMOUNT (RM)'] || 0), 0);
        const totalInv = monthRows.reduce((sum, r) => sum + (r['INVOICE AMOUNT (RM)'] || 0), 0);
        return {
          name: m,
          Tempahan: totalPO,
          Jualan: totalInv
        };
      }).filter(item => item.Tempahan > 0 || item.Jualan > 0); 
    } else {
      const currentWeekNum = 29; 
      return Array.from({ length: currentWeekNum }, (_, i) => i + 1).map(w => {
        const weekRows = sourceData.filter(d => parseInt(d.MINGGU) === w);
        const totalPO = weekRows.reduce((sum, r) => sum + (r['PO AMOUNT (RM)'] || 0), 0);
        const totalInv = weekRows.reduce((sum, r) => sum + (r['INVOICE AMOUNT (RM)'] || 0), 0);
        return {
          name: getWeekLabel(w),
          Tempahan: totalPO,
          Jualan: totalInv
        };
      });
    }
  }, [dataTransaksi, selectedPegawaiFilter, pegawaiTimeUnit, allowedPICs]);

  const dynamic2WeeksRange = useMemo(() => {
    const dates = [];
    const baseToday = new Date(2026, 6, 15); // Semasa: 15 Julai 2026 (Index 6 adalah Julai)
    for (let i = 13; i >= 0; i--) {
      const d = new Date(baseToday);
      d.setDate(baseToday.getDate() - i);
      dates.push(d);
    }
    return dates;
  }, []);

  const tableDailyBookings = useMemo(() => {
    return allowedPICsList.map(pic => {
      const dailyCounts = {};
      
      dynamic2WeeksRange.forEach(date => {
        const isoStr = formatLocalYYYYMMDD(date);
        dailyCounts[isoStr] = 0;
      });

      const picTransactions = dataTransaksi.filter(d => 
        matchPICName(d['P.I.C. SALES'] || '', pic)
      );

      picTransactions.forEach(t => {
        if (t.TARIKH) {
          const tDate = t.TARIKH.trim(); 
          if (dailyCounts[tDate] !== undefined) {
            dailyCounts[tDate]++;
          }
        }
      });

      const totalBookings = Object.values(dailyCounts).reduce((a, b) => a + b, 0);

      return {
        name: pic,
        counts: dailyCounts,
        total: totalBookings
      };
    }).sort((a, b) => b.total - a.total);
  }, [dataTransaksi, allowedPICsList, dynamic2WeeksRange]);

  const tablePegawaiPerformance = useMemo(() => {
    return allowedPICsList.map(pic => {
      const rows = dataTransaksi.filter(d => 
        matchPICName(d['P.I.C. SALES'] || '', pic)
      );

      const totalPO = rows.reduce((sum, r) => sum + r['PO AMOUNT (RM)'], 0);
      const totalInvoice = rows.reduce((sum, r) => sum + r['INVOICE AMOUNT (RM)'], 0);
      const conversion = totalPO > 0 ? (totalInvoice / totalPO) * 100 : 0;
      const avgOrder = rows.length > 0 ? totalPO / rows.length : 0;

      return {
        name: pic,
        tempahan: totalPO,
        jualan: totalInvoice,
        conversion,
        avgOrder
      };
    }).sort((a, b) => b.jualan - a.jualan);
  }, [dataTransaksi, allowedPICsList]);

  const statsPegawai = useMemo(() => {
    const records = dataTransaksi.filter(d => allowedPICs.includes((d['P.I.C. SALES'] || '').trim().toLowerCase()));
    
    const totalJualanGroup = records.reduce((sum, r) => sum + r['INVOICE AMOUNT (RM)'], 0);
    const totalTempahanGroup = records.reduce((sum, r) => sum + r['PO AMOUNT (RM)'], 0);
    const avgConversionGroup = totalTempahanGroup > 0 ? (totalJualanGroup / totalTempahanGroup) * 100 : 0;

    let topSellerName = 'Tiada';
    let topSellerAmt = 0;

    tablePegawaiPerformance.forEach(p => {
      if (p.jualan > topSellerAmt) {
        topSellerAmt = p.jualan;
        topSellerName = p.name;
      }
    });

    return {
      totalJualanGroup,
      totalTempahanGroup,
      avgConversionGroup,
      topSellerName,
      topSellerAmt
    };
  }, [dataTransaksi, tablePegawaiPerformance, allowedPICs]);

  const getUniqueVals = (data, key) => ['Semua', ...new Set(data.map(d => d[key]))].sort();

  const sortedMonthsFilter = useMemo(() => {
    return ['Semua', 'Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-medium text-lg">Memuatkan Papan Pemuka KPNiaga...</p>
          <p className="text-slate-400 text-sm mt-1">Mengambil data masa nyata daripada Google Sheets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col animate-fade-in">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">KPNiaga<span className="text-blue-600 font-light">Analytics</span></h1>
            </div>

            {/* LIVE DATA SYNC STATUS CONTROL */}
            <div className="hidden md:flex items-center space-x-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 text-xs text-slate-500">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Penyelarasan Live Aktif</span>
              </div>
              {lastUpdated && (
                <span className="text-slate-400 border-l border-slate-200 pl-2">
                  Segar: {lastUpdated}
                </span>
              )}
              <button 
                onClick={() => fetchLiveDatabase(true)} 
                disabled={syncing}
                className="hover:text-blue-600 focus:outline-none disabled:opacity-50 flex items-center space-x-1"
                title="Sinc data sekarang"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ml-1 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
                <span>{syncing ? 'Segar...' : 'Semak'}</span>
              </button>
            </div>
            
            {/* TABS NAVIGATION */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('transaksi')}
                className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'transaksi' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Transaksi Jualan</span>
              </button>
              
              <button
                onClick={() => setActiveTab('pegawai')}
                className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'pegawai' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Award className="w-4 h-4" />
                <span className="hidden sm:inline">Prestasi Pegawai</span>
                <span className="sm:hidden">Pegawai</span>
              </button>

              <button
                onClick={() => setActiveTab('outlet')}
                className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'outlet' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Store className="w-4 h-4" />
                <span className="hidden sm:inline">Data Outlet</span>
                <span className="sm:hidden">Outlet</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* SYNC INDICATOR MOBILE */}
        <div className="md:hidden flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center space-x-2 text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Kemaskini: {lastUpdated || 'Baru Selesai'}</span>
          </div>
          <button 
            onClick={() => fetchLiveDatabase(true)} 
            disabled={syncing}
            className="text-blue-600 flex items-center space-x-1 font-semibold"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Kemas...' : 'Kemas Kini Sekarang'}</span>
          </button>
        </div>

        {/* --- TAB 1: TRANSAKSI --- */}
        {activeTab === 'transaksi' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* FILTER BAR */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
              <div className="flex items-center text-slate-500 mr-2">
                <Filter className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Penapis:</span>
              </div>
              <select className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" 
                      value={filterT.bulan} onChange={e => setFilterT({...filterT, bulan: e.target.value})}>
                {sortedMonthsFilter.map(v => <option key={v} value={v}>{v === 'Semua' ? 'Bulan (Semua)' : v}</option>)}
              </select>
              <select className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                      value={filterT.minggu} onChange={e => setFilterT({...filterT, minggu: e.target.value})}>
                <option value="Semua">Minggu (Semua)</option>
                {getUniqueVals(dataTransaksi, 'MINGGU').filter(v=>v!=='Semua').sort((a,b)=>a-b).map(v => <option key={v} value={v}>Minggu {v}</option>)}
              </select>
              <select className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                      value={filterT.pic} onChange={e => setFilterT({...filterT, pic: e.target.value})}>
                <option value="Semua">Pegawai Jualan (Semua)</option>
                {getUniqueVals(dataTransaksi, 'P.I.C. SALES').filter(v => v !== 'Semua' && allowedPICs.includes(v.trim().toLowerCase())).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                      value={filterT.kategori} onChange={e => setFilterT({...filterT, kategori: e.target.value})}>
                <option value="Semua">Kategori Outlet (Semua)</option>
                {getUniqueVals(dataTransaksi, 'KATEGORI OUTLET').filter(v=>v!=='Semua').map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                      value={filterT.negeri} onChange={e => setFilterT({...filterT, negeri: e.target.value})}>
                <option value="Semua">Negeri (Semua)</option>
                {getUniqueVals(dataTransaksi, 'NEGERI').filter(v=>v!=='Semua').map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* SCORECARDS (KPI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard title="Jumlah Jualan" value={formatRM(statsT.jumlahJualan)} icon={TrendingUp} colorClass="bg-blue-100 text-blue-600" subtitle={`Dari jumlah inbois`} />
              <KPICard title="Jumlah Tempahan Diterima" value={formatRM(statsT.jumlahTempahan)} icon={ShoppingCart} colorClass="bg-teal-100 text-teal-600" subtitle="Dari jumlah tempahan diterima" />
              <KPICard title="Pencapaian (%)" value={`${statsT.pencapaian.toFixed(1)}%`} icon={Target} colorClass="bg-amber-100 text-amber-600" valueColorClass={statsT.valueColorClass} subtitle={`Sasaran: ${formatRM(TARGET_SALES)}`} />
              <KPICard title="Jumlah Koperasi Tempahan" value={formatNum(statsT.uniqueKoperasi)} icon={Building2} colorClass="bg-purple-100 text-purple-600" subtitle="Koperasi berbeza (Unique)" />
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center"><Calendar className="w-5 h-5 mr-2 text-slate-400" /> Trend Jualan Mengikut Bulan (RM)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartTrendJualan} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis tickFormatter={(val) => `RM${(val/1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip formatter={(value) => formatRM(value)} cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="Jualan" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      <Line type="monotone" dataKey="Jualan" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, fill: '#fff', stroke: '#0ea5e9', strokeWidth: 2}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center"><Store className="w-5 h-5 mr-2 text-slate-400" /> Taburan Jualan Mengikut Kategori Outlet</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie 
                        data={chartTaburanKategori} 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={75} 
                        dataKey="value" 
                        label={renderCustomizedLabel}
                        labelLine={false}
                      >
                        {chartTaburanKategori.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatRM(value)} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center"><Award className="w-5 h-5 mr-2 text-slate-400" /> Senarai Prestasi Koperasi</h3>
              <div className="overflow-x-auto h-80 relative rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Nama Koperasi</th>
                      <th className="px-4 py-3 font-semibold text-right">Jumlah Tempahan</th>
                      <th className="px-4 py-3 font-semibold text-right">Jumlah Jualan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableSenaraiKoperasi.length > 0 ? tableSenaraiKoperasi.map((row, i) => (
                      <tr key={i} className="bg-white border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                        <td className="px-4 py-3 text-right text-teal-600 font-medium">{formatRM(row.tempahan)}</td>
                        <td className="px-4 py-3 text-right text-blue-600 font-medium">{formatRM(row.jualan)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-400">Tiada data dijumpai</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: PRESTASI PEGAWAI (TAB UTAMA DIPERBAIKI) --- */}
        {activeTab === 'pegawai' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* KPI CARDS KHAS KUMPULAN PEGAWAI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard 
                title="Pegawai Terbaik (Sales)" 
                value={statsPegawai.topSellerName.split(' ')[0] + ' ' + (statsPegawai.topSellerName.split(' ')[1] || '')} 
                icon={Award} 
                colorClass="bg-amber-100 text-amber-600" 
                subtitle={`Jumlah: ${formatRM(statsPegawai.topSellerAmt)}`} 
              />
              <KPICard 
                title="Jumlah Jualan Kumpulan" 
                value={formatRM(statsPegawai.totalJualanGroup)} 
                icon={TrendingUp} 
                colorClass="bg-blue-100 text-blue-600" 
                subtitle="Inbois 10 Pegawai" 
              />
              <KPICard 
                title="Jumlah Tempahan Kumpulan" 
                value={formatRM(statsPegawai.totalTempahanGroup)} 
                icon={ShoppingCart} 
                colorClass="bg-teal-100 text-teal-600" 
                subtitle="PO 10 Pegawai" 
              />
              <KPICard 
                title="Kadar Penukaran Kumpulan" 
                value={`${statsPegawai.avgConversionGroup.toFixed(1)}%`} 
                icon={Percent} 
                colorClass="bg-purple-100 text-purple-600" 
                subtitle="Nisbah Jualan / Tempahan" 
              />
            </div>

            {/* JADUAL BILANGAN TEMPAHAN DITERIMA HARIAN (KEBAL & TEPAT) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2 text-indigo-500" />
                  Bilangan Tempahan Diterima Harian (Tempoh 2 Minggu Terkini)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Menunjukkan bilangan pesanan pembelian (PO) diterima bagi setiap pegawai jualan sepanjang 14 hari lepas (2 Julai 2026 - 15 Julai 2026).
                </p>
              </div>
              
              <div className="overflow-x-auto relative rounded-lg border border-slate-100">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="text-[11px] text-slate-700 uppercase bg-slate-50 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-3 font-bold sticky left-0 bg-slate-50 z-20 border-r border-slate-100 min-w-[170px]">Nama Pegawai</th>
                      {dynamic2WeeksRange.map((date, idx) => {
                        const day = date.getDate();
                        const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
                        return (
                          <th key={idx} className="px-3 py-3 font-semibold text-center whitespace-nowrap">
                            {day} {months[date.getMonth()]}
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 font-bold text-center bg-slate-100/50 border-l border-slate-200">Total PO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableDailyBookings.map((row, i) => (
                      <tr key={i} className="bg-white border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-100 shadow-sm">
                          {row.name}
                        </td>
                        {dynamic2WeeksRange.map((date, dIdx) => {
                          const dateKey = formatLocalYYYYMMDD(date);
                          const count = row.counts[dateKey] || 0;
                          return (
                            <td key={dIdx} className="px-3 py-3 text-center">
                              {count > 0 ? (
                                <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-md border border-blue-100 w-7 h-7">
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-medium">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center font-bold text-indigo-600 bg-indigo-50/30 border-l border-slate-200">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CARTA COMBO GIGANTIK (ANALISIS TREND PEGAWAI JUALAN) */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center">
                    <BarChart2 className="w-5 h-5 mr-2 text-blue-600" />
                    Analisis Trend & Prestasi Pegawai Jualan bagi Tahun 2026
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Gandingan Combo: Bar (PO / Tempahan) & Line (Inbois / Jualan) untuk visualisasi perbandingan prestasi mampat.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-full sm:w-auto">
                    <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Pegawai:</span>
                    <select
                      value={selectedPegawaiFilter}
                      onChange={(e) => setSelectedPegawaiFilter(e.target.value)}
                      className="text-xs font-bold text-slate-800 border-none bg-transparent focus:ring-0 focus:outline-none cursor-pointer w-full"
                    >
                      <option value="Keseluruhan">Keseluruhan (10 Pegawai)</option>
                      {allowedPICsList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
                    <button
                      onClick={() => setPegawaiTimeUnit('bulan')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                        pegawaiTimeUnit === 'bulan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Bulanan
                    </button>
                    <button
                      onClick={() => setPegawaiTimeUnit('minggu')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                        pegawaiTimeUnit === 'minggu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Mingguan
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={comboChartData} margin={{ top: 10, right: 35, left: 15, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} 
                    />
                    <YAxis 
                      tickFormatter={(val) => `RM${(val/1000).toFixed(0)}k`} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 11}} 
                    />
                    <Tooltip formatter={(value) => formatRM(value)} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 600}} />
                    
                    <Bar 
                      dataKey="Tempahan" 
                      name="Jumlah Tempahan (PO)" 
                      fill="#10b981" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={50} 
                      fillOpacity={0.85} 
                    />
                    
                    <Line 
                      type="monotone"
                      dataKey="Jualan"
                      name="Jumlah Jualan (Inbois)"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#fff', stroke: '#2563eb', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PERFORMANCE LEADERBOARD & CONVERSION MATRIX */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-indigo-500" />
                Matriks Prestasi & Kecekapan Pegawai Jualan (10 Pegawai Rasmi)
              </h3>
              <div className="overflow-x-auto relative rounded-lg border border-slate-100">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Pegawai Jualan</th>
                      <th className="px-4 py-3 font-semibold text-right">Jumlah Tempahan (PO)</th>
                      <th className="px-4 py-3 font-semibold text-right">Jumlah Jualan (Inbois)</th>
                      <th className="px-4 py-3 font-semibold text-center">Nisbah Penukaran (%)</th>
                      <th className="px-4 py-3 font-semibold text-right">Purata Nilai Pesanan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablePegawaiPerformance.map((row, i) => (
                      <tr key={i} className="bg-white border-b hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 flex items-center space-x-2">
                          <span className="w-5 h-5 bg-slate-100 rounded-full text-xs font-bold text-slate-500 flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="cursor-pointer hover:text-blue-600 font-bold" onClick={() => setSelectedPegawaiFilter(row.name)}>
                            {row.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-teal-600 font-medium">{formatRM(row.tempahan)}</td>
                        <td className="px-4 py-3 text-right text-blue-600 font-medium">{formatRM(row.jualan)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            row.conversion > 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {row.conversion.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-medium">{formatRM(row.avgOrder)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 3: OUTLET --- */}
        {activeTab === 'outlet' && (
          <div className="space-y-6 animate-fade-in">
             {/* FILTER BAR */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
              <div className="flex items-center text-slate-500 mr-2">
                <Filter className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Penapis (Pendaftaran):</span>
              </div>
              <select className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 p-2 border" 
                      value={filterO.tahun} onChange={e => setFilterO({...filterO, tahun: e.target.value})}>
                <option value="Semua">Tahun (Semua)</option>
                {getUniqueVals(dataOutlet, 'TAHUN DAFTAR').filter(v=>v!=='Semua' && v!=='Tiada').sort().map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 p-2 border"
                      value={filterO.bulan} onChange={e => setFilterO({...filterO, bulan: e.target.value})}>
                {sortedMonthsFilter.map(v => <option key={v} value={v}>{v === 'Semua' ? 'Bulan (Semua)' : v}</option>)}
              </select>
              <select className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 p-2 border"
                      value={filterO.minggu} onChange={e => setFilterO({...filterO, minggu: e.target.value})}>
                <option value="Semua">Minggu (Semua)</option>
                {getUniqueVals(dataOutlet, 'MINGGU DAFTAR').filter(v=>v!=='Semua').sort((a,b)=>a-b).map(v => <option key={v} value={v}>Minggu {v}</option>)}
              </select>
              <select className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 p-2 border"
                      value={filterO.jkan} onChange={e => setFilterO({...filterO, jkan: e.target.value})}>
                <option value="Semua">JKAN (Semua)</option>
                {getUniqueVals(dataOutlet, 'JKAN').filter(v=>v!=='Semua').map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* SCORECARDS (KPI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wide">Koperasi Daftar Keseluruhan</p>
                  <h3 className="text-4xl font-extrabold text-slate-800">{formatNum(statsO.totalDaftar)}</h3>
                </div>
                <div className="p-4 rounded-full bg-slate-100 text-slate-600">
                  <UserPlusIcon className="w-10 h-10" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-sm p-6 flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium text-emerald-100 mb-2 uppercase tracking-wide">Koperasi Pembelian / Aktif</p>
                  <h3 className="text-4xl font-extrabold">{formatNum(statsO.totalAktif)}</h3>
                  <p className="text-sm text-emerald-50 font-medium mt-1">
                    {statsO.totalDaftar > 0 ? ((statsO.totalAktif / statsO.totalDaftar) * 100).toFixed(1) : 0}% Kadar Aktif
                  </p>
                </div>
                <div className="p-4 rounded-full bg-white bg-opacity-20 text-white">
                  <TrendingUp className="w-10 h-10" />
                </div>
              </div>
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
                <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-emerald-500" /> 
                  Trend Pendaftaran vs Keaktifan Koperasi {filterO.tahun !== 'Semua' ? `Tahun ${filterO.tahun}` : '(Mengikut Tahun)'}
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartPendaftaran} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                      <Bar dataKey="Daftar" fill="#2563eb" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#1e40af', fontSize: 10, fontWeight: 'bold' }} />
                      <Bar dataKey="Aktif" fill="#10b981" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#065f46', fontSize: 10, fontWeight: 'bold' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
                <h3 className="text-base font-semibold text-slate-800 mb-6 text-center">Nisbah Status Koperasi</h3>
                <div className="flex-grow flex flex-col justify-center items-center">
                  <div className="relative w-48 h-48 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Aktif', value: statsO.totalAktif },
                            { name: 'Tidak Aktif', value: statsO.totalDaftar - statsO.totalAktif }
                          ]}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270}
                          dataKey="value" stroke="none"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f1f5f9" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold text-slate-800">
                        {statsO.totalDaftar > 0 ? Math.round((statsO.totalAktif / statsO.totalDaftar) * 100) : 0}%
                      </span>
                      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Aktif</span>
                    </div>
                  </div>
                  <div className="flex space-x-6 text-sm font-medium">
                    <div className="flex items-center"><div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>Aktif ({statsO.totalAktif})</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-slate-200 rounded-full mr-2"></div>Tidak ({statsO.totalDaftar - statsO.totalAktif})</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 lg:col-span-3">
                <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center"><MapPin className="w-5 h-5 mr-2 text-rose-500" /> Perbandingan Pendaftaran vs Keaktifan Mengikut JKAN (Semua 16 JKAN)</h3>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartJkan} margin={{ top: 20, right: 10, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 500}} angle={-45} textAnchor="end" height={80} interval={0} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                      <Bar dataKey="Daftar" fill="#2563eb" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#1e40af', fontSize: 9, fontWeight: 'bold' }} />
                      <Bar dataKey="Aktif" fill="#10b981" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#065f46', fontSize: 9, fontWeight: 'bold' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-sm border-t border-slate-800 mt-auto">
        <p className="font-medium text-slate-300">© 2026 KPNiaga. Hak Cipta Terpelihara.</p>
        <p className="mt-1 opacity-75">oleh Seksyen Perdagangan & Peruncitan, KPNiaga</p>
      </footer>

    </div>
  );
}

const UserPlusIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);