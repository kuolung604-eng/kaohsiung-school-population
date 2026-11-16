import React, { useRef } from 'react';
import { Film, Play, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { CHART_TYPES, ChartTypeId } from '../data/kaohsiungEducationData';

interface VideoAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeChartType: ChartTypeId;
  onSelectChartType: (type: ChartTypeId) => void;
  onSwitchToTab: (tab: 'preview' | 'data') => void;
}

interface VideoTimestampAction {
  timeSec: number;
  timeLabel: string;
  videoFeature: string;
  kaohsiungApplication: string;
  recommendedChart: ChartTypeId;
  targetTab: 'preview' | 'data';
}

const VIDEO_TIMESTAMPS: VideoTimestampAction[] = [
  {
    timeSec: 5,
    timeLabel: '00:05',
    videoFeature: '競賽條形圖 (Bar Chart Race) 與年份動態推進',
    kaohsiungApplication: '呈現2026–2041年楠梓區、仁武區、橋頭區因科技園區移入人口逆勢超車傳統行政區的動態洗牌。',
    recommendedChart: 'bar_race',
    targetTab: 'preview',
  },
  {
    timeSec: 6,
    timeLabel: '00:06',
    videoFeature: '競賽圓環圖 (Donut Race) 結構佔比演變',
    kaohsiungApplication: '分析「北高雄科技S廊帶」佔全高雄國中小就學總人口比例從 36% 擴張至 45% 以上的版圖位移。',
    recommendedChart: 'donut_race',
    targetTab: 'preview',
  },
  {
    timeSec: 9,
    timeLabel: '00:09',
    videoFeature: '雙軌分組柱狀圖 (Grouped Column)',
    kaohsiungApplication: '同場對照各區「國小(6–11歲)」與「國中(12–14歲)」生源，捕捉龍年與新市鎮移入潮由國小傳導至國中的3–6年時間差。',
    recommendedChart: 'grouped_column',
    targetTab: 'preview',
  },
  {
    timeSec: 10,
    timeLabel: '00:10',
    videoFeature: '多折線趨勢圖 (Multi-Line Trend)',
    kaohsiungApplication: '直接對比楠梓/橋頭上揚曲線與三民/小港緩降曲線的斜率分野與2034黃金交叉點。',
    recommendedChart: 'line_race',
    targetTab: 'preview',
  },
  {
    timeSec: 12,
    timeLabel: '00:12',
    videoFeature: '資料庫表格編輯與 CSV 欄位映射',
    kaohsiungApplication: '切換至「資料」分頁，支援匯入自訂戶政/教育局 CSV 或直接微調各區國中小預測人數。',
    recommendedChart: 'bar_race',
    targetTab: 'data',
  },
];

export const VideoAnalysisDrawer: React.FC<VideoAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  activeChartType,
  onSelectChartType,
  onSwitchToTab,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!isOpen) return null;

  const seekAndApply = (item: VideoTimestampAction) => {
    if (videoRef.current) {
      videoRef.current.currentTime = item.timeSec;
      videoRef.current.play().catch(() => {});
    }
    onSelectChartType(item.recommendedChart);
    onSwitchToTab(item.targetTab);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              錄製影片自動解析與高雄未來15年國中小就學人口圖表適配報告
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 cols: Uploaded Video Player + Timestamp Triggers */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-black aspect-9/16 max-h-[380px] flex items-center justify-center mx-auto w-full">
              <video
                ref={videoRef}
                src="/assets/aistudio/_____2026-11-16_072825_6c512797.mp4"
                controls
                className="h-full w-auto object-contain"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                點擊影片關鍵時間點，立即套用對應的高雄就學人口動態圖表：
              </div>
              {VIDEO_TIMESTAMPS.map((ts) => (
                <button
                  key={ts.timeLabel}
                  type="button"
                  onClick={() => seekAndApply(ts)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-800 hover:border-emerald-500/60 bg-slate-900/50 hover:bg-slate-900 transition-colors flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <span className="font-mono text-emerald-400">{ts.timeLabel}</span>
                      <span>·</span>
                      <span className="truncate">{ts.videoFeature}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {ts.kaohsiungApplication}
                    </p>
                  </div>
                  <Play className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Right 7 cols: Automated Suitability Analysis of Chart Types for Kaohsiung 2026-2041 */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2">
                <h3 className="text-sm font-bold text-white">
                  資料結構診斷：為何高雄未來15年（2026–2041）國中小生源需要多維度動態圖表？
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  高雄市未來15年國中小就學人口並非單純一致下降，而是呈現顯著的「北升南緩、外圍新市鎮擴張、國小洪峰延遲3至6年傳導至國中」的雙重結構轉型。根據您上傳的 Filmora V15 動態圖表架構，系統已自動從 14 種動態圖表中評選出最適合本議題的四大主力圖表：
                </p>
              </div>

              <div className="space-y-2.5">
                {CHART_TYPES.filter((c) => c.isRecommendedTop).map((chart, idx) => {
                  const isCurrent = activeChartType === chart.id;
                  return (
                    <div
                      key={chart.id}
                      className={`p-3.5 rounded-lg border transition-colors ${
                        isCurrent
                          ? 'border-emerald-500/70 bg-emerald-950/20'
                          : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            0{idx + 1}.
                          </span>
                          <span className="text-sm font-bold text-white">{chart.name}</span>
                          <span className="text-xs font-mono text-slate-400">
                            適配度 {chart.suitabilityScore}%
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectChartType(chart.id);
                            onSwitchToTab('preview');
                            onClose();
                          }}
                          className={`px-3 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                            isCurrent
                              ? 'bg-emerald-500 text-slate-950 font-semibold'
                              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              目前使用中
                            </>
                          ) : (
                            <>
                              套用此圖表
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        {chart.whySuitable}
                      </p>
                      <div className="text-[11px] text-slate-400 mt-1.5">
                        最佳政策應用：{chart.bestUseCase}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                左側工具列亦完整提供全部 14 種動態圖表類型供隨時切換
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
              >
                返回動態圖表工作台
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
