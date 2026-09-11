import {writeFile} from 'node:fs/promises';
import {GLTFExporter} from './GLTFExporter.mjs';
import {createDuoModel} from '../dist/duo-model.mjs';
import * as T from '../dist/assets/three/three.module.min.js';
class NodeFileReader{
 readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();}).catch(error=>this.onerror?.(error));}
 readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();}).catch(error=>this.onerror?.(error));}
}
globalThis.FileReader=NodeFileReader;
const phone=createDuoModel();phone.root.scale.setScalar(.03347);
const values=[];for(const angle of [0,90,180]){const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-(180-angle)*Math.PI/180);values.push(...q.toArray());}
const animation=new T.AnimationClip('Unfold',3,[new T.QuaternionKeyframeTrack('Hinge_Right.quaternion',[0,1.5,3],values)]);
const binary=await new GLTFExporter().parseAsync(phone.root,{binary:true,animations:[animation]});
await writeFile(new URL('../dist/assets/iphone-duo.glb',import.meta.url),Buffer.from(binary));
console.log(`Exported animated iPhone Duo model: ${binary.byteLength} bytes.`);
phone.dispose();
