# webgl2-shadow-pipeline

TypeScript + 原生 WebGL2 的方向光 Shadow Map 最小渲染管线：**地面平面 + 旋转立方体 + 方向光阴影**的最小闭环。

技术栈：TypeScript + 原生 WebGL2，零重型渲染引擎依赖；数学库可选 gl-matrix 或自带轻量 mat4 工具（待定，见 Devin 任务 1）。开发服务器与构建用 Vite（仅开发依赖，不参与渲染）。

## 目录结构

```text
webgl2-shadow-pipeline/
├── index.html
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── main.ts                # 入口：初始化 WebGL2、场景对象与渲染循环
    ├── core/
    │   ├── RenderPass.ts      # 顺序 Pass 队列与资源上下文定义
    │   ├── Framebuffer.ts     # 离屏 FBO 与深度/颜色纹理封装
    │   └── ShaderProgram.ts   # 着色器编译、链接与 Uniform 缓存
    ├── passes/
    │   ├── ShadowDepthPass.ts # Pass 1：光源视角渲染深度到离屏 FBO
    │   └── MainLightingPass.ts# Pass 2：主相机渲染 + Shadow Map PCF 采样
    └── scene/
        └── Primitives.ts      # 最小测试几何体（地面平面 + 立方体 VAO/VBO）
```

## 架构说明

### Pass 队列（顺序执行）

`PassQueue` 是最直白的顺序执行队列：每帧按注册顺序依次执行各 Pass。`RenderContext` 是显式传递的资源总线，携带 GL 上下文、画布尺寸、相机/光源矩阵、网格列表与 `framebuffers`（按 key 取 FBO）。后续如需依赖驱动的调度，可平滑升级为拓扑排序，Pass 接口不变。

当前管线（`main.ts` 组装）：

1. **ShadowDepthPass** — 从方向光视角把 `castShadow` 的物体写入 `shadowMap` FBO（1024×1024 `DEPTH_COMPONENT24` 深度纹理，无颜色附件）。
2. **MainLightingPass** — 主相机渲染，采样 Shadow Map 做 3×3 PCF 软阴影。

### Pass 约定

- **FBO 状态收口**：`Framebuffer.bind()` / `unbind()` 负责绑定与 viewport 尺寸管理；深度专用 FBO 显式 `drawBuffers([NONE])` 关闭颜色输出。状态不要散落在各 Pass 里。
- **防反馈环**：`PassQueue.executeAll` 在每个 Pass 执行后统一解绑 `TEXTURE0`，避免跨 Pass 残留绑定引发纹理反馈环（Feedback Loop）。
- **Shadow Acne**：`ShadowDepthPass` 执行时剔除正面（`gl.FRONT`），执行后务必恢复 `gl.BACK`；`MainLightingPass` 再叠加角度相关的深度 bias：`max(0.004 * (1 - dot(N, L)), 0.0008)`。
- **阴影采样**：深度纹理用 `sampler2D` + 手动 PCF 偏移采样（`NEAREST` 过滤）；若改用硬件比较采样（`sampler2DShadow`），纹理参数需改为 `COMPARE_REF_TO_TEXTURE`。
- **顶点布局**：`location 0 = aPosition (vec3)`，`location 1 = aNormal (vec3)`；索引类型固定 `UNSIGNED_SHORT`。几何体与 shader 两侧必须对齐。
- **光源空间越界**：`MainLightingPass` 中光源空间坐标超出 [0, 1] 的片元不产生阴影（返回 0）。

## 运行方式

```bash
npm install
npm run dev      # 本地预览（Vite 开发服务器）
npm run build    # tsc 类型检查 + Vite 构建
npm run preview  # 预览构建产物
```

需要支持 WebGL2 的浏览器。

## 当前状态

已完成：`Framebuffer`、`RenderPass`（队列 + 上下文）、`ShaderProgram`、两个 Pass、入口组装与工程配置（`package.json` / `tsconfig.json` / `index.html`）。

待补（Devin 任务 1）：`Primitives.ts` 目前只有函数签名桩（调用即抛 `TODO` 错误）；`main.ts` 里场景网格为空、相机/光源矩阵为占位。跑通前先完成任务 1。

## Devin 任务拆分与验收清单

### 任务 1：补全场景与矩阵，跑通本地预览

补全 `Primitives.ts`（地面平面 + 2~3 个旋转立方体）与轻量矩阵计算（或引入 gl-matrix），在 `main.ts` 中接入网格、每帧更新立方体旋转矩阵与相机/光源视图投影矩阵，跑通 `npm run dev` 本地预览。

### 任务 2：验证 ShadowDepthPass 输出

ShadowDepthPass 正确输出 1024×1024 深度缓冲，无 WebGL2 帧缓冲不完整或纹理反馈环警告。

### 任务 3：验证软阴影效果

MainLightingPass 清晰投射出随立方体旋转而实时变化的软阴影，地面无明显 Shadow Acne 或悬浮脱节（Peter-Panning）。

### 任务 4（可选）：DebugDepthPass

新增一个可选开关的 DebugDepthPass（屏幕左下角缩略图显示深度缓冲），方便后续排查多 Pass 缓冲内容。

## 验收标准（总览）

1. 补全 `ShaderProgram.ts`（已完成）、`Primitives.ts`（地面平面 + 2~3 个旋转立方体）与轻量矩阵计算，跑通 `npm run dev` 本地预览。
2. ShadowDepthPass 正确输出 1024×1024 深度缓冲，无 WebGL2 帧缓冲不完整或纹理反馈环警告。
3. MainLightingPass 清晰投射出随立方体旋转而实时变化的软阴影，地面无明显 Shadow Acne 或悬浮脱节（Peter-Panning）。
4. 新增一个可选开关的 DebugDepthPass（屏幕左下角缩略图显示深度缓冲），方便后续排查多 Pass 缓冲内容。
