import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SunPosition } from '@/features/pre-surveys/sunPosition'
import type { PanelPlacement, SimulationDetail, WorldPoint } from '@/types/res/simulationsRes'

// Cảnh 3D của một lần mô phỏng, dựng thẳng từ toạ độ backend trả về (không tự tính lại bố trí).
// Hệ toạ độ: X = Đông, Y = Bắc, Z = lên, đơn vị mét. Camera đặt trục lên là Z (camera.up = (0, 0, 1)).
// Tấm pin vẽ bằng một InstancedMesh (một lần vẽ cho tới 5.000 tấm). Thân nhà chỉ để minh hoạ.
// Đèn chính là mặt trời đặt theo vị trí thật tại công trình vào giờ khách chọn, có đổ bóng.
// File này được tải riêng (React.lazy) để three.js chỉ tải khi khách mở góc nhìn 3D.

export type SceneView = 'angle' | 'top' | 'front'

/** Tường nhà thả từ mép mái xuống mặt đất, thấp hơn góc thấp nhất của mái 4 m */
const WALL_HEIGHT = 4
/** Vật cản chưa có chiều cao: vẽ tấm mỏng để vẫn thấy vị trí */
const FLAT_OBSTACLE_M = 0.15
const DEGREE = Math.PI / 180
// three.js không đọc được màu token (oklch) nên dùng mã màu cố định, cùng tông với mặt bằng 2D
const COLORS = {
  wall: '#d5d9cf',
  roof: '#9fa79c',
  obstacle: '#c98b4a',
  panel: '#1f2b40',
  frame: '#c4cad2',
  cell: '#33435f',
  back: '#3a3f47',
  shaded: '#f2a33a',
}
const GROUND_COLORS = {
  light: { ground: '#e3e7de', letter: '#2f3a2c' },
  dark: { ground: '#2a2e29', letter: '#c9d1c7' },
}

/** Điểm của backend (e = Đông, n = Bắc, u = lên) thành vector của three.js */
function toVector(point: WorldPoint) {
  return new THREE.Vector3(point.e, point.n, point.u)
}

/** Trang đang ở giao diện tối không. Theo dõi cả khi khách đổi giao diện */
function useDarkScheme() {
  const readDark = () => getComputedStyle(document.documentElement).colorScheme.includes('dark')
  const [dark, setDark] = useState(readDark)
  useEffect(() => {
    const update = () => setDark(readDark())
    // Đổi giao diện của hệ điều hành
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', update)
    // Đổi giao diện trong trang (data-theme trên <html>)
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      media.removeEventListener('change', update)
      observer.disconnect()
    }
  }, [])
  return dark
}

/**
 * Khối lăng trụ từ 4 đỉnh đáy và 4 đỉnh trên (cùng thứ tự). Dùng cho thân nhà và vật cản.
 * Mỗi mặt là một tứ giác, chia thành 2 tam giác để three.js vẽ.
 */
