import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { useResolvedTheme, type ResolvedTheme } from '@/hooks/useTheme'

/*
  Một tấm pin mặt trời 3D cho trang chủ, dựng hoàn toàn bằng hình học và vật liệu trong code (không tải model ngoài).
  Kích thước theo một tấm 120 cell cắt nửa phổ biến: 1722 × 1134 × 35 mm.
    - mặt trước: kính (clearcoat) phủ 6 × 20 cell xanh đen, khe giữa cell lộ tấm nền trắng, 9 thanh dẫn mỗi hàng
    - khung nhôm định hình: gờ ôm mép kính, thành ngoài dày 35 mm, gờ sau gập vào trong
    - mặt sau: tấm nền trắng lõm trong khung, 3 hộp đấu dây, 2 dây cáp có đầu nối, một nhãn trơn
  Toạ độ của tấm: X theo cạnh dài, Y theo cạnh ngắn, Z vuông góc (mặt trước +Z). Trục lên của cảnh là Y.

  Tương tác: kéo để xoay (chuột, bút, vuốt ngang trên điện thoại), phím mũi tên khi đang focus. Tấm xoay quanh tâm của
  nó (bàn xoay nghiêng: kéo ngang quay quanh trục đứng, kéo dọc nghiêng trong khoảng hẹp), không dịch chuyển, không
  phóng to, không tự xoay. Cảm ứng để trình duyệt giữ vuốt dọc (touch-action: pan-y) nên cuộn trang vẫn như thường.
  Vẽ theo yêu cầu (frameloop "demand"): đứng yên thì không tốn GPU.
  Màu vật liệu là hex cố định vì three.js không đọc được token oklch; nền trong suốt để thấy nền của section.
*/

const PANEL = {
  w: 1.722,
  h: 1.134,
  /** thành khung: dày 5 mm, sâu 35 mm, gờ trước ôm kính 14 mm, gờ sau 25 mm */
  wall: 0.005,
  depth: 0.035,
  lip: 0.014,
  lipT: 0.0025,
  flange: 0.025,
  flangeT: 0.003,
  /** tấm ép (kính + cell + tấm nền) */
  laminate: 0.004,
}
/** Mặt kính ở z = 0; khung từ z = +lipT xuống z = -(depth - lipT). Dời cả tấm để tâm xoay nằm giữa bề dày. */
const BACK_Z = -(PANEL.depth - PANEL.lipT)
const PIVOT_Z = -(PANEL.lipT + BACK_Z) / 2

/** Tư thế ban đầu: ngả ra sau, quay chéo sang trái để thấy mặt pin và bề dày khung bên phải. */
const BASE_TILT = -0.5
const START = { yaw: -0.58, pitch: 0.05 }
const PITCH_LIMIT: [number, number] = [-0.3, 0.38]
const GROUND_Y = -0.84

const COLORS = {
  frame: '#c2c8cf',
  laminateEdge: '#1d2128',
  backsheet: '#eceef1',
  plastic: '#16181c',
  cable: '#121315',
}

/** Ánh sáng theo giao diện: sáng = nắng ấm dịu, bóng nhạt; tối = ánh trăng lạnh, môi trường tối hơn, bóng đậm hơn để còn thấy. */
const LOOK: Record<
  ResolvedTheme,
  { exposure: number; env: number; sky: string; ground: string; hemi: number; key: string; keyI: number; fill: string; fillI: number; rimI: number; bounceI: number; shadow: number }
> = {
  light: { exposure: 1, env: 0.9, sky: '#ffffff', ground: '#d6dace', hemi: 0.45, key: '#fff3df', keyI: 2.2, fill: '#e3ecff', fillI: 0.4, rimI: 0.6, bounceI: 0.9, shadow: 0.24 },
  dark: { exposure: 0.95, env: 0.45, sky: '#b9c8ef', ground: '#1b1f1b', hemi: 0.3, key: '#dfe7ff', keyI: 1.8, fill: '#8fa6e6', fillI: 0.35, rimI: 0.8, bounceI: 0.6, shadow: 0.42 },
}

/* ---------- Hoạ tiết mặt trước ---------- */

