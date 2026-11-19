import { Framebuffer } from './Framebuffer';

export interface SceneMesh {
  vao: WebGLVertexArrayObject;
  indexCount: number;
  modelMatrix: Float32Array;
  baseColor: [number, number, number];
  castShadow: boolean;
}

export interface RenderContext {
  gl: WebGL2RenderingContext;
  canvasWidth: number;
  canvasHeight: number;
  viewProjMatrix: Float32Array;
  lightViewProjMatrix: Float32Array;
  lightDirection: [number, number, number];
  meshes: SceneMesh[];
  framebuffers: Map<string, Framebuffer>;
}

export interface RenderPass {
  readonly name: string;
  readonly enabled: boolean;
  execute(ctx: RenderContext): void;
}

export class PassQueue {
  private passes: RenderPass[] = [];

  public addPass(pass: RenderPass): this {
    this.passes.push(pass);
    return this;
  }

  public executeAll(ctx: RenderContext): void {
    const { gl } = ctx;
    for (const pass of this.passes) {
      if (!pass.enabled) continue;
      pass.execute(ctx);
      // 统一解绑纹理单元，避免跨 Pass 残留绑定引发反馈环（Feedback Loop）
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }
}
