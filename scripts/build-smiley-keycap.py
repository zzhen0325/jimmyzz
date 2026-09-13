"""Blender sculpted single ivory smiley keycap, Y up / +Z face for the homepage."""
import bpy, math
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/smiley-keycap'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,roughness):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness
    p.inputs['Coat Weight'].default_value=.12
    return m
ivory=material('Keycap ivory polymer',(.88,.91,.93),.38)
ink=material('Keycap charcoal smile',(.006,.008,.009),.62)
# Continuous tapered skirt, rolled shoulders, and a gently dished key surface.
rings=[(.83,-.37),(.89,-.35),(.92,-.29),(.92,-.22),(.9,-.14),(.82,.18),(.76,.36),(.71,.44),(.67,.47),(.62,.46),(.5,.435),(.3,.408),(.12,.40)]
contour=[]
for cx,cy,a in [(.72,.72,0),(-.72,.72,90),(-.72,-.72,180),(.72,-.72,270)]:
    for j in range(17):
        t=math.radians(a+j*90/16);contour.append((cx+.28*math.cos(t),cy+.28*math.sin(t)))
N=len(contour);verts=[(x*s,y*s,z) for s,z in rings for x,y in contour]
faces=[tuple(reversed(range(N)))]
for k in range(len(rings)-1):
    for j in range(N):faces.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
faces.append(tuple((len(rings)-1)*N+j for j in range(N)))
me=bpy.data.meshes.new('Continuous keycap shell');me.from_pydata(verts,[],faces);me.update()
cap=bpy.data.objects.new('Sculpted ivory keycap',me);bpy.context.collection.objects.link(cap);cap.data.materials.append(ivory)
bpy.context.view_layer.objects.active=cap;cap.select_set(True)
sub=cap.modifiers.new('Smooth keycap transitions','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
# A real recessed underside and cross-shaped switch mount make the back readable.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.39));cutter=bpy.context.object;cutter.scale=(1.46,1.46,.36)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bevel=cutter.modifiers.new('Underside corner radius','BEVEL');bevel.width=.12;bevel.segments=5;bpy.ops.object.modifier_apply(modifier=bevel.name)
bpy.context.view_layer.objects.active=cap
mod=cap.modifiers.new('Recessed underside','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
for p in cap.data.polygons:p.use_smooth=True
pieces=[cap]
for scale in [(.35,.11,.19),(.11,.35,.19)]:
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.26));o=bpy.context.object;o.name='Cross switch mount';o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ivory)
    mod=o.modifiers.new('Rounded mount','BEVEL');mod.width=.022;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name);pieces.append(o)
def surface(x,y):return .404+.095*(max(abs(x),abs(y))/.68)**2
for x in [-.18,.18]:
    y=.16;bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=(x,y,surface(x,y)+.008))
    o=bpy.context.object;o.name='Smiley eye';o.scale=(.044,.061,.015);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ink);pieces.append(o)
c=bpy.data.curves.new('Happy smile','CURVE');c.dimensions='3D';c.bevel_depth=.024;c.bevel_resolution=4;c.use_fill_caps=True
s=c.splines.new('POLY');s.points.add(48)
for j,p in enumerate(s.points):
    t=math.pi+j*math.pi/48;x=.255*math.cos(t);y=.005+.23*math.sin(t);p.co=(x,y,surface(x,y)+.01,1)
o=bpy.data.objects.new('Happy smile',c);bpy.context.collection.objects.link(o);o.data.materials.append(ink);pieces.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in pieces:o.select_set(True)
bpy.context.view_layer.objects.active=cap;bpy.ops.object.convert(target='MESH');bpy.ops.object.join();cap.name='Smiley keycap'
for p in cap.data.polygons:p.use_smooth=True
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/models/emotions/07_smiley_keycap.glb'),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_animations=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.world.color=(.16,.16,.16)
bpy.ops.object.camera_add(location=(2,-2.5,6));cam=bpy.context.object
d=(Vector((0,0,0))-cam.location).normalized();right=d.cross(Vector((0,1,0))).normalized();up=right.cross(d)
cam.rotation_euler=Matrix((right,up,-d)).transposed().to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.8;scene.camera=cam
for loc,power,size in [((-3,4,5),420,4),((3,0,3),240,3),((0,-3,-1),150,2)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.film_transparent=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'smiley-keycap.blend'))
scene.render.filepath=str(OUT/'preview.png');bpy.ops.render.render(write_still=True)
