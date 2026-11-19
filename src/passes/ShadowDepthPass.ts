import { RenderContext, RenderPass } from '../core/RenderPass';
import { ShaderProgram } from '../core/ShaderProgram';

const DEPTH_VS = `#version 300 es
layout(location = 0) in vec3 aPosition;
uniform mat4 uLightViewProj;
uniform mat4 uModel;
void main() {
  gl_Position = uLightViewProj * uModel * vec4(aPosition, 1.0);
}`;

const DEPTH_FS = `#version 300 es
precision highp float;
void main() {
  // 深度自动写入 DEPTH_ATTACHMENT，无需颜色输出
}`;

export class ShadowDepthPass implements RenderPass {
  public readonly name = 'ShadowDepthPass';
  public enabled = true;
  private shader: ShaderProgram;

  constructor(gl: WebGL2RenderingContext, private shadowFboKey = 'shadowMap') {
    this.shader = new ShaderProgram(gl, DEPTH_VS, DEPTH_FS);
  }

  public execute(ctx: RenderContext): void {
    const { gl, meshes, lightViewProjMatrix, framebuffers, canvasWidth, canvasHeight } = ctx;
    const shadowFbo = framebuffers.get(this.shadowFboKey);
    if (!shadowFbo) throw new Error(`Missing framebuffer: ${this.shadowFboKey}`);

    shadowFbo.bind();
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // 剔除正面减少 Shadow Acne，执行后务必恢复 BACK
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);

    this.shader.use();
    this.shader.setMat4('uLightViewProj', lightViewProjMatrix);

    for (const mesh of meshes) {
      if (!mesh.castShadow) continue;
      this.shader.setMat4('uModel', mesh.modelMatrix);
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    gl.bindVertexArray(null);
    gl.cullFace(gl.BACK);
    shadowFbo.unbind(canvasWidth, canvasHeight);
  }
}
