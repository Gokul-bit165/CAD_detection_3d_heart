import numpy as np, trimesh, sys, time
from PIL import Image
from scipy.spatial import cKDTree
Image.MAX_IMAGE_PIXELS=None
src, tex, out = sys.argv[1:4]
t=time.time()
m = trimesh.load(src, process=False, force='mesh', skip_materials=True)
print('loaded', len(m.vertices), len(m.faces), time.time()-t)
uv = getattr(m.visual,'uv',None)
print('uv', None if uv is None else uv.shape)
img = np.asarray(Image.open(tex).convert('RGB'))
h,w,_ = img.shape
if uv is not None and len(uv)==len(m.vertices):
    px = np.clip((uv[:,0]*(w-1)).round().astype(int),0,w-1)
    py = np.clip(((1-uv[:,1])*(h-1)).round().astype(int),0,h-1)
    col = img[py,px]
else:
    col = np.full((len(m.vertices),3),180,np.uint8)
verts0 = np.asarray(m.vertices).copy()
import fast_simplification as fs
v,f = fs.simplify(np.asarray(m.vertices,dtype=np.float32), np.asarray(m.faces,dtype=np.int32), target_count=int(sys.argv[4]))
print('decimated', len(v), len(f))
_, idx = cKDTree(verts0).query(v)
c = np.hstack([col[idx], np.full((len(v),1),255,np.uint8)])
mesh = trimesh.Trimesh(v, f, vertex_colors=c, process=False)
mesh.apply_translation(-mesh.bounds.mean(axis=0))
mesh.apply_scale(2.4/ max(mesh.extents))   # ~ same scale as the schematic heart
mesh.export(out)
print('exported', out, mesh.extents)
