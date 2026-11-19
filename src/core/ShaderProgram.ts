// 着色器编译、链接与 Uniform 位置缓存。
// 接口由各 Pass 的调用点决定：use / setMat4 / setVec3 / setInt。

export class ShaderProgram {
  private program: WebGLProgram;
  private uniformLocations = new Map<string, WebGLUniformLocation | null>();

  constructor(private gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
    const vs = this.compile(gl.VERTEX_SHADER, vertexSource);
    const fs = this.compile(gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create WebGLProgram');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader program link failed: ${info}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    this.program = program;
  }

  private compile(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error('Failed to create WebGLShader');
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${info}`);
    }
    return shader;
  }

  public use(): void {
    this.gl.useProgram(this.program);
  }

  private location(name: string): WebGLUniformLocation | null {
    let loc = this.uniformLocations.get(name);
    if (loc === undefined) {
      loc = this.gl.getUniformLocation(this.program, name);
      this.uniformLocations.set(name, loc);
    }
    return loc;
  }

  public setMat4(name: string, value: Float32Array): void {
    this.gl.uniformMatrix4fv(this.location(name), false, value);
  }

  public setVec3(name: string, value: [number, number, number] | Float32Array): void {
    this.gl.uniform3fv(this.location(name), value);
  }

  public setInt(name: string, value: number): void {
    this.gl.uniform1i(this.location(name), value);
  }
}