function prismGeometry(bottom: THREE.Vector3[], top: THREE.Vector3[]) {
  const vertices = [...bottom, ...top]
  // Chỉ số đỉnh của 6 mặt
  const faces = [
    [0, 1, 2, 3], // đáy
    [4, 7, 6, 5], // trên
    [0, 4, 5, 1],
    [1, 5, 6, 2],
    [2, 6, 7, 3],
    [3, 7, 4, 0],
  ]
  const positions: number[] = []
  for (const [a, b, c, d] of faces) {
    for (const index of [a, b, c, a, c, d]) {
      const vertex = vertices[index!]!
      positions.push(vertex.x, vertex.y, vertex.z)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

/** Thân nhà: tường thả thẳng từ 4 góc mái xuống mặt đất */
function Building({ corners, groundZ }: { corners: THREE.Vector3[]; groundZ: number }) {
  const geometry = useMemo(() => {
    const groundCorners = corners.map((corner) => new THREE.Vector3(corner.x, corner.y, groundZ))
    return prismGeometry(groundCorners, corners)
  }, [corners, groundZ])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={COLORS.wall} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Mặt mái: tứ giác qua 4 góc, nhích lên 1 cm theo pháp tuyến để không chập với đỉnh thân nhà */
function Roof({ corners, normal }: { corners: THREE.Vector3[]; normal: THREE.Vector3 }) {
  const geometry = useMemo(() => {
    const lift = normal.clone().multiplyScalar(0.01)
    const [a, b, c, d] = corners.map((corner) => corner.clone().add(lift))
    const triangles = [a, b, c, a, c, d]
    const positions = triangles.flatMap((point) => [point!.x, point!.y, point!.z])
    const roof = new THREE.BufferGeometry()
    roof.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    roof.computeVertexNormals()
    return roof
  }, [corners, normal])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={COLORS.roof} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Vật cản: khối dựng từ 4 góc đáy, cao theo hướng pháp tuyến của mặt mái */
function Obstacle({ base, height, normal }: { base: THREE.Vector3[]; height: number; normal: THREE.Vector3 }) {
  const geometry = useMemo(() => {
    const up = normal.clone().multiplyScalar(height)
    const top = base.map((point) => point.clone().add(up))
    return prismGeometry(base, top)
  }, [base, height, normal])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={COLORS.obstacle} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** Hình mặt trước tấm pin (vẽ bằng canvas): khung sáng, kính tối, vân cell 6 x 10 theo cạnh dài */
function panelFaceTexture(widthM: number, lengthM: number) {
  const longSide = 256
  const width = widthM >= lengthM ? longSide : Math.max(16, Math.round((longSide * widthM) / lengthM))
  const height = lengthM >= widthM ? longSide : Math.max(16, Math.round((longSide * lengthM) / widthM))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!

  // Khung
  context.fillStyle = COLORS.frame
  context.fillRect(0, 0, width, height)
  // Kính
  const frame = Math.max(2, Math.round(Math.min(width, height) * 0.03))
  context.fillStyle = COLORS.panel
  context.fillRect(frame, frame, width - 2 * frame, height - 2 * frame)

  // Vân cell
  const [cellsX, cellsY] = widthM >= lengthM ? [10, 6] : [6, 10]
  context.strokeStyle = COLORS.cell
  context.lineWidth = 1
  context.beginPath()
  for (let i = 1; i < cellsX; i++) {
    const x = Math.round(frame + ((width - 2 * frame) * i) / cellsX) + 0.5
    context.moveTo(x, frame)
    context.lineTo(x, height - frame)
  }
  for (let j = 1; j < cellsY; j++) {
    const y = Math.round(frame + ((height - 2 * frame) * j) / cellsY) + 0.5
    context.moveTo(frame, y)
    context.lineTo(width - frame, y)
  }
  context.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * Mọi tấm pin, vẽ bằng một InstancedMesh.
 * Mỗi tấm là hộp đơn vị (mặt trước ở z = 0, độ dày về phía -z), phóng theo kích thước thật,
 * đặt ở worldCenter và xoay theo worldRotation mà backend trả về.
 */
function Panels({ detail }: { detail: SimulationDetail }) {
  const placements = detail.layout.details.placements
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
  const firstPanel = placements[0]
  const panelWidth = firstPanel?.physical.widthM ?? 1
  const panelLength = firstPanel?.physical.lengthM ?? 1

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, -0.5), [])
  const materials = useMemo(() => {
    const face = panelFaceTexture(panelWidth, panelLength)
    face.anisotropy = maxAnisotropy
    const side = new THREE.MeshStandardMaterial({ color: COLORS.frame, metalness: 0.3, roughness: 0.6 })
    // Thứ tự mặt của BoxGeometry: +x, -x, +y, -y, +z (mặt trước), -z (mặt sau)
    return [
      side,
      side,
      side,
      side,
      new THREE.MeshStandardMaterial({ map: face, metalness: 0.2, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: COLORS.back }),
    ]
  }, [panelWidth, panelLength, maxAnisotropy])

  useEffect(
    () => () => {
      geometry.dispose()
      for (const material of new Set(materials)) {
        material.map?.dispose()
        material.dispose()
      }
    },
    [geometry, materials],
  )

  // Đặt vị trí, hướng xoay và kích thước cho từng tấm
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const rotation = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    placements.forEach((placement, index) => {
      position.set(placement.worldCenter.e, placement.worldCenter.n, placement.worldCenter.u)
      const { x, y, z, w } = placement.worldRotation
      rotation.set(x, y, z, w)
      scale.set(placement.physical.widthM, placement.physical.lengthM, placement.physical.thicknessM)
      mesh.setMatrixAt(index, matrix.compose(position, rotation, scale))
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [placements])

  if (placements.length === 0) return null
  return <instancedMesh ref={meshRef} args={[geometry, materials, placements.length]} castShadow receiveShadow />
}

/** Chữ chỉ hướng trên mặt đất (B, Đ, N, T), vẽ bằng canvas để khỏi tải font 3D */
function Letter({
  text,
  color,
  position,
  size,
}: {
  text: string
  color: string
  position: [number, number, number]
  size: number
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')!
    context.fillStyle = color
    context.font = '600 92px system-ui, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, 64, 70)
    const letterTexture = new THREE.CanvasTexture(canvas)
    letterTexture.colorSpace = THREE.SRGBColorSpace
    return letterTexture
  }, [text, color])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  )
}

/** Mặt đất tròn quanh nhà, kèm 4 chữ chỉ hướng */
function Ground({
  center,
  z,
  radius,
  letterRadius,
}: {
  center: THREE.Vector3
  z: number
  radius: number
  letterRadius: number
}) {
  const palette = useDarkScheme() ? GROUND_COLORS.dark : GROUND_COLORS.light
  const size = Math.max(letterRadius * 0.12, 2)
  // Vị trí lệch (dx, dy) so với tâm, nằm trên mặt đất
  const around = (dx: number, dy: number): [number, number, number] => [center.x + dx, center.y + dy, z + size / 2]
  return (
    <>
      <mesh position={[center.x, center.y, z - 0.02]} receiveShadow>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color={palette.ground} />
      </mesh>
      <Letter text="B" color={palette.letter} position={around(0, letterRadius)} size={size} />
      <Letter text="N" color={palette.letter} position={around(0, -letterRadius)} size={size} />
      <Letter text="Đ" color={palette.letter} position={around(letterRadius, 0)} size={size} />
      <Letter text="T" color={palette.letter} position={around(-letterRadius, 0)} size={size} />
    </>
  )
}

/** Hướng từ công trình nhìn về mặt trời, vector đơn vị (Đông, Bắc, lên) */
function directionToSun(sun: SunPosition) {
  const elevation = sun.elevation * DEGREE
  const azimuth = sun.azimuth * DEGREE
  return new THREE.Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
  )
}

/**
 * Mặt trời: đèn chiếu song song từ đúng hướng mặt trời, đổ bóng xuống mái và mặt đất.
 * Mặt trời càng thấp thì càng yếu, đã lặn thì tắt (chỉ còn ánh sáng nền).
 * `shadowSize`: nửa bề rộng vùng có bóng quanh tâm mái (mét).
 */
function SunLight({
  sun,
  target,
  distance,
  shadowSize,
}: {
  sun: SunPosition
  target: THREE.Vector3
  distance: number
  shadowSize: number
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const position = target.clone().add(directionToSun(sun).multiplyScalar(distance * 2))
  const intensity = sun.elevation > 0 ? 0.6 + 1.6 * Math.sin(sun.elevation * DEGREE) : 0

  // Đèn chiếu về tâm mái; khung chụp bóng phủ vừa nhà và phần sân quanh nhà
  useLayoutEffect(() => {
    const light = lightRef.current
    if (!light) return
    light.target.position.copy(target)
    light.target.updateMatrixWorld()
    const camera = light.shadow.camera
    camera.left = -shadowSize
    camera.right = shadowSize
    camera.top = shadowSize
    camera.bottom = -shadowSize
    camera.near = 0.5
    camera.far = distance * 4
    camera.updateProjectionMatrix()
  }, [target, shadowSize, distance])

  return (
    <directionalLight
      ref={lightRef}
      position={position}
      intensity={intensity}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
    />
  )
}

/** Mỗi tấm chia thành lưới 3 x 3 ô; ô nào nằm trong bóng thì tính là phần đó của tấm mất nắng */
const GRID = 3
/** Tâm của từng ô, tính theo tỉ lệ chiều rộng / chiều dài tấm (từ -0.5 đến 0.5) */
const CELL_CENTERS = Array.from({ length: GRID * GRID }, (_, i) => ({
  x: ((i % GRID) + 0.5) / GRID - 0.5,
  y: (Math.floor(i / GRID) + 0.5) / GRID - 0.5,
}))

/** Một ô bị che: thuộc tấm nào và nằm ở đâu trên tấm */
type ShadedCell = { panelIndex: number; x: number; y: number }

/** Kết quả dò bóng, báo lên thanh kéo giờ */
export type ShadeSummary = {
  /** Phần trăm diện tích tấm pin không nhận nắng trực tiếp (0 đến 100) */
  shadedPercent: number
  /** Số tấm có ít nhất một ô mất nắng */
  affectedPanels: number
  totalPanels: number
}

/** Mọi ô của một tấm, dùng khi cả tấm không có nắng */
function allCells(panelIndex: number) {
  return CELL_CENTERS.map((cell) => ({ panelIndex, x: cell.x, y: cell.y }))
}

/**
 * Tìm các ô của tấm pin không nhận nắng trực tiếp lúc này:
 * - mặt trời ở sau lưng tấm (tia nắng tới mặt sau) thì cả tấm;
 * - còn lại, từ tâm mỗi ô bắn một tia về phía mặt trời, trúng vật cản là ô đó nằm trong bóng.
 * Chưa tính bóng của tấm này đổ lên tấm khác.
 */
function findShadedCells(placements: PanelPlacement[], obstacles: THREE.Mesh[], toSun: THREE.Vector3) {
  const raycaster = new THREE.Raycaster()
  const rotation = new THREE.Quaternion()
  const normal = new THREE.Vector3()
  const shaded: ShadedCell[] = []
  placements.forEach((placement, panelIndex) => {
    const { x, y, z, w } = placement.worldRotation
    rotation.set(x, y, z, w)
    // Mặt trước tấm hướng theo trục +z của tấm
    normal.set(0, 0, 1).applyQuaternion(rotation)
    if (normal.dot(toSun) <= 0) {
      shaded.push(...allCells(panelIndex))
      return
    }
    if (obstacles.length === 0) return
    const center = toVector(placement.worldCenter)
    for (const cell of CELL_CENTERS) {
      const point = new THREE.Vector3(cell.x * placement.physical.widthM, cell.y * placement.physical.lengthM, 0)
        .applyQuaternion(rotation)
        .add(center)
      raycaster.set(point, toSun)
      if (raycaster.intersectObjects(obstacles, false).length > 0) shaded.push({ panelIndex, x: cell.x, y: cell.y })
    }
  })
  return shaded
}

/** Tổng hợp các ô bị che thành phần trăm diện tích và số tấm bị ảnh hưởng (các tấm cùng cỡ) */
function summarizeShade(cells: ShadedCell[], totalPanels: number): ShadeSummary {
  const affectedPanels = new Set(cells.map((cell) => cell.panelIndex)).size
  const shadedPercent = totalPanels === 0 ? 0 : (cells.length / (totalPanels * GRID * GRID)) * 100
  return { shadedPercent, affectedPanels, totalPanels }
}

/** Lớp phủ cam mờ trên đúng những ô của tấm đang mất nắng */
function ShadedMarkers({ placements, cells }: { placements: PanelPlacement[]; cells: ShadedCell[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const invalidate = useThree((state) => state.invalidate)
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLORS.shaded, transparent: true, opacity: 0.6, depthWrite: false }),
    [],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  // Mỗi ô một lớp phủ, nhích ra 1 cm theo mặt tấm để không chập với mặt kính
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const rotation = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    const offset = new THREE.Vector3()
    cells.forEach((cell, index) => {
      const placement = placements[cell.panelIndex]!
      const { x, y, z, w } = placement.worldRotation
      rotation.set(x, y, z, w)
      const { widthM, lengthM } = placement.physical
      offset.set(cell.x * widthM, cell.y * lengthM, 0.01).applyQuaternion(rotation)
      position.copy(toVector(placement.worldCenter)).add(offset)
      scale.set(widthM / GRID, lengthM / GRID, 1)
      mesh.setMatrixAt(index, matrix.compose(position, rotation, scale))
    })
    // Tạo sẵn đủ chỗ cho mọi ô của mọi tấm, chỉ vẽ số ô đang bị che
    mesh.count = cells.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    invalidate()
  }, [placements, cells, invalidate])

  if (placements.length === 0) return null
  return <instancedMesh ref={meshRef} args={[geometry, material, placements.length * GRID * GRID]} />
}

/** Vị trí camera cho từng góc nhìn. `facing` là hướng mặt mái nhìn ra (nằm ngang) */
function cameraPosition(view: SceneView, target: THREE.Vector3, facing: THREE.Vector3, distance: number) {
  const up = new THREE.Vector3(0, 0, 1)
  const position = target.clone()
  if (view === 'top') {
    // Lệch nhẹ về phía mép thấp, vì nhìn thẳng xuống trục lên thì OrbitControls không xác định được hướng
    return position.add(up.multiplyScalar(distance * 1.15)).add(facing.clone().multiplyScalar(0.01))
  }
  if (view === 'front') {
    // Cao hơn một chút để chữ hướng ở phía trước nhà không rơi khỏi mép dưới khung
    return position.add(facing.clone().multiplyScalar(distance * 1.1)).add(up.multiplyScalar(distance * 0.5))
  }
  // Góc nghiêng: chéo từ phía trước bên phải, nhìn xuống
  const side = new THREE.Vector3(facing.y, -facing.x, 0)
  return position
    .add(facing.clone().multiplyScalar(distance * 0.8))
    .add(side.multiplyScalar(distance * 0.55))
    .add(up.multiplyScalar(distance * 0.75))
}

/** Điều khiển camera: kéo để xoay quanh tâm mái, đặt camera theo góc nhìn đã chọn */
function CameraRig({
  view,
  distance,
  facing,
  target,
}: {
  view: SceneView
  distance: number
  facing: THREE.Vector3
  target: THREE.Vector3
}) {
  const camera = useThree((state) => state.camera)
  const canvasElement = useThree((state) => state.gl.domElement)
  const invalidate = useThree((state) => state.invalidate)
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    camera.up.set(0, 0, 1)
    const controls = new OrbitControls(camera, canvasElement)
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.minDistance = 2
    controls.maxDistance = distance * 3

    // Khung 3D cao gần bằng màn hình nên không được chặn cuộn trang:
    // lăn chuột thường thì cuộn trang, Ctrl / Cmd + lăn mới phóng to
    controls.enableZoom = false
    const handleWheel = (event: WheelEvent) => {
      controls.enableZoom = event.ctrlKey || event.metaKey
    }
    // Cảm ứng thì bật phóng to để chụm hai ngón dùng được (vuốt dọc vẫn cuộn trang)
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') controls.enableZoom = true
    }
    canvasElement.addEventListener('wheel', handleWheel, { capture: true, passive: true })
    canvasElement.addEventListener('pointerdown', handlePointerDown, { capture: true })
    if (controls.domElement) controls.domElement.style.touchAction = 'pan-y'

    // Cảnh chỉ vẽ lại khi cần (frameloop "demand"), nên báo vẽ lại mỗi khi xoay
    const handleChange = () => invalidate()
    controls.addEventListener('change', handleChange)
    controlsRef.current = controls
    return () => {
      canvasElement.removeEventListener('wheel', handleWheel, { capture: true })
      canvasElement.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      controls.removeEventListener('change', handleChange)
      controls.dispose()
      controlsRef.current = null
    }
  }, [camera, canvasElement, distance, invalidate])

  // Đổi góc nhìn: đặt lại camera và tâm xoay
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    camera.position.copy(cameraPosition(view, target, facing, distance))
    controls.target.copy(target)
    controls.update()
    invalidate()
  }, [view, distance, facing, target, camera, invalidate])

  return null
}

