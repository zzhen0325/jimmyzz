"""18 volumetric reference studies. Blender 4.2+, Y-up/+Z-front.
Build: Blender -b --python scripts/build-material-studies.py
Outputs self-contained GLBs, editable Blender scene and material preview sheets.
"""
import bpy, math, random
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/material-studies';OUT.mkdir(parents=True,exist_ok=True)
ASSETS=ROOT/'public/assets/models/material-studies';ASSETS.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
random.seed(32)
def mat(name,color,rough=.3,metal=0,coat=0,trans=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 for key,value in [('Base Color',(*color,1)),('Roughness',rough),('Metallic',metal),('Coat Weight',coat),('Coat Roughness',.12),('Transmission Weight',trans),('IOR',1.47)]:p.inputs[key].default_value=value
 return m
mats={
 'pearl':mat('study-pearl',(.57,.43,.92),.23,.25,.65),
 'lemon':mat('study-lemon',(.78,.84,.20),.55,0,.08),
 'mint':mat('study-mint',(.08,.72,.33),.22,0,.55),
 'chrome':mat('study-chrome',(.86,.9,.93),.14,1),
 'pink':mat('study-pink',(.8,.22,.49),.27,0,.5),
 'aqua':mat('study-aqua',(.28,.7,.58),.32,0,.25),
 'coral':mat('study-coral',(.65,.095,.035),.22,0,.7),
 'cobalt':mat('study-cobalt',(.004,.045,.42),.2,.15,.7),
 'cloth':mat('study-cloth',(.23,.48,.68),.88),
 'orange':mat('study-orange',(.95,.32,.018),.28,0,.35),
 'blue-ice':mat('study-blue-ice',(.012,.07,.65),.18,.04,.7,.22),
 'glass':mat('study-glass',(.98,.99,1),.06,0,.2,1),
 'amber':mat('study-amber',(1,.43,.12),.075,0,.3,1),
}
# A visible woven surface, retained as a packed normal map in the exported GLB.
S=256;pixels=[]
for y in range(S):
 for x in range(S):
  u=x/16*math.tau;v=y/16*math.tau
  nx=.28*math.cos(u)*(1+.3*math.sin(v));ny=.28*math.cos(v)*(1+.3*math.sin(u));nz=1
  l=math.sqrt(nx*nx+ny*ny+nz*nz);pixels.extend((nx/l*.5+.5,ny/l*.5+.5,nz/l*.5+.5,1))
weave=bpy.data.images.new('Woven blue textile normal',width=S,height=S);weave.colorspace_settings.name='Non-Color';weave.pixels=pixels;weave.pack()
p=next(n for n in mats['cloth'].node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Sheen Weight'].default_value=.65
nodes=mats['cloth'].node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=weave;normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65
mats['cloth'].node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);mats['cloth'].node_tree.links.new(normal.outputs['Normal'],p.inputs['Normal'])
# Fine wrinkles on the blue resin and a quiet skin grain on the orange plastic.
for key,strength in [('blue-ice',.4),('orange',.10)]:
    pixels=[]
    for y in range(S):
        for x in range(S):
            u=x/S*math.tau;v=y/S*math.tau
            nx=.35*math.sin(u*19+math.sin(v*11)*2)+.15*math.sin(u*43+v*17)
            ny=.35*math.cos(v*23+math.sin(u*13)*2)+.15*math.cos(v*37-u*21)
            l=math.sqrt(nx*nx+ny*ny+1);pixels.extend((nx/l*.5+.5,ny/l*.5+.5,1/l*.5+.5,1))
    image=bpy.data.images.new(key+' fine relief',width=S,height=S);image.colorspace_settings.name='Non-Color';image.pixels=pixels;image.pack()
    nodes=mats[key].node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=image;normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=strength
    mats[key].node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);mats[key].node_tree.links.new(normal.outputs['Normal'],next(n for n in nodes if n.type=='BSDF_PRINCIPLED').inputs['Normal'])
models={}
def smooth(o):
 for p in o.data.polygons:p.use_smooth=True
 return o

def sphere(pos,scale):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=pos);o=bpy.context.object;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return smooth(o)

def tube(points,radii,segments=12):
 pts=[Vector(p) for p in points];verts=[];faces=[]
 for i,p in enumerate(pts):
  tangent=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized();ref=Vector((0,0,1))
  if abs(tangent.dot(ref))>.92:ref=Vector((0,1,0))
  a=tangent.cross(ref).normalized();b=tangent.cross(a).normalized();r=radii[i] if isinstance(radii,list) else radii
  for j in range(segments):
   t=j*math.tau/segments;verts.append(tuple(p+r*(a*math.cos(t)+b*math.sin(t))))
 for i in range(len(pts)-1):
  for j in range(segments):faces.append((i*segments+j,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,(i+1)*segments+j))
 faces.extend([tuple(reversed(range(segments))),tuple((len(pts)-1)*segments+j for j in range(segments))])
 me=bpy.data.meshes.new('Swept volume');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Swept volume',me);bpy.context.collection.objects.link(o);return smooth(o)

