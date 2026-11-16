import React, { useMemo, useRef, useState } from 'react';
import { Upload, Download, RotateCcw, Search } from 'lucide-react';
import {
  CohortFilter,
  ColorPalette,
  KAOHSIUNG_DISTRICTS,
  YEARS,
  YearlyDistrictRecord,
} from '../data/kaohsiungEducationData';

interface DataSpreadsheetViewProps {
  records: YearlyDistrictRecord[];
  cohortFilter: CohortFilter;
  onChangeCohortFilter: (filter: CohortFilter) => void;
  onUpdateCell: (
    year: number,
    districtId: string,
    field: 'elementary' | 'juniorHigh',
    value: number
  ) => void;
  onImportRecords: (newRecords: YearlyDistrictRecord[]) => void;
  onResetDefaultData: () => void;
  onDownloadCsv: () => void;
  palette: ColorPalette;
}

export const DataSpreadsheetView: React.FC<DataSpreadsheetViewProps> = ({
  records,
  cohortFilter,
  onChangeCohortFilter,
  onUpdateCell,
  onImportRecords,
  onResetDefaultData,
  onDownloadCsv,
  palette,
}) => {
  const [filterYear, setFilterYear] = useState<number | 'ALL'>('ALL');
  const [filterDistrict, setFilterDistrict] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [useHeaderRow, setUseHeaderRow] = useState<boolean>(true);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleRows = useMemo(() => {
    return records.filter((r) => {
      if (filterYear !== 'ALL' && r.year !== filterYear) return false;
      if (filterDistrict !== 'ALL' && r.districtId !== filterDistrict) return false;
      if (
        searchQuery.trim() &&
        !r.districtName.includes(searchQuery.trim()) &&
        !r.corridor.includes(searchQuery.trim()) &&
        !String(r.year).includes(searchQuery.trim())
      ) {
        return false;
      }
      return true;
    });
  }, [records, filterYear, filterDistrict, searchQuery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        setUploadFeedback('檔案內容列數不足，請確認 CSV 格式（年份,行政區,國小人數,國中人數）。');
        return;
      }

      const startIndex = useHeaderRow ? 1 : 0;
      const updatedMap = new Map<string, YearlyDistrictRecord>();
      records.forEach((r) => updatedMap.set(`${r.year}_${r.districtId}`, { ...r }));

      let importedCount = 0;
      for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        if (cols.length < 3) continue;
        const yr = parseInt(cols[0], 10);
        const distNameOrId = cols[1];
        const elemVal = parseInt(cols[2], 10);
        const jhVal = cols.length >= 4 ? parseInt(cols[3], 10) : Math.round(elemVal * 0.48);

        if (isNaN(yr) || isNaN(elemVal)) continue;

        const matchedDist = KAOHSIUNG_DISTRICTS.find(
          (d) =>
            d.id === distNameOrId ||
            d.name.includes(distNameOrId) ||
            distNameOrId.includes(d.name.replace('區', ''))
        );
        if (!matchedDist) continue;

        const key = `${yr}_${matchedDist.id}`;
        const existing = updatedMap.get(key);
        if (existing) {
          existing.elementary = Math.max(50, elemVal);
          existing.juniorHigh = Math.max(30, isNaN(jhVal) ? existing.juniorHigh : jhVal);
          existing.total = existing.elementary + existing.juniorHigh;
          updatedMap.set(key, existing);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        onImportRecords(Array.from(updatedMap.values()));
        setUploadFeedback(`已成功載入並更新 ${importedCount} 筆高雄市行政區國中小就學人口數據。`);
      } else {
        setUploadFeedback('未匹配到對應年份與高雄行政區名稱，請參考標準 CSV 範本欄位。');
      }
    };
    reader.readAsText(file);
  };

  // Mini preview series for top 3 growth districts (Nanzi, Zuoying, Renwu) across 2026-2041
  const miniPreviewIds = ['fengshan', 'sanmin', 'nanzi', 'zuoying'];
  const miniYears = [2026, 2029, 2032, 2035, 2038, 2041];

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
      {/* Left 8 Columns: Interactive Spreadsheet Table */}
      <div className="lg:col-span-8 flex flex-col border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋行政區或生活圈..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={filterYear}
              onChange={(e) =>
                setFilterYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">全部年份 (2026–2041)</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>

            <select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">全部高雄行政區 (14區)</option>
              {KAOHSIUNG_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              共 {visibleRows.length} 筆資料列（可直接點擊數值儲存格微調）
            </span>
          </div>
        </div>

        {/* Dense Data Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 z-10">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Year (年份)</th>
                <th className="py-2.5 px-3 font-semibold">District (行政區)</th>
                <th className="py-2.5 px-3 font-semibold">就學生活圈</th>
                <th className="py-2.5 px-3 font-semibold text-right">國小人數 (6–11歲)</th>
                <th className="py-2.5 px-3 font-semibold text-right">國中人數 (12–14歲)</th>
                <th className="py-2.5 px-3 font-semibold text-right">總就學人口</th>
                <th className="py-2.5 px-3 font-semibold text-right">較2026變化</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-mono tabular-nums">
              {visibleRows.map((row) => (
                <tr
                  key={`${row.year}_${row.districtId}`}
                  className="hover:bg-slate-900/70 transition-colors"
                >
                  <td className="py-2 px-3 text-slate-300">{row.year}</td>
                  <td className="py-2 px-3 font-sans font-medium text-white">
                    {row.districtName}
                  </td>
                  <td className="py-2 px-3 font-sans text-slate-400">{row.corridor}</td>
                  <td className="py-1.5 px-3 text-right">
                    <input
                      type="number"
                      min={50}
                      max={50000}
                      value={row.elementary}
                      onChange={(e) =>
                        onUpdateCell(
                          row.year,
                          row.districtId,
                          'elementary',
                          Math.max(50, Number(e.target.value) || 0)
                        )
                      }
                      className="w-24 text-right px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-cyan-300 focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <input
                      type="number"
                      min={30}
                      max={30000}
                      value={row.juniorHigh}
                      onChange={(e) =>
                        onUpdateCell(
                          row.year,
                          row.districtId,
                          'juniorHigh',
                          Math.max(30, Number(e.target.value) || 0)
                        )
                      }
                      className="w-24 text-right px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-emerald-300 focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-white">
                    {row.total.toLocaleString()}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-semibold ${
                      row.cumChangeFrom2026Pct > 0
                        ? 'text-emerald-400'
                        : row.cumChangeFrom2026Pct < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {row.cumChangeFrom2026Pct > 0 ? '+' : ''}
                    {row.cumChangeFrom2026Pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right 4 Columns: Filmora-Style CSV Upload, Column Mapping & Live Mini Trend */}
      <div className="lg:col-span-4 flex flex-col justify-between border border-slate-800 rounded-xl bg-slate-950 p-4 overflow-y-auto gap-4">
        <div className="space-y-4">
          {/* File Upload Box matching 00:13 in video */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-5 px-4 border border-dashed border-slate-700 hover:border-emerald-500/70 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors flex flex-col items-center justify-center gap-1.5 text-center"
            >
              <Upload className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-medium text-slate-200">
                按一下以載入 CSV 檔案（最大 1 MB）
              </span>
              <span className="text-[11px] text-slate-400">
                格式：Year, 行政區, 國小人數, 國中人數
              </span>
            </button>

            {uploadFeedback && (
              <p className="mt-2 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 rounded px-2.5 py-1.5">
                {uploadFeedback}
              </p>
            )}

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onDownloadCsv}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                匯出高雄15年CSV
              </button>
              <button
                type="button"
                onClick={onResetDefaultData}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                還原預設推估
              </button>
            </div>
          </div>

          {/* Header Toggle matching 00:13 in video */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-xs font-medium text-slate-300">使用標題列</span>
            <button
              type="button"
              onClick={() => setUseHeaderRow(!useHeaderRow)}
              className={`w-10 h-5 rounded-full transition-colors p-0.5 ${
                useHeaderRow ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  useHeaderRow ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Column Selection Dropdowns matching 00:13 in video */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-semibold text-slate-200">選擇要視覺化的欄</h3>

            <div className="space-y-1">
              <label className="block text-[11px] text-slate-400">
                時間軸欄 <span className="text-rose-400">*</span>
              </label>
              <select
                disabled
                value="Year"
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-200"
              >
                <option value="Year">Year (2026–2041 未來15年學年度)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-slate-400">
                區域分類欄 <span className="text-rose-400">*</span>
              </label>
              <select
                disabled
                value="District"
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-200"
              >
                <option value="District">District (高雄市各行政區 / 四大就學生活圈)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-slate-400">
                數值指標欄 <span className="text-rose-400">*</span>
              </label>
              <select
                value={cohortFilter}
                onChange={(e) => onChangeCohortFilter(e.target.value as CohortFilter)}
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="total">國中小總就學人數 (Elementary + Junior High)</option>
                <option value="elementary">僅看國小就學人數 (6–11歲)</option>
                <option value="junior_high">僅看國中就學人數 (12–14歲)</option>
                <option value="both_compare">國小 vs 國中雙軌分段對比</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom-right live mini chart preview matching 00:13 in video */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span>即時資料曲線預覽 (重點4區)</span>
            <span className="font-mono">2026–2041</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
            <svg viewBox="0 0 260 110" className="w-full h-28 overflow-visible">
              {[0, 0.5, 1].map((r, idx) => (
                <line
                  key={idx}
                  x1="28"
                  y1={12 + r * 74}
                  x2="250"
                  y2={12 + r * 74}
                  stroke="#1E293B"
                  strokeDasharray="2 2"
                />
              ))}
              {miniPreviewIds.map((id, sIdx) => {
                const pts = miniYears.map((yr, xIdx) => {
                  const rec = records.find((r) => r.year === yr && r.districtId === id);
                  const val = rec ? rec.total : 10000;
                  const x = 32 + (xIdx / (miniYears.length - 1)) * 212;
                  const y = 86 - (val / 30000) * 74;
                  return { x, y };
                });
                const dPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const strokeColor = palette.colors[sIdx % palette.colors.length];
                return (
                  <g key={id}>
                    <path d={dPath} fill="none" stroke={strokeColor} strokeWidth="2" />
                    {pts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={strokeColor} />
                    ))}
                  </g>
                );
              })}
              {miniYears.map((yr, idx) => (
                <text
                  key={yr}
                  x={32 + (idx / (miniYears.length - 1)) * 212}
                  y="104"
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-slate-400"
                >
                  {yr}
                </text>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
