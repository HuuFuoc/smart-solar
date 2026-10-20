import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SimulationDetail, WorldPoint } from '@/types/res/simulationsRes'

/*
  Cảnh 3D của một lần mô phỏng, dựng thẳng từ toạ độ backend trả về (không tự tính lại bố trí):
  - Hệ thế giới của backend: E = Đông, N = Bắc, U = lên, mét, gốc là góc trên-trái mặt lắp. Dùng nguyên X = Đông,
    Y = Bắc, Z = lên và đặt camera.up = (0, 0, 1) nên quaternion của từng tấm áp thẳng, không phải đổi cơ sở.
  - Tấm pin: hộp đơn vị có mặt trước ở z = 0, độ dày về -z (đúng `layout.details.frame.panelFrame`), phóng theo
    physical (rộng, dài, dày), đặt ở worldCenter với worldRotation. Một InstancedMesh cho mọi tấm (tới 5.000 tấm).
  - Mặt mái theo surfaceCornersWorld; vật cản theo baseCornersWorld + chiều cao dọc pháp tuyến mặt mái.
  - Thân nhà chỉ để minh hoạ: tường thả từ mép mái xuống mặt đất thấp hơn góc thấp nhất 4 m.
  Tách module để three.js chỉ tải khi mở góc nhìn 3D (React.lazy). Vẽ theo yêu cầu (frameloop "demand").
  Màu vật liệu là hex cố định vì three.js không đọc được token oklch; cùng tông với --pv-glass / --pv-frame của mặt bằng 2D.
*/

export type SceneView = 'angle' | 'top' | 'front'

const WALL_HEIGHT = 4
/** Vật cản chưa khai chiều cao: vẽ một tấm mỏng để vẫn thấy vị trí. */
const FLAT_OBSTACLE_M = 0.15
const COLORS = {
  wall: '#d5d9cf',
  roof: '#9fa79c',
  obstacle: '#c98b4a',
  panel: '#1f2b40',
  frame: '#c4cad2',
  cell: '#33435f',
  back: '#3a3f47',
}
const GROUND = {
  light: { ground: '#e3e7de', letter: '#2f3a2c' },
  dark: { ground: '#2a2e29', letter: '#c9d1c7' },
}

const v3 = (p: WorldPoint) => new THREE.Vector3(p.e, p.n, p.u)

/* Trang đang ở giao diện tối? Đọc color-scheme của <html> (globals.css đặt theo hệ thống hoặc data-theme), theo dõi khi đổi. */
function useDarkScheme() {
  const read = () => getComputedStyle(document.documentElement).colorScheme.includes('dark')
  const [dark, setDark] = useState(read)
  useEffect(() => {
    const update = () => setDark(read())
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', update)
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      media.removeEventListener('change', update)
      observer.disconnect()
    }
  }, [])
  return dark
}

