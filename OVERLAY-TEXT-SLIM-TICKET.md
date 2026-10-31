# 工单（补丁）：语调曲线教师轨文案精简（听原声 / 原声标准声调）

派工人：Echo（经 Roger 2026-10-31 22:12 直接指示：「听外教原声改为听原声，外教母语原声标准声调 (GB 44.1kHz) 改为原声标准声调」）
分支：**feat/cabin-slim**（在纠错舱精简工单的 commit 之后追加一个 commit；不要切新分支）
文件：只改 `enjoy/src/renderer/components/pronunciation-assessments/pitch-contour-overlay.tsx`。

## 改动（只换字符串，不动判断逻辑与结构）

1. isTmmNative 分支（/tmm/ 英音课包）：
   - 图例 effectiveTeacherLabel：「外教母语原声标准声调 (GB 44.1kHz)」→ **「原声标准声调」**
   - 播放按钮：「听外教原声」→ **「听原声」**
2. isTmmDialoguesNative 分支（/tmm-dialogues/ 美音课包，今晚刚加）：按同一极简口径统一（Echo 已向 Roger 明示此判断）：
   - 图例：「外教美音原声标准声调 (US 44.1kHz)」→ **「原声标准声调」**
   - 播放按钮：「听美音原声」→ **「听原声」**
3. 不动：isOxfordNative 分支（「牛津原版标准声调 (GB Oxford)」「听牛津原声」）、tts 分支（「外教 GB 标准声调 (纯正英音)」「听外教示范」）、学生轨图例「我的录音实际声调」、语调匹配度、提示语、曲线提取/渲染逻辑、分支条件本身（isTmmNative 等判断可能被别处引用，只换这两个分支的字符串输出）。

## 追加项（Roger 2026-10-31 22:14 已点选：全 App 都删）

3. 删除曲线说明句「蓝线（外教标准声调）与粉线（学员实际发音声调）在同一时间轴上的起伏贴合度」整个元素。该组件全 App 共用，直接在组件里删即全 App 生效（纠错舱预览、对话课内嵌卡、报告弹窗都删）。标题「双轨语调走势叠图对比」、语调匹配度、提示语、两条图例保留不动。

## 铁律

- 文件读写全走 command；不自跑 Playwright；不合并 main、不 push、不部署。
- tsc（仓库本地二进制）不得新增错误；vite build 须通过。
- 完工在本工单末尾追加完成说明（commit、改动字符串清单、tsc/build 结果），然后停下等 Echo 验收（与纠错舱精简同轮验收）。


---

## 施工完成说明

- **分支名**：`feat/cabin-slim`
- **提交信息**：`fix(pitch-contour): 语调曲线教师轨文案精简为原声口径并删除全App曲线说明句`
- **Commit**：`9d7ae561ee6ea238fe4d749433be79f9ea5def30`
- **落点文件**：`enjoy/src/renderer/components/pronunciation-assessments/pitch-contour-overlay.tsx`
- **改动字符串清单**：
  1. **isTmmNative 分支（/tmm/ 英音课包）**：
     - 图例 `effectiveTeacherLabel`：「外教母语原声标准声调 (GB 44.1kHz)」→ **「原声标准声调」**
     - 播放按钮：「听外教原声」→ **「听原声」**
  2. **isTmmDialoguesNative 分支（/tmm-dialogues/ 美音课包）**：
     - 图例 `effectiveTeacherLabel`：「外教美音原声标准声调 (US 44.1kHz)」→ **「原声标准声调」**
     - 播放按钮：「听美音原声」→ **「听原声」**
  3. **全 App 曲线说明句整句删除**：
     - 删除了 `<p className="text-[11px] text-muted-foreground font-medium mt-0.5">蓝线（外教标准声调）与粉线（学员实际发音声调）在同一时间轴上的起伏贴合度</p>` 整个元素。
     - 标题「双轨语调走势叠图对比 (Pitch Contour Overlay)」、语调匹配度徽章、提示语及两条图例（原声/录音）完整保留。
  4. **保持不动**：
     - `isOxfordNative` 分支（「牛津原版标准声调 (GB Oxford)」「听牛津原声」）
     - `tts` 分支（「外教 GB 标准声调 (纯正英音)」「听外教示范」）
     - 学生轨图例「我的录音实际声调」
     - 语调匹配度计算、提示语生成、曲线提取与渲染逻辑
- **验证与构建结果**：
  - **tsc 类型检查**：运行 `./node_modules/.bin/tsc --noEmit`，报错 67 条（与基线 67 条完全一致，改动文件零新增错误）；
  - **vite web build 构建**：运行 `node ../.yarn/releases/yarn-4.6.0.cjs vite build --config vite.web.config.ts`，构建成功（耗时 ~40s，exit code 0）；
  - **铁律遵循**：文件读写全走 command，未使用专用文件工具；不自跑 Playwright；未合并 main，未 push，未部署。