/*
  Mặt tấm ép (bên trong thành khung, 1712 × 1124 mm), vẽ theo mm rồi phóng theo độ phân giải. 120 nửa cell 78 × 170 mm:
  6 hàng, 2 nửa tấm × 10 cột, khe 2,5 mm, khe giữa hai nửa 14 mm. Cột nửa cell đi theo cặp, góc vát ở hai góc ngoài của
  mỗi cặp như cell đơn tinh thể. 9 thanh dẫn chạy dọc mỗi hàng; dải nối ở hai đầu.
*/
function cellTexture(pxPerMm: number, maxAnisotropy: number) {
  const W = (PANEL.w - 2 * PANEL.wall) * 1000
  const H = (PANEL.h - 2 * PANEL.wall) * 1000
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * pxPerMm)
  canvas.height = Math.round(H * pxPerMm)
  const ctx = canvas.getContext('2d')!
  ctx.scale(pxPerMm, pxPerMm)
  ctx.fillStyle = '#e3e6ea'
  ctx.fillRect(0, 0, W, H)

  const cw = 78
  const ch = 170
  const gap = 2.5
  const mid = 14
  const cols = 10
  const rows = 6
  const halfW = cols * cw + (cols - 1) * gap
  const totalW = 2 * halfW + mid
  const totalH = rows * ch + (rows - 1) * gap
  const x0 = (W - totalW) / 2
  const y0 = (H - totalH) / 2
  const cut = 9

  // Biến thiên độ sáng nhẹ giữa các cell, cố định (không ngẫu nhiên mỗi lần vẽ).
  const shade = (i: number) => 0.94 + 0.06 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) / 2

  for (let side = 0; side < 2; side++) {
    const sx = x0 + side * (halfW + mid)
    for (let r = 0; r < rows; r++) {
      const y = y0 + r * (ch + gap)
      for (let c = 0; c < cols; c++) {
        const x = sx + c * (cw + gap)
        const left = c % 2 === 0
        const k = shade(side * 97 + r * 13 + c)
        const g = ctx.createLinearGradient(x, y, x + cw, y + ch)
        g.addColorStop(0, `rgb(${Math.round(14 * k)}, ${Math.round(27 * k)}, ${Math.round(64 * k)})`)
        g.addColorStop(1, `rgb(${Math.round(5 * k)}, ${Math.round(11 * k)}, ${Math.round(30 * k)})`)
        ctx.fillStyle = g
        ctx.beginPath()
        if (left) {
          ctx.moveTo(x + cut, y)
          ctx.lineTo(x + cw, y)
          ctx.lineTo(x + cw, y + ch)
          ctx.lineTo(x + cut, y + ch)
          ctx.lineTo(x, y + ch - cut)
          ctx.lineTo(x, y + cut)
        } else {
          ctx.moveTo(x, y)
          ctx.lineTo(x + cw - cut, y)
          ctx.lineTo(x + cw, y + cut)
          ctx.lineTo(x + cw, y + ch - cut)
          ctx.lineTo(x + cw - cut, y + ch)
          ctx.lineTo(x, y + ch)
        }
        ctx.closePath()
        ctx.fill()
      }
      // 9 thanh dẫn chạy suốt hàng của nửa tấm.
      ctx.fillStyle = 'rgba(176, 188, 206, 0.5)'
      for (let b = 0; b < 9; b++) {
        ctx.fillRect(sx, y + (ch * (b + 0.5)) / 9 - 0.45, halfW, 0.9)
      }
    }
    // Dải nối các hàng ở mép ngoài của nửa tấm.
    ctx.fillStyle = 'rgba(196, 202, 210, 0.95)'
    const ex = side === 0 ? x0 - 9 : x0 + totalW + 3
    ctx.fillRect(ex, y0, 6, totalH)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  return texture
}

/* Nhãn trơn ở mặt sau: chỉ là mảng chữ xám, không ghi thông số (không có nguồn số liệu thật). */
function labelTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f7f7f5'
  ctx.fillRect(0, 0, 256, 128)
  ctx.fillStyle = '#9aa0a8'
  ctx.fillRect(16, 16, 120, 12)
  for (let i = 0; i < 5; i++) ctx.fillRect(16, 42 + i * 14, 150 + ((i * 37) % 60), 5)
  ctx.fillRect(190, 40, 50, 50)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/* ---------- Tấm pin ---------- */

