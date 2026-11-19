import { SceneMesh } from '../core/RenderPass';

// TODO(Devin 任务 1)：实现最小测试几何体。
// 约定（与两个 Pass 的 shader 对齐，不可擅自改动）：
// - 顶点布局：location 0 = aPosition (vec3)，location 1 = aNormal (vec3)
// - 索引类型：UNSIGNED_SHORT（两个 Pass 均按此调用 drawElements）
// - 地面平面：castShadow = false（只接收阴影，不投射）；立方体：castShadow = true
// - modelMatrix 由 main.ts 每帧更新（旋转立方体），此处只给初始矩阵
// - 数量：1 个地面平面 + 2~3 个旋转立方体（见 README 验收清单第 1 条）

export function createPlaneMesh(_gl: WebGL2RenderingContext): SceneMesh {
  throw new Error('TODO(Devin 任务 1)：createPlaneMesh 未实现');
}

export function createCubeMesh(_gl: WebGL2RenderingContext): SceneMesh {
  throw new Error('TODO(Devin 任务 1)：createCubeMesh 未实现');
}
