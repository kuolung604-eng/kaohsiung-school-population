/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Table2,
  BarChart3,
  Film,
  Download,
  Volume2,
  VolumeX,
  Music,
  ShieldCheck,
} from 'lucide-react';
import {
  CHART_TYPES,
  COLOR_PALETTES,
  ChartTypeId,
  CohortFilter,
  CorridorZone,
  KAOHSIUNG_DISTRICTS,
  ScenarioKey,
  YearlyDistrictRecord,
  generateProjectionDataset,
  getInterpolatedYearRecords,
} from './data/kaohsiungEducationData';
import { ChartTypeThumbnail } from './components/ChartTypeIcons';
import { ChartStyleConfig, DynamicChartStage } from './components/DynamicChartStage';
import { DataSpreadsheetView } from './components/DataSpreadsheetView';
import { VideoAnalysisDrawer } from './components/VideoAnalysisDrawer';
import { DataCredibilityModal } from './components/DataCredibilityModal';
import { soundEngine } from './utils/soundEngine';

const DEFAULT_STYLE_CONFIG: ChartStyleConfig = {
  canvasTheme: 'dark',
  fontFamily: "'Plus Jakarta Sans', 'Noto Sans TC', sans-serif",
  headerTitle: '高雄市未來15年各行政區國中小就學人口動態推估 (2026–2041)',
  headerSubtitle: '依高市教育局在籍學生數、民政局0–14歲設籍世代與科技S廊帶移入模型校準',
  showTrendAnnotations: true,
  showXAxis: true,
  showYAxis: true,
  showGridlines: true,
  barRadius: 'rounded',
  topNCount: 12,
  selectedCorridor: 'ALL',
};

