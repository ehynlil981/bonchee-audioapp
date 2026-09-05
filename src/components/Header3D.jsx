import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import * as THREE from 'three'

function LibraryLogo({ theme }) {
  const groupRef = useRef()
  const bookRef = useRef()
  const ringRef = useRef()

  const colors =
    theme === 'dark'
      ? {
          primary: '#a855f7',
          secondary: '#6366f1',
          glow: '#c084fc',
        }
      : theme === 'cream'
        ? {
            primary: '#d97706',
            secondary: '#f59e0b',
            glow: '#fbbf24',
          }
        : {
            primary: '#92400e',
            secondary: '#b45309',
            glow: '#d97706',
          }

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (groupRef.current) {
      groupRef.current.rotation.y =
        Math.sin(t * 0.75) * 0.16

      groupRef.current.rotation.x =
        Math.cos(t * 0.52) * 0.08
    }

    if (bookRef.current) {
      bookRef.current.position.y =
        Math.sin(t * 1.25) * 0.04

      bookRef.current.rotation.z =
        Math.sin(t * 0.7) * 0.025
    }

    if (ringRef.current) {
      ringRef.current.rotation.z =
        t * 0.22

      ringRef.current.rotation.x =
        Math.sin(t * 0.4) * 0.08
    }
  })

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.12}
      floatIntensity={0.2}
    >
      <group ref={groupRef}>
        {/* Halo */}
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.012, 8, 64]} />
          <meshStandardMaterial
            color={colors.glow}
            emissive={colors.glow}
            emissiveIntensity={1.2}
            transparent
            opacity={0.65}
          />
        </mesh>

        {/* Book */}
        <group ref={bookRef}>
          {/* Left cover */}
          <mesh position={[-0.38, 0, 0]}>
            <boxGeometry args={[0.7, 0.88, 0.08]} />
            <meshStandardMaterial
              color={colors.primary}
              metalness={0.4}
              roughness={0.24}
            />
          </mesh>

          {/* Right cover */}
          <mesh position={[0.38, 0, 0]}>
            <boxGeometry args={[0.7, 0.88, 0.08]} />
            <meshStandardMaterial
              color={colors.secondary}
              metalness={0.4}
              roughness={0.24}
            />
          </mesh>

          {/* Pages */}
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[0.72, 0.84, 0.035]} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.72}
            />
          </mesh>

          {/* Spine */}
          <mesh position={[0, 0, 0.08]}>
            <boxGeometry args={[0.07, 0.9, 0.1]} />
            <meshStandardMaterial
              color={colors.glow}
              emissive={colors.glow}
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      </group>
    </Float>
  )
}

export default function Header3D({ theme }) {
  return (
    <div className="header-3d-logo">
      <Canvas
        dpr={[1, 1.5]}
        camera={{
          position: [0, 0, 3.1],
          fov: 40,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
      >
        <ambientLight intensity={1.5} />

        <directionalLight
          position={[3, 4, 4]}
          intensity={2.2}
          color="#ffffff"
        />

        <pointLight
          position={[-2, -1, 2]}
          intensity={1.5}
          color="#a855f7"
        />

        <LibraryLogo theme={theme} />
      </Canvas>
    </div>
  )
}
