import React, { useState, useEffect, useMemo } from "react";
import {
  Heart,
  Activity,
  Thermometer,
  Scale,
  Droplets,
  Wind,
  Brain,
  Clock,
  AlertTriangle,
  ChevronRight,
  Search,
  Plus,
  User,
  Calendar,
  Shield,
  Settings,
  Menu,
  X,
  MapPin,
  Bell,
  LogOut,
  ChevronLeft,
  Filter,
  Stethoscope,
  Bed,
  Sofa,
  Refrigerator,
  DoorOpen,
  BellRing,
  ThermometerSun,
  Database,
  FileText,
  Pill,
  CheckCircle2,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  PhoneCall,
  CloudRain,
  MessageCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  Cell,
  CartesianGrid,
  ZAxis,
  BarChart,
  Bar,
} from "recharts";

// --- 전역 설정 및 헬퍼 함수 ---
const LOCATION_MAP = {
  1: "현관도어",
  2: "냉장고도어",
  3: "침실",
  4: "거실",
  5: "화장실",
};

const generateWave = (offset, amplitude, totalPoints) => {
  const points = [];
  for (let i = 0; i <= totalPoints; i++) {
    const x = (i / totalPoints) * 100;
    const y = 50 + Math.sin(i * 0.5 + offset) * amplitude;
    points.push({ x, y });
  }
  return points;
};

const fetchAdlRawData = (period) => {
  const count = period === "DAILY" ? 15 : period === "WEEKLY" ? 7 : 12;
  const data = [];
  // 기준 이동 기록 (Normal Pattern)
  const basePattern = [3, 3, 2, 2, 4, 4, 3, 3, 5, 4, 1, 1, 3, 3, 3];
  
  for (let i = 0; i < count; i++) {
    const baselineLoc = basePattern[i % basePattern.length];
    // 일부러 이상 징후 주입 (예: 화장실에 2시간 이상 머무는 상황 연출)
    let loc = baselineLoc;
    let duration = 30; // 기본 30분
    
    if (i === 8) { // 8번 인덱스에서 이상 발생: 화장실(5)에 120분 머물음
      loc = 5;
      duration = 120;
    }
    
    data.push({
      timestamp: `${(i + 8).toString().padStart(2, "0")}:00`,
      loc: loc,
      baselineLoc: baselineLoc,
      duration: duration,
      isAbnormal: duration > 60 && loc === 5, // 화장실 60분 초과 시 이상
      color: (duration > 60 && loc === 5) ? "#ef4444" : ["#a855f7", "#10b981", "#f59e0b", "#0ea5e9", "#4ADE80"][loc - 1],
    });
  }
  return data;
};

// --- 신규: 임상 및 센서 데이터 상세 히스토리 제너레이터 (D/W/M) ---
const fetchClinicalHistory = (type, period) => {
  const data = [];
  const count = period === "DAILY" ? 12 : period === "WEEKLY" ? 7 : 30;
  for (let i = 0; i < count; i++) {
    let label = "";
    let value = 0;
    let base = 60;
    let variance = 10;
    
    if (type.includes("심박수")) { base = 72; variance = 8; }
    else if (type.includes("호흡")) { base = 16; variance = 4; }
    else if (type.includes("산소")) { base = 97; variance = 2; }
    else if (type.includes("체온")) { base = 36.5; variance = 0.5; }
    else if (type.includes("혈압")) { base = 125; variance = 15; }
    else if (type.includes("취침")) { base = 7.5; variance = 2.0; }
    else if (type.includes("활동")) { base = 320; variance = 100; }

    const rand = Math.random();
    if (rand < 0.15) { // Critical
      if (type.includes("심박수")) value = 112 + Math.random() * 10;
      else if (type.includes("혈압")) value = 175 + Math.random() * 15;
      else value = base + variance * 2.3;
    } else if (rand < 0.35) { // Warning
      if (type.includes("심박수")) value = 92 + Math.random() * 8;
      else if (type.includes("혈압")) value = 152 + Math.random() * 10;
      else value = base + variance * 1.6;
    } else { // Normal
      value = base + (Math.random() * variance - variance / 2);
    }

    if (period === "DAILY") label = `${i * 2}시`;
    else if (period === "WEEKLY") label = ["월", "화", "수", "목", "금", "토", "일"][i % 7];
    else label = `${i + 1}일`;

    let finalValue = Math.round(value);
    if (type.includes("체온") || type.includes("취침")) finalValue = parseFloat(value.toFixed(1));

    let status = "Normal";
    if (type.includes("심박수")) {
      if (finalValue > 102) status = "Critical";
      else if (finalValue > 88) status = "Warning";
    } else if (type.includes("혈압")) {
      if (finalValue > 165) status = "Critical";
      else if (finalValue > 145) status = "Warning";
    } else {
      if (rand < 0.15) status = "Critical";
      else if (rand < 0.35) status = "Warning";
    }

    data.push({ label, value: Math.max(1, finalValue), status });
  }
  return data;
};

