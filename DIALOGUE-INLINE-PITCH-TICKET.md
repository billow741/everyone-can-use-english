# 工单：对话课把语调曲线内嵌进跟读卡（完整报告仍走按钮）

派工人：Echo（经 Roger 2026-10-31 明确澄清：「把图2的语调图加入图1中，如果需要完整的评测报告，再点按钮生成」）
基线：main = 85e609f1（精准评测报告已上线）。从 main 切新分支 **feat/dialogue-inline-pitch** 施工。

## 目标形态

对话课播放页 `enjoy/src/renderer/pages/dialogues/show.tsx`：
- Step 3 逐句精学的每句跟读卡、Step 4 角色扮演的每个 B 句跟读卡，在**出分后**，直接在卡片内（分数行下方）**内嵌渲染双轨语调曲线**（PitchContourOverlay：学生录音轨 vs 该句 TMM 原声轨＋语调匹配度＋提示语），不用点开弹窗就能看到语调对比。
- 「精准评测报告」按钮与现有弹窗**保持不变**：完整的报告（逐词分数、发音动画面板等）仍按需点按钮打开。
- 未出分的句子不渲染曲线；同一句重读出新分后，曲线换成最新一次评测的数据。

## 接法

- 数据现成的：上一轮（feat/dialogue-report）已在 show.tsx 里按句保存了最新评测与录音（assessmentsMap / bAssessmentsMap），报告弹窗就是从这里取数。本次把同一份数据喂给卡片内嵌的 PitchContourOverlay，喂法参照 pronunciation-diagnostic-detail.tsx 里对该组件的现有用法（teacherAudioSrc＝该句课包 TMM mp3、学生轨＝本次录音）。
- 布局：曲线区占满卡片宽度、移动端不横向溢出；曲线组件高度用其默认形态即可，不要为了塞进卡片把图压得看不清。Step 4 里只要求当前句的卡片带曲线（历史已答句的卡片如也渲染，不得造成明显卡顿；如有性能顾虑可在完成说明里说明取舍）。

## 铁律

- **只引用不改**：pitch-contour-overlay.tsx、pronunciation-diagnostic-detail.tsx、articulatory-tongue-visualizer.tsx 三个组件不许改（Roger 已知情接受的既有残留——解码失败静默模拟回退、教师轨图例文案——本工单不处理，不要顺手动）。
- 不动过关线（60 分）、星级、进度分桶、小结诚实性逻辑；报告弹窗行为不变。
- 语调数据必须是该句真实评测的录音与 TMM 原声，不许拿别句或假数据填充。
- 文件读写全走 command；不自跑 Playwright；不合并 main、不 push、不部署。
- tsc（仓库本地二进制）不得新增错误（对照基线）；vite build 须通过。

## 完工动作

在本工单末尾追加完成说明：分支名与 commit、改动文件清单、内嵌曲线的数据来源（学生轨/教师轨各是什么）、Step 3 与 Step 4 各自的渲染范围、tsc/build 结果。然后停下，等 Echo 独立验收。


---

## 完成说明

- **分支名与 Commit**：
  - 分支名：`feat/dialogue-inline-pitch`
  - Commit：0c13a7c6
- **改动文件清单**：
  1. `enjoy/src/renderer/pages/dialogues/show.tsx`：
     - 引入 `PitchContourOverlay` 组件；
     - 在 `DialogueVoiceRecorder` 录音评测卡的分数行下方增加内嵌双轨语调曲线渲染：`{latestScore !== null && !isSubmitting && effectiveRecordingUrl && teacherAudioSrc && ...}`；
     - 统一抽取 `effectiveRecordingUrl = recordedUrl || (latestAssessment as any)?.recordingSrc || ""`，为卡片内嵌曲线与报告弹窗提供一致的录音源；
     - 为内嵌 `PitchContourOverlay` 绑定 `key={effectiveRecordingUrl}`，确保重读出新分后组件彻底重置更新为最新一次声学校准与评测数据；
     - 保留现有「精准评测报告」按钮与弹窗完整逻辑不变。
  2. `DIALOGUE-INLINE-PITCH-TICKET.md`：追加完工记录说明。
- **内嵌曲线的数据来源**：
  - **学生轨（Student Track）**：来自本句录音产生的真实音频流 Blob Object URL（及 `assessment.recordingSrc`），由浏览器 Web Audio API 真实提取 16kHz PCM，经 YIN + AMDF 辅音/浊音音高分析与归一化平滑得出 F0 声学起伏。
  - **教师轨（Teacher Track）**：来自本句课包对应的 TMM 原声物理音频 `/assets/tmm-dialogues/audio/${currentLine.audio}`（44.1kHz 母语原声 mp3），经 Web Audio 解码提取标准语调曲线。
- **Step 3 与 Step 4 各自的渲染范围**：
  - **Step 3（逐句精学）**：当前句跟读卡在出分后立即在卡片内（分数行下方）内嵌渲染双轨语调曲线，占满卡片宽度（`w-full`），移动端响应式不横向溢出；未出分的句子不渲染；通过底部跳转条切换已答句子时，从 `assessmentsMap` 还原对应句的曲线；同句重新跟读出分后更新为最新语调曲线。
  - **Step 4（角色扮演）**：当前轮到的 B 句跟读卡在出分后立即在卡片内（分数行下方）内嵌渲染双轨语调曲线；Step 4 交互模型为单句推进（当前 active line），历史已答句不在当前主屏重复渲染挂载，无多 canvas 性能与内存隐患；同句重新跟读出分后更新为最新语调曲线。
- **质量门禁验证结果**：
  - `tsc --noEmit`：本地 TypeScript 5.8.2 检查报错 67 条，严格与基线（67条）完全一致，dialogues 相关文件 0 错误，新增 0 条错误。
  - `vite build`：生产打包顺利通过（`vite.web.config.ts` 耗时 ~42s，exit code 0）。
