import { Framebuffer } from './core/Framebuffer';
import { PassQueue, RenderContext, SceneMesh } from './core/RenderPass';
import { ShadowDepthPass } from './passes/ShadowDepthPass';
import { MainLightingPass } from './passes/MainLightingPass';

function bootstrap(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { antialias: true });
  if (!gl) throw new Error('WebGL2 not supported');

  // canvas 实际像素尺寸跟随 CSS 尺寸，否则默认 300x150 会被拉伸
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // 1. 初始化离屏 Shadow FBO (1024x1024 深度纹理)
  const framebuffers = new Map<string, Framebuffer>();
  framebuffers.set('shadowMap', new Framebuffer(gl, {
    width: 1024,
    height: 1024,
    withColor: false,
    withDepthTexture: true,
  }));

  // 2. 构建顺序执行 Pass 队列
  const pipeline = new PassQueue()
    .addPass(new ShadowDepthPass(gl, 'shadowMap'))
    .addPass(new MainLightingPass(gl, 'shadowMap'));

  // 3. 准备测试场景（地面平面 + 旋转立方体，由 Primitives.ts 生成）
  // TODO(Devin 任务 1)：接入 createPlaneMesh(gl) / createCubeMesh(gl)，
  // 并补轻量矩阵计算（或引入 gl-matrix），替换下面 render() 里的单位矩阵占位。
  const meshes: SceneMesh[] = []; // createPlaneMesh(gl), createCubeMesh(gl)...

  function render(timeMs: number) {
    // 更新立方体旋转矩阵、相机矩阵与正交光源视图投影矩阵...
    void timeMs;
    const ctx: RenderContext = {
      gl: gl!,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      viewProjMatrix: new Float32Array(16),
      lightViewProjMatrix: new Float32Array(16),
      lightDirection: [-0.5, -1.0, -0.4],
      meshes,
      framebuffers,
    };

    pipeline.executeAll(ctx);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

const canvas = document.getElementById('gl-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element #gl-canvas not found');
}
bootstrap(canvas);
