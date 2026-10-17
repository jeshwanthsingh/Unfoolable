import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {useEffect,useRef,useMemo} from 'react';
import {Group,Vector3,PCFSoftShadowMap} from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const benches=[[-3.2,0,-1.7],[-.4,0,-1.7],[2.7,0,-1.7],[2.7,0,1.4],[-2.7,0,1.4]] as const;
function Box({position,size,color}:{position:[number,number,number];size:[number,number,number];color:string}){const geometry=useMemo(()=>new RoundedBoxGeometry(...size,2,.025),[size[0],size[1],size[2]]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh position={position} castShadow receiveShadow><primitive object={geometry} attach="geometry"/><meshStandardMaterial color={color} roughness={.65}/></mesh>;}
function Robot({station,reduced}:{station:number;reduced:boolean}){
 const ref=useRef<Group>(null),target=useRef(new Vector3()),velocity=useRef(new Vector3()),invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{const b=benches[station]??benches[0]!;target.current.set(b[0],.75,b[2]+.8);if(reduced&&ref.current)ref.current.position.copy(target.current);invalidate();},[station,reduced,invalidate]);
 useFrame((_,delta)=>{if(!ref.current)return;const p=ref.current.position,dt=Math.min(delta,.035);if(reduced){p.copy(target.current);return;}const force=target.current.clone().sub(p).multiplyScalar(65).addScaledVector(velocity.current,-16);velocity.current.addScaledVector(force,dt);p.addScaledVector(velocity.current,dt);if(p.distanceTo(target.current)>.002||velocity.current.length()>.002)invalidate();else{p.copy(target.current);velocity.current.set(0,0,0);}});
 return <group ref={ref} position={[-3.2,.75,-.9]}><Box position={[0,0,0]} size={[.34,.44,.26]} color="#b9b7ac"/><Box position={[0,.34,0]} size={[.42,.3,.3]} color="#d4d0bd"/><Box position={[0,.35,.16]} size={[.29,.08,.02]} color="#272e33"/>{[-.09,.09].map(x=><mesh key={x} position={[x,.35,.18]}><sphereGeometry args={[.025,8,8]}/><meshBasicMaterial color="#f0c990"/></mesh>)}<Box position={[-.11,-.3,0]} size={[.12,.17,.18]} color="#424844"/><Box position={[.11,-.3,0]} size={[.12,.17,.18]} color="#424844"/></group>;
}
export default function NightRoom({station,reduced,visible,onSelect}:{station:number;reduced:boolean;visible:boolean;onSelect:()=>void}){
 return <Canvas shadows onCreated={({gl})=>{gl.shadowMap.type=PCFSoftShadowMap;}} frameloop={visible?'demand':'never'} orthographic camera={{position:[10,11,13],zoom:58}} dpr={[1,1.5]} aria-label="Historical workshop scene. Use Vault & decision above to inspect recorded checks with the keyboard."><color attach="background" args={['#1b1a20']}/><ambientLight intensity={.9}/><directionalLight position={[-4,8,3]} intensity={2.2} color="#ffd6a0" castShadow shadow-mapSize={[2048,2048]} shadow-radius={4} shadow-normalBias={.02}/><pointLight position={[3,3,-2]} intensity={35} color="#ffbb69" distance={12}/>
 <Box position={[0,-.25,0]} size={[9.8,.5,7.3]} color="#4b3933"/><Box position={[0,1.5,-3.45]} size={[9.8,3.5,.18]} color="#3b3439"/><Box position={[-4.8,1.5,0]} size={[.18,3.5,7]} color="#302d33"/>
 {[-3,-2,-1,0,1,2,3].map(x=><Box key={x} position={[x,-.015,0]} size={[.015,.01,7]} color="#635047"/>)}
 {benches.map(([x,,z],i)=><group key={i} position={[x,0,z]} onClick={onSelect}>
 <Box position={[0,.75,0]} size={[1.8,.15,1]} color={i===station?'#b88d56':'#725b46'}/>{[-.65,.65].map(dx=><Box key={dx} position={[dx,.32,0]} size={[.12,.65,.75]} color="#34363a"/>)}
 {i===2?<><mesh position={[0,1.25,0]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.52,.52,.4,40]}/><meshStandardMaterial color="#737a76" metalness={.65} roughness={.3}/></mesh><mesh position={[0,1.25,.24]}><torusGeometry args={[.32,.04,8,32]}/><meshStandardMaterial color="#bf9a58" metalness={.7} roughness={.2}/></mesh></>:i===4?<><Box position={[0,1.13,-.15]} size={[.6,.44,.06]} color="#161d24"/><Box position={[0,.86,.1]} size={[.6,.025,.25]} color="#9a9a91"/></>:<Box position={[0,.95,0]} size={[.55,.28,.45]} color="#be9461"/>}
 <mesh position={[-.6,1.65,-.2]}><coneGeometry args={[.23,.25,16]}/><meshStandardMaterial color="#c8a269"/></mesh><Box position={[-.6,1.22,-.2]} size={[.035,.7,.035]} color="#bf9b60"/>
 </group>)}
 <Robot station={station} reduced={reduced}/></Canvas>;
}
