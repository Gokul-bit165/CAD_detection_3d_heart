import bpy, bmesh, math, random
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HEART = 'FinalHeartScan3dec'

# view -> (forward, right, up) of an orthographic reference camera
VIEWS = {
    'ant':  (Vector((0, 1, 0)),  Vector((1, 0, 0)),  Vector((0, 0, 1))),
    'post': (Vector((0, -1, 0)), Vector((-1, 0, 0)), Vector((0, 0, 1))),
    'left': (Vector((-1, 0, 0)), Vector((0, 1, 0)),  Vector((0, 0, 1))),   # camera on +X (patient left)
    'right': (Vector((1, 0, 0)), Vector((0, -1, 0)), Vector((0, 0, 1))),   # camera on -X (patient right)
    'inf':  (Vector((0, 0, 1)),  Vector((-1, 0, 0)), Vector((0, 1, 0))),   # camera below, looking up
}


def centerline_from_world(bvh, wpts, spacing=1.0, noise=0.25, seed=1, r_ref=1.0, smooth=2, offset_scale=0.2):
    cr = catmull(wpts, spacing)
    rnd = random.Random(seed)
    n = len(cr)
    ph1, ph2 = rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)
    out = []
    for i, p in enumerate(cr):
        loc, nor = snap(bvh, p, 0)
        t = (cr[min(i + 1, n - 1)] - cr[max(i - 1, 0)])
        t = t.normalized() if t.length > 0 else Vector((0, 0, 1))
        side = nor.cross(t).normalized()
        w = noise * (math.sin(i * 0.18 + ph1) + 0.5 * math.sin(i * 0.43 + ph2))
        out.append(loc + side * w)
    for _ in range(smooth):
        sm = [out[0]]
        for i in range(1, n - 1):
            sm.append((out[i - 1] + 2 * out[i] + out[i + 1]) / 4)
        sm.append(out[-1]); out = sm
    return [snap(bvh, p, -r_ref * offset_scale)[0] for p in out]


def get_bvh(name=HEART):
    o = bpy.data.objects[name]
    dg = bpy.context.evaluated_depsgraph_get()
    return BVHTree.FromObject(o, dg)


def set_cam(view, c, S):
    """c = (u, v) image-plane centre in world coords (right-axis, up-axis)."""
    cam = bpy.data.objects['RefCam']
    f, r, u = VIEWS[view]
    centre = Vector((0, 0, 0))
    # place camera 600 units behind the centre along -forward; keep the depth coordinate at 0
    depth_axis = f
    pos = r * c[0] + u * c[1] - f * 600
    cam.location = pos
    m = Matrix((r, u, -f)).transposed()          # camera looks along -Z local
    cam.rotation_euler = m.to_euler()
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = S
    cam.data.clip_start = 1; cam.data.clip_end = 2000
    bpy.context.scene.camera = cam
    bpy.app.driver_namespace['view'] = (view, c, S)


def px2ray(view, c, S, px, py, W=1000):
    f, r, u = VIEWS[view]
    a = c[0] + (px - W / 2) / W * S
    b = c[1] - (py - W / 2) / W * S
    org = r * a + u * b - f * 600
    return org, f


def project(bvh, view, c, S, pts_px):
    out = []
    for px, py in pts_px:
        org, d = px2ray(view, c, S, px, py)
        h = bvh.ray_cast(org, d)
        if h[0] is None:
            continue
        out.append((h[0].copy(), h[1].copy()))
    return out


def catmull(pts, spacing):
    P = [Vector(p) for p in pts]
    if len(P) < 3:
        P2 = P
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    res = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int((p2 - p1).length / spacing))
        for k in range(n):
            t = k / n
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
            res.append(q)
    res.append(P[-2])
    return res


def resample(pts, spacing):
    out = [pts[0]]
    acc = 0
    for i in range(1, len(pts)):
        seg = (pts[i] - pts[i - 1]).length
        acc += seg
        if acc >= spacing:
            out.append(pts[i]); acc = 0
    if (out[-1] - pts[-1]).length > 1e-4:
        out.append(pts[-1])
    return out


def snap(bvh, p, off):
    loc, nor, idx, dist = bvh.find_nearest(p)
    return loc + nor * off, nor


class Path:
    """centre line with per-point radius and along-value"""
    def __init__(self, pts, r0, r1, name='', parent=None, parent_t=None):
        self.pts = pts; self.r0 = r0; self.r1 = r1; self.name = name
        self.parent = parent; self.parent_t = parent_t


def build_centerline(bvh, view, c, S, px_pts, spacing=1.0, noise=0.25, seed=1, offset_scale=0.35, r_ref=1.0, smooth=2, extra_pts=None):
    hits = project(bvh, view, c, S, px_pts)
    pts = [h[0] for h in hits]
    if extra_pts:
        pts = extra_pts + pts
    cr = catmull(pts, spacing)
    rnd = random.Random(seed)
    # low-frequency tangential noise
    n = len(cr)
    ph1, ph2 = rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)
    out = []
    for i, p in enumerate(cr):
        loc, nor = snap(bvh, p, 0)
        t = (cr[min(i + 1, n - 1)] - cr[max(i - 1, 0)])
        t = t.normalized() if t.length > 0 else Vector((0, 0, 1))
        side = nor.cross(t).normalized()
        w = noise * (math.sin(i * 0.18 + ph1) + 0.5 * math.sin(i * 0.43 + ph2))
        out.append(loc + side * w)
    for _ in range(smooth):
        sm = [out[0]]
        for i in range(1, n - 1):
            sm.append((out[i - 1] + 2 * out[i] + out[i + 1]) / 4)
        sm.append(out[-1]); out = sm
    # drop onto the surface with offset
    final = []
    for p in out:
        q, nor = snap(bvh, p, r_ref * (-offset_scale))   # negative = embed? see below
        final.append(q)
    return final


