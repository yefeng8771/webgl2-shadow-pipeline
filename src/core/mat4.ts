// 自带轻量 mat4 工具（列主序，与 WebGL uniformMatrix4fv transpose=false 对齐）。
// 不引入 gl-matrix：保持“零重型渲染引擎依赖”的定位，接口只覆盖本管线用到的部分。

export type Vec3 = [number, number, number];

export const mat4 = {
  identity(): Float32Array {
    const out = new Float32Array(16);
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[15] = 1;
    return out;
  },

  /** 返回 a * b（列主序）。 */
  multiply(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + r] * b[c * 4 + k];
        }
        out[c * 4 + r] = sum;
      }
    }
    return out;
  },

  translation(x: number, y: number, z: number): Float32Array {
    const out = mat4.identity();
    out[12] = x;
    out[13] = y;
    out[14] = z;
    return out;
  },

  rotationY(angle: number): Float32Array {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const out = mat4.identity();
    out[0] = c;
    out[2] = -s;
    out[8] = s;
    out[10] = c;
    return out;
  },

  perspective(fovy: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1 / Math.tan(fovy / 2);
    const out = new Float32Array(16);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  },

  ortho(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
  ): Float32Array {
    const out = new Float32Array(16);
    out[0] = 2 / (right - left);
    out[5] = 2 / (top - bottom);
    out[10] = -2 / (far - near);
    out[12] = -(right + left) / (right - left);
    out[13] = -(top + bottom) / (top - bottom);
    out[14] = -(far + near) / (far - near);
    out[15] = 1;
    return out;
  },

  lookAt(eye: Vec3, center: Vec3, up: Vec3): Float32Array {
    const z = normalize3([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
    const x = normalize3(cross3(up, z));
    const y = cross3(z, x);
    const out = new Float32Array(16);
    out[0] = x[0];
    out[1] = y[0];
    out[2] = z[0];
    out[4] = x[1];
    out[5] = y[1];
    out[6] = z[1];
    out[8] = x[2];
    out[9] = y[2];
    out[10] = z[2];
    out[12] = -dot3(x, eye);
    out[13] = -dot3(y, eye);
    out[14] = -dot3(z, eye);
    out[15] = 1;
    return out;
  },
};

function normalize3(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
