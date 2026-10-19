import { t } from "i18next";
import { Link, useSearchParams } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@renderer/components/ui";
import { PronunciationAssessmentForm } from "@renderer/components";

export default () => {
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get("bookId");
  const bookTitle = searchParams.get("bookTitle");
  const pageParam = searchParams.get("page");
  const sourceParam = searchParams.get("source");

  const returnUrl =
    bookId && pageParam
      ? `/stories?bookId=${encodeURIComponent(bookId)}&page=${pageParam}&shadowModal=true`
      : "/stories";

  return (
    <div className="min-h-full px-4 py-6 lg:px-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/pronunciation_assessments`}>
                  {t("sidebar.pronunciationAssessment")}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("newAssessment")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {sourceParam === "phonics" ? (
          <Link
            to="/phonics"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-400/40 transition-colors shadow-xs"
          >
            <span>🧩</span>
            <span>返回自然拼读阶梯 ➔</span>
          </Link>
        ) : bookId ? (
          <Link
            to={returnUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 transition-colors shadow-xs"
          >
            <span>📖</span>
            <span>{bookTitle ? `返回《${bookTitle}》` : "返回绘本"}</span>
          </Link>
        ) : (
          <Link
            to="/pronunciation_assessments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 transition-colors shadow-xs"
          >
            <span>🎙️</span>
            <span>返回纠音题库</span>
          </Link>
        )}
      </div>
      <PronunciationAssessmentForm />
    </div>
  );
};
