import { useIsDesktop } from "@renderer/hooks";
import { DesktopBookshelf } from "@renderer/components";
// 阳光桥少儿英语 · 听故事与环球漫游分级入口页 (/listening)
// 依据工单 G · IA 翻转：把环球漫游 79 站从听故事拆出独立分组
// 听故事剩 16 单元（A1 5 章 / A2 8 章 / B1 3 章：彼得兔 15 ＋ 绒布小兔 1）
// 环球漫游独立分组 79 站（A2 34 站 / B1 45 站，无 A1）

import React, { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Headphones,
  Compass,
  Loader2,
  AlertCircle,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { loadCatalog } from "@renderer/lib/listening-sync";
import type { BookMeta } from "./types";
import { ListeningShelfSection } from "./shelf-section";

export default function ListeningIndex() {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return <DesktopBookshelf />;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"stories" | "world">(() =>
    tabParam === "world" ? "world" : "stories"
  );

  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam === "world" && activeTab !== "world") {
      setActiveTab("world");
    } else if (tabParam === "stories" && activeTab !== "stories") {
      setActiveTab("stories");
    }
  }, [tabParam]);

  useEffect(() => {
    loadCatalog().then((cat) => {
      if (!cat || !cat.books || cat.books.length === 0) {
        setError("暂时无法加载书目，请检查网络连接后重试。");
      } else {
        setBooks(cat.books);
      }
      setLoading(false);
    });
  }, []);

  const handleTabChange = (tab: "stories" | "world") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // 1. 拆分：听故事（book !== "world"，16 单元）
  const storyBooks = useMemo(() => {
    return books.filter((b) => b.book !== "world");
  }, [books]);

  // 2. 拆分：环球漫游（book === "world"，79 站）
  const worldBooks = useMemo(() => {
    return books.filter((b) => b.book === "world");
  }, [books]);

  // 听故事三档分级（A1 5 章 · A2 8 章 · B1 3 章）
  const storyLevels: Array<{ id: string; label: string; desc: string }> = [
    { id: "a1", label: "A1 入门故事 (5 章)", desc: "彼得兔等原版短篇，逐句中文对照伴读" },
    { id: "a2", label: "A2 进阶故事 (8 章)", desc: "彼得兔合集与绒布小兔，丰富语汇与生动对话" },
    { id: "b1", label: "B1 章节故事 (3 章)", desc: "彼得兔长篇章节，附章节梗概与深度阅读" },
  ];

  // 环球漫游两档分级（A2 34 站 · B1 45 站，无 A1）
  const worldLevels: Array<{ id: string; label: string; desc: string }> = [
    { id: "a2", label: "A2 进阶漫游 (34 站)", desc: "英美名胜风光、城市地标与日常生活漫游" },
    { id: "b1", label: "B1 高级漫游 (45 站)", desc: "历史古迹、传奇人物与深度人文百科" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sun-orange" />
        <p className="text-muted-foreground text-sm">正在加载书目与漫游站点…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 pb-16">
      {/* 顶部主横幅 */}
      <div className="relative overflow-hidden rounded-[20px] bg-warm-paper border border-sand-border p-6 sm:p-8 text-slate-900 shadow-none">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-sand-border text-xs font-black text-warm-muted">
              <Sparkles className="size-3.5 text-sun-orange" />
              <span>阳光桥少儿英语 · 听读文库</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {activeTab === "stories" ? "听故事 · 原声伴读" : "环球漫游 · 79 站探索"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {activeTab === "stories"
                ? "精选 16 单元英语原版故事，配合纯正朗读音频，逐句跟读、积累词汇"
                : "79 站英美名胜风土漫游，声学毫秒对齐与文化沉浸，拓宽双语视野"}
            </p>
          </div>

          {/* 切换 Tab：听故事 (16 单元) ｜ 环球漫游 (79 站) */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-sand-border shadow-xs shrink-0">
            <button
              onClick={() => handleTabChange("stories")}
              data-testid="tab-listening-stories"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "stories"
                  ? "bg-amber-500 text-slate-950 shadow-xs scale-102"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-100/40"
              }`}
            >
              <Headphones className="size-3.5" />
              <span>听故事 (16 单元)</span>
            </button>
            <button
              onClick={() => handleTabChange("world")}
              data-testid="tab-listening-world"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "world"
                  ? "bg-amber-500 text-slate-950 shadow-xs scale-102"
                  : "text-slate-600 hover:text-slate-900 hover:bg-amber-100/40"
              }`}
            >
              <Compass className="size-3.5" />
              <span>环球漫游 (79 站)</span>
            </button>
          </div>
        </div>
      </div>

      {/* A. 听故事视图：A1 (5 章) / A2 (8 章) / B1 (3 章) */}
      {activeTab === "stories" && (
        <div className="space-y-8" data-testid="listening-stories-container">
          <div className="flex items-center justify-between px-1 border-b border-sand-border pb-3">
            <div>
              <h2 className="text-base font-black text-foreground">分级故事书架</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                彼得兔合集（15 单元）＋ 绒布小兔（1 单元），共 16 单元
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              共 16 单元已上线
            </span>
          </div>

          {storyLevels.map(({ id, label, desc }) => (
            <ListeningShelfSection
              key={id}
              level={id}
              label={label}
              desc={desc}
              books={storyBooks}
              unitLabel="章"
            />
          ))}

          {storyBooks.length === 0 && (
            <div className="text-center text-muted-foreground py-16">暂无故事数据</div>
          )}
        </div>
      )}

      {/* B. 环球漫游独立分组：A2 (34 站) / B1 (45 站，无 A1) */}
      {activeTab === "world" && (
        <div className="space-y-8" data-testid="listening-world-container">
          <div className="flex items-center justify-between px-1 border-b border-sand-border pb-3">
            <div>
              <h2 className="text-base font-black text-foreground">环球漫游独立分组</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                英格兰名胜、美国传奇、地道美食与历史人文，共 79 站（A2 34 站 · B1 45 站）
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
              共 79 站已上线
            </span>
          </div>

          {worldLevels.map(({ id, label, desc }) => (
            <ListeningShelfSection
              key={id}
              level={id}
              label={label}
              desc={desc}
              books={worldBooks}
              unitLabel="站"
            />
          ))}

          {worldBooks.length === 0 && (
            <div className="text-center text-muted-foreground py-16">暂无漫游数据</div>
          )}
        </div>
      )}
    </div>
  );
}
