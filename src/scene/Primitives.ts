import { SceneMesh } from '../core/RenderPass';
import { mat4 } from '../core/mat4';

// 最小测试几何体（地面平面 + 立方体 VAO/VBO）。
// 与两个 Pass 的 shader 对齐的约定：
// - 顶点布局：location 0 = aPosition (vec3)，location 1 = aNormal (vec3)
// - 索引类型：UNSIGNED_SHORT（两个 Pass 均按此调用 drawElements）
// - 地面平面：castShadow = false（只接收阴影，不投射）；立方体：castShadow = true
// - modelMatrix 由 main.ts 每帧更新（旋转立方体），此处只给初始矩阵

function buildMesh(
  gl: WebGL2RenderingContext,
  positions: number[],
  normals: number[],
  indices: number[],
  baseColor: [number, number, number],
  castShadow: boolean,
): SceneMesh {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('Failed to create VAO');

  gl.bindVertexArray(vao);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return {
    vao,
    indexCount: indices.length,
    modelMatrix: mat4.identity(),
    baseColor,
    castShadow,
  };
}

export function createPlaneMesh(gl: WebGL2RenderingContext): SceneMesh {
  // 20×20 地面，y = 0，法线朝上。绕序取 (0,2,1),(0,3,2) 使正面朝上，
  // 否则 MainLightingPass 的背面剔除会把地面裁掉。
  const half = 10;
  const positions = [
    -half, 0, -half,
    half, 0, -half,
    half, 0, half,
    -half, 0, half,
  ];
  const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  const indices = [0, 2, 1, 0, 3, 2];
  return buildMesh(gl, positions, normals, indices, [0.38, 0.42, 0.46], false);
}

export function createCubeMesh(gl: WebGL2RenderingContext): SceneMesh {
  // 边长 1 的立方体，中心在原点；每面 4 个顶点（面法线），共 24 顶点、36 索引。
  // 每面绕序均为外法线方向的逆时针，背面剔除下六面都可见。
  const h = 0.5;
  const faces: { corners: number[][]; normal: [number, number, number] }[] = [
    // +x
    {
      corners: [[h, -h, -h], [h, h, -h], [h, h, h], [h, -h, h]],
      normal: [1, 0, 0],
    },
    // -x
    {
      corners: [[-h, -h, h], [-h, h, h], [-h, h, -h], [-h, -h, -h]],
      normal: [-1, 0, 0],
    },
    // +y
    {
      corners: [[-h, h, -h], [-h, h, h], [h, h, h], [h, h, -h]],
      normal: [0, 1, 0],
    },
    // -y
    {
      corners: [[-h, -h, h], [-h, -h, -h], [h, -h, -h], [h, -h, h]],
      normal: [0, -1, 0],
    },
    // +z
    {
      corners: [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]],
      normal: [0, 0, 1],
    },
    // -z
    {
      corners: [[h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h]],
      normal: [0, 0, -1],
    },
  ];

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (const face of faces) {
    const base = positions.length / 3;
    for (const c of face.corners) {
      positions.push(c[0], c[1], c[2]);
      normals.push(face.normal[0], face.normal[1], face.normal[2]);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return buildMesh(gl, positions, normals, indices, [0.85, 0.45, 0.25], true);
}
