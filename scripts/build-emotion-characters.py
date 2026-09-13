"""Build five volumetric characters in Blender; export editable scene + web GLBs.
Run: Blender --background --python scripts/build-emotion-characters.py
Coordinates deliberately match the existing Three.js world: Y up, +Z face.
"""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
random.seed(42)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/models/emotions'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def material(name, rgb, rough=.42):
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'); bs.inputs['Base Color'].default_value=(*rgb,1)
    bs.inputs['Roughness'].default_value=rough; bs.inputs['Coat Weight'].default_value=.22
    return m
# Linear colors keep glTF's color-managed result saturated.
def rgb(h):
    v=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v)
colors=[material(n,rgb(c)) for n,c in [('Lemon silicone','FFE637'),('Cloud clay','C4C6C9'),('Grass rubber','3CB66A'),('Blue vinyl','2986ED'),('Vermilion cord','FA4135')]]
ink=material('Raised charcoal expressions',rgb('101311'),.55)
parts=[]
def ball(name, loc, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat); parts.append(o); return o

def tube(name, points, radius, mat, cyclic=False):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.resolution_u=4; c.bevel_depth=radius; c.bevel_resolution=2; c.use_fill_caps=True
    s=c.splines.new('BEZIER'); s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points): p.co=co; p.handle_left_type='AUTO'; p.handle_right_type='AUTO'
    s.use_cyclic_u=cyclic
    if name=='Open trapezoid mouth':
        for p in s.bezier_points:p.handle_left_type='VECTOR';p.handle_right_type='VECTOR'
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.data.materials.append(mat); parts.append(o); return o

def line(name, xy, z=.58, r=.038): return tube(name,[(x,y,z) for x,y in xy],r,ink)
def ring(name,x,y,rx,ry,z=.57):
    return tube(name,[(x+rx*math.cos(t*math.tau/16),y+ry*math.sin(t*math.tau/16),z) for t in range(16)],.036,ink,True)
def merge(objs,name,remesh=False):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]; bpy.ops.object.convert(target='MESH'); bpy.ops.object.join()
    o=bpy.context.object;o.name=name
    if remesh:
        mod=o.modifiers.new('Continuous sculpted volume','REMESH');mod.mode='VOXEL';mod.voxel_size=.035;mod.use_remove_disconnected=False
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Soft sculpt finish','SMOOTH');mod.factor=1.2;mod.iterations=4;bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Web topology','DECIMATE');mod.ratio=.48;bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=True
    return o