/** Lăng trụ 8 đỉnh: 4 đỉnh đáy + 4 đỉnh đỉnh cùng thứ tự (đủ cho thân nhà và vật cản). */
function prism(bottom: THREE.Vector3[], top: THREE.Vector3[]) {
  const v = [...bottom, ...top]
  const faces = [
    [0, 1, 2, 3], // đáy
    [4, 7, 6, 5], // đỉnh
    [0, 4, 5, 1],
    [1, 5, 6, 2],
    [2, 6, 7, 3],
    [3, 7, 4, 0],
  ]
  const positions: number[] = []
  for (const [a, b, c, d] of faces) {
    for (const i of [a, b, c, a, c, d]) positions.push(v[i!]!.x, v[i!]!.y, v[i!]!.z)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.computeVertexNormals()
  return g
}

function Building({ corners, groundZ }: { corners: THREE.Vector3[]; groundZ: number }) {
  const geometry = useMemo(() => prism(corners.map((c) => new THREE.Vector3(c.x, c.y, groundZ)), corners), [corners, groundZ])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={COLORS.wall} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* Mặt mái: tứ giác theo surfaceCornersWorld, nhích 1 cm theo pháp tuyến để không chập với đỉnh thân nhà. */
function Roof({ corners, normal }: { corners: THREE.Vector3[]; normal: THREE.Vector3 }) {
  const geometry = useMemo(() => {
    const lift = normal.clone().multiplyScalar(0.01)
    const [a, b, c, d] = corners.map((p) => p.clone().add(lift))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((p) => [p!.x, p!.y, p!.z]), 3))
    g.computeVertexNormals()
    return g
  }, [corners, normal])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={COLORS.roof} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Obstacle({ base, height, normal }: { base: THREE.Vector3[]; height: number; normal: THREE.Vector3 }) {
  const geometry = useMemo(() => {
    const up = normal.clone().multiplyScalar(height)
    return prism(base, base.map((p) => p.clone().add(up)))
  }, [base, height, normal])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={COLORS.obstacle} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* Mặt trước tấm pin: kính tối, khung sáng, vân cell 6 × 10 theo cạnh dài (u theo bề rộng, v theo chiều dài tấm). */
function panelFaceTexture(widthM: number, lengthM: number) {
  const LONG = 256
  const w = widthM >= lengthM ? LONG : Math.max(16, Math.round((LONG * widthM) / lengthM))
  const h = lengthM >= widthM ? LONG : Math.max(16, Math.round((LONG * lengthM) / widthM))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = COLORS.frame
  ctx.fillRect(0, 0, w, h)
  const frame = Math.max(2, Math.round(Math.min(w, h) * 0.03))
  ctx.fillStyle = COLORS.panel
  ctx.fillRect(frame, frame, w - 2 * frame, h - 2 * frame)
  const [cellsX, cellsY] = widthM >= lengthM ? [10, 6] : [6, 10]
  ctx.strokeStyle = COLORS.cell
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 1; i < cellsX; i++) {
    const x = Math.round(frame + ((w - 2 * frame) * i) / cellsX) + 0.5
    ctx.moveTo(x, frame)
    ctx.lineTo(x, h - frame)
  }
  for (let j = 1; j < cellsY; j++) {
    const y = Math.round(frame + ((h - 2 * frame) * j) / cellsY) + 0.5
    ctx.moveTo(frame, y)
    ctx.lineTo(w - frame, y)
  }
  ctx.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function Panels({ detail }: { detail: SimulationDetail }) {
  const placements = detail.layout.details.placements
  const ref = useRef<THREE.InstancedMesh>(null)
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const first = placements[0]
  const physicalW = first?.physical.widthM ?? 1
  const physicalL = first?.physical.lengthM ?? 1

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, -0.5), [])
  const materials = useMemo(() => {
    const face = panelFaceTexture(physicalW, physicalL)
    face.anisotropy = maxAnisotropy
    const side = new THREE.MeshStandardMaterial({ color: COLORS.frame, metalness: 0.3, roughness: 0.6 })
    // Thứ tự mặt của BoxGeometry: +x, -x, +y, -y, +z (mặt trước), -z (mặt sau).
    return [side, side, side, side, new THREE.MeshStandardMaterial({ map: face, metalness: 0.2, roughness: 0.5 }), new THREE.MeshStandardMaterial({ color: COLORS.back })]
  }, [physicalW, physicalL, maxAnisotropy])
  useEffect(
    () => () => {
      geometry.dispose()
      for (const m of new Set(materials)) {
        m.map?.dispose()
        m.dispose()
      }
    },
    [geometry, materials],
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const rotation = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    placements.forEach((p, i) => {
      position.set(p.worldCenter.e, p.worldCenter.n, p.worldCenter.u)
      rotation.set(p.worldRotation.x, p.worldRotation.y, p.worldRotation.z, p.worldRotation.w)
      scale.set(p.physical.widthM, p.physical.lengthM, p.physical.thicknessM)
      mesh.setMatrixAt(i, matrix.compose(position, rotation, scale))
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [placements])

  if (placements.length === 0) return null
  return <instancedMesh ref={ref} args={[geometry, materials, placements.length]} />
}

/* Chữ chỉ hướng trên mặt đất (B, Đ, N, T), vẽ bằng canvas để không phải tải font 3D. */
function Letter({ text, color, position, size }: { text: string; color: string; position: [number, number, number]; size: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.font = '600 92px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 64, 70)
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [text, color])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  )
}

function Ground({ center, z, radius, letterRadius }: { center: THREE.Vector3; z: number; radius: number; letterRadius: number }) {
  const palette = useDarkScheme() ? GROUND.dark : GROUND.light
  const size = Math.max(letterRadius * 0.12, 2)
  const at = (dx: number, dy: number): [number, number, number] => [center.x + dx, center.y + dy, z + size / 2]
  return (
    <>
      <mesh position={[center.x, center.y, z - 0.02]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color={palette.ground} />
      </mesh>
      <Letter text="B" color={palette.letter} position={at(0, letterRadius)} size={size} />
      <Letter text="N" color={palette.letter} position={at(0, -letterRadius)} size={size} />
      <Letter text="Đ" color={palette.letter} position={at(letterRadius, 0)} size={size} />
      <Letter text="T" color={palette.letter} position={at(-letterRadius, 0)} size={size} />
    </>
  )
}

/* Xoay / phóng to của three.js (không dùng drei) quanh tâm mặt mái + đặt camera theo góc nhìn đã chọn. Trục lên là Z. */
function Rig({ view, distance, facing, target }: { view: SceneView; distance: number; facing: THREE.Vector3; target: THREE.Vector3 }) {
  const camera = useThree((s) => s.camera)
  const dom = useThree((s) => s.gl.domElement)
  const invalidate = useThree((s) => s.invalidate)
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    camera.up.set(0, 0, 1)
    const controls = new OrbitControls(camera, dom)
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.minDistance = 2
    controls.maxDistance = distance * 3
    /*
      Khung 3D cao gần bằng màn hình nên không được nuốt thao tác cuộn trang: lăn thường thì cuộn trang, Ctrl/Cmd + lăn
      (cả chụm hai ngón trên touchpad) mới phóng to; cảm ứng vuốt dọc để cuộn trang (touch-action: pan-y).
    */
    controls.enableZoom = false
    const onWheel = (e: WheelEvent) => {
      controls.enableZoom = e.ctrlKey || e.metaKey
    }
    // Cảm ứng: bật phóng to để chụm hai ngón dùng được (chuột thì vẫn chỉ Ctrl + lăn mới phóng to).
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') controls.enableZoom = true
    }
    dom.addEventListener('wheel', onWheel, { capture: true, passive: true })
    dom.addEventListener('pointerdown', onPointerDown, { capture: true })
    if (controls.domElement) controls.domElement.style.touchAction = 'pan-y'
    const onChange = () => invalidate()
    controls.addEventListener('change', onChange)
    controlsRef.current = controls
    return () => {
      dom.removeEventListener('wheel', onWheel, { capture: true })
      dom.removeEventListener('pointerdown', onPointerDown, { capture: true })
      controls.removeEventListener('change', onChange)
      controls.dispose()
      controlsRef.current = null
    }
  }, [camera, dom, distance, invalidate])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const up = new THREE.Vector3(0, 0, 1)
    const side = new THREE.Vector3(facing.y, -facing.x, 0)
    if (view === 'top') {
      // Lệch nhẹ về phía mép thấp: nhìn thẳng xuống đúng trục lên thì OrbitControls không xác định được hướng.
      camera.position.copy(target).add(up.clone().multiplyScalar(distance * 1.15)).add(facing.clone().multiplyScalar(0.01))
    } else if (view === 'front') {
      // Cao hơn một chút để chữ hướng ở phía trước nhà (giữa camera và mái) không rơi khỏi mép dưới khung.
      camera.position.copy(target).add(facing.clone().multiplyScalar(distance * 1.1)).add(up.clone().multiplyScalar(distance * 0.5))
    } else {
      camera.position
        .copy(target)
        .add(facing.clone().multiplyScalar(distance * 0.8))
        .add(side.multiplyScalar(distance * 0.55))
        .add(up.clone().multiplyScalar(distance * 0.75))
    }
    controls.target.copy(target)
    controls.update()
    invalidate()
  }, [view, distance, facing, target, camera, invalidate])

  return null
}

