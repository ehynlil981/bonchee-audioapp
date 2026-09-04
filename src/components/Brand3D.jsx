import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useRef } from 'react'

function StoryCore() {
  const group = useRef()
  const ringA = useRef()
  const ringB = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (group.current) {
      group.current.rotation.y = t * 0.28
      group.current.rotation.z = Math.sin(t * 0.55) * 0.045
    }

    if (ringA.current) {
      ringA.current.rotation.z = t * 0.7
      ringA.current.rotation.x = Math.sin(t * 0.45) * 0.18
    }

    if (ringB.current) {
      ringB.current.rotation.z = -t * 0.48
      ringB.current.rotation.y = Math.cos(t * 0.4) * 0.2
    }
  })

  return (
    <Float speed={1.25} floatIntensity={0.16} rotationIntensity={0.05}>
      <group ref={group}>
        {/* The central "story core": an angular portal instead of a conventional book */}
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.29, 0]} />
          <meshStandardMaterial
            color="#b8f7ff"
            emissive="#22d3ee"
            emissiveIntensity={1.15}
            metalness={0.7}
            roughness={0.18}
          />
        </mesh>

        {/* Dark inner core creates the hollow/portal feeling */}
        <mesh scale={[0.48, 0.48, 0.48]}>
          <octahedronGeometry args={[0.29, 0]} />
          <meshStandardMaterial
            color="#0a0b13"
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>

        {/* Three "audio/story" fins */}
        {[-1, 0, 1].map((i) => (
          <mesh
            key={i}
            position={[i * 0.16, 0, 0]}
            rotation={[0, 0, i * 0.22]}
          >
            <boxGeometry args={[0.045, 0.42 - Math.abs(i) * 0.06, 0.055]} />
            <meshStandardMaterial
              color={i === 0 ? '#c084fc' : '#7dd3fc'}
              emissive={i === 0 ? '#a855f7' : '#22d3ee'}
              emissiveIntensity={1}
              metalness={0.45}
              roughness={0.22}
            />
          </mesh>
        ))}

        {/* Orbiting rings */}
        <mesh ref={ringA} rotation={[Math.PI / 2.6, 0.15, 0]}>
          <torusGeometry args={[0.54, 0.014, 10, 64]} />
          <meshStandardMaterial
            color="#c084fc"
            emissive="#a855f7"
            emissiveIntensity={1.5}
            transparent
            opacity={0.72}
          />
        </mesh>

        <mesh ref={ringB} rotation={[0.3, Math.PI / 2.8, 0]}>
          <torusGeometry args={[0.67, 0.008, 8, 64]} />
          <meshStandardMaterial
            color="#67e8f9"
            emissive="#22d3ee"
            emissiveIntensity={1.35}
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>
    </Float>
  )
}

export default function Brand3D() {
  return (
    <div className="brand-3d" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 2.7], fov: 40 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={1.15} />
        <directionalLight position={[3, 4, 4]} intensity={2.2} color="#f5f3ff" />
        <pointLight position={[-2, -1, 2]} intensity={2} color="#a855f7" />
        <pointLight position={[2, 1, 1]} intensity={1.5} color="#22d3ee" />
        <StoryCore />
      </Canvas>
    </div>
  )
}

