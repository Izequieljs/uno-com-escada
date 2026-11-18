// Carro fantasma (passe de transparentes): holograma azulado com realce de Fresnel e fade de proximidade.
#include mesh_vert
#include fwd_common
fn shade(in: V2F, ff: bool) -> vec4f {
  var N = normalize(in.nrm); if (!ff) { N = -N; }
  let V = normalize(F.camPos.xyz - in.wpos);
  let nv = max(dot(N, V), 1e-3);
  let fr = pow(1.0 - nv, 2.0);
  let fade = O.p0.x;
  let col = mix(vec3f(0.10, 0.45, 0.85), vec3f(0.55, 0.92, 1.0), fr) * (0.55 + 0.45 * sat(N.y * 0.5 + 0.5));
  let a = (0.13 + 0.42 * fr) * fade;
  return vec4f(col * a, a);
}
