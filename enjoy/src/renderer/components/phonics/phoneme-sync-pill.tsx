import React from "react";
import { CloudIcon, RefreshCwIcon } from "lucide-react";

export function getPhonemeSyncCopy(isSyncing: boolean, isOnline: boolean): string {
  if (isSyncing) return "进度同步中...";
  return isOnline ? "进度已同步" : "仅保存在本机";
}

export interface PhonemeSyncPillProps {
  isSyncing: boolean;
  isOnline: boolean;
  onClick?: () => void;
  variant?: "light" | "trust";
  className?: string;
}

export const PhonemeSyncPill: React.FC<PhonemeSyncPillProps> = ({
  isSyncing,
  isOnline,
  onClick,
  variant = "light",
  className = "",
}) => {
  const label = getPhonemeSyncCopy(isSyncing, isOnline);

  const colorCls =
    variant === "trust"
      ? isSyncing
        ? "bg-white/15 text-amber-200 border-white/25"
        : isOnline
        ? "bg-white/15 text-white border-white/25"
        : "bg-white/10 text-white/85 border-white/20"
      : isSyncing
      ? "bg-[#F2A93B]/15 text-[#96690A] border-[#F2A93B]/40 dark:text-amber-300"
      : isOnline
      ? "bg-[#E7F2EF] text-[#0A5E5D] border-[#D3E4DE] dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-[#D3E4DE]/60"
      : "bg-[#F3FAF8] text-[#4E6B69] border-[#D3E4DE] dark:bg-slate-800 dark:text-slate-300 hover:bg-[#E7F2EF]";

  const baseCls = `inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${colorCls} ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid="phoneme-sync-pill"
        title="点击立即同步本地与云端进度"
        className={`${baseCls} cursor-pointer`}
      >
        <CloudIcon className="size-3.5 shrink-0" />
        <span>{label}</span>
        <RefreshCwIcon
          className={`size-3 shrink-0 transition-transform ${
            isSyncing ? "animate-spin" : "opacity-70"
          }`}
        />
      </button>
    );
  }

  return (
    <div
      data-testid="phoneme-sync-pill"
      title="当前进度存储与同步状态"
      className={baseCls}
    >
      <CloudIcon className="size-3.5 shrink-0" />
      <span>{label}</span>
      {isSyncing && <RefreshCwIcon className="size-3 shrink-0 animate-spin" />}
    </div>
  );
};
