"""Export the supplied branch sculpture without changing the source blend.

Blender --background --factory-startup --threads 4 --disable-autoexec \
  --python scripts/export-sculpted-branches.py -- source.blend
"""
import bpy
import json
import os
import sys

source = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
destination = os.path.join(root, 'public/assets/models/sculpted-branches/sculpted-branches.glb')
bpy.ops.wm.open_mainfile(filepath=source)
original = bpy.data.objects.get('01 / S-shaped trunk and branches')
assert original is not None and original.type == 'MESH', 'Missing branch sculpture'
depsgraph = bpy.context.evaluated_depsgraph_get()
mesh = bpy.data.meshes.new_from_object(original.evaluated_get(depsgraph), depsgraph=depsgraph)
mesh.calc_loop_triangles()
before = len(mesh.loop_triangles)
model = bpy.data.objects.new('Sculpted branches / web', mesh)
bpy.context.collection.objects.link(model)
model.matrix_world = original.matrix_world.copy()
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
reduction = model.modifiers.new('Web surface reduction', 'DECIMATE')
reduction.ratio = min(1, 16000 / before)
bpy.ops.object.modifier_apply(modifier=reduction.name)
for polygon in model.data.polygons:
    polygon.use_smooth = True
normals = model.modifiers.new('Preserve source normals', 'DATA_TRANSFER')
normals.object = original
normals.use_loop_data = True
normals.data_types_loops = {'CUSTOM_NORMAL'}
normals.loop_mapping = 'POLYINTERP_NEAREST'
bpy.ops.object.modifier_apply(modifier=normals.name)
model.data.calc_loop_triangles()
os.makedirs(os.path.dirname(destination), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=destination, export_format='GLB', use_selection=True,
                          export_normals=True, export_cameras=False,
                          export_lights=False, export_animations=False)
print(json.dumps({'trianglesBefore': before, 'trianglesAfter': len(model.data.loop_triangles),
                  'bytes': os.path.getsize(destination), 'output': destination}), flush=True)
