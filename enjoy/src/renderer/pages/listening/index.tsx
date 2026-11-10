// /listening — 临时总入口页（按 A1/A2/B1 分段）
// P-1 级内页落地后，本页由级内页吸收；路由保留兼容跳转
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Loader2, AlertCircle } from "lucide-react";
import { loadCatalog } from "@renderer/lib/listening-sync";
import type { BookMeta, CatalogEntry } from "./types";
import { ListeningShelfSection } from "./shelf-section";

export default function ListeningIndex() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog().then((cat) => {
      if (!cat) {
        setError("暂时无法加载书目，请检查网络连接后重试。");
      } else {
        setBooks(cat.books);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">正在加载书目…</p>
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

  const levels: Array<{ id: string; label: string; desc: string }> = [
    { id: "a1", label: "A1 入门故事", desc: "彼得兔等绘本，逐句中文对照" },
    { id: "a2", label: "A2 进阶故事", desc: "维尼熊等，丰富词汇与对话" },
    { id: "b1", label: "B1 章节书", desc: "绿野仙踪、杜立特等，附章节梗概" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-10">
      {/* 页头 */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-2xl font-bold">
          <BookOpen className="w-7 h-7 text-primary" />
          <span>按级别找故事</span>
        </div>
        <p className="text-muted-foreground text-sm">
          精选英语原版故事，配合朗读音频，逐句跟读、积累词汇
        </p>
      </div>

      {/* 分级书架 */}
      {levels.map(({ id, label, desc }) => {
        const levelBooks = books.filter((b) =>
          b.chapters.some((ch) => ch.level === id)
        );
        if (levelBooks.length === 0) return null;
        return (
          <ListeningShelfSection
            key={id}
            level={id}
            label={label}
            desc={desc}
            books={levelBooks}
          />
        );
      })}

      {books.length === 0 && (
        <div className="text-center text-muted-foreground py-16">
          暂无已上线故事
        </div>
      )}
    </div>
  );
}
