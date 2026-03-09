import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function FloatingParticle({ ...props }) {
    const mesh = useRef();
    const [speed] = React.useState(() => Math.random() * 0.005 + 0.002);
    const [rotation] = React.useState(() => new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));

    useFrame((state) => {
        mesh.current.rotation.x += rotation.x * speed;
        mesh.current.rotation.y += rotation.y * speed;
        mesh.current.position.y += Math.sin(state.clock.elapsedTime * 0.5 + props.offset) * 0.003;
    });

    return (
        <mesh {...props} ref={mesh}>
            {props.geometry}
            <MeshDistortMaterial color="#d4820a" distort={0.2} speed={1.5} factor={0.5} transparent opacity={0.6} emissive="#7a4a06" emissiveIntensity={0.5} />
        </mesh>
    );
}

function StarBackground() {
    const ref = useRef();
    const sphere = useMemo(() => {
        const positions = new Float32Array(500 * 3);
        for (let i = 0; i < 500; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
        }
        return positions;
    }, []);

    useFrame((state, delta) => {
        ref.current.rotation.x -= delta / 10;
        ref.current.rotation.y -= delta / 15;
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
                <PointMaterial transparent color="#d4820a" size={0.05} sizeAttenuation={true} depthWrite={false} opacity={0.4} />
            </Points>
        </group>
    );
}

const Hero3D = () => {
    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#f0a832" />
                <pointLight position={[-10, -10, -10]} intensity={1.2} color="#d4820a" />

                <StarBackground />

                <Float speed={1.4} rotationIntensity={1} floatIntensity={1.5}>
                    <FloatingParticle
                        position={[7, 2, -4]}
                        offset={0}
                        geometry={<icosahedronGeometry args={[1.6, 1]} />}
                    />
                </Float>

                <Float speed={1.8} rotationIntensity={1.2} floatIntensity={2}>
                    <FloatingParticle
                        position={[-8, -1, -5]}
                        offset={1}
                        geometry={<octahedronGeometry args={[1.2, 0]} />}
                    />
                </Float>

                <Float speed={1.2} rotationIntensity={0.8} floatIntensity={1}>
                    <FloatingParticle
                        position={[4, -4.5, -3]}
                        offset={2}
                        geometry={<tetrahedronGeometry args={[1.1, 0]} />}
                    />
                </Float>
            </Canvas>
        </div>
    );
};

export default Hero3D;
