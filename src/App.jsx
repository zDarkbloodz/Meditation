import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './index.css';

function App() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    let mounted = true;

    // Initialize Three.js Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
    });
    
    // Enhanced renderer settings
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const objects = [];
    const objectCount = 10;
    
    // Create orbital paths with wider spread
    const orbits = [
      { radius: 15, speed: 0.0008, height: 4, pulseSpeed: 0.001 },
      { radius: 20, speed: -0.0012, height: -3, pulseSpeed: 0.0015 },
      { radius: 25, speed: 0.0015, height: 2, pulseSpeed: 0.002 },
      { radius: 30, speed: -0.001, height: -4, pulseSpeed: 0.0012 }

    ];
    
    // Create orbital paths with narrower spread
    const orbits2 = [
      { radius: 15, speed: 0.0008, height: 4, pulseSpeed: 0.001 },
      { radius: 20, speed: -0.0012, height: -3, pulseSpeed: 0.0015 },
      { radius: 25, speed: 0.0015, height: 2, pulseSpeed: 0.002 },
      { radius: 26, speed: -0.001, height: -4, pulseSpeed: 0.0012 }
    ];

    // Create environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture;

    // Create distorted sphere geometry
    const createVirusGeometry = (radius) => {
      const geometry = new THREE.IcosahedronGeometry(radius, 4);
      const positions = geometry.attributes.position;
      const vertices = positions.array;

      // Add random distortion to vertices
      for (let i = 0; i < vertices.length; i += 3) {
        const amp = 0.2;
        vertices[i] += (Math.random() - 0.5) * amp;
        vertices[i + 1] += (Math.random() - 0.5) * amp;
        vertices[i + 2] += (Math.random() - 0.5) * amp;
      }

      geometry.userData.originalPositions = [...vertices];
      return geometry;
    };

    const createVirusMaterial = () => {
      return new THREE.MeshPhysicalMaterial({
        transparent: true,
        transmission: 0.95,
        roughness: 0.2,
        metalness: 0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        ior: 1.5,
        thickness: 0.5,
        envMapIntensity: 1.5,
        attenuationColor: new THREE.Color(Math.random(), Math.random(), Math.random()),
        attenuationDistance: 0.5,
        opacity: 4.8,
        side: THREE.DoubleSide
      });
    };

    // Create spikes for virus
    const createSpikes = (parentObject, radius) => {
      const spikeCount = 20;
      const spikeGeometry = new THREE.ConeGeometry(radius * 0.1, radius * 0.3, 4);
      const spikeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        metalness: 0.2,
        roughness: 1.
      });

      for (let i = 0; i < spikeCount; i++) {
        const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
        const phi = Math.acos(-1 + (2 * i) / spikeCount);
        const theta = Math.sqrt(spikeCount * Math.PI) * phi;

        spike.position.setFromSpherical(new THREE.Spherical(radius, phi, theta));
        spike.lookAt(new THREE.Vector3(0, 0, 0));
        spike.userData.originalRotation = spike.rotation.clone();
        spike.userData.originalPosition = spike.position.clone();
        spike.userData.pulseSpeed = Math.random() * 0.5 + 0.5;
        parentObject.add(spike);
      }
    };

    // Add volumetric lighting effect
    const addVolumetricLight = (color, position) => {
      const geometry = new THREE.CylinderGeometry(0, 0, 0, 0);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      
      const light = new THREE.PointLight(color, 5, 20);
      light.position.copy(position);
      
      const beam = new THREE.Mesh(geometry, material);
      beam.position.copy(position);
      beam.lookAt(scene.position);
      
      scene.add(light);
      scene.add(beam);
      
      return { light, beam };
    };

    // Create objects
    for (let i = 0; i < objectCount; i++) {
      const orbitConfig = orbits[i % orbits.length];
      const radius = Math.random() * 0.5 + 0.5;
      
      const geometry = createVirusGeometry(radius);
      const material = createVirusMaterial();
      const object = new THREE.Group();
      const virusBody = new THREE.Mesh(geometry, material);
      
      object.add(virusBody);
      createSpikes(object, radius);
      
      const angle = (i / objectCount) * Math.PI * 2;
      object.position.x = Math.cos(angle) * orbitConfig.radius;
      object.position.z = Math.sin(angle) * orbitConfig.radius;
      object.position.y = orbitConfig.height;
      
      object.userData.orbit = {
        angle,
        ...orbitConfig,
        pulsePhase: Math.random() * Math.PI * 2,
        baseScale: radius
      };

      scene.add(object);
      objects.push(object);
    }

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const lightColors = [
      0xff1493, // Deep pink
      0x00ffff, // Cyan
      0x9400d3  // Purple
    ];

    const volumetricLights = lightColors.map((color, index) => {
      const angle = (index / lightColors.length) * Math.PI * 2;
      const radius = 20;
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        10
      );
      
      return addVolumetricLight(color, position);
    });

    // Add soft back light
    const backLight = new THREE.DirectionalLight(0x9370db, 2);
    backLight.position.set(0, 0, -20);
    scene.add(backLight);

    camera.position.z = 30;

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      if (!mounted) return;

      requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      objects.forEach((object) => {
        const orbit = object.userData.orbit;
        
        // Update orbital position
        orbit.angle += orbit.speed;
        object.position.x = Math.cos(orbit.angle) * orbit.radius;
        object.position.z = Math.sin(orbit.angle) * orbit.radius;
        
        // Organic rotation
        object.rotation.x += Math.sin(time * 0.5) * 0.01;
        object.rotation.y += Math.cos(time * 0.3) * 0.01;

        // Get the virus body
        const virusBody = object.children[0];
        const vertices = virusBody.geometry.attributes.position.array;
        const originalPositions = virusBody.geometry.userData.originalPositions;

        // Animate vertices for organic movement
        for (let i = 0; i < vertices.length; i += 3) {
          const offset = time + i;
          vertices[i] = originalPositions[i] + Math.sin(offset * 0.5) * 0.02;
          vertices[i + 1] = originalPositions[i + 1] + Math.cos(offset * 0.5) * 0.02;
          vertices[i + 2] = originalPositions[i + 2] + Math.sin(offset * 0.5) * 0.02;
        }
        virusBody.geometry.attributes.position.needsUpdate = true;

        // Animate spikes
        for (let i = 1; i < object.children.length; i++) {
          const spike = object.children[i];
          const offsetTime = time + i;
          
          spike.scale.y = 1 + Math.sin(offsetTime * spike.userData.pulseSpeed) * 0.2;
          spike.rotation.x = spike.userData.originalRotation.x + Math.sin(offsetTime) * 0.2;
          spike.rotation.z = spike.userData.originalRotation.z + Math.cos(offsetTime) * 0.2;
        }

        // Update colors
        const hue = (Math.sin(time * 0.1 + object.position.x * 0.1) + 1) * 0.5;
        virusBody.material.attenuationColor.setHSL(hue, 0.8, 0.5);
        virusBody.material.needsUpdate = true;
      });

      // Animate volumetric lights
      volumetricLights.forEach((vLight, index) => {
        const angle = time * 0.5 + (index * Math.PI * 2) / volumetricLights.length;
        const radius = 20;
        
        vLight.light.position.x = Math.cos(angle) * radius;
        vLight.light.position.y = Math.sin(angle) * radius;
        
        vLight.beam.position.copy(vLight.light.position);
        vLight.beam.lookAt(scene.position);
        
        vLight.light.intensity = 3 + Math.sin(time * 2) * 1;
        vLight.beam.material.opacity = 0.1 + Math.sin(time * 2) * 0.05;
      });

      // Camera movement
      camera.position.y = Math.sin(time * 0.5) * 2;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
      pmremGenerator.dispose();
    };
  }, []);

  const sections = [
    {
      title: 'Benefits',
      color: 'from-cyan-400/40 to-blue-500/40',
      items: [
        { title: 'Mental Clarity', description: 'Achieve mental clarity by practicing mindfulness.', icon: 'fas fa-brain text-cyan-300' },
        { title: 'Inner Peace', description: 'Gain peace through mindfulness and breathing.', icon: 'fas fa-dove text-blue-300' },
        { title: 'Better Health', description: 'Improve health through regular practice.', icon: 'fas fa-heart text-purple-300' },
      ],
    },
    {
      title: 'Practices',
      color: 'from-purple-400/40 to-pink-500/40',
      items: [
        { title: 'Breathing', description: 'Focus on your breath to reduce stress.', icon: 'fas fa-wind text-purple-300' },
        { title: 'Mindfulness', description: 'Bring attention to the present moment.', icon: 'fas fa-spa text-pink-300' },
        { title: 'Visualization', description: 'Imagine calming environments.', icon: 'fas fa-eye text-fuchsia-300' },
      ],
    },
    {
      title: 'Progress',
      color: 'from-amber-400/40 to-red-500/40',
      items: [
        { title: 'Daily Streak', description: 'Track your mindfulness streak.', icon: 'fas fa-calendar-check text-amber-300' },
        { title: 'Insights', description: 'Review insights from your practice.', icon: 'fas fa-lightbulb text-orange-300' },
        { title: 'Crown', description: 'Achieve mastery through consistency.', icon: 'fas fa-crown text-red-300' },
      ],
    },
  ];

  return (
    <>
      <div ref={mountRef} className="fixed inset-0 -z-10" />
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6">
        <h1 className="text-6xl font-meditation text-white mb-24 animate-float relative">
          Meditation
          
          {/* Connecting Lines */}
          <svg className="absolute top-full left-1/2 -translate-x-1/2 w-[800px] h-[100px] pointer-events-none">
            {sections.map((_, index) => {
              const angle = (index - 1) * 45;
              return (
                <line
                  key={index}
                  x1="50%"
                  y1="0"
                  x2={`${50 + angle}%`}
                  y2="100%"
                  className="connecting-line"
                  strokeDasharray="5,5"
                />
              );
            })}
          </svg>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 max-w-6xl relative">
          {sections.map((section, index) => (
            <div
              key={index}
              className={`glassmorphism p-6 rounded-xl shadow-lg text-center 
                         transform-gpu transition-all duration-300
                         hover:scale-105 hover:-translate-y-2 hover:shadow-2xl
                         bg-gradient-to-br ${section.color}`}
            >
              <h2 className="text-2xl font-bold text-white mb-4">{section.title}</h2>
              <ul className="space-y-4">
                {section.items.map((item, idx) => (
                  <li 
                    key={idx} 
                    className="group relative p-3 rounded-lg transition-all duration-300
                             hover:bg-white/20 hover:shadow-lg"
                  >
                    <i className={`${item.icon} text-2xl group-hover:scale-110 
                                inline-block transition-all duration-300`}></i>
                    <span className="text-lg font-medium text-white ml-2">
                      {item.title}
                    </span>
                    <p className="text-sm mt-1 text-white/80 group-hover:text-white 
                                transition-colors duration-300">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
              
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 text-center w-full">
          <p className="text-white/90 font-meditation text-2xl hover:scale-105 transition-all duration-300
                       shadow-glow hover:text-white cursor-default">
            Created by Eric J. Reyes Rivera
          </p>
        </div>
      
    </>
    
  );
  
}

export default App;
