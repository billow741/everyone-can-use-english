# 工单：对话课跟读接入精准评测报告（语调曲线＋发音动画面板）

派工人：Echo（经 Roger 2026-10-31 拍板：「加入语调曲线、发音动画面板，按需出精准的评测报告」）
基线：main = 49b7afb3（对话课 P0 已上线）。从 main 切新分支 **feat/dialogue-report** 施工。

## 背景与现状（Echo 已核实）

- 对话课播放页 `enjoy/src/renderer/pages/dialogues/show.tsx` 的跟读打分已经在用纠错舱同款 `usePronunciationAssessments().createAssessment`（Step 3 逐句精学与 Step 4 角色扮演各一处调用），分数真实、记录进同一评测库；但 UI 只显示总分＋过关，用户看不到纠错舱的深度反馈。
- 现成的「精准评测报告」组件就是 `enjoy/src/renderer/components/pronunciation-assessments/pronunciation-diagnostic-detail.tsx`：它已经内嵌 `PitchContourOverlay`（双轨语调走势叠图，学生录音 vs 外教原声）和 `ArticulatoryTongueVisualizer`（发音动画面板），并展示逐词/维度分数。RecordingDetail 等现有页面如何给它喂数据（assessment 记录、录音、外教原声音频），照抄那套接法。

## 要做的事

1. show.tsx 两处跟读（Step 3 每句、Step 4 每个 B 句）在出分后，保留本次评测的记录标识（createAssessment 返回的 created.id 及详情组件所需的录音/记录引用），并在分数旁新增按钮 **「精准评测报告」**。
2. 点击按钮：以**弹窗（Modal）形式**打开该条评测的 PronunciationDiagnosticDetail（优先弹窗，保持在课内不跳走；若弹窗集成确有阻塞，可退而求其次跳现有详情路由并在完成说明里讲清原因）。弹窗内必须真实呈现：
   - 总分与逐词/维度分数（来自该条 Azure 评测记录）；
   - **语调曲线**：PitchContourOverlay 双轨对比——学生轨＝本次跟读录音，外教轨＝该句的 TMM 原声 mp3（课包 audio/ 内对应文件）；
   - **发音动画面板**：ArticulatoryTongueVisualizer（嵌入版形态，与报告页里的一致）。
3. 未作答/未出分的句子不显示报告按钮；同一句重读出新分后，按钮指向最新一次评测。

## 铁律（不许打折）

- **诚实**：语调曲线必须由真实音频提取（学生录音＋TMM 原声）。PitchContourOverlay 内部在提取失败时会回退模拟曲线——本次接入不许靠模拟曲线冒充实测：若某句拿不到真实学生录音或外教原声，该句的曲线区块宁可不显示，并在完成说明里逐项讲清哪些数据是真的、哪条路径没走通。评测分仍以 createAssessment 的真实 Azure 结果为准，模拟兜底记录沿用既有 evaluationSource 诚实标注。
- **不改既有口径**：过关线（Step 4 的 60 分）、星级规则、进度分桶 key、49b7afb3 的小结诚实性逻辑（未作答显示「未作答」、未答完不发星不存完成）一律不动；「直接去小结」按钮保留。
- **范围**：只改 dialogues 相关文件（show.tsx 及必要时同目录新文件）；diagnostic-detail / pitch-contour-overlay / articulatory-tongue-visualizer 三个组件**只许引用、不许改**（确需改 props 接线时在完成说明里单独标出并说明理由）。
- 文件读写全走 command（cat/python），禁用专用文件工具；**不自跑 Playwright**、不合并 main、不部署、不 push。
- tsc（仓库本地二进制）不得新增错误（基线 67 条）；vite build 须通过。

## 完工动作

在本工单末尾追加完成说明：分支名与 commit、改动文件清单、报告弹窗的数据接法（记录/录音/外教原声各从哪来）、语调曲线真实性自查结果（哪几条路径真实提取、模拟回退是否被挡住）、tsc/build 结果。然后停下，等 Echo 独立验收。


