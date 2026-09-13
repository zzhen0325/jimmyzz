"""Blender rounded blue ZZ charm, with four real recessed triangular pockets."""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/blue-zz';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
m=bpy.data.materials.new('Azure matte micrograin');m.use_nodes=True
bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
bs.inputs['Base Color'].default_value=(.001,.14,.58,1)
bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.86
bs.inputs['Coat Weight'].default_value=0;bs.inputs['IOR'].default_value=1.38
# Rounded square, turned 45 degrees and stretched to the reference's diamond silhouette.
contour=[]
for cx,cy,a in [(.49,.49,0),(-.49,.49,90),(-.49,-.49,180),(.49,-.49,270)]:
    for j in range(41):
        t=math.radians(a+j*90/40);x=cx+.55*math.cos(t);y=cy+.55*math.sin(t)
        contour.append(((x-y)/math.sqrt(2)*1.22,(x+y)/math.sqrt(2)))
# Dense elliptical edge profile meets both flat faces tangentially.
# Avoid the old coarse ring slopes that showed bands around the rim.
rings=[(.84+.16*math.cos(t),.368*math.sin(t)) for t in [-math.pi/2+i*math.pi/64 for i in range(65)]]
v=[(x*s,y*s,z) for s,z in rings for x,y in contour];N=len(contour)
f=[tuple(reversed(range(N)))]
for k in range(len(rings)-1):
    for j in range(N):f.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
f.append(tuple((len(rings)-1)*N+j for j in range(N)))
mesh=bpy.data.meshes.new('Rounded diamond volume');mesh.from_pydata(v,[],f);mesh.update()
body=bpy.data.objects.new('Blue ZZ — recessed resin charm',mesh);bpy.context.collection.objects.link(body);body.data.materials.append(m)
bpy.context.view_layer.objects.active=body;body.select_set(True)
# Pocket cutters are closed volumes, leaving a solid blue floor at z=.19.
triangles=[[(-.79,.43),(-.035,.43),(-.79,.025)],[(.035,.43),(.79,.43),(.035,.025)],[(-.79,-.43),(-.035,-.025),(-.035,-.43)],[(.035,-.43),(.79,-.025),(.79,-.43)]]
for i,tri in enumerate(triangles):
    # Ensure counterclockwise winding.
    if sum(tri[j][0]*tri[(j+1)%3][1]-tri[(j+1)%3][0]*tri[j][1] for j in range(3))<0:tri.reverse()
    vs=[(x,y,z) for z in [.19,.8] for x,y in tri]
    fs=[(2,1,0),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)]
    me=bpy.data.meshes.new('Pocket cutter');me.from_pydata(vs,[],fs);me.update()
    cut=bpy.data.objects.new('Pocket cutter',me);bpy.context.collection.objects.link(cut)
    bpy.context.view_layer.objects.active=cut
    bevel=cut.modifiers.new('Rounded pocket corners','BEVEL');bevel.width=.028;bevel.segments=4
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    bpy.context.view_layer.objects.active=body
    boolean=body.modifiers.new('Carved ZZ triangle '+str(i+1),'BOOLEAN');boolean.operation='DIFFERENCE';boolean.solver='EXACT';boolean.object=cut
    bpy.ops.object.modifier_apply(modifier=boolean.name);bpy.data.objects.remove(cut,do_unlink=True)
bpy.context.view_layer.objects.active=body
bevel=body.modifiers.new('Soft pocket lips','BEVEL');bevel.width=.014;bevel.segments=3
bpy.ops.object.modifier_apply(modifier=bevel.name)
remesh=body.modifiers.new('Unified rounded resin surface','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.008;remesh.use_remove_disconnected=False
bpy.ops.object.modifier_apply(modifier=remesh.name)
soft=body.modifiers.new('Polish carved edges','SMOOTH');soft.factor=.8;soft.iterations=8;bpy.ops.object.modifier_apply(modifier=soft.name)
dec=body.modifiers.new('Web topology','DECIMATE');dec.ratio=.18;bpy.ops.object.modifier_apply(modifier=dec.name)
for p in body.data.polygons:p.use_smooth=True
bpy.ops.object.select_all(action='DESELECT');body.select_set(True)
# Flatten the physical mesh, including recessed pockets, before baking its surface.
body.scale.z=.62
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.015)
bpy.ops.object.mode_set(mode='OBJECT')
# Bake the Blender micro-bump into a tangent normal map so glTF/Three.js
# displays the same granular finish as the editable Blender scene.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8
noise=m.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=180
noise.inputs['Detail'].default_value=2;noise.inputs['Roughness'].default_value=.7
bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.28;bump.inputs['Distance'].default_value=.009
m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
normal_image=bpy.data.images.new('Azure micrograin normal',width=1024,height=1024,alpha=False)
normal_image.colorspace_settings.name='Non-Color'
tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=normal_image;m.node_tree.nodes.active=tex
scene.render.bake.margin=12
bpy.ops.object.bake(type='NORMAL')
normal_image.filepath_raw=str(OUT/'micrograin-normal.png');normal_image.file_format='PNG';normal_image.save();normal_image.pack()
normal=m.node_tree.nodes.new('ShaderNodeNormalMap')
m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
path=ROOT/'public/assets/models/emotions/06_blue_zz.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_animations=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.world.color=(.15,.15,.15)
bpy.ops.object.camera_add(location=(2.3,1.4,7));cam=bpy.context.object
# Explicit basis keeps the reference Y axis upright.
direction=(Vector((0,0,0))-cam.location).normalized();right=direction.cross(Vector((0,1,0))).normalized();up=right.cross(direction)
from mathutils import Matrix
cam.rotation_euler=Matrix((right,up,-direction)).transposed().to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=4.25;scene.camera=cam
for loc,power,size in [((-3,4,5),550,4),((4,1,3),380,3),((0,-3,1),180,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1100;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'blue-zz.blend'))
scene.render.filepath=str(OUT/'preview.png');bpy.ops.render.render(write_still=True)
