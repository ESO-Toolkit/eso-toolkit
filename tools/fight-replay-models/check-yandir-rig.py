"""CPU-only exported Yandir asset checks; run with the Hunyuan bpy interpreter.

Example: python tools/fight-replay-models/check-yandir-rig.py --require-visible
Silhouette measurements use orthographic projections of the actual deformed mesh,
at 48 pixels of projected rest-pose height. They measure outer support boundaries,
not shaded pixels, occluded interior details, or an animation bone-angle proxy.
"""

import argparse
import hashlib
import json
import math
import struct
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix


ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--model', type=Path, default=ROOT / 'public/models/fight-replay/npcs/yandir-the-butcher-rigged-v2.glb')
parser.add_argument('--source', type=Path, default=ROOT / 'public/models/fight-replay/npcs/yandir-the-butcher-overview-v2.glb')
parser.add_argument('--output', type=Path, default=ROOT / 'scratch/yandir-rig-validation.json')
parser.add_argument('--min-idle-pixels', type=float, default=1.0)
parser.add_argument('--require-visible', action='store_true', help='Fail if any reviewed angle has less than the requested idle boundary motion.')
args = parser.parse_args()


def read_glb(path):
    blob = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', blob)
    assert magic == 0x46546C67 and version == 2 and length == len(blob)
    offset, document, binary = 12, None, None
    while offset < length:
        size, kind = struct.unpack_from('<II', blob, offset)
        chunk = blob[offset + 8:offset + 8 + size]
        if kind == 0x4E4F534A:
            document = json.loads(chunk)
        elif kind == 0x004E4942:
            binary = chunk
        offset += 8 + size
    assert document is not None and binary is not None
    return document, binary


def accessor(document, binary, index):
    item = document['accessors'][index]
    assert 'sparse' not in item, 'Sparse accessors need explicit decoding.'
    view = document['bufferViews'][item['bufferView']]
    components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[item['type']]
    dtype = {5126: '<f4', 5123: '<u2', 5125: '<u4', 5121: 'u1'}[item['componentType']]
    width = np.dtype(dtype).itemsize
    values = np.ndarray((item['count'], components), dtype=dtype, buffer=binary,
                        offset=view.get('byteOffset', 0) + item.get('byteOffset', 0),
                        strides=(view.get('byteStride', width * components), width))
    if item.get('normalized') and item['componentType'] != 5126:
        return values.astype(float) / np.iinfo(dtype).max
    return values


def embedded_images(document, binary):
    result = []
    for image in document['images']:
        assert 'bufferView' in image and 'uri' not in image
        view = document['bufferViews'][image['bufferView']]
        start = view.get('byteOffset', 0)
        result.append(hashlib.sha256(binary[start:start + view['byteLength']]).hexdigest())
    return result


doc, data = read_glb(args.model)
source, source_data = read_glb(args.source)
assert len(doc['skins']) == 1
joints = set(doc['skins'][0]['joints'])
assert len(joints) == 17
assert sorted(a['name'] for a in doc['animations']) == ['cast', 'idle', 'walk']
clips = []
for animation in doc['animations']:
    endpoint_error, duration = 0.0, 0.0
    for channel in animation['channels']:
        assert channel['target']['node'] in joints, 'Animation must target bones only: stationary scene root.'
        assert channel['target']['path'] in ('rotation', 'translation', 'scale')
        sampler = animation['samplers'][channel['sampler']]
        assert sampler.get('interpolation', 'LINEAR') == 'LINEAR'
        times = accessor(doc, data, sampler['input'])[:, 0]
        values = accessor(doc, data, sampler['output'])
        assert np.isfinite(times).all() and np.isfinite(values).all()
        assert np.all(np.diff(times) > 0) and abs(float(times[0])) < 1e-6
        duration = max(duration, float(times[-1]))
        error = float(np.max(np.abs(values[0] - values[-1])))
        if channel['target']['path'] == 'rotation':
            error = min(error, float(np.max(np.abs(values[0] + values[-1]))))
            assert np.max(np.abs(np.linalg.norm(values, axis=1) - 1)) < 1e-5
        endpoint_error = max(endpoint_error, error)
    allowed_durations = (2.0, 3.2) if animation['name'] == 'idle' else (2.0,)
    assert min(abs(duration - expected) for expected in allowed_durations) < 1e-6
    assert endpoint_error < 1e-5
    clips.append({'name': animation['name'], 'duration': duration, 'endpoint_error': endpoint_error})
