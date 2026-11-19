import { Framebuffer } from './core/Framebuffer';
import { PassQueue, RenderContext, SceneMesh } from './core/RenderPass';
import { mat4, Vec3 } from './core/mat4';
import { ShadowDepthPass } from './passes/ShadowDepthPass';
import { MainLightingPass } from './passes/MainLightingPass';
import { createCubeMesh, createPlaneMesh } from './scene/Primitives';

const LIGHT_DIRECTION: Vec3 = [-0.5, -1.0, -0.4];
const CAMERA_EYE: Vec3 = [7, 5.5, 9];
const CAMERA_TARGET: Vec3 = [0, 0.8, 0];

// 3 个旋转立方体：位置（y = 0.5 使底面贴地）、颜色、角速度（弧度/秒）各不相同，
// 阴影随旋转实时变化，便于肉眼验证。
const CUBES: { position: Vec3; color: [number, number, number]; speed: number; phase: number }[] = [
  { position: [-2.4, 0.5, 0.6], color: [0.85, 0.45, 0.25], speed: 0.6, phase: 0 },
  { position: [0, 0.5, -1.6], color: [0.25, 0.6, 0.85], speed: -0.45, phase: 1.1 },
  { position: [2.4, 0.5, 0.9], color: [0.45, 0.8, 0.35], speed: 0.9, phase: 2.2 },
];

function bootstrap(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { antialias: true });
  if (!gl) throw new Error('WebGL2 not supported');

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

  // 3. 准备测试场景：1 个地面平面 + 3 个旋转立方体
  const plane = createPlaneMesh(gl);
  const cubes = CUBES.map((cfg) => {
    const mesh = createCubeMesh(gl);
    mesh.baseColor = cfg.color;
    return mesh;
  });
  const meshes: SceneMesh[] = [plane, ...cubes];

  // 光源矩阵：光源放在 -lightDirection 方向 14 单位处，正交投影覆盖 ±9 的场景范围。
  const lightLen = Math.hypot(LIGHT_DIRECTION[0], LIGHT_DIRECTION[1], LIGHT_DIRECTION[2]);
  const lightDirN: Vec3 = [
    LIGHT_DIRECTION[0] / lightLen,
    LIGHT_DIRECTION[1] / lightLen,
    LIGHT_DIRECTION[2] / lightLen,
  ];
  const lightEye: Vec3 = [-lightDirN[0] * 14, -lightDirN[1] * 14, -lightDirN[2] * 14];
  const lightViewProjMatrix = mat4.multiply(
    mat4.ortho(-9, 9, -9, 9, 0.1, 30),
    mat4.lookAt(lightEye, [0, 0, 0], [0, 1, 0]),
  );

  function render(timeMs: number) {
    // canvas 实际像素尺寸跟随 CSS 尺寸，否则默认 300x150 会被拉伸
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    const timeSec = timeMs / 1000;
    for (let i = 0; i < cubes.length; i++) {
      const cfg = CUBES[i];
      cubes[i].modelMatrix = mat4.multiply(
        mat4.translation(cfg.position[0], cfg.position[1], cfg.position[2]),
        mat4.rotationY(timeSec * cfg.speed + cfg.phase),
      );
    }

    const viewProjMatrix = mat4.multiply(
      mat4.perspective((45 * Math.PI) / 180, canvas.width / canvas.height, 0.1, 100),
      mat4.lookAt(CAMERA_EYE, CAMERA_TARGET, [0, 1, 0]),
    );

    const ctx: RenderContext = {
      gl: gl!,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      viewProjMatrix,
      lightViewProjMatrix,
      lightDirection: LIGHT_DIRECTION,
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
