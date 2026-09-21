"""Build Morty's Portal Gun Jr. in Blender, with editable source and GLB export."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'output/portal-gun-jr'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,c,rough=.3,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Coat Weight'].default_value=.22
 return m
shell=mat('Warm grey molded housing',(.63,.66,.65));white=mat('Ivory face',(.85,.87,.79));dark=mat('Charcoal recess',(.035,.044,.047));red=mat('Cherry red plastic',(.8,.016,.033));blue=mat('Blue grip cap',(.018,.29,.49));yellow=mat('Yellow rotary dial',(.98,.67,.024));lime=mat('Portal fluid',(.16,.8,.008),.18);green=mat('Sticker lime',(.42,.86,.19),.65);edge=mat('Sticker mint outline',(.18,.6,.31),.65)
glass=mat('Green transparent reservoir',(.37,.84,.065),.12)
p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.92;p.inputs['IOR'].default_value=1.23
p=lime.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(.12,.55,.002,1);p.inputs['Emission Strength'].default_value=.18
parts=[]
def finish(o,name,m):
 o.name=name;o.data.materials.append(m);parts.append(o)
 return o
def apply(o):
 bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
def bevel(o,r):
 mod=o.modifiers.new('Soft molded edges','BEVEL');mod.width=r;mod.segments=5
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def box(name,pos,size,m,r=.06):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.scale=size;apply(o);finish(o,name,m);bevel(o,r);return o
def sphere(name,pos,size,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=pos);o=bpy.context.object;o.scale=size;apply(o)
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,m)
def cyl(name,pos,r,depth,m,axis='Z'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=pos);o=bpy.context.object
 if axis=='X':o.rotation_euler[1]=math.pi/2
 finish(o,name,m);bevel(o,.018)
 for f in o.data.polygons:f.use_smooth=True
 return o
# Union the body, eye shoulders and grip root into one rounded continuous casting.
body=box('Continuous housing',(0,0,.22),(2.4,1.22,.65),shell,.095)
shoulders=[sphere('Eye shoulder',(.84,y,.54),(.34,.255,.36),shell) for y in [-.37,.37]]
root=sphere('Blended grip root',(-.35,0,-.19),(.39,.36,.27),shell)
bpy.ops.object.select_all(action='DESELECT')
for o in [body,*shoulders,root]:o.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
for o in [*shoulders,root]:parts.remove(o)
mod=body.modifiers.new('Unified casting','REMESH');mod.mode='VOXEL';mod.voxel_size=.022;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=body.modifiers.new('Relax casting transitions','SMOOTH');mod.factor=.65;mod.iterations=5;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=body.modifiers.new('Reduce casting mesh','DECIMATE');mod.ratio=.35;bpy.ops.object.modifier_apply(modifier=mod.name)
for f in body.data.polygons:f.use_smooth=True
# Top panel has a shallow molded reveal, with no oversized stacked slabs.
box('Top panel reveal',(-.14,0,.544),(1.83,1.045,.022),dark,.09)
box('Top inset panel',(-.14,0,.559),(1.80,1.015,.023),white,.08)
# Rounded, closed dome: continuous cylindrical wall and hemispherical crown.
x=-.43;z0=.64;r=.46
cyl('Reservoir red collar',(x,0,.605),.525,.13,red)
profile=[(r,z0),(r,z0+.46)]+[(r*math.cos(t),z0+.46+r*math.sin(t)) for t in [i*math.pi/2/20 for i in range(1,21)]]
verts=[];faces=[];N=64
for rr,z in profile:
 for i in range(N):a=i*2*math.pi/N;verts.append((x+rr*math.cos(a),rr*math.sin(a),z))
for j in range(len(profile)-1):
 for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
faces.append(tuple(reversed(range(N))))
me=bpy.data.meshes.new('Continuous dome mesh');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Transparent green dome',me);bpy.context.collection.objects.link(o);finish(o,o.name,glass)
for f in me.polygons:f.use_smooth=True
cyl('Fluid pool',(x,0,.665),.421,.07,lime)
random.seed(14)
for i in range(15):
 a=i*2.399;rr=.3*math.sqrt((i+.5)/15);s=.085+random.random()*.035
 sphere('Suspended portal bubble %02d'%i,(x+rr*math.cos(a),rr*math.sin(a),.76+random.random()*.12),(s,s,s),lime)
cyl('Dial socket',(.48,0,.6),.226,.09,dark)
cyl('Yellow control dial',(.48,0,.683),.206,.10,yellow)
for i in range(12):
 a=i*2*math.pi/12;o=box('Dial finger flute',(.48+.201*math.cos(a),.201*math.sin(a),.674),(.016,.019,.054),yellow,.006);o.rotation_euler[2]=a
box('Dial indicator',(.49,0,.738),(.14,.017,.006),white,.004)
# Front face: cyan eyes, red nose and curved yellow smile.
cyan=mat('Eye cyan',(.16,.67,.72));ink=mat('Eye ink',(.015,.055,.071))
for y in [-.37,.37]:
 cyl('Eye ivory bezel',(1.18,y,.625),.168,.049,white,'X');cyl('Eye dark outline',(1.208,y,.625),.134,.017,ink,'X');cyl('Eye cyan lens',(1.221,y,.625),.107,.017,cyan,'X');cyl('Eye pupil',(1.232,y,.625),.06,.017,ink,'X');sphere('Eye glint',(1.245,y-.025,.668),(.008,.021,.031),white)
sphere('Red nose',(1.227,0,.49),(.086,.115,.095),red)
def line(name,pts,r,m):
 # Dense analytic centerline and hemispherical tips give a smooth capsule-ended tube.
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=6;c.use_fill_caps=True
 sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);finish(o,name,m)
 for co in [pts[0],pts[-1]]:sphere(name+' rounded endpoint',co,(r,r,r),m)
 return o
line('Happy yellow smile',[(1.218,.19*math.cos(a),.39+.085*math.sin(a)) for a in [math.pi+i*math.pi/128 for i in range(129)]],.024,yellow)
# A real recessed toy emitter, cut into the front below the smile.
cutter=box('Muzzle cavity cutter',(1.19,0,.135),(.36,.86,.16),dark,.045)
bpy.context.view_layer.objects.active=body
mod=body.modifiers.new('Recessed front muzzle','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
bpy.ops.object.modifier_apply(modifier=mod.name);parts.remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)
bevel(body,.009)
box('portal-muzzle',(1.044,0,.135),(.035,.832,.139),dark,.034)
box('Recessed green emitter core',(1.065,0,.135),(.013,.65,.047),lime,.019)
box('Rear lamp recess',(-1.208,0,.21),(.022,.91,.34),dark,.04)
box('Rear red indicator',(-1.226,0,.21),(.038,.83,.265),red,.045)
# Turned grip widens into the same housing root; blue base is flush to the grip.
profile=[(.22,-1.2),(.235,-1.17),(.23,-1.10),(.20,-.55),(.225,-.36),(.29,-.24)]
verts=[];faces=[]
for rr,z in profile:
 for i in range(48):
  a=i*2*math.pi/48;verts.append((-.35+.1*(-z)+rr*math.cos(a),rr*math.sin(a),z))
for j in range(len(profile)-1):
 for i in range(48):faces.append((j*48+i,j*48+(i+1)%48,(j+1)*48+(i+1)%48,(j+1)*48+i))
faces.extend([tuple(reversed(range(48))),tuple((len(profile)-1)*48+i for i in range(48))])
me=bpy.data.meshes.new('Ergonomic grip');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Ivory grip',me);bpy.context.collection.objects.link(o);finish(o,o.name,white)
for f in me.polygons:f.use_smooth=True
sphere('Blue rounded pommel',(-.23,0,-1.17),(.247,.248,.19),blue)
def cubic(a,b,c,d,t):
 return tuple((1-t)**3*a[i]+3*(1-t)**2*t*b[i]+3*(1-t)*t*t*c[i]+t**3*d[i] for i in range(3))
line('Trigger',[cubic((.115,0,-.15),(.29,0,-.28),(.22,0,-.405),(.055,0,-.425),i/96) for i in range(97)],.042,dark)
# Original user-supplied RGBA artwork, packed into both Blender and GLB.
sticker=mat('Portal Gun Jr original transparent sticker',(1,1,1),.66)
sticker.surface_render_method='DITHERED'
sticker.use_backface_culling=True
p=sticker.node_tree.nodes.get('Principled BSDF');p.inputs['Coat Weight'].default_value=0
tex=sticker.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/'public/assets/models/portal-gun/textures/portal-gun-jr-sticker.png'));tex.image.pack()
sticker.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);sticker.node_tree.links.new(tex.outputs['Alpha'],p.inputs['Alpha'])
height=.48;width=height*tex.image.size[0]/tex.image.size[1]
for side in [-1,1]:
 # Matching aspect ratio, outward normals and readable orientation on both sides.
 coords=[(-.17+side*-u*width,side*.613,.215+v*height) for u,v in [(-.5,-.5),(.5,-.5),(.5,.5),(-.5,.5)]]
 me=bpy.data.meshes.new('Sticker UV plane');me.from_pydata(coords,[],[(0,1,2,3)]);me.update()
 uv=me.uv_layers.new(name='UVMap')
 for loop,co in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=co
 o=bpy.data.objects.new('Original transparent sticker '+str(side),me);bpy.context.collection.objects.link(o);finish(o,o.name,sticker)
# Export only modeled pieces; editable Blender scene also contains studio lights/cameras.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.convert(target='MESH')
for o in bpy.context.selected_objects:
 if 'Trigger' in o.name or 'Happy yellow smile' in o.name:
  for f in o.data.polygons:f.use_smooth=True
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/models/portal-gun/portal-gun-jr.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.world.color=(.22,.22,.22);scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
bpy.ops.object.camera_add(location=(4,-6,3.9));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.15))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.9;scene.camera=cam
for pos,power,size in [((1,-4,6),650,5),((-4,-1,3),480,4),((1,4,5),800,3)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.2))-o.location).to_track_quat('-Z','Y').to_euler()
# Open directly on the model in material mode.
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'portal-gun-jr.blend'))
scene.render.filepath=str(OUT/'preview-front.png');bpy.ops.render.render(write_still=True)
cam.location=(-4,-6,4.7);cam.rotation_euler=(Vector((0,0,.15))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/'preview-rear.png');bpy.ops.render.render(write_still=True)

cam.location=(5,-3,1.0);cam.rotation_euler=(Vector((.5,0,.15))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.8;scene.render.filepath=str(OUT/'preview-details.png');bpy.ops.render.render(write_still=True)