/* Một cạnh khung: thành ngoài + gờ trước + gờ sau, dọc theo trục X của nhóm (cạnh dọc được quay 90°). */
function FrameSide({ length, offset, rotateZ, material }: { length: number; offset: number; rotateZ: number; material: THREE.Material }) {
  const { wall, depth, lip, lipT, flange, flangeT } = PANEL
  return (
    <group rotation-z={rotateZ}>
      <mesh material={material} position={[0, offset - wall / 2, (lipT + BACK_Z) / 2]} castShadow receiveShadow>
        <boxGeometry args={[length, wall, depth]} />
      </mesh>
      <mesh material={material} position={[0, offset - lip / 2, lipT / 2]} castShadow>
        <boxGeometry args={[length, lip, lipT]} />
      </mesh>
      <mesh material={material} position={[0, offset - flange / 2, BACK_Z + flangeT / 2]} castShadow>
        <boxGeometry args={[length, flange, flangeT]} />
      </mesh>
    </group>
  )
}

function Cable({ from, to, bend }: { from: THREE.Vector3; to: THREE.Vector3; bend: THREE.Vector3 }) {
  const { tube, connector } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([from, from.clone().lerp(to, 0.5).add(bend), to])
    const end = curve.getPointAt(1)
    const dir = curve.getTangentAt(1)
    return {
      tube: new THREE.TubeGeometry(curve, 32, 0.0035, 8, false),
      connector: {
        position: end.clone().add(dir.clone().multiplyScalar(0.026)),
        quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir),
      },
    }
  }, [from, to, bend])
  useEffect(() => () => tube.dispose(), [tube])
  return (
    <>
      <mesh geometry={tube} castShadow>
        <meshStandardMaterial color={COLORS.cable} roughness={0.55} />
      </mesh>
      <mesh position={connector.position} quaternion={connector.quaternion} castShadow>
        <cylinderGeometry args={[0.0078, 0.0078, 0.052, 16]} />
        <meshStandardMaterial color={COLORS.plastic} roughness={0.45} />
      </mesh>
    </>
  )
}

function SolarPanel({ lite }: { lite: boolean }) {
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const cells = useMemo(() => cellTexture(lite ? 0.6 : 1.2, maxAnisotropy), [lite, maxAnisotropy])
  const label = useMemo(() => labelTexture(), [])
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: COLORS.frame, metalness: 0.9, roughness: 0.34 }), [])
  const jbox = useMemo(() => new RoundedBoxGeometry(0.1, 0.075, 0.018, 2, 0.005), [])
  useEffect(() => () => cells.dispose(), [cells])
  useEffect(
    () => () => {
      label.dispose()
      frame.dispose()
      jbox.dispose()
    },
    [label, frame, jbox],
  )
  // Thứ tự mặt của BoxGeometry: +x, -x, +y, -y, +z (mặt kính), -z (tấm nền sau).
  const laminate = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: COLORS.laminateEdge, roughness: 0.5 })
    const glass = new THREE.MeshPhysicalMaterial({ map: cells, roughness: 0.6, metalness: 0, clearcoat: 0.85, clearcoatRoughness: 0.12 })
    const back = new THREE.MeshStandardMaterial({ color: COLORS.backsheet, roughness: 0.88 })
    return [edge, edge, edge, edge, glass, back]
  }, [cells])
  useEffect(() => () => new Set(laminate).forEach((m) => m.dispose()), [laminate])

  const innerW = PANEL.w - 2 * PANEL.wall
  const innerH = PANEL.h - 2 * PANEL.wall
  const backFace = -PANEL.laminate
  const boxZ = backFace - 0.009
  const cables = useMemo(
    () => [
      { from: new THREE.Vector3(0.05, 0.32, boxZ), to: new THREE.Vector3(0.38, 0.27, backFace - 0.012), bend: new THREE.Vector3(0.02, 0.03, -0.01) },
      { from: new THREE.Vector3(-0.05, -0.32, boxZ), to: new THREE.Vector3(-0.38, -0.27, backFace - 0.012), bend: new THREE.Vector3(-0.02, -0.03, -0.01) },
    ],
    [backFace, boxZ],
  )

  return (
    <group position-z={PIVOT_Z}>
      <mesh material={laminate} position-z={-PANEL.laminate / 2} castShadow receiveShadow>
        <boxGeometry args={[innerW, innerH, PANEL.laminate]} />
      </mesh>
      <FrameSide length={PANEL.w} offset={PANEL.h / 2} rotateZ={0} material={frame} />
      <FrameSide length={PANEL.w} offset={PANEL.h / 2} rotateZ={Math.PI} material={frame} />
      <FrameSide length={innerH} offset={PANEL.w / 2} rotateZ={Math.PI / 2} material={frame} />
      <FrameSide length={innerH} offset={PANEL.w / 2} rotateZ={-Math.PI / 2} material={frame} />
      {[0.32, 0, -0.32].map((y) => (
        <mesh key={y} geometry={jbox} position={[0, y, boxZ]} castShadow>
          <meshStandardMaterial color={COLORS.plastic} roughness={0.55} />
        </mesh>
      ))}
      {cables.map((c, i) => (
        <Cable key={i} {...c} />
      ))}
      <mesh position={[0.5, -0.24, backFace - 0.0006]} rotation-y={Math.PI}>
        <planeGeometry args={[0.24, 0.12]} />
        <meshStandardMaterial map={label} roughness={0.7} />
      </mesh>
    </group>
  )
}