names=['01_joy','02_meh','03_surprise','04_sad','05_anger']
roots=[]
for i,name in enumerate(names):
    parts=[];m=colors[i]
    if i==0:
        ball('Puffed dancing torso',(0,0,0),(.54,.7,.4),m)
        for path in [[(-.32,.25,0),(-.83,.45,.02),(-1.02,.83,.14)],[(.32,.3,0),(.78,.78,-.03),(.7,1.18,.12)], [(-.18,.5,0),(-.27,1.04,0),(-.4,1.22,.06)],[(-.29,-.43,0),(-.75,-.83,.08),(-1,-.68,.18)],[(.27,-.43,0),(.63,-.7,0),(.94,-.53,.2)]]:
            tube('Soft curling limb',path,.18,m);ball('Rounded tip',path[-1],(.18,.18,.18),m)
        body=merge(parts[:],'Joy continuous silicone body',True);parts=[body]
        line('Squeezed left eye',[(-.23,.36),(-.12,.3),(-.23,.24)],.425,.044)
        line('Squeezed right eye',[(.23,.39),(.12,.31),(.23,.26)],.425,.044)
        line('Big smile',[(.29,.1),(.2,-.11),(0,-.2),(-.2,-.11),(-.29,.05)],.43,.04)
    elif i==1:
        ball('Round cloud body',(0,.06,0),(.76,.8,.53),m)
        for k in range(12):
            a=k*math.tau/12;ball('Cloud edge',(math.cos(a)*.59,math.sin(a)*.63+.06,-.04),(.23,.23,.35),m)
        for s in [-1,1]:
            tube('Shrug arm',[(s*.62,.06,0),(s*.92,-.03,.04),(s*1.1,.26,.14),(s*1.23,.2,.15)],.087,m)
            tube('Stubby foot',[(s*.24,-.56,0),(s*.24,-.94,.05),(s*.43,-.94,.18)],.105,m)
        body=merge(parts[:],'Meh cloud sculpt',True);parts=[body]
        for x in [-.2,.2]:ball('Dot eye',(x,.28,.53),(.065,.07,.035),ink)
        line('Unimpressed mouth',[(-.17,-.04),(-.13,.04),(-.13,-.01),(.21,-.01)],.55,.042)
    elif i==2:
        ball('Deep grass body',(0,.04,0),(.71,.76,.48),m)
        # Tapered, curved tufts cover a genuine ellipsoid on every side.
        for k in range(105):
            y=random.uniform(-.9,.95);a=k*2.39996;q=math.sqrt(1-y*y)
            v=Vector((q*math.cos(a),y,q*math.sin(a)))
            if v.z>.64 and abs(v.x)<.6 and -.65<v.y<.6:continue
            p=Vector((v.x*.66,v.y*.71+.04,v.z*.46));e=p+v*random.uniform(.1,.22)
            tube('Sculpted grassy tuft',[p,p+v*.09,e+Vector((.035,.03,0))],.052,m)
        for s in [-1,1]:
            tube('Bent grass arm',[(s*.63,.04,0),(s*.91,-.01,.03),(s*.99,-.3,.17)],.073,m)
            tube('Grass foot',[(s*.3,-.56,0),(s*.32,-.89,.05),(s*.53,-.95,.16)],.087,m)
        ring('Surprised left eye',-.19,.28,.091,.104,.48);ring('Surprised right eye',.19,.28,.091,.104,.48)
        tube('Open trapezoid mouth',[(-.16,.06,.51),(.16,.06,.51),(.22,-.4,.44),(-.22,-.4,.44)],.033,ink,True)
    elif i==3:
        ball('Puffy blue body',(0,.05,0),(.85,.73,.56),m)
        for s in [-1,1]:
            tube('Looped drooping arm',[(s*.65,.38,0),(s*1.01,.24,.05),(s*1.04,-.08,.14),(s*.74,-.2,.23)],.11,m)
            tube('Folded blue leg',[(s*.38,-.48,0),(s*.42,-.83,.08),(s*.17,-.86,.25)],.13,m)
        body=merge(parts[:],'Sad inflated vinyl body',True);parts=[body]
        line('Sad brow left',[(-.4,.3),(-.15,.36)],.55,.047);line('Sad brow right',[(.15,.36),(.4,.3)],.55,.047)
        for s in [-1,1]:
            line('Closed eye',[(s*.28,.18),(s*.29,.04)],.57,.04)
            line('Tear dash',[(s*.31,-.07),(s*.33,-.21)],.56,.04)
        line('Tiny frown',[(-.09,-.04),(0,-.02),(.09,-.04)],.585,.038)
    else:
        ball('Hidden knotted center',(0,0,-.03),(.49,.51,.37),m)
        for k in range(24):
            a=k*2.39996;points=[]
            for j in range(24):
                t=j*math.tau/24
                u=.68*math.cos(t);v=.3*math.sin(t)
                points.append((u*math.cos(a)-v*math.sin(a),u*math.sin(a)+v*math.cos(a),.32*math.sin(t*2+a)))
            tube('Spatial tangled cord',points,.048,m,True)
        for s in [-1,1]:tube('Angry thin foot',[(s*.2,-.5,0),(s*.25,-.93,.05),(s*.49,-1,.12)],.046,m)
        line('Angry left eyebrow',[(-.39,.24),(-.12,.1),(-.07,.16)],.43,.057)
        line('Angry right eyebrow',[(.08,.17),(.16,.11),(.36,.37)],.43,.057)
        line('Scowl',[(-.13,-.16),(-.03,-.08),(.19,-.14)],.45,.049)
    # Consolidate by material: two draw calls per character, no texture dependencies.
    solids=[o for o in parts if o.data.materials[0]==m]; faces=[o for o in parts if o.data.materials[0]==ink]
    root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
    for group,label in [(solids,'sculpt'),(faces,'expression')]:
        o=merge(group,name+'_'+label);o.parent=root
    bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
    for o in root.children:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
    root.location.x=(i-2)*2.8;root.rotation_euler[1]=-.22;roots.append(root)
# Editable Blender source and a studio render expose depth/side surfaces.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.world.color=(.22,.22,.22)
bpy.ops.object.camera_add(location=(0,2.2,18));camera=bpy.context.object;camera.location=(0,0,18);camera.rotation_euler=(0,0,0);camera.data.type='ORTHO';camera.data.ortho_scale=14;scene.camera=camera
for loc,power,size in [((-4,6,7),1800,8),((6,1,4),1200,6),((0,-3,-3),1800,5)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power*.55;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=2100;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'output/emotions/emotion-characters.blend'))
scene.render.filepath=str(ROOT/'output/emotions/lineup.png');bpy.ops.render.render(write_still=True)
