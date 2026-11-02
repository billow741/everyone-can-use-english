/**
 * 全局连击条（P0 游戏快赢层，2026-11-02 规格）
 * 纯荣誉组件：只展示当前连对数，绝不参与任何分数计算。
 * 挂载方式：父容器 relative，本组件 absolute 贴在卡片右上角外沿（像贴纸）。
 * 状态递进：1–2 只显数字；3–5 火焰；6–9 火焰加大；≥10 金色「火力全开」。
 */
export default function StreakBar({ streak }: { streak: number }) {
  if (!streak || streak < 1) return null;
  const gold = streak >= 10;
  const big = streak >= 6;
  const flame = streak >= 3;
  return (
    <div className="pointer-events-none absolute -top-3 right-4 z-20 rotate-[-1deg] rounded-full border-[2.5px] border-[#3A2A18] bg-[#FFF8EA] px-3 py-1 shadow-[3px_3px_0_#3A2A18]">
      <span
        className={`font-black tabular-nums ${
          gold ? "text-[#9A7B0A]" : "text-[#3A2A18]"
        } ${big ? "text-base" : "text-sm"}`}
      >
        {flame ? "🔥 " : "连对 "}×{streak}
        {gold ? " 火力全开" : ""}
      </span>
    </div>
  );
}
