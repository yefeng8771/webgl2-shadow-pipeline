export interface FramebufferOptions {
  width: number;
  height: number;
  withColor?: boolean;
  withDepthTexture?: boolean;
}

export class Framebuffer {
  public readonly fbo: WebGLFramebuffer;
  public readonly width: number;
  public readonly height: number;
  public colorTexture: WebGLTexture | null = null;
  public depthTexture: WebGLTexture | null = null;

  constructor(private gl: WebGL2RenderingContext, opts: FramebufferOptions) {
    this.width = opts.width;
    this.height = opts.height;

    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Failed to create WebGLFramebuffer');
    this.fbo = fbo;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

    if (opts.withColor) {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, this.width, this.height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      this.colorTexture = tex;
    } else {
      // 仅深度 Pass 时显式关闭颜色输出
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
    }

    if (opts.withDepthTexture) {
      const depthTex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, depthTex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, this.width, this.height);
      // 便于在 Shader 中手动做 PCF 偏移采样；若用 sampler2DShadow 可改为 COMPARE_REF_TO_TEXTURE
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);
      this.depthTexture = depthTex;
    }

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  public bind(): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
    this.gl.viewport(0, 0, this.width, this.height);
  }

  public unbind(canvasWidth: number, canvasHeight: number): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, canvasWidth, canvasHeight);
  }
}
