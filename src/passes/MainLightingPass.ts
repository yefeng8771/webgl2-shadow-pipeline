import { RenderContext, RenderPass } from '../core/RenderPass';
import { ShaderProgram } from '../core/ShaderProgram';

const MAIN_VS = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;

uniform mat4 uViewProj;
uniform mat4 uLightViewProj;
uniform mat4 uModel;

out vec3 vWorldNormal;
out vec4 vLightSpacePos;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vWorldNormal = mat3(uModel) * aNormal;
  vLightSpacePos = uLightViewProj * worldPos;
  gl_Position = uViewProj * worldPos;
}`;

const MAIN_FS = `#version 300 es
precision highp float;

in vec3 vWorldNormal;
in vec4 vLightSpacePos;

uniform sampler2D uShadowMap;
uniform vec3 uLightDir;
uniform vec3 uBaseColor;

out vec4 fragColor;

float calcShadowFactor(vec4 lightSpacePos, vec3 normal, vec3 lightDir) {
  vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
  projCoords = projCoords * 0.5 + 0.5; // NDC [-1, 1] -> UV/Depth [0, 1]

  if (projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 ||
      projCoords.y < 0.0 || projCoords.y > 1.0) {
    return 0.0;
  }

  float bias = max(0.004 * (1.0 - dot(normal, lightDir)), 0.0008);
  vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
  float shadow = 0.0;

  // 3x3 PCF 软阴影采样
  for (int x = -1; x <= 1; ++x) {
    for (int y = -1; y <= 1; ++y) {
      float pcfDepth = texture(uShadowMap, projCoords.xy + vec2(x, y) * texelSize).r;
      shadow += (projCoords.z - bias > pcfDepth) ? 1.0 : 0.0;
    }
  }
  return shadow / 9.0;
}

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(-uLightDir);
  float ndotl = max(dot(N, L), 0.0);

  float shadow = calcShadowFactor(vLightSpacePos, N, L);
  vec3 ambient = 0.22 * uBaseColor;
  vec3 diffuse = (1.0 - shadow) * ndotl * uBaseColor;

  fragColor = vec4(ambient + diffuse, 1.0);
}`;

export class MainLightingPass implements RenderPass {
  public readonly name = 'MainLightingPass';
  public enabled = true;
  private shader: ShaderProgram;

  constructor(gl: WebGL2RenderingContext, private shadowFboKey = 'shadowMap') {
    this.shader = new ShaderProgram(gl, MAIN_VS, MAIN_FS);
  }

  public execute(ctx: RenderContext): void {
    const { gl, meshes, viewProjMatrix, lightViewProjMatrix, lightDirection, framebuffers, canvasWidth, canvasHeight } = ctx;
    const shadowFbo = framebuffers.get(this.shadowFboKey);
    if (!shadowFbo?.depthTexture) throw new Error(`Missing depth texture on: ${this.shadowFboKey}`);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0.11, 0.13, 0.16, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    this.shader.use();
    this.shader.setMat4('uViewProj', viewProjMatrix);
    this.shader.setMat4('uLightViewProj', lightViewProjMatrix);
    this.shader.setVec3('uLightDir', lightDirection);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shadowFbo.depthTexture);
    this.shader.setInt('uShadowMap', 0);

    for (const mesh of meshes) {
      this.shader.setMat4('uModel', mesh.modelMatrix);
      this.shader.setVec3('uBaseColor', mesh.baseColor);
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    gl.bindVertexArray(null);
  }
}