/* ---------- Ánh sáng, môi trường, bóng ---------- */

/*
  Phòng chụp dựng trong code cho phản chiếu của kính và nhôm: vòm chuyển sắc (trên sáng, dưới tối) + một hộp đèn mềm lớn
  phía trên trước mặt và một hộp nhỏ bên trái, nên mặt kính có một vệt sáng rộng, mềm như ảnh chụp sản phẩm (môi trường
  phòng dựng sẵn của three.js có đèn trần nhỏ, gắt, phản chiếu thành một mảng trắng làm cell bạc màu).
*/
function studioScene() {
  const scene = new THREE.Scene()
  const dome = new THREE.SphereGeometry(10, 32, 16)
  const position = dome.getAttribute('position')
  const colors: number[] = []
  const top = new THREE.Color('#8f969f')
  const bottom = new THREE.Color('#3a3e44')
  const c = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    c.copy(bottom).lerp(top, THREE.MathUtils.smoothstep(position.getY(i) / 10, -0.6, 0.7))
    colors.push(c.r, c.g, c.b)
  }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  scene.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })))
  const softbox = (w: number, h: number, power: number, pos: [number, number, number]) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(power, power, power), side: THREE.DoubleSide }))
    mesh.position.set(...pos)
    mesh.lookAt(0, 0, 0)
    scene.add(mesh)
  }
  softbox(7, 3.5, 2.2, [0.5, 6, 4])
  softbox(2.5, 4, 1.2, [-7, 2, 1])
  return scene
}

/* Độ mạnh của môi trường và độ phơi sáng đổi theo giao diện. Renderer và scene là đối tượng three.js nên chỉnh trực tiếp (qua get()). */
function Studio({ environment, exposure }: { environment: number; exposure: number }) {
  const get = useThree((s) => s.get)
  useEffect(() => {
    const { gl, scene, invalidate } = get()
    const pmrem = new THREE.PMREMGenerator(gl)
    const studio = studioScene()
    const env = pmrem.fromScene(studio, 0.04).texture
    scene.environment = env
    studio.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        o.material.dispose()
      }
    })
    pmrem.dispose()
    invalidate()
    return () => {
      scene.environment = null
      env.dispose()
    }
  }, [get])
  useEffect(() => {
    const { gl, scene, invalidate } = get()
    scene.environmentIntensity = environment
    gl.toneMappingExposure = exposure
    invalidate()
  }, [get, environment, exposure])
  return null
}

