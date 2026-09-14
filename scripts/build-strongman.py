"""Reference-matched volumetric mascot. Blender --background --python scripts/build-strongman.py -- 1|2
Image coordinates define the silhouette; expressions are ray-projected onto the final curved mesh.
Y up, +Z front, matching the homepage's existing GLBs.
"""
import bpy, math, sys, json
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/strongman'; OUT.mkdir(parents=True,exist_ok=True)
VERSION=int(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else 2
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,h,rough):
    rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
    m=bpy.data.materials.new(name); m.use_nodes=True
    bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'); bs.inputs['Base Color'].default_value=(*rgb,1)
    bs.inputs['Roughness'].default_value=rough; bs.inputs['Coat Weight'].default_value=.04
    return m
skin=mat('Strongman butter yellow','FFE477',.48)
shirt=mat('Strongman charcoal vest','40333D',.64)
ink=mat('Strongman surface ink','141411',.6)
parts=[]
def xy(p): return ((p[0]-490)/220,(330-p[1])/220)
def sample(pts,closed=True,n=8):
    result=[]
    for i in range(len(pts) if closed else len(pts)-1):
        a=Vector(pts[(i-1)%len(pts)] if closed or i else pts[0]); b=Vector(pts[i]); c=Vector(pts[(i+1)%len(pts)]); d=Vector(pts[(i+2)%len(pts)] if closed else pts[min(i+2,len(pts)-1)])
        for j in range(n):
            t=j/n
            result.append(tuple(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)))
    if not closed:result.append(pts[-1])
    return result

