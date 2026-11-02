import { useContext, useEffect, useState } from "react";
import { AppSettingsProviderContext } from "@renderer/context";

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
