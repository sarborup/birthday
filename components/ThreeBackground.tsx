'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth
    const h = mount.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000)
    camera.position.z = 80

    // Particle field
    const geo = new THREE.BufferGeometry()
    const count = 1200
    const pos = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200
      pos[i * 3 + 1] = (Math.random() - 0.5) * 200
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100
      const g = 0.3 + Math.random() * 0.7
      colors[i * 3] = g * 0.4
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = g * 0.2
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.7 })
    const particles = new THREE.Points(geo, mat)
    scene.add(particles)

    // Floating cubes (nodes)
    const cubes: THREE.Mesh[] = []
    const cubeMat = new THREE.MeshBasicMaterial({ color: 0x1a3a10, wireframe: true, transparent: true, opacity: 0.4 })
    for (let i = 0; i < 12; i++) {
      const s = 2 + Math.random() * 4
      const cube = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), cubeMat.clone())
      cube.position.set((Math.random() - 0.5) * 160, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 60)
      cube.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
      scene.add(cube)
      cubes.push(cube)
    }

    // Grid lines
    const gridMat = new THREE.LineBasicMaterial({ color: 0x1a3a10, transparent: true, opacity: 0.15 })
    for (let i = -10; i <= 10; i++) {
      const hGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-100, i * 10, -20), new THREE.Vector3(100, i * 10, -20)])
      scene.add(new THREE.Line(hGeo, gridMat))
      const vGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i * 10, -100, -20), new THREE.Vector3(i * 10, 100, -20)])
      scene.add(new THREE.Line(vGeo, gridMat))
    }

    let frame = 0
    const animate = () => {
      frame++
      const id = requestAnimationFrame(animate)
      particles.rotation.y = frame * 0.0003
      particles.rotation.x = frame * 0.0001
      cubes.forEach((c, i) => {
        c.rotation.x += 0.003 + i * 0.0002
        c.rotation.y += 0.004 + i * 0.0001
        c.position.y += Math.sin(frame * 0.01 + i) * 0.02
      })
      renderer.render(scene, camera)
      return id
    }
    const id = animate()

    const onResize = () => {
      const w2 = mount.clientWidth, h2 = mount.clientHeight
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
      renderer.setSize(w2, h2)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="absolute inset-0 pointer-events-none" />
}