def puff(name,outline,center,depth,z,material):
    boundary=[xy(p) for p in sample(outline)]; cx,cy=xy(center); N=len(boundary)
    verts=[]; faces=[]
    if VERSION == 1:
        R=40
        for k in range(1,R):
            theta=math.pi*k/R; r=math.sin(theta)
            for x,y in boundary: verts.append((cx+(x-cx)*r,cy+(y-cy)*r,z+depth*math.cos(theta)))
        for k in range(R-2):
            for j in range(N):faces.append((k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j))
        front=len(verts);verts.append((cx,cy,z+depth)); back=len(verts);verts.append((cx,cy,z-depth))
        for j in range(N): faces.extend([(front,(j+1)%N,j),(back,(R-2)*N+j,(R-2)*N+(j+1)%N)])
    else:
        # Constrained interior triangulation handles the non-convex arm and ear outlines.
        # Inflating by boundary distance avoids overlapping radial fans at inward folds.
        import numpy as np
        from mathutils.geometry import delaunay_2d_cdt
        boundary.reverse() # traced image contours become clockwise after the Y flip
        points=[Vector(p) for p in boundary]
        xs=[p[0] for p in boundary];ys=[p[1] for p in boundary]
        for y in np.arange(min(ys)+.013,max(ys),.025):
            for x in np.arange(min(xs)+.013,max(xs),.025):points.append(Vector((x,y)))
        coords,edges,tris,_,_,_=delaunay_2d_cdt(points,[],[list(range(N))],1,.00001,False)
        a=np.array(boundary);edge=np.roll(a,-1,axis=0)-a;length=(edge*edge).sum(axis=1)
        distances=[]
        for p in coords:
            delta=np.array(p)-a;t=np.clip((delta*edge).sum(axis=1)/length,0,1)
            distances.append(float(np.sqrt(((delta-t[:,None]*edge)**2).sum(axis=1)).min()))
        front=[];back=[]
        for p,distance in zip(coords,distances):
            h=depth*math.sqrt(1-math.exp(-distance/(.23 if depth>.4 else .13)))
            front.append(len(verts));verts.append((p.x,p.y,z+h))
            if distance<.00002:back.append(front[-1])
            else:back.append(len(verts));verts.append((p.x,p.y,z-h))
        for tri in tris:
            faces.append(tuple(front[i] for i in tri));faces.append(tuple(back[i] for i in reversed(tri)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.validate();mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    # Recalculate consistently regardless of the traced contour winding.
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)
    if VERSION>=2:
        smooth=obj.modifiers.new('Relax surface distance ridges','SMOOTH');smooth.factor=.8;smooth.iterations=6
        obj.select_set(True);bpy.ops.object.modifier_apply(modifier=smooth.name)
        sub=obj.modifiers.new('Smooth silhouette finish','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
        dec=obj.modifiers.new('Web mesh reduction','DECIMATE');dec.ratio=.15;bpy.ops.object.modifier_apply(modifier=dec.name)
        obj.select_set(False)
    for p in obj.data.polygons:p.use_smooth=True
    parts.append(obj);return obj
left=[(386,181),(366,141),(318,108),(262,91),(205,99),(149,127),(101,174),(65,234),(50,291),(54,348),(75,389),(94,416),(72,462),(61,513),(71,558),(104,579),(150,587),(201,608),(258,614),(313,604),(365,581),(414,552),(441,526),(452,485),(442,448),(426,439),(411,449),(394,448),(388,437),(376,435),(366,443),(333,439),(310,426),(307,407),(323,372),(334,335),(328,289),(306,256),(337,258),(363,235)]
right=[(589,170),(615,122),(667,93),(727,80),(785,86),(841,110),(884,151),(918,211),(936,268),(934,317),(917,354),(899,379),(913,411),(923,461),(918,502),(895,530),(851,548),(799,571),(748,604),(696,623),(637,619),(583,600),(539,576),(496,548),(472,543),(458,518),(455,487),(466,443),(485,421),(501,421),(513,433),(525,431),(533,416),(548,417),(560,430),(560,444),(611,439),(620,413),(640,395),(630,371),(624,335),(628,296),(642,262),(631,252),(611,229)]
vest=[(388,181),(419,185),(459,193),(517,193),(559,179),(587,170),(610,222),(640,254),(631,290),(624,334),(639,396),(617,420),(611,439),(557,444),(493,442),(456,488),(441,449),(400,448),(345,443),(310,426),(310,401),(329,354),(332,309),(312,264),(349,248)]
head=[(408,112),(430,86),(460,71),(496,68),(535,81),(561,110),(574,101),(588,103),(595,117),(589,137),(575,148),(570,177),(545,199),(506,210),(465,213),(433,208),(410,195),(402,175),(400,155),(389,146),(385,128),(391,113)]
body=puff('Fitted dark sleeveless torso',vest,(477,320),.39,-.06,shirt)
larm=puff('Continuous flexed left arm and fist',left,(223,360),.62,.01,skin)
rarm=puff('Continuous flexed right arm and fist',right,(758,358),.64,.015,skin)
face=puff('Small rounded head with ears',head,(490,147),.31,.18,skin)
bpy.context.view_layer.update()
# Query final meshes, so every ink point follows the actual surface instead of a flat Z plane.
bvhs={o.name:BVHTree.FromObject(o,bpy.context.evaluated_depsgraph_get()) for o in [body,larm,rarm,face]}
projection=[]
def stroke(name,points,obj,radius=.012,free=False):
    coords=[]
    for px,py in sample(points,False,10):
        x,y=xy((px,py))
        if free: z=.23
        else:
            hit,normal,_,_=bvhs[obj.name].ray_cast(Vector((x,y,4)),Vector((0,0,-1)))
            if hit is None:
                # Keep edge creases just inside the relaxed silhouette, within 18 source pixels.
                targets={larm.name:(223,360),rarm.name:(758,358),body.name:(477,320),face.name:(490,147)}
                tx,ty=xy(targets[obj.name]);direction=Vector((tx-x,ty-y)).normalized()
                for step in range(1,19):
                    sx=x+direction.x*step/220;sy=y+direction.y*step/220
                    hit,normal,_,_=bvhs[obj.name].ray_cast(Vector((sx,sy,4)),Vector((0,0,-1)))
                    if hit is not None:x,y=sx,sy;break
                if hit is None:raise ValueError(f'{name} leaves surface at {px},{py}')
            z=hit.z+radius*.30;projection.append({'stroke':name,'offset':radius*.30})
        coords.append((x,y,z))
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=3;curve.use_fill_caps=True
    spline=curve.splines.new('POLY');spline.points.add(len(coords)-1)
    for p,co in zip(spline.points,coords):p.co=(*co,1)
    ob=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(ob);ob.data.materials.append(ink);parts.append(ob)
    for co in [coords[0],coords[-1]]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=radius,location=co)
        ob=bpy.context.object;ob.name=name+' rounded cap';ob.data.materials.append(ink);parts.append(ob)
for px,py in [(463,122),(497,118)]:
    x,y=xy((px,py));hit,normal,_,_=bvhs[face.name].ray_cast(Vector((x,y,4)),Vector((0,0,-1)))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=hit+normal*.005)
    o=bpy.context.object;o.name='Surface fitted dot eye';o.scale=(.029,.032,.012);o.rotation_euler=normal.to_track_quat('Z','Y').to_euler();o.data.materials.append(ink);parts.append(o)
