"""Export the two live-scene sculptures from a snapshot, never the user's source.

Blender --background /tmp/jimmyzz-floating-source.blend --python scripts/export-soft-accretion.py
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

OUTPUT = Path(__file__).resolve().parents[1] / 'public/assets/models/soft-accretion'
OUTPUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 8
scene.cycles.device = 'CPU'
scene.render.bake.margin = 12

for name, filename in [('03_Soft_Accretion', 'soft-accretion'), ('06_Knotted_Veil', 'knotted-veil')]:
    obj = bpy.data.objects[name]
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new('Web silhouette', 'DECIMATE')
    modifier.ratio = 0.14
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True

    if filename == 'soft-accretion':
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
        bpy.ops.object.mode_set(mode='OBJECT')
        mat = obj.data.materials[0]
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
        output = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
        color = bsdf.inputs['Base Color'].links[0].from_socket
        emission = nodes.new('ShaderNodeEmission')
        links.new(color, emission.inputs['Color'])
        links.new(emission.outputs[0], output.inputs['Surface'])
        image = bpy.data.images.new('Soft Accretion baked base color', width=1024, height=1024, alpha=False)
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = image
        nodes.active = texture
        bpy.ops.object.bake(type='EMIT')
        links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
        links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
        nodes.remove(emission)
        image.filepath_raw = str(OUTPUT / 'soft-accretion-basecolor.png')
        image.file_format = 'PNG'
        image.save()
        image.pack()

    # These authored meshes use Y as their visual up axis. Rotate into Blender's
    # Z-up before glTF's coordinate conversion, keeping their broad face forward.
    center = sum((Vector(corner) for corner in obj.bound_box), Vector()) / 8
    for vertex in obj.data.vertices:
        vertex.co -= center
    obj.location = (0, 0, 0)
    obj.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / (filename + '.glb')),
        export_format='GLB', use_selection=True, export_yup=True,
        export_animations=False, export_cameras=False, export_lights=False)
    print('EXPORTED', filename, len(obj.data.polygons), flush=True)
