"""Make the imported reliefs rounded on both sides, preserving source files.
Run with Blender --factory-startup -b --python scripts/repair-imported-props.py.
"""
import bpy
import bmesh
import math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path.home() / 'Library/Mobile Documents/com~apple~CloudDocs/jimmyzz/GLTF'
for number in (2, 3):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE / f'资源 {number}.gltf'))
    objects = list(bpy.context.selected_objects)
    body = max(objects, key=lambda obj: obj.dimensions.length)
    # glTF +Z maps to Blender -Y. The source has a 4 mm flat back bevel.
    back = max(v.co.y for v in body.data.vertices)
    seam = back - .004
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
                          dist=1e-7, plane_co=(0, seam, 0), plane_no=(0, 1, 0),
                          clear_outer=True, clear_inner=False)
    # Remove the remaining planar cap, then mirror only the rounded shell.
    flat = [f for f in bm.faces if all(abs(v.co.y - seam) < 1e-6 for v in f.verts)]
    bmesh.ops.delete(bm, geom=flat, context='FACES')
    copied = bmesh.ops.duplicate(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces))['geom']
    for v in copied:
        if isinstance(v, bmesh.types.BMVert):
            v.co.y = 2 * seam - v.co.y
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    assert all(e.is_manifold for e in bm.edges), 'Rounded shell must be watertight'
    assert bm.calc_volume() > 0, 'Outward winding required'
    tree = BVHTree.FromBMesh(bm)
    # Eyes occupy cutouts; sample the surrounding rim and keep the entire
    # eye assembly rigid so pupils remain aligned with their white shells.
    details = [obj for obj in objects if obj != body]
    if details:
        vertices = [v.co for obj in details for v in obj.data.vertices]
        center = sum(vertices, Vector()) / len(vertices)
        heights = []
        for i in range(32):
            angle = i * math.tau / 32
            origin = Vector((center.x + .012 * math.cos(angle), 1,
                             center.z + .012 * math.sin(angle)))
            hit, _, _, _ = tree.ray_cast(origin, Vector((0, -1, 0)))
            if hit is not None:
                heights.append(hit.y)
        assert heights, 'Eye assembly must have a surrounding rim'
        shift = sorted(heights)[len(heights) // 2] - back
        for obj in details:
            obj.location.y += shift
    bm.to_mesh(body.data)
    bm.free()
    for polygon in body.data.polygons:
        polygon.use_smooth = True
    body.data.update()
    bpy.ops.object.select_all(action='SELECT')
    destination = ROOT / f'public/assets/models/imported-props/resource-{number}.glb'
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', use_selection=True)
    print(f'Repaired {destination.name}: watertight rounded shell')
