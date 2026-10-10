import sys, json, numpy as np, trimesh
S=sys.argv[1]
scan = trimesh.load(S+'/scan200k.glb', force='mesh')
sc = trimesh.Scene(); sc.add_geometry(scan, node_name='Heart_Scan', geom_name='Heart_Scan'); sc.export('frontend/public/models/heart-scan.glb')
R=np.array([0.3,0.1,0.0]); A=np.array([-0.7,-1.05,0.0])
up=(R-A)/np.linalg.norm(R-A)
ant=np.array([0,0,1.0]); ant-=up*ant.dot(up); ant/=np.linalg.norm(ant)
lat=np.cross(up,ant); lat = lat if lat[0]<0 else -lat   # +lat = apex (left-ventricle) side
ray=trimesh.ray.ray_triangle.RayMeshIntersector(scan)
def pt(t,phi_deg):
    phi=np.radians(phi_deg); ax=A+t*(R-A)
    d=np.cos(phi)*ant+np.sin(phi)*lat
    loc,_,tri=ray.intersects_location([ax+d*4],[-d],multiple_hits=False)
    if not len(loc): return None
    n=scan.face_normals[tri[0]]; n=n if n.dot(d)>0 else -n
    return (loc[0]+n*0.03).round(3).tolist()
spec={
 'LAD':[(0.78,12),(0.62,14),(0.48,16),(0.34,16),(0.2,14),(0.08,10),(0.0,5)],
 'LCX':[(0.78,25),(0.70,50),(0.66,75),(0.62,100),(0.60,125),(0.58,150)],
 'RCA':[(0.80,-20),(0.72,-45),(0.66,-75),(0.62,-105),(0.55,-135),(0.42,-160),(0.3,-175)],
}
out={k:[p for p in (pt(t,f) for t,f in v) if p] for k,v in spec.items()}
json.dump(out,open(S+'/seed.json','w')); print({k:len(v) for k,v in out.items()})
P=[np.array(out[k]) for k in ('LAD','LCX','RCA')]; np.save(S+'/paths.npy',np.array([np.vstack([p]) for p in P],dtype=object),allow_pickle=True)
