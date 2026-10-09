"""Export the evaluated Crimson Cell as a smooth, reduced web mesh.

Usage: Blender --background --disable-autoexec --python scripts/export-crimson-cell.py -- source.blend
The source file is never saved or modified.
"""
import bpy
import json
import os
import sys

source = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
destination = os.path.join(root, 'public/assets/models/crimson-cell/crimson-cell.glb')
bpy.ops.wm.open_mainfile(filepath=source)
objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and not obj.hide_render]
assert len(objects) == 1, 'Expected the single Crimson Cell sculpture'
original = objects[0]
depsgraph = bpy.context.evaluated_depsgraph_get()
mesh = bpy.data.meshes.new_from_object(original.evaluated_get(depsgraph), depsgraph=depsgraph)
mesh.calc_loop_triangles()
before = len(mesh.loop_triangles)
model = bpy.data.objects.new('Crimson Cell', mesh)
bpy.context.collection.objects.link(model)
model.matrix_world = original.matrix_world.copy()
bpy.ops.object.select_all(action='DESELECT')
model.select_set(True)
bpy.context.view_layer.objects.active = model
decimate = model.modifiers.new('Web surface reduction', 'DECIMATE')
decimate.ratio = min(1, 24000 / before)
bpy.ops.object.modifier_apply(modifier=decimate.name)
for polygon in model.data.polygons:
    polygon.use_smooth = True
# Interpolate the original smooth normals onto the reduced surface so the
# lacquer highlights remain continuous across differently sized triangles.
normals = model.modifiers.new('Preserve source surface normals', 'DATA_TRANSFER')
normals.object = original
normals.use_loop_data = True
normals.data_types_loops = {'CUSTOM_NORMAL'}
normals.loop_mapping = 'POLYINTERP_NEAREST'
bpy.ops.object.modifier_apply(modifier=normals.name)
model.data.calc_loop_triangles()
after = len(model.data.loop_triangles)
os.makedirs(os.path.dirname(destination), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=destination, export_format='GLB', use_selection=True,
                          export_normals=True, export_texcoords=False, export_cameras=False,
                          export_lights=False, export_animations=False)
print(json.dumps({'triangles_before': before, 'triangles_after': after,
                  'bytes': os.path.getsize(destination), 'output': destination}))
