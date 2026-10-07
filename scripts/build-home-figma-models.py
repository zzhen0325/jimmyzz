"""Sculpted Figma props and a fully volumetric bird courier. Blender background.
Y up, +Z facing camera; exports editable .blend, individual GLBs and previews.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/home-figma-models';OUT.mkdir(parents=True,exist_ok=True)
ASSETS=ROOT/'public/assets/models/figma-symbols'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def mat(name,color,rough=.4,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    return m
white=mat('Bird warm white porcelain',(.91,.91,.86),.38)
black=mat('Soft black ink',(.008,.009,.007),.38)
green=mat('Postman lime vinyl',(.37,.91,.055),.38)
yellow=mat('Mailbag sunshine',(.98,.79,.028),.4)
blue=mat('Postman sky blue cap',(.025,.56,.91),.38)
pink=mat('Pink charm',(.94,.26,.55),.42)
pale=mat('Ice blue parcel',(.38,.84,.94),.4)
bronze=mat('Vinyl bronze edge',(.23,.12,.066),.26,.6)
models={}

def smooth(o):
    for p in o.data.polygons:p.use_smooth=True
    return o

def mesh(name,verts,faces,material):
    m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update()
    o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.data.materials.append(material)
    return smooth(o)

def sphere(name,pos,scale,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=pos)
    o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);return smooth(o)

def tube(name,points,radius,material):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=radius;c.bevel_resolution=3;c.use_fill_caps=True
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o

def box(name,pos,scale,material,radius=.05):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material);m=o.modifiers.new('Soft construction edges','BEVEL');m.width=radius;m.segments=3
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=m.name)
    return o

def root_model(name,objects):
    root=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(root)
    for o in objects:o.parent=root
    models[name]=root
    return root

# Puff sculpting based on signed distance volumes, with nonuniform depth and curvature.
for name,material in [('asterisk',mat('Pearl silver petals',(.73,.75,.76),.38,.28)),('c-mark',mat('Black C satin rubber',(.012,.013,.014),.29)),('arrow',mat('Electric blue arrow',(.01,.065,.78),.25,.25))]:
    bpy.ops.wm.obj_import(filepath=str(OUT/f'{name}.obj'),forward_axis='Y',up_axis='Z')
    o=bpy.context.object;o.name=name+' sculpted volume';o.data.materials.clear();o.data.materials.append(material)
    # OBJ coordinates are already in the homepage coordinate frame.
    o.rotation_euler=(0,0,0)
    relax=o.modifiers.new('Relax sculpted surface','SMOOTH');relax.factor=.7;relax.iterations=4;bpy.ops.object.modifier_apply(modifier=relax.name)
    dec=o.modifiers.new('Web topology','DECIMATE');dec.ratio=.22;bpy.ops.object.modifier_apply(modifier=dec.name)
    smooth(o)
    if name=='arrow':
        image=bpy.data.images.load(str(OUT/'arrow.png'));image.pack()
        nodes=material.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=image
        material.node_tree.links.new(tex.outputs['Color'],next(n for n in nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'])
        uv=o.data.uv_layers.new(name='Figma planar artwork')
        for p in o.data.polygons:
            for i in p.loop_indices:
                v=o.data.vertices[o.data.loops[i].vertex_index].co;uv.data[i].uv=((v.x+1)/2,(v.y+1)/2)
    root_model(name,[o])

# Lathed vinyl: stepped center label, grooves and rolled outer rim on both sides.
vinyl_mat=mat('Original Figma vinyl artwork',(.8,.8,.8),.34,.18)
tex=vinyl_mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ASSETS/'vinyl-face.png'));tex.image.pack()
vinyl_mat.node_tree.links.new(tex.outputs['Color'],next(n for n in vinyl_mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'])
profile=[(.016,-.047),(.15,-.047),(.345,-.047),(.355,-.038)]
for i in range(64):
    r=.36+i*.625/63;profile.append((r,-.035-.002*math.cos(i*math.pi)))
profile += [(.997,-.025),(1,-.012),(1,.012),(.997,.025)]
for i in reversed(range(64)):
    r=.36+i*.625/63;profile.append((r,.035+.002*math.cos(i*math.pi)))
profile += [(.355,.038),(.345,.047),(.15,.047),(.016,.047)]
N=128;verts=[(r*math.cos(j*2*math.pi/N),r*math.sin(j*2*math.pi/N),z) for r,z in profile for j in range(N)]
faces=[]
for k in range(len(profile)):
    for j in range(N):faces.append((k*N+j,k*N+(j+1)%N,((k+1)%len(profile))*N+(j+1)%N,((k+1)%len(profile))*N+j))
disc=mesh('Lathed grooved record with spindle bore',verts,faces,vinyl_mat)
uv=disc.data.uv_layers.new(name='Original label and print')
for p in disc.data.polygons:
    for i in p.loop_indices:
        v=disc.data.vertices[disc.data.loops[i].vertex_index].co;uv.data[i].uv=((v.x+1)/2,(v.y+1)/2)
root_model('vinyl',[disc])

# Courier illustration reinterpreted as a multi-part toy sculpture.
before=set(bpy.data.objects)
sphere('White bird rounded body',(.03,-.05,0),(1.08,.43,.43),white)
sphere('White bird rounded head',(.78,.05,.015),(.5,.4,.41),white)
# Far wing fans up behind the rider; near wing sweeps down and toward the camera.
def wing(name,base,tip,width,depth):
    start=Vector(base);end=Vector(tip);direction=end-start
    side=Vector((-direction.y,direction.x,0)).normalized()
    verts=[];rings=22;segments=28
    for i in range(rings):
        t=i/(rings-1);center=start+direction*t;center.z+=.18*math.sin(t*math.pi)
        w=width*math.sin(math.pi*(.05+.94*t))**.65
        for j in range(segments):
            a=j*2*math.pi/segments
            p=center+side*(w*math.cos(a))+Vector((0,0,depth*math.sin(a)*math.sin(math.pi*(.05+.94*t))))
            verts.append(tuple(p))
    faces=[]
    for k in range(rings-1):
        for j in range(segments):faces.append((k*segments+j,k*segments+(j+1)%segments,(k+1)*segments+(j+1)%segments,(k+1)*segments+j))
    faces += [tuple(reversed(range(segments))),tuple((rings-1)*segments+j for j in range(segments))]
    return mesh(name,verts,faces,white)
wing('Far raised wing',(-.12,.11,-.28),(.60,1.37,-.28),.32,.11)
wing('Near swept wing',(.15,-.16,.30),(-.91,-1.25,.48),.38,.14)
for i in range(3):
    wing('Far wing feather '+str(i),(.2,.54,-.24),(.23+i*.19,1.28+i*.055,-.28),.14,.08)
    wing('Near wing feather '+str(i),(-.22,-.56,.48),(-1.04+i*.14,-1.08-i*.08,.51),.16,.09)
for i in range(3):
    o=sphere('Tail feather '+str(i),(-1.03,-.02+(i-1)*.20,-.03),(.62,.15,.16),white);o.rotation_euler.z=(i-1)*.2
# Beak: rounded solid upper/lower wedges, not a flat triangle.
for name,y,z,r in [('Upper bill',.03,.05,.16),('Lower bill',-.075,.04,.105)]:
    bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=r,radius2=.018,depth=.34,location=(1.30,y,z),rotation=(0,math.pi/2,0))
    o=bpy.context.object;o.name=name;o.scale.y=.65;o.data.materials.append(yellow);smooth(o)
for z in [-.37,.37]:sphere('Bird black eye',(1.0,.15,z),(.10,.105,.045),black)
# Rider, legs, feet and face all have independent volume.
sphere('Postman body',(-.30,.56,.02),(.31,.37,.27),green)
sphere('Postman big head',(-.33,.91,.05),(.36,.32,.29),green)
for x in [-.45,-.25]:sphere('Postman eye',(x,1.01,.322),(.035,.046,.024),black)
tube('Postman smile',[(-.38,.91,.34),(-.30,.88,.346),(-.235,.925,.325)],.013,black)
for x,z in [(-.22,.40),(.11,.21)]:
    sphere('White boot',(x,.31,z),(.135,.17,.105),white)
    tube('Bent trouser leg',[(x-.04,.56,z-.12),(x-.09,.43,z-.03),(x,.33,z)],.075,black)
tube('Left arm',[(-.58,.69,.08),(-.66,.59,.25),(-.40,.55,.37)],.075,green)
tube('Right arm',[(-.08,.77,.08),(.06,.66,.24),(-.10,.60,.40)],.067,green)
# Soft cap crown, thick brim, white piping and center badge.
sphere('Cap crown',(-.35,1.20,.035),(.36,.12,.29),blue)
box('Cap band',(-.34,1.16,.06),(.65,.075,.46),blue,.03)
sphere('Cap projecting visor',(-.30,1.16,.32),(.36,.035,.20),blue)
tube('Cap pale piping',[(-.65,1.18,.23),(-.36,1.225,.335),(-.02,1.18,.23)],.013,white)
sphere('Cap round badge',(-.32,1.22,.319),(.053,.054,.019),white)
# Envelope held in front, with a raised folded flap seam.
letter=box('Envelope',(-.21,.64,.405),(.34,.23,.035),white,.018);letter.rotation_euler.z=.13
tube('Envelope flap',[(-.385,.76,.43),(-.22,.65,.448),(-.04,.78,.43)],.011,black)
sphere('Letter holding hand',(-.39,.60,.445),(.10,.062,.055),green)
# Yellow side satchel with flap and strap around the torso.
bag=box('Yellow satchel',(-.72,.41,.11),(.29,.36,.27),yellow,.06);bag.rotation_euler.z=.22
box('Satchel raised flap',(-.74,.49,.265),(.27,.13,.035),yellow,.025)
tube('Satchel strap',[(-.65,.84,.025),(-.55,.65,.33),(-.69,.28,.30)],.026,yellow)
# Dangling keepsakes hang from the beak in real space.
tube('Charm cord',[(1.42,-.035,.055),(1.20,-.39,.09),(1.06,-.72,.16),(.99,-1.12,.17)],.015,black)
# Pink triangular pennant as a softly inflated triangular charm.
mesh('Pink pennant',[(1.16,-.32,.1),(.98,-.49,.12),(1.21,-.54,.12),(1.14,-.45,.18),(1.14,-.45,.04)],[(0,1,3),(1,2,3),(2,0,3),(1,0,4),(2,1,4),(0,2,4)],pink)
# Sun charm with radial solid rays.
sphere('Sun charm center',(1.05,-.70,.18),(.105,.105,.035),yellow)
for i in range(10):
    a=i*math.tau/10
    tube('Sun charm ray',[(1.05+.075*math.cos(a),-.70+.075*math.sin(a),.18),(1.05+.15*math.cos(a),-.70+.15*math.sin(a),.18)],.019,yellow)
small=box('Yellow hanging parcel',(.98,-.94,.17),(.18,.18,.08),yellow,.022);small.rotation_euler.z=-.2
small=box('Blue hanging parcel',(.94,-1.21,.17),(.27,.28,.11),pale,.032);small.rotation_euler.z=.15
for y in [-.94,-1.21]:
    box('Parcel postage stamp',(.95,y+.03,.233),(.04,.055,.008),white,.004)
root_model('bird-courier',[o for o in bpy.data.objects if o not in before])

# Export authored meshes, with all rear surfaces, depth and material slots intact.
for name,root in models.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in root.children_recursive:o.select_set(True)
    bpy.context.view_layer.objects.active=root.children[0]
    bpy.ops.object.convert(target='MESH')
    root.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ASSETS/f'{name}.glb'),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_animations=False)
    print('EXPORTED',name)
# Separate preview renders, showing a three-quarter angle and therefore actual depth.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.world.color=(.24,.24,.24)
bpy.ops.object.camera_add(location=(2.2,1.3,7));cam=bpy.context.object
look=Vector((0,0,0));direction=(look-cam.location).normalized();right=direction.cross(Vector((0,1,0))).normalized();up=right.cross(direction)
cam.rotation_euler=Matrix((right,up,-direction)).transposed().to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.5;scene.camera=cam
for loc,power,size in [((-3,4,5),500,4),((4,1,3),280,3),((-1,-3,1),150,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'home-props.blend'))
for name,root in models.items():
    for key,other in models.items():
        for child in other.children_recursive:child.hide_render=key!=name
    cam.data.ortho_scale=3.6 if name=='bird-courier' else 2.7
    scene.render.filepath=str(OUT/f'{name}-preview.png');bpy.ops.render.render(write_still=True)
