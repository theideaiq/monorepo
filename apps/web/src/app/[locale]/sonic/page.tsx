'use client';

import {
  Environment,
  Float,
  Grid,
  OrbitControls,
  PerspectiveCamera,
} from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { createClient } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as Tone from 'tone';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/Button';

// --- Configuration ---
const supabase = createClient(
  // biome-ignore lint/style/noNonNullAssertion: migration
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // biome-ignore lint/style/noNonNullAssertion: migration
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const SCALE = [
  'C3',
  'D3',
  'Eb3',
  'F3',
  'G3',
  'Ab3',
  'B3',
  'C4',
  'D4',
  'Eb4',
  'F4',
  'G4',
];
const BRAND_COLORS = ['#E91E63', '#FFD600', '#FFD600', '#E91E63'];

interface SonicNode {
  id: string;
  position: [number, number, number];
  color: string;
  note: string;
  timestamp: number;
}

// --- 3D Components ---

function Node({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.scale.setScalar(1 + Math.sin(t * 2 + position[0]) * 0.05);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh
        ref={ref}
        position={position}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 4 : 2}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={position}
        intensity={0.5}
        distance={3}
        color={color}
      />
    </Float>
  );
}

function Connections({ nodes }: { nodes: SonicNode[] }) {
  // OPTIMIZATION: Match connection limit to fetch limit
  if (nodes.length > 50 || nodes.length < 2) return null;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    points.push(new THREE.Vector3(...nodes[i].position));
    points.push(new THREE.Vector3(...nodes[i + 1].position));
  }
  if (points.length === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry onUpdate={(self) => self.setFromPoints(points)} />
      <lineBasicMaterial color="#ffffff" opacity={0.15} transparent />
    </lineSegments>
  );
}

function ClickPlane({
  onPlaceNode,
}: {
  onPlaceNode: (pos: THREE.Vector3) => void;
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPlaceNode(e.point);
      }}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial color="black" transparent opacity={0} />
    </mesh>
  );
}

// --- Main Page Component ---

export default function SonicEcosystemPage() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [nodes, setNodes] = useState<SonicNode[]>([]);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);

  useEffect(() => {
    async function init() {
      reverbRef.current = new Tone.Reverb({
        decay: 5,
        wet: 0.3,
      }).toDestination();
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 2 },
      }).connect(reverbRef.current);
      synthRef.current.volume.value = -6;

      const { data } = await supabase
        .from('sonic_nodes')
        .select('*')
        .order('created_at', { ascending: false })
        // OPTIMIZATION: Lowered limit to reduce initial load
        .limit(50);

      if (data) {
        // biome-ignore lint/suspicious/noExplicitAny: migration
        const formattedNodes = data.map((dbNode: any) => ({
          id: dbNode.id,
          position: [
            dbNode.position.x,
            dbNode.position.y,
            dbNode.position.z,
          ] as [number, number, number],
          color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)],
          note: dbNode.note,
          timestamp: Date.parse(dbNode.created_at),
        }));
        setNodes(formattedNodes.reverse());
      }
      setLoading(false);
    }
    init();

    return () => {
      synthRef.current?.dispose();
      reverbRef.current?.dispose();
    };
  }, []);

  const handleStart = async () => {
    try {
      await Tone.start();
      Tone.Transport.start();
    } catch (e) {
      console.warn(e);
    }

    setStarted(true);
    synthRef.current?.triggerAttackRelease(['C3', 'G3', 'C4'], '2n');
  };

  const handlePlaceNode = async (point: THREE.Vector3) => {
    if (muted) return;

    const noteIndex = Math.floor(((point.x + 10) / 20) * SCALE.length);
    const clampedIndex = Math.max(0, Math.min(SCALE.length - 1, noteIndex));
    const note = SCALE[clampedIndex];
    const color = BRAND_COLORS[clampedIndex % BRAND_COLORS.length];

    synthRef.current?.triggerAttackRelease(note, '8n');

    const newNode: SonicNode = {
      id: uuidv4(),
      position: [point.x, point.y + Math.random() * 2, point.z],
      color: color,
      note: note,
      timestamp: Date.now(),
    };

    setNodes((prev) => [...prev, newNode]);

    await supabase.from('sonic_nodes').insert({
      id: newNode.id,
      position: {
        x: newNode.position[0],
        y: newNode.position[1],
        z: newNode.position[2],
      },
      note: newNode.note,
    });
  };

  return (
    <div className="h-screen w-full bg-[#05070a] overflow-hidden relative cursor-crosshair">
      {/* OPTIMIZATION: Lowered max dpr from 2 to 1.5 for mobile performance */}
      <Canvas shadows gl={{ antialias: false }} dpr={[1, 1.5]}>
        <color attach="background" args={['#05070a']} />
        <fog attach="fog" args={['#05070a', 10, 50]} />
        <PerspectiveCamera makeDefault position={[0, 5, 15]} fov={50} />

        <Suspense fallback={null}>
          <Environment preset="night" />
          <ambientLight intensity={0.2} />

          <group>
            {nodes.map((node) => (
              <Node key={node.id} position={node.position} color={node.color} />
            ))}
            <Connections nodes={nodes} />
            {started && <ClickPlane onPlaceNode={handlePlaceNode} />}
            <Grid
              infiniteGrid
              fadeDistance={30}
              sectionColor="#333"
              cellColor="#111"
              position={[0, -0.01, 0]}
            />
          </group>

          {/* REMOVED: The 3D Text "THE IDEA ECOSYSTEM" is gone */}

          <EffectComposer>
            <Bloom
              luminanceThreshold={1}
              intensity={1.5}
              levels={9}
              mipmapBlur
            />
            {/* OPTIMIZATION: Removed Noise effect. It's very heavy on mobile GPUs. */}
            {/* <Noise opacity={0.05} /> */}
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>

          <OrbitControls
            enabled={started}
            enableZoom={true}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 4}
          />
        </Suspense>
      </Canvas>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#05070a] flex items-center justify-center pointer-events-none"
          >
            <Loader2 className="text-brand-pink animate-spin" size={40} />
          </motion.div>
        )}

        {!started && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white p-4 text-center pointer-events-auto"
          >
            {/* UPDATED Title */}
            <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink to-brand-yellow">
                SONIC EXPERIENCE
              </span>
            </h1>
            {/* ADDED Description */}
            <p className="text-slate-300 max-w-md text-base md:text-lg mb-8 leading-relaxed font-light">
              Every interaction creates a unique frequency. Together, we compose
              the collective digital soundscape of Iraq. Tap to add your voice
              to the eternal harmony.
            </p>
            <Button
              onClick={handleStart}
              className="h-14 px-10 text-lg rounded-full bg-white text-black hover:bg-brand-yellow transition-transform hover:scale-105"
            >
              Enter the Void <Volume2 className="ml-3 w-5 h-5" />
            </Button>
            <p className="text-slate-500 text-xs mt-6 uppercase tracking-widest">
              Audio Required • Headphones Recommended
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {started && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4 pointer-events-none"
        >
          <p className="text-slate-400 text-sm uppercase tracking-widest">
            Tap floor to create sound
          </p>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="text-slate-400 hover:text-white transition pointer-events-auto bg-white/10 p-3 rounded-full backdrop-blur-md"
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </motion.div>
      )}

      <div className="absolute top-8 left-8 z-30 pointer-events-none mix-blend-difference">
        <span className="text-xl md:text-2xl font-black tracking-tighter text-white">
          IDEA<span className="text-brand-yellow">.</span>
        </span>
      </div>
    </div>
  );
}