function Lights({ look, lite }: { look: (typeof LOOK)[ResolvedTheme]; lite: boolean }) {
  // Bóng mềm (VSM): bản đồ nhỏ + làm mờ rộng cho viền loang như bóng dưới hộp đèn; điện thoại dùng bản đồ nhỏ hơn.
  const mapSize = lite ? 256 : 512
  return (
    <>
      <hemisphereLight args={[look.sky, look.ground, look.hemi]} />
      <directionalLight
        position={[0.6, 5, 1]}
        color={look.key}
        intensity={look.keyI}
        castShadow
        shadow-mapSize={[mapSize, mapSize]}
        shadow-radius={lite ? 6 : 10}
        shadow-blurSamples={lite ? 12 : 20}
        shadow-bias={-0.0005}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
        shadow-camera-near={1}
        shadow-camera-far={9}
      />
      <directionalLight position={[-2.6, 1.2, 1.6]} color={look.fill} intensity={look.fillI} />
      {/* Đèn viền phía sau: khi quay ra mặt sau vẫn thấy rõ tấm nền, hộp đấu dây và gờ khung. */}
      <directionalLight position={[0.4, 1.8, -3]} intensity={look.rimI} />
      {/* Ánh hắt từ sàn phía trước: tấm ngả ra sau nên khi quay mặt sau về phía người xem, mặt đó chúi xuống, đèn trên không tới. */}
      <directionalLight position={[0, -1.5, 3]} intensity={look.bounceI} />
    </>
  )
}

/*
  Bóng trên mặt đất trong suốt (chỉ thấy phần bóng, nền là nền của section), mờ dần theo khoảng cách tới tâm nên không bao
  giờ có mép bóng bị khung cắt ngang. Chèn vào shader của ShadowMaterial (r186): toạ độ trên mặt phẳng → hệ số mờ.
*/
function fadeShadowEdges(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vGround;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = position.xy;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vGround;')
    .replace('opacity * ( 1.0 - getShadowMask() )', 'opacity * ( 1.0 - getShadowMask() ) * ( 1.0 - smoothstep( 0.5, 1.55, length( vGround ) ) )')
}

/* ---------- Xoay ---------- */

type Motion = { yaw: number; pitch: number; vYaw: number; vPitch: number; dragging: boolean }

const clampPitch = (p: number) => Math.min(PITCH_LIMIT[1], Math.max(PITCH_LIMIT[0], p))

/* Áp góc xoay vào hai nhóm: ngoài nghiêng quanh trục ngang của màn hình, trong quay quanh trục đứng (như bàn xoay). */
function Turntable({ motion, children }: { motion: RefObject<Motion>; children: ReactNode }) {
  const pitchRef = useRef<THREE.Group>(null)
  const yawRef = useRef<THREE.Group>(null)
  useFrame(() => {
    if (pitchRef.current) pitchRef.current.rotation.x = motion.current.pitch
    if (yawRef.current) yawRef.current.rotation.y = motion.current.yaw
  })
  return (
    <group ref={pitchRef}>
      <group ref={yawRef}>
        <group rotation-x={BASE_TILT}>{children}</group>
      </group>
    </group>
  )
}

/* ---------- Cảnh ---------- */

export type SolarPanelSceneProps = {
  label: string
  describedBy: string
  /** Điện thoại / cảm ứng: độ phân giải, bóng và hoạ tiết thấp hơn. */
  lite: boolean
  /** Giảm chuyển động: không quán tính sau khi thả. */
  reducedMotion: boolean
  /** Gọi sau khung hình đầu tiên, để thay ảnh tĩnh bằng canvas. */
  onReady: () => void
}

