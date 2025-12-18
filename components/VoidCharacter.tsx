import React, { useRef, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

// State Enum - Controls the character's behavior
export enum VoidState {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  TALKING = 'TALKING',
  SURPRISED = 'SURPRISED'
}

// Shader Math - Creates the liquid metal / ferromagnetic look
const noiseGLSL = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod289(i);
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0; 
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ ); 
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }
`;

// Simple Stars Component (replacing @react-three/drei Stars)
const SimpleStars = ({ count = 500 }: { count?: number }) => {
  const starsRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  }, [count]);

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0002;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.5} color="#ffffff" sizeAttenuation transparent opacity={0.8} />
    </points>
  );
};

// Floating wrapper component (replacing @react-three/drei Float)
const FloatingWrapper = ({ children, speed = 2, floatIntensity = 0.5 }: { 
  children: React.ReactNode; 
  speed?: number; 
  floatIntensity?: number;
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = Math.sin(t * speed) * floatIntensity * 0.1;
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.05;
    }
  });

  return <group ref={groupRef}>{children}</group>;
};

// The 3D Character Component (internal)
const VoidCharacterMesh = ({ voidState }: { voidState: VoidState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  
  const [blinking, setBlinking] = useState(false);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uColor: { value: new THREE.Color("#000000") }
  }), []);

  const onBeforeCompile = useMemo(() => (shader: THREE.Shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uIntensity = uniforms.uIntensity;

    shader.vertexShader = `
      uniform float uTime;
      uniform float uIntensity;
      ${noiseGLSL}
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
        #include <begin_vertex>
        // Ferro-magnetic Spike Logic
        float n1 = snoise(position * 1.5 + uTime * 0.5);
        float n2 = snoise(position * 4.0 - uTime * 0.8);
        float n3 = snoise(position * 8.0 + uTime * 1.2);
        float spikeMap = pow(abs(n1), 2.0) * 0.5 + pow(max(0.0, n2), 3.0) * 0.5 + n3 * 0.05;
        float activeIntensity = 0.5 + (uIntensity * 1.0);
        vec3 displaced = position + normal * spikeMap * activeIntensity * 0.4;
        transformed = displaced;
      `
    );
  }, [uniforms]);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.8 || voidState === VoidState.SURPRISED) {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 200);
      }
    }, 2000);
    return () => clearInterval(blinkInterval);
  }, [voidState]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    
    let baseIntensity = 0.0;
    if (voidState === VoidState.TALKING) baseIntensity = 0.8;
    if (voidState === VoidState.THINKING) baseIntensity = 0.3;
    if (voidState === VoidState.SURPRISED) baseIntensity = 1.0;
    
    uniforms.uIntensity.value = THREE.MathUtils.lerp(uniforms.uIntensity.value, baseIntensity, 0.1);

    if (voidState === VoidState.THINKING) {
       groupRef.current.rotation.z -= 0.01;
    } else {
       groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.1);
    }

    const eyeZ = 1.6 + (uniforms.uIntensity.value * 0.2);
    if (leftEyeRef.current) leftEyeRef.current.position.z = THREE.MathUtils.lerp(leftEyeRef.current.position.z, eyeZ, 0.1);
    if (rightEyeRef.current) rightEyeRef.current.position.z = THREE.MathUtils.lerp(rightEyeRef.current.position.z, eyeZ, 0.1);

    let eyeScaleY = blinking ? 0.05 : 1;
    let eyeScaleX = 1;

    if (voidState === VoidState.SURPRISED) {
        eyeScaleY = 1.5; eyeScaleX = 1.2;
    } else if (voidState === VoidState.TALKING) {
        eyeScaleY = 1 + Math.sin(t * 20) * 0.1;
        eyeScaleX = 1 + Math.cos(t * 20) * 0.1;
    } else if (voidState === VoidState.THINKING) {
        eyeScaleY = 0.8; 
    }
    
    if (leftEyeRef.current) {
        leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, eyeScaleY, 0.2);
        leftEyeRef.current.scale.x = THREE.MathUtils.lerp(leftEyeRef.current.scale.x, eyeScaleX, 0.2);
    }
    if (rightEyeRef.current) {
        rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, eyeScaleY, 0.2);
        rightEyeRef.current.scale.x = THREE.MathUtils.lerp(rightEyeRef.current.scale.x, eyeScaleX, 0.2);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        {/* Reduced detail (5) for mobile performance */}
        <icosahedronGeometry args={[1.4, 5]} /> 
        <meshStandardMaterial 
          color="#000000" 
          roughness={0.1} 
          metalness={1.0}
          onBeforeCompile={onBeforeCompile}
        />
      </mesh>
      <mesh ref={leftEyeRef} position={[-0.4, 0.2, 1.6]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.4, 0.2, 1.6]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
};

// Props for the exported component
interface VoidSceneProps {
  voidState?: VoidState;
  size?: number | string;
  showStars?: boolean;
  showShadow?: boolean;
}

// Main exported component
export default function VoidScene({ 
  voidState = VoidState.IDLE,
  size = 200,
  showStars = true,
}: VoidSceneProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#fff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#6366f1" />
        <spotLight position={[0, 5, -8]} intensity={3} angle={0.6} penumbra={0.5} color="#333333" />
        
        {showStars && <SimpleStars count={300} />}
        
        <FloatingWrapper speed={2} floatIntensity={0.5}>
          <VoidCharacterMesh voidState={voidState} />
        </FloatingWrapper>
      </Canvas>
    </View>
  );
}

// Also export a full-screen version
export function VoidSceneFullScreen({ voidState = VoidState.IDLE }: { voidState?: VoidState }) {
  return (
    <View style={styles.fullScreen}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#fff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#6366f1" />
        <spotLight position={[0, 5, -8]} intensity={3} angle={0.6} penumbra={0.5} color="#333333" />
        
        <SimpleStars count={500} />
        
        <FloatingWrapper speed={2} floatIntensity={0.5}>
          <VoidCharacterMesh voidState={voidState} />
        </FloatingWrapper>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#050505',
    borderRadius: 100,
    overflow: 'hidden',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#050505',
  },
});