export default function App() {
  // Primary Workspace State
  const [activeTab, setActiveTab] = useState<'preview' | 'data'>('preview');
  const [chartType, setChartType] = useState<ChartTypeId>('bar_race');
  const [chartCategoryFilter, setChartCategoryFilter] = useState<
    'ALL' | 'RECOMMENDED' | '時間動態競賽' | '世代結構對比' | '空間與增減診斷'
  >('ALL');

  // Demographic Scenario & Cohort State
  const [scenario, setScenario] = useState<ScenarioKey>('baseline');
  const [cohortFilter, setCohortFilter] = useState<CohortFilter>('total');
  const [customRecords, setCustomRecords] = useState<YearlyDistrictRecord[] | null>(null);

  // Timeline Animation State (2026.0 to 2041.0 => stops at 2041.0 without looping)
  const [currentYearFloat, setCurrentYearFloat] = useState<number>(2026);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [hasFinished, setHasFinished] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Audio & Sonification State
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(true);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [audioVolume, setAudioVolume] = useState<number>(0.55);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);
  const [recentOvertakeDistrictId, setRecentOvertakeDistrictId] = useState<string | null>(null);

  // Refs for detecting year transitions & rank overtakes
  const prevIntegerYearRef = useRef<number>(2026);
  const prevRankListRef = useRef<string[]>([]);

  // Inspector & Style State
  const [paletteId, setPaletteId] = useState<string>(COLOR_PALETTES[0].id);
  const [styleConfig, setStyleConfig] = useState<ChartStyleConfig>(DEFAULT_STYLE_CONFIG);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    audio: true,
    trend: true,
    header: false,
    axes: false,
    districtFocus: true,
  });

  // Selected District for Deep-Dive Cohort Wave Inspection
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('nanzi');

  // Modals
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [isCredibilityModalOpen, setIsCredibilityModalOpen] = useState<boolean>(false);

  // Sync HTML dark class with styleConfig.canvasTheme
  useEffect(() => {
    const rootEl = document.documentElement;
    if (styleConfig.canvasTheme === 'dark') {
      rootEl.classList.add('dark');
    } else {
      rootEl.classList.remove('dark');
    }
  }, [styleConfig.canvasTheme]);

  // Immediately enable and start BGM on initial load, and subscribe to browser autoplay policy state
  useEffect(() => {
    const unsub = soundEngine.subscribeAutoplayStatus((blocked) => {
      setIsAutoplayBlocked(blocked);
    });
    soundEngine.setBgmEnabled(true);
    soundEngine.startBgm();
    return () => {
      unsub();
      soundEngine.stopBgm();
    };
  }, []);

  // Active Dataset (Scenario or User Edited)
  const allRecords = useMemo(() => {
    if (customRecords) return customRecords;
    return generateProjectionDataset(scenario);
  }, [scenario, customRecords]);

  // Interpolated Records for Current Playhead Year
  const interpolatedRecords = useMemo(() => {
    return getInterpolatedYearRecords(allRecords, currentYearFloat);
  }, [allRecords, currentYearFloat]);

  // Playback RequestAnimationFrame Loop: stops at 2041 without auto-looping
  // If browser autoplay is blocked on cold open, wait at 2026 until audio unlocks so music & animation start together
  useEffect(() => {
    if (!isPlaying || activeTab !== 'preview' || (bgmEnabled && isAutoplayBlocked)) return;

    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const dtSec = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentYearFloat((prev) => {
        const next = prev + dtSec * playbackSpeed * 1.15;
        if (next >= 2041) {
          // Stop at 2041 and do NOT auto-loop
          setIsPlaying(false);
          setHasFinished(true);
          soundEngine.playSimulationCompleteSound();
          return 2041;
        }
        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, playbackSpeed, activeTab, bgmEnabled, isAutoplayBlocked]);

  // Detect Integer Year Step & Rank Overtakes for Real-Time Data Sonification
  useEffect(() => {
    const currentIntYear = Math.round(currentYearFloat);
    if (currentIntYear !== prevIntegerYearRef.current) {
      prevIntegerYearRef.current = currentIntYear;
      if (isPlaying && currentIntYear < 2041) {
        const nanziRec = interpolatedRecords.find((r) => r.districtId === 'nanzi');
        soundEngine.playYearStepSound(currentIntYear, nanziRec?.cumChangeFrom2026Pct || 0);
      }
    }

    // Check if any district overtook another in rank
    const getVal = (r: YearlyDistrictRecord) =>
      cohortFilter === 'elementary'
        ? r.elementary
        : cohortFilter === 'junior_high'
        ? r.juniorHigh
        : r.total;

    const currentSortedIds = [...interpolatedRecords]
      .sort((a, b) => getVal(b) - getVal(a))
      .map((r) => r.districtId);

    const prevIds = prevRankListRef.current;
    if (prevIds.length === currentSortedIds.length) {
      for (let i = 0; i < currentSortedIds.length; i++) {
        const id = currentSortedIds[i];
        const prevIdx = prevIds.indexOf(id);
        if (prevIdx > i) {
          // District climbed up in rank!
          soundEngine.playRankOvertakeSound();
          setRecentOvertakeDistrictId(id);
          const timer = window.setTimeout(() => setRecentOvertakeDistrictId(null), 1600);
          prevRankListRef.current = currentSortedIds;
          return () => clearTimeout(timer);
        }
      }
    }
    prevRankListRef.current = currentSortedIds;
  }, [currentYearFloat, interpolatedRecords, cohortFilter, isPlaying]);

  const handleReplayFromStart = () => {
    soundEngine.playClickPluck(1.2);
    if (bgmEnabled) {
      soundEngine.startBgm();
    }
    prevIntegerYearRef.current = 2026;
    setHasFinished(false);
    setCurrentYearFloat(2026);
    setIsPlaying(true);
  };

  const handleTogglePlayPause = () => {
    soundEngine.playClickPluck(1.0);
    if (bgmEnabled) {
      soundEngine.startBgm();
    }
    if (currentYearFloat >= 2041) {
      // If already at the end (2041), clicking play restarts from 2026
      setHasFinished(false);
      setCurrentYearFloat(2026);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleToggleBgm = () => {
    const next = !bgmEnabled;
    setBgmEnabled(next);
    soundEngine.setBgmEnabled(next);
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    soundEngine.setSfxEnabled(next);
    if (next) soundEngine.playClickPluck(1.1);
  };

  const handleVolumeChange = (vol: number) => {
    setAudioVolume(vol);
    soundEngine.setVolume(vol);
    if (bgmEnabled) soundEngine.startBgm();
  };

  const activePalette = useMemo(
    () => COLOR_PALETTES.find((p) => p.id === paletteId) || COLOR_PALETTES[0],
    [paletteId]
  );

  const activeChartDef = useMemo(
    () => CHART_TYPES.find((c) => c.id === chartType) || CHART_TYPES[0],
    [chartType]
  );

  const filteredChartTypes = useMemo(() => {
    return CHART_TYPES.filter((c) => {
      if (chartCategoryFilter === 'ALL') return true;
      if (chartCategoryFilter === 'RECOMMENDED') return c.isRecommendedTop;
      return c.category === chartCategoryFilter;
    });
  }, [chartCategoryFilter]);

  const selectedDistrictMeta = useMemo(
    () =>
      KAOHSIUNG_DISTRICTS.find((d) => d.id === selectedDistrictId) || KAOHSIUNG_DISTRICTS[3],
    [selectedDistrictId]
  );

  const selectedDistrictSeries = useMemo(
    () => allRecords.filter((r) => r.districtId === selectedDistrictId),
    [allRecords, selectedDistrictId]
  );

  const handleUpdateCell = (
    year: number,
    districtId: string,
    field: 'elementary' | 'juniorHigh',
    value: number
  ) => {
    const base = customRecords ? [...customRecords] : generateProjectionDataset(scenario);
    const updated = base.map((r) => {
      if (r.year === year && r.districtId === districtId) {
        const nextElem = field === 'elementary' ? value : r.elementary;
        const nextJH = field === 'juniorHigh' ? value : r.juniorHigh;
        const nextTotal = nextElem + nextJH;
        const base2026 =
          base.find((b) => b.year === 2026 && b.districtId === districtId)?.total || nextTotal;
        const cumPct = Number((((nextTotal - base2026) / base2026) * 100).toFixed(1));
        return {
          ...r,
          elementary: nextElem,
          juniorHigh: nextJH,
          total: nextTotal,
          cumChangeFrom2026Pct: cumPct,
        };
      }
      return r;
    });
    setCustomRecords(updated);
    soundEngine.playClickPluck(1.15);
  };

  const handleDownloadCsv = () => {
    soundEngine.playClickPluck(1.25);
    const header =
      'Year,DistrictId,DistrictName,Corridor,Elementary_6_11,JuniorHigh_12_14,Total_Students,CumChangeFrom2026Pct,ClassroomStressIndex\n';
    const body = allRecords
      .map(
        (r) =>
          `${r.year},${r.districtId},${r.districtName},${r.corridor},${r.elementary},${r.juniorHigh},${r.total},${r.cumChangeFrom2026Pct},${r.classroomStressIndex}`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaohsiung_school_population_2026_2041_${scenario}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const elapsedSeconds = ((currentYearFloat - 2026) * 1.0).toFixed(1);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('preview');
          }}
          className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          高雄國中小就學人口動態圖表工作台
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`hover:text-emerald-500 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'preview' ? 'text-emerald-500 font-semibold underline underline-offset-4' : ''
            }`}
          >
            動態圖表預覽
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`hover:text-emerald-500 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'data' ? 'text-emerald-500 font-semibold underline underline-offset-4' : ''
            }`}
          >
            15年資料庫與CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('preview');
              setChartType('grouped_column');
              setCohortFilter('both_compare');
              soundEngine.playClickPluck(1.1);
            }}
            className="hover:text-emerald-500 transition-colors whitespace-nowrap shrink-0"
          >
            國小國中波峰對照
          </button>
          <button
            type="button"
            onClick={() => setIsCredibilityModalOpen(true)}
            className="hover:text-emerald-500 transition-colors whitespace-nowrap shrink-0"
          >
            官方資料查核
          </button>
          <button
            type="button"
            onClick={() => setIsVideoModalOpen(true)}
            className="hover:text-emerald-500 transition-colors whitespace-nowrap shrink-0"
          >
            影片適配報告
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            匯出15年預測CSV
          </button>
        </div>
      </header>

      {/* Main Filmora V15-Style Dynamic Chart Studio Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-57px)] overflow-hidden">
        {/* LEFT SIDEBAR (3 Cols): 14 Dynamic Chart Types & Smart Suitability Score */}
        <aside className="lg:col-span-3 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                動態圖表類型庫 (14種)
              </span>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500 hover:text-emerald-400 whitespace-nowrap shrink-0"
              >
                <Film className="w-3.5 h-3.5" />
                對照錄製影片
              </button>
            </div>

            {/* Category Segmented Filter */}
            <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              {(
                [
                  { id: 'ALL', label: '全部(14)' },
                  { id: 'RECOMMENDED', label: '最佳適配(4)' },
                  { id: '時間動態競賽', label: '時間競賽' },
                  { id: '世代結構對比', label: '國中小對比' },
                  { id: '空間與增減診斷', label: '增減診斷' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChartCategoryFilter(tab.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    chartCategoryFilter === tab.id
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable 14 Chart Type Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredChartTypes.map((item) => {
              const isSelected = chartType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setChartType(item.id);
                    setActiveTab('preview');
                    soundEngine.playClickPluck(1.08);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800 shrink-0">
                    <ChartTypeThumbnail type={item.id} active={isSelected} className="w-10 h-10" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.shortLabel}
                      </span>
                      <span
                        className={`text-[11px] font-mono tabular-nums shrink-0 ${
                          item.isRecommendedTop
                            ? 'text-emerald-500 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        適配 {item.suitabilityScore}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-snug">
                      {item.whySuitable}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER WORKSPACE (6 Cols): Top Preview/Data Switcher + Dynamic Stage + Timeline Scrubber */}
        <section className="lg:col-span-6 flex flex-col justify-between p-4 gap-3.5 bg-slate-100/70 dark:bg-slate-950 overflow-hidden">
          {/* Top Studio Control Bar matching 00:05 & 00:12 in video */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Preview vs Data Segmented Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'preview'
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                預覽
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('data')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'data'
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                資料
              </button>
            </div>

            {/* Cohort Segmented Control (國小 vs 國中) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              {(
                [
                  { id: 'total', label: '國中小總計' },
                  { id: 'elementary', label: '國小(6–11歲)' },
                  { id: 'junior_high', label: '國中(12–14歲)' },
                  { id: 'both_compare', label: '國小vs國中雙軌' },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCohortFilter(c.id);
                    soundEngine.playClickPluck(1.05);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    cohortFilter === c.id
                      ? 'bg-slate-800 text-emerald-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Scenario Dropdown */}
            <select
              value={scenario}
              onChange={(e) => {
                setScenario(e.target.value as ScenarioKey);
                setCustomRecords(null);
                soundEngine.playClickPluck(1.1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="baseline">情境：基準推估 (教育局+戶政世代)</option>
              <option value="tech_boom">情境：半導體S廊帶高移入</option>
              <option value="low_fertility">情境：極端少子化壓力測試</option>
            </select>
          </div>

          {/* Smart Suitability & Official Credibility Verification Banner */}
          <div className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800/90 bg-white/80 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                {activeChartDef.name}
              </span>
              <span className="text-slate-400 hidden sm:inline">·</span>
              <span className="text-slate-600 dark:text-slate-300 truncate">
                {activeChartDef.bestUseCase}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCredibilityModalOpen(true)}
                className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-400 font-medium underline underline-offset-2 whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                官方數據查核報告
              </button>
            </div>
          </div>

          {/* Center Viewport: Either Dynamic Chart Stage OR Data Spreadsheet View */}
          <div className="flex-1 min-h-[410px] relative">
            {activeTab === 'preview' && bgmEnabled && isAutoplayBlocked && (
              <div
                onClick={() => {
                  soundEngine.startBgm();
                  soundEngine.playClickPluck(1.1);
                  setIsPlaying(true);
                }}
                className="absolute inset-0 z-20 bg-slate-950/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center p-4 cursor-pointer"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.startBgm();
                    soundEngine.playClickPluck(1.1);
                    setIsPlaying(true);
                  }}
                  className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl flex items-center gap-2.5 transition-transform hover:scale-105"
                >
                  <Music className="w-4 h-4" />
                  點擊啟動輕快背景音樂與 2026–2041 動態圖表推演
                </button>
              </div>
            )}
            {activeTab === 'preview' ? (
              <DynamicChartStage
                chartType={chartType}
                interpolatedRecords={interpolatedRecords}
                allRecords={allRecords}
                currentYearFloat={currentYearFloat}
                cohortFilter={cohortFilter}
                palette={activePalette}
                styleConfig={styleConfig}
                selectedDistrictId={selectedDistrictId}
                onSelectDistrict={(id) => {
                  setSelectedDistrictId(id);
                  soundEngine.playClickPluck(1.18);
                }}
                hasFinished={hasFinished}
                onReplayFromStart={handleReplayFromStart}
                recentOvertakeDistrictId={recentOvertakeDistrictId}
              />
            ) : (
              <DataSpreadsheetView
                records={allRecords}
                cohortFilter={cohortFilter}
                onChangeCohortFilter={setCohortFilter}
                onUpdateCell={handleUpdateCell}
                onImportRecords={(newRecs) => setCustomRecords(newRecs)}
                onResetDefaultData={() => setCustomRecords(null)}
                onDownloadCsv={handleDownloadCsv}
                palette={activePalette}
              />
            )}
          </div>

          {/* Bottom Timeline Scrubber Bar with Play/Pause, Dedicated Replay Button & Audio Controls */}
          <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Left Playback & Replay Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setHasFinished(false);
                  setCurrentYearFloat((y) => Math.max(2026, Math.floor(y) - 1));
                  soundEngine.playClickPluck(0.9);
                }}
                title="退後一年"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlayPause}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    暫停
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {currentYearFloat >= 2041 ? '從頭播放' : '繼續播放'}
                  </>
                )}
              </button>

              {/* Dedicated Replay Button requested by User */}
              <button
                type="button"
                onClick={handleReplayFromStart}
                title="重新從 2026 年開始播放動態變化"
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  hasFinished
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                再次播放
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentYearFloat((y) => {
                    const next = Math.min(2041, Math.floor(y) + 1);
                    if (next >= 2041) setHasFinished(true);
                    return next;
                  });
                  soundEngine.playClickPluck(1.1);
                }}
                title="前進一年"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Year Scrubber */}
            <div className="flex-1 flex items-center gap-3 min-w-[160px]">
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                2026
              </span>
              <input
                type="range"
                min={2026}
                max={2041}
                step={0.05}
                value={currentYearFloat}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setIsPlaying(false);
                  setHasFinished(val >= 2041);
                  setCurrentYearFloat(val);
                }}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
              />
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                2041
              </span>
            </div>

            {/* Right Timecode, Audio Quick Toggle & Speed Readout */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleBgm}
                title={bgmEnabled ? '點擊關閉輕快背景音樂' : '點擊開啟輕快背景音樂'}
                className={`px-2.5 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
                  bgmEnabled
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400'
                    : 'border-slate-300 dark:border-slate-800 text-slate-400'
                }`}
              >
                <Music className="w-3 h-3" />
                {bgmEnabled ? '輕快配樂 開' : '配樂 關'}
              </button>

              <button
                type="button"
                onClick={handleToggleSfx}
                title={sfxEnabled ? '點擊關閉數據變化音效' : '點擊開啟數據變化音效'}
                className={`px-2.5 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
                  sfxEnabled
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300'
                    : 'border-slate-300 dark:border-slate-800 text-slate-400'
                }`}
              >
                {sfxEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                {sfxEnabled ? '數據音效 開' : '音效 關'}
              </button>

              <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                <span className="text-emerald-500 font-semibold">{elapsedSeconds}s</span> / 15.0s
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                {[0.5, 1, 2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      playbackSpeed === spd
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT INSPECTOR PANEL (3 Cols): Theme, Palette, Audio & Official District Verification */}
        <aside className="lg:col-span-3 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col justify-between overflow-y-auto p-4 gap-4">
          <div className="space-y-4">
            {/* Theme Switcher: 淺色 vs 深色 matching 00:16 in video */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-white">
                主題
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStyleConfig((s) => ({ ...s, canvasTheme: 'light' }))}
                  className={`py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    styleConfig.canvasTheme === 'light'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full border border-slate-400 bg-white" />
                  淺色
                </button>
                <button
                  type="button"
                  onClick={() => setStyleConfig((s) => ({ ...s, canvasTheme: 'dark' }))}
                  className={`py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    styleConfig.canvasTheme === 'dark'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full border border-slate-600 bg-slate-950" />
                  深色
                </button>
              </div>
            </div>

            {/* Color Palette Swatches matching 00:16 in video */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  調色盤
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activePalette.name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {COLOR_PALETTES.map((p) => {
                  const isActive = p.id === paletteId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPaletteId(p.id);
                        soundEngine.playClickPluck(1.12);
                      }}
                      title={p.name}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        isActive
                          ? 'scale-115 ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${p.colors[0]} 0%, ${p.colors[1]} 50%, ${p.colors[2]} 100%)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Accordion 0: 輕快背景音樂與數據變化音效 */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
              <button
                type="button"
                onClick={() => toggleAccordion('audio')}
                className="w-full py-1.5 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <span>背景音樂與數據變化音效</span>
                {openAccordions.audio ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {openAccordions.audio && (
                <div className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">輕快背景音樂 (Marimba Groove)</span>
                    <input
                      type="checkbox"
                      checked={bgmEnabled}
                      onChange={handleToggleBgm}
                      className="accent-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">年份推進與排名超車音效</span>
                    <input
                      type="checkbox"
                      checked={sfxEnabled}
                      onChange={handleToggleSfx}
                      className="accent-emerald-500"
                    />
                  </div>
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>音量大小</span>
                      <span className="font-mono">{Math.round(audioVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={audioVolume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Primary Font Selector matching "主要字型 Montserrat" at 00:16 */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-900 dark:text-white">
                主要字型
              </label>
              <select
                value={styleConfig.fontFamily}
                onChange={(e) =>
                  setStyleConfig((s) => ({ ...s, fontFamily: e.target.value }))
                }
                className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="'Plus Jakarta Sans', 'Noto Sans TC', sans-serif">
                  Plus Jakarta Sans + 思源黑體
                </option>
                <option value="'Noto Sans TC', sans-serif">
                  Noto Sans TC (市政簡報標準黑體)
                </option>
                <option value="'IBM Plex Mono', 'Noto Sans TC', monospace">
                  IBM Plex Mono (數據工程等寬體)
                </option>
              </select>
            </div>

            {/* Accordion 1: 趨勢焦點與生活圈篩選 */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
              <button
                type="button"
                onClick={() => toggleAccordion('trend')}
                className="w-full py-1.5 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <span>趨勢焦點與生活圈篩選</span>
                {openAccordions.trend ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {openAccordions.trend && (
                <div className="mt-2 space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      鎖定高雄四大就學生活圈
                    </label>
                    <select
                      value={styleConfig.selectedCorridor}
                      onChange={(e) =>
                        setStyleConfig((s) => ({
                          ...s,
                          selectedCorridor: e.target.value as CorridorZone | 'ALL',
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md"
                    >
                      <option value="ALL">全高雄市 (全部生活圈)</option>
                      <option value="北高雄科技S廊帶">北高雄科技S廊帶 (楠梓/橋頭/左營/仁武/岡山/路竹)</option>
                      <option value="原市中心核心文教區">原市中心核心文教區 (三民/鼓山/前鎮/小港)</option>
                      <option value="東高雄都會延伸區">東高雄都會延伸區 (鳳山/大寮/林園)</option>
                      <option value="東九區山城與偏鄉">東九區山城與偏鄉 (美濃等東九區)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">顯示較2026年增減率標籤</span>
                    <input
                      type="checkbox"
                      checked={styleConfig.showTrendAnnotations}
                      onChange={(e) =>
                        setStyleConfig((s) => ({
                          ...s,
                          showTrendAnnotations: e.target.checked,
                        }))
                      }
                      className="accent-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 4: 單一行政區 15年國小/國中波峰診斷 + 指標學校與官方查核 */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
              <button
                type="button"
                onClick={() => toggleAccordion('districtFocus')}
                className="w-full py-1.5 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <span>行政區查核：{selectedDistrictMeta.name}</span>
                {openAccordions.districtFocus ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {openAccordions.districtFocus && (
                <div className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <select
                      value={selectedDistrictId}
                      onChange={(e) => {
                        setSelectedDistrictId(e.target.value);
                        soundEngine.playClickPluck(1.15);
                      }}
                      className="w-full px-2 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                    >
                      {KAOHSIUNG_DISTRICTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.elementarySchoolCount}國小 / {d.juniorHighSchoolCount}國中)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-[11px] text-emerald-500 font-medium">
                    指標學區：{selectedDistrictMeta.keySchools}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selectedDistrictMeta.policyNote}
                  </p>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5">
                    統計校準：{selectedDistrictMeta.officialVerificationNote}
                  </div>

                  {/* 2026 -> 2033 -> 2041 Milestone Table for Selected District */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono tabular-nums">
                    {[2026, 2033, 2041].map((yr) => {
                      const rec = selectedDistrictSeries.find((r) => r.year === yr);
                      return (
                        <div
                          key={yr}
                          className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                        >
                          <div className="text-[10px] text-slate-400">{yr}年</div>
                          <div className="text-xs font-bold text-emerald-500 mt-0.5">
                            {rec ? rec.total.toLocaleString() : '-'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            小{rec ? (rec.elementary / 1000).toFixed(1) : '-'}k / 中
                            {rec ? (rec.juniorHigh / 1000).toFixed(1) : '-'}k
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Inspector Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStyleConfig(DEFAULT_STYLE_CONFIG);
                setPaletteId(COLOR_PALETTES[0].id);
                setScenario('baseline');
                setCohortFilter('total');
                setCustomRecords(null);
                handleReplayFromStart();
              }}
              className="flex-1 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重設並重播
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              匯出圖表資料
            </button>
          </div>
        </aside>
      </main>

      {/* Video & Suitability Analysis Modal */}
      <VideoAnalysisDrawer
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        activeChartType={chartType}
        onSelectChartType={(t) => setChartType(t)}
        onSwitchToTab={(tab) => setActiveTab(tab)}
      />

      {/* Official Data Credibility & Verification Modal */}
      <DataCredibilityModal
        isOpen={isCredibilityModalOpen}
        onClose={() => setIsCredibilityModalOpen(false)}
      />
    </div>
  );
}