def tube(bm, pts, radii, along, seg=12, cap_start=True, cap_end=True, lay=None):
    """Append a tube to bmesh. Returns list of ring vert lists."""
    n = len(pts)
    # parallel transport frames
    tang = []
    for i in range(n):
        t = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        tang.append(t.normalized())
    ref = Vector((0, 0, 1))
    if abs(tang[0].dot(ref)) > 0.9:
        ref = Vector((1, 0, 0))
    nrm = (ref - tang[0] * ref.dot(tang[0])).normalized()
    rings = []
    for i in range(n):
        if i > 0:
            nrm = (nrm - tang[i] * nrm.dot(tang[i]))
            nrm = nrm.normalized()
        bi = tang[i].cross(nrm)
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            co = pts[i] + (nrm * math.cos(a) + bi * math.sin(a)) * radii[i]
            v = bm.verts.new(co)
            v[lay] = along[i]
            ring.append(v)
        rings.append(ring)
    for i in range(n - 1):
        for k in range(seg):
            a, b = rings[i][k], rings[i][(k + 1) % seg]
            c2, d = rings[i + 1][(k + 1) % seg], rings[i + 1][k]
            bm.faces.new((a, b, c2, d))
    for flag, ring, idx in ((cap_start, rings[0], 0), (cap_end, rings[-1], n - 1)):
        if flag:
            cv = bm.verts.new(pts[idx]); cv[lay] = along[idx]
            for k in range(seg):
                if idx == 0:
                    bm.faces.new((cv, ring[(k + 1) % seg], ring[k]))
                else:
                    bm.faces.new((cv, ring[k], ring[(k + 1) % seg]))
    return rings


def length_param(pts):
    L = [0.0]
    for i in range(1, len(pts)):
        L.append(L[-1] + (pts[i] - pts[i - 1]).length)
    return L


def build_tree(name, bvh, trunk, branches, seg=12, mat=None, rnd_seed=0):
    """trunk: dict(pts, r0, r1). branches: list of dict(parent: 'trunk' or index, t: 0..1 position on parent, pts, r0, r1).
    pts are world-space centre lines (already on surface). Writes 'along' colour attribute."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    lay = bm.verts.layers.float.new('along_tmp')
    rnd = random.Random(rnd_seed)
    paths = []

    def prof(n, r0, r1, seed):
        rr = random.Random(seed)
        ph = rr.uniform(0, 6.28)
        res = []
        for i in range(n):
            t = i / max(n - 1, 1)
            # tapering with mild noise
            r = r0 * (1 - t) ** 0.7 * 0.0 + (r0 + (r1 - r0) * (t ** 0.8))
            r *= 1 + 0.07 * math.sin(i * 0.35 + ph) + 0.03 * math.sin(i * 1.1 + ph * 2)
            res.append(r)
        return res

    tpts = trunk['pts']
    tL = length_param(tpts); Ttot = tL[-1]
    trunk_along = [l / Ttot for l in tL]
    trad = prof(len(tpts), trunk['r0'], trunk['r1'], rnd_seed + 1)
    tube(bm, tpts, trad, trunk_along, seg=seg, cap_start=True, cap_end=True, lay=lay)
    paths.append((tpts, trad, trunk_along))
    for bi, b in enumerate(branches):
        par = paths[0] if b['parent'] == 'trunk' else paths[b['parent'] + 1]
        ppts, prad, palong = par
        # junction on parent
        pl = length_param(ppts)
        target = b.get('t', 0.5) * pl[-1]
        j = min(range(len(ppts)), key=lambda i: abs(pl[i] - target))
        jpt = ppts[j]
        pts = [jpt] + list(b['pts'])
        L = length_param(pts)
        a0 = palong[j]
        along = [min(1.0, a0 + l / Ttot) for l in L]
        rad = prof(len(pts), b['r0'], b['r1'], rnd_seed + 10 + bi)
        # flare at the junction so the branch root swallows its parent wall
        for i in range(len(rad)):
            rad[i] *= 1 + 0.35 * math.exp(-L[i] / 2.5)
        # start slightly inside the parent so that no gap shows
        tube(bm, pts, rad, along, seg=seg, cap_start=False, cap_end=True, lay=lay)
        paths.append((pts, rad, along))
    bm.verts.ensure_lookup_table()
    # write the along value into a colour attribute (red channel), first and only colour layer
    bm.to_mesh(mesh)
    vals = np.zeros(len(mesh.vertices), np.float32)
    for v in bm.verts:
        vals[v.index] = v[lay]
    bm.free()
    if 'along_tmp' in mesh.attributes:
        mesh.attributes.remove(mesh.attributes['along_tmp'])
    ca = mesh.color_attributes.new('along', 'FLOAT_COLOR', 'POINT')
    rgba = np.stack([vals, np.zeros_like(vals), np.zeros_like(vals), np.ones_like(vals)], axis=1)
    ca.data.foreach_set('color', rgba.flatten())
    mesh.shade_smooth() if hasattr(mesh, 'shade_smooth') else None
    for p in mesh.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    return obj
