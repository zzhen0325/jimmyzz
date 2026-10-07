"""Continuous bird sculpture and two new reference props; Blender 4.2."""
import bpy, math, bmesh
from pathlib import Path
from mathutils import Vector, Matrix, noise
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/refined-sculptures';OUT.mkdir(parents=True,exist_ok=True)
ASSETS=ROOT/'public/assets/models/material-studies'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'output/home-figma-models/home-props.blend'))

def smooth(o):
 for p in o.data.polygons:p.use_smooth=True
 return o

def fuse(parts,name,voxel=.018):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.hide_set(False);o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.object;o.name=name
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.remesh_voxel_size=voxel;bpy.ops.object.voxel_remesh()
 m=o.modifiers.new('Continuous sculpt surface','SMOOTH');m.factor=.8;m.iterations=9;bpy.ops.object.modifier_apply(modifier=m.name)
 m=o.modifiers.new('Surface topology','DECIMATE');m.ratio=.45;bpy.ops.object.modifier_apply(modifier=m.name)
 return smooth(o)

def export(root,path):
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in root.children_recursive:o.select_set(True);o.hide_render=False
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_animations=False)

bird=bpy.data.objects['bird-courier']
parts=[o for o in bird.children_recursive if o.name.startswith(('White bird','Far raised wing','Near swept wing','Far wing feather','Near wing feather','Tail feather'))]
fuse(parts,'Bird — seamless body wings and tail',.014)
parts=[o for o in bird.children_recursive if o.name.startswith(('Postman body','Postman big head','Left arm','Right arm'))]
fuse(parts,'Postman continuous sculpt',.013)
export(bird,ROOT/'public/assets/models/figma-symbols/bird-courier.glb')
# Discard other old props from this editable scene.
for o in list(bpy.data.objects):
 if o!=bird and o not in bird.children_recursive and o.type not in ['LIGHT','CAMERA']:bpy.data.objects.remove(o,do_unlink=True)

def mat(name,col,rough,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*col,1)
 p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 p.inputs['Coat Weight'].default_value=.5
 return m
chrome=mat('study-liquid-chrome',(.88,.9,.93),.085,1)
lemon=mat('study-lemon-peel',(.95,.58,.018),.43)
red=mat('study-cherry-lacquer',(.65,.001,.035),.17,.15)

def sphere(name,pos,scale,m,seg=48,rings=32):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=pos);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return smooth(o)
def curve(name,pts,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16;c.bevel_depth=r;c.bevel_resolution=4;c.use_fill_caps=True
 s=c.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
 for p,v in zip(s.bezier_points,pts):p.co=v;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o

def root(name,parts):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o)
 for p in parts:p.parent=o
 return o
# Lemon: real displaced peel with tapering poles, packed tangent-space pore detail.
o=sphere('Dimpled whole lemon',(0,0,0),(.68,1,.65),lemon,128,96)
for v in o.data.vertices:
 q=v.co.copy();n=Vector((q.x/.68**2,q.y,q.z/.65**2)).normalized()
 taper=1-.10*abs(q.y)**3;v.co.x*=taper;v.co.z*=taper
 v.co+=n*(.011*noise.noise_vector(q*65).x+.007*noise.noise_vector(q*22).y)
S=256;pix=[]
for y in range(S):
 for x in range(S):
  u=x/S*math.tau;v=y/S*math.tau;grain=noise.noise_vector(Vector((math.cos(u)*math.sin(v/2),math.cos(v/2),math.sin(u)*math.sin(v/2)))*110);a=grain.x*.7;b=grain.y*.7;l=math.sqrt(1+a*a+b*b);pix.extend((a/l*.5+.5,b/l*.5+.5,1/l*.5+.5,1))
im=bpy.data.images.new('Lemon pores normal',width=S,height=S);im.colorspace_settings.name='Non-Color';im.pixels=pix;im.pack()
nodes=lemon.node_tree.nodes;t=nodes.new('ShaderNodeTexImage');t.image=im;n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.5;lemon.node_tree.links.new(t.outputs['Color'],n.inputs['Color']);lemon.node_tree.links.new(n.outputs['Normal'],next(n for n in nodes if n.type=='BSDF_PRINCIPLED').inputs['Normal'])
# Dual of a triangular sphere gives rounded polygon cells wrapping all sides.
bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=2,radius=1)
centers={f:(f.calc_center_median().normalized()+noise.noise_vector(f.calc_center_median()*8)*.055).normalized() for f in bm.faces}
def surface(v,extra=.025):return (v.x*(.69+extra)*(1-.10*abs(v.y)**3),v.y*(1.025+extra),v.z*(.66+extra)*(1-.10*abs(v.y)**3))
net=[]
for edge in bm.edges:
 a,b=[centers[f] for f in edge.link_faces];mid=(a+b).normalized();net.append(curve('Liquid chrome cell border',[surface(a),surface(mid),surface(b)],.024+.015*abs(noise.noise_vector(mid*9).x),chrome))
