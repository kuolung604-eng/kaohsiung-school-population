import React from 'react';
import { ChartTypeId } from '../data/kaohsiungEducationData';

interface ChartIconProps {
  type: ChartTypeId;
  active?: boolean;
  className?: string;
}

export const ChartTypeThumbnail: React.FC<ChartIconProps> = ({ type, active = false, className = 'w-11 h-11' }) => {
  const strokeOpacity = active ? '1' : '0.85';

  switch (type) {
    case 'bar_race':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <rect x="6" y="8" width="34" height="6" rx="2" fill="#FF5E5B" opacity={strokeOpacity} />
          <rect x="6" y="17" width="27" height="6" rx="2" fill="#F97316" opacity={strokeOpacity} />
          <rect x="6" y="26" width="21" height="6" rx="2" fill="#10B981" opacity={strokeOpacity} />
          <rect x="6" y="35" width="14" height="6" rx="2" fill="#06B6D4" opacity={strokeOpacity} />
        </svg>
      );
    case 'line_race':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <path d="M6 36 C16 32, 22 18, 42 10" stroke="#FF5E5B" strokeWidth="3" strokeLinecap="round" />
          <path d="M6 26 C18 28, 28 20, 42 24" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" />
          <path d="M6 16 C18 20, 28 32, 42 38" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" />
          <circle cx="42" cy="10" r="3" fill="#FF5E5B" />
          <circle cx="42" cy="24" r="3" fill="#06B6D4" />
        </svg>
      );
    case 'donut_race':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <circle cx="24" cy="24" r="14" stroke="#1E293B" strokeWidth="7" />
          <circle
            cx="24"
            cy="24"
            r="14"
            stroke="#10B981"
            strokeWidth="7"
            strokeDasharray="36 88"
            strokeDashoffset="0"
            strokeLinecap="round"
          />
          <circle
            cx="24"
            cy="24"
            r="14"
            stroke="#06B6D4"
            strokeWidth="7"
            strokeDasharray="26 88"
            strokeDashoffset="-38"
            strokeLinecap="round"
          />
          <circle
            cx="24"
            cy="24"
            r="14"
            stroke="#F97316"
            strokeWidth="7"
            strokeDasharray="18 88"
            strokeDashoffset="-66"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'grouped_column':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <rect x="7" y="18" width="5" height="22" rx="1.5" fill="#06B6D4" />
          <rect x="13" y="25" width="5" height="15" rx="1.5" fill="#10B981" />
          <rect x="21" y="10" width="5" height="30" rx="1.5" fill="#06B6D4" />
          <rect x="27" y="16" width="5" height="24" rx="1.5" fill="#10B981" />
          <rect x="35" y="22" width="5" height="18" rx="1.5" fill="#06B6D4" />
          <rect x="41" y="29" width="4" height="11" rx="1.5" fill="#10B981" />
        </svg>
      );
    case 'stacked_bar':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <rect x="6" y="9" width="24" height="7" rx="1.5" fill="#06B6D4" />
          <rect x="31" y="9" width="11" height="7" rx="1.5" fill="#10B981" />
          <rect x="6" y="20" width="19" height="7" rx="1.5" fill="#06B6D4" />
          <rect x="26" y="20" width="10" height="7" rx="1.5" fill="#10B981" />
          <rect x="6" y="31" width="14" height="7" rx="1.5" fill="#06B6D4" />
          <rect x="21" y="31" width="8" height="7" rx="1.5" fill="#10B981" />
        </svg>
      );
    case 'pyramid_compare':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <line x1="24" y1="6" x2="24" y2="42" stroke="#64748B" strokeWidth="1.5" />
          <rect x="8" y="10" width="15" height="5" rx="1.5" fill="#06B6D4" />
          <rect x="25" y="10" width="11" height="5" rx="1.5" fill="#10B981" />
          <rect x="6" y="18" width="17" height="5" rx="1.5" fill="#06B6D4" />
          <rect x="25" y="18" width="14" height="5" rx="1.5" fill="#10B981" />
          <rect x="11" y="26" width="12" height="5" rx="1.5" fill="#06B6D4" />
          <rect x="25" y="26" width="9" height="5" rx="1.5" fill="#10B981" />
          <rect x="15" y="34" width="8" height="5" rx="1.5" fill="#06B6D4" />
          <rect x="25" y="34" width="6" height="5" rx="1.5" fill="#10B981" />
        </svg>
      );
    case 'area_stacked':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <path d="M6 38 L6 24 C16 20, 28 14, 42 12 L42 38 Z" fill="#06B6D4" fillOpacity="0.35" />
          <path d="M6 38 L6 30 C18 28, 28 24, 42 22 L42 38 Z" fill="#10B981" fillOpacity="0.6" />
          <path d="M6 24 C16 20, 28 14, 42 12" stroke="#06B6D4" strokeWidth="2.5" />
          <path d="M6 30 C18 28, 28 24, 42 22" stroke="#10B981" strokeWidth="2.5" />
        </svg>
      );
    case 'slope_ranking':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <line x1="10" y1="8" x2="10" y2="40" stroke="#475569" strokeWidth="1.5" />
          <line x1="38" y1="8" x2="38" y2="40" stroke="#475569" strokeWidth="1.5" />
          <path d="M10 32 L38 12" stroke="#10B981" strokeWidth="2.5" />
          <path d="M10 14 L38 26" stroke="#F43F5E" strokeWidth="2.5" />
          <path d="M10 22 L38 20" stroke="#06B6D4" strokeWidth="2.5" />
          <circle cx="10" cy="32" r="2.5" fill="#10B981" />
          <circle cx="38" cy="12" r="2.5" fill="#10B981" />
          <circle cx="10" cy="14" r="2.5" fill="#F43F5E" />
          <circle cx="38" cy="26" r="2.5" fill="#F43F5E" />
        </svg>
      );
    case 'waterfall_change':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <rect x="6" y="24" width="6" height="14" rx="1" fill="#10B981" />
          <rect x="15" y="14" width="6" height="10" rx="1" fill="#10B981" />
          <rect x="24" y="10" width="6" height="6" rx="1" fill="#10B981" />
          <rect x="33" y="16" width="6" height="11" rx="1" fill="#F43F5E" />
          <line x1="6" y1="38" x2="42" y2="38" stroke="#64748B" strokeWidth="1.5" />
        </svg>
      );
    case 'bubble_matrix':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <circle cx="16" cy="28" r="6" fill="#06B6D4" fillOpacity="0.8" />
          <circle cx="32" cy="16" r="8" fill="#10B981" fillOpacity="0.85" />
          <circle cx="28" cy="32" r="4.5" fill="#F59E0B" fillOpacity="0.85" />
          <circle cx="14" cy="15" r="3.5" fill="#EC4899" fillOpacity="0.85" />
        </svg>
      );
    case 'heatmap_grid':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <rect x="7" y="8" width="9" height="9" rx="1.5" fill="#10B981" />
          <rect x="19" y="8" width="9" height="9" rx="1.5" fill="#34D399" />
          <rect x="31" y="8" width="9" height="9" rx="1.5" fill="#059669" />
          <rect x="7" y="20" width="9" height="9" rx="1.5" fill="#06B6D4" />
          <rect x="19" y="20" width="9" height="9" rx="1.5" fill="#0EA5E9" />
          <rect x="31" y="20" width="9" height="9" rx="1.5" fill="#10B981" />
          <rect x="7" y="32" width="9" height="9" rx="1.5" fill="#F43F5E" />
          <rect x="19" y="32" width="9" height="9" rx="1.5" fill="#F97316" />
          <rect x="31" y="32" width="9" height="9" rx="1.5" fill="#F59E0B" />
        </svg>
      );
    case 'radar_corridor':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <polygon points="24,7 40,19 34,38 14,38 8,19" stroke="#475569" strokeWidth="1.5" fill="none" />
          <polygon
            points="24,10 37,20 30,35 17,33 12,21"
            stroke="#10B981"
            strokeWidth="2"
            fill="#10B981"
            fillOpacity="0.3"
          />
          <polygon
            points="24,15 32,22 32,36 15,36 16,20"
            stroke="#06B6D4"
            strokeWidth="2"
            fill="#06B6D4"
            fillOpacity="0.25"
          />
        </svg>
      );
    case 'lollipop_delta':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <line x1="22" y1="7" x2="22" y2="41" stroke="#64748B" strokeWidth="1.5" />
          <line x1="22" y1="13" x2="38" y2="13" stroke="#10B981" strokeWidth="2.5" />
          <circle cx="38" cy="13" r="3.5" fill="#10B981" />
          <line x1="22" y1="22" x2="33" y2="22" stroke="#06B6D4" strokeWidth="2.5" />
          <circle cx="33" cy="22" r="3.5" fill="#06B6D4" />
          <line x1="22" y1="31" x2="11" y2="31" stroke="#F43F5E" strokeWidth="2.5" />
          <circle cx="11" cy="31" r="3.5" fill="#F43F5E" />
        </svg>
      );
    case 'pareto_concentration':
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <rect x="7" y="14" width="6" height="26" rx="1" fill="#06B6D4" />
          <rect x="16" y="20" width="6" height="20" rx="1" fill="#06B6D4" opacity="0.85" />
          <rect x="25" y="26" width="6" height="14" rx="1" fill="#06B6D4" opacity="0.7" />
          <rect x="34" y="31" width="6" height="9" rx="1" fill="#06B6D4" opacity="0.55" />
          <path d="M10 24 Q20 12, 38 9" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="38" cy="9" r="2.5" fill="#F59E0B" />
        </svg>
      );
  }
};
