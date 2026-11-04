// 阳光桥少儿英语 · G1 试点区探险漫画风过场播放器 (CutscenePlayer)
// 支持 CUT-A（3:2 格图流）与 CUT-B（单张场景图背景流），严格遵循工单交互与音效规范

import React, { useState, useEffect, useCallback } from "react";
import { CutsceneConfig, SPEAKERS } from "@renderer/lib/game-assets";
import { playSfx, playVoice, stopVoice } from "@renderer/lib/game-audio";

export interface CutscenePlayerProps {
  config: CutsceneConfig;
  onDone: (skipped: boolean) => void;
}

export const CutscenePlayer: React.FC<CutscenePlayerProps> = ({
  config,
  onDone,
}) => {
  const [panelIdx, setPanelIdx] = useState<number>(0);
  const [lineIdx, setLineIdx] = useState<number>(0);

  const currentPanel = config.panels[panelIdx] || config.panels[0];
  const currentLine = currentPanel.lines[lineIdx] || currentPanel.lines[0];

  // 播放当前行语音
  useEffect(() => {
    if (currentLine?.voiceId) {
      playVoice(currentLine.voiceId);
    }
    return () => {
      stopVoice();
    };
  }, [panelIdx, lineIdx, currentLine?.voiceId]);

  // 点按推进逻辑：先逐句，后逐格
  const handleAdvance = useCallback(() => {
    if (!currentPanel) return;

    if (lineIdx < currentPanel.lines.length - 1) {
      // 推进下一句
      playSfx("tap");
      setLineIdx((prev) => prev + 1);
    } else if (panelIdx < config.panels.length - 1) {
      // 翻到下一格
      playSfx("panel-turn");
      setPanelIdx((prev) => prev + 1);
      setLineIdx(0);
    } else {
      // 播放结束
      stopVoice();
      onDone(false);
    }
  }, [lineIdx, panelIdx, currentPanel, config.panels.length, onDone]);

  // 跳过整场
  const handleSkip = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      playSfx("tap");
      stopVoice();
      onDone(true);
    },
    [onDone]
  );

  const speakerMeta = currentLine ? SPEAKERS[currentLine.speaker] : null;
  const isNarrator = currentLine?.speaker === "narrator";
  const portraitUrl =
    currentLine?.portrait || (speakerMeta?.portrait ?? undefined);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 select-none cursor-pointer animate-in fade-in duration-200"
      onClick={handleAdvance}
    >
      {/* 探险漫画羊皮纸主卡 */}
      <div
        className="w-full max-w-4xl rounded-3xl border-[3px] border-[#3A2A18] p-4 sm:p-6 relative overflow-hidden shadow-[6px_6px_0px_#3A2A18] flex flex-col justify-between"
        style={{
          backgroundColor: "#F3E3C2",
          color: "#3A2A18",
        }}
        onClick={(e) => {
          // 点击卡片内部任意处同样推进
          e.stopPropagation();
          handleAdvance();
        }}
      >
        {/* 虚线内框 */}
        <div className="absolute inset-2 border border-dashed border-[#3A2A18]/30 rounded-2xl pointer-events-none" />

        {/* 顶部状态栏：标题 + 进度指示点 + 跳过按钮 */}
        <div className="relative z-10 flex items-center justify-between gap-3 pb-3 mb-2 border-b-2 border-[#3A2A18]/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full border border-[#3A2A18] bg-[#FFB340] text-[#3A2A18]">
              {config.title}
            </span>
            <span className="text-xs font-bold text-[#3A2A18]/60">
              第 {panelIdx + 1}/{config.panels.length} 格
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* 格数进度指示点 */}
            {config.panels.length > 1 && (
              <div className="flex items-center gap-1.5">
                {config.panels.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      idx === panelIdx
                        ? "w-5 bg-[#3A2A18]"
                        : idx < panelIdx
                        ? "w-2 bg-[#2E7D5B]"
                        : "w-2 bg-[#3A2A18]/25"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* 跳过按钮 */}
            <button
              onClick={handleSkip}
              className="px-3 py-1 rounded-xl border-2 border-[#3A2A18] bg-[#FFF8EA] hover:bg-[#F3E3C2] text-xs font-black text-[#3A2A18] flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_#3A2A18] transition-colors"
            >
              <svg className="size-3.5 fill-[#3A2A18]">
                <use href="/assets/game/svg/icons-sprite.svg#icn-skip" />
              </svg>
              <span>跳过</span>
            </button>
          </div>
        </div>

        {/* 中间画幅区域 (3:2 漫画格或场景图) */}
        <div className="relative z-10 my-2 flex items-center justify-center overflow-hidden rounded-2xl border-2 border-[#3A2A18] bg-[#3A2A18]/10 shadow-[3px_3px_0_#3A2A18]">
          <div className="w-full aspect-[3/2] max-h-[52vh] relative flex items-center justify-center overflow-hidden bg-[#2A1E14]">
            <img
              key={currentPanel.image}
              src={currentPanel.image}
              alt={config.title}
              className="w-full h-full object-contain transition-opacity duration-300"
            />
          </div>
        </div>

        {/* 底部台词条 (说话人姓名牌 + 台词 + 继续提示) */}
        <div className="relative z-10 mt-3 p-3.5 sm:p-4 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] shadow-[3px_3px_0_#3A2A18] flex items-start gap-3.5 min-h-[92px]">
          {/* 角色头像与姓名牌 (旁白不展示头像) */}
          {!isNarrator && (
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl border-2 border-[#3A2A18] bg-[#F3E3C2] overflow-hidden shadow-[2px_2px_0_#3A2A18] flex items-center justify-center">
                {portraitUrl ? (
                  <img
                    src={portraitUrl}
                    alt={speakerMeta?.name || "角色"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-sm font-black text-[#3A2A18]">
                    {speakerMeta?.name?.[0] || "?"}
                  </div>
                )}
              </div>
              <span className="mt-1 px-2 py-0.2 rounded-md border border-[#3A2A18] bg-[#FFB340] text-[10px] font-black text-[#3A2A18]">
                {speakerMeta?.name || "角色"}
              </span>
            </div>
          )}

          {/* 台词文本 */}
          <div className="flex-1 pr-6 flex flex-col justify-center min-h-[50px]">
            {isNarrator ? (
              <div className="text-base sm:text-lg italic text-[#3A2A18]/90 font-medium leading-relaxed">
                「{currentLine.text}」
              </div>
            ) : (
              <div className="text-base sm:text-lg text-[#3A2A18] font-black leading-relaxed tracking-wide">
                「{currentLine.text}」
              </div>
            )}
          </div>

          {/* 点按推进提示 */}
          <div className="absolute right-3.5 bottom-2 text-[10px] font-black text-[#3A2A18]/45 flex items-center gap-1 animate-pulse">
            <span>点击继续</span>
            <span>▾</span>
          </div>
        </div>
      </div>
    </div>
  );
};
