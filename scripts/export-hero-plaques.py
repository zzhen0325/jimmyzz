"""Blender background export. Open the source .blend before running this script.
Never saves or changes the source file. Preserves all five modeled reliefs.
"""
import bpy
from pathlib import Path

output = Path(__file__).resolve().parents[1] / 'public/assets/models/plaques'
output.mkdir(parents=True, exist_ok=True)
roots = sorted([obj for obj in bpy.context.scene.objects if obj.name.endswith('_ROOT')], key=lambda obj: obj.name)
assert len(roots) == 5, f'Expected five plaque roots, found {len(roots)}'
for root in roots:
    root.location = (0, 0, 0)
    root.rotation_euler = (0, 0, 0)
    bpy.ops.object.select_all(action='DESELECT')
    members = list(root.children_recursive)
    for obj in members:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = next(obj for obj in members if obj.type == 'MESH')
    bpy.ops.object.convert(target='MESH')
    root.select_set(True)
    filename = root.name.removesuffix('_ROOT').lower() + '.glb'
    bpy.ops.export_scene.gltf(filepath=str(output / filename), export_format='GLB', use_selection=True,
        export_yup=False, export_apply=True, export_cameras=False, export_lights=False,
        export_animations=False, export_extras=True)
    print('EXPORTED_PLAQUE', filename)