export default function SolarPanelScene({ label, describedBy, lite, reducedMotion, onReady }: SolarPanelSceneProps) {
  const theme = useResolvedTheme()
  const look = LOOK[theme]
  const motion = useRef<Motion>({ ...START, vYaw: 0, vPitch: 0, dragging: false })
  const root = useRef<RootState | null>(null)
  const last = useRef<{ x: number; y: number; t: number } | null>(null)
  const coasting = useRef(0)

  const rotateBy = (dYaw: number, dPitch: number) => {
    const m = motion.current
    m.yaw += dYaw
    m.pitch = clampPitch(m.pitch + dPitch)
    root.current?.invalidate()
  }

  /* Quán tính ngắn sau khi thả tay (tắt khi giảm chuyển động): tốc độ giảm dần theo thời gian thật, dừng hẳn dưới 1 giây. */
  const stopCoasting = () => {
    cancelAnimationFrame(coasting.current)
    coasting.current = 0
  }
  const coast = () => {
    stopCoasting()
    let prev = performance.now()
    const step = (now: number) => {
      const m = motion.current
      const frames = Math.min(4, (now - prev) / 16)
      prev = now
      if (m.dragging || (Math.abs(m.vYaw) < 1e-4 && Math.abs(m.vPitch) < 1e-4)) {
        coasting.current = 0
        return
      }
      rotateBy(m.vYaw * frames, m.vPitch * frames)
      const decay = Math.exp(-0.12 * frames)
      m.vYaw *= decay
      m.vPitch *= decay
      coasting.current = requestAnimationFrame(step)
    }
    coasting.current = requestAnimationFrame(step)
  }
  useEffect(() => () => cancelAnimationFrame(coasting.current), [])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    stopCoasting()
    motion.current.dragging = true
    motion.current.vYaw = motion.current.vPitch = 0
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
    // Chuột kéo ra ngoài khung vẫn xoay; cảm ứng đã tự giữ con trỏ.
    if (e.pointerType === 'mouse') e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.style.cursor = 'grabbing'
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const prev = last.current
    if (!motion.current.dragging || !prev) return
    const { width, height } = e.currentTarget.getBoundingClientRect()
    // Kéo hết bề ngang khung ≈ gần một vòng; kéo hết bề cao ≈ nửa khoảng nghiêng cho phép.
    const dYaw = ((e.clientX - prev.x) / width) * Math.PI * 1.8
    const dPitch = ((e.clientY - prev.y) / height) * Math.PI * 0.45
    rotateBy(dYaw, dPitch)
    const dt = Math.max(1, e.timeStamp - prev.t)
    // Vận tốc theo khung hình 16 ms, làm mượt để thả tay không giật.
    motion.current.vYaw = motion.current.vYaw * 0.5 + ((dYaw * 16) / dt) * 0.5
    motion.current.vPitch = motion.current.vPitch * 0.5 + ((dPitch * 16) / dt) * 0.5
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
  }
  const endDrag = (e: PointerEvent<HTMLDivElement>, keepVelocity: boolean) => {
    if (!motion.current.dragging) return
    motion.current.dragging = false
    // Dừng tay một lúc rồi mới thả thì không trôi tiếp.
    if (reducedMotion || !keepVelocity || !last.current || e.timeStamp - last.current.t > 80) motion.current.vYaw = motion.current.vPitch = 0
    else coast()
    last.current = null
    e.currentTarget.style.cursor = 'grab'
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.5 : 0.15
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step / 2], ArrowDown: [0, step / 2] }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    stopCoasting()
    motion.current.vYaw = motion.current.vPitch = 0
    rotateBy(...move)
  }

  return (
    <Canvas
      frameloop="demand"
      dpr={lite ? [1, 1.5] : [1, 2]}
      shadows="variance"
      camera={{ fov: 30, position: [0, 0.55, 3.3], near: 0.1, far: 20 }}
      gl={{ antialias: true, alpha: true, powerPreference: lite ? 'low-power' : 'default' }}
      onCreated={(state) => {
        root.current = state
        state.camera.lookAt(0, -0.2, 0)
        // Khung hình đầu đã vẽ trong lần render sau onCreated; đợi một nhịp rồi mới báo sẵn sàng.
        requestAnimationFrame(() => requestAnimationFrame(onReady))
      }}
      role="img"
      aria-label={label}
      aria-describedby={describedBy}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e, true)}
      onPointerCancel={(e) => endDrag(e, false)}
      onLostPointerCapture={(e) => endDrag(e, true)}
      onKeyDown={onKeyDown}
      // pan-y: vuốt dọc vẫn cuộn trang, vuốt ngang mới xoay tấm pin.
      style={{ touchAction: 'pan-y', cursor: 'grab' }}
    >
      <Studio environment={look.env} exposure={look.exposure} />
      <Lights look={look} lite={lite} />
      <Turntable motion={motion}>
        <SolarPanel lite={lite} />
      </Turntable>
      <mesh rotation-x={-Math.PI / 2} position-y={GROUND_Y} receiveShadow>
        <planeGeometry args={[3.4, 3.4]} />
        <shadowMaterial transparent opacity={look.shadow} onBeforeCompile={fadeShadowEdges} />
      </mesh>
    </Canvas>
  )
}
