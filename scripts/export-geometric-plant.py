"""Export the plant collection as a smooth, reduced green-clay GLB.

Blender --background --factory-startup --threads 4 --disable-autoexec \
  --python scripts/export-geometric-plant.py -- source.blend
The original Blender scene is never saved or modified on disk.
"""
import bpy
import json
import os
import sys

source = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
destination = os.path.join(root, 'public/assets/models/geometric-plant/geometric-plant.glb')
bpy.ops.wm.open_mainfile(filepath=source)
collection = bpy.data.collections.get('01 • Geometric plant')
assert collection is not None, 'Missing plant collection; do not export the studio'
originals = [o for o in collection.all_objects if o.type in {'MESH', 'CURVE'} and not o.hide_render]
assert originals, 'No plant geometry found'

def linear(value):
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4

clay = bpy.data.materials.new('Leaf green clay')
clay.use_nodes = True
color = tuple(linear(channel / 255) for channel in (102, 167, 69)) + (1,)
clay.diffuse_color = color
shader = clay.node_tree.nodes.get('Principled BSDF')
shader.inputs['Base Color'].default_value = color
shader.inputs['Roughness'].default_value = .82
shader.inputs['Metallic'].default_value = 0
shader.inputs['Specular IOR Level'].default_value = .23
shader.inputs['Coat Weight'].default_value = 0

depsgraph = bpy.context.evaluated_depsgraph_get()
models = []
stats = []
budgets = {'01': 6500, '02': 12000, '03': 6500, '04': 500}
for original in originals:
    mesh = bpy.data.meshes.new_from_object(original.evaluated_get(depsgraph), depsgraph=depsgraph)
    mesh.calc_loop_triangles()
    before = len(mesh.loop_triangles)
    assert before > 0, original.name
    reference = bpy.data.objects.new(original.name + ' / normal reference', mesh)
    bpy.context.collection.objects.link(reference)
    reference.matrix_world = original.matrix_world.copy()
    model = bpy.data.objects.new(original.name + ' / web', mesh.copy())
    bpy.context.collection.objects.link(model)
    model.matrix_world = original.matrix_world.copy()
    bpy.ops.object.select_all(action='DESELECT')
    model.select_set(True)
    bpy.context.view_layer.objects.active = model
    decimate = model.modifiers.new('Web surface reduction', 'DECIMATE')
    decimate.ratio = min(1, budgets.get(original.name[:2], 4000) / before)
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    for polygon in model.data.polygons:
        polygon.use_smooth = True
        polygon.material_index = 0
    normals = model.modifiers.new('Preserve smooth source normals', 'DATA_TRANSFER')
    normals.object = reference
    normals.use_loop_data = True
    normals.data_types_loops = {'CUSTOM_NORMAL'}
    normals.loop_mapping = 'POLYINTERP_NEAREST'
    bpy.ops.object.modifier_apply(modifier=normals.name)
    bpy.data.objects.remove(reference, do_unlink=True)
    model.data.materials.clear()
    model.data.materials.append(clay)
    model.data.calc_loop_triangles()
    stats.append({'name': original.name, 'before': before, 'after': len(model.data.loop_triangles)})
    models.append(model)

bpy.ops.object.select_all(action='DESELECT')
for model in models:
    model.select_set(True)
os.makedirs(os.path.dirname(destination), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=destination, export_format='GLB', use_selection=True,
                          export_normals=True, export_texcoords=False, export_cameras=False,
                          export_lights=False, export_animations=False)
print(json.dumps({'meshes': stats, 'bytes': os.path.getsize(destination), 'output': destination}), flush=True)