stroke('Asymmetric little smile',[(476,150),(488,151),(504,147),(515,139)],face,.013)
stroke('Smile corner',[(510,133),(516,137),(521,142)],face,.011)
for name,path in [('Left curl',[(442,67),(451,69),(457,76),(457,83)]),('Middle curl',[(461,57),(474,61),(481,70),(483,83)]),('Tall swept curl',[(444,42),(469,42),(491,42),(504,53),(507,65),(502,83)]),('Right curl',[(517,82),(521,73),(532,68)])]:stroke(name,path,face,.016,True)
if VERSION>=2:
    for name,path,obj in [
        ('Left shoulder fold',[(136,184),(123,193),(115,205),(111,215)],larm),
        ('Left biceps curve',[(290,244),(305,263),(320,287),(326,319),(322,352),(309,383),(298,401)],larm),
        ('Left elbow fold',[(116,385),(129,398)],larm),
        ('Left wrist fold',[(283,403),(293,412),(299,426),(300,441)],larm),
        ('Right shoulder fold',[(794,125),(804,139),(808,153)],rarm),
        ('Right biceps curve',[(673,236),(651,264),(637,301),(632,335),(642,375),(666,413),(698,448)],rarm),
        ('Right elbow fold',[(885,272),(889,286),(887,300),(881,313)],rarm),
        ('Right forearm crease',[(768,554),(797,557),(829,552)],rarm),
        ('Left thumb fold',[(370,455),(381,456),(389,460)],larm),
        ('Right thumb fold',[(499,444),(525,445),(547,440)],rarm),
        ('Vest chest left',[(429,231),(452,233),(479,244),(496,259)],body),
        ('Vest chest right',[(524,239),(509,246),(498,258),(491,273)],body),
        ('Vest belly',[(496,324),(495,349),(486,373),(463,390)],body),
        ('Vest belly right',[(497,371),(511,380),(526,382),(540,375)],body),
    ]:stroke(name,path,obj,.0105 if obj==body else .011)
# Convert all surface marks, export only the model and retain editable Blender sources.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.convert(target='MESH')
for o in bpy.context.selected_objects:
    for p in o.data.polygons:p.use_smooth=True
bpy.ops.object.join();bpy.context.object.name='Strongman sculpt with surface fitted details'
file=ROOT/'public/assets/models/emotions/08_strongman.glb' if VERSION==2 else OUT/'strongman-v1.glb'
bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=False,export_apply=True,export_animations=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.world.color=(.23,.23,.23);scene.view_settings.view_transform='Standard'
scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.film_transparent=True
for loc,power,size in [((-3,5,7),470,5),((4,0,5),260,4),((0,4,-3),350,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,0,9));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=4.8;scene.camera=cam
for view,loc in [('front',(0,0,9)),('angle',(4,1.5,9))]:
    cam.location=loc;d=(Vector((0,0,0))-cam.location).normalized();right=d.cross(Vector((0,1,0))).normalized();up=right.cross(d);cam.rotation_euler=Matrix((right,up,-d)).transposed().to_euler()
    scene.render.filepath=str(OUT/f'v{VERSION}-{view}.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'strongman-v{VERSION}.blend'))
(OUT/f'v{VERSION}-validation.json').write_text(json.dumps({'version':VERSION,'projectedSamples':len(projection),'maxInkCenterOffset':max([p['offset'] for p in projection],default=0),'glb':str(file)},indent=2))