durations = {clip['name']: clip['duration'] for clip in clips}

primitive = doc['meshes'][0]['primitives'][0]
source_primitive = source['meshes'][0]['primitives'][0]
positions = accessor(doc, data, primitive['attributes']['POSITION'])
source_positions = accessor(source, source_data, source_primitive['attributes']['POSITION'])
assert np.array_equal(positions.min(axis=0), source_positions.min(axis=0))
assert np.array_equal(positions.max(axis=0), source_positions.max(axis=0))
assert embedded_images(doc, data) == embedded_images(source, source_data)
weights = accessor(doc, data, primitive['attributes']['WEIGHTS_0'])
assert np.isfinite(weights).all() and np.min(weights) >= 0
weight_error = float(np.max(np.abs(weights.sum(axis=1) - 1)))
assert weight_error < 1e-6
height = float(np.ptp(positions[:, 1]))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.model.resolve()))
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
for track in rig.animation_data.nla_tracks:
    track.mute = True
rig.animation_data.action = None
for bone in rig.pose.bones:
    bone.matrix_basis.identity()
bpy.context.view_layer.update()
scene = bpy.context.scene
fps = scene.render.fps / scene.render.fps_base
root_transform = rig.matrix_world.copy()


def vertices():
    bpy.context.view_layer.update()
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    values = np.empty(len(evaluated.data.vertices) * 3, dtype=np.float32)
    evaluated.data.vertices.foreach_get('co', values)
    world = np.asarray(evaluated.matrix_world, dtype=np.float64)
    result = values.reshape(-1, 3) @ world[:3, :3].T + world[:3, 3]
    assert np.isfinite(result).all(), 'Deformed mesh contains non-finite positions.'
    return result


rest_vertices = vertices()
soles = {}
for side in ('L', 'R'):
    group = mesh.vertex_groups['foot.' + side].index
    soles[side] = [v.index for v in mesh.data.vertices if v.co.z < .018 * height
                   and any(g.group == group and g.weight > .99 for g in v.groups)]
    assert soles[side], 'No fully weighted sole vertices.'


def sample(clip, seconds):
    action = bpy.data.actions[clip]
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    frame = seconds * fps
    scene.frame_set(int(frame), subframe=frame % 1)
    assert max(abs(a - b) for row_a, row_b in zip(root_transform, rig.matrix_world)
               for a, b in zip(row_a, row_b)) < 1e-6
    return vertices()


directions = np.stack((np.cos(np.linspace(0, 2 * math.pi, 32, endpoint=False)),
                       np.sin(np.linspace(0, 2 * math.pi, 32, endpoint=False))))
views = []
for azimuth in (0, 45, 90, 135):
    azimuth_radians = math.radians(azimuth)
    elevation = math.radians(45)
    right = np.array((math.cos(azimuth_radians), math.sin(azimuth_radians), 0))
    up = np.array((-math.sin(azimuth_radians) * math.sin(elevation),
                   math.cos(azimuth_radians) * math.sin(elevation), math.cos(elevation)))
    basis = np.stack((right, up), axis=1)
    scale = 48 / np.ptp((rest_vertices @ basis)[:, 1])
    views.append((azimuth, basis, scale))


def boundaries(values):
    return [(values @ basis @ directions).max(axis=0) * scale for _, basis, scale in views]