export default function App() {
  const [vitalPeriod, setVitalPeriod] = useState("DAILY");
  const [vitalHistoryData, setVitalHistoryData] = useState([]);
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [selectedVital, setSelectedVital] = useState(null);
  const [showMedModal, setShowMedModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [activeNav, setActiveNav] = useState(0);
  const [pulseOffset, setPulseOffset] = useState(0);
  const [adlPeriod, setAdlPeriod] = useState("DAILY"); // DAILY, WEEKLY, MONTHLY
  const [adlRawData, setAdlRawData] = useState([]);
  const [activeHeartRate, setActiveHeartRate] = useState(85);
  const [activeRespRate, setActiveRespRate] = useState(16);
  const [adlSyncSignal, setAdlSyncSignal] = useState(false);
  const [activeSensorId, setActiveSensorId] = useState(null);
  const [frailtyModalData, setFrailtyModalData] = useState(null);
  const [adlDetailData, setAdlDetailData] = useState(null);
  const [vitalLogs, setVitalLogs] = useState([
    { id: 10, date: "03.24", time: "11:23", type: "기립성 맥박(HR)", val: "128", status: "Critical" },
    { id: 4, date: "03.24", time: "11:05", type: "호흡수(RESP)", val: "24", status: "Warning" },
    { id: 2, date: "03.24", time: "09:45", type: "일간 체중(Weight)", val: "65.3kg (▼2.9kg)", status: "Warning" },
    { id: 5, date: "03.24", time: "04:30", type: "수면 심박수(HR)", val: "115", status: "Critical" },
  ]);

  useEffect(() => {
    const logTimer = setInterval(() => {
      setVitalLogs(prev => {
        const statuses = ["Critical", "Warning", "Normal"];
        return prev.map(log => {
          // 상태와 수치를 랜덤하게 변동하여 실시간 데이터 유입 연출
          const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
          let newVal = log.val;
          if (log.type.includes("맥박") || log.type.includes("심박수")) {
            newVal = newStatus === "Critical" ? Math.floor(Math.random() * 30 + 110).toString() : newStatus === "Warning" ? Math.floor(Math.random() * 20 + 90).toString() : Math.floor(Math.random() * 20 + 60).toString();
          } else if (log.type.includes("호흡")) {
            newVal = newStatus === "Critical" ? Math.floor(Math.random() * 10 + 25).toString() : newStatus === "Warning" ? Math.floor(Math.random() * 5 + 20).toString() : "16";
          } else if (log.type.includes("체중")) {
            const baseWeight = 68.2;
            if (newStatus === "Critical") {
              const drop = (Math.random() * 2 + 3).toFixed(1); // 3.0 ~ 5.0kg drop
              newVal = `${(baseWeight - drop).toFixed(1)}kg (▼${drop}kg)`;
            } else if (newStatus === "Warning") {
              const drop = (Math.random() * 1 + 1.5).toFixed(1); // 1.5 ~ 2.5kg drop
              newVal = `${(baseWeight - drop).toFixed(1)}kg (▼${drop}kg)`;
            } else {
              const diff = (Math.random() * 0.4 - 0.2).toFixed(1); // -0.2 ~ +0.2kg
              newVal = `${(baseWeight + parseFloat(diff)).toFixed(1)}kg (${diff > 0 ? '▲' : diff < 0 ? '▼' : ''}${Math.abs(diff)}kg)`;
            }
          }
          return { ...log, status: newStatus, val: newVal };
        });
      });
    }, 120000); // 120,000ms = 정확히 2분 간격 업데이트
    return () => clearInterval(logTimer);
  }, []);

  useEffect(() => {
    const sensorTimer = setInterval(() => {
      const randomId = Math.floor(Math.random() * 7) + 1;
      setActiveSensorId(randomId);
      setTimeout(() => setActiveSensorId(null), 3000);
    }, 10000);
    return () => clearInterval(sensorTimer);
  }, []);

  useEffect(() => {
    if (showVitalModal && selectedVital) {
      setVitalHistoryData(fetchClinicalHistory(selectedVital, vitalPeriod));
    }
  }, [showVitalModal, selectedVital, vitalPeriod]);

  const handleVitalClick = (log) => {
    setSelectedVital(log.type);
    setShowVitalModal(true);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseOffset((p) => p + 1);
      setActiveHeartRate(85 + Math.floor(Math.random() * 7) - 3);
      setActiveRespRate(16 + Math.floor(Math.random() * 4) - 2);
      setAdlSyncSignal((prev) => !prev);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const data = fetchAdlRawData(adlPeriod);
    let adlTimer = null;
    if (adlPeriod === "DAILY") {
      let currentData = [...data];
      setAdlRawData(currentData);
      adlTimer = setInterval(() => {
        const lastTime = currentData[currentData.length - 1].timestamp;
        const [hh, mm] = lastTime.split(":").map(Number);
        const nextH = (hh + 1) % 24;
        const nextM = Math.max(0, Math.min(59, mm + Math.floor(Math.random() * 21) - 10));
        const timeStr = `${nextH.toString().padStart(2, "0")}:${nextM.toString().padStart(2, "0")}`;
        const locs = [1, 2, 3, 4, 5];
        const colors = { 1: "#a855f7", 2: "#10b981", 3: "#f59e0b", 4: "#0ea5e9", 5: "#ef4444" };
        const newLoc = locs[Math.floor(Math.random() * locs.length)];
        const newEvent = {
          timestamp: timeStr,
          loc: newLoc,
          sensor: LOCATION_MAP[newLoc],
          type: "움직임 감지",
          color: colors[newLoc],
        };
        currentData = [...currentData, newEvent];
        if (currentData.length > 15) currentData.shift();
        setAdlRawData([...currentData]);
        setActiveSensorId(newLoc);
        
        // 데이터 인입 후 타이머로 LED 핑 잔상 이펙트 연출
        setTimeout(() => setActiveSensorId(null), 1500);
      }, 3500);
    } else {
      setAdlRawData(data);
    }
    return () => clearInterval(adlTimer);
  }, [adlPeriod]);

  const bcgHeartWave = generateWave(pulseOffset, 0.5, 40);
  const bcgRespWave = generateWave(pulseOffset * 0.3, 0.2, 20);

  const CustomAdlTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      if (!data) return null;
      return (
        <div className={`border p-3 rounded shadow-2xl text-[15px] z-[100] animate-in fade-in duration-200 ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
          <p className={`font-bold mb-1 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
            <Clock size={12} className={isDarkMode ? "text-slate-400" : "text-slate-500"} />
            {data.timestamp || "00:00"} - {LOCATION_MAP[data.loc]}
          </p>
          <div className="space-y-1 mb-2">
            <p className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
              현재 위치: <strong style={{ color: data.color }}>{LOCATION_MAP[data.loc]}</strong>
            </p>
            <p className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
              체류 시간: <strong className={data.isAbnormal ? "text-rose-500" : ""}>{data.duration}분</strong>
              {data.isAbnormal && <span className="ml-2 text-[13px] bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded animate-pulse font-bold">⚠️ 이상 감지</span>}
            </p>
          </div>
          <p className={`text-[13px] ${isDarkMode ? "text-slate-500" : "text-slate-400"} border-t pt-2`}>
            * 평소 패턴(Baseline) 대비 분석 중
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`flex flex-col lg:flex-row min-h-screen lg:h-screen w-full ${isDarkMode ? "bg-[#0a0f18] text-slate-300" : "bg-slate-50 text-slate-600"} font-sans overflow-x-hidden transition-colors duration-500`}>
      {/* ---------------- 사이드바 ---------------- */}
      <nav className={`w-full h-16 lg:w-20 lg:h-full ${isDarkMode ? "bg-[#0f1522] lg:border-slate-800" : "bg-slate-200 lg:border-slate-300"} border-b lg:border-b-0 lg:border-r flex flex-row lg:flex-col items-center justify-between lg:justify-start px-4 lg:px-0 lg:py-8 gap-4 lg:gap-10 shrink-0 transition-colors duration-500 z-10`}>
        <div className="hidden lg:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 items-center justify-center shadow-lg shadow-cyan-900/20 shrink-0">
          <Activity size={28} className="text-white" />
        </div>
        <div className="flex flex-row lg:flex-col gap-2 lg:gap-8 w-full lg:px-3 items-center justify-center pr-10 lg:pr-0">
          <NavIcon icon={<Activity size={22} />} active={activeNav === 0} onClick={() => setActiveNav(0)} isDarkMode={isDarkMode} />
          <NavIcon icon={<Database size={22} />} active={activeNav === 1} onClick={() => setActiveNav(1)} isDarkMode={isDarkMode} />
          <NavIcon icon={<DoorOpen size={22} />} active={activeNav === 2} onClick={() => setActiveNav(2)} isDarkMode={isDarkMode} />
          <NavIcon icon={<FileText size={22} />} active={activeNav === 3} onClick={() => setActiveNav(3)} isDarkMode={isDarkMode} />
          <NavIcon icon={<Stethoscope size={22} />} active={activeNav === 4} onClick={() => setActiveNav(4)} isDarkMode={isDarkMode} />
        </div>
      </nav>

      {/* ---------------- 메인 대시보드 ---------------- */}
      <main className={`flex-1 flex flex-col p-4 lg:p-6 gap-4 lg:gap-6 ${isDarkMode ? "bg-[#0a0f18]" : "bg-slate-50"} z-0 relative`}>
        {activeNav !== 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 h-full w-full opacity-80 animate-in fade-in zoom-in duration-500">
            <div className={`p-8 rounded-full mb-6 ${isDarkMode ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-400"}`}>
              <Stethoscope size={80} />
            </div>
            <h2 className={`text-[39px] font-bold mb-4 tracking-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>해당 메뉴는 개발 준비 중입니다.</h2>
            <button onClick={() => setActiveNav(0)} className="mt-10 px-8 py-3 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/30 flex items-center gap-2">
              <Activity size={20} /> 대시보드로 돌아가기
            </button>
          </div>
        ) : (
          <>
            <header className={`flex flex-col lg:flex-row justify-between lg:items-end ${isDarkMode ? "bg-[#151c2c] border-slate-700/50" : "bg-white border-slate-200"} rounded-2xl border p-4 lg:p-5 shadow-lg shrink-0 h-auto lg:h-[100px] gap-4 lg:gap-0 transition-colors duration-500`}>
              <div className="flex items-center gap-6 xl:gap-14">
                <div className="flex items-center gap-4 lg:gap-6">
                  <div className="relative shrink-0">
                    <img src="/assets/patient_72m.png" alt="Patient" className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-2 border-cyan-500/50" />
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[12px] whitespace-nowrap font-bold px-2 py-0.5 rounded-full border shadow-sm ${isDarkMode ? "bg-rose-500 text-white border-rose-600" : "bg-rose-50 text-rose-600 border-rose-200"}`}>Intensive Care</div>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-1">
                      <h1 className={`text-[23px] lg:text-[27px] font-bold ${isDarkMode ? "text-white" : "text-slate-900"} tracking-tight`}>서재정 <span className="text-[17px] font-normal text-slate-400">(M/72)</span></h1>
                      <span className={`px-1.5 py-0.5 text-[13px] lg:text-[15px] font-mono rounded border ${isDarkMode ? "bg-slate-800 text-cyan-400 border-slate-700" : "bg-transparent text-cyan-700 border-cyan-400 font-bold"}`}>MRN: 250710080</span>
                    </div>
                    <div className="text-[14px] lg:text-[17px] text-slate-400 font-medium flex flex-wrap lg:gap-3 gap-1">
                      <span>상태: <strong className="text-slate-300">만성질환자</strong></span>
                      <span className="hidden lg:inline">•</span>
                      <span>담당의사 : 김국한 (정신건강의학과)</span>
                    </div>
                  </div>
                </div>

                {/* === Moved Vitals (Horizontal) === */}
                <div className={`hidden xl:flex items-center gap-8 px-6 py-2.5 rounded-2xl self-center border ${isDarkMode ? "bg-[#0f1522] border-slate-800/80" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-4">
                    <Heart size={32} fill="currentColor" className="text-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                    <div className="flex flex-col">
                      <p className="text-cyan-400 font-bold text-[12px] uppercase tracking-wider mb-0.5">BCG Heart (심탄도)</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-[33px] font-black tracking-tighter tabular-nums leading-none ${isDarkMode ? "text-white" : "text-slate-800"}`}>{activeHeartRate}</span>
                        <span className={`text-[13px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>BPM</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`h-8 w-px ${isDarkMode ? "bg-slate-700" : "bg-slate-300"}`}></div>
                  
                  <div className="flex items-center gap-4">
                    <Wind size={30} className="text-purple-400 animate-[bounce_3s_infinite] drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                    <div className="flex flex-col">
                      <p className="text-purple-400 font-bold text-[12px] uppercase tracking-wider mb-0.5">BCG Resp (호흡동도)</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-[33px] font-black tracking-tighter tabular-nums leading-none ${isDarkMode ? "text-white" : "text-slate-800"}`}>{activeRespRate}</span>
                        <span className={`text-[13px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>RPM</span>
                      </div>
                    </div>
                  </div>

                  <div className={`h-8 w-px ${isDarkMode ? "bg-slate-700" : "bg-slate-300"}`}></div>
                  
                  <div className="flex items-center gap-4">
                    <Scale size={32} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                    <div className="flex flex-col">
                      <p className="text-emerald-400 font-bold text-[12px] uppercase tracking-wider mb-0.5">Daily Weight (체중)</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-[33px] font-black tracking-tighter tabular-nums leading-none ${isDarkMode ? "text-white" : "text-slate-800"}`}>68.2</span>
                        <span className={`text-[13px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>KG</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex justify-end lg:gap-6 text-[17px] font-mono items-center mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-700/50">
                <div className="text-right flex items-center gap-3 lg:gap-4 shrink-0">
                  <div>
                    <p className="text-slate-500 uppercase text-[12px] lg:text-[13px] tracking-widest mb-1">ADL Hub</p>
                    <p className="text-emerald-400 flex items-center justify-end gap-1.5 text-[13px] lg:text-[15px]"><span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-500 animate-pulse"></span> 7/7 ON</p>
                  </div>
                  <div className="h-6 lg:h-8 w-px bg-slate-700"></div>
                  <div>
                    <p className="text-slate-500 uppercase text-[12px] lg:text-[13px] tracking-widest mb-1">CareBell</p>
                    <p className="text-emerald-400 flex items-center justify-end gap-1.5 text-[13px] lg:text-[15px]"><span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-500 animate-pulse"></span> BCG ACTIVE</p>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 shrink-0">
              <section className="lg:col-span-3 flex flex-col gap-4">
                <div className={`${isDarkMode ? "bg-[#151c2c] border-slate-700/50" : "bg-white border-slate-200"} rounded-2xl border p-5 shadow-lg flex-1 flex flex-col gap-4 transition-colors duration-500 overflow-hidden min-h-0`}>
                  <div className="flex justify-between items-start shrink-0">
                    <div>
                      <h2 className="text-[14px] lg:text-[15px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><PhoneCall size={16} className="text-purple-400" /> AI CareCall Insight</h2>
                      <p className={`text-[12px] mt-0.5 ml-6 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>독거노인 심리·정서 모니터링</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border shrink-0 ${isDarkMode ? "bg-purple-950/30 text-purple-400 border-purple-800" : "bg-purple-50 text-purple-600 border-purple-200"}`}>Today</span>
                  </div>

                  <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto custom-scrollbar pr-1 pt-0.5">
                    {/* 상단: 정서 기상도 및 위험 지수 */}
                    <div className="flex gap-4 shrink-0 h-[100px] lg:h-[110px]">
                      <div className={`flex-[1.2] p-4 rounded-xl border flex flex-col justify-center items-center ${isDarkMode ? "bg-gradient-to-br from-indigo-900/40 to-[#0f1522] border-indigo-500/20" : "bg-gradient-to-br from-indigo-50 to-white border-indigo-200"}`}>
                         <CloudRain size={36} className="text-indigo-400 mb-2 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                         <p className={`text-[12px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-indigo-400/80" : "text-indigo-500/80"}`}>현재 정서 상태</p>
                         <p className={`text-[16px] xl:text-[18px] font-black tracking-tight ${isDarkMode ? "text-indigo-50" : "text-indigo-950"}`}>우울 & 고립</p>
                      </div>
                      
                      <div className={`flex-1 p-4 rounded-xl border flex flex-col justify-center items-center relative overflow-hidden ${isDarkMode ? "bg-[#0f1522] border-slate-800" : "bg-white border-slate-200"}`}>
                         <div className="flex items-center justify-center w-[58px] h-[58px] mb-1.5 relative">
                           <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                             <circle cx="29" cy="29" r="24" stroke="currentColor" strokeWidth="6" fill="transparent" className={`${isDarkMode ? "text-slate-800" : "text-slate-100"}`} />
                             <circle cx="29" cy="29" r="24" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="150.7" strokeDashoffset={150.7 * (1 - 0.74)} strokeLinecap="round" className="text-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]" />
                           </svg>
                           <span className={`text-[18px] font-black ${isDarkMode ? "text-white" : "text-slate-800"}`}>74</span>
                         </div>
                         <p className={`text-[12px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>고립 위험(%)</p>
                         <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full ${isDarkMode ? "bg-rose-500/5" : "bg-rose-500/10"}`}></div>
                      </div>
                    </div>

                    {/* 생활 모니터링 (신규 추가) */}
                    <div className={`p-4 rounded-xl border flex flex-col gap-3 shrink-0 ${isDarkMode ? "bg-[#0f1522] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex justify-between items-center mb-1">
                        <p className={`text-[13px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? "text-emerald-400/80" : "text-emerald-600"}`}><Activity size={14} /> 생활 안정성 (ADL 기반)</p>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-center bg-slate-500/5 p-2 rounded-lg">
                          <span className={`text-[14px] font-bold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>수면 패턴</span>
                          <span className={`text-[14px] font-bold flex items-center gap-1.5 ${isDarkMode ? "text-rose-400" : "text-rose-500"}`}>불규칙 (야간 각성 4회상승)</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-500/5 p-2 rounded-lg">
                          <span className={`text-[14px] font-bold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>식사 리듬</span>
                          <span className={`text-[14px] font-bold flex items-center gap-1.5 ${isDarkMode ? "text-amber-400" : "text-amber-500"}`}>주의 요망 (1일 1식 감지)</span>
                        </div>
                      </div>
                    </div>

                    {/* 중요 발화 키워드 추출 */}
                    <div className={`p-4 rounded-xl border flex flex-col gap-3 shrink-0 ${isDarkMode ? "bg-[#0f1522] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex justify-between items-center mb-1">
                        <p className={`text-[13px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isDarkMode ? "text-rose-400" : "text-rose-600"}`}><AlertTriangle size={14} /> 위험 발화 (NLP빈도)</p>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        <span className={`px-3 py-1.5 rounded-lg text-[13px] font-bold border flex items-center gap-1.5 ${isDarkMode ? "bg-rose-950/40 border-rose-900/80 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-600"}`}>잠이안와 <span className={isDarkMode?"text-rose-500":"text-rose-400"}>4</span></span>
                        <span className={`px-3 py-1.5 rounded-lg text-[13px] font-bold border flex items-center gap-1.5 ${isDarkMode ? "bg-amber-950/20 border-amber-900/50 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>입맛없음 <span className={isDarkMode?"text-amber-500":"text-amber-500/70"}>2</span></span>
                        <span className={`px-3 py-1.5 rounded-lg text-[13px] font-bold border ${isDarkMode ? "bg-slate-800/80 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500"}`}>외로워</span>
                      </div>
                    </div>

                    {/* AI 상담 총평 */}
                    <div className={`mt-auto p-4 lg:p-5 rounded-xl border flex flex-col gap-2.5 relative overflow-hidden shrink-0 ${isDarkMode ? "bg-[#0a0f18]/50 border-cyan-900/30" : "bg-cyan-50/30 border-cyan-100"}`}>
                      <div className={`absolute top-0 left-0 w-1 h-full ${isDarkMode ? "bg-cyan-500" : "bg-cyan-400"}`}></div>
                      <p className={`text-[14px] font-bold flex items-center gap-1.5 mb-1 ${isDarkMode ? "text-cyan-400/80" : "text-cyan-600"}`}><MessageCircle size={15} /> 마지막 상담 요약</p>
                      <p className={`text-[14px] leading-relaxed italic font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        "밤에 자주 깨서 피곤하다고 4회 호소. 며칠째 외출 징후 없으며, 전산상 화장실 센서의 심야 이벤트 증가(빈뇨 패턴)와 높은 상관관계가 관찰됩니다."
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="lg:col-span-9 flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
                <div className={`${isDarkMode ? "bg-[#151c2c] border-slate-700/50" : "bg-white border-slate-200"} rounded-2xl border p-5 shadow-lg flex flex-col gap-4 overflow-hidden h-full transition-colors duration-500`}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h2 className="text-[15px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileText size={16} className="text-amber-500" /> Vitals & Sensor Logs</h2>
                      <p className={`text-[12px] mt-0.5 ml-5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>센서 측정 팩트(원시 데이터) 기록장</p>
                    </div>
                    {/* 실시간 긴급 위험도 스캔 뱃지 */}
                    <div className={`px-2 py-0.5 rounded-lg flex items-center gap-1.5 border border-rose-500/30 bg-rose-500/10`}>
                      <div className="relative flex items-center justify-center w-2 h-2">
                        <span className="absolute w-2 h-2 bg-rose-500 rounded-full animate-ping opacity-75"></span>
                        <span className="relative w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                      </div>
                      <span className="text-[13px] font-bold text-rose-500">Auto Scan (Alert-First)</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-3 transition-all duration-500">
                    {[...vitalLogs]
                    .sort((a, b) => {
                      const score = { "Critical": 2, "Warning": 1, "Normal": 0 };
                      if (score[b.status] !== score[a.status]) return score[b.status] - score[a.status];
                      return b.time.localeCompare(a.time); // 동일 우선순위일 경우 시간순(최신)으로 정렬
                    })
                    .map((log) => (
                      <div key={log.id} onClick={() => handleVitalClick(log)} className={`group relative overflow-hidden ${isDarkMode ? "bg-[#0f1522] border-slate-700/30" : "bg-slate-50 border-slate-200"} hover:bg-slate-800/60 border p-3.5 rounded-xl cursor-pointer transition-all duration-500`}>
                        <div className={`absolute top-0 left-0 h-full w-1 ${log.status === 'Critical' ? 'bg-rose-500' : log.status === 'Warning' ? 'bg-amber-400' : 'bg-emerald-400'} transition-colors duration-500`}></div>
                        <div className="flex justify-between items-start mb-1 pl-1">
                          <span className="text-[15px] font-mono text-slate-500">{log.date} {log.time}</span>
                          <span className={`text-[14px] px-1.5 py-0.5 rounded-full font-bold border transition-colors duration-500 ${log.status === "Warning" ? "text-amber-400 bg-amber-950/30 border-transparent" : log.status === "Critical" ? "text-rose-500 bg-rose-950/30 border-rose-900/50" : "text-emerald-400 bg-emerald-950/30 border-transparent"}`}>
                            {log.status === "Critical" ? "🚨 위급" : log.status === "Warning" ? "⚠️ 주의" : "✅ 정상"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pl-1 mt-1">
                          <span className={`text-[17px] font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"} flex items-center gap-1.5`}>
                            {log.type.includes("호흡") ? <Wind size={14} className={log.status === "Critical" ? "text-rose-400" : log.status === "Warning" ? "text-amber-400" : "text-emerald-400"} /> : log.type.includes("체중") ? <Scale size={14} className={log.status === "Critical" ? "text-rose-400" : log.status === "Warning" ? "text-amber-400" : "text-emerald-400"} /> : <Activity size={14} className={log.status === "Critical" ? "text-rose-400" : log.status === "Warning" ? "text-amber-400" : "text-emerald-400"} />}
                            {log.type}
                          </span>
                          <span className={`text-[23px] font-black transition-colors duration-500 ${log.status === "Critical" ? "text-rose-400" : log.status === "Warning" ? "text-amber-400" : isDarkMode ? "text-white" : "text-slate-800"}`}>{log.val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${isDarkMode ? "bg-[#151c2c] border-slate-700/50 shadow-lg" : "bg-white border-slate-200 shadow-lg"} rounded-2xl border p-5 flex flex-col h-full overflow-hidden transition-colors duration-500`}>
                   <div className="mb-3">
                     <div className="flex items-center gap-2"><Brain size={18} className="text-rose-400" /><h2 className="text-[15px] font-bold text-slate-400 uppercase tracking-widest">AI Clinical Insights</h2></div>
                     <p className={`text-[12px] mt-0.5 ml-6 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>데이터 연관성 기반 AI 종합 소견서</p>
                   </div>
                   <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-2.5 mt-1">
                     {[
                        { id: 1, status: "Critical", label: "활동 동향", text: "거실 활동 20% 감소 포착.", corr: "최근 3일 냉장고 도어 감지 30% 감소와 강한 상관관계 (식사량 부진 의심)", icon: <AlertTriangle size={11} className="text-rose-400" /> },
                        { id: 2, status: "Warning", label: "수면 패턴", text: "야간 움직임 4회 점증, 호흡수 상승.", corr: "야간 심박수 변동폭이 평균 대비 15% 상승 (수면장애 및 무호흡증 가능성 징후)", icon: <Activity size={11} className="text-amber-400" /> },
                        { id: 3, status: "Normal", label: "투약 순응도", text: "정규 복약 100% 완료.", corr: null, icon: null }
                     ].map((item) => (
                       <div key={item.id} className={`p-3 rounded-xl border flex flex-col gap-1.5 ${isDarkMode ? "bg-[#0f1522] border-slate-700/50" : "bg-slate-50 border-slate-200"}`}>
                         <div className="flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'Critical' ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]' : item.status === 'Warning' ? 'bg-amber-500 shadow-[0_0_6px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_6px_#10b981]'}`}></span>
                           <strong className={`text-[14px] font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>[{item.label}]</strong>
                         </div>
                         <p className={`text-[15px] ml-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{item.text}</p>
                         
                         {item.corr && (
                           <div className="ml-4 group relative inline-block mt-0.5">
                             <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[13px] font-bold cursor-help border ${isDarkMode ? "bg-slate-800 text-cyan-400 border-slate-700 hover:bg-slate-700" : "bg-white text-cyan-600 border-slate-300 hover:bg-slate-100"} transition-colors`}>
                               {item.icon} 원인 데이터 연관 분석
                             </span>
                             <div className={`absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 p-3 rounded-xl border shadow-2xl z-[200] ${isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300"}`}>
                               <p className={`font-bold text-[13px] uppercase flex items-center justify-between border-b pb-1.5 mb-2 ${isDarkMode ? "text-cyan-400 border-slate-700" : "text-cyan-600 border-slate-200"}`}>
                                 Data Correlation <Activity size={12}/>
                               </p>
                               <p className={`text-[14px] leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{item.corr}</p>
                               <div className={`absolute -bottom-1.5 left-4 w-3 h-3 rotate-45 border-b border-r ${isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-slate-300"}`}></div>
                             </div>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                   <div className="flex flex-col gap-2 mt-4">
                     <button onClick={() => setShowVisitModal(true)} className={`w-full py-2 px-3 border rounded-lg text-[15px] flex justify-between items-center transition-all duration-300 ${isDarkMode ? "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200"}`}>
                       <span className="flex items-center gap-2 font-bold"><CalendarRange size={14} /> 보호자 내원 요청 전송</span><ChevronRight size={14} />
                     </button>
                     <button onClick={() => setShowMedModal(true)} className={`w-full py-2 px-3 border rounded-lg text-[15px] flex justify-between items-center transition-all duration-300 ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-700 border-slate-700 text-slate-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"}`}>
                       <span className="flex items-center gap-2 font-bold"><Pill size={14} className="text-cyan-400" /> 투약 기록 열람</span><ArrowRight size={14} />
                     </button>
                   </div>
                </div>

                <div className={`${isDarkMode ? "bg-[#151c2c] border-slate-700/50" : "bg-white border-slate-200"} rounded-2xl border p-5 shadow-lg flex flex-col h-full transition-colors duration-500 relative overflow-hidden`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none ${isDarkMode ? "bg-rose-500/10" : "bg-rose-500/5"}`}></div>
                  
                  <div className="mb-3 relative z-10">
                    <h2 className="text-[15px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Shield size={16} className="text-rose-500" /> AI Predictive Risk
                    </h2>
                    <p className={`text-[12px] mt-0.5 ml-6 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>다가올 급성 노쇠(Frailty) 예측 모델</p>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-4 relative z-10 mt-1">
                    {/* Gauge Section */}
                    <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-rose-900/30" : "bg-rose-50/50 border-rose-200"}`}>
                      <div className="text-center mb-1">
                        <p className={`text-[13px] font-bold tracking-widest uppercase ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Next 7-Days Frailty Risk</p>
                        <p className="text-[15px] text-rose-500 font-black mt-0.5">신체 기능 급성 저하 발생 위험도</p>
                      </div>
                      <div className="flex items-end gap-1 mt-1">
                        <span className={`text-[51px] font-black tracking-tighter ${isDarkMode ? "text-white" : "text-slate-800"}`}>72</span>
                        <span className="text-[23px] font-bold text-rose-500 mb-1.5">%</span>
                      </div>
                    </div>

                    {/* Breakdown Progress Bars */}
                    <div className="flex-1 flex flex-col justify-center gap-2 mt-2">
                      {[
                        { 
                          id: "gait", title: "보행 균형 및 이동 속도", val: <span className="text-rose-500 font-bold">-18%</span>, bgClass: "from-rose-500 to-orange-400", percent: 72, 
                          desc: "거실에서 주방 및 침실로 이동하는 보행 속도가 최근 1주간 지속적으로 감소했습니다. 보폭이 좁아지고 이동 밸런스가 무너지는 하체 근력(Sarcopenia) 저하가 강하게 의심됩니다.",
                          recom: "물리치료사 연계 하체 근력 강화 및 실내 보행 보조기구 사용 권장."
                        },
                        { 
                          id: "lifespace", title: "생활 반경(Life-Space) 위축도", val: <span className="text-amber-500 font-bold">주의 수준</span>, bgClass: "from-amber-500 to-yellow-400", percent: 60,
                          desc: "하루 중 침실 체류 비율이 85% 이상을 차지하며, 주방이나 현관 반응이 1주 대비 급감했습니다. 신체적 거동 불편 혹은 노년기 우울증(무기력증)으로 인한 '침실 고립화'가 의심됩니다.",
                          recom: "가족 면회 또는 주간 보호센터 방문 횟수 증가, 요양보호사의 적극적인 사회적 교류 유도 필요."
                        },
                        { 
                          id: "wander", title: "야간 화장실 빈도 및 배회 지수", val: <span className="text-emerald-500 font-bold">정상 유지</span>, bgClass: "from-emerald-500 to-teal-400", percent: 20,
                          desc: "야간(22:00~06:00) 화장실 이동 횟수가 평균 1회로 안정적인 수면을 유지 중입니다. 치매 전조 증상인 목적 없는 방황(Wandering) 동선 패턴은 나타나지 않았습니다.",
                          recom: "야간 보행 안전을 위해 현재의 화장실 동선 간접 조명(센서등) 유지 권고."
                        }
                      ].map((item) => (
                        <div 
                           key={item.id} 
                           onClick={() => setFrailtyModalData(item)}
                           className={`group cursor-pointer rounded-xl border p-3.5 transition-all duration-300 shadow-sm ${isDarkMode ? "bg-slate-800/20 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-500 hover:-translate-y-0.5" : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow hover:-translate-y-0.5"}`}
                        >
                          <div className="flex justify-between items-center text-[14px] mb-2 pr-1">
                            <span className={`${isDarkMode ? "text-slate-300 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900"} font-bold transition-colors`}>
                              {item.title}
                            </span>
                            {item.val}
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-slate-900/60" : "bg-slate-200"}`}>
                            <div className={`h-full bg-linear-to-r ${item.bgClass}`} style={{ width: `${item.percent}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <section className={`${isDarkMode ? "bg-[#151c2c] border-slate-700/50" : "bg-white border-slate-200"} rounded-2xl border p-4 md:p-7 shadow-lg h-auto flex flex-col relative transition-colors duration-500`}>
              <div className="flex flex-col md:flex-row justify-between mb-4 md:mb-6 gap-3 shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className={`text-[17px] lg:text-[19px] font-bold ${isDarkMode ? "text-white" : "text-slate-900"} tracking-widest flex items-center gap-2`}><DoorOpen size={18} className="text-amber-400" /> ADL 궤적분석 (Trajectory)</h2>
                  <div className="hidden lg:flex items-center gap-3 text-[13px] font-bold text-slate-500 ml-2">
                    <span className="flex items-center gap-1"><div className="w-4 h-0 border-t-2 border-dashed border-slate-500"></div> 기준선(평균)</span>
                    <span className="flex items-center gap-1"><div className="w-4 h-0 border-t border-slate-400"></div> 실제순간동선</span>
                  </div>
                </div>
                <div className={`flex ${isDarkMode ? "bg-[#0f1522] border-slate-800" : "bg-slate-100"} rounded-lg p-1`}>
                  <FilterTab active={adlPeriod === "DAILY"} onClick={() => setAdlPeriod("DAILY")} label="일간" isDarkMode={isDarkMode} />
                  <FilterTab active={adlPeriod === "WEEKLY"} onClick={() => setAdlPeriod("WEEKLY")} label="주간" isDarkMode={isDarkMode} />
                  <FilterTab active={adlPeriod === "MONTHLY"} onClick={() => setAdlPeriod("MONTHLY")} label="월간" isDarkMode={isDarkMode} />
                </div>
              </div>
              <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0">
                {/* 센서 노드 상태 맵 (좌측 30%) */}
                <div className="lg:col-span-3 flex flex-col gap-3 h-full">
                  {[
                    { id: 1, name: "현관도어", icon: <DoorOpen size={17} />, color: "#a855f7" },
                    { id: 2, name: "냉장고도어", icon: <Refrigerator size={17} />, color: "#10b981" },
                    { id: 3, name: "침실 센서", icon: <Bed size={17} />, color: "#f59e0b" },
                    { id: 4, name: "거실 센서", icon: <Sofa size={17} />, color: "#0ea5e9" },
                    { id: 5, name: "화장실 센서", icon: <Droplets size={17} />, color: "#ef4444" },
                    { id: 6, name: "온습도 센서", icon: <ThermometerSun size={17} />, sub: "22°C/45%", color: null },
                    { id: 7, name: "긴급벨", icon: <BellRing size={17} />, color: null },
                  ].map((s) => (
                    <div key={s.id} className={`${isDarkMode ? "bg-[#0f1522] border-slate-800/50" : "bg-slate-50 border-slate-200"} p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-300 ${activeSensorId === s.id && isDarkMode ? "bg-slate-800/90 shadow-lg" : activeSensorId === s.id ? "bg-white shadow-md border-slate-300" : ""}`} style={{ borderColor: activeSensorId === s.id ? s.color : undefined }}>
                      <div className="flex items-center gap-3">
                        <div className="transition-colors duration-300" style={{ color: activeSensorId === s.id && s.color ? s.color : isDarkMode ? "#64748b" : "#94a3b8" }}>{s.icon}</div>
                        <div>
                          <p className={`text-[17px] font-bold transition-colors duration-300 ${activeSensorId === s.id ? (isDarkMode ? "text-white" : "text-slate-900") : (isDarkMode ? "text-slate-300" : "text-slate-700")} truncate w-32`}>{s.name}</p>
                          {s.sub && <p className="text-[15px] text-cyan-500 font-mono italic">{s.sub}</p>}
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full transition-all duration-300`} 
                           style={{ 
                             backgroundColor: activeSensorId === s.id && s.color ? s.color : isDarkMode ? "#1e293b" : "#cbd5e1",
                             boxShadow: activeSensorId === s.id && s.color ? `0 0 16px ${s.color}` : "none",
                             transform: activeSensorId === s.id && s.color ? "scale(1.3)" : "scale(1)"
                           }}>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ADL 연동 데이터 라인 그래프 (우측 70%) */}
                <div className="lg:col-span-9 h-full min-h-[400px]">
                  <style>{`
                    .recharts-wrapper *:focus, .recharts-surface:focus, .recharts-scatter-symbol:focus, path:focus, circle:focus {
                      outline: none !important;
                    }
                  `}</style>
                  <ResponsiveContainer width="100%" height="100%" className="focus:outline-none" style={{ outline: "none" }}>
                    <ComposedChart data={adlRawData} className="focus:outline-none" style={{ outline: "none", userSelect: "none" }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1e293b" : "#e2e8f0"} />
                      <XAxis dataKey="timestamp" stroke="#64748b" fontSize={15} tickLine={false} axisLine={false} />
                      <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickFormatter={(val) => LOCATION_MAP[val]} stroke="#64748b" fontSize={15} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomAdlTooltip />} isAnimationActive={false} cursor={{ fill: 'transparent', strokeWidth: 0 }} />
                      
                      {/* 의학적 기준선 (Past 2 Weeks Baseline) */}
                      <Line type="stepAfter" dataKey="baselineLoc" stroke={isDarkMode ? "#475569" : "#cbd5e1"} strokeWidth={3} strokeOpacity={0.2} dot={false} strokeDasharray="4 4" name="Baseline" activeDot={false} isAnimationActive={false} />
                      
                      {/* 실제 동선 선 (Ghost Line - 직선 처리) */}
                      <Line type="linear" dataKey="loc" stroke={isDarkMode ? "#334155" : "#e2e8f0"} strokeWidth={1} dot={false} activeDot={false} isAnimationActive={false} />
                      
                      {/* 히트맵형 이상 감지 Scatter */}
                      <Scatter dataKey="loc" activeShape={false} isAnimationActive={false}>
                        {adlRawData.map((entry, index) => {
                          const nextEntry = adlRawData[index + 1] || null;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              opacity={entry.isAbnormal ? 1 : 0.8}
                              r={entry.isAbnormal ? 12 : 7}
                              className={`transition-opacity duration-200 hover:opacity-100 cursor-pointer outline-none focus:outline-none ${entry.isAbnormal ? "animate-pulse" : ""}`}
                              style={{ 
                                outline: "none",
                                stroke: entry.color,
                                strokeWidth: 0, 
                                cursor: "pointer"
                              }}
                              onMouseEnter={(e) => { e.target.style.strokeWidth = "4px"; e.target.style.strokeOpacity = "0.4"; }}
                              onMouseLeave={(e) => { e.target.style.strokeWidth = "0px"; e.target.style.strokeOpacity = "1"; }}
                              onClick={() => setAdlDetailData({ current: entry, next: nextEntry })}
                            />
                          );
                        })}
                      </Scatter>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* -------------------- MODALS -------------------- */}
      {showVitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 ${isDarkMode ? "bg-[#151c2c] border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50"}`}>
              <div><h3 className={`text-[23px] font-bold mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{selectedVital} 정밀 분석</h3><p className="text-[15px] text-slate-500">CareBell AI 무자각 센서 데이터</p></div>
              <div className="flex items-center gap-4">
                <div className={`flex p-1 rounded-lg ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                  {["DAILY", "WEEKLY", "MONTHLY"].map((p) => (
                    <button key={p} onClick={() => setVitalPeriod(p)} className={`px-3 py-1 text-[13px] font-bold rounded-md transition-all ${vitalPeriod === p ? "bg-cyan-500 text-white shadow-md" : "text-slate-500"}`}>{p === "DAILY" ? "일간" : p === "WEEKLY" ? "주간" : "월간"}</button>
                  ))}
                </div>
                <button onClick={() => setShowVitalModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"><X size={24} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
              <div className={`h-[220px] w-full rounded-2xl border p-4 ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                <ResponsiveContainer width="100%" height="100%" key={vitalPeriod}>
                  <BarChart data={vitalHistoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'rgba(34, 211, 238, 0.05)'}} contentStyle={{ backgroundColor: isDarkMode ? "#0f172a" : "#fff", border: "none", borderRadius: "12px", fontSize: "11px" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {vitalHistoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.status === "Critical" ? "#ef4444" : entry.status === "Warning" ? "#f59e0b" : "#22d3ee"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <h4 className="text-[13px] font-bold uppercase tracking-widest text-slate-500">상세 분석 로그 (위험도 자동 분류)</h4>
                {vitalHistoryData.slice().reverse().map((d, i) => (
                  <div key={i} className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? "bg-[#1a2234] border-slate-800/50" : "bg-white border-slate-100"}`}>
                    <span className="text-[15px] font-bold text-slate-400 w-12">{d.label}</span>
                    <span className={`text-[17px] font-black flex-1 text-center ${d.status === "Critical" ? "text-rose-500" : d.status === "Warning" ? "text-amber-500" : "text-cyan-400"}`}>{selectedVital}: {d.value}</span>
                    <span className={`text-[13px] font-bold px-2 py-0.5 rounded-full border ${d.status === "Critical" ? "border-rose-900 bg-rose-950/20 text-rose-500" : d.status === "Warning" ? "border-amber-900 bg-amber-950/20 text-amber-500" : "border-emerald-900 bg-emerald-950/20 text-emerald-500"}`}>{d.status === "Critical" ? "매우위험" : d.status === "Warning" ? "경고" : "정상"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end"><button onClick={() => setShowVitalModal(false)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-2 rounded-xl font-bold">확인</button></div>
          </div>
        </div>
      )}

      {/* 내원 요청 알림 모달 */}
      {showVisitModal && (
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl p-6 ${isDarkMode ? "bg-[#151c2c] border border-slate-700/50" : "bg-white border border-slate-200"} animate-in zoom-in-95 duration-200`}>
            <div className="flex justify-between items-center mb-5">
              <h2 className={`text-[19px] font-bold flex items-center gap-2 tracking-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                <CalendarRange className="text-amber-500" /> 보호자 내원 요청
              </h2>
              <button onClick={() => setShowVisitModal(false)} className={`p-1.5 rounded-full transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
                <X size={18} />
              </button>
            </div>
            
            <p className={`text-[15px] tracking-tight leading-relaxed mb-5 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              환자 및 보호자(보호자용 App 설치자)에게 병원 방문 요청 안내 스케줄이 푸시 알림으로 발송됩니다.
            </p>
            
            <div className="mb-6">
              <label className={`block text-[14px] font-bold mb-1.5 ml-1 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>방문 예약 일자 선택</label>
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isDarkMode ? "bg-[#0f1522] border-slate-700 focus-within:border-amber-500/50" : "bg-slate-50 border-slate-200 focus-within:border-amber-400"}`}>
                <Calendar size={18} className="text-amber-500 shrink-0" />
                <input 
                  type="date" 
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className={`w-full bg-transparent text-[17px] font-bold focus:outline-none ${isDarkMode ? "text-white" : "text-slate-800"}`}
                  style={{ colorScheme: isDarkMode ? "dark" : "light" }}
                />
              </div>
            </div>
            
            <button 
              onClick={() => {
                if (!visitDate) return;
                alert(`성공적으로 처리되었습니다!\n환자와 보호자 앱으로 [${visitDate}] 내원 예약 안내 푸시 알림이 발송 완료되었습니다.`);
                setShowVisitModal(false);
                setVisitDate("");
              }} 
              disabled={!visitDate}
              className={`w-full py-3 rounded-xl font-bold text-[17px] tracking-tight flex items-center justify-center gap-2 transition-all duration-300 ${visitDate ? "bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_16px_rgba(245,158,11,0.4)]" : isDarkMode ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
            >
              <Bell size={16} /> 보호자 방문 알림(Push) 발송
            </button>
          </div>
        </div>
      )}

      {showMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`${isDarkMode ? "bg-[#0f1522] border-slate-700" : "bg-white border-slate-200"} border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}><h3 className="text-[21px] font-bold flex items-center gap-2"><Pill /> 투약 처방 기록</h3><button onClick={() => setShowMedModal(false)}><X size={20} /></button></div>
            <div className="p-6 overflow-y-auto space-y-4">
              {[ {date: "2026-03-20", clinic: "심혈관센터", name: "아모디핀"}, {date: "2026-02-15", clinic: "연세내과", name: "글리아티린"} ].map((record, i) => (
                <div key={i} className={`p-4 rounded-xl border ${isDarkMode ? "bg-[#151c2c] border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                  <p className="font-bold">{record.clinic} <span className="text-[15px] text-slate-500">{record.date}</span></p>
                  <p className="text-cyan-500 font-bold mt-1">{record.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADL Sensor Detail Modal */}
      {adlDetailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className={`relative w-full max-w-sm rounded-[24px] shadow-2xl p-6 ${isDarkMode ? "bg-[#151c2c] border border-slate-700" : "bg-white border border-slate-200"} animate-in zoom-in-95 duration-200`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-[19px] font-bold flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                <Activity className="text-cyan-500" /> 센서 구간별 모니터링 분석
              </h2>
              <button onClick={() => setAdlDetailData(null)} className={`p-1.5 rounded-full transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
                <X size={18} />
              </button>
            </div>

            <div className={`p-4 rounded-xl border mb-5 relative ${isDarkMode ? "bg-[#0f1522] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              {/* Current Node */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center mt-1">
                  <div className={`w-3.5 h-3.5 rounded-full ring-4 ${isDarkMode ? "ring-[#151c2c]" : "ring-white"}`} style={{ backgroundColor: adlDetailData.current.color }}></div>
                  <div className={`w-0.5 h-[70px] ${isDarkMode ? "bg-slate-700" : "bg-slate-300"} my-1`}></div>
                </div>
                <div className="flex-1">
                  <p className={`text-[16px] font-bold flex items-center gap-2 mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {adlDetailData.current.sensor} 감지 시작
                    <span className={`text-[13px] px-1.5 py-[2px] rounded font-mono font-medium ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white border text-slate-500"}`}>
                      {adlDetailData.current.timestamp}
                    </span>
                  </p>
                  <p className={`text-[14px] leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {adlDetailData.current.sensor === "화장실" ? "물내림 혹은 세면대 사용 추정. 낙상 주의 구역 체류 중."
                    : adlDetailData.current.sensor === "냉장고" ? "주방에서 식사 준비 또는 식음료(물/약) 섭취 행동 탐지됨."
                    : adlDetailData.current.sensor === "침실" ? "침대 주변 동선 탐지. 수면, 기상, 휴식 등 정적 활동 시간."
                    : adlDetailData.current.sensor === "거실" ? "소파, TV 주변 활동. 실내 주요 여가 시간 혹은 보호자 통화 확률 농후."
                    : "현관 주변 동선 감지. 도어 오픈 여부에 따라 외출/귀가 판단."}
                  </p>
                </div>
              </div>

              {/* Next Node */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3.5 h-3.5 rounded-full ring-4 ${isDarkMode ? "ring-[#151c2c]" : "ring-white"}`} style={{ backgroundColor: adlDetailData.next ? adlDetailData.next.color : "#94a3b8" }}></div>
                </div>
                <div className="flex-1 -mt-1">
                  <p className={`text-[16px] font-bold flex items-center gap-2 mb-1 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                    {adlDetailData.next ? `${adlDetailData.next.sensor} 이동 식별` : "다음 이동 대기 중..."}
                    {adlDetailData.next && 
                      <span className={`text-[13px] px-1.5 py-[2px] rounded font-mono font-medium ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white border text-slate-500"}`}>
                        {adlDetailData.next.timestamp}
                      </span>
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Duration Result Box */}
            <div className={`flex items-center justify-between p-4 rounded-xl border border-dashed ${isDarkMode ? "bg-cyan-950/20 border-cyan-800/40 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"}`}>
              <span className="text-[15px] font-bold flex items-center gap-1.5"><Clock size={15}/> 해당 구역 추정 체류 기간</span>
              <span className="text-[18px] font-black font-mono tracking-tight">
                {adlDetailData.next ? (() => {
                  const [cH, cM] = adlDetailData.current.timestamp.split(":").map(Number);
                  const [nH, nM] = adlDetailData.next.timestamp.split(":").map(Number);
                  let diffM = ((nH * 60) + nM) - ((cH * 60) + cM);
                  if (diffM < 0) diffM += 24 * 60;
                  return diffM > 60 ? `${Math.floor(diffM/60)}hr ${diffM%60}m` : `${diffM} min`;
                })() : "측정 중..."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Image Full-Screen Modal */}
      {frailtyModalData && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${isDarkMode ? "bg-[#0f1522] border-slate-700" : "bg-white border-slate-200"} border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col`}>
            {/* Header */}
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50"}`}>
              <div className="flex items-center gap-2">
                <Shield className="text-rose-500" size={18} />
                <h3 className={`font-bold text-[17px] ${isDarkMode ? "text-white" : "text-slate-800"}`}>AI Predictive Analytics Details</h3>
              </div>
              <button onClick={() => setFrailtyModalData(null)} className={`p-1.5 rounded-full transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-800"}`}>
                <X size={16} />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 flex flex-col gap-6">
              <div>
                <h4 className={`text-[21px] font-black mb-2 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                  <Activity size={20} className={frailtyModalData.id === 'gait' ? 'text-rose-400' : frailtyModalData.id === 'lifespace' ? 'text-amber-400' : 'text-emerald-400'} />
                  {frailtyModalData.title}
                </h4>
                <div className={`text-[17px] py-2 px-3 rounded-lg border inline-flex items-center gap-3 ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-[14px] font-bold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>현재 상태(Status):</span> {frailtyModalData.val}
                </div>
              </div>

              <div>
                <h5 className={`text-[15px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}><Activity size={14} /> AI Analysis Log</h5>
                <div className={`p-4 rounded-xl leading-relaxed text-[16px] ${isDarkMode ? "bg-cyan-950/20 text-slate-300 border border-cyan-900/30" : "bg-cyan-50 text-slate-700 border border-cyan-100"}`}>
                  {frailtyModalData.desc}
                </div>
              </div>

              <div>
                <h5 className={`text-[15px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}><Brain size={14} /> Clinical Recommendation</h5>
                <div className={`p-4 rounded-xl leading-relaxed text-[16px] font-bold ${isDarkMode ? "bg-amber-950/20 text-amber-200 border border-amber-900/30" : "bg-amber-50 text-amber-900 border border-amber-200"}`}>
                  {frailtyModalData.recom}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex justify-end ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50"}`}>
              <button onClick={() => setFrailtyModalData(null)} className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[17px] transition-colors cursor-pointer">
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTab({ active, onClick, label, isDarkMode }) {
  return (
    <button onClick={onClick} className={`px-4 py-1.5 rounded-md text-[15px] font-bold transition-all ${active ? (isDarkMode ? "bg-cyan-900/40 text-cyan-400 border border-cyan-800" : "bg-white text-cyan-600 border border-cyan-200 shadow-sm") : (isDarkMode ? "text-slate-500" : "text-slate-400")}`}>{label}</button>
  );
}

function NavIcon({ icon, active, onClick, isDarkMode }) {
  return (
    <div onClick={onClick} className={`shrink-0 cursor-pointer transition-all p-3 rounded-2xl flex justify-center items-center w-12 h-12 mx-auto ${active ? (isDarkMode ? "text-white bg-slate-800 border border-slate-700" : "text-cyan-600 bg-white border border-slate-300 shadow-md scale-110") : (isDarkMode ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-600")}`}>{icon}</div>
  );
}