export function SimulationScene({ detail, view }: { detail: SimulationDetail; view: SceneView }) {
  const frame = detail.layout.details.frame
  const corners = useMemo(() => frame.surfaceCornersWorld.map(v3), [frame])
  const normal = useMemo(() => v3(frame.surfaceNormalWorld).normalize(), [frame])
  const target = useMemo(() => corners.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / corners.length), [corners])
  const groundZ = Math.min(...corners.map((c) => c.z)) - WALL_HEIGHT
  const span = Math.max(detail.surface.widthM, detail.surface.lengthM)
  const distance = span * 1.3 + 10
  // Hướng mặt mái nhìn ra trên mặt phẳng ngang: phương vị 0° = Bắc (+Y), 90° = Đông (+X).
  const facing = useMemo(() => {
    const theta = (detail.surface.azimuthDegree * Math.PI) / 180
    return new THREE.Vector3(Math.sin(theta), Math.cos(theta), 0)
  }, [detail.surface.azimuthDegree])
  const obstacles = useMemo(
    () => detail.surface.obstacles.map((o) => ({ base: o.baseCornersWorld.map(v3), height: o.heightM && o.heightM > 0 ? o.heightM : FLAT_OBSTACLE_M })),
    [detail.surface.obstacles],
  )

  return (
    /*
      `key` theo cỡ cảnh: prop `camera` chỉ áp lúc tạo canvas, mà khung 3D được giữ lại khi đổi sang lần chạy khác (kết quả cũ
      giữ trên màn trong lúc tải). Đổi sang mái cỡ khác thì tạo lại canvas để mặt phẳng xa đúng (rà code 09/10/2026: mái 200 m
      bị cắt mất).
    */
    <Canvas key={Math.round(distance)} frameloop="demand" dpr={[1, 2]} camera={{ fov: 40, near: 0.1, far: distance * 10, up: [0, 0, 1] }}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[target.x + distance * 0.3, target.y - distance * 0.4, target.z + distance]} intensity={1.5} />
      <Building corners={corners} groundZ={groundZ} />
      <Roof corners={corners} normal={normal} />
      {obstacles.map((o, i) => (
        <Obstacle key={i} base={o.base} height={o.height} normal={normal} />
      ))}
      <Panels detail={detail} />
      <Ground center={target} z={groundZ} radius={distance * 0.9} letterRadius={span * 0.62 + 3} />
      <Rig view={view} distance={distance} facing={facing} target={target} />
    </Canvas>
  )
}
