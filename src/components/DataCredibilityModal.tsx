import React from 'react';
import { ShieldCheck, X, CheckCircle2, BookOpen, Building2 } from 'lucide-react';
import { DATA_CREDIBILITY_SOURCES, KAOHSIUNG_DISTRICTS } from '../data/kaohsiungEducationData';

interface DataCredibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataCredibilityModal: React.FC<DataCredibilityModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const totalElem2026 = KAOHSIUNG_DISTRICTS.reduce((acc, d) => acc + d.baseElementary2026, 0);
  const totalJH2026 = KAOHSIUNG_DISTRICTS.reduce((acc, d) => acc + d.baseJuniorHigh2026, 0);
  const totalElemSchools = KAOHSIUNG_DISTRICTS.reduce((acc, d) => acc + d.elementarySchoolCount, 0);
  const totalJHSchools = KAOHSIUNG_DISTRICTS.reduce((acc, d) => acc + d.juniorHighSchoolCount, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              資料可信度與官方統計來源查核報告 (2026–2041 高雄市國中小學齡人口推計)
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800">
              <div className="text-xs text-slate-400">2026基準年 國小在籍總數</div>
              <div className="text-lg font-mono tabular-nums font-bold text-cyan-400 mt-1">
                {totalElem2026.toLocaleString()} 人
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">6–11歲（國小1至6年級）</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800">
              <div className="text-xs text-slate-400">2026基準年 國中在籍總數</div>
              <div className="text-lg font-mono tabular-nums font-bold text-emerald-400 mt-1">
                {totalJH2026.toLocaleString()} 人
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">12–14歲（國中7至9年級）</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800">
              <div className="text-xs text-slate-400">納計校數（國小 / 國中）</div>
              <div className="text-lg font-mono tabular-nums font-bold text-white mt-1">
                {totalElemSchools} 校 / {totalJHSchools} 校
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">含新設藍田國小與籌設高科實中</div>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800">
              <div className="text-xs text-slate-400">國小 / 國中學制結構比</div>
              <div className="text-lg font-mono tabular-nums font-bold text-amber-400 mt-1">
                {(totalElem2026 / totalJH2026).toFixed(2)} : 1
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">符合國小6年制 vs 國中3年制</div>
            </div>
          </div>

          {/* 4 Official Data Sources */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              四大官方統計基準與人口推計方法論
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DATA_CREDIBILITY_SOURCES.map((src, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-slate-800 bg-slate-900/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-emerald-400">{src.agency}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      已校準
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">{src.datasetTitle}</div>
                  <div className="text-[11px] text-slate-400">
                    查核範圍：{src.verificationScope}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pt-1">
                    {src.methodologyDetail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* District-by-District School & Enrollment Verification Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              各行政區 2026 基準年在籍人數、校數與代表性指標學校（含總量管制學區）查核表
            </h3>
            <div className="border border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">行政區</th>
                    <th className="py-2.5 px-3 text-right">國小基準(6年級)</th>
                    <th className="py-2.5 px-3 text-right">國中基準(3年級)</th>
                    <th className="py-2.5 px-3 text-right">校數(小/中)</th>
                    <th className="py-2.5 px-3">轄內指標國中小與總量管制學區</th>
                    <th className="py-2.5 px-3">戶政與教育統計校準依據</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {KAOHSIUNG_DISTRICTS.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-900/50">
                      <td className="py-2 px-3 font-semibold text-white whitespace-nowrap">
                        {d.name}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-cyan-300">
                        {d.baseElementary2026.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-300">
                        {d.baseJuniorHigh2026.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {d.elementarySchoolCount}小 / {d.juniorHighSchoolCount}中
                      </td>
                      <td className="py-2 px-3 text-slate-300 max-w-xs">{d.keySchools}</td>
                      <td className="py-2 px-3 text-slate-400 max-w-xs">
                        {d.officialVerificationNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            使用者亦可於「資料」分頁匯入最新學年度 CSV 或手動微調各校/各區推估參數
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
          >
            確認並返回圖表工作台
          </button>
        </div>
      </div>
    </div>
  );
};
