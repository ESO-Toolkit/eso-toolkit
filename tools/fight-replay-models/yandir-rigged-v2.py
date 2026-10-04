"""Build Yandir's in-place skeletal replay clips from the shipped textured mesh.

Run with the Hunyuan venv Python (bpy required), from the repository root:
  python tools/fight-replay-models/yandir-rigged-v2.py

The mesh, UVs, embedded texture, model orientation and rest dimensions are preserved.
The authored gait uses a 60% stance duty cycle and analytic two-bone leg targets.
"""
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/models/fight-replay/npcs/yandir-the-butcher-overview-v2.glb'
OUTPUT = ROOT / 'public/models/fight-replay/npcs/yandir-the-butcher-rigged-v2.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = mesh
mesh.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
zmin = min(v.co.z for v in mesh.data.vertices)
height = max(v.co.z for v in mesh.data.vertices) - zmin

def p(x, y, z):
    return Vector((x, y, z)) * height

spec = [
    ('pelvis', p(0, 0, .505), p(0, 0, .565), None),
    ('spine', p(0, 0, .565), p(0, 0, .72), 'pelvis'),
    ('chest', p(0, 0, .72), p(0, 0, .825), 'spine'),
    ('neck', p(0, 0, .825), p(0, 0, .87), 'chest'),
    ('head', p(0, 0, .87), p(0, 0, .97), 'neck'),
]
for side, sign in [('L', 1), ('R', -1)]:
    spec.extend([
        (f'upper_arm.{side}', p(sign * .143, 0, .785), p(sign * .187, -.005, .65), 'chest'),
        (f'forearm.{side}', p(sign * .187, -.005, .65), p(sign * .215, -.015, .505), f'upper_arm.{side}'),
        (f'hand.{side}', p(sign * .215, -.015, .505), p(sign * .222, -.025, .445), f'forearm.{side}'),
        (f'thigh.{side}', p(sign * .087, .005, .495), p(sign * .093, -.003, .272), 'pelvis'),
        (f'shin.{side}', p(sign * .093, -.003, .272), p(sign * .093, .01, .065), f'thigh.{side}'),
        (f'foot.{side}', p(sign * .093, .01, .065), p(sign * .093, -.085, .035), f'shin.{side}'),
    ])
mesh.select_set(False)
bpy.ops.object.armature_add(enter_editmode=True)
rig = bpy.context.object
rig.name = 'YandirReplayRig'
rig.data.edit_bones.remove(rig.data.edit_bones[0])
for name, head, tail, parent in spec:
    bone = rig.data.edit_bones.new(name)
    bone.head, bone.tail = head, tail
    if parent:
        bone.parent = rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
rest = {b.name: b.matrix_local.copy() for b in rig.data.bones}
segment = {name: (head, tail) for name, head, tail, _ in spec}
groups = {name: mesh.vertex_groups.new(name=name) for name, *_ in spec}

