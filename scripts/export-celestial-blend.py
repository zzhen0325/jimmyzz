"""Export edited celestial hierarchies without saving or modifying the blend source.

Blender --background --factory-startup --disable-autoexec \
  --python scripts/export-celestial-blend.py -- source.blend
"""
import bpy
import json
import os
import sys

source = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=source)
output = os.path.join(root, 'public/assets/models/celestial')
os.makedirs(output, exist_ok=True)
models = [('floating-metal-saturn', 'planet'), ('floating-chrome-rain-cloud', 'rain-cloud')]
# Validate both hierarchies before replacing either asset.
for name, filename in models:
    parent = bpy.data.objects.get(name)
    assert parent is not None, f'Missing model: {name}'
    assert any(child.type == 'MESH' for child in parent.children_recursive), f'No meshes: {name}'
for name, filename in models:
    parent = bpy.data.objects[name]
    bpy.ops.object.select_all(action='DESELECT')
    selected = [parent] + list(parent.children_recursive)
    for obj in selected:
        if obj.type in {'MESH', 'EMPTY'}:
            obj.hide_set(False)
            obj.select_set(True)
    bpy.context.view_layer.objects.active = parent
    destination = os.path.join(output, filename + '.glb')
    bpy.ops.export_scene.gltf(filepath=destination, export_format='GLB', use_selection=True,
                              export_apply=True, export_normals=True, export_cameras=False,
                              export_lights=False, export_animations=False)
    print(json.dumps({'file': destination, 'bytes': os.path.getsize(destination),
                      'meshes': [obj.name for obj in selected if obj.type == 'MESH']}), flush=True)
