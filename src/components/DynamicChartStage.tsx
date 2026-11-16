import React, { useMemo } from 'react';
import { RotateCcw, CheckCircle2, Volume2 } from 'lucide-react';
import {
  ChartTypeId,
  CohortFilter,
  ColorPalette,
  CorridorZone,
  KAOHSIUNG_DISTRICTS,
  YEARS,
  YearlyDistrictRecord,
} from '../data/kaohsiungEducationData';

export interface ChartStyleConfig {
  canvasTheme: 'dark' | 'light';
  fontFamily: string;
  headerTitle: string;
  headerSubtitle: string;
  showTrendAnnotations: boolean;
  showXAxis: boolean;
  showYAxis: boolean;
  showGridlines: boolean;
  barRadius: 'sharp' | 'rounded' | 'pill';
  topNCount: number;
  selectedCorridor: CorridorZone | 'ALL';
}

interface DynamicChartStageProps {
  chartType: ChartTypeId;
  interpolatedRecords: YearlyDistrictRecord[];
  allRecords: YearlyDistrictRecord[];
  currentYearFloat: number;
  cohortFilter: CohortFilter;
  palette: ColorPalette;
  styleConfig: ChartStyleConfig;
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string) => void;
  hasFinished: boolean;
  onReplayFromStart: () => void;
  recentOvertakeDistrictId: string | null;
}

const CORRIDOR_LIST: CorridorZone[] = [
  '北高雄科技S廊帶',
  '原市中心核心文教區',
  '東高雄都會延伸區',
  '東九區山城與偏鄉',
];

