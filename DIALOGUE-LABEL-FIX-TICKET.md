# 工单（补丁）：语调曲线教师轨图例改美音口径

派工人：Echo（经 Roger 2026-10-31 点选「顺手改对：教师轨图例与『听牛津原声』按钮改成美音原声口径」）
分支：**feat/dialogue-inline-pitch**（在内嵌工单的 commit 之后追加一个 commit；不要切新分支、不要动内嵌工单的改动）

## 病灶（Echo 已定位，文件 enjoy/src/renderer/components/pronunciation-assessments/pitch-contour-overlay.tsx）

- 约 191 行：`isTmmNative = teacherAudioSrc.includes("/tmm/")` → 图例「外教母语原声标准声调 (GB 44.1kHz)」、按钮「听外教原声」。
- 约 193 行：`isOxfordNative = !includes("/tmm/") && !includes("/tts")` → 图例「牛津原版标准声调 (GB Oxford)」、按钮「听牛津原声」（约 200 行与 476 行）。
- 对话课课包音频路径是 `/assets/tmm-dialogues/audio/...`，不含 `/tmm/`，于是被误判成 Oxford——但课包是 TMM **美音 D004** 原声，标 GB 是错的。

## 改法（只改这一个文件，只加一个分支）

1. 新增判断 `isTmmDialoguesNative = Boolean(teacherAudioSrc && teacherAudioSrc.includes("/tmm-dialogues/"))`。
2. `isOxfordNative` 的条件里排除 `/tmm-dialogues/`（不得与新判断重叠）。
3. 图例文案（effectiveTeacherLabel）：新分支排在最前 → **「外教美音原声标准声调 (US 44.1kHz)」**。
4. 播放按钮文案（约 476 行）：新分支 → **「听美音原声」**。
5. 其余三个既有分支（/tmm/ 的 GB 外教原声、Oxford 兜底、/tts 的英音示范）**一字不动**——/tmm/ 是旧英音资产，GB 标注对它们是对的。

## 铁律

- 只改 pitch-contour-overlay.tsx 这一个文件；不改曲线提取/渲染逻辑、不改 props。
- 文件读写全走 command；不自跑 Playwright；不合并 main、不 push、不部署。
- tsc（仓库本地二进制）不得新增错误；vite build 须通过。
- 完工在本工单末尾追加完成说明（commit、改动行、tsc/build 结果），然后停下等 Echo 验收（与内嵌工单同轮验收）。


---

## 完成说明

- **分支与 Commit**：
  - 分支：`feat/dialogue-inline-pitch`
  - Commit：`fix(dialogue): 语调曲线教师轨图例与试听按钮改为美音原声口径`
- **改动文件与改动行**：
  - 文件：`enjoy/src/renderer/components/pronunciation-assessments/pitch-contour-overlay.tsx`
  - 约 190-205 行：
    1. 新增 `isTmmDialoguesNative = Boolean(teacherAudioSrc && teacherAudioSrc.includes("/tmm-dialogues/"))`；
    2. `isOxfordNative` 条件中增加 `!teacherAudioSrc.includes("/tmm-dialogues/")`，排除 `/tmm-dialogues/`；
    3. `effectiveTeacherLabel` 最前置首分支加入 `isTmmDialoguesNative ? "外教美音原声标准声调 (US 44.1kHz)" :`，其余 `/tmm/` GB 44.1kHz、Oxford 与 `/tts` 三个既有分支一字不动。
  - 约 480 行：
    4. 试听按钮文案首分支加入美音：`{isTmmDialoguesNative ? "听美音原声" : isTmmNative ? "听外教原声" : isOxfordNative ? "听牛津原声" : "听外教示范"}`。
- **质量门禁验证结果**：
  - `tsc --noEmit`：本地 TypeScript 5.8.2 检查无新增错误（与基线 67 条完全一致，目标文件 0 错误）。
  - `vite build`：生产打包通过（`vite.web.config.ts` 耗时 41.9s，exit code 0）。