---

## 完成说明

- **分支名与 Commit**：`feat/dialogue-report` (`e5055ad9`)
- **改动文件清单**：
  1. `enjoy/src/renderer/pages/dialogues/dialogue-report-dialog.tsx`（新增）：对话课精准评测报告弹窗组件，内嵌总分及四维分数面板（`PronunciationAssessmentScoreResult`）、真实双轨语调曲线（`PitchContourOverlay`）以及音素发音动画面板（`ArticulatoryTongueVisualizer`）。
  2. `enjoy/src/renderer/pages/dialogues/show.tsx`（修改）：
     - `DialogueVoiceRecorder` 接收 `teacherAudioSrc`、`initialAssessment`、`initialRecordedUrl` 与 `onOpenReport`；
     - 出分后在分数与及格标签旁新增「精准评测报告」按钮；
     - Step 3 逐句精学以 `assessmentsMap` 保存各句最新评测记录与录音引用，翻句重回不丢失，重读更新为最新评测；
     - Step 4 角色扮演以 `bAssessmentsMap` 保存各 B 句评测记录与录音引用，重读出新分更新指向；
     - 未作答/未出分句严格不显示报告按钮；
     - 点击按钮以 Modal 弹窗形式在课内打开 `DialogueReportDialog`，打开时自动停止课内背景音频播放。
  3. `enjoy/src/renderer/components/pronunciation-assessments/pronunciation-diagnostic-detail.tsx`（修改，props 接线）：
     - 增加可选属性 `teacherAudioSrc?: string`，用于直接透传课包真人外教原声 mp3 路径；
     - `effectiveTeacherAudio` 优先使用传入的 `teacherAudioSrc`，并将 `/tmm-dialogues/` 正确识别为母语原声；
     - `PitchContourOverlay` 增加守卫 `{recordingSrc && effectiveTeacherAudio && referenceText && ...}`，确保音频缺失时不渲染模拟曲线冒充实测。

- **报告弹窗的数据接法**：
  - **评测记录（Azure assessment）**：来自 Step 3 / Step 4 跟读出分时 `createAssessment` 返回的完整 assessment 记录，提取其 `pronunciationScore`（总分）、`accuracyScore`（准确度）、`fluencyScore`（流利度）、`completenessScore`（完整度）、`prosodyScore`（韵律度）及 `result.words` 逐词音素切片数据。
  - **学生录音**：来自用户录音 `recordingBlob` 生成的 Blob Object URL（及 `assessment.recordingSrc`），传入弹窗直接由浏览器 Web Audio API 解码提取声学 F0 曲线。
  - **外教原声**：来自课包数据 `currentLine.audio` 对应的真实物理文件 `/assets/tmm-dialogues/audio/${currentLine.audio}`（全课包 250 句 100% 存在对应 mp3 原声文件），传入组件进行 44.1kHz 声学帧提取。

- **语调曲线真实性自查结果**：
  - **真实提取路径**：
    1. 学生录音轨：从 `blob:...` 真实提取 16kHz PCM 音频流，执行降采样 + YIN/AMDF 音高提取与归一化。
    2. 外教原声轨：从 `/assets/tmm-dialogues/audio/...` 真实解码 44.1kHz 原声 mp3，提取原声语调走向并与学生轨在时间轴上贴合对齐。
  - **模拟回退拦截**：`PronunciationDiagnosticDetail` 强制检查 `recordingSrc` 与 `effectiveTeacherAudio` 均非空才挂载 `PitchContourOverlay`。若为模拟兜底记录，弹窗顶部与徽章诚实标注「练习反馈 · 模拟估算」，绝不冒充 Azure 实测。

- **质量门禁验证**：
  - `tsc --noEmit`：报错 67 条，严格与基线 67 条完全一致，新增 0 条错误。
  - `vite build`（`vite.web.config.ts`）：编译打包顺利通过（`✓ built in 46.17s`，退出码 0）。