def smooth(a, b, x):
    t = max(0, min(1, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)

def blend(low, high, amount):
    return {low: 1 - amount, high: amount}

counts = {name: 0 for name in groups}
for vertex in mesh.data.vertices:
    x, y, z = vertex.co / height
    ax = abs(x)
    side = 'L' if x >= 0 else 'R'
    # Narrow blend bands preserve the plate shapes; the front apron follows the pelvis.
    arm_edge = .118 if z < .70 else .138
    if .43 < z < .835 and ax > arm_edge:
        if z < .55:
            weights = blend(f'hand.{side}', f'forearm.{side}', smooth(.495, .555, z))
        elif z < .695:
            weights = blend(f'forearm.{side}', f'upper_arm.{side}', smooth(.625, .685, z))
        else:
            weights = blend(f'upper_arm.{side}', 'chest', smooth(.755, .81, z))
    elif z < .505:
        # The central hanging apron stays with the pelvis rather than stretching between legs.
        if z > .335 and ax < .047 and y < -.043:
            weights = {'pelvis': 1}
        elif z < .14:
            weights = blend(f'foot.{side}', f'shin.{side}', smooth(.105, .14, z))
        elif z < .33:
            weights = blend(f'shin.{side}', f'thigh.{side}', smooth(.255, .29, z))
        else:
            weights = blend(f'thigh.{side}', 'pelvis', smooth(.46, .505, z))
    elif z < .65:
        weights = blend('pelvis', 'spine', smooth(.555, .64, z))
    elif z < .80:
        weights = blend('spine', 'chest', smooth(.685, .75, z))
    else:
        weights = blend('chest', 'head', smooth(.815, .87, z))
    for name, weight in weights.items():
        if weight > 0:
            groups[name].add([vertex.index], weight, 'REPLACE')
            counts[name] += 1
mesh.parent = rig
modifier = mesh.modifiers.new('Skin', 'ARMATURE')
modifier.object = rig

def aimed(name, start, end):
    rest_start, rest_end = segment[name]
    rotation = (rest_end - rest_start).rotation_difference(end - start) @ rest[name].to_quaternion()
    rig.pose.bones[name].matrix = Matrix.LocRotScale(start, rotation, Vector((1, 1, 1)))

def reset():
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    bpy.context.view_layer.update()

STANCE = .60
STRIDE = height * .095

def walk(t):
    reset()
    wave = math.sin(t)
    bob = height * (-.034 + .006 * (1 - math.cos(2 * t)))
    pelvis_motion = Matrix.Translation((height * .016 * wave, 0, bob)) @ Matrix.Rotation(.035 * wave, 4, 'Z') @ Matrix.Rotation(.018 * wave, 4, 'Y')
    rig.pose.bones['pelvis'].matrix = pelvis_motion @ rest['pelvis']
    rig.pose.bones['spine'].rotation_mode = 'XYZ'
    rig.pose.bones['spine'].rotation_euler = (.025, -.075 * wave, -.025 * wave)
    rig.pose.bones['chest'].rotation_mode = 'XYZ'
    rig.pose.bones['chest'].rotation_euler = (.015 * math.cos(2 * t), -.035 * wave, 0)
    bpy.context.view_layer.update()
    for side, sign in [('L', 1), ('R', -1)]:
        phase = (t / (2 * math.pi) + (0 if side == 'L' else .5)) % 1
        hip = pelvis_motion @ segment[f'thigh.{side}'][0]
        if phase <= STANCE:
            foot_y = STRIDE * (2 * phase / STANCE - 1)
            lift = 0
            pitch = 0
        else:
            swing = (phase - STANCE) / (1 - STANCE)
            ease = swing * swing * (3 - 2 * swing)
            foot_y = STRIDE * (1 - 2 * ease)
            lift = height * .072 * math.sin(math.pi * swing)
            pitch = .12 * math.sin(2 * math.pi * swing)
        ankle = segment[f'shin.{side}'][1] + Vector((0, foot_y, lift))
        thigh_length = (segment[f'thigh.{side}'][1] - segment[f'thigh.{side}'][0]).length
        shin_length = (segment[f'shin.{side}'][1] - segment[f'shin.{side}'][0]).length
        direction = ankle - hip
        distance = min(direction.length, thigh_length + shin_length - 1e-5)
        along = direction.normalized()
        forward = Vector((0, -1, 0))
        bend = (forward - along * forward.dot(along)).normalized()
        a = (thigh_length ** 2 - shin_length ** 2 + distance ** 2) / (2 * distance)
        b = math.sqrt(max(0, thigh_length ** 2 - a ** 2))
        knee = hip + along * a + bend * b
        aimed(f'thigh.{side}', hip, knee)
        bpy.context.view_layer.update()
        aimed(f'shin.{side}', knee, ankle)
        bpy.context.view_layer.update()
        foot_vector = segment[f'foot.{side}'][1] - segment[f'foot.{side}'][0]
        aimed(f'foot.{side}', ankle, ankle + Matrix.Rotation(pitch, 3, 'X') @ foot_vector)
        arm_phase = t + (0 if side == 'L' else math.pi)
        rig.pose.bones[f'upper_arm.{side}'].rotation_mode = 'XYZ'
        rig.pose.bones[f'upper_arm.{side}'].rotation_euler.x = .40 * math.cos(arm_phase)
        rig.pose.bones[f'forearm.{side}'].rotation_mode = 'XYZ'
        rig.pose.bones[f'forearm.{side}'].rotation_euler.x = -.12 - .06 * math.cos(arm_phase)
    bpy.context.view_layer.update()


def idle(t):
    reset()
    sway = math.sin(t)
    spine = rig.pose.bones['spine']
    spine.rotation_mode = 'XYZ'
    spine.rotation_euler = (math.radians(3) * sway, 0, math.radians(2) * sway)
    chest = rig.pose.bones['chest']
    chest.rotation_mode = 'XYZ'
    chest.rotation_euler = (math.radians(1.5) * sway,
                            math.radians(1) * math.sin(t + math.pi / 4), 0)
    head = rig.pose.bones['head']
    head.rotation_mode = 'XYZ'
    head.rotation_euler.x = -math.radians(1.5) * sway
    for side in ['L', 'R']:
        arm = rig.pose.bones[f'upper_arm.{side}']
        arm.rotation_mode = 'XYZ'
        arm.rotation_euler.x = math.radians(3) * math.sin(t - math.pi / 4)
    # The lower body stays planted. Rotation, rather than mesh scaling, makes
    # the combat-ready idle readable at replay size without stretching armor.
    bpy.context.view_layer.update()


def cast(t):
    reset()
    # Runtime applies a sin² reaction weight. Keep this pose at full amplitude
    # so the authored clip does not attenuate that envelope a second time.
    chest = rig.pose.bones['chest']
    chest.rotation_mode = 'XYZ'
    chest.rotation_euler.x = .055
    for side in ['L', 'R']:
        arm = rig.pose.bones[f'upper_arm.{side}']
        arm.rotation_mode = 'XYZ'
        arm.rotation_euler.x = .42
        forearm = rig.pose.bones[f'forearm.{side}']
        forearm.rotation_mode = 'XYZ'
        forearm.rotation_euler.x = .25
    bpy.context.view_layer.update()


# Evaluate poses before adding actions so action playback cannot alter the solver.
# Bake local TRS, including translations induced by analytic IK, into glTF-compatible
# quaternion channels. Neither the armature nor mesh receives root translation.
scene = bpy.context.scene
scene.render.fps = 30
scene.frame_start = 0
scene.frame_end = 96
samples = {}
clip_frames = {'idle': 96, 'walk': 60, 'cast': 60}
for name, sampler in [('idle', idle), ('walk', walk), ('cast', cast)]:
    samples[name] = []
    for frame in range(clip_frames[name] + 1):
        sampler(2 * math.pi * frame / clip_frames[name])
        samples[name].append({bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones})
reset()
rig.animation_data_create()
for name, poses in samples.items():
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    for frame, pose in enumerate(poses):
        for bone in rig.pose.bones:
            location, rotation, scale = pose[bone.name].decompose()
            bone.rotation_mode = 'QUATERNION'
            bone.location = location
            bone.rotation_quaternion = rotation
            bone.scale = scale
            for path in ['location', 'rotation_quaternion', 'scale']:
                bone.keyframe_insert(data_path=path, frame=frame, group=bone.name)
    # Linear interpolation matches the sampled glTF tracks, with explicit endpoints.
    for slot in action.slots:
        for layer in action.layers:
            for strip in layer.strips:
                bag = strip.channelbag(slot)
                if bag:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points:
                            key.interpolation = 'LINEAR'
rig.animation_data.action = None
reset()
rig.location = (0, 0, 0)
scene.frame_set(0)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
mesh.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='ACTIONS',
    export_force_sampling=True, export_frame_range=True, export_frame_step=1,
    export_skins=True, export_morph=False, export_yup=True,
    export_image_format='AUTO', export_optimize_animation_size=False,
)
print(json.dumps({
    'output': str(OUTPUT), 'height': height,
    'walk_distance_per_cycle': 2 * STRIDE / STANCE,
    'clip_duration_seconds': {name: frames / scene.render.fps for name, frames in clip_frames.items()},
    'samples_per_clip': {name: frames + 1 for name, frames in clip_frames.items()},
    'vertices_before_export': len(mesh.data.vertices),
    'triangles': sum(len(poly.vertices) - 2 for poly in mesh.data.polygons),
    'bones': len(rig.data.bones), 'materials': len(mesh.data.materials),
}, indent=2))
