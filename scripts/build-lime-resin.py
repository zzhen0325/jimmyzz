"""Sculpted translucent lime speech bubble. Blender 4.2, homepage Y-up."""
import bpy, math, bmesh
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/lime-resin';OUT.mkdir(parents=True,exist_ok=True)
ASSET=ROOT/'public/assets/models/material-studies/lime-resin-bubble.glb'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
m=bpy.data.materials.new('study-lime-resin');m.use_nodes=True
p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for k,v in [('Base Color',(.82,1,.12,1)),('Roughness',.19),('Metallic',0),('Transmission Weight',.88),('IOR',1.46),('Coat Weight',.65),('Coat Roughness',.095)]:p.inputs[k].default_value=v
volume=m.node_tree.nodes.new('ShaderNodeVolumeAbsorption');volume.inputs['Color'].default_value=(.75,.95,.06,1);volume.inputs['Density'].default_value=.95
m.node_tree.links.new(volume.outputs[0],next(n for n in m.node_tree.nodes if n.type=='OUTPUT_MATERIAL').inputs['Volume'])

def smooth(o):
 for f in o.data.polygons:f.use_smooth=True
 return o

def activate(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o

# Ellipsoid shell is fully curved on front, sides and rear.
bpy.ops.mesh.primitive_uv_sphere_add(segments=128,ring_count=80)
body=bpy.context.object;body.name='Continuous resin bubble';body.scale=(1.24,.58,.24);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
# Curved tapered tail with elliptical cross sections, fused into the oval.
verts=[];faces=[];N=36;R=30
for i in range(R):
 t=i/(R-1);x=.78+.23*t+.075*math.sin(t*math.pi);y=-.35-.44*t;z=-.025+.018*math.sin(t*math.pi)
 w=.19*(1-t)**.8+.002;d=.12*(1-t)**.8+.002
 for j in range(N):
  a=j*math.tau/N;verts.append((x+w*math.cos(a),y,z+d*math.sin(a)))
for i in range(R-1):
 for j in range(N):faces.append((i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j))
faces.extend([tuple(reversed(range(N))),tuple((R-1)*N+j for j in range(N))])
me=bpy.data.meshes.new('Flowing tail');me.from_pydata(verts,[],faces);me.update();tail=bpy.data.objects.new('Flowing tail',me);bpy.context.collection.objects.link(tail)
bm=bmesh.new();bm.from_mesh(tail.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(tail.data);bm.free()
activate(body);tail.select_set(True);bpy.ops.object.join();body.data.remesh_voxel_size=.009;bpy.ops.object.voxel_remesh();print('REMESH',len(body.data.polygons),flush=True)
mod=body.modifiers.new('Melt tail into oval','SMOOTH');mod.factor=.8;mod.iterations=7;bpy.ops.object.modifier_apply(modifier=mod.name);smooth(body);body.data.materials.append(m)
# Smooth incisions are sculpted directly into the continuous front surface.
# Distance to strokes controls groove depth, so there are no open Boolean cuts.
paths=[]
for dx in [-.32,.31]:
 paths.append([(dx-.20,.22),(dx+.23,.22),(dx-.25,-.22),(dx+.17,-.22)])
for sign in [-1,1]:
 paths.append([(sign*(.83+.17*math.sin(t*math.pi)),.25-.49*t) for t in [i/32 for i in range(33)]])
def distance(x,y,a,b):
 vx=b[0]-a[0];vy=b[1]-a[1];t=max(0,min(1,((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy)))
 return math.hypot(x-a[0]-t*vx,y-a[1]-t*vy)
for v in body.data.vertices:
 if v.co.z<.06:continue
 d=min(distance(v.co.x,v.co.y,a,b) for path in paths for a,b in zip(path,path[1:]))
 if d<.065:v.co.z-=.027*math.exp(-(d/.025)**4)
mod=body.modifiers.new('Web mesh','DECIMATE');mod.ratio=.16;bpy.ops.object.modifier_apply(modifier=mod.name);smooth(body)
assert len(body.data.polygons)>1000, 'Empty sculpture export'
activate(body);bpy.ops.export_scene.gltf(filepath=str(ASSET),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_animations=False)
# Neutral studio with large softboxes, same transparent material preserved in the .blend.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.world.use_nodes=True;bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.72,.75,.67,1);bg.inputs[1].default_value=.65
bpy.ops.object.camera_add(location=(.75,.65,5));cam=bpy.context.object;direction=(Vector((0,-.06,0))-cam.location).normalized();right=direction.cross(Vector((0,1,0))).normalized();up=right.cross(direction);cam.rotation_euler=Matrix((right,up,-direction)).transposed().to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.15;scene.camera=cam
for loc,power,w,h in [((-2,3,3),330,4,2),((3,1,2),220,1,3),((-2,-1,-2),300,3,2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='RECTANGLE';light.data.size=w;light.data.size_y=h;light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
# Ground gives a legible neutral reflection through the translucent volume.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-1));ground=bpy.context.object;ground.name='Studio background'
gray=bpy.data.materials.new('Neutral warm background');gray.diffuse_color=(.7,.71,.69,1);ground.data.materials.append(gray)
scene.view_settings.view_transform='AgX';scene.render.film_transparent=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lime-resin-bubble.blend'))
scene.render.filepath=str(OUT/'lime-resin-bubble.png');bpy.ops.render.render(write_still=True)
print('EXPORTED lime-resin-bubble',len(body.data.polygons),'faces')