type SceneProps = {
  detail: SimulationDetail
  view: SceneView
  /** Vị trí mặt trời tại công trình vào giờ khách chọn */
  sun: SunPosition
  /** Báo phần diện tích tấm pin mất nắng lúc này */
  onShadeChange?: (shade: ShadeSummary) => void
}

export function SimulationScene({ detail, view, sun, onShadeChange }: SceneProps) {
  const frame = detail.layout.details.frame
  const corners = useMemo(() => frame.surfaceCornersWorld.map(toVector), [frame])
  const normal = useMemo(() => toVector(frame.surfaceNormalWorld).normalize(), [frame])
  // Tâm mặt mái: trung bình 4 góc
  const target = useMemo(() => {
    const sum = corners.reduce((total, corner) => total.add(corner), new THREE.Vector3())
    return sum.multiplyScalar(1 / corners.length)
  }, [corners])
  const groundZ = Math.min(...corners.map((corner) => corner.z)) - WALL_HEIGHT
  const span = Math.max(detail.surface.widthM, detail.surface.lengthM)
  const distance = span * 1.3 + 10
  // Hướng mặt mái nhìn ra trên mặt phẳng ngang: phương vị 0° = Bắc (+Y), 90° = Đông (+X)
  const facing = useMemo(() => {
    const radians = (detail.surface.azimuthDegree * Math.PI) / 180
    return new THREE.Vector3(Math.sin(radians), Math.cos(radians), 0)
  }, [detail.surface.azimuthDegree])
  const obstacles = useMemo(
    () =>
      detail.surface.obstacles.map((obstacle) => ({
        base: obstacle.baseCornersWorld.map(toVector),
        height: obstacle.heightM && obstacle.heightM > 0 ? obstacle.heightM : FLAT_OBSTACLE_M,
      })),
    [detail.surface.obstacles],
  )

  // Khối vật cản chỉ dùng để dò bóng (không vẽ). Mặt hai phía để tia đi từ phía nào cũng trúng
  const shadowCasters = useMemo(
    () =>
      obstacles.map((obstacle) => {
        const up = normal.clone().multiplyScalar(obstacle.height)
        const top = obstacle.base.map((point) => point.clone().add(up))
        return new THREE.Mesh(
          prismGeometry(obstacle.base, top),
          new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
        )
      }),
    [obstacles, normal],
  )
  useEffect(
    () => () => {
      for (const mesh of shadowCasters) {
        const material = mesh.material as THREE.Material
        mesh.geometry.dispose()
        material.dispose()
      }
    },
    [shadowCasters],
  )

  const placements = detail.layout.details.placements
  const { elevation, azimuth } = sun
  // Mặt trời đã lặn thì không ô nào có nắng
  const shadedCells = useMemo(() => {
    if (elevation <= 0) return placements.flatMap((_, panelIndex) => allCells(panelIndex))
    return findShadedCells(placements, shadowCasters, directionToSun({ elevation, azimuth }))
  }, [placements, shadowCasters, elevation, azimuth])
  useEffect(() => {
    onShadeChange?.(summarizeShade(shadedCells, placements.length))
  }, [shadedCells, placements.length, onShadeChange])

  return (
    // `key` theo cỡ cảnh: camera chỉ áp dụng lúc tạo canvas, mà canvas được giữ lại khi đổi sang lần chạy khác.
    // Đổi sang mái cỡ khác thì tạo lại canvas để mặt phẳng xa (far) đúng, nếu không mái lớn bị cắt mất
    <Canvas
      key={Math.round(distance)}
      frameloop="demand"
      dpr={[1, 2]}
      // Bóng mềm (PCFSoftShadowMap) đã bị bỏ ở three.js bản mới nên dùng kiểu PCF thường
      shadows="percentage"
      camera={{ fov: 40, near: 0.1, far: distance * 10, up: [0, 0, 1] }}
    >
      <ambientLight intensity={0.55} />
      <SunLight sun={sun} target={target} distance={distance} shadowSize={span + 20} />
      <Building corners={corners} groundZ={groundZ} />
      <Roof corners={corners} normal={normal} />
      {obstacles.map((obstacle, index) => (
        <Obstacle key={index} base={obstacle.base} height={obstacle.height} normal={normal} />
      ))}
      <Panels detail={detail} />
      <ShadedMarkers placements={placements} cells={shadedCells} />
      <Ground center={target} z={groundZ} radius={distance * 0.9} letterRadius={span * 0.62 + 3} />
      <CameraRig view={view} distance={distance} facing={facing} target={target} />
    </Canvas>
  )
}