for v in centers.values():net.append(sphere('Liquid junction',surface(v),(.034,.034,.034),chrome,16,12))
net=fuse(net,'Continuous liquid metal cage',.018)
drip=sphere('Chrome droplet',(.02,-1.09,.01),(.075,.17,.075),chrome)
lemonroot=root('chrome-wrapped-lemon',[o,net,drip]);export(lemonroot,ASSETS/'chrome-wrapped-lemon.glb')
# Chess knight: a variable elliptical loft forms the S-curved chest, neck and muzzle.
# Cross sections change in both width and depth; no planar silhouette extrusion.
sections=[(-.10,-.72,.36,.25),(.02,-.57,.37,.25),(.17,-.39,.34,.23),(.12,-.18,.30,.21),(-.12,.06,.28,.20),(-.28,.30,.24,.19),(-.25,.52,.23,.19),(-.12,.71,.27,.20),(.07,.78,.30,.21),(.27,.67,.27,.19),(.40,.50,.20,.16),(.43,.35,.15,.14)]
# Catmull-Rom interpolation for a smooth curved volume.
def cat(a,b,c,d,t):return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
pts=[]
for i in range(len(sections)-1):
 for j in range(8):
  pts.append(tuple(cat(sections[max(i-1,0)][k],sections[i][k],sections[i+1][k],sections[min(i+2,len(sections)-1)][k],j/8) for k in range(4)))
pts.append(sections[-1]);verts=[];faces=[];N=48
for i,(x,y,w,d) in enumerate(pts):
 a=pts[max(0,i-1)];b=pts[min(len(pts)-1,i+1)];t=Vector((b[0]-a[0],b[1]-a[1],0)).normalized();side=Vector((t.y,-t.x,0))
 for j in range(N):
  v=Vector((x,y,0))+side*w*math.cos(j*math.tau/N)+Vector((0,0,d*math.sin(j*math.tau/N)));verts.append(tuple(v))
for i in range(len(pts)-1):
 for j in range(N):faces.append((i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j))
faces.extend([tuple(reversed(range(N))),tuple((len(pts)-1)*N+j for j in range(N))])
me=bpy.data.meshes.new('Sculpted knight volume');me.from_pydata(verts,[],faces);me.update();horse=bpy.data.objects.new('Knight curved chest and head',me);bpy.context.collection.objects.link(horse);horse.data.materials.append(red)
parts=[horse]
for z in [-.135,.135]:
 bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.115,radius2=.008,depth=.33,location=(-.11,.98,z),rotation=(-math.pi/2,0,-.20));ear=bpy.context.object;ear.data.materials.append(red);parts.append(ear)
parts.append(sphere('Knight oval plinth',(0,-.83,0),(.62,.19,.44),red))
parts.append(sphere('Knight base rim',(0,-.96,0),(.63,.055,.45),red))
# Low continuous mane ridge fused into the back of the neck.
parts.append(curve('Raised mane',[(-.20,-.33,0),(-.32,-.03,0),(-.46,.34,0),(-.36,.64,0),(-.19,.84,0)],.07,red))
horse=fuse(parts,'One-piece sculpted lacquer knight',.012)
# Recess the eyes rather than attaching eyeballs.
for z in [-.205,.205]:
 cutter=sphere('Eye recess cutter',(.15,.72,z),(.042,.037,.045),red,24,16)
 bpy.context.view_layer.objects.active=horse;m=horse.modifiers.new('Sculpted eye socket','BOOLEAN');m.operation='DIFFERENCE';m.object=cutter;bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cutter,do_unlink=True)
knight=root('cherry-chess-knight',[horse]);export(knight,ASSETS/'cherry-chess-knight.glb')
# Neutral studio previews, separate views for each editable sculpture.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.use_nodes=True;next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.24,.27,.32,1);next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs[1].default_value=.5
cam=scene.camera;cam.location=(2,1,7);direction=(-cam.location).normalized();right=direction.cross(Vector((0,1,0))).normalized();up=right.cross(direction);cam.rotation_euler=Matrix((right,up,-direction)).transposed().to_euler()
models=[bird,lemonroot,knight]
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'refined-home-sculptures.blend'))
for selected in models:
 for r in models:
  for c in r.children_recursive:c.hide_render=r!=selected
 cam.data.ortho_scale=3.65 if selected==bird else 2.8
 scene.render.filepath=str(OUT/f'{selected.name}.png');bpy.ops.render.render(write_still=True)
print('COMPLETED seamless bird and 2 reference sculptures')