def curve(points,r=.12):
 c=bpy.data.curves.new('Organic branch','CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=3;c.use_fill_caps=True
 s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new('Organic branch',c);bpy.context.collection.objects.link(o)
 return [o,sphere(points[0],(r,r,r)),sphere(points[-1],(r,r,r))]

def finish(name,parts,material,fuse=True,voxel=.045):
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.object;o.name=name
 if fuse:
  o.data.remesh_voxel_size=voxel;bpy.ops.object.voxel_remesh()
  m=o.modifiers.new('Organic surface relaxation','SMOOTH');m.factor=.8;m.iterations=5;bpy.ops.object.modifier_apply(modifier=m.name)
 m=o.modifiers.new('Web surface','DECIMATE');m.ratio=.48 if fuse else .7;bpy.ops.object.modifier_apply(modifier=m.name)
 smooth(o);o.data.materials.clear();o.data.materials.append(mats[material])
 # World-space parametric UVs keep the textile weave fine and consistent.
 if material in ['cloth','blue-ice','orange']:
  uv=o.data.uv_layers.new(name='Woven surface UV')
  for face in o.data.polygons:
   for li in face.loop_indices:
    v=o.data.vertices[o.data.loops[li].vertex_index].co
    uv.data[li].uv=(math.atan2(v.z,v.x)/math.tau*5,v.y*2)
 if material=='pearl':
  attr=o.data.color_attributes.new(name='Pearlescent patches',type='FLOAT_COLOR',domain='CORNER')
  lavender=Vector((.42,.31,.86));lime=Vector((.67,.85,.2));aqua=Vector((.40,.76,.66))
  for loop in o.data.loops:
   v=o.data.vertices[loop.vertex_index].co
   f=math.sin(v.x*7+v.z*3)*math.cos(v.y*6-v.x*2)
   col=lavender.lerp(aqua,max(0,1-abs(f)*2)*.8).lerp(lime,max(0,f)**1.3)
   attr.data[loop.index].color=(*col,1)
  nodes=mats[material].node_tree.nodes;vc=nodes.new('ShaderNodeVertexColor');vc.layer_name=attr.name
  mats[material].node_tree.links.new(vc.outputs['Color'],next(n for n in nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'])
 models[name]=o
 return o
# 01 Perforated, inflated lattice: real holes between intersecting organic tubes.
parts=[]
for k in range(4):
 x=-.83+k*.55
 parts+=curve([(x+.08*math.sin(j),-1+j*.4,.1*math.sin(j+k)) for j in range(6)],.20)
for k in range(4):
 y=-.8+k*.53
 parts+=curve([(-1+j*.4,y+.08*math.sin(j+k),.09*math.cos(j)) for j in range(6)],.20)
finish('iridescent-lattice',parts,'pearl',voxel=.035)
# 02 yellow bulb, 06 branching molecule, 09 yellow bead chain.
finish('lemon-bulb',[sphere((.25,.45,0),(.48,.48,.42)),sphere((-.15,.05,0),(.3,.37,.25)),sphere((-.4,-.35,0),(.27,.13,.2)),sphere((-.3,.6,0),(.16,.16,.16))],'lemon')
parts=[sphere((0,0,0),(.24,.26,.24))]
for end in [(-.55,.16,.08),(.2,.5,-.05),(.4,-.1,0),(0,-.58,0)]:parts+=curve([(0,0,0),end],.12);parts.append(sphere(end,(.18,.18,.18)))
finish('lemon-molecule',parts,'lemon')
finish('lemon-chain',[sphere((.20*math.sin(i*1.1),-.85+i*.3,.10*math.cos(i)),(.20,.22,.19)) for i in range(7)]+[sphere((-.35,-.88,0),(.3,.19,.2))],'lemon')
# 03 mint radial soft spikes with three-dimensional arms.
parts=[sphere((0,0,0),(.30,.30,.30))]
for i in range(10):
 a=i*math.tau/10;end=(.92*math.cos(a),.92*math.sin(a),.24*math.sin(i*2.1))
 parts+=curve([(0,0,0),(end[0]*.6,end[1]*.6,end[2]+.08),end],.15)
parts+=curve([(0,0,0),(.2,-.15,.72)],.16)
finish('mint-starburst',parts,'mint')
# 04 silver liquid pebble; 05 pink flowing volume.
finish('chrome-pebble',[sphere((-.4,0,0),(.62,.42,.4)),sphere((.28,.08,.04),(.58,.48,.36)),sphere((.65,-.24,0),(.38,.36,.3))],'chrome',voxel=.035)
parts=[sphere((0,-.38,0),(.72,.65,.5)),sphere((-.25,.38,.05),(.48,.69,.4)),sphere((.57,-.6,0),(.43,.4,.35)),sphere((-.65,-.66,.1),(.44,.42,.4)),sphere((.32,.02,.2),(.4,.32,.38))]
for i in range(7):
 a=i*2.4;parts.append(sphere((.25*math.sin(a),-.6+i*.23,.25+.06*math.cos(a)),(.22,.24,.20)))
finish('pink-soft-blob',parts,'pink',voxel=.04)
# 07 mint folded tube.
pts=[(.43*math.sin(t*math.tau*2.7),.9-1.8*t,.12*math.cos(t*math.tau*2.7)) for t in [i/100 for i in range(101)]]
finish('aqua-squiggle',[tube(pts,[.018+.05*math.sin(math.pi*i/100)**.25 for i in range(101)])],'aqua',False)
# 08 coral pleated helix. Ribbed cross-section travels along a tapering spiral.
verts=[];faces=[];N=320;K=32
for i in range(N):
 t=i/(N-1);a=t*math.tau*2.6;R=.60*(1-.40*t);center=Vector((R*math.cos(a),-1.35+2.7*t,.38*math.sin(a)))
 tangent=Vector((-R*math.sin(a)*16,2.7,.38*math.cos(a)*16)).normalized();u=Vector((math.cos(a),0,math.sin(a)));v=tangent.cross(u).normalized()
 for j in range(K):
  b=j*math.tau/K;r=(.40*(1-.55*t))*(1+.14*math.sin(a*24+b*.4));p=center+u*(r*math.cos(b))+v*(r*.68*math.sin(b));verts.append(tuple(p))
for i in range(N-1):
 for j in range(K):faces.append((i*K+j,i*K+(j+1)%K,(i+1)*K+(j+1)%K,(i+1)*K+j))
faces += [tuple(reversed(range(K))),tuple((N-1)*K+j for j in range(K))]
me=bpy.data.meshes.new('Pleated ceramic helix');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Pleated helix',me);bpy.context.collection.objects.link(o)
finish('coral-pleated-tower',[o],'coral',False)
# Second board: glossy cobalt twist.
pts=[];rs=[]
for i in range(150):
 t=i/149;a=t*math.tau*3.5;r=.26*math.sin(math.pi*t)**.7;pts.append((r*math.cos(a),1.1-2.2*t,r*math.sin(a)));rs.append(.015+.21*math.sin(math.pi*t)**.6)
finish('cobalt-twist',[tube(pts,rs,16)],'cobalt',True,.035)
# Soft blue textile forms.
finish('cloth-cloud',[sphere((0,0,0),(.58,.58,.5)),sphere((-.24,.34,0),(.3,.4,.32)),sphere((.3,.31,0),(.24,.36,.3)),sphere((.72,-.05,0),(.29,.38,.28))],'cloth')
parts=[sphere((0,-.35,0),(.59,.40,.34))]
for i in range(3):parts+=curve([(-.36+i*.36,-.25,0),(-.31+i*.36,.35,.04),(-.24+i*.36,.90-i*.10,.03)],.12)
finish('cloth-three-prong',parts,'cloth')
# Orange soft pendant with bulb head, two arms and bulb foot.
parts=[sphere((0,.57,0),(.48,.48,.46)),sphere((.02,-.76,0),(.3,.33,.3))]
parts+=curve([(0,.30,0),(-.03,-.24,.06),(.02,-.64,0)],.15)
parts+=curve([(-.2,.45,0),(-.28,-.02,.10),(-.43,-.2,.13)],.12)
parts+=curve([(.20,.46,.04),(.32,.10,.18),(.65,-.02,.17)],.13)
finish('orange-pendant',parts,'orange')
# Polished chrome curl.
pts=[(.42*math.sin(t*math.tau*1.75),-.85+1.7*t,.24*math.cos(t*math.tau*1.75)) for t in [i/100 for i in range(101)]]
finish('chrome-curl',[tube(pts,[.04+.16*math.sin(math.pi*i/100)**.3 for i in range(101)],16)],'chrome',True,.035)
# Bumpy blue glass/resin seed.
parts=[sphere((.05,0,0),(.58,.5,.44))]
for i in range(13):
 a=i*2.4;parts.append(sphere((.48*math.cos(a),.40*math.sin(a),.26*math.sin(i*1.6)),(.22,.23,.23)))
parts+=curve([(-.48,0,0),(-.78,.02,0),(-1,.05,.02)],.085)
finish('blue-resin-seed',parts,'blue-ice',True,.035)
# Clear glass rounded clover, a real closed volume.
finish('clear-glass-clover',[sphere((0,0,0),(.35,.35,.32))]+[sphere((.28*math.cos(i*math.tau/4),.28*math.sin(i*math.tau/4),.08*math.sin(i)),(.30,.30,.26)) for i in range(4)],'glass',True,.035)
# Cobalt coral branch: rounded tips and continuous blended junctions.
parts=curve([(-1,-.68,0),(-.35,-.26,.01),(.32,.15,0),(.86,.33,.03)],.12)
for pts in [[(-.42,-.28,0),(-.46,.13,.02),(-.56,.51,.02)],[(-.1,-.08,0),(.05,.42,0),(-.02,.83,.02)],[(.24,.08,0),(.38,.6,.03),(.35,.89,.01)],[(-.08,-.05,.02),(.45,-.22,.01),(.68,-.48,0)]]:parts+=curve(pts,.105)
finish('cobalt-branch',parts,'cobalt',True,.035)
# Amber turned glass spindle: bulging lathed shells with slender necks.
profile=[(-1.3,.005),(-1.20,.10),(-1.08,.23),(-.96,.31),(-.79,.33),(-.63,.26),(-.54,.09),(-.46,.09),(-.38,.18),(-.23,.23),(-.1,.12),(.02,.10),(.10,.31),(.25,.40),(.42,.38),(.57,.27),(.63,.06),(.98,.045),(1.04,.19),(1.17,.25),(1.32,.19),(1.37,.005)]
verts=[];faces=[];K=64
for x,r in profile:
 for j in range(K):
  a=j*math.tau/K;verts.append((x,r*math.cos(a),r*math.sin(a)))
for i in range(len(profile)-1):
 for j in range(K):faces.append((i*K+j,i*K+(j+1)%K,(i+1)*K+(j+1)%K,(i+1)*K+j))
faces += [tuple(reversed(range(K))),tuple((len(profile)-1)*K+j for j in range(K))]
me=bpy.data.meshes.new('Lathed amber spindle');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Amber spindle',me);bpy.context.collection.objects.link(o)
bpy.context.view_layer.objects.active=o;o.select_set(True);sub=o.modifiers.new('Glass curvature','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
finish('amber-glass-spindle',[o],'amber',False)
# Normalize each exported model to a stable, centered two-unit longest dimension.
for name,o in models.items():
 bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bounds=[o.matrix_world@Vector(v) for v in o.bound_box];lo=Vector(tuple(min(v[i] for v in bounds) for i in range(3)));hi=Vector(tuple(max(v[i] for v in bounds) for i in range(3)));center=(lo+hi)/2;scale=2/max(hi-lo)
 for v in o.data.vertices:v.co=(o.matrix_world@v.co-center)*scale
 o.matrix_world=Matrix.Identity(4)
 bpy.ops.export_scene.gltf(filepath=str(ASSETS/f'{name}.glb'),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_animations=False)
 print('EXPORTED_STUDY',name,len(o.data.polygons))
# Contact sheet in a neutral studio with environment reflections.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
world=bpy.data.worlds.new('Material studio');world.use_nodes=True;scene.world=world
nodes=world.node_tree.nodes;bg=next(n for n in nodes if n.type=='BACKGROUND');env=nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(ROOT/'public/assets/environments/bg.jpg'));world.node_tree.links.new(env.outputs['Color'],bg.inputs['Color']);bg.inputs['Strength'].default_value=.65
bpy.ops.object.camera_add(location=(0,0,18));cam=bpy.context.object;cam.rotation_euler=(0,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=9;scene.camera=cam
# Camera local -Z faces the scene, +Y is up.
for pos,power,size in [((-4,6,7),650,5),((5,2,5),450,4),((-2,-4,3),220,3)]:
 bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.size=size;light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1500;scene.render.resolution_y=1500;scene.render.resolution_percentage=100;scene.render.film_transparent=True
names=list(models)
# Keep a usable edit scene with spaced, named objects.
for i,(name,o) in enumerate(models.items()):o.location=((i%6-2.5)*2.8,(1-i//6)*2.8,0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'material-studies.blend'))
for page in range(2):
 for i,(name,o) in enumerate(models.items()):
  o.hide_render=not(page*9<=i<(page+1)*9)
  if not o.hide_render:
   k=i%9;o.location=((k%3-1)*2.7,(1-k//3)*2.7,0);o.rotation_euler=(.12,-.17,-.12 if k%2 else .10)
 scene.render.filepath=str(OUT/f'board-{page+1}.png');bpy.ops.render.render(write_still=True)