export const DynamicChartStage: React.FC<DynamicChartStageProps> = ({
  chartType,
  interpolatedRecords,
  allRecords,
  currentYearFloat,
  cohortFilter,
  palette,
  styleConfig,
  selectedDistrictId,
  onSelectDistrict,
  hasFinished,
  onReplayFromStart,
  recentOvertakeDistrictId,
}) => {
  const displayYear = Math.round(currentYearFloat);

  const filteredRecords = useMemo(() => {
    const base =
      styleConfig.selectedCorridor === 'ALL'
        ? interpolatedRecords
        : interpolatedRecords.filter((r) => r.corridor === styleConfig.selectedCorridor);
    return base;
  }, [interpolatedRecords, styleConfig.selectedCorridor]);

  const getMetricValue = (r: YearlyDistrictRecord): number => {
    if (cohortFilter === 'elementary') return r.elementary;
    if (cohortFilter === 'junior_high') return r.juniorHigh;
    return r.total;
  };

  const getMetricLabel = (): string => {
    if (cohortFilter === 'elementary') return '國小就學人數 (6–11歲·6個年級)';
    if (cohortFilter === 'junior_high') return '國中就學人數 (12–14歲·3個年級)';
    if (cohortFilter === 'both_compare') return '國小 vs 國中雙軌就學人數';
    return '國中小總就學人數 (6–14歲·9個年級)';
  };

  const sortedRecords = useMemo(() => {
    return [...filteredRecords]
      .sort((a, b) => getMetricValue(b) - getMetricValue(a))
      .slice(0, styleConfig.topNCount);
  }, [filteredRecords, cohortFilter, styleConfig.topNCount]);

  // Rank in 2026 for comparison
  const rank2026Map = useMemo(() => {
    const recs2026 = allRecords
      .filter(
        (r) =>
          r.year === 2026 &&
          (styleConfig.selectedCorridor === 'ALL' || r.corridor === styleConfig.selectedCorridor)
      )
      .sort((a, b) => getMetricValue(b) - getMetricValue(a));
    const map = new Map<string, number>();
    recs2026.forEach((r, idx) => map.set(r.districtId, idx + 1));
    return map;
  }, [allRecords, styleConfig.selectedCorridor, cohortFilter]);

  const districtColorMap = useMemo(() => {
    const map = new Map<string, string>();
    KAOHSIUNG_DISTRICTS.forEach((d, idx) => {
      map.set(d.id, palette.colors[idx % palette.colors.length]);
    });
    return map;
  }, [palette]);

  const citySummary = useMemo(() => {
    const totalElem = filteredRecords.reduce((acc, r) => acc + r.elementary, 0);
    const totalJH = filteredRecords.reduce((acc, r) => acc + r.juniorHigh, 0);
    const totalAll = totalElem + totalJH;

    const records2026 = allRecords.filter(
      (r) =>
        r.year === 2026 &&
        (styleConfig.selectedCorridor === 'ALL' || r.corridor === styleConfig.selectedCorridor)
    );
    const base2026All = records2026.reduce((acc, r) => acc + r.total, 0);
    const deltaPct =
      base2026All > 0 ? (((totalAll - base2026All) / base2026All) * 100).toFixed(1) : '0.0';

    return {
      totalElem,
      totalJH,
      totalAll,
      deltaPct: Number(deltaPct),
    };
  }, [filteredRecords, allRecords, styleConfig.selectedCorridor]);

  const isDark = styleConfig.canvasTheme === 'dark';
  const radiusClass =
    styleConfig.barRadius === 'pill'
      ? 'rounded-r-full'
      : styleConfig.barRadius === 'rounded'
      ? 'rounded-r-md'
      : 'rounded-none';

  // Helper to render specific chart body
  const renderChartVisual = () => {
    switch (chartType) {
      case 'bar_race': {
        const maxVal = Math.max(...sortedRecords.map((r) => getMetricValue(r)), 1000);
        return (
          <div className="flex flex-col justify-between h-full gap-1.5 py-1">
            {sortedRecords.map((rec, rankIdx) => {
              const val = getMetricValue(rec);
              const widthPct = Math.max(6, (val / maxVal) * 100);
              const color = districtColorMap.get(rec.districtId) || palette.colors[0];
              const isSelected = selectedDistrictId === rec.districtId;
              const isOvertaking = recentOvertakeDistrictId === rec.districtId;
              const currentRank = rankIdx + 1;
              const baseRank = rank2026Map.get(rec.districtId) || currentRank;
              const rankDelta = baseRank - currentRank; // positive means climbed up in rank

              return (
                <button
                  key={rec.districtId}
                  type="button"
                  onClick={() => onSelectDistrict(rec.districtId)}
                  className={`group flex items-center gap-3 w-full text-left py-1 px-2 rounded-md transition-colors ${
                    isOvertaking
                      ? 'bg-emerald-500/20 ring-1 ring-emerald-400'
                      : isSelected
                      ? isDark
                        ? 'bg-slate-800/90 ring-1 ring-emerald-400/60'
                        : 'bg-slate-200/80 ring-1 ring-emerald-600/60'
                      : isDark
                      ? 'hover:bg-slate-800/40'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-6 text-xs font-mono tabular-nums text-right shrink-0 ${
                      rankIdx < 3
                        ? 'font-semibold text-emerald-400'
                        : isDark
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {String(currentRank).padStart(2, '0')}
                  </span>

                  <div className="w-32 flex items-center justify-between gap-1 shrink-0">
                    <span
                      className={`text-xs font-medium truncate ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {rec.districtName}
                    </span>
                    {rankDelta !== 0 && (
                      <span
                        className={`text-[10px] font-mono tabular-nums shrink-0 ${
                          rankDelta > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'
                        }`}
                        title={`較2026年排名${rankDelta > 0 ? `上升 ${rankDelta} 名` : `下降 ${Math.abs(rankDelta)} 名`}`}
                      >
                        {rankDelta > 0 ? `▲${rankDelta}` : `▼${Math.abs(rankDelta)}`}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex items-center gap-2.5 min-w-0 pr-16 relative">
                    {cohortFilter === 'both_compare' ? (
                      <div
                        className={`h-5 flex overflow-hidden ${radiusClass} transition-all duration-150`}
                        style={{ width: `${widthPct}%` }}
                      >
                        <div
                          style={{
                            width: `${(rec.elementary / Math.max(1, rec.total)) * 100}%`,
                            backgroundColor: palette.elementaryColor,
                          }}
                          title={`國小: ${rec.elementary.toLocaleString()}人`}
                        />
                        <div
                          style={{
                            width: `${(rec.juniorHigh / Math.max(1, rec.total)) * 100}%`,
                            backgroundColor: palette.juniorHighColor,
                          }}
                          title={`國中: ${rec.juniorHigh.toLocaleString()}人`}
                        />
                      </div>
                    ) : (
                      <div
                        className={`h-5 ${radiusClass} transition-all duration-150`}
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: color,
                        }}
                      />
                    )}

                    <span
                      className={`text-xs font-mono tabular-nums font-semibold whitespace-nowrap shrink-0 ${
                        isDark ? 'text-slate-100' : 'text-slate-900'
                      }`}
                    >
                      {val.toLocaleString()} 人
                    </span>

                    {styleConfig.showTrendAnnotations && (
                      <span
                        className={`text-[11px] font-mono tabular-nums whitespace-nowrap shrink-0 ${
                          rec.cumChangeFrom2026Pct > 0
                            ? 'text-emerald-400'
                            : rec.cumChangeFrom2026Pct < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {rec.cumChangeFrom2026Pct > 0 ? '+' : ''}
                        {rec.cumChangeFrom2026Pct}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      }

      case 'line_race': {
        const topDistricts = sortedRecords.slice(0, 7);
        const svgWidth = 760;
        const svgHeight = 320;
        const padLeft = 54;
        const padRight = 105;
        const padTop = 20;
        const padBottom = 34;
        const plotW = svgWidth - padLeft - padRight;
        const plotH = svgHeight - padTop - padBottom;

        const relevantDistrictIds = new Set(topDistricts.map((d) => d.districtId));
        const seriesByDistrict = new Map<string, YearlyDistrictRecord[]>();
        let maxY = 1000;

        for (const r of allRecords) {
          if (!relevantDistrictIds.has(r.districtId)) continue;
          const v = getMetricValue(r);
          if (v > maxY) maxY = v;
          const arr = seriesByDistrict.get(r.districtId) || [];
          arr.push(r);
          seriesByDistrict.set(r.districtId, arr);
        }
        maxY = Math.ceil(maxY / 2000) * 2000;

        const xForYear = (yr: number) => padLeft + ((yr - 2026) / 15) * plotW;
        const yForVal = (v: number) => padTop + plotH - (v / maxY) * plotH;

        return (
          <div className="w-full h-full flex flex-col justify-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
              {styleConfig.showGridlines &&
                [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = padTop + plotH * (1 - ratio);
                  const labelVal = Math.round(maxY * ratio);
                  return (
                    <g key={ratio}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke={isDark ? '#1E293B' : '#E2E8F0'}
                        strokeDasharray="3 3"
                      />
                      {styleConfig.showYAxis && (
                        <text
                          x={padLeft - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="text-[10px] font-mono fill-slate-400"
                        >
                          {labelVal.toLocaleString()}
                        </text>
                      )}
                    </g>
                  );
                })}

              {styleConfig.showXAxis &&
                YEARS.filter((y) => y % 2 === 0 || y === 2041).map((yr) => {
                  const x = xForYear(yr);
                  return (
                    <text
                      key={yr}
                      x={x}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      className={`text-[10px] font-mono ${
                        yr === displayYear ? 'fill-emerald-400 font-bold' : 'fill-slate-400'
                      }`}
                    >
                      {yr}
                    </text>
                  );
                })}

              <line
                x1={xForYear(currentYearFloat)}
                y1={padTop}
                x2={xForYear(currentYearFloat)}
                y2={padTop + plotH}
                stroke="#10B981"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {topDistricts.map((distRec) => {
                const pts = seriesByDistrict.get(distRec.districtId) || [];
                const color = districtColorMap.get(distRec.districtId) || '#10B981';
                const fullPath = pts
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForYear(p.year)} ${yForVal(getMetricValue(p))}`)
                  .join(' ');

                const activePts = pts.filter((p) => p.year <= Math.ceil(currentYearFloat));
                const activePath = activePts
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForYear(p.year)} ${yForVal(getMetricValue(p))}`)
                  .join(' ');

                const currX = xForYear(currentYearFloat);
                const currY = yForVal(getMetricValue(distRec));

                return (
                  <g
                    key={distRec.districtId}
                    className="cursor-pointer"
                    onClick={() => onSelectDistrict(distRec.districtId)}
                  >
                    <path d={fullPath} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.22" />
                    <path d={activePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
                    <circle cx={currX} cy={currY} r="4.5" fill={color} />
                    <text
                      x={currX + 8}
                      y={currY + 4}
                      className="text-[11px] font-medium"
                      fill={color}
                    >
                      {distRec.districtName} ({getMetricValue(distRec).toLocaleString()})
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      }

      case 'donut_race': {
        const topSlices = sortedRecords.slice(0, 7);
        const totalSliceSum = topSlices.reduce((acc, r) => acc + getMetricValue(r), 0) || 1;
        const radius = 96;
        const circumference = 2 * Math.PI * radius;
        let accumulatedAngle = 0;

        return (
          <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 items-center gap-4">
            <div className="lg:col-span-7 flex items-center justify-center relative">
              <svg viewBox="0 0 280 280" className="w-64 h-64">
                {topSlices.map((rec) => {
                  const val = getMetricValue(rec);
                  const fraction = val / totalSliceSum;
                  const strokeDash = `${Math.max(1, fraction * circumference - 3)} ${circumference}`;
                  const strokeOffset = -accumulatedAngle * circumference;
                  accumulatedAngle += fraction;
                  const color = districtColorMap.get(rec.districtId) || palette.colors[0];

                  return (
                    <circle
                      key={rec.districtId}
                      cx="140"
                      cy="140"
                      r={radius}
                      fill="none"
                      stroke={color}
                      strokeWidth="28"
                      strokeDasharray={strokeDash}
                      strokeDashoffset={strokeOffset}
                      transform="rotate(-90 140 140)"
                      className="cursor-pointer transition-all duration-150 hover:opacity-90"
                      onClick={() => onSelectDistrict(rec.districtId)}
                    />
                  );
                })}
                <text
                  x="140"
                  y="132"
                  textAnchor="middle"
                  className={`text-2xl font-mono font-bold ${isDark ? 'fill-white' : 'fill-slate-900'}`}
                >
                  {displayYear}年
                </text>
                <text
                  x="140"
                  y="154"
                  textAnchor="middle"
                  className="text-[11px] font-mono fill-slate-400"
                >
                  前7區 {totalSliceSum.toLocaleString()} 人
                </text>
              </svg>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-2 pr-2">
              {topSlices.map((rec) => {
                const val = getMetricValue(rec);
                const pct = ((val / totalSliceSum) * 100).toFixed(1);
                const color = districtColorMap.get(rec.districtId) || palette.colors[0];
                return (
                  <button
                    key={rec.districtId}
                    type="button"
                    onClick={() => onSelectDistrict(rec.districtId)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors ${
                      selectedDistrictId === rec.districtId
                        ? isDark
                          ? 'bg-slate-800 ring-1 ring-emerald-400/50'
                          : 'bg-slate-200'
                        : isDark
                        ? 'hover:bg-slate-800/50'
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                      <span className={`font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {rec.districtName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{pct}%</span>
                      <span className="text-slate-400">{val.toLocaleString()}人</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'grouped_column': {
        const items = sortedRecords.slice(0, 10);
        const maxElem = Math.max(...items.map((r) => r.elementary), 1000);
        return (
          <div className="h-full flex flex-col justify-between pt-4 pb-2">
            <div className="flex items-center justify-end gap-6 text-xs pb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: palette.elementaryColor }} />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>國小人數 (6–11歲)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: palette.juniorHighColor }} />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>國中人數 (12–14歲)</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-10 items-end gap-3 border-b border-slate-700/60 pb-2 pt-4">
              {items.map((rec) => {
                const elemH = Math.max(6, (rec.elementary / maxElem) * 100);
                const jhH = Math.max(4, (rec.juniorHigh / maxElem) * 100);
                return (
                  <button
                    key={rec.districtId}
                    type="button"
                    onClick={() => onSelectDistrict(rec.districtId)}
                    className="h-full flex flex-col justify-end items-center group focus:outline-none"
                  >
                    <div className="text-[10px] font-mono tabular-nums text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(rec.elementary + rec.juniorHigh).toLocaleString()}
                    </div>
                    <div className="w-full flex items-end justify-center gap-1 h-48">
                      <div
                        className="w-3.5 rounded-t-sm transition-all duration-150"
                        style={{
                          height: `${elemH}%`,
                          backgroundColor: palette.elementaryColor,
                        }}
                        title={`${rec.districtName} 國小: ${rec.elementary.toLocaleString()}人`}
                      />
                      <div
                        className="w-3.5 rounded-t-sm transition-all duration-150"
                        style={{
                          height: `${jhH}%`,
                          backgroundColor: palette.juniorHighColor,
                        }}
                        title={`${rec.districtName} 國中: ${rec.juniorHigh.toLocaleString()}人`}
                      />
                    </div>
                    <span
                      className={`mt-2 text-[11px] font-medium truncate max-w-full ${
                        selectedDistrictId === rec.districtId
                          ? 'text-emerald-400 font-semibold'
                          : isDark
                          ? 'text-slate-300'
                          : 'text-slate-700'
                      }`}
                    >
                      {rec.districtName.slice(0, 3)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'stacked_bar': {
        const maxTotal = Math.max(...sortedRecords.map((r) => r.total), 1000);
        return (
          <div className="flex flex-col justify-between h-full gap-1.5 py-1">
            {sortedRecords.map((rec) => {
              const elemPct = (rec.elementary / maxTotal) * 100;
              const jhPct = (rec.juniorHigh / maxTotal) * 100;
              const jhShare = Math.round((rec.juniorHigh / Math.max(1, rec.total)) * 100);
              return (
                <button
                  key={rec.districtId}
                  type="button"
                  onClick={() => onSelectDistrict(rec.districtId)}
                  className="flex items-center gap-3 w-full text-left py-1 px-2 rounded hover:bg-slate-800/40 transition-colors"
                >
                  <span className={`w-28 text-xs font-medium truncate shrink-0 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {rec.districtName}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-5 rounded-l-sm transition-all duration-150" style={{ width: `${elemPct}%`, backgroundColor: palette.elementaryColor }} />
                    <div className="h-5 rounded-r-sm transition-all duration-150" style={{ width: `${jhPct}%`, backgroundColor: palette.juniorHighColor }} />
                    <span className="text-xs font-mono tabular-nums text-slate-300 whitespace-nowrap">
                      {rec.total.toLocaleString()}人 (國中佔 {jhShare}%)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        );
      }

      case 'pyramid_compare': {
        const maxSide = Math.max(...sortedRecords.map((r) => Math.max(r.elementary, r.juniorHigh)), 1000);
        return (
          <div className="flex flex-col justify-between h-full gap-1.5 py-1">
            <div className="grid grid-cols-11 text-xs font-medium text-slate-400 pb-1 border-b border-slate-800">
              <div className="col-span-4 text-right pr-3" style={{ color: palette.elementaryColor }}>
                ← 國小就學人數 (6–11歲)
              </div>
              <div className="col-span-3 text-center">行政區 / 國小國中比</div>
              <div className="col-span-4 text-left pl-3" style={{ color: palette.juniorHighColor }}>
                國中就學人數 (12–14歲) →
              </div>
            </div>
            {sortedRecords.slice(0, 10).map((rec) => {
              const leftW = Math.max(4, (rec.elementary / maxSide) * 100);
              const rightW = Math.max(4, (rec.juniorHigh / maxSide) * 100);
              const ratio = (rec.elementary / Math.max(1, rec.juniorHigh)).toFixed(2);
              return (
                <button
                  key={rec.districtId}
                  type="button"
                  onClick={() => onSelectDistrict(rec.districtId)}
                  className="grid grid-cols-11 items-center py-1 hover:bg-slate-800/40 rounded transition-colors"
                >
                  <div className="col-span-4 flex items-center justify-end gap-2 pr-2">
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      {rec.elementary.toLocaleString()}
                    </span>
                    <div
                      className="h-4 rounded-l-sm transition-all duration-150"
                      style={{ width: `${leftW}%`, backgroundColor: palette.elementaryColor }}
                    />
                  </div>
                  <div className="col-span-3 text-center text-xs font-medium truncate px-1">
                    <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                      {rec.districtName}
                    </span>
                    <span className="ml-1.5 text-[10px] font-mono text-slate-400">({ratio}x)</span>
                  </div>
                  <div className="col-span-4 flex items-center justify-start gap-2 pl-2">
                    <div
                      className="h-4 rounded-r-sm transition-all duration-150"
                      style={{ width: `${rightW}%`, backgroundColor: palette.juniorHighColor }}
                    />
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      {rec.juniorHigh.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        );
      }

      case 'area_stacked': {
        const corridorTotalsByYear = YEARS.map((yr) => {
          const yrRecs = allRecords.filter((r) => r.year === yr);
          const byCorridor = CORRIDOR_LIST.map((c) =>
            yrRecs.filter((r) => r.corridor === c).reduce((acc, r) => acc + getMetricValue(r), 0)
          );
          return { year: yr, values: byCorridor, sum: byCorridor.reduce((a, b) => a + b, 0) };
        });

        return (
          <div className="h-full flex flex-col justify-between py-2">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs pb-3">
              {CORRIDOR_LIST.map((corridor, idx) => {
                const currCorridorSum = filteredRecords
                  .filter((r) => r.corridor === corridor)
                  .reduce((acc, r) => acc + getMetricValue(r), 0);
                return (
                  <div key={corridor} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-xs"
                      style={{ backgroundColor: palette.colors[idx * 2] }}
                    />
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{corridor}</span>
                    <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                      {currCorridorSum.toLocaleString()}人
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex-1 grid grid-cols-16 items-end gap-1.5 pt-4 border-b border-slate-800 pb-2">
              {corridorTotalsByYear.map((item) => {
                const maxSum = Math.max(...corridorTotalsByYear.map((c) => c.sum), 1000);
                const isActiveYear = item.year <= displayYear;
                return (
                  <div
                    key={item.year}
                    className={`h-full flex flex-col justify-end items-center transition-opacity ${
                      isActiveYear ? 'opacity-100' : 'opacity-30'
                    }`}
                  >
                    <div
                      className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden"
                      style={{ height: `${(item.sum / maxSum) * 100}%` }}
                    >
                      {item.values.map((v, cIdx) => (
                        <div
                          key={cIdx}
                          style={{
                            height: `${(v / Math.max(1, item.sum)) * 100}%`,
                            backgroundColor: palette.colors[cIdx * 2],
                          }}
                          title={`${item.year} ${CORRIDOR_LIST[cIdx]}: ${v.toLocaleString()}人`}
                        />
                      ))}
                    </div>
                    <span
                      className={`mt-1.5 text-[10px] font-mono tabular-nums ${
                        item.year === displayYear ? 'text-emerald-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      '{String(item.year).slice(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'slope_ranking':
      case 'waterfall_change':
      case 'lollipop_delta': {
        const deltaSorted = [...filteredRecords].sort(
          (a, b) => b.cumChangeFrom2026Pct - a.cumChangeFrom2026Pct
        );
        const maxAbsPct = Math.max(
          ...deltaSorted.map((r) => Math.abs(r.cumChangeFrom2026Pct)),
          15
        );

        return (
          <div className="flex flex-col justify-between h-full gap-1 py-1">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
              <span>2026 基準年 → {displayYear} 年累積就學人口增減幅度 (%)</span>
              <span className="font-mono">正成長擴班區 vs 少子化空間活化區</span>
            </div>
            {deltaSorted.slice(0, 12).map((rec) => {
              const pct = rec.cumChangeFrom2026Pct;
              const isPos = pct >= 0;
              const barW = Math.min(48, (Math.abs(pct) / maxAbsPct) * 48);

              return (
                <button
                  key={rec.districtId}
                  type="button"
                  onClick={() => onSelectDistrict(rec.districtId)}
                  className="grid grid-cols-12 items-center py-1 hover:bg-slate-800/40 rounded px-2 transition-colors"
                >
                  <span className={`col-span-3 text-left text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {rec.districtName}
                  </span>
                  <div className="col-span-7 relative h-5 flex items-center">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600" />
                    {isPos ? (
                      <div
                        className="absolute left-1/2 h-3.5 bg-emerald-500 rounded-r-full transition-all duration-150"
                        style={{ width: `${barW}%` }}
                      />
                    ) : (
                      <div
                        className="absolute h-3.5 bg-rose-500 rounded-l-full transition-all duration-150"
                        style={{ right: '50%', width: `${barW}%` }}
                      />
                    )}
                  </div>
                  <span
                    className={`col-span-2 text-right font-mono tabular-nums text-xs font-semibold ${
                      isPos ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPos ? '+' : ''}
                    {pct.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        );
      }

      case 'bubble_matrix': {
        return (
          <div className="h-full flex flex-col justify-between py-2">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
              <span>X軸：2026–{displayYear}累積成長率 (%) · Y軸：校舍容量負荷指標 (100=飽和需增建)</span>
              <span className="text-emerald-400 font-mono">右上象限＝急需新設校/增班預警區</span>
            </div>
            <div className="flex-1 relative border border-slate-800 rounded-lg overflow-hidden bg-slate-900/40">
              <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-slate-700" />
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-slate-700" />
              <span className="absolute top-2 right-3 text-[11px] font-medium text-emerald-400">
                高成長 + 校舍高負荷 (優先增班擴建)
              </span>
              <span className="absolute bottom-2 left-3 text-[11px] font-medium text-slate-400">
                少子化減班 + 校舍空間充裕 (活化轉型)
              </span>

              {filteredRecords.map((rec) => {
                const xPct = Math.max(8, Math.min(92, 50 + rec.cumChangeFrom2026Pct * 0.9));
                const yPct = Math.max(12, Math.min(88, 90 - ((rec.classroomStressIndex - 60) / 75) * 78));
                const sizePx = Math.max(22, Math.min(58, Math.sqrt(rec.total) * 0.34));
                const color = districtColorMap.get(rec.districtId) || '#10B981';

                return (
                  <button
                    key={rec.districtId}
                    type="button"
                    onClick={() => onSelectDistrict(rec.districtId)}
                    style={{
                      left: `${xPct}%`,
                      top: `${yPct}%`,
                      width: `${sizePx}px`,
                      height: `${sizePx}px`,
                      backgroundColor: color,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-opacity-80 hover:scale-110 transition-all duration-150 flex items-center justify-center shadow-sm ring-1 ring-white/30"
                    title={`${rec.districtName}: ${rec.total.toLocaleString()}人, 成長率 ${rec.cumChangeFrom2026Pct}%, 校舍負荷 ${rec.classroomStressIndex}`}
                  >
                    <span className="text-[10px] font-bold text-slate-950 whitespace-nowrap drop-shadow-xs">
                      {rec.districtName.slice(0, 2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'heatmap_grid':
      case 'radar_corridor':
      case 'pareto_concentration':
      default: {
        const topDist = sortedRecords.slice(0, 10);
        const targetYears = [2026, 2028, 2030, 2032, 2034, 2036, 2038, 2040, 2041];

        return (
          <div className="h-full flex flex-col justify-between py-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400">
                  <th className="py-1.5 px-2">行政區</th>
                  {targetYears.map((yr) => (
                    <th
                      key={yr}
                      className={`py-1.5 px-2 text-right ${
                        yr === displayYear ? 'text-emerald-400 font-bold' : ''
                      }`}
                    >
                      {yr}年
                    </th>
                  ))}
                  <th className="py-1.5 px-2 text-right">15年趨勢</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-mono tabular-nums">
                {topDist.map((rec) => {
                  const distSeries = allRecords.filter((r) => r.districtId === rec.districtId);
                  const r2026 = distSeries.find((r) => r.year === 2026);
                  const r2041 = distSeries.find((r) => r.year === 2041);
                  const net15YrPct =
                    r2026 && r2041
                      ? (((getMetricValue(r2041) - getMetricValue(r2026)) / getMetricValue(r2026)) * 100).toFixed(1)
                      : '0.0';

                  return (
                    <tr
                      key={rec.districtId}
                      onClick={() => onSelectDistrict(rec.districtId)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-1.5 px-2 font-sans font-medium text-slate-200 whitespace-nowrap">
                        {rec.districtName}
                      </td>
                      {targetYears.map((yr) => {
                        const cell = distSeries.find((r) => r.year === yr);
                        const val = cell ? getMetricValue(cell) : 0;
                        const delta = cell ? cell.cumChangeFrom2026Pct : 0;
                        const bgTone =
                          delta > 15
                            ? 'bg-emerald-500/25 text-emerald-200'
                            : delta > 2
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : delta < -12
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'text-slate-300';

                        return (
                          <td key={yr} className={`py-1.5 px-2 text-right ${bgTone}`}>
                            {val.toLocaleString()}
                          </td>
                        );
                      })}
                      <td
                        className={`py-1.5 px-2 text-right font-semibold ${
                          Number(net15YrPct) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {Number(net15YrPct) >= 0 ? '+' : ''}
                        {net15YrPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
    }
  };

  return (
    <div
      style={{ fontFamily: styleConfig.fontFamily }}
      className={`w-full h-full rounded-xl border p-5 flex flex-col justify-between relative overflow-hidden transition-colors ${
        isDark
          ? 'bg-slate-950 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Stage Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-800/60">
        <div>
          <h2
            className={`text-lg font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {styleConfig.headerTitle}
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {styleConfig.headerSubtitle} · {getMetricLabel()}
          </p>
        </div>

        {/* High-Contrast Live Year & City Summary Readout */}
        <div className="flex items-center gap-4 shrink-0">
          {hasFinished && (
            <button
              type="button"
              onClick={onReplayFromStart}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              再次播放 (從2026重播)
            </button>
          )}

          <div className="text-right">
            <div className="text-[11px] text-slate-400">
              {displayYear}年 國小 / 國中合計
            </div>
            <div className="text-sm font-mono tabular-nums font-semibold">
              <span style={{ color: palette.elementaryColor }}>
                國小 {citySummary.totalElem.toLocaleString()}
              </span>
              <span className="mx-1.5 text-slate-500">/</span>
              <span style={{ color: palette.juniorHighColor }}>
                國中 {citySummary.totalJH.toLocaleString()}
              </span>
            </div>
          </div>

          <div
            className={`px-3.5 py-1.5 rounded-lg border font-mono tabular-nums flex items-baseline gap-2 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-slate-100 border-slate-300 text-slate-900'
            }`}
          >
            <span className="text-2xl font-bold tracking-tight text-emerald-400">
              {displayYear}
            </span>
            <span
              className={`text-xs font-semibold ${
                citySummary.deltaPct >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {citySummary.deltaPct >= 0 ? '+' : ''}
              {citySummary.deltaPct}% (較2026)
            </span>
          </div>
        </div>
      </div>

      {/* Main Dynamic Chart Area */}
      <div className="flex-1 min-h-0 py-2">{renderChartVisual()}</div>

      {/* Stage Bottom Axis & Completion / Audio Status Footer */}
      <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          {hasFinished ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              已完成 2026–2041 未來15年推演並停格於最終結果，點擊「再次播放」可重新觀看動態變化
            </span>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>已啟用數據變化音效與輕快背景音樂 · 點擊任一行政區可檢視指標學校與世代波峰</span>
            </>
          )}
        </div>
        <div className="font-mono tabular-nums">
          全區總計：{citySummary.totalAll.toLocaleString()} 名學生
        </div>
      </div>
    </div>
  );
};
