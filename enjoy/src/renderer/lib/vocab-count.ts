import { useContext, useEffect, useState } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  countDueFromStore,
  getSrsStore,
  SRS_EVENT,
} from "@renderer/lib/vocab-srs";

// 生词总数（导航角标 / 首页继续学共用数据源）
// 与 profile.tsx 同一口径：webApi.mineMeanings({ page: 1, items: 1 }) 取 res.total
// 模块级缓存：同一会话内多个组件（底栏/侧栏/首页）共享一次请求
let cachedTotal: number | null = null;
let inflight: Promise<number> | null = null;

const fetchVocabularyTotal = (webApi: any): Promise<number> => {
  if (cachedTotal !== null) return Promise.resolve(cachedTotal);
  if (inflight) return inflight;
  inflight = Promise.resolve()
    .then(() => webApi.mineMeanings({ page: 1, items: 1 }))
    .then((res: any) => {
      const total =
        typeof res?.total === "number"
          ? res.total
          : res?.meanings?.length ?? 0;
      cachedTotal = total;
      return total;
    })
    .catch(() => 0)
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

export const useVocabularyCount = (): number => {
  const { webApi } = useContext(AppSettingsProviderContext) as any;
  const [count, setCount] = useState<number>(cachedTotal ?? 0);

  useEffect(() => {
    if (!webApi) return;
    let mounted = true;
    fetchVocabularyTotal(webApi).then((total) => {
      if (mounted) setCount(total);
    });
    return () => {
      mounted = false;
    };
  }, [webApi]);

  return count;
};

// 导航角标：有 SRS 学习记录后切换为「到期数」口径，否则用生词总数（U1 口径）
export const useVocabBadge = (): { count: number; mode: "total" | "due" } => {
  const total = useVocabularyCount();
  const [due, setDue] = useState<number>(() => countDueFromStore());
  const [hasEntries, setHasEntries] = useState<boolean>(
    () => Object.keys(getSrsStore()).length > 0
  );

  useEffect(() => {
    const refresh = () => {
      setDue(countDueFromStore());
      setHasEntries(Object.keys(getSrsStore()).length > 0);
    };
    window.addEventListener(SRS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SRS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (hasEntries) return { count: due, mode: "due" };
  return { count: total, mode: "total" };
};
