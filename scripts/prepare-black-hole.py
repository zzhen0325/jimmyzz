"""Optimize NestaEric's user-downloaded CC BY 4.0 model for the homepage.
Run: Blender --background --python scripts/prepare-black-hole.py -- /path/to/black_hole
Keeps the original UVs and textures; removes the companion planet and invisible
refraction shell, reduces geometry and converts legacy spec/gloss materials.
"""
import bpy, sys, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else Path.home() / 'Downloads/black_hole'
OUT = ROOT / 'public/assets/models/black-hole'
EDIT = ROOT / 'output/black-hole'
OUT.mkdir(parents=True, exist_ok=True)
EDIT.mkdir(parents=True, exist_ok=True)
info = json.loads((SOURCE / 'scene.gltf').read_text())
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE / 'scene.gltf'))
meshes = []
for o in list(bpy.context.scene.objects):
    if o.type != 'MESH': continue
    if 'Planet' in o.name or 'distortion' in o.name:
        bpy.data.objects.remove(o, do_unlink=True); continue
    transform = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = Matrix.Identity(4)
    o.data.transform(transform)
    meshes.append(o)
for o in list(bpy.context.scene.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
# Recover the authored disk plane after the importer's coordinate transforms.
ring = next(o for o in meshes if o.data.materials[0].name == 'ring')
coords = np.array([tuple(v.co) for v in ring.data.vertices])
_, axes = np.linalg.eigh(np.cov(coords.T))
normal = Vector(axes[:, 0])
ring.data.update()
front = sum((p.normal * p.area for p in ring.data.polygons), Vector())
if normal.dot(front) < 0: normal = -normal
rotation = Matrix.Rotation(-.18, 4, 'Z') @ normal.rotation_difference(Vector((0, 1, .22)).normalized()).to_matrix().to_4x4()
for o in meshes: o.data.transform(rotation)
# Normalize in the web coordinate system (+Z facing the camera).
pts = [Vector(v.co) for o in meshes for v in o.data.vertices]
lo = Vector(tuple(min(p[i] for p in pts) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in pts) for i in range(3)))
scale = 4.8 / max(hi-lo)
center = (lo+hi)/2
for o in meshes:
    for v in o.data.vertices: v.co = (v.co-center)*scale
    # The runtime now draws the outer disk with one texture-free shader mesh.
    if o.data.materials[0].name in ('ring','ring2','black_hole_blackoutside','black_hole_light2','black_hole_light3'):
        bpy.data.objects.remove(o,do_unlink=True)
        continue
    # Keep the authored curvature of the remaining light layer and horizon.
    # Removing redundant shells saves geometry without faceting their silhouettes.
    print('OPTIMIZED',o.name,len(o.data.polygons))
# Rebuild legacy material inputs without changing the authored texture layout.
for spec in info['materials']:
    if spec['name'] in ('ring','ring2','Planet','black_hole_distortion','black_hole_blackoutside','black_hole_light2','black_hole_light3'): continue
    mat = bpy.data.materials.get(spec['name'])
    if mat is None: continue
    ext = spec.get('extensions',{}).get('KHR_materials_pbrSpecularGlossiness',{})
    mat.node_tree.nodes.clear()
    output=mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    bs=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    mat.node_tree.links.new(bs.outputs[0],output.inputs['Surface'])
    factor=ext.get('diffuseFactor',[1,1,1,1])
    bs.inputs['Base Color'].default_value=(*factor[:3],1)
    bs.inputs['Roughness'].default_value=1
    bs.inputs['Alpha'].default_value=factor[3]
    tex=ext.get('diffuseTexture')
    if spec['name']=='black_hole_light1':
        tex=None
        bs.inputs['Base Color'].default_value=(1,.87,.55,1)
        bs.inputs['Emission Color'].default_value=(1,.87,.55,1)
        bs.inputs['Emission Strength'].default_value=1
    if tex:
        uri=info['images'][info['textures'][tex['index']]['source']]['uri']
        node=mat.node_tree.nodes.new('ShaderNodeTexImage')
        original=bpy.data.images.load(str(SOURCE/uri),check_existing=False)
        if max(original.size)>1024: original.scale(1024,1024)
        width,height=original.size
        rgba=np.array(original.pixels[:],dtype=np.float32).reshape(height,width,4)
        rgba[:,:,:3]*=np.array(factor[:3])
        if 'emissiveTexture' in spec:
            emission_uri=info['images'][info['textures'][spec['emissiveTexture']['index']]['source']]['uri']
            emission=bpy.data.images.load(str(SOURCE/emission_uri),check_existing=False)
            emission.scale(width,height)
            glow=np.array(emission.pixels[:],dtype=np.float32).reshape(height,width,4)
            strength=spec.get('extensions',{}).get('KHR_materials_emissive_strength',{}).get('emissiveStrength',1)
            rgba[:,:,:3]=np.clip(rgba[:,:,:3]*.12+glow[:,:,:3]*np.array(spec['emissiveFactor'])*strength*2,0,1)
        if spec.get('alphaMode')=='MASK':
            rgba[:,:,3]=(rgba[:,:,3]>=spec.get('alphaCutoff',.5)).astype(np.float32)
        else: rgba[:,:,3]*=factor[3]
        baked=bpy.data.images.new(spec['name']+'-web',width=width,height=height,alpha=True)
        baked.pixels.foreach_set(rgba.ravel())
        baked.filepath_raw=str(EDIT/(spec['name']+'-web.png'));baked.file_format='PNG';baked.save();baked.pack()
        node.image=baked
        mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
        mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Emission Color'])
        bs.inputs['Emission Strength'].default_value=1
        mat.node_tree.links.new(node.outputs['Alpha'],bs.inputs['Alpha'])
    # The center must remain black even against the homepage's silver objects.
    if spec['name']=='black_hole_center': bs.inputs['Alpha'].default_value=1
    if spec.get('alphaMode')=='MASK':
        mat.surface_render_method='DITHERED'
    elif spec.get('alphaMode')=='BLEND' and spec['name']!='black_hole_center':
        mat.surface_render_method='DITHERED'
    mat.use_backface_culling=not spec.get('doubleSided',False)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'black-hole.glb'),export_format='GLB',
    export_yup=False,export_apply=True,export_animations=False,export_image_format='WEBP',export_image_quality=90)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.world.color=(0,0,0)
bpy.ops.object.camera_add(location=(0,0,9))
scene.camera=bpy.context.object;scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=5.2
scene.render.resolution_x=1200;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.view_settings.view_transform='Standard'
bpy.ops.wm.save_as_mainfile(filepath=str(EDIT/'black-hole.blend'))
scene.render.filepath=str(EDIT/'black-hole.png');bpy.ops.render.render(write_still=True)
