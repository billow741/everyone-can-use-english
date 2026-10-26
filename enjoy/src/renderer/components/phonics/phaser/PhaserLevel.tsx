import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { XIcon } from "lucide-react";
import { PhonicsAnchorItem } from "@renderer/lib/phoneme-anchors";
import { StickerAlbumReward } from "../golden-master/sticker-album-reward";
import { buildLevelConfig } from "./config";
import { FeedScene, VoiceScene, BlendScene } from "./scenes";

export interface PhaserLevelProps {
  item: PhonicsAnchorItem;
  onClose: () => void;
  onLevelCompleted: (item: PhonicsAnchorItem) => void;
  onNextLevel: () => void;
}

export const PhaserLevel: React.FC<PhaserLevelProps> = ({
  item,
  onClose,
  onLevelCompleted,
  onNextLevel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [showReward, setShowReward] = useState(false);
  const completedCalledRef = useRef(false);

  const handleReplay = () => {
    setShowReward(false);
    completedCalledRef.current = false;
  };

  useEffect(() => {
    if (!containerRef.current || showReward) return;

    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }

    const levelConfig = buildLevelConfig(item);

    const handleLevelFinished = () => {
      if (!completedCalledRef.current) {
        completedCalledRef.current = true;
        onLevelCompleted(item);
      }
      setShowReward(true);
    };

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 960,
      height: 540,
      backgroundColor: "#19203f",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [FeedScene, VoiceScene, BlendScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // 将关卡配置、完成回调和饱腹度存入 registry
    game.registry.set("levelConfig", levelConfig);
    game.registry.set("onLevelFinished", handleLevelFinished);
    game.registry.set("satietyCount", 0);

    game.scene.start("jelly", {
      levelConfig,
      onLevelFinished: handleLevelFinished,
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (typeof window !== "undefined") {
        delete window.__phaserProbe;
        delete window.__probe;
      }
    };
  }, [item.id, showReward]);

  return (
    <div className="w-full flex flex-col bg-slate-950 text-white overflow-hidden rounded-3xl border-2 border-amber-400/60 shadow-2xl">
      {/* 关卡顶部暖色顶栏 */}
      <div className="relative px-5 py-3.5 bg-gradient-to-r from-[#141b3d] via-[#212954] to-[#141b3d] border-b border-amber-400/30 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <img
            src="/assets/gangan/gangan_official.png"
            alt="敢敢"
            className="size-10 rounded-2xl object-cover bg-amber-100 shadow-md border-2 border-amber-300"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black font-mono text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-lg border border-amber-400/40">
                第 {item.order?.toString().padStart(2, "0") || "01"} 关 · 样板关
              </span>
              <span className="text-[10px] font-bold text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-400/40">
                通关岛 · 扁平沉浸舞台
              </span>
            </div>
            <h2 className="text-base font-black text-amber-200 mt-0.5">
              字母 <strong className="text-xl font-mono text-amber-400">{item.letter}</strong> · 沉睡月亮大冒险
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer border border-white/20"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      {/* 核心舞台容器 */}
      <div className="relative w-full aspect-[16/9] min-h-[420px] max-h-[540px] bg-[#121833] flex items-center justify-center overflow-hidden">
        {showReward ? (
          <StickerAlbumReward
            onClose={onClose}
            onNextLevel={onNextLevel}
            onReplay={handleReplay}
          />
        ) : (
          <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center"
          />
        )}
      </div>
    </div>
  );
};
