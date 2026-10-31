# 工单：AI 发音魔法纠错舱精简（删冗余文字＋取消录音倒计时）

派工人：Echo（经 Roger 2026-10-31 截图圈注指示：图1 圈出部分全部去除、取消录音倒计时 3 秒；图2 圈出文字另行处理，不在本工单内）
基线：main = 64f37039。从 main 切新分支 **feat/cabin-slim** 施工。
主战场：`enjoy/src/renderer/components/pronunciation-assessments/pronunciation-assessment-form.tsx`，顶部标签行可能在 `global-pronunciation-assessment-modal.tsx` 渲染，自己定位。

## 删除清单（只删 UI 呈现，不删功能数据）

1. **顶部来源标签行整行删除**：「今日精读金句 · 大声朗读打卡」「今日推荐金句」两个标签及其容器。删除后纠错舱打开时就用它被唤起时带入的那句（首页金句、独立页、对话课等入口的现有传参行为不变），不再提供来源切换 UI；底层取句逻辑保持默认路径，不要改坏任何入口。
2. **「目标朗读标准句 (Reference Text)」标签删除**（句子本身和中文译文保留）。
3. **「重点关注：/ʃ/ 舌叶清擦音 · 圆唇微翘」整行删除**（重点音素的计算逻辑如被别处用到可留，只删这行呈现）。
4. **外教示范区标题删除**：「外教母语原声示范 (GB 44.1kHz 纯正真人发音)」整行，以及右侧绿色徽章「GB 母语外教原声 (44.1kHz)」删除。**保留**：播放按钮、波形、「蓝点：标准声调走势」小标签、时长显示。
5. 其余未点名文字一律保留：舱标题「AI 发音魔法纠错舱」「音素级声学诊断」徽章、关闭/返回、我的录音区标题、语调匹配度、提示语、提交按钮等都不动。

## 功能改动：取消录音前 3 秒倒计时

- 表单现有 countdown 状态/定时器（约 746–830 行一带）：点击录音后**立即开始录音**（麦克风权限请求流程保留），倒计时的状态、定时器、数字 UI 全部移除干净，不留死代码。
- 录音按钮下方说明文案随之改为与新行为一致的极简文案（如「点击开始录音」），不得再出现"倒计时"字样。
- 录音中、停止、重录（取消重录）、提交评测的既有流程不得回归。

## 铁律

- 本工单**不改** pitch-contour-overlay.tsx 的任何文字（图2 圈出的说明句与图例另有安排）；不改 diagnostic-detail、articulatory-tongue-visualizer。
- 不动评测引擎（createAssessment/Azure/兜底）、分数、记录落库行为。
- 文件读写全走 command；不自跑 Playwright；不合并 main、不 push、不部署。
- tsc（仓库本地二进制）不得新增错误（对照基线）；vite build 须通过。
- 完工在本工单末尾追加完成说明：分支名与 commit、每个删除项的落点文件、倒计时移除方式、tsc/build 结果。然后停下，等 Echo 独立验收。


---

## 施工完成说明

- **分支名**：`feat/cabin-slim`
- **提交信息**：`feat(cabin): 精简AI发音魔法纠错舱UI并取消录音倒计时`
- **Commit**：`544147cc03f131f188bcbee2cc0313f5cd0d512b`
- **每个删除项的落点文件与改动**：
  1. **顶部来源标签行整行删除**：
     - **落点文件**：`enjoy/src/renderer/components/pronunciation-assessments/global-pronunciation-assessment-modal.tsx`
     - **改动说明**：删除了 `SheetHeader` 顶部的来源标签行容器 `<div className="flex items-center gap-2 flex-wrap">`（包含 `badgeInfo` 徽章「今日精读金句 · 大声跟读打卡」与 `options.contextTitle`「今日推荐金句」），移除了未使用的 `getSourceBadge` 函数及相关图标引用；保留了纠错舱标题「AI 发音魔法纠错舱」和「音素级声学诊断」徽章；保留了所有外部入口的传参与取句逻辑。
  2. **「目标朗读标准句 (Reference Text)」标签删除**：
     - **落点文件**：`enjoy/src/renderer/components/pronunciation-assessments/pronunciation-assessment-form.tsx`
     - **改动说明**：删除了 `<span className="text-xs font-bold text-amber-700 dark:text-amber-300">🎯 目标跟读标准句 (Reference Text)</span>` 标签呈现，容器调整为 `justify-end` 保留了右侧「关闭 / 返回」及返回绘本/拼读按钮；目标句子文本 `"{currentRefText}"` 与中文译文完整保留。
  3. **「重点关注：/ʃ/ 舌叶清擦音 · 圆唇微翘」整行删除**：
     - **落点文件**：`enjoy/src/renderer/components/pronunciation-assessments/pronunciation-assessment-form.tsx`
     - **改动说明**：删除了 `{props?.phonicsFocus && (<div ...><span>🎯 重点关注:</span><span>{props.phonicsFocus}</span></div>)}` UI 渲染行；组件 props 保持对 `phonicsFocus` 参数的兼容，不影响调用方。
  4. **外教示范区标题及绿色徽章删除**：
     - **落点文件**：`enjoy/src/renderer/components/pronunciation-assessments/pronunciation-assessment-form.tsx`
     - **改动说明**：删除了左侧外教标题 `<span><Volume2Icon />外教母语原声示范 (GB 44.1kHz 纯正真人发音)...</span>` 整行，删除了右侧绿色徽章 `🇬🇧 GB母语外教原声 (44.1kHz)`，以及未再使用的 `isTmmNative` / `isStoryAudio` / `isOriginalAudio` 局部标记；**严格保留**右侧「蓝点：标准声调走势」小标签以及底下的 `WavesurferPlayer`（播放按钮、声波波形图、走势图及时间戳时长显示）。
- **倒计时移除方式**：
  - **落点文件**：`enjoy/src/renderer/components/pronunciation-assessments/pronunciation-assessment-form.tsx`
  - **改动说明**：
    - 移除了 `countdown` 状态及 `countdownTimerRef` 定时器引用；
    - 移除了 `playCountdownTick` 节拍器提示音与 `cancelCountdown` 函数；
    - 移除了组件卸载时对倒计时定时器的清理逻辑；
    - 将 `handleStartWithCountdown` 改为 `handleStart`：保留原有的麦克风权限请求（`navigator.mediaDevices.getUserMedia`）与授权流程，触发后立即调用 `startRecording()`；
    - 移除了倒计时 3、2、1 的全屏居中数字卡片 UI（`if (countdown !== null)`）；
    - 录音初始按钮文案及 tooltip 提示由「点击录音（3秒倒计时）」/「点击录音（倒计时 3 秒后开始）」统一简化为「点击开始录音」，彻底去除所有"倒计时"字样；
    - 录音中控制（取消录音、暂停/继续、完成录音）、取消重录、双轨对比与提交评测（`form.handleSubmit(onSubmit)`）全链路完整保持。
- **验证与构建结果**：
  - **tsc 类型检查**：运行 `./node_modules/.bin/tsc --noEmit`，报错数为 67 条（与 baseline 基线 67 条完全一致，改动文件零新增错误）；
  - **vite web build 构建**：运行 `node ../.yarn/releases/yarn-4.6.0.cjs vite build --config vite.web.config.ts`，构建成功（耗时 ~42 秒，exit code 0）；
  - **铁律遵循**：未改动 `pitch-contour-overlay.tsx`、`diagnostic-detail`、`articulatory-tongue-visualizer`，未改动评测核心与落库逻辑；未运行 Playwright；未合并 main，未 push，未部署。