motion = {}
contact = {}
for clip in ('idle', 'cast', 'walk'):
    projected = [[] for _ in views]
    max_sole_displacement, ground_error, slide = 0.0, 0.0, 0.0
    previous = {}
    for index in range(round(durations[clip] * 30) + 1):
        seconds = index / 30
        values = sample(clip, seconds)
        if index % 2 == 0:
            for samples, boundary in zip(projected, boundaries(values)):
                samples.append(boundary)
        for side, indices in soles.items():
            foot = values[indices]
            if clip != 'walk':
                max_sole_displacement = max(max_sole_displacement,
                                            float(np.max(np.linalg.norm(foot - rest_vertices[indices], axis=1))))
            else:
                phase = (seconds / durations['walk'] + (0 if side == 'L' else .5)) % 1
                if phase <= .60:
                    ground_error = max(ground_error, abs(float(foot[:, 2].min())))
                    # Replay advances by this distance per cycle; compensate stance motion.
                    point = foot[0].copy()
                    point[1] -= (2 * height * .095 / .60) * seconds / durations['walk']
                    if side in previous and previous[side][0] == index - 1:
                        slide = max(slide, float(np.linalg.norm(point - previous[side][1])))
                    previous[side] = (index, point)
                else:
                    previous.pop(side, None)
    per_view = []
    for (azimuth, _, _), values in zip(views, projected):
        ranges = np.ptp(values, axis=0)
        per_view.append({'azimuth_degrees': azimuth, 'elevation_degrees': 45,
                         'max_boundary_travel_pixels': float(ranges.max()),
                         'p95_boundary_travel_pixels': float(np.percentile(ranges, 95))})
    motion[clip] = per_view
    if clip == 'walk':
        assert ground_error < height * .0003, 'Walk stance ground contact degraded.'
        assert slide < height * .00001, 'Walk stance sliding degraded.'
        contact[clip] = {'max_ground_error': ground_error, 'max_compensated_stance_step': slide}
    else:
        assert max_sole_displacement < height * .00001, 'Idle/cast feet must remain planted.'
        contact[clip] = {'max_sole_displacement': max_sole_displacement}

# Mimic the production stationary cast crossfade: idle*(1-pulse) + cast*pulse,
# with a 600ms sin^2 pulse and the complete authored two-second cast clip.
cast_blended = [[] for _ in views]


def blended_cast(elapsed):
    sample('idle', (elapsed + .47) % durations['idle'])
    idle_vertices = vertices()
    idle_pose = {b.name: b.matrix_basis.copy().decompose() for b in rig.pose.bones}
    sample('cast', elapsed / .6 * durations['cast'])
    cast_pose = {b.name: b.matrix_basis.copy().decompose() for b in rig.pose.bones}
    pulse = math.sin(math.pi * elapsed / .6) ** 2
    rig.animation_data.action = None
    for bone in rig.pose.bones:
        il, iq, isc = idle_pose[bone.name]
        cl, cq, csc = cast_pose[bone.name]
        bone.matrix_basis = Matrix.LocRotScale(il.lerp(cl, pulse), iq.slerp(cq, pulse), isc.lerp(csc, pulse))
    return vertices(), idle_vertices


for index in range(31):
    values, _ = blended_cast(.6 * index / 30)
    for samples, boundary in zip(cast_blended, boundaries(values)):
        samples.append(boundary)
cast_readability = []
for (azimuth, _, _), values in zip(views, cast_blended):
    values = np.asarray(values)
    displacements = np.max(np.abs(values - values[0]), axis=1)
    cast_readability.append({'azimuth_degrees': azimuth,
                             'peak_boundary_displacement_pixels': float(displacements.max()),
                             'samples_at_least_one_pixel': int(np.sum(displacements >= 1)),
                             'sample_interval_ms': 20})

cast_edges = []
for elapsed in (0, .001, .01, .59, .599, .6):
    blended, idle = blended_cast(elapsed)
    error = max(float(np.max(np.abs(a - b))) for a, b in zip(boundaries(blended), boundaries(idle)))
    if elapsed in (0, .6):
        assert error < 1e-5, 'Cast envelope endpoint must match contemporaneous idle.'
    else:
        assert error < .15, 'Cast envelope near-edge deformation must remain smooth.'
    cast_edges.append({'elapsed_ms': elapsed * 1000, 'max_difference_from_idle_pixels': error})

visible = all(view['max_boundary_travel_pixels'] >= args.min_idle_pixels for view in motion['idle'])
report = {'model': str(args.model), 'sha256': hashlib.sha256(args.model.read_bytes()).hexdigest(),
          'structural_guards_passed': True, 'contact_guards_passed': True,
          'texture_bytes_unchanged': True, 'rest_mesh_bounds_unchanged': True,
          'vertices': len(positions), 'joints': len(joints), 'weight_sum_max_error': weight_error,
          'clips': clips, 'contact': contact, 'silhouette_at_48px': motion,
          'production_stationary_cast': cast_readability, 'cast_envelope_edge_checks': cast_edges,
          'idle_visibility_passed': visible,
          'minimum_idle_boundary_travel_pixels': args.min_idle_pixels,
          'measurement_note': 'Orthographic convex outer boundary support, 32 directions, four 45-degree elevated views; excludes shading and interior contours.'}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
if args.require_visible and not visible:
    raise SystemExit('Idle silhouette visibility threshold failed; see output JSON.')
