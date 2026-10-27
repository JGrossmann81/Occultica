
( function () {

	class SkeletonUtils {

		static retarget( target, source, options = {} ) {

			const pos = new THREE.Vector3(),
				quat = new THREE.Quaternion(),
				scale = new THREE.Vector3(),
				bindBoneMatrix = new THREE.Matrix4(),
				relativeMatrix = new THREE.Matrix4(),
				globalMatrix = new THREE.Matrix4();
			options.preserveMatrix = options.preserveMatrix !== undefined ? options.preserveMatrix : true;
			options.preservePosition = options.preservePosition !== undefined ? options.preservePosition : true;
			options.preserveHipPosition = options.preserveHipPosition !== undefined ? options.preserveHipPosition : false;
			options.useTargetMatrix = options.useTargetMatrix !== undefined ? options.useTargetMatrix : false;
			options.hip = options.hip !== undefined ? options.hip : 'hip';
			options.names = options.names || {};
			const sourceBones = source.isObject3D ? source.skeleton.bones : this.getBones( source ),
				bones = target.isObject3D ? target.skeleton.bones : this.getBones( target );
			let bindBones, bone, name, boneTo, bonesPosition; // reset bones

			if ( target.isObject3D ) {

				target.skeleton.pose();

			} else {

				options.useTargetMatrix = true;
				options.preserveMatrix = false;

			}

			if ( options.preservePosition ) {

				bonesPosition = [];

				for ( let i = 0; i < bones.length; i ++ ) {

					bonesPosition.push( bones[ i ].position.clone() );

				}

			}

			if ( options.preserveMatrix ) {

				// reset matrix
				target.updateMatrixWorld();
				target.matrixWorld.identity(); // reset children matrix

				for ( let i = 0; i < target.children.length; ++ i ) {

					target.children[ i ].updateMatrixWorld( true );

				}

			}

			if ( options.offsets ) {

				bindBones = [];

				for ( let i = 0; i < bones.length; ++ i ) {

					bone = bones[ i ];
					name = options.names[ bone.name ] || bone.name;

					if ( options.offsets && options.offsets[ name ] ) {

						bone.matrix.multiply( options.offsets[ name ] );
						bone.matrix.decompose( bone.position, bone.quaternion, bone.scale );
						bone.updateMatrixWorld();

					}

					bindBones.push( bone.matrixWorld.clone() );

				}

			}

			for ( let i = 0; i < bones.length; ++ i ) {

				bone = bones[ i ];
				name = options.names[ bone.name ] || bone.name;
				boneTo = this.getBoneByName( name, sourceBones );
				globalMatrix.copy( bone.matrixWorld );

				if ( boneTo ) {

					boneTo.updateMatrixWorld();

					if ( options.useTargetMatrix ) {

						relativeMatrix.copy( boneTo.matrixWorld );

					} else {

						relativeMatrix.copy( target.matrixWorld ).invert();
						relativeMatrix.multiply( boneTo.matrixWorld );

					} // ignore scale to extract rotation


					scale.setFromMatrixScale( relativeMatrix );
					relativeMatrix.scale( scale.set( 1 / scale.x, 1 / scale.y, 1 / scale.z ) ); // apply to global matrix

					globalMatrix.makeRotationFromQuaternion( quat.setFromRotationMatrix( relativeMatrix ) );

					if ( target.isObject3D ) {

						const boneIndex = bones.indexOf( bone ),
							wBindMatrix = bindBones ? bindBones[ boneIndex ] : bindBoneMatrix.copy( target.skeleton.boneInverses[ boneIndex ] ).invert();
						globalMatrix.multiply( wBindMatrix );

					}

					globalMatrix.copyPosition( relativeMatrix );

				}

				if ( bone.parent && bone.parent.isBone ) {

					bone.matrix.copy( bone.parent.matrixWorld ).invert();
					bone.matrix.multiply( globalMatrix );

				} else {

					bone.matrix.copy( globalMatrix );

				}

				if ( options.preserveHipPosition && name === options.hip ) {

					bone.matrix.setPosition( pos.set( 0, bone.position.y, 0 ) );

				}

				bone.matrix.decompose( bone.position, bone.quaternion, bone.scale );
				bone.updateMatrixWorld();

			}

			if ( options.preservePosition ) {

				for ( let i = 0; i < bones.length; ++ i ) {

					bone = bones[ i ];
					name = options.names[ bone.name ] || bone.name;

					if ( name !== options.hip ) {

						bone.position.copy( bonesPosition[ i ] );

					}

				}

			}

			if ( options.preserveMatrix ) {

				// restore matrix
				target.updateMatrixWorld( true );

			}

		}

		static retargetClip( target, source, clip, options = {} ) {

			options.useFirstFramePosition = options.useFirstFramePosition !== undefined ? options.useFirstFramePosition : false;
			options.fps = options.fps !== undefined ? options.fps : 30;
			options.names = options.names || [];

			if ( ! source.isObject3D ) {

				source = this.getHelperFromSkeleton( source );

			}

			const numFrames = Math.round( clip.duration * ( options.fps / 1000 ) * 1000 ),
				delta = 1 / options.fps,
				convertedTracks = [],
				mixer = new THREE.AnimationMixer( source ),
				bones = this.getBones( target.skeleton ),
				boneDatas = [];
			let positionOffset, bone, boneTo, boneData, name;
			mixer.clipAction( clip ).play();
			mixer.update( 0 );
			source.updateMatrixWorld();

			for ( let i = 0; i < numFrames; ++ i ) {

				const time = i * delta;
				this.retarget( target, source, options );

				for ( let j = 0; j < bones.length; ++ j ) {

					name = options.names[ bones[ j ].name ] || bones[ j ].name;
					boneTo = this.getBoneByName( name, source.skeleton );

					if ( boneTo ) {

						bone = bones[ j ];
						boneData = boneDatas[ j ] = boneDatas[ j ] || {
							bone: bone
						};

						if ( options.hip === name ) {

							if ( ! boneData.pos ) {

								boneData.pos = {
									times: new Float32Array( numFrames ),
									values: new Float32Array( numFrames * 3 )
								};

							}

							if ( options.useFirstFramePosition ) {

								if ( i === 0 ) {

									positionOffset = bone.position.clone();

								}

								bone.position.sub( positionOffset );

							}

							boneData.pos.times[ i ] = time;
							bone.position.toArray( boneData.pos.values, i * 3 );

						}

						if ( ! boneData.quat ) {

							boneData.quat = {
								times: new Float32Array( numFrames ),
								values: new Float32Array( numFrames * 4 )
							};

						}

						boneData.quat.times[ i ] = time;
						bone.quaternion.toArray( boneData.quat.values, i * 4 );

					}

				}

				mixer.update( delta );
				source.updateMatrixWorld();

			}

			for ( let i = 0; i < boneDatas.length; ++ i ) {

				boneData = boneDatas[ i ];

				if ( boneData ) {

					if ( boneData.pos ) {

						convertedTracks.push( new THREE.VectorKeyframeTrack( '.bones[' + boneData.bone.name + '].position', boneData.pos.times, boneData.pos.values ) );

					}

					convertedTracks.push( new THREE.QuaternionKeyframeTrack( '.bones[' + boneData.bone.name + '].quaternion', boneData.quat.times, boneData.quat.values ) );

				}

			}

			mixer.uncacheAction( clip );
			return new THREE.AnimationClip( clip.name, - 1, convertedTracks );

		}

		static getHelperFromSkeleton( skeleton ) {

			const source = new THREE.SkeletonHelper( skeleton.bones[ 0 ] );
			source.skeleton = skeleton;
			return source;

		}

		static getSkeletonOffsets( target, source, options = {} ) {

			const targetParentPos = new THREE.Vector3(),
				targetPos = new THREE.Vector3(),
				sourceParentPos = new THREE.Vector3(),
				sourcePos = new THREE.Vector3(),
				targetDir = new THREE.Vector2(),
				sourceDir = new THREE.Vector2();
			options.hip = options.hip !== undefined ? options.hip : 'hip';
			options.names = options.names || {};

			if ( ! source.isObject3D ) {

				source = this.getHelperFromSkeleton( source );

			}

			const nameKeys = Object.keys( options.names ),
				nameValues = Object.values( options.names ),
				sourceBones = source.isObject3D ? source.skeleton.bones : this.getBones( source ),
				bones = target.isObject3D ? target.skeleton.bones : this.getBones( target ),
				offsets = [];
			let bone, boneTo, name, i;
			target.skeleton.pose();

			for ( i = 0; i < bones.length; ++ i ) {

				bone = bones[ i ];
				name = options.names[ bone.name ] || bone.name;
				boneTo = this.getBoneByName( name, sourceBones );

				if ( boneTo && name !== options.hip ) {

					const boneParent = this.getNearestBone( bone.parent, nameKeys ),
						boneToParent = this.getNearestBone( boneTo.parent, nameValues );
					boneParent.updateMatrixWorld();
					boneToParent.updateMatrixWorld();
					targetParentPos.setFromMatrixPosition( boneParent.matrixWorld );
					targetPos.setFromMatrixPosition( bone.matrixWorld );
					sourceParentPos.setFromMatrixPosition( boneToParent.matrixWorld );
					sourcePos.setFromMatrixPosition( boneTo.matrixWorld );
					targetDir.subVectors( new THREE.Vector2( targetPos.x, targetPos.y ), new THREE.Vector2( targetParentPos.x, targetParentPos.y ) ).normalize();
					sourceDir.subVectors( new THREE.Vector2( sourcePos.x, sourcePos.y ), new THREE.Vector2( sourceParentPos.x, sourceParentPos.y ) ).normalize();
					const laterialAngle = targetDir.angle() - sourceDir.angle();
					const offset = new THREE.Matrix4().makeRotationFromEuler( new THREE.Euler( 0, 0, laterialAngle ) );
					bone.matrix.multiply( offset );
					bone.matrix.decompose( bone.position, bone.quaternion, bone.scale );
					bone.updateMatrixWorld();
					offsets[ name ] = offset;

				}

			}

			return offsets;

		}

		static renameBones( skeleton, names ) {

			const bones = this.getBones( skeleton );

			for ( let i = 0; i < bones.length; ++ i ) {

				const bone = bones[ i ];

				if ( names[ bone.name ] ) {

					bone.name = names[ bone.name ];

				}

			}

			return this;

		}

		static getBones( skeleton ) {

			return Array.isArray( skeleton ) ? skeleton : skeleton.bones;

		}

		static getBoneByName( name, skeleton ) {

			for ( let i = 0, bones = this.getBones( skeleton ); i < bones.length; i ++ ) {

				if ( name === bones[ i ].name ) return bones[ i ];

			}

		}

		static getNearestBone( bone, names ) {

			while ( bone.isBone ) {

				if ( names.indexOf( bone.name ) !== - 1 ) {

					return bone;

				}

				bone = bone.parent;

			}

		}

		static findBoneTrackData( name, tracks ) {

			const regexp = /\[(.*)\]\.(.*)/,
				result = {
					name: name
				};

			for ( let i = 0; i < tracks.length; ++ i ) {

				// 1 is track name
				// 2 is track type
				const trackData = regexp.exec( tracks[ i ].name );

				if ( trackData && name === trackData[ 1 ] ) {

					result[ trackData[ 2 ] ] = i;

				}

			}

			return result;

		}

		static getEqualsBonesNames( skeleton, targetSkeleton ) {

			const sourceBones = this.getBones( skeleton ),
				targetBones = this.getBones( targetSkeleton ),
				bones = [];

			search: for ( let i = 0; i < sourceBones.length; i ++ ) {

				const boneName = sourceBones[ i ].name;

				for ( let j = 0; j < targetBones.length; j ++ ) {

					if ( boneName === targetBones[ j ].name ) {

						bones.push( boneName );
						continue search;

					}

				}

			}

			return bones;

		}

		static clone( source ) {

			const sourceLookup = new Map();
			const cloneLookup = new Map();
			const clone = source.clone();
			parallelTraverse( source, clone, function ( sourceNode, clonedNode ) {

				sourceLookup.set( clonedNode, sourceNode );
				cloneLookup.set( sourceNode, clonedNode );

			} );
			clone.traverse( function ( node ) {

				if ( ! node.isSkinnedMesh ) return;
				const clonedMesh = node;
				const sourceMesh = sourceLookup.get( node );
				const sourceBones = sourceMesh.skeleton.bones;
				clonedMesh.skeleton = sourceMesh.skeleton.clone();
				clonedMesh.bindMatrix.copy( sourceMesh.bindMatrix );
				clonedMesh.skeleton.bones = sourceBones.map( function ( bone ) {

					return cloneLookup.get( bone );

				} );
				clonedMesh.bind( clonedMesh.skeleton, clonedMesh.bindMatrix );

			} );
			return clone;

		}

	}

	function parallelTraverse( a, b, callback ) {

		callback( a, b );

		for ( let i = 0; i < a.children.length; i ++ ) {

			parallelTraverse( a.children[ i ], b.children[ i ], callback );

		}

	}

	THREE.SkeletonUtils = SkeletonUtils;

} )();

/* ===== 3D animated people: villagers wander, human-type monsters roam and chase (Blender rig, glTF) ===== */
(function(){
 if(typeof THREE==="undefined"||!THREE.GLTFLoader||!THREE.SkeletonUtils||(!window.PERSON_GLB&&!window.HUM_Z))return;
 let PG=null;const RG={};const waiting=[];const SPD={beast:[1.45,3.0],scorpion:[1.3,2.4],hydra:[1.1,1.6],beholder:[1.0,1.5]};
 if(!window.HUM_Z)try{const bin=atob(window.PERSON_GLB),buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,"",g=>{PG=g;waiting.splice(0).forEach(f=>{try{f()}catch(e){console.warn(e)}})},e=>console.warn("person glb",e))}catch(e){console.warn("person glb",e);return}
 ["beast","scorpion","hydra","beholder"].forEach(k=>{try{const d=window[k.toUpperCase()+"_GLB"];if(d){const bin=atob(d),buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer,"",g=>{RG[k]=g},e=>console.warn(k+" glb",e))}}catch(e){console.warn(k+" glb",e)}});
 const ACCS=["Crown","Halo","Hair_long","Fangs","Claws","Spikes","Scar","Horns_big","Robe","Hat_cone","Hat_wide","Cap","Helm","Horns","Tusks","Ears_pointed","Hood","Beard","Turban","Armor","Shield","Sword","Club","Staff","Axe","Dagger"];
 const SKIN=[0xe0b890,0xd0a078,0xb98560,0x8c5e40,0xf0cfae],HAIR=[0x2a1a10,0x5a3a1a,0x8a6a3a,0xb0b0b0,0x1a1a1a,0xa04a20];
 const rs=(s,k)=>typeof hs==="function"?hs(s,k):Math.abs(Math.sin(s*12.9898+k*78.233)*43758.5453)%1;

 /* ---- procedural textures ---- */
 const TX={};
 function hash(x,y,s){let h=(x*374761393+y*668265263+s*982451653)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967295}
 function vnoise(x,y,f,s){const n=256/f,xi=Math.floor(x/n),yi=Math.floor(y/n),fx=x/n-xi,fy=y/n-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),m=f,
  a=hash(xi%m,yi%m,s),b=hash((xi+1)%m,yi%m,s),c=hash(xi%m,(yi+1)%m,s),d=hash((xi+1)%m,(yi+1)%m,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
 function mkTex(kind){
  if(TX[kind])return TX[kind];
  const N=512,cv=document.createElement("canvas");cv.width=cv.height=N;const g=cv.getContext("2d"),id=g.createImageData(N,N),H=new Float32Array(N*N),RG=new Uint8Array(N*N);
  const vn=(x,y,f,s)=>vnoise(x*.5,y*.5,f,s),cl=v=>v<0?0:v>1?1:v;let ns=.9;
  const bump={fur:3.2,scale:5.5,skin:1.6,flesh:3.2,cloth:2.4,leather:3.0,wood:1.6,hair:1.6,steel:1.0,rough:2.5}[kind]||2;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let r=.85,gc=.85,b=.85,h=.5;
   if(kind==="fur"){const st=vn(x*.22,y*3.2,64,23),st2=vn(x*.5,y*6,128,27),br=vn(x,y,10,24),pt=vn(x,y,6,29);
     const dk=Math.max(0,pt-.55)*2.2,tip=st2;h=.35*st+.4*st2+.25*br;
     const k=.62+.42*st+.2*(st2-.5)-.28*dk+.12*(hash(x,y,25)-.5);r=k*1.03;gc=k*.97;b=k*.9;
     const belly=Math.max(0,br-.62)*.8;r+=belly*.1;gc+=belly*.1;b+=belly*.1}
   else if(kind==="scale"){const sz=40,row=Math.floor(y/sz),off=(row&1)*sz/2,cx=Math.floor((x+off)/sz),gx=((x+off)%sz)/sz-.5,gy=(y%sz)/sz-.5+.18,d=Math.sqrt(gx*gx*1.1+gy*gy*.8*1),
     tone=hash(cx,row,5);h=cl(1-d*1.9)*(.8+.2*tone)+.05*vn(x,y,64,26);
     const edge=Math.max(0,d-.42)*4,rim=Math.max(0,.34-Math.abs(d-.3))*.0;
     let k=.58+.42*(1-d*1.6)+.16*(tone-.5)+.1*(vn(x,y,24,26)-.5)-.5*edge;
     const hl=Math.max(0,1-Math.hypot(gx+.12,gy+.1)*3.2);k+=.22*hl;r=k*1.0;gc=k*1.0;b=k*.96}
   else if(kind==="skin"){const pore=hash(x>>1,y>>1,9)>.982?1:0,vz=vn(x,y,14,3),vein=Math.max(0,.07-Math.abs(vn(x,y,10,71)-.5))*14,bl=vn(x,y,6,72);
     h=.5+.1*(vn(x,y,64,2)-.5)-.18*pore;let k=.96+.08*(vz-.5)-.06*pore;r=k+.05*bl;gc=k-.02*bl-.1*vein*.5;b=k-.03*bl-.05*vein+.04*vein*(1-bl)}
   else if(kind==="flesh"){const a=vn(x,y,8,31),b2=vn(x,y,32,32),vein=Math.max(0,.09-Math.abs(vn(x,y,12,34)-.5))*11;h=.45*a+.35*b2+.2*vein;
     const k=.8+.3*(a-.5)+.18*(b2-.5);r=k*1.05+.12*vein;gc=k*.84-.28*vein;b=k*.86-.1*vein+.05*(vn(x,y,8,35)-.5)}
   else if(kind==="cloth"){const w=Math.sin(x*Math.PI/2.5)*Math.sin(y*Math.PI/2.5),fold=vn(x*.35,y,12,8);h=.5+.18*w+.25*fold;const k=.82+.1*w+.18*(fold-.5)+.1*(vn(x,y,24,9)-.5)+.04*(hash(x,y,9)-.5);r=k;gc=k;b=k}
   else if(kind==="leather"){const a=vn(x,y,24,4),b2=vn(x,y,48,6),cr=Math.abs(a-.5);h=.6*cr+.4*b2;const k=.78+.28*cr+.14*b2-.04*hash(x,y,7);r=k*1.04;gc=k*.97;b=k*.9}
   else if(kind==="wood"){const rg=Math.sin(y*.12+vn(x,y,16,12)*8)*.5+.5;h=.5+.3*rg;const k=.7+.3*rg+.1*(vn(x,y,64,13)-.5);r=k*1.03;gc=k;b=k*.93}
   else if(kind==="hair"){const st=vn(x*.12,y*4,32,21),st2=vn(x*.3,y*8,128,22);h=.5*st+.5*st2;const k=.5+.55*st+.15*(st2-.5);r=k;gc=k;b=k}
   else if(kind==="steel"){const br=vn(x*.08,y*5,64,41),sc=hash(x>>2,y,44)>.992?1:0,rust=Math.max(0,vn(x,y,8,43)-.66)*2.2;h=.5+.08*br-.2*sc;let k=.82+.1*br+.1*sc;r=k+.14*rust;gc=k-.05*rust;b=k-.2*rust}
   else {h=vn(x,y,16,51)*.6+vn(x,y,64,52)*.4;const k=.78+.3*(h-.5);r=k;gc=k;b=k*.94}
   const ro=kind==='fur'?.9:kind==='scale'?.78-.5*cl(h):kind==='skin'?.56+.22*(vn(x,y,6,77)-.5)+.06*(hash(x,y,78)-.5):kind==='flesh'?.26+.3*(1-cl(h)):kind==='cloth'?.93:kind==='leather'?.5+.35*cl(h):kind==='wood'?.82:kind==='hair'?.4+.35*hash(x,y,79):kind==='steel'?.3+.55*Math.pow(vn(x,y,8,43),2):.8;RG[y*N+x]=Math.round(cl(ro)*255);
   H[y*N+x]=h;const i=(y*N+x)*4;id.data[i]=Math.round(cl(r)*255);id.data[i+1]=Math.round(cl(gc)*255);id.data[i+2]=Math.round(cl(b)*255);id.data[i+3]=255}
  g.putImageData(id,0,0);const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;
  const nc=document.createElement("canvas");nc.width=nc.height=N;const ng=nc.getContext("2d"),nd=ng.createImageData(N,N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const xm=(x+N-1)%N,xp=(x+1)%N,ym=(y+N-1)%N,yp=(y+1)%N;
   let dx=(H[y*N+xm]-H[y*N+xp])*bump,dy=(H[ym*N+x]-H[yp*N+x])*bump,l=Math.sqrt(dx*dx+dy*dy+1);const i=(y*N+x)*4;
   nd.data[i]=Math.round((dx/l*.5+.5)*255);nd.data[i+1]=Math.round((dy/l*.5+.5)*255);nd.data[i+2]=Math.round((1/l*.5+.5)*255);nd.data[i+3]=255}
  ng.putImageData(nd,0,0);const nt=new THREE.CanvasTexture(nc);nt.wrapS=nt.wrapT=THREE.RepeatWrapping;nt.anisotropy=4;const rc2=document.createElement('canvas');rc2.width=rc2.height=N;const rg2=rc2.getContext('2d'),rd=rg2.createImageData(N,N);for(let i=0;i<N*N;i++){rd.data[i*4]=rd.data[i*4+1]=rd.data[i*4+2]=RG[i];rd.data[i*4+3]=255}rg2.putImageData(rd,0,0);const rt=new THREE.CanvasTexture(rc2);rt.wrapS=rt.wrapT=THREE.RepeatWrapping;t.userData={n:nt,r:rt};
  return TX[kind]=t}
 /* ---- painted face atlas (planar head projection: u=(x+.11)/.22, v from top of head); variants 0 young,1 stubbled,2 weathered,3 old ---- */
 const FT={};
 function mkFace(v){
  if(FT[v])return FT[v];
  const S=1024,mk=()=>{const c=document.createElement("canvas");c.width=c.height=S;return c},cv=mk(),g=cv.getContext("2d"),hc=mk(),hg=hc.getContext("2d"),rc=mk(),rg=rc.getContext("2d");
  const age=[.1,.25,.6,1][v],stub=[0,.7,.35,.15][v],X=x=>(x+.11)/.22*S,Y=z=>(1-(z-1.5)/.28)*S,P=.22/S;
  let seed=17+v*31;const R=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  // base skin: pores, mottling
  const id=g.createImageData(S,S);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const i=(y*S+x)*4;let k=.97+.06*(vnoise(x*.25,y*.25,16,3)-.5)+.04*(vnoise(x*.25,y*.25,64,2)-.5)+.03*(hash(x,y,3)-.5)-(hash(x>>1,y>>1,9)>.978?.07:0);
   const bl=vnoise(x*.25,y*.25,6,72);id.data[i]=Math.min(255,(k+.03*bl)*255);id.data[i+1]=(k-.015*bl)*255;id.data[i+2]=(k-.03*bl)*255;id.data[i+3]=255}
  g.putImageData(id,0,0);hg.fillStyle="#808080";hg.fillRect(0,0,S,S);rg.fillStyle="#b4b4b4";rg.fillRect(0,0,S,S);
  function blob(x,z,rx,rz,col,a,rot,hv){const cx=X(x),cy=Y(z);g.save();g.globalCompositeOperation="multiply";g.translate(cx,cy);g.rotate(rot||0);g.scale(rx,rz);const gr=g.createRadialGradient(0,0,0,0,0,1);gr.addColorStop(0,"rgba("+col+","+a+")");gr.addColorStop(1,"rgba("+col+",0)");g.fillStyle=gr;g.beginPath();g.arc(0,0,1,0,7);g.fill();g.restore();
   if(hv){hg.save();hg.translate(cx,cy);hg.rotate(rot||0);hg.scale(rx,rz);const hr=hg.createRadialGradient(0,0,0,0,0,1);const hs=hv>0?"255,255,255":"0,0,0";hr.addColorStop(0,"rgba("+hs+","+Math.abs(hv)+")");hr.addColorStop(1,"rgba("+hs+",0)");hg.fillStyle=hr;hg.beginPath();hg.arc(0,0,1,0,7);hg.fill();hg.restore()}}
  function path(c,pts){c.lineCap="round";c.lineJoin="round";c.beginPath();pts.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.stroke()}
  function stroke(pts,w,col,a,bl,hv,mult){const passes=bl>1.2?3:1;g.save();g.globalCompositeOperation=mult===false?"source-over":"multiply";
   for(let i=0;i<passes;i++){const k=passes===1?0:(passes-1-i);g.strokeStyle="rgba("+col+","+(a/passes)+")";g.lineWidth=w+k*bl*1.2;path(g,pts)}g.restore();
   if(hv){hg.save();for(let i=0;i<passes;i++){const k=passes===1?0:(passes-1-i);hg.strokeStyle="rgba("+(hv>0?"255,255,255":"0,0,0")+","+(Math.abs(hv)/passes)+")";hg.lineWidth=w+k*bl*1.2;path(hg,pts)}hg.restore()}}
  const curve=(x0,z0,x1,z1,bulge,n)=>{const o=[];for(let i=0;i<=(n||12);i++){const t=i/(n||12);o.push([x0+(x1-x0)*t+bulge*Math.sin(t*Math.PI),z0+(z1-z0)*t])}return o};
  for(const sx of [-1,1]){
   const ex=sx*.041,ez=1.652;
   blob(ex,ez-.002,.032/P,.021/P,"205,150,140",.6,0,-.25);            // eye socket
   blob(ex,ez-.017,.026/P,.008/P,"195,165,185",.35+.4*age,0,-.3);     // under-eye shadow
   if(age>.2)stroke(curve(ex-sx*.024,ez-.021,ex+sx*.022,ez-.024,-.002),5+8*age,"170,130,135",.3+.3*age,3,-.2); // eye bag
   stroke(curve(ex-sx*.026,ez+.012,ex+sx*.028,ez+.011,.006),3.5,"140,95,90",.7,1.8,-.5);     // lid crease
   stroke(curve(ex-sx*.021,ez+.003,ex+sx*.022,ez+.004,.012),5,"50,35,30",.65,1.6,-.4);         // upper lash line
   stroke(curve(ex-sx*.02,ez-.003,ex+sx*.02,ez-.002,-.007),2,"70,50,45",.35,1.2);              // lower lash line
   stroke(curve(ex-sx*.019,ez+.0,ex-sx*.026,ez-.002,0,3),5,"200,120,120",.5,2);                // tear duct
   // brow hairs
   for(let k=0;k<70;k++){const t=R(),bx=sx*(.014+.063*t),bz=1.683-.009*t*t+.007*Math.sin(t*3)+(R()-.5)*.0075,ln=.009+R()*.007,dx=sx*ln*.9,dz=-.004*(.4+t)+(R()-.5)*.003;
    stroke([[bx,bz],[bx+dx,bz+dz]],1.6+R()*1.4,age>.8?"130,120,110":"60,42,34",.5+R()*.3,.5,.12)}
   blob(sx*.04,1.683,.04/P,.01/P,"150,110,100",.3,0,.1);              // brow shadow mass
   // cheeks
   blob(sx*.06,1.61,.026/P,.02/P,"250,175,170",.55,0,0);               // blush
   blob(sx*.063,1.622,.02/P,.012/P,"255,235,225",.0,0,.12);            // cheekbone raise
   // nasolabial fold
   stroke(curve(sx*.027,1.583,sx*.046,1.545,sx*.007),9+10*age,"175,125,115",.32+.3*age,6,-.4);
   // nostril wing crease
   stroke(curve(sx*.0215,1.592,sx*.029,1.576,sx*.003),3,"160,110,100",.5,1.5,-.4);
   blob(sx*.0145,1.578,.0075/P,.0045/P,"85,45,40",.8,0,-.8);           // nostril
   blob(sx*.0095,1.6,.014/P,.02/P,"215,185,175",.35,0,0);               // nose side shade
   // mouth corners + crow's feet + forehead
   blob(sx*.0375,1.5465,.005/P,.004/P,"130,75,70",.7,0,-.6);
   for(let k=0;k<3;k++)stroke([[sx*.066,1.652+(k-1)*.004],[sx*(.082+.004*k),1.652+(k-1)*.011]],2.2,"175,125,115",(.1+.5*age)*.8,1.5,-.3);
   blob(sx*.092,1.695,.012/P,.03/P,"190,205,230",.12+.1*age,.1,0);       // temple vein tint
   blob(sx*.105,1.628,.02/P,.03/P,"255,180,170",.45,0,0);               // ear warmth
  }
  stroke(curve(0,1.662,0,1.598,0,8),12,"255,235,225",.0,2,.18);          // nose bridge raised
  blob(0,1.664,.006/P,.03/P,"255,255,255",0,0,.15);
  blob(0,1.594,.015/P,.011/P,"255,185,175",.4,0,.12);                    // nose tip warmth
  stroke(curve(-.012,1.564,-.012,1.58,0,2),2.4,"170,120,110",.32,1.4,-.15);stroke(curve(.012,1.564,.012,1.58,0,2),2.4,"170,120,110",.32,1.4,-.15); // philtrum
  blob(0,1.51,.034/P,.012/P,"190,140,130",.5,0,-.2);                      // under-lip shadow
  blob(0,1.527,.01/P,.008/P,"255,210,200",0,0,.2);                        // chin dimple catch
  stroke(curve(-.03,1.552,.03,1.552,0,8),2.4,"110,60,60",.35,1.4,-.4);    // mouth line
  // forehead creases + frown
  for(let k=0;k<3;k++){const z=1.707+.013*k;stroke(curve(-.06,z,.06,z,.004*(k%2?-1:1),14),2.4+2.5*age,"170,120,110",(.05+.45*age),2.2,-.2-.3*age)}
  stroke([[-.007,1.69],[-.007,1.702]],2.4,"165,115,105",.1+.4*age,1.5,-.25);stroke([[.007,1.69],[.007,1.702]],2.4,"165,115,105",.1+.4*age,1.5,-.25);
  // age spots / freckles / stubble
  const spots=Math.floor(age*age*90+(v===0?55:0));for(let k=0;k<spots;k++){const px=X((R()-.5)*.17),py=Y(1.6+R()*.12);g.fillStyle="rgba("+(v===0?"170,110,80":"150,110,85")+","+(.2+R()*.25)+")";g.beginPath();g.arc(px,py,1.5+R()*3,0,7);g.fill()}
  if(stub>0){g.save();g.globalCompositeOperation="multiply";for(let k=0;k<26000*stub;k++){const x=(R()-.5)*.17,z=1.51+R()*.06;const jawL=.045+(z-1.51)*.4;if(Math.abs(x)>jawL+(z<1.535?.03:0)&&z>1.535)continue;if(z>1.53&&Math.abs(x)<.032&&z<1.563&&Math.abs(x)>.0&&R()<.5)continue;g.fillStyle="rgba(60,45,40,"+(.18+R()*.25)+")";g.fillRect(X(x),Y(z),1.6,1.6)}g.restore()}
  // individual variation: cheek blush, warm nose tip, a mole or two, lip tone
  {const rb=R(),bl=(G==="f"?.3:.18)+rb*.28;for(const sx of[-1,1])blob(sx*(.052+R()*.01),1.622+R()*.01,(.026+R()*.012)/P,(.02+R()*.01)/P,"228,120,118",bl*(1-age*.5),0,0);
   blob(0,1.634,.015/P,.011/P,"232,132,120",.22+R()*.2,0,0);
   if(R()>.62){const sx=R()>.5?1:-1,mx=X(sx*(.02+R()*.05)),my=Y(1.575+R()*.07);g.fillStyle="rgba(70,44,34,"+(.5+R()*.3)+")";g.beginPath();g.arc(mx,my,1.8+R()*2,0,7);g.fill()}
   if(R()>.8){const mx=X((R()-.5)*.1),my=Y(1.6+R()*.05);g.fillStyle="rgba(70,44,34,.55)";g.beginPath();g.arc(mx,my,1.4+R()*1.4,0,7);g.fill()}
   blob(0,1.545,.03/P,.007/P,"190,95,95",.22+R()*.25,0,0)}
  // roughness: oily T-zone, matte cheeks, wet lips
  rg.save();rg.fillStyle="rgba(60,60,60,.25)";[[0,1.66,.012,.05],[0,1.6,.016,.02],[0,1.72,.04,.02],[0,1.52,.02,.012]].forEach(([x,z,rx,rz])=>{for(let q=1;q<=3;q++){rg.beginPath();rg.ellipse(X(x),Y(z),rx/P*(1+.3*q),rz/P*(1+.3*q),0,0,7);rg.fill()}});rg.restore();
  // plain safe patch (back of head) keep clean; build textures
  const t=new THREE.CanvasTexture(cv);t.flipY=false;t.anisotropy=8;
  const hd=hg.getImageData(0,0,S,S).data,nc=mk(),ng=nc.getContext("2d"),nd=ng.createImageData(S,S);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const xm=Math.max(0,x-1),xp=Math.min(S-1,x+1),ym=Math.max(0,y-1),yp=Math.min(S-1,y+1),dx=(hd[(y*S+xm)*4]-hd[(y*S+xp)*4])/255*3.2,dy=(hd[(ym*S+x)*4]-hd[(yp*S+x)*4])/255*3.2,l=Math.sqrt(dx*dx+dy*dy+1),i=(y*S+x)*4;nd.data[i]=(dx/l*.5+.5)*255;nd.data[i+1]=(dy/l*.5+.5)*255;nd.data[i+2]=(1/l*.5+.5)*255;nd.data[i+3]=255}
  ng.putImageData(nd,0,0);const nt=new THREE.CanvasTexture(nc);nt.flipY=false;nt.anisotropy=8;const rt=new THREE.CanvasTexture(rc);rt.flipY=false;
  t.userData={n:nt,r:rt};return FT[v]=t}
 const MK={Skin:"skin",Lip:"skin",Belly:"skin",Cloth:"cloth",Cloth2:"cloth",Hat:"cloth",Leather:"leather",Hair:"hair",Armor:"steel",Steel:"steel",Wood:"wood",Fur:"fur",Fur2:"fur",Scale:"scale",Shell:"scale",Shell2:"scale",Flesh:"flesh",Bone:"rough"};
 const ALL=new Set();
 function skinSSS(m){m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace("gl_FragColor = vec4( outgoingLight, diffuseColor.a );","float sf=pow(1.0-clamp(dot(normalize(normal),normalize(vViewPosition)),0.0,1.0),2.6);float sl=clamp(dot(reflectedLight.directDiffuse+reflectedLight.indirectDiffuse,vec3(.5)),0.0,1.0);outgoingLight+=diffuseColor.rgb*vec3(1.0,.42,.25)*sf*sl*.9;outgoingLight+=diffuseColor.rgb*vec3(.28,.07,.03)*sl*(1.0-sl)*1.2;gl_FragColor = vec4( outgoingLight, diffuseColor.a );")};m.customProgramCacheKey=()=>"sss";m.needsUpdate=true}
 const FURS={Fur:[10,.024,300],Fur2:[10,.024,300]};
 const _v3=new THREE.Vector3();
 function shellMat(base,i,N,len,dens){const m=base.clone();m.map=base.map;m.normalMap=null;m.roughnessMap=null;m.roughness=.9;m.skinning=true;
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nuniform float uLen;").replace("#include <skinning_vertex>","#include <skinning_vertex>\ntransformed+=normalize(objectNormal)*uLen;");
   sh.uniforms.uLen={value:len*(i+1)/N};sh.uniforms.uL={value:(i+1)/N};sh.uniforms.uD={value:dens};
   sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nuniform float uL;uniform float uD;").replace("#include <map_fragment>","vec2 sp=vUv*uD;vec2 cell=floor(sp);float rn=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);vec2 fq=fract(sp)-.5;if(uL>.3+.7*rn||length(fq)>.5*(1.0-uL*.8))discard;\n#include <map_fragment>\ndiffuseColor.rgb*=mix(.5,1.15,uL);")};
  m.customProgramCacheKey=()=>"shell"+(len>.01?"F":"H");return m}
 function dark(c,k){const o=new THREE.Color(c);o.multiplyScalar(k);return o.getHex()}
 /* ===== Quaternius-based humans (bundle in hum.js) ===== */
 const HUM={ok:false,im:{},tx:{},sc:{},ms:{},eyes:{},k:{skin:.3,cloth:.45,hair:.9,sat:[1.12,1,.82]}};
 const CAL={"m":{"u0":0.4977875047294524,"ku":3.642150544413983,"eyeY":1.698,"sx":0.84,"tab":[[1.5784,0.9513],[1.5904,0.8609],[1.6018,0.827],[1.6113,0.7934],[1.6225,0.7526],[1.6312,0.7216],[1.6418,0.6821],[1.6514,0.6471],[1.6604,0.6258],[1.6704,0.6031],[1.6814,0.5683],[1.6959,0.5087],[1.6969,0.5049],[1.7077,0.4619],[1.7195,0.4224],[1.7312,0.3854],[1.7467,0.3372],[1.7688,0.2665],[1.7916,0.1602],[1.8065,0.0116]]},"f":{"u0":0.499335629909888,"ku":3.8159321414404994,"eyeY":1.655,"sx":0.83,"tab":[[1.5406,0.9271],[1.5551,0.8549],[1.5646,0.826],[1.5722,0.7947],[1.5834,0.7569],[1.5934,0.7163],[1.6044,0.6769],[1.6137,0.6468],[1.6222,0.6281],[1.6334,0.5976],[1.6429,0.5629],[1.6547,0.514],[1.6676,0.4633],[1.6681,0.4615],[1.6803,0.4207],[1.6928,0.3808],[1.7072,0.3355],[1.7322,0.2491],[1.7522,0.1436],[1.7627,0.0118]]}};
 function vOf(cal,y){const t=cal.tab;if(y<=t[0][0])return t[0][1]+(t[0][0]-y)*(t[1][1]-t[0][1])/(t[1][0]-t[0][0])*-1;for(let i=1;i<t.length;i++)if(y<=t[i][0]){const a=t[i-1],b=t[i],k=(y-a[0])/Math.max(1e-6,b[0]-a[0]);return a[1]+(b[1]-a[1])*k}return t[t.length-1][1]}
 function humLoad(cb){
  try{const bin=atob(window.HUM_Z),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);window.HUM_Z=null;
   const raw=pako.inflate(u),dv=new DataView(raw.buffer,raw.byteOffset,raw.byteLength),hl=dv.getUint32(0,true),idx=JSON.parse(new TextDecoder().decode(raw.subarray(4,4+hl))),o0=4+hl;
   const get=n=>raw.subarray(o0+idx[n][0],o0+idx[n][0]+idx[n][1]);let pend=1;const fin=()=>{if(--pend===0){HUM.ok=true;cb()}};
   Object.keys(idx).forEach(n=>{pend++;
    if(/\.(jpg|png)$/.test(n)){const im=new Image();im.onload=fin;im.onerror=fin;im.src=URL.createObjectURL(new Blob([get(n)],{type:n.endsWith("png")?"image/png":"image/jpeg"}));HUM.im[n]=im}
    else{const ab=get(n).slice().buffer;new THREE.GLTFLoader().parse(ab,"",g=>{HUM.sc[n]=g;fin()},e=>{console.warn("hum glb",n,e);fin()})}});
   fin()}catch(e){console.warn("hum load",e)}}
 function htex(n,rep){let k=n;try{if(/^(peasant|ranger)\.jpg$/.test(n)&&window.GFX&&GFX.q>=3&&HUM.im[n.replace(".jpg","_hi.jpg")]){n=n.replace(".jpg","_hi.jpg");k=n}}catch(e){}if(HUM.tx[k])return HUM.tx[k];const im=HUM.im[n];if(!im)return null;const t=new THREE.Texture(im);t.flipY=false;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.needsUpdate=true;return HUM.tx[k]=t}
 function srcMeshes(n){if(HUM.ms[n])return HUM.ms[n];const g=HUM.sc[n],o=[];if(g)g.scene.traverse(m=>{if(m.isSkinnedMesh)o.push({g:m.geometry,mn:m.material.name,bm:m.bindMatrix})});return HUM.ms[n]=o}
 const SK_AVG={m:[.62,.44,.31],f:[.627,.462,.334],rm:[.584,.409,.294],rf:[.615,.435,.31]};
 function skinTint(hex,av,k){k=(k||1)*HUM.k.skin;const c=new THREE.Color(hex);const S=HUM.k.sat||[1,1,1];return new THREE.Color(Math.min(1.7,c.r/av[0]*(k||1)*S[0]),Math.min(1.6,c.g/av[1]*(k||1)*S[1]),Math.min(1.6,c.b/av[2]*(k||1)*S[2]))}
 function clothTint(hex,k){const c=new THREE.Color(hex);return new THREE.Color(Math.min(1.3,.28+c.r*HUM.k.cloth*(k||1)),Math.min(1.3,.28+c.g*HUM.k.cloth*(k||1)),Math.min(1.3,.28+c.b*HUM.k.cloth*(k||1)))}
 function eyeTex(col){const k=col.toString(16);if(HUM.eyes[k])return HUM.eyes[k];const im=HUM.im["eye.png"];if(!im)return null;const S=256,cv=document.createElement("canvas");cv.width=cv.height=S;const g=cv.getContext("2d");g.drawImage(im,0,0,S,S);
  const d=g.getImageData(0,0,S,S),a=d.data,tc=new THREE.Color(col);
  let cxs=0,cys=0,cn=0;for(let i=0;i<a.length;i+=4){const r=a[i],gg=a[i+1],b=a[i+2],sat=Math.max(r,gg,b)-Math.min(r,gg,b);if(sat>34){const l=(r*.3+gg*.59+b*.11)/150;const pi=i/4;cxs+=pi%S;cys+=Math.floor(pi/S);cn++;a[i]=Math.min(255,tc.r*255*l);a[i+1]=Math.min(255,tc.g*255*l);a[i+2]=Math.min(255,tc.b*255*l)}}
  g.putImageData(d,0,0);if(cn>200){const cx=cxs/cn,cy=cys/cn,r=Math.sqrt(cn/Math.PI);const hl=(x,y,rad,al)=>{const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,"rgba(255,255,255,"+al+")");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2)};hl(cx-r*.3,cy-r*.32,r*.2,.95);hl(cx+r*.32,cy+r*.3,r*.1,.35);const lr=g.createRadialGradient(cx,cy,r*.82,cx,cy,r*1.02);lr.addColorStop(0,"rgba(0,0,0,0)");lr.addColorStop(1,"rgba(10,6,4,.45)");g.fillStyle=lr;g.fillRect(cx-r*1.1,cy-r*1.1,r*2.2,r*2.2)}const t=new THREE.CanvasTexture(cv);t.flipY=false;return HUM.eyes[k]=t}
  function mkFaceH(v,G,seed0,opt){
  const S=1024,mk=()=>{const c=document.createElement("canvas");c.width=c.height=S;return c},cv=mk(),g=cv.getContext("2d"),hc=mk(),hg=hc.getContext("2d"),rc=mk(),rg=rc.getContext("2d");
  const cal=CAL[G],age=opt.age,stub=opt.stub,X=x=>(cal.u0+cal.ku*x*cal.sx)*S,Y=z=>vOf(cal,cal.eyeY+(z-1.652)*.86)*S,P=1/(cal.ku*cal.sx*S),AM=.62;
  let seed=(seed0*2654435761+17)>>>0;const R=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  g.drawImage(HUM.im["face_"+G+"_dark.jpg"],0,0,S,S);hg.fillStyle="#808080";hg.fillRect(0,0,S,S);rg.fillStyle="#b4b4b4";rg.fillRect(0,0,S,S);
  function blob(x,z,rx,rz,col,a,rot,hv){const cx=X(x),cy=Y(z);g.save();g.globalCompositeOperation="multiply";g.translate(cx,cy);g.rotate(rot||0);g.scale(rx,rz);const gr=g.createRadialGradient(0,0,0,0,0,1);gr.addColorStop(0,"rgba("+col+","+a*AM+")");gr.addColorStop(1,"rgba("+col+",0)");g.fillStyle=gr;g.beginPath();g.arc(0,0,1,0,7);g.fill();g.restore();
   if(hv){hg.save();hg.translate(cx,cy);hg.rotate(rot||0);hg.scale(rx,rz);const hr=hg.createRadialGradient(0,0,0,0,0,1);const hs=hv>0?"255,255,255":"0,0,0";hr.addColorStop(0,"rgba("+hs+","+Math.abs(hv)+")");hr.addColorStop(1,"rgba("+hs+",0)");hg.fillStyle=hr;hg.beginPath();hg.arc(0,0,1,0,7);hg.fill();hg.restore()}}
  function path(c,pts){c.lineCap="round";c.lineJoin="round";c.beginPath();pts.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.stroke()}
  function stroke(pts,w,col,a,bl,hv,mult){const passes=bl>1.2?3:1;g.save();g.globalCompositeOperation=mult===false?"source-over":"multiply";
   for(let i=0;i<passes;i++){const k=passes===1?0:(passes-1-i);g.strokeStyle="rgba("+col+","+(a*AM/passes)+")";g.lineWidth=(w+k*bl*1.2)*.8;path(g,pts)}g.restore();
   if(hv){hg.save();for(let i=0;i<passes;i++){const k=passes===1?0:(passes-1-i);hg.strokeStyle="rgba("+(hv>0?"255,255,255":"0,0,0")+","+(Math.abs(hv)/passes)+")";hg.lineWidth=(w+k*bl*1.2)*.8;path(hg,pts)}hg.restore()}}
  const curve=(x0,z0,x1,z1,bulge,n)=>{const o=[];for(let i=0;i<=(n||12);i++){const t=i/(n||12);o.push([x0+(x1-x0)*t+bulge*Math.sin(t*Math.PI),z0+(z1-z0)*t])}return o};
  for(const sx of [-1,1]){
   const ex=sx*.041,ez=1.652;
   blob(ex,ez-.002,.032/P,.021/P,"205,150,140",.6,0,-.25);            // eye socket
   blob(ex,ez-.017,.026/P,.008/P,"195,165,185",.35+.4*age,0,-.3);     // under-eye shadow
   if(age>.2)stroke(curve(ex-sx*.024,ez-.021,ex+sx*.022,ez-.024,-.002),5+8*age,"170,130,135",.3+.3*age,3,-.2); // eye bag
   stroke(curve(ex-sx*.026,ez+.012,ex+sx*.028,ez+.011,.006),3.5,"140,95,90",.7,1.8,-.5);     // lid crease
   stroke(curve(ex-sx*.021,ez+.003,ex+sx*.022,ez+.004,.012),5,"50,35,30",.65,1.6,-.4);         // upper lash line
   stroke(curve(ex-sx*.02,ez-.003,ex+sx*.02,ez-.002,-.007),2,"70,50,45",.35,1.2);              // lower lash line
   stroke(curve(ex-sx*.019,ez+.0,ex-sx*.026,ez-.002,0,3),5,"200,120,120",.5,2);                // tear duct
   // brow hairs
   for(let k=0;k<70;k++){const t=R(),bx=sx*(.014+.063*t),bz=1.683-.009*t*t+.007*Math.sin(t*3)+(R()-.5)*.0075,ln=.009+R()*.007,dx=sx*ln*.9,dz=-.004*(.4+t)+(R()-.5)*.003;
    stroke([[bx,bz],[bx+dx,bz+dz]],1.6+R()*1.4,age>.8?"130,120,110":"60,42,34",.5+R()*.3,.5,.12)}
   blob(sx*.04,1.683,.04/P,.01/P,"150,110,100",.3,0,.1);              // brow shadow mass
   // cheeks
   blob(sx*.06,1.61,.026/P,.02/P,"250,175,170",.55,0,0);               // blush
   blob(sx*.063,1.622,.02/P,.012/P,"255,235,225",.0,0,.12);            // cheekbone raise
   // nasolabial fold
   stroke(curve(sx*.027,1.583,sx*.046,1.545,sx*.007),9+10*age,"175,125,115",.32+.3*age,6,-.4);
   // nostril wing crease
   stroke(curve(sx*.0215,1.592,sx*.029,1.576,sx*.003),3,"160,110,100",.5,1.5,-.4);
   blob(sx*.0145,1.578,.0075/P,.0045/P,"85,45,40",.8,0,-.8);           // nostril
   blob(sx*.0095,1.6,.014/P,.02/P,"215,185,175",.35,0,0);               // nose side shade
   // mouth corners + crow's feet + forehead
   blob(sx*.0375,1.5465,.005/P,.004/P,"130,75,70",.7,0,-.6);
   for(let k=0;k<3;k++)stroke([[sx*.066,1.652+(k-1)*.004],[sx*(.082+.004*k),1.652+(k-1)*.011]],2.2,"175,125,115",(.1+.5*age)*.8,1.5,-.3);
   blob(sx*.092,1.695,.012/P,.03/P,"190,205,230",.12+.1*age,.1,0);       // temple vein tint
   blob(sx*.105,1.628,.02/P,.03/P,"255,180,170",.45,0,0);               // ear warmth
  }
  stroke(curve(0,1.662,0,1.598,0,8),12,"255,235,225",.0,2,.18);          // nose bridge raised
  blob(0,1.664,.006/P,.03/P,"255,255,255",0,0,.15);
  blob(0,1.594,.015/P,.011/P,"255,185,175",.4,0,.12);                    // nose tip warmth
  stroke(curve(-.012,1.564,-.012,1.58,0,2),2.4,"170,120,110",.32,1.4,-.15);stroke(curve(.012,1.564,.012,1.58,0,2),2.4,"170,120,110",.32,1.4,-.15); // philtrum
  blob(0,1.51,.034/P,.012/P,"190,140,130",.5,0,-.2);                      // under-lip shadow
  blob(0,1.527,.01/P,.008/P,"255,210,200",0,0,.2);                        // chin dimple catch
  stroke(curve(-.03,1.552,.03,1.552,0,8),2.4,"110,60,60",.35,1.4,-.4);    // mouth line
  // forehead creases + frown
  for(let k=0;k<3;k++){const z=1.707+.013*k;stroke(curve(-.06,z,.06,z,.004*(k%2?-1:1),14),2.4+2.5*age,"170,120,110",(.05+.45*age),2.2,-.2-.3*age)}
  stroke([[-.007,1.69],[-.007,1.702]],2.4,"165,115,105",.1+.4*age,1.5,-.25);stroke([[.007,1.69],[.007,1.702]],2.4,"165,115,105",.1+.4*age,1.5,-.25);
  // age spots / freckles / stubble
  const spots=Math.floor(age*age*90+(opt.freck||0));for(let k=0;k<spots;k++){const px=X((R()-.5)*.17),py=Y(1.6+R()*.12);g.fillStyle="rgba("+(opt.freck?"170,110,80":"150,110,85")+","+(.2+R()*.25)+")";g.beginPath();g.arc(px,py,1.5+R()*3,0,7);g.fill()}
  if(stub>0){g.save();g.globalCompositeOperation="multiply";for(let k=0;k<26000*stub;k++){const x=(R()-.5)*.17,z=1.51+R()*.06;const jawL=.045+(z-1.51)*.4;if(Math.abs(x)>jawL+(z<1.535?.03:0)&&z>1.535)continue;if(z>1.53&&Math.abs(x)<.032&&z<1.563&&Math.abs(x)>.0&&R()<.5)continue;g.fillStyle="rgba(60,45,40,"+(.18+R()*.25)+")";g.fillRect(X(x),Y(z),1.6,1.6)}g.restore()}
  // roughness: oily T-zone, matte cheeks, wet lips
  rg.save();rg.fillStyle="rgba(60,60,60,.25)";[[0,1.66,.012,.05],[0,1.6,.016,.02],[0,1.72,.04,.02],[0,1.52,.02,.012]].forEach(([x,z,rx,rz])=>{for(let q=1;q<=3;q++){rg.beginPath();rg.ellipse(X(x),Y(z),rx/P*(1+.3*q),rz/P*(1+.3*q),0,0,7);rg.fill()}});rg.restore();
  const hd=hg.getImageData(0,0,S,S).data,bc=mk(),bg=bc.getContext("2d");bg.drawImage(HUM.im["face_"+G+"_n.jpg"],0,0,S,S);const bd=bg.getImageData(0,0,S,S),nc=mk(),ng=nc.getContext("2d"),nd=ng.createImageData(S,S);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const xm=Math.max(0,x-1),xp=Math.min(S-1,x+1),ym=Math.max(0,y-1),yp=Math.min(S-1,y+1),dx=(hd[(y*S+xm)*4]-hd[(y*S+xp)*4])/255*2.2,dy=(hd[(ym*S+x)*4]-hd[(yp*S+x)*4])/255*2.2,i=(y*S+x)*4;
   let nx=(bd.data[i]/255-.5)*2+dx,ny=(bd.data[i+1]/255-.5)*2-dy,nz=(bd.data[i+2]/255-.5)*2;const l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;nd.data[i]=(nx/l*.5+.5)*255;nd.data[i+1]=(ny/l*.5+.5)*255;nd.data[i+2]=(nz/l*.5+.5)*255;nd.data[i+3]=255}
  ng.putImageData(nd,0,0);const t=new THREE.CanvasTexture(cv);t.flipY=false;t.anisotropy=8;const nt=new THREE.CanvasTexture(nc);nt.flipY=false;nt.anisotropy=8;const rt=new THREE.CanvasTexture(rc);rt.flipY=false;
  return{map:t,normalMap:nt,roughMap:rt}}

 const FCACHE={};
 function faceTex(G,v,seed,opt){const k=G+v+"_"+seed;if(FCACHE[k])return FCACHE[k];return FCACHE[k]=mkFaceH(v,G,seed,opt)}
 /* geometry helpers (world bind-pose coordinates; head items are positioned by eye height) */
 const _V=(x,y,z)=>new THREE.Vector3(x,y,z);
 function latheG(pts,seg,ps,pl){return new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg||28,ps||0,pl||Math.PI*2)}
 function sweep(pts,r0,r1,seg,bias){ // tapered tube along a polyline/curve
  const cu=new THREE.CatmullRomCurve3(pts.map(p=>_V(p[0],p[1],p[2]))),N=22,pos=[],idx=[],up=_V(0,0,1);
  for(let i=0;i<=N;i++){const t=i/N,p=cu.getPoint(t),tg=cu.getTangent(t),n1=_V().crossVectors(tg,up).normalize();if(n1.lengthSq()<.01)n1.set(1,0,0);const n2=_V().crossVectors(tg,n1).normalize(),r=r0+(r1-r0)*Math.pow(t,bias||1);
   for(let j=0;j<seg;j++){const a=j/seg*6.2832,c=Math.cos(a)*r,s=Math.sin(a)*r;pos.push(p.x+n1.x*c+n2.x*s,p.y+n1.y*c+n2.y*s,p.z+n1.z*c+n2.z*s)}}
  for(let i=0;i<N;i++)for(let j=0;j<seg;j++){const a=i*seg+j,b=i*seg+(j+1)%seg,c=(i+1)*seg+j,d=(i+1)*seg+(j+1)%seg;idx.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));const uv=[];for(let i=0;i<=N;i++)for(let j=0;j<seg;j++)uv.push(j/seg*2,i/N*3);g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g}
 function mirrorPts(p){return p.map(q=>[-q[0],q[1],q[2]])}
 /* build head/body items; each returns [ [geometry,matName], ...] in WORLD bind coords. e = eye offset (female -.043) */
 function headItems(name,e){
  const Y=1.6+e,Z=-.017,T=(g,y,z,sz)=>{g.scale(1,1,sz||1.12);g.translate(0,Y+(y||0),Z+(z===undefined?.02:z));return g};
  switch(name){
   case"Cap":return[[T(latheG([[.1,.125],[.106,.15],[.103,.18],[.09,.212],[.062,.234],[.026,.246],[0,.249]],28)),"Hat"],[T(latheG([[.1,.124],[.145,.113],[.155,.118],[.104,.138]],14,-1.05,2.1),0,.02,1.0),"Hat"]];
   case"Hat_wide":return[[T(latheG([[.1,.112],[.099,.17],[.09,.205],[.07,.222],[0,.226]],28)),"Hat"],[T(latheG([[.098,.11],[.19,.1],[.27,.082],[.292,.072],[.292,.082],[.2,.112],[.1,.128]],36),0,.02,1),"Hat"]];
   case"Hat_cone":{const c=latheG([[.098,.128],[.09,.2],[.074,.3],[.054,.4],[.03,.5],[.012,.58],[0,.625]],28),p=c.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>.2){const k=(y-.2);p.setZ(i,p.getZ(i)-k*k*.95);p.setX(i,p.getX(i)+k*k*.18)}}c.computeVertexNormals();
    return[[T(c,0,.02,1.05),"Hat"],[T(latheG([[.095,.125],[.17,.113],[.26,.092],[.282,.082],[.282,.092],[.2,.124],[.096,.138]],36),0,.02,1),"Hat"]]}
   case"Helm":{const b=new THREE.BoxGeometry(.014,.095,.012);b.translate(0,.09,.125);return[[T(latheG([[.106,.1],[.11,.14],[.106,.18],[.092,.214],[.062,.236],[.022,.247],[0,.249]],28)),"Armor"],[T(latheG([[.108,.1],[.112,.108],[.112,.122],[.108,.13]],28),0,.02,1.12),"Armor"],[T(b,0,0,1),"Armor"]]}
   case"Turban":{const o=[];for(let i=0;i<4;i++){const t=new THREE.TorusGeometry(.098-i*.006,.03,10,26);t.rotateX(Math.PI/2);t.rotateZ(.12*(i%2?-1:1));o.push([T(t,.135+i*.034,.02,1.1),"Hat"])}o.push([T(latheG([[.075,.235],[.05,.256],[.02,.268],[0,.27]],20)),"Hat"]);return o}
   case"Horns":case"Horns_big":{const big=name==="Horns_big",q=big?[[.07,.16,0],[.12,.2,-.02],[.16,.3,-.04],[.14,.42,-.02],[.1,.5,.03]]:[[.07,.16,0],[.105,.2,-.012],[.125,.26,-.02],[.115,.33,-.01]],pr=q.map(p=>[p[0],Y+p[1],Z+p[2]]);
    return[[sweep(pr,big?.026:.017,.002,8,.9),"Bone"],[sweep(mirrorPts(pr),big?.026:.017,.002,8,.9),"Bone"]]}
   case"Tusks":{const p=[[.034,-.014,.082],[.044,-.004,.104],[.041,.026,.118],[.033,.052,.114]].map(q=>[q[0],Y+q[1],Z+q[2]]);return[[sweep(p,.0085,.0008,7,.8),"Bone"],[sweep(mirrorPts(p),.0085,.0008,7,.8),"Bone"]]}
   case"Crown":{const o=[[T(latheG([[.1,.13],[.109,.13],[.109,.158],[.1,.158],[.1,.13]],26),0,.02,1.04),"Gold"]];for(let i=0;i<8;i++){const an=i/8*6.283,g=new THREE.ConeGeometry(.013,.058,5);g.translate(Math.cos(an)*.105,.186,Math.sin(an)*.105*1.04);o.push([T(g,0,.02,1),"Gold"])}return o}
   case"Halo":{const g=new THREE.TorusGeometry(.17,.007,8,40);g.rotateX(Math.PI/2);g.translate(0,.3,-.03);return[[T(g,0,.02,1),"Gold"]]}
   case"Fangs":{const o=[];for(const s of[-1,1]){const g=new THREE.ConeGeometry(.006,.026,6);g.rotateX(Math.PI);g.translate(s*.016,Y+.0,Z+.107);o.push([g,"Bone"])}return o}
   case"Ears_pointed":{const o=[];for(const s of[-1,1]){const g=new THREE.ConeGeometry(.034,.12,8);g.scale(1,1,.28);const d=_V(s*.8,.55,-.28).normalize();g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(_V(0,1,0),d)));g.translate(s*.088,Y+.075,Z+.0);o.push([g,"Skin"])}return o}
   case"Robe":{const pts=[],top=1.12+e*.0,hem=.1;for(let i=0;i<=10;i++){const t=i/10;pts.push([.2+Math.pow(t,1.3)*.27,top-(top-hem)*t])}const g=latheG(pts,40),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z),y=p.getY(i),t=Math.max(0,(1.12-y)/1.0),a=Math.atan2(x,z),f=1+.045*Math.sin(a*13)*t+.02*Math.sin(a*29+1)*t;p.setX(i,x*f);p.setZ(i,z*f)}g.translate(0,0,-.05);g.computeVertexNormals();
    const h=latheG([[.465,.12],[.472,.1],[.47,.07],[.462,.06]],40);h.translate(0,0,-.05);return[[g,"Cloth"],[h,"Gold"]]}
  }return[]}
 function mkAccMat(n,c,sk){const base={Wood:[0x5c3618,.8,0],Steel:[0xccd2e0,.3,.5],Gold:[0xf5bd42,.35,.6],Leather:[0x4d2b17,.8,0],Bone:[0xe6dec2,.6,0],Armor:[0x8a8f9e,.4,.45],Orb:[0x80b0ff,.2,0],Skin:[0xb98560,.6,0],Hair:[0x33201b,.9,0]}[n]||[0x888888,.8,0];
  const m=new THREE.MeshStandardMaterial({color:base[0],roughness:base[1],metalness:base[2],side:2,skinning:!!sk});
  if(n==="Cloth")m.color.setHex(c.robe!=null?c.robe:c.cloth);else if(n==="Cloth2")m.color.setHex(c.pants);else if(n==="Hat")m.color.setHex(c.hat||c.cloth);else if(n==="Armor")m.color.setHex(c.armor||0x8a8f9e);
  else if(n==="Skin")m.color.setHex(c.skin);
  if(n==="Orb"){m.emissive.setHex(0x80b0ff);m.emissiveIntensity=1.6}
  const kind={Cloth:"cloth",Cloth2:"cloth",Hat:"cloth",Leather:"leather",Armor:"steel",Steel:"steel",Wood:"wood",Bone:"rough",Hair:"hair"}[n];
  if(kind){const tx=mkTex(kind);m.map=tx;if(tx.userData&&tx.userData.n){m.normalMap=tx.userData.n;m.normalScale.set(.8,-.8);m.roughnessMap=tx.userData.r;m.roughness=1}}
  if(n==="Steel"||n==="Armor")m.roughness=.4;return m}

 /* ---------- villager gear: scarf, apron, satchel, pack, belt (made from simple shapes, woven-cloth look) ---------- */
 let WEAVE=null;
 function weave(){if(WEAVE)return WEAVE;const cv=document.createElement("canvas");cv.width=cv.height=64;const g=cv.getContext("2d");g.fillStyle="#c8c8c8";g.fillRect(0,0,64,64);
  for(let i=0;i<64;i+=2){g.fillStyle="rgba(0,0,0,"+(.07+((i*7)%5)*.02)+")";g.fillRect(i,0,1,64);g.fillStyle="rgba(255,255,255,"+(.05+((i*5)%4)*.02)+")";g.fillRect(0,i,64,1)}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,6);t.anisotropy=4;return WEAVE=t}
 const FABM={};
 function fab(color,rough,metal){const k=color+"|"+(rough||0);if(FABM[k])return FABM[k];const m=new THREE.MeshStandardMaterial({color:clothTint(color,1),map:weave(),bumpMap:weave(),bumpScale:.6,roughness:rough==null?.92:rough,metalness:metal||0,side:2});try{if(window.SKY2&&SKY2.patch)SKY2.patch(m,1)}catch(e){}return FABM[k]=m}
window.CLK=window.CLK||{uT:{value:0},uW:{value:1}};
 function cloakMat(color){const k="cl"+color;if(FABM[k])return FABM[k];const m=new THREE.MeshStandardMaterial({color:clothTint(color,.9),map:weave(),bumpMap:weave(),bumpScale:.8,roughness:.95,metalness:0,side:2});
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,window.CLK);sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nuniform float uT,uW;").replace("#include <begin_vertex>","#include <begin_vertex>\n{float k=clamp(1.-uv.y,0.,1.);float ph=uT*2.3+position.x*7.+k*2.6;float ph2=uT*1.4-position.x*3.+k*5.;transformed.z-=k*k*(.045+uW*.03*(.6+.4*sin(ph2)))+sin(ph)*.05*k*k*uW;transformed.x+=sin(ph2)*.028*k*uW;transformed.y+=sin(ph*1.3)*.012*k*uW;}")};
  m.customProgramCacheKey=()=>"cloakW";try{if(window.SKY2&&SKY2.patch)SKY2.patch(m,1)}catch(e){}return FABM[k]=m}
 function cloakGeo(e){const g=new THREE.CylinderGeometry(.19,.285,.92,22,12,true,Math.PI-1.4,2.8);g.translate(0,1.0+e,-.012);return g}
 function gearFor(c,e){const o=[],S=c.gear||{},Mx=(g,y,z,x)=>{g.translate(x||0,y,z||0);return g};
  if(S.scarf){const t=new THREE.TorusGeometry(.099,.034,8,24);t.rotateX(Math.PI/2);t.scale(1,1,1.1);t.translate(0,1.485+e,.0);o.push(["neck_01",t,S.scarf]);
   const tail=new THREE.BoxGeometry(.075,.3,.026);tail.rotateZ(.12);tail.translate(.055,1.345+e,.118);o.push(["neck_01",tail,S.scarf]);
   const tail2=new THREE.BoxGeometry(.06,.2,.022);tail2.rotateZ(-.2);tail2.translate(-.02,1.39+e,-.11);o.push(["neck_01",tail2,S.scarf])}
  if(S.belt){const b=new THREE.CylinderGeometry(1,1,.052,22,1,true);b.scale(.168,1,.122);b.translate(0,1.0+e,0);o.push(["pelvis",b,S.belt,.75]);
   const bk=new THREE.BoxGeometry(.045,.04,.012);bk.translate(0,1.0+e,.125);o.push(["pelvis",bk,0xc9a24a,.35,.7]);
   const pz=new THREE.BoxGeometry(.085,.085,.05);pz.translate(.12,.955+e,.1);o.push(["pelvis",pz,S.belt,.8])}
  if(S.apron){const a=new THREE.BoxGeometry(.31,.56,.016);a.translate(0,.885+e,.152);o.push(["pelvis",a,S.apron]);
   const bib=new THREE.BoxGeometry(.19,.2,.016);bib.translate(0,1.255+e,.142);o.push(["spine_02",bib,S.apron]);
   const st=new THREE.BoxGeometry(.03,.24,.012);st.rotateZ(.25);st.translate(.075,1.38+e,.12);o.push(["spine_02",st,S.apron]);const st2=st.clone();st2.rotateZ(-.5);st2.translate(-.15,0,0);o.push(["spine_02",st2,S.apron])}
  if(S.satchel){const b=new THREE.BoxGeometry(.24,.19,.085);b.translate(.245,.93+e,.02);o.push(["pelvis",b,S.satchel,.8]);
   const fl=new THREE.BoxGeometry(.25,.07,.09);fl.translate(.245,1.015+e,.02);o.push(["pelvis",fl,S.satchel,.8]);
   const sp=new THREE.BoxGeometry(.04,.62,.014);sp.rotateZ(.62);sp.translate(.06,1.16+e,.138);o.push(["spine_02",sp,S.satchel,.8])}
  if(S.cloak){o.push(["spine_02",cloakGeo(e),S.cloak,.95,0,1]);const cl=new THREE.TorusGeometry(.092,.036,8,22);cl.rotateX(Math.PI/2);cl.scale(1,1,1.1);cl.translate(0,1.49+e,-.01);o.push(["neck_01",cl,S.cloak,.95,0,1])}
  if(S.pack){const sk=new THREE.SphereGeometry(.17,12,10);sk.scale(1.05,1.25,.85);sk.translate(0,1.19+e,-.19);o.push(["spine_02",sk,S.pack]);
   const rl=new THREE.CylinderGeometry(.06,.06,.42,12);rl.rotateZ(Math.PI/2);rl.translate(0,1.43+e,-.2);o.push(["spine_02",rl,S.roll||0x8a7a5a]);
   const sp=new THREE.BoxGeometry(.035,.4,.012);sp.translate(.11,1.3+e,.1);o.push(["spine_02",sp,0x4a3220,.85]);const sp2=sp.clone();sp2.translate(-.22,0,0);o.push(["spine_02",sp2,0x4a3220,.85])}
  return o}
 const OUTPARTS=["arms","body","legs","feet"];
 function partName(G,o,p){if(o==="ranger"&&p==="feet"&&G==="m")p="feet_boots";return G+"_"+o+"_"+p}
 const CMATS={};
 function clothMat(o,p,color,sk){const k=o+p+color;if(CMATS[k])return CMATS[k];const m=new THREE.MeshStandardMaterial({map:htex(o+".jpg"),normalMap:htex(o+"_n.jpg"),roughnessMap:htex(o+"_r.jpg"),roughness:1,metalness:0,side:2,skinning:true});m.normalScale.set(1,-1);m.color.copy(clothTint(color,p==="feet"?.8:1));try{if(window.SKY2&&SKY2.patch)SKY2.patch(m,1)}catch(e){}return CMATS[k]=m}
 const SMATS={};
 function skinMat(kind,G,hex){const k=kind+G+hex;if(SMATS[k])return SMATS[k];let m;
  if(kind==="rest"){m=new THREE.MeshStandardMaterial({map:htex(G+"_dark.jpg"),normalMap:htex(G+"_norm.jpg"),roughness:.62,metalness:0,skinning:true,side:2});m.normalScale.set(1,-1);m.color.copy(skinTint(hex,SK_AVG[G]))}
  else{const hk=G==="m"?"rm":"rf";m=new THREE.MeshStandardMaterial({map:htex(hk+"_dark.jpg"),normalMap:htex(hk+"_n.jpg"),roughness:.62,metalness:0,skinning:true,side:2});m.normalScale.set(1,-1);m.color.copy(skinTint(hex,SK_AVG[hk]))}
  skinSSS(m);return SMATS[k]=m}
 const HAIRMAT={};
 function hairMat(hex,tex,sk){const k=hex+tex;if(HAIRMAT[k])return HAIRMAT[k];const m=new THREE.MeshStandardMaterial({map:htex(tex),alphaTest:.45,roughness:.55,metalness:0,side:2,skinning:true});const c=new THREE.Color(hex);m.color.setRGB(Math.min(1.6,c.r*HUM.k.hair),Math.min(1.6,c.g*HUM.k.hair),Math.min(1.6,c.b*HUM.k.hair));try{if(window.SKY2&&SKY2.patch)SKY2.patch(m,1)}catch(e){}return HAIRMAT[k]=m}
 function boneOf(skel,n){return skel.bones.find(b=>b.name===n)}
 function attachBind(skel,bn,obj){const b=boneOf(skel,bn);if(!b)return;const i=skel.bones.indexOf(b),gp=new THREE.Group();gp.matrixAutoUpdate=false;gp.matrix.copy(skel.boneInverses[i]);gp.matrixWorldNeedsUpdate=true;gp.add(obj);b.add(gp);return gp}
 const HANIM={idle:"Idle_Loop",walk:"Walk_Loop",run:"Jog_Fwd_Loop",attack:"Sword_Attack",cast:"Spell_Simple_Shoot",hit:"Hit_Chest",die:"Death01",talk:"Idle_Talking_Loop"};
 function figureH(c){
  const G=c.g||"m",ofs=G==="f"?-.043:0,show={};(c.acc||[]).forEach(n=>show[n]=1);
  let outfit=c.outfit||"peasant";if(show.Armor&&outfit==="peasant")outfit="ranger";const bare=outfit==="bare";
  const base=HUM.sc[(bare?"full_":"base_")+G],root=THREE.SkeletonUtils.clone(base.scene);
  let skel=null,par=null;const bm=[];root.traverse(o=>{if(o.isSkinnedMesh){bm.push(o);if(!skel){skel=o.skeleton;par=o.parent}}});
  const mats=[],meshes=[],skinHex=c.skin;const wep=show.Sword||show.Axe||show.Club||show.Dagger;
  const fseed=(c.fseed||1)*7+((c.face||0)*13);
  const fopt={age:[.1,.25,.6,1][c.face==null?1:c.face],stub:G==="f"?0:[0,.7,.35,.15][c.face==null?1:c.face],freck:(c.face===0?55:0)+(c.freck||0),scar:c.scar};
  bm.forEach(o=>{const n=o.material.name;let m;
   if(n==="Face"){m=new THREE.MeshStandardMaterial({roughness:1,metalness:0,side:2,skinning:true});const ft=faceTex(G,c.face==null?1:c.face,fseed,fopt);m.map=ft.map;m.normalMap=ft.normalMap;m.roughnessMap=ft.roughMap;m.normalScale.set(1,-1);m.color.copy(skinTint(skinHex,SK_AVG[G]));skinSSS(m)}
   else if(/Superhero/i.test(n)){m=skinMat("rest",G,skinHex)}
   else if(n==="MI_Eyes"&&c.voidEyes){m=new THREE.MeshStandardMaterial({color:0x000000,roughness:.12,metalness:0,skinning:true,side:2})}
   else if(n==="MI_Eyes"){m=new THREE.MeshStandardMaterial({map:eyeTex(c.eye||c.iris||0x4a3220),roughness:.1,metalness:0,skinning:true,side:2});if(c.eye){m.emissive.setHex(c.eye);m.emissiveIntensity=1.5;m.emissiveMap=m.map}}
   else if(/Hair/.test(n)){const hc=c.hair==null?0x201510:c.hair;const k=new THREE.Color(hc).multiplyScalar(.8);m=hairMat(k.getHex(),n==="MI_Hair_2"?"hair2.png":"hair1.png");if(c.hair==null||bare&&!c.brows)o.visible=false}
   else m=o.material;
   o.material=m;o.castShadow=true;meshes.push(o);if(m.color)mats.push(m)});
  // outfit pieces
  const addPart=(nm,matFn)=>{srcMeshes(nm).forEach(s=>{const mm=matFn(s.mn);if(!mm)return;const sm=new THREE.SkinnedMesh(s.g,mm);sm.bind(skel,s.bm);sm.castShadow=true;par.add(sm);meshes.push(sm);if(mm.color)mats.push(mm)})};
  const clothFor=(p)=>p==="legs"?c.pants:(p==="feet"?(c.boots||0x6a4a2a):c.cloth);
  if(bare){addPart(partName(G,"peasant","legs"),()=>clothMat("peasant","legs",c.pants));if(!c.barefoot)addPart(partName(G,"peasant","feet"),()=>clothMat("peasant","feet",c.boots||0x4a3020))}
  else{OUTPARTS.forEach(p=>{addPart(partName(G,outfit,p),mn=>/Regular/.test(mn)?skinMat("arm",G,skinHex):clothMat(outfit,p,clothFor(p)))})}
  if(show.Hood||show.Armor&&false){addPart(G+"_ranger_head_hood",()=>clothMat("ranger","hood",c.hat||c.cloth))}
  if(c.pauldrons||show.Armor){addPart(G==="m"?"m_ranger_acc_pauldron":"f_ranger_acc_pauldrons",()=>{const m=mkAccMat("Armor",c,true);m.skinning=true;m.map=htex("ranger.jpg");m.normalMap=htex("ranger_n.jpg");m.normalScale.set(1,-1);m.roughnessMap=htex("ranger_r.jpg");m.color.setHex(c.armor||0xc9cdd6);m.metalness=.55;m.roughness=1;return m})}
  // hair
  const HS={simple:"hair_simpleparted",buzzed:"hair_buzzed",buzzedf:"hair_buzzedfemale",long:"hair_long",buns:"hair_buns"};
  let hs=c.hairStyle;if(show.Hair_long)hs="long";if(c.hair==null)hs=null;if(show.Cap||show.Hat_wide||show.Hat_cone||show.Helm||show.Turban||show.Hood)hs=hs==="long"?"long":(hs?"buzzed":null);
  if(hs&&HS[hs]){addPart(HS[hs],mn=>hairMat(new THREE.Color(c.hair).multiplyScalar(.8).getHex(),mn==="MI_Hair_2"?"hair2.png":"hair1.png"))}
  if(show.Beard||c.beard){addPart("hair_beard",mn=>hairMat(new THREE.Color(c.hair==null?0x302018:c.hair).multiplyScalar(.8).getHex(),mn==="MI_Hair_2"?"hair2.png":"hair1.png"))}
  // rigid / procedural accessories
  const accM={};const mat=n=>accM[n]||(accM[n]=mkAccMat(n,c,false));
  ["Cap","Hat_wide","Hat_cone","Helm","Turban","Horns","Horns_big","Tusks","Fangs","Ears_pointed","Crown","Halo","Robe"].forEach(a=>{if(!show[a])return;const grp=new THREE.Group();headItems(a,ofs).forEach(([g,mn])=>{const mm=new THREE.Mesh(g,mat(mn));mm.castShadow=true;grp.add(mm);mats.push(mm.material)});
   attachBind(skel,a==="Robe"?"pelvis":"Head",grp)});
  if(c.gear){const byBone={};gearFor(c,ofs).forEach(([bn,g,col,rough,metal,wave])=>{const m=new THREE.Mesh(g,wave?cloakMat(col):fab(col,rough,metal));m.castShadow=true;(byBone[bn]=byBone[bn]||new THREE.Group()).add(m);mats.push(m.material)});for(const bn in byBone)attachBind(skel,bn,byBone[bn])}
  if(c.ghost){const eg=new THREE.Group(),ecol=c.eye||0xb0d8ff;eg.userData.eyeglow=true;for(const sx of[-1,1]){const em=new THREE.Mesh(new THREE.SphereGeometry(.0105,10,8),new THREE.MeshBasicMaterial({color:ecol,fog:false}));em.position.set(sx*.034,1.6+ofs+.098,.081);eg.add(em);
   const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:radTex(255,255,255),color:ecol,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));sp.scale.set(.1,.1,1);sp.position.copy(em.position);eg.add(sp)}attachBind(skel,"Head",eg)}
  const A=HUM.sc.acc&&HUM.sc.acc.scene;if(A)["Sword","Axe","Club","Dagger","Staff","Shield","Spikes","Claws_r","Claws_l"].forEach(a=>{const nm=a==="Claws_r"||a==="Claws_l"?"Claws":a;if(!show[nm])return;const src=A.children.find(o=>o.name===a);if(!src)return;const bone=boneOf(skel,src.userData.bone);if(!bone)return;
   const o=src.clone();o.traverse(q=>{if(q.isMesh){q.material=mat(q.material.name);q.castShadow=true}});bone.add(o)});
  if(c.ghost){mats.forEach(m=>{m.transparent=true;m.opacity=.62;m.depthWrite=false;if(m.emissive){m.emissive.setHex(c.glow||0x6a9aff);m.emissiveIntensity=.55}})}
  if(c.hunch)root.rotation.x=c.hunch;
  const g=new THREE.Group();g.add(root);const s=c.s||1.05,w=c.w||1;g.scale.set(s*w,s,s*w);
  if(c.limbs){const L=c.limbs,B={};skel.bones.forEach(b=>B[b.name]=b);
   const st=(n,k,kids)=>{const b=B[n];if(!b||!k)return;b.scale.y*=k;(kids||[]).forEach(q=>{if(B[q])B[q].scale.y/=k})};
   if(L.arm){["l","r"].forEach(sd=>{st("upperarm_"+sd,L.arm,[]);if(B["hand_"+sd])B["hand_"+sd].scale.y/=L.arm})}
   if(L.leg){["l","r"].forEach(sd=>{st("thigh_"+sd,L.leg,[]);if(B["foot_"+sd])B["foot_"+sd].scale.y/=L.leg})}
   if(L.neck){st("neck_01",L.neck,["Head"])}}
  const mixer=new THREE.AnimationMixer(root),acts={},AN=HUM.sc.anims.animations;
  const hmap=Object.assign({},HANIM);if(wep){hmap.idle="Sword_Idle"}else{hmap.attack="Punch_Jab"}if(c.formal)hmap.walk="Walk_Formal_Loop";
  Object.keys(hmap).forEach(k=>{const cl=AN.find(a=>a.name===hmap[k]);if(cl)acts[k]=mixer.clipAction(cl)});
  ["attack","cast","hit","die"].forEach(n=>{const a=acts[n];if(a){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}});
  const F={g,root,mixer,acts,mats,meshes,sh:true,base:1.35,spd:c.rig?1:2.6,runBase:3.3,cur:"",one:0,dead:false,hum:true,
   play(n,ts){const a=acts[n];if(!a||this.dead)return;if(n===this.cur&&(n==="idle"||n==="walk"||n==="run"||n==="talk")){a.setEffectiveTimeScale(ts||1);return}
    const prev=acts[this.cur];a.reset().setEffectiveTimeScale(ts||1).setEffectiveWeight(1);if(prev&&prev!==a)prev.crossFadeTo(a,.2,false);a.play();
    if(n==="idle"||n==="walk"||n==="run"||n==="talk")a.time=Math.random()*a.getClip().duration;
    this.cur=n;this.one=(n==="idle"||n==="walk"||n==="run"||n==="talk")?0:a.getClip().duration/(ts||1);if(n==="die")this.dead=true},
   update(dt){if(this.hold)return;let a=dt;if(c.stut&&!this.dead){this.sa=(this.sa||0)+dt;if(this.sa<(this.sst||.11)){if(this.one>0)this.one-=dt;return}a=this.sa;this.sa=0;this.sst=Math.random()<.2?.27:.11}mixer.update(a);if(this.one>0){this.one-=dt;if(this.one<=0&&this.cur!=="die"){this.cur="";this.play("idle")}}}};
  if(c.float)g.userData.float=true;if(c.far)g.userData.far=true;F.eye=c.eye||0;F.shells=[];g.userData.fig=F;g.userData.mats=mats;ALL.add(F);F.play("idle");return F}

 if(window.HUM_Z&&window.pako){humLoad(()=>{PG={hum:1,animations:[]};waiting.splice(0).forEach(f=>{try{f()}catch(e){console.warn(e)}})})}

 /* build one animated figure. cfg: skin,cloth,pants,hair(null=bald),hat,armor,acc[],s (scale),w (width) */
 function figure(c){
  if(c.build&&window.ABOM&&window.ABOM[c.build])return window.ABOM[c.build](c);
  if(!c.rig&&HUM.ok)return figureH(c);
  const GL=c.rig?RG[c.rig]:PG;const root=THREE.SkeletonUtils.clone(GL.scene);
  const show={};(c.acc||[]).forEach(n=>show[n]=1);
  ACCS.forEach(n=>{const o=root.getObjectByName(n);if(o)o.visible=!!show[n]});
  const mats=[],meshes=[],furL=[];let glowEye=false;
  root.traverse(o=>{if(!o.isSkinnedMesh)return;meshes.push(o);o.castShadow=true;o.frustumCulled=true;
   const m=o.material=o.material.clone(),n=m.name;
   if(n==="Fur"||n==="Shell"||n==="Scale"||n==="Flesh")m.color.setHex(c.cloth);else if(n==="Fur2"||n==="Shell2"||n==="Belly")m.color.setHex(c.pants);else if(n==="Skin"||n==="Face")m.color.setHex(c.skin);else if(n==="Cloth")m.color.setHex(c.cloth);else if(n==="Cloth2")m.color.setHex(c.pants);
   else if(n==="Hair")m.color.setHex(c.hair==null?c.skin:c.hair);else if(n==="Hat")m.color.setHex(c.hat||c.cloth);else if(n==="Armor")m.color.setHex(c.armor||0x8a8f98);
   m.roughness=Math.max(m.roughness,.55);if(n==='Skin'||n==='Face'||n==='Lip')skinSSS(m);if(n==='Sclera'||n==='Iris'||n==='Eye')m.roughness=.1;if(n==='Bone')m.roughness=.4;if(n==='Steel')m.roughness=.3;if(FURS[n]&&o.geometry.attributes.uv&&!c.ghost)furL.push([o,m,n]);
   if(n==="Face"&&o.geometry.attributes.uv){const ft=mkFace(c.face==null?2:c.face);m.map=ft;m.normalMap=ft.userData.n;m.normalScale.set(.9,-.9);m.roughnessMap=ft.userData.r;m.roughness=1;m.needsUpdate=true}
   if(o.geometry.attributes.uv&&MK[n]){const tx=mkTex(MK[n]);m.map=tx;if(tx.userData&&tx.userData.n){m.normalMap=tx.userData.n;m.normalScale.set(.8,-.8);m.roughnessMap=tx.userData.r;m.roughness=1}m.needsUpdate=true}
   if(n==="Lip"){const lc=new THREE.Color(c.skin).lerp(new THREE.Color(0xa04a48),.4);m.color.copy(lc)}
   if(n==="Iris"&&!c.eye)m.color.setHex(c.iris||0x3a5a7a);
   if(c.eye&&(n==="Iris"||n==="Sclera"||n==="Eye")){const pu=!c.rig&&n==="Eye";m.color.setHex(pu?0x050000:c.eye);if(!pu){m.emissive.setHex(c.eye);m.emissiveIntensity=(n==="Iris"||c.rig)?2.2:1.1}glowEye=true;return}
   if(c.ghost){m.transparent=true;m.opacity=.62;m.depthWrite=false;m.emissive.setHex(c.glow||0x6a9aff);m.emissiveIntensity=.55}
   if(n!=="Orb")mats.push(m);else{m.emissiveIntensity=1.3}});
  const shells=[];furL.forEach(([o,m,n])=>{if(!o.parent)return;const [N,len,dens]=FURS[n];if(n==="Hair"&&c.hair==null)return;for(let i=0;i<N;i++){const sm=new THREE.SkinnedMesh(o.geometry,shellMat(m,i,N,len,dens));sm.bind(o.skeleton,o.bindMatrix);sm.position.copy(o.position);sm.quaternion.copy(o.quaternion);sm.scale.copy(o.scale);sm.castShadow=false;sm.receiveShadow=false;sm.frustumCulled=o.frustumCulled;o.parent.add(sm);shells.push(sm);mats.push(sm.material)}});
  root.rotation.y=Math.PI;if(c.hunch)root.rotation.x=c.hunch;               // model faces -Z; game "front" is +Z
  const g=new THREE.Group();g.add(root);const s=c.s||1.05,w=c.w||1;g.scale.set(s*w,s,s*w);
  const mixer=new THREE.AnimationMixer(root),acts={};
  GL.animations.forEach(a=>{acts[a.name]=mixer.clipAction(a)});
  ["attack","cast","hit","die"].forEach(n=>{const a=acts[n];if(a){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}});
  const F={g,root,mixer,acts,mats,meshes,sh:true,base:c.rig?SPD[c.rig][0]:1.9,spd:c.rig?SPD[c.rig][1]:1.9,cur:"",one:0,dead:false,
   play(n,ts){const a=acts[n];if(!a||this.dead)return;if(n===this.cur&&(n==="idle"||n==="walk")){a.setEffectiveTimeScale(ts||1);return}
    const prev=acts[this.cur];a.reset().setEffectiveTimeScale(ts||1).setEffectiveWeight(1);if(prev&&prev!==a)prev.crossFadeTo(a,.18,false);a.play();
    if(n==="idle"||n==="walk")a.time=Math.random()*a.getClip().duration;
    this.cur=n;this.one=(n==="idle"||n==="walk")?0:a.getClip().duration/(ts||1);if(n==="die")this.dead=true},
   update(dt){if(this.hold)return;mixer.update(dt);if(shells.length){this._st=(this._st||0)-dt;if(this._st<=0){this._st=.4;const d=camera.position.distanceTo(this.g.getWorldPosition(_v3)),on=d<(this.shD||22);if(on!==this._son){this._son=on;shells.forEach(q=>q.visible=on)}}}if(this.one>0){this.one-=dt;if(this.one<=0&&this.cur!=="die"){const p=this.cur;this.cur="";this.play("idle")}}}};
  if(c.float)g.userData.float=true;if(c.far)g.userData.far=true;F.eye=c.eye||0;F.shells=shells;F.shD=shells.length&&shells[0].material.customProgramCacheKey()==='shellH'?10:24;g.userData.fig=F;g.userData.mats=mats;ALL.add(F);F.play("idle");return F}
 /* ---------- villagers ---------- */
 const ROBED=["Priest","Witch","Hermit","Magus","Alchemist","Astrologer","Oracle","Gnostic","Fortune-teller","Nomad"];
 function npcCfg(n,col){
  const j=n.job,sd=n.seed||1,c=new THREE.Color(col).getHex();
  const cf={iris:[0x3a5a7a,0x4a3220,0x3a6a3a,0x6a5a3a][Math.floor(rs(sd,7)*4)],skin:SKIN[Math.floor(rs(sd,1)*SKIN.length)],cloth:c,pants:dark(c,.55),hair:HAIR[Math.floor(rs(sd,2)*HAIR.length)],hat:dark(c,.8),acc:[],s:.98+rs(sd,3)*.12,w:.95+rs(sd,4)*.14};
  cf.face=/Hermit|Old soldier|Priest|Oracle|Magus|Gnostic|Dwarf/.test(j)?3:Math.floor(rs(sd,9)*3);
  const A=cf.acc;
  const FEM=/Witch|Herbalist|Fortune-teller|Oracle|Nymph/.test(j),MAL=/Hermit|Old soldier|Dwarf|Ferryman|Hunter|Magus|Priest|Gnostic/.test(j);
  cf.g=FEM?"f":MAL?"m":(rs(sd,11)>.5?"f":"m");cf.fseed=Math.floor(sd*1000)%99991+1;cf.outfit=/Hunter|Old soldier|Ferryman/.test(j)?"ranger":"peasant";cf.formal=/Priest|Merchant|Scholar|Magus|Alchemist|Astrologer|Oracle|Innkeeper/.test(j);
  cf.hairStyle=cf.g==="f"?["long","buns","simple","buzzedf","long"][Math.floor(rs(sd,12)*5)]:["simple","buzzed","simple","long","simple"][Math.floor(rs(sd,12)*5)];
  if(cf.g==="m"&&(cf.face>=2&&rs(sd,13)>.35||/Hermit|Old soldier|Dwarf|Magus|Priest/.test(j)))cf.beard=true;
  if(rs(sd,14)>.88)cf.freck=40;
  if(rs(sd,8)>.62&&cf.g==="f")A.push("Hair_long");
  if(false&&rs(sd,8)>.62&&!/Hermit|Old soldier|Dwarf miner/.test(j))A.push("Hair_long");
  if(ROBED.includes(j)){A.push("Robe");cf.pants=dark(c,.8)}
  if(j==="Witch"){A.push("Hat_cone");cf.hat=0x3a2a4a;cf.skin=0xb8c8a0}
  else if(j==="Priest"){cf.hair=0xd0d0d0}
  else if(j==="Hermit"){A.push("Hood","Beard");cf.hair=0xbdbdbd;A.push("Staff")}
  else if(j==="Nomad"){A.push("Turban");cf.hat=dark(c,.9)}
  else if(j==="Old soldier"){A.push("Helm","Armor","Sword");cf.armor=0x77808a}
  else if(j==="Farmer"){A.push("Hat_wide");cf.hat=0xd8c070}
  else if(j==="Merchant"){A.push("Cap");cf.hat=0xc04030}
  else if(j==="Bard"){A.push("Cap");cf.hat=0xd86a8a}
  else if(j==="Hunter"){A.push("Cap","Dagger");cf.hat=0x4a5a2a}
  else if(j==="Ferryman"){A.push("Cap","Staff");cf.hat=0x2a4a5a}
  else if(j==="Dwarf miner"){A.push("Helm","Beard","Axe");cf.s=.74;cf.w=1.2;cf.armor=0x8a7a6a;cf.hair=0x6a3a1a}
  else if(j==="Scholar"){A.push("Cap");cf.hat=0x2a3a6a}
  else if(j==="Innkeeper"){cf.w*=1.1}
  else if(j==="Herbalist"){A.push("Hood")}
  else if(rs(sd,5)>.6)A.push("Cap");
  /* individual variety: every villager gets their own cloth tone, trousers, boots and a few bits of gear */
  try{const hs=new THREE.Color(c),hh={};hs.getHSL(hh);const jt=(k,a)=>(rs(sd,k)-.5)*a;const cc=new THREE.Color().setHSL((hh.h+jt(21,.07)+1)%1,Math.max(0,Math.min(1,hh.s*(.75+rs(sd,22)*.4))),Math.max(.05,Math.min(.9,hh.l*(.8+rs(sd,23)*.4))));
   cf.cloth=cc.getHex();cf.pants=rs(sd,24)>.45?[0x4a3a2a,0x3a3a44,0x5a4a32,0x2e3a2e,0x6a5a46,0x3a2e3e][Math.floor(rs(sd,25)*6)]:dark(cf.cloth,.55);
   cf.boots=[0x3a2414,0x5a3a20,0x2a1a10,0x6a4a2a,0x4a3a2a][Math.floor(rs(sd,26)*5)];
   const PAL=[0x8a2a2a,0x2a4a7a,0x3a6a3a,0xc8a040,0x5a3a6a,0x8a8a7a,0xa05a2a],pick=k=>PAL[Math.floor(rs(sd,k)*PAL.length)],G={},robed=ROBED.includes(j);
   if(!robed){if(rs(sd,31)>.3)G.belt=[0x4a3220,0x3a2616,0x5a3a20][Math.floor(rs(sd,32)*3)];
    if(/Innkeeper|Herbalist|Alchemist/.test(j)||/Farmer|Merchant/.test(j)&&rs(sd,33)>.5)G.apron=[0xd8cfb8,0xb8a888,0xa8b098,0x9a8a78][Math.floor(rs(sd,34)*4)];
    if(/Merchant|Bard|Scholar|Hunter|Herbalist|Ferryman/.test(j)||rs(sd,35)>.82)G.satchel=[0x5a3a20,0x6a4a2a,0x4a3220][Math.floor(rs(sd,36)*3)];
    if(/Ferryman|Nomad|Hermit|Dwarf miner/.test(j)||/Farmer|Hunter/.test(j)&&rs(sd,37)>.55||rs(sd,38)>.9){G.pack=[0x6a5a3a,0x5a4a2a,0x4a5a3a][Math.floor(rs(sd,39)*3)];G.roll=pick(40);delete G.satchel}
    if(/Hunter|Ferryman|Merchant|Bard/.test(j)&&rs(sd,41)>.35||rs(sd,42)>.72)G.scarf=pick(43)}
   else if(/Priest|Herbalist|Hermit/.test(j)&&rs(sd,44)>.5)G.scarf=pick(43);
   if(/Hermit|Hunter|Ferryman|Nomad|Old soldier|Witch|Magus|Oracle|Herbalist/.test(j)&&rs(sd,50)>.25||rs(sd,51)>.86){G.cloak=[0x3a4a3a,0x4a3a2a,0x2a3a5a,0x5a2a2a,0x3a3a3a,0x4a4a2a][Math.floor(rs(sd,52)*6)];delete G.pack;delete G.apron}
   if(Object.keys(G).length)cf.gear=G}catch(e){}
  return cf}
 window.__fig=figure;window.__ALL=ALL;window.__HUMR=HUM;window.__attachBind=attachBind;window.__boneOf=boneOf;window.__HUM=HUM;window.__hclear=()=>{for(const o of[CMATS,SMATS,HAIRMAT])for(const k in o)delete o[k]};
 const NST=new Map();
 function attachNpc(g,n){
  const F=figure(npcCfg(n,(typeof JOBS!=="undefined"&&JOBS[n.job]?JOBS[n.job].col:"#999999")));
  g.children.slice().forEach(ch=>{if(ch!==g.userData.l)ch.visible=false});
  g.add(F.g);try{if(window.AGE)AGE.npc(F.g,n.seed||1)}catch(e){}
  const s={F,hx:g.position.x,hz:g.position.z,mode:"idle",wait:rs(n.seed||1,6)*6,tx:0,tz:0,hd:g.rotation.y};NST.set(n.id,s);F.g.userData.npc=1}
 const _bn=buildNpc;
 buildNpc=function(n){const g=_bn(n);if(PG)attachNpc(g,n);else waiting.push(()=>attachNpc(g,n));return g};
 function angTo(a,b){let d=b-a;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;return d}
 function npcUpdate(dt){
  if(typeof NPCS==="undefined"||typeof npcMeshes==="undefined")return;
  const idle=!!(C||D||packOpen||occOpen)||DG;
  NPCS.forEach(n=>{const s=NST.get(n.id),g=npcMeshes[n.id];if(!s||!g)return;
   const dx=P.x-g.position.x,dz=P.z-g.position.z,dd=Math.hypot(dx,dz);
   s.F.g.visible=!DG&&dd<50;if(DG||dd>50)return;
   const wantSh=dd<26;if(wantSh!==s.F.sh){s.F.sh=wantSh;s.F.meshes.forEach(m=>m.castShadow=wantSh)}
   let spd=0;
   if(dd<3.8||idle){ // greet: stop and face the player
    s.mode="idle";s.wait=Math.max(s.wait,1.5);if(dd<9)s.hd+=angTo(s.hd,Math.atan2(dx,dz))*Math.min(1,dt*4)}
   else if(s.mode==="idle"){s.wait-=dt;if(s.wait<=0){const a=Math.random()*6.283,r=.8+Math.random()*2.4,tx=s.hx+Math.cos(a)*r,tz=s.hz+Math.sin(a)*r;
     if(!tileSolid(Math.floor(tx/TW),Math.floor(tz/TW))&&hfn(tx,tz)>-.25&&Math.abs(hfn(tx,tz)-hfn(g.position.x,g.position.z))<.6){s.tx=tx;s.tz=tz;s.mode="walk"}else s.wait=1+Math.random()*2}}
   else if(s.mode==="walk"){const ex=s.tx-g.position.x,ez=s.tz-g.position.z,ed=Math.hypot(ex,ez);
     if(ed<.18){s.mode="idle";s.wait=3+Math.random()*7}
     else{spd=.85;const nx=g.position.x+ex/ed*spd*dt,nz=g.position.z+ez/ed*spd*dt;
      if(tileSolid(Math.floor(nx/TW),Math.floor(nz/TW))||Math.hypot(nx-P.x,nz-P.z)<1.3){s.mode="idle";s.wait=2;spd=0}
      else{g.position.x=nx;g.position.z=nz;s.hd+=angTo(s.hd,Math.atan2(ex,ez))*Math.min(1,dt*6)}}}
   g.rotation.y=s.hd;n.x=(g.position.x-1)/TW;n.y=(g.position.z-1)/TW;
   if(spd>0)s.F.play("walk",spd/s.F.base);else s.F.play(dd<3.8&&!idle&&s.F.acts.talk?"talk":"idle");
   s.acc=(s.acc||0)+dt;if(dd<28||s.acc>.12){s.F.update(s.acc);s.acc=0}})}
 /* ---------- monsters ---------- */
 const MC=[
  [/Archon/,{s:1.75,skin:0xe8d890,cloth:0x6a5418,pants:0x4a3a10,hair:0xf4ecc8,acc:["Robe","Halo","Horns","Claws","Staff"],float:1,eye:0xfff4b0}],
  [/Bael/,{s:1.95,w:1.2,skin:0xa02030,cloth:0x4a0e18,pants:0x2a0810,hair:null,acc:["Horns_big","Crown","Robe","Sword","Fangs","Claws","Spikes"],eye:0xffd040}],
  [/Scorpion/,{rig:"scorpion",s:1.3,cloth:0x8a4a1a,pants:0x4a2a10,eye:0xff2a10}],
  [/Hydra/,{rig:"hydra",far:1,s:1.15,cloth:0x2a6a42,pants:0x8a8a40,eye:0xffd020}],
  [/Beholder/,{rig:"beholder",far:1,s:1.0,cloth:0x4a1a30,eye:0xff3010}],
  [/Frost Wolf/,{rig:"beast",s:1.4,cloth:0xcfd8e2,pants:0xf0f4f8,eye:0x60c8ff}],
  [/Wolf/,{rig:"beast",s:1.25,cloth:0x4a463f,pants:0x8a8272,eye:0xff8a10}],
  [/Bog Wraith/,{s:1.2,skin:0xa8d0a0,cloth:0x2a4a34,pants:0x1a3a24,hair:null,acc:["Robe","Hood","Fangs","Claws"],ghost:1,float:1,glow:0x4aff8a,eye:0x9affc0}],
  [/Wraith|Shade|Shadow/,{s:1.2,skin:0xaecbe0,cloth:0x3a4a6a,pants:0x2a3a5a,hair:null,acc:["Robe","Hood","Fangs","Claws"],ghost:1,float:1,glow:0x6a9aff,eye:0xb0d8ff}],
  [/Bog Imp/,{build:"qimp",qv:2,s:.62,skin:0x4a6a3a,cloth:0x2a3a22,pants:0x1a2a14,hair:null,acc:["Horns_big","Ears_pointed","Fangs","Claws"],eye:0xc0ff40}],
  [/Goblin Archer/,{build:"qpug",qv:2,s:.66,skin:0x6a7a30,cloth:0x3a4a22,pants:0x2a2a12,hair:null,hat:0x3a4a12,acc:["Ears_pointed","Cap","Fangs","Claws"],eye:0xffe040}],
  [/Imp/,{build:"qimp",qv:1,s:.58,skin:0x7a3a5a,cloth:0x3a1a2a,pants:0x2a1020,hair:null,acc:["Horns_big","Ears_pointed","Fangs","Claws","Scar"],eye:0xffe040}],
  [/Goblin/,{build:"qpug",qv:0,s:.68,skin:0x5a8a30,cloth:0x4a3a22,pants:0x2a1e12,hair:null,hat:0x5a2a12,acc:["Ears_pointed","Cap","Club","Fangs","Claws","Scar"],eye:0xffd020}],
  [/Orc Raider/,{s:1.18,w:1.18,skin:0x3f6a2e,cloth:0x4a2a20,pants:0x2a1e18,hair:0x0a0a0a,acc:["Tusks","Axe","Scar","Claws","Spikes"],eye:0xff3a10}],
  [/Orc/,{s:1.2,w:1.2,skin:0x3f6a2e,cloth:0x2a2a30,pants:0x1a1a1e,hair:null,armor:0x4a4a54,acc:["Tusks","Helm","Armor","Axe","Spikes","Claws"],eye:0xff3a10}],
  [/Dark Magician/,{s:1.06,skin:0xb8a8c4,cloth:0x2a1445,pants:0x1a0c30,hair:0x0a0a0a,hat:0x1a0c30,acc:["Robe","Hat_cone","Beard","Staff","Scar"],eye:0xb060ff}],
  [/Bandit Rogue/,{s:1.02,skin:0xb08a68,cloth:0x2a2a2a,pants:0x1a1a1a,hair:0x1a1008,acc:["Hood","Dagger","Scar"],eye:0xff9030}],
  [/Bandit/,{s:1.06,skin:0xb08a68,cloth:0x6a4a28,pants:0x3a2a1a,hair:0x2a1a0e,hat:0x4a2a12,acc:["Cap","Sword","Scar"],eye:0xff9030}],
  [/Renegade Dwarf/,{s:.78,w:1.28,skin:0xc08a6a,cloth:0x80522e,pants:0x3a2412,hair:0x8a3a14,armor:0x6a5a4a,acc:["Helm","Beard","Axe","Armor","Scar"],eye:0xff5020}],
  [/Fallen Paladin/,{s:1.16,skin:0xb89a7e,cloth:0x30303c,pants:0x1c1c24,hair:0x0a0a0a,armor:0x4a4a58,acc:["Helm","Armor","Sword","Shield","Spikes"],eye:0xff2a18}],
  [/Lizardfolk/,{s:1.02,skin:0x4a7a3a,cloth:0x3a5a2a,pants:0x2a4a1e,hair:null,acc:["Club","Fangs","Claws","Scar"],eye:0xffe820}],
  [/Stone Giant/,{s:2.4,w:1.2,skin:0x786e60,cloth:0x4a443a,pants:0x3a342a,hair:0x3a342a,acc:["Club","Tusks","Scar","Claws"],eye:0xff5a20}],
  [/Hill Giant/,{s:2.2,w:1.25,skin:0x9a7a5a,cloth:0x5a4a2a,pants:0x3a2a1a,hair:0x4a2a10,acc:["Club","Tusks","Scar","Claws"],eye:0xff5a20}],
  [/Mummy/,{s:1.06,skin:0xc8c0a0,cloth:0xb8ae88,pants:0xb8ae88,hair:null,acc:["Claws","Scar"],eye:0x80ffb0}],
  [/Yeti/,{s:1.65,w:1.32,skin:0xe4eaf0,cloth:0xd8e2ea,pants:0xd0dce6,hair:0xf4f8ff,acc:["Fangs","Claws","Tusks"],eye:0x70c8ff}],
  [/Nymph/,{s:1.0,skin:0xbfe8dc,cloth:0x4aa090,pants:0x3a8a7a,hair:0x1a7a6a,acc:["Robe","Hair_long","Ears_pointed"],eye:0x80ffe0}],
  [/Frost Demon/,{s:1.35,w:1.12,skin:0x4a88c0,cloth:0x1a3858,pants:0x102840,hair:null,acc:["Horns_big","Ears_pointed","Fangs","Claws","Spikes"],eye:0xa0e8ff}],
  [/Dust Demon/,{s:1.35,w:1.12,skin:0xa0401e,cloth:0x4a1a0e,pants:0x2a0e08,hair:null,acc:["Horns_big","Ears_pointed","Fangs","Claws","Spikes"],eye:0xff7020}]
 ];
 const HM=[
  [/Archon/,{outfit:"peasant",g:"m",formal:1,hairStyle:"long",face:3}],
  [/Bael/,{outfit:"bare",hairStyle:null,face:2,beard:0,barefoot:1}],
  [/Bog Wraith|Wraith|Shade|Shadow/,{outfit:"peasant",g:"m",formal:1}],
  [/Imp/,{outfit:"bare",barefoot:1,hairStyle:null,face:2}],
  [/Goblin/,{outfit:"bare",hairStyle:null,face:2}],
  [/Orc Raider/,{outfit:"bare",hairStyle:"buzzed",face:2,beard:0}],
  [/Orc/,{outfit:"ranger",pauldrons:1,hairStyle:null,face:2}],
  [/Dark Magician/,{outfit:"peasant",formal:1,hairStyle:"long",beard:1,face:3}],
  [/Bandit Rogue/,{outfit:"ranger",hairStyle:"buzzed",face:1}],
  [/Bandit/,{outfit:"ranger",hairStyle:"simple",face:1,beard:1}],
  [/Renegade Dwarf/,{outfit:"peasant",pauldrons:1,hairStyle:"buzzed",face:2,beard:1}],
  [/Fallen Paladin/,{outfit:"ranger",pauldrons:1,hairStyle:"simple",face:2}],
  [/Lizardfolk/,{outfit:"bare",hairStyle:null,face:2}],
  [/Stone Giant|Hill Giant/,{outfit:"bare",hairStyle:"long",face:3,beard:1}],
  [/Mummy/,{outfit:"peasant",hairStyle:null,face:3}],
  [/Yeti/,{outfit:"bare",barefoot:1,hairStyle:"long",face:2,beard:1}],
  [/Nymph/,{outfit:"peasant",g:"f",hairStyle:"long",face:0}],
  [/Demon/,{outfit:"bare",barefoot:1,hairStyle:null,face:2}]];
 MC.forEach(([rx,c],i)=>{if(c.rig)return;c.g=c.g||"m";c.fseed=c.fseed||(i*37+11);for(const[r,d]of HM)if(r.test(rx.source)){Object.keys(d).forEach(k=>{if(c[k]===undefined)c[k]=d[k]});break}});
 MC.forEach(([rx,c])=>{if(!c.rig&&!c.ghost&&c.hunch===undefined)c.hunch=/Nymph|Paladin|Dark Magician/.test(rx.source)?.04:.15});
 window.__MC=MC;
 const mcFor=name=>{for(const[r,c]of MC)if(r.test(name))return(c.rig&&!RG[c.rig])?null:c;return null};
 const _mf=makeFoe;
 makeFoe=function(name,col,boss){const c=PG&&mcFor(name);if(!c||(c.rig&&!RG[c.rig]))return _mf(name,col,boss);
  const F=figure(c);if(boss)F.g.scale.multiplyScalar(1.35);return F.g};
 const _sp=fx3.spawn;fx3.spawn=function(f){_sp.call(this,f);const F=this.g&&this.g.userData.fig;if(F){F.play("idle");if(F.eye)this.lc=F.eye;
  try{if(this.g.scale.y<1.7&&!this.g.userData.far&&this.base){const dx=camera.position.x-this.base.x,dz=camera.position.z-this.base.z,d=Math.hypot(dx,dz),mv=Math.min(1.3,Math.max(0,d-2.8));
   if(mv>0){const nx=this.base.x+dx/d*mv,nz=this.base.z+dz/d*mv;if(DG||!tileSolid(Math.floor(nx/TW),Math.floor(nz/TW))){this.base.x=nx;this.base.z=nz;if(!DG)this.base.y=Math.max(hfn(nx,nz),-.3);this.g.position.copy(this.base)}}}}catch(e){}}};
 const _stk=fx3.strike;fx3.strike=function(){_stk.call(this);const F=this.g&&this.g.userData.fig;if(F&&this.dieT<0)F.play("attack",2.1)};
 const _ht=fx3.hit;fx3.hit=function(n){_ht.call(this,n);const F=this.g&&this.g.userData.fig;if(F&&this.dieT<0&&F.cur!=="attack")F.play("hit",1.5)};
 const _dy=fx3.die;fx3.die=function(){_dy.call(this);const F=this.g&&this.g.userData.fig;if(F)F.play("die",1.1)};
 const _cl=fx3.clear;fx3.clear=function(){const F=this.g&&this.g.userData.fig;if(F)ALL.delete(F);_cl.call(this)};
 const _rc3=rc;rc=function(){_rc3.apply(this,arguments);try{const mp=document.getElementById("mport");if(mp&&fx3.g&&fx3.g.userData.fig)mp.classList.remove("on")}catch(e){}};
 /* roaming monsters in the overworld */
 const ROAM=[];window.__ROAM=ROAM;window.__ts=()=>trySpawn();let spT=2,cool=6;
 function safeTile(tx,ty){return Math.abs(tx-SX)+Math.abs(ty-SY)<6||POIS.some(p=>p.x===tx&&p.y===ty)}
 function removeRoamer(r){scene.remove(r.F.g);ALL.delete(r.F);const i=ROAM.indexOf(r);if(i>=0)ROAM.splice(i,1)}
 function trySpawn(){
  const maxN=(typeof qual!=="undefined"&&qual===0)?2:5;if(ROAM.length>=maxN)return;
  const ptx=Math.floor(P.x/TW),pty=Math.floor(P.z/TW);if(safeTile(ptx,pty))return;
  for(let k=0;k<24;k++){const a=Math.random()*6.283,d=18+Math.random()*10,x=P.x+Math.cos(a)*d,z=P.z+Math.sin(a)*d,tx=Math.floor(x/TW),ty=Math.floor(z/TW);
   if(tx<1||ty<1||tx>=W-1||ty>=H-1||!reach[ty*W+tx]||tileSolid(tx,ty)||safeTile(tx,ty)||(window.RT&&RT.safe(x,z))||hfn(x,z)<=-.25)continue;
   const t=tierAt(tx,ty),list=(FOES[biome[ty][tx]]||[]).filter(f=>f[8]<=t&&mcFor(f[0]));if(!list.length)continue;
   const f=list[Math.floor(Math.random()*list.length)];mkRoamer(f,t,x,z);packExtra(f,t,x,z);return}}
 function mkRoamer(f,t,x,z){
   const cf=mcFor(f[0]),F=figure(cf);
   try{if(window.AGE)AGE.foe(F.g,f[0])}catch(e){}F.g.position.set(x,hfn(x,z),z);F.g.rotation.y=Math.random()*6.283;scene.add(F.g);
   let lb=null;try{lb=label(f[0]);lb.position.y=2.3/(F.g.scale.y);lb.scale.multiplyScalar(1/F.g.scale.y);lb.visible=false;F.g.add(lb)}catch(e){lb=null}
   ROAM.push({F,f,t,lb,mode:"wander",wait:Math.random()*3,tx:x,tz:z,hd:F.g.rotation.y})}
 window.__mkRoamer=(f,t,x,z)=>mkRoamer(f,t,x,z);
 /* packs: monsters often arrive in groups, bigger as the hero levels */
 function packExtra(f,t,x,z){
  if(typeof qual!=="undefined"&&qual===0)return;
  const lv=(hero&&hero.level)||1,cap=Math.min(3,1+Math.floor(lv/3));
  let n=Math.random()<.55?1+Math.floor(Math.random()*cap):0;
  if(/Dragon|Archon|Bael|Giant|Hydra|Beholder|Ophan|Seraph|Argus|Demon|Asura/.test(f[0]))n=Math.min(n,Math.random()<.6?0:1);
  for(let i=0;i<n;i++){const a=Math.random()*6.283,d=2+Math.random()*2.6,xx=x+Math.cos(a)*d,zz=z+Math.sin(a)*d;
   if(tileSolid(Math.floor(xx/TW),Math.floor(zz/TW))||hfn(xx,zz)<=-.25)continue;mkRoamer(f,t,xx,zz)}}
 function roamUpdate(dt){
  if(!hero||typeof FOES==="undefined")return;
  ROAM.forEach(r=>{r.F.g.visible=!DG});if(DG)return;
  const busy=!!((C&&!C.rt)||D||packOpen||occOpen);cool-=dt;
  if(!busy){spT-=dt;if(spT<=0){spT=2.5*(window.OMEN?OMEN.m("spawn"):1);trySpawn()}}
  for(let i=ROAM.length-1;i>=0;i--){const r=ROAM[i],g=r.F.g,dx=P.x-g.position.x,dz=P.z-g.position.z,dd=Math.hypot(dx,dz);
   if(dd>56){removeRoamer(r);continue}
   if(r.dead){r.F.update(dt);r.dtm=(r.dtm||0)+dt;if(r.dtm>3.4)removeRoamer(r);continue}
   if(r.mob&&C&&C.rt){r.F.update(dt);if(r.lb)r.lb.visible=dd<13;continue}
   if(r.lb)r.lb.visible=dd<13;
   const lookD=(-Math.sin(yaw)*(-dx)-Math.cos(yaw)*(-dz))/(dd||1),watched=lookD>.72&&dd>6;r.F.hold=false;
   let spd=0;
   if(!busy){
    const safe=safeTile(Math.floor(P.x/TW),Math.floor(P.z/TW));
    if(dd<28&&!safe&&!(window.RT&&RT.safe(P.x,P.z)))r.mode="chase";else if(r.mode==="chase"&&(dd>38||safe))r.mode="wander";
    if(r.mode==="chase"){spd=r.F.spd*1.3;if(watched&&dd>7&&!r.F.dead){spd=0;r.F.hold=true;r.wasHeld=1}r.offT=(r.offT||0)-dt;if(r.offT<=0)r.off=0;r.hd+=angTo(r.hd,Math.atan2(dx,dz)+(r.off||0))*Math.min(1,dt*5);
     if(C&&dd<5.5)spd=0;if(dd<8.5&&cool<=0&&!C&&!D){const f=r.f,t=r.t,at={x:g.position.x,z:g.position.z};removeRoamer(r);cool=3;startCombat(f,t,null,{at});if(C&&C.e&&r.hp!=null)C.e.hp=Math.max(1,Math.min(C.e.hp,r.hp));continue}}
    else{
     if(r.mode==="wander"){r.wait-=dt;if(r.wait<=0){r.mode="go";const a=Math.random()*6.283,d=3+Math.random()*6;r.tx=g.position.x+Math.cos(a)*d;r.tz=g.position.z+Math.sin(a)*d;r.t0=8}}
     else if(r.mode==="go"){const ex=r.tx-g.position.x,ez=r.tz-g.position.z,ed=Math.hypot(ex,ez);r.t0-=dt;
      if(ed<.3||r.t0<=0){r.mode="wander";r.wait=2+Math.random()*4}else{spd=.8;r.hd+=angTo(r.hd,Math.atan2(ex,ez))*Math.min(1,dt*4)}}}
    if(spd>0){const nx=g.position.x+Math.sin(r.hd)*spd*dt,nz=g.position.z+Math.cos(r.hd)*spd*dt;
     if(tileSolid(Math.floor(nx/TW),Math.floor(nz/TW))||hfn(nx,nz)<-.3||(window.RT&&RT.safe(nx,nz))){if(r.mode==="chase"){r.off=(r.off>0?-1:1)*(1.0+Math.random()*.6);r.offT=1.3}else{r.mode="wander";r.wait=2}spd=0}
     else{g.position.x=nx;g.position.z=nz}}
    g.position.y=hfn(g.position.x,g.position.z)+(g.userData.float?.45+Math.sin(clock*2+r.hd)*.1:0);g.rotation.y=r.hd}
   if(spd>0){if(r.F.hum&&spd>2)r.F.play("run",spd/r.F.runBase);else r.F.play("walk",spd/r.F.base)}else r.F.play("idle");
   r.F.update(dt)}}
 /* fewer random ambush fights now that monsters roam the land */
 const _me=maybeEncounter;
 maybeEncounter=function(){hero.steps++;
  if(hero.steps%6===0&&hero.mana<maxMP())hero.mana++;if(hero.steps%10===0&&hero.hp<maxHP())hero.hp++;
  if(Math.abs(hx-SX)+Math.abs(hy-SY)<6||POIS.some(p=>p.x===hx&&p.y===hy))return;
  if(Math.random()>.025)return;
  const t=tierAt(hx,hy),list=FOES[biome[hy][hx]].filter(f=>f[8]<=t);startCombat(pickOne(list),t)};
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!PG)return;npcUpdate(dt);roamUpdate(dt);
   ALL.forEach(F=>{if(F.g.userData.npc)return;if(!F.g.parent){ALL.delete(F);return}if(F.g.userData.fig&&F.g.parent===scene&&!ROAM.some(r=>r.F===F))F.update(dt)})}catch(e){if(!window.__ce){window.__ce=1;console.warn("chars3d",e)}}};
})();

/* ===== abominations: eyes, wheels, wings and extra arms made from Quaternius parts + procedural pieces ===== */
(function(){
 if(!window.__fig||!window.__ALL||!window.__MC)return;
 const T=THREE,ALL=window.__ALL,MC=window.__MC,HUMR=window.__HUMR;
 const ABOM=window.ABOM={};
 const M=(c,o)=>{o=o||{};return new T.MeshStandardMaterial({color:c,emissive:o.e||0,emissiveIntensity:o.ei||0,roughness:o.r==null?.6:o.r,metalness:o.m||0,side:o.side||0,skinning:!!o.sk,transparent:!!o.tr,opacity:o.op==null?1:o.op})};
 let GT=null;function glowTex(){if(GT)return GT;const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d"),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.4,"rgba(255,255,255,.35)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,64,64);return GT=new T.CanvasTexture(c)}
 function glow(col,sz){const s=new T.Sprite(new T.SpriteMaterial({map:glowTex(),color:col,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:false}));s.scale.set(sz,sz,1);return s}
 /* an eye that watches the player and blinks */
 const LIDM=M(0xcdb09a,{e:0x301010,ei:.25,r:.7,side:2});
 const cv=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
 let SCT=null;const IRT={};
 function scleraTex(){if(SCT)return SCT;const c=cv(256,128),g=c.getContext("2d");g.fillStyle="#e8e0cc";g.fillRect(0,0,256,128);
  for(let i=0;i<70;i++){let x=Math.random()*256,y=Math.random()*128;g.strokeStyle="rgba("+(120+Math.random()*60|0)+",15,15,"+(.25+Math.random()*.4)+")";g.lineWidth=.6+Math.random()*1.1;g.beginPath();g.moveTo(x,y);for(let k=0;k<7;k++){x+=(Math.random()-.3)*14;y+=(Math.random()-.5)*8;g.lineTo(x,y)}g.stroke()}
  const gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,"rgba(90,40,30,.35)");gr.addColorStop(.3,"rgba(0,0,0,0)");gr.addColorStop(.7,"rgba(0,0,0,0)");gr.addColorStop(1,"rgba(90,40,30,.35)");g.fillStyle=gr;g.fillRect(0,0,256,128);
  return SCT=new T.CanvasTexture(c)}
 function irisTex(col){if(IRT[col])return IRT[col];const c=cv(128,64),g=c.getContext("2d"),r=(col>>16)&255,gg=(col>>8)&255,b=col&255;
  const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,"rgb(10,6,4)");gr.addColorStop(.14,"rgb("+(r*.45|0)+","+(gg*.45|0)+","+(b*.45|0)+")");gr.addColorStop(.4,"rgb("+r+","+gg+","+b+")");gr.addColorStop(.7,"rgb("+(r*.6|0)+","+(gg*.6|0)+","+(b*.6|0)+")");gr.addColorStop(.85,"rgb(12,6,4)");gr.addColorStop(1,"rgb(12,6,4)");g.fillStyle=gr;g.fillRect(0,0,128,64);
  for(let i=0;i<150;i++){const x=Math.random()*128,l=10+Math.random()*28,y0=6+Math.random()*14,light=Math.random()<.5;g.strokeStyle=light?"rgba(255,255,255,"+(.08+Math.random()*.18)+")":"rgba(0,0,0,"+(.15+Math.random()*.25)+")";g.lineWidth=1+Math.random()*1.6;g.beginPath();g.moveTo(x,y0);g.lineTo(x+(Math.random()-.5)*3,y0+l);g.stroke()}
  const t=new T.CanvasTexture(c);t.wrapS=T.RepeatWrapping;return IRT[col]=t}
 const SCL=M(0xffffff,{e:0x2a2418,ei:.35,r:.12}),PUP=M(0x030202,{r:.15}),GLINT=new T.MeshBasicMaterial({color:0xffffff,fog:false});
 try{SCL.map=scleraTex()}catch(e){}
 function eye(r,iris,reg,slit){
  const g=new T.Group(),sc=new T.Mesh(new T.SphereGeometry(r,14,10),SCL);g.add(sc);
  const im=M(0xffffff,{e:iris,ei:.8,r:.15});try{im.map=irisTex(iris)}catch(e){}const ig=new T.SphereGeometry(r*.66,16,10);ig.rotateX(Math.PI/2);const ir=new T.Mesh(ig,im);ir.scale.z=.45;ir.position.z=r*.62;g.add(ir);
  const pu=new T.Mesh(new T.SphereGeometry(r*.3,10,8),PUP);pu.scale.z=.4;pu.position.z=r*.93;if(slit){pu.scale.x=.28;pu.scale.y=1.7}g.add(pu);if(r>.05){const gl=new T.Mesh(new T.SphereGeometry(r*.13,6,5),GLINT);gl.position.set(-r*.3,r*.34,r*.93);gl.scale.z=.4;g.add(gl)}
  if(r>.08){const vm=M(0x8a1010,{e:0x500000,ei:.5,r:.5});const vr=new T.Mesh(new T.TorusGeometry(r*.8,r*.05,6,18),vm);vr.position.z=r*.35;g.add(vr)}g.userData.eye=1;g.userData.bt=Math.random()*5;g.userData.r=r;
  if(r>.05){const lm=LIDM,R=r*1.09,up=new T.Mesh(new T.SphereGeometry(R,12,8,0,Math.PI,0,Math.PI/2),lm),lo=new T.Mesh(new T.SphereGeometry(R,12,8,0,Math.PI,Math.PI/2,Math.PI/2),lm);
   g.add(up);g.add(lo);const d=g.userData;d.lu=up;d.ll=lo;d.open=.45+Math.random()*.8;d.cur=d.open;d.wan=Math.random()<.3?1:0;d.wt=Math.random()*3;d.wv=new T.Vector3();}
if(reg)reg.push(g);return g}
 function watch(eyes,dt,F){const cp=typeof camera!=="undefined"?camera.position:null;if(!cp)return;
  for(const e of eyes){const d=e.userData;
   if(d.wan){d.wt-=dt;if(d.wt<0){d.wt=.6+Math.random()*2.4;d.wv.set((Math.random()-.5)*6,(Math.random()-.5)*4,(Math.random()-.5)*6);d.wl=Math.random()<.5}}
   if(d.wan&&d.wl){const p=e.getWorldPosition(_tv).add(d.wv);e.lookAt(p)}else e.lookAt(cp);
   d.bt-=dt;let tgt=d.open;if(d.bt<0){if(d.bt<-.16){d.bt=1.4+Math.random()*4;if(Math.random()<.15)d.bt=.25}else tgt=0}
   if(d.lu){d.cur+=(tgt-d.cur)*Math.min(1,dt*(tgt<d.cur?30:12));d.lu.rotation.x=-d.cur*1.15;d.ll.rotation.x=d.cur*.7}
   else e.scale.y=tgt===0?.1:1}}
 const _tv=new T.Vector3();
 function baseF(g,o){
  const F={g,root:g,mixer:null,acts:{},mats:o.mats||[],meshes:[],sh:true,base:o.base||1.4,spd:o.spd||1.8,runBase:o.run||3,cur:"",one:0,dead:false,hum:true,eye:o.eye||0,shells:[],tick:[],t:0,atk:0,hitT:0,dieT:-1,eyes:o.eyes||[],
   play(n,ts){if(this.dead)return;this.cur=n;if(n==="attack")this.atk=.55;if(n==="hit")this.hitT=.3;if(n==="die"){this.dead=true;this.dieT=0}},
   update(dt){this.t+=dt;if(this.atk>0)this.atk-=dt;if(this.hitT>0)this.hitT-=dt;if(this.dieT>=0)this.dieT+=dt;for(const f of this.tick)f(dt,this);if(this.eyes.length)watch(this.eyes,dt,this)}};
  g.userData.fig=F;g.userData.mats=F.mats;if(o.float)g.userData.float=true;ALL.add(F);return F}
 const sk=F=>{let s=null;F.root.traverse(o=>{if(!s&&o.isSkinnedMesh)s=o.skeleton});return s};
 const bone=(s,n)=>s.bones.find(b=>b.name===n)||s.bones.find(b=>b.name.toLowerCase()===n.toLowerCase());
 function bindPos(s,b){const i=s.bones.indexOf(b),m=new T.Matrix4().copy(s.boneInverses[i]).invert();return new T.Vector3().setFromMatrixPosition(m)}
 const attach=(s,bn,obj)=>window.__attachBind(s,bn,obj);
 /* ---------------- OPHANIM: wheels within wheels, eyes on the rims ---------------- */
 ABOM.ophanim=function(c){
  const g=new T.Group(),eyes=[],mats=[],core=new T.Group();core.position.y=2.0;g.add(core);
  const bz=M(0x7a5018,{e:0xff9a30,ei:.55,r:.4,m:.8});mats.push(bz);
  const rings=[];[[1.5,22,.55],[1.12,16,-.8],[.78,11,1.1]].forEach(([R,n,sp],i)=>{
   const gim=new T.Group(),ring=new T.Group();gim.add(ring);
   ring.add(new T.Mesh(new T.TorusGeometry(R,.075,10,56),bz));
   for(let k=0;k<n;k++){const a=k/n*6.283,hu=k%3===1,e=eye(.17-i*.02,hu?[0x3a6a9a,0x5a3a1a,0x6a8a5a][(k+i)%3]:[0xffb020,0xff3010,0xffe070][i],eyes,!hu);e.position.set(Math.cos(a)*R,Math.sin(a)*R,0);ring.add(e)}
   gim.rotation.set(i*1.05,i*.7,i*.4);core.add(gim);rings.push({gim,ring,sp,ax:[.4+i*.15,.25+i*.2,.1]})});
  const cm=M(0xfff0c0,{e:0xffd070,ei:1.6,r:.3});mats.push(cm);const ball=new T.Mesh(new T.SphereGeometry(.34,18,14),cm);core.add(ball);
  const ce=eye(.3,0xff2008,eyes,true);ce.position.z=.22;core.add(ce);const gl=glow(0xffb040,3.2);core.add(gl);
  g.scale.setScalar(1.25);
  const F=baseF(g,{mats,eyes,float:1,base:1.2,spd:1.1,run:1.8,eye:0xffa020});F.ctrY=2.0;
  F.tick.push((dt,F)=>{const boost=1+F.atk*5;rings.forEach(r=>{r.ring.rotation.z+=r.sp*dt*boost;r.gim.rotation.x+=r.ax[0]*dt*boost;r.gim.rotation.y+=r.ax[1]*dt*boost});
   core.position.y=2.0+Math.sin(F.t*1.3)*.12;const k=F.dieT>=0?Math.max(0,1-F.dieT*.9):1;g.scale.setScalar(1.25*k);gl.scale.setScalar(3.2+F.atk*3+Math.sin(F.t*6)*.2);
   mats.forEach(m=>{m.emissiveIntensity=(m===cm?1.6:.55)+(F.hitT>0?1.4:0)})});
  return F};
 /* ---------------- SERAPH: six burning wings, a face of small eyes ---------------- */
 function wing(side,L,spread,eyesReg){
  const w=new T.Group(),fm=M(0xfff2cc,{e:0xffe39a,ei:.45,r:.5,side:2});
  const n=9;for(let i=0;i<n;i++){const len=L*(1-i*.055),f=new T.Mesh(new T.BoxGeometry(len,.012,.34-i*.02),fm);f.geometry.translate(len/2,0,0);f.rotation.z=-.35+i*(spread/n);f.rotation.y=i*.03;w.add(f)}
  for(let k=0;k<6;k++){const e=eye(.06,[0xfff060,0xff5030,0x4a78a8][k%3],eyesReg,k%3!==2);e.position.set(L*(.18+k*.14),.04,.03);w.add(e)}
  w.scale.x=side;return w}
 ABOM.seraph=function(c){
  const F0=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0xf0e6c4,cloth:0xf6eed0,pants:0xe8dcb0,hair:null,acc:["Robe","Halo"],float:1,s:1.9,face:3,eye:0xfff0a0,formal:1,fseed:5});
  const eyes=[],s=sk(F0),wings=[];
  F0.g.traverse(o=>{if(o.isSkinnedMesh){const n=(o.material&&o.material.name)||"";if(n==="Face"||n==="MI_Eyes"||/Hair/.test(n))o.visible=false}});
  const hd=new T.Group(),hm=M(0xf0e2bc,{e:0xffe8a0,ei:.25,r:.5});hd.add(new T.Mesh(new T.SphereGeometry(1,16,12),hm));hd.children[0].scale.set(.1,.128,.112);hd.position.set(0,1.64,.0);
  for(let k=0;k<3;k++){const e=eye(.034,k===1?0x4a78a8:0xfff070,eyes,k!==1);e.position.set(0,1.585+k*.055,.108);hd.add(e)}attach(s,"Head",hd);
  const root=bone(s,"spine_03")?"spine_03":(bone(s,"spine_02")?"spine_02":"pelvis");
  [[1.55,.0,.55,1.5],[1.45,.15,.2,1.3],[1.35,.0,-.35,1.1]].forEach(([y,zz,rz,L],i)=>{[-1,1].forEach(sd=>{const g=new T.Group(),w=wing(sd,L*1.0,1.05,eyes);g.add(w);g.position.set(sd*.1,y,-.16-i*.02);g.rotation.z=rz*sd;g.userData.base=rz*sd;g.userData.i=i;g.userData.sd=sd;attach(s,root,g);wings.push(g)})});
  const hl=glow(0xffe090,2.4);hl.position.set(0,1.62,-.05);attach(s,"Head",hl);
  F0.g.userData.float=true;F0.eyes=eyes;F0.tick=F0.tick||[];
  const upd=F0.update;F0.update=function(dt){upd.call(this,dt);this.t=(this.t||0)+dt;const k=1+(this.atk||0)*2;wings.forEach(w=>{const i=w.userData.i,sd=w.userData.sd;w.rotation.z=w.userData.base+sd*Math.sin(this.t*(1.4+i*.3)*k+i)*.28;w.rotation.y=sd*(.15+Math.sin(this.t*1.1+i)*.1)});watch(eyes,dt,this)};
  const pl=F0.play;F0.play=function(n,ts){pl.call(this,n,ts);if(n==="attack")this.atk=.6};
  return F0};
 /* ---------------- ARGUS: a body grown over with watching eyes ---------------- */
 ABOM.argus=function(c){
  const F=window.__fig({stut:1,limbs:{arm:1.5,neck:1.5},g:"m",outfit:"bare",skin:0xb4aca0,cloth:0x5a5048,pants:0x3a342e,hair:null,acc:["Claws"],s:2.1,w:1.1,face:3,eye:0xffe060,fseed:19,barefoot:1});
  const s=sk(F),eyes=[],rnd=(a,b)=>a+Math.random()*(b-a);
  const spec=[["spine_03",.2,12,1],["spine_02",.19,10,1],["spine_01",.18,8,1],["pelvis",.19,8,1],["Head",.11,8,1],["upperarm_l",.07,7,0],["upperarm_r",.07,7,0],["lowerarm_l",.055,6,0],["lowerarm_r",.055,6,0],["thigh_l",.11,8,0],["thigh_r",.11,8,0],["calf_l",.08,7,0],["calf_r",.08,7,0]];
  spec.forEach(([bn,rad,n,front])=>{const b=bone(s,bn);if(!b)return;const p0=bindPos(s,b);
   for(let i=0;i<n;i++){let d=new T.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).normalize();if(front&&d.z<0)d.z=-d.z;
    const e=eye(rnd(.02,.055),[0xffe060,0xff4020,0x80ff60,0xffffff][Math.floor(Math.random()*4)],eyes);e.position.copy(p0).addScaledVector(d,rad);attach(s,bn,e)}});
  F.eyes=eyes;const upd=F.update;F.update=function(dt){upd.call(this,dt);watch(eyes,dt,this)};
  return F};
 /* ---------------- ASURA: six arms, each with its own weapon ---------------- */
 ABOM.asura=function(c){
  const base={stut:1,limbs:{arm:1.35},voidEyes:0,g:"m",outfit:"peasant",skin:0x8a1c24,cloth:0x8a1c24,pants:0x2a0808,hair:null,s:2.0,w:1.15,face:2,eye:0xffd040,fseed:23,hunch:.1};
  const F=window.__fig(Object.assign({},base,{acc:["Horns_big","Crown","Fangs","Claws","Sword","Spikes"]}));
  const armsG=new Set();["m_peasant_arms"].forEach(n=>(HUMR.ms[n]||[]).forEach(x=>armsG.add(x.g)));
  const extra=[];
  [[.5,["Axe"]],[-.5,["Dagger"]]].forEach(([ry,acc],i)=>{
   const E=window.__fig(Object.assign({},base,{acc,s:1,w:1}));ALL.delete(E);
   E.g.traverse(o=>{if(o.isSkinnedMesh&&!armsG.has(o.geometry))o.visible=false;if(o.isMesh)o.castShadow=false});
   E.g.scale.set(1,1,1);E.g.position.set(0,0,0);E.g.rotation.y=ry;F.g.children[0].add(E.g);F.mats.push(...E.mats);extra.push(E)});
  /* the extra arms live inside the body root so they inherit its scale and lean */
  const pl=F.play,upd=F.update;
  F.play=function(n,ts){pl.call(this,n,ts);extra.forEach((E,i)=>{if(n==="attack")setTimeout(()=>{try{E.play("attack",(ts||1)*(.9+i*.15))}catch(e){}},i*140+60);else E.play(n,ts)})};
  F.update=function(dt){upd.call(this,dt);extra.forEach(E=>E.update(dt))};
  return F};

 /* ================= RELIGIOUS HORROR: the Chorus, the Tetramorph and the animal-headed priests ================= */
 const HY=1.63;
 function hideFace(F){F.g.traverse(o=>{if(o.isSkinnedMesh){const n=(o.material&&o.material.name)||"";if(n==="Face"||n==="MI_Eyes"||/Hair|Eyebrow|Beard/.test(n))o.visible=false}})}
 const sph=(r,sx,sy,sz,mat,x,y,z)=>{const m=new T.Mesh(new T.SphereGeometry(r,14,10),mat);m.scale.set(sx,sy,sz);m.position.set(x,y,z);return m};
 const cone=(r,h,mat,x,y,z,rx,ry,rz,seg)=>{const m=new T.Mesh(new T.ConeGeometry(r,h,seg||6),mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,rz||0);return m};
 const boxm=(w,h,d,mat,x,y,z,rx,ry,rz)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,rz||0);return m};
 /* ---- detail helpers: fur/scale textures, scattered tufts, spiral horns ---- */
 const TXC={};
 function furTex(col,streak){const k="f"+col;if(TXC[k])return TXC[k];const c=cv(128,128),g=c.getContext("2d"),r=(col>>16)&255,gg=(col>>8)&255,b=col&255;g.fillStyle="rgb("+r+","+gg+","+b+")";g.fillRect(0,0,128,128);
  for(let i=0;i<900;i++){const x=Math.random()*128,y=Math.random()*128,l=6+Math.random()*14,d=Math.random()<.5?-1:1,a=.1+Math.random()*.22;g.strokeStyle=d>0?"rgba(255,245,225,"+a+")":"rgba(0,0,0,"+(a*1.4)+")";g.lineWidth=.8+Math.random()*.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+(Math.random()-.5)*3,y+l);g.stroke()}
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);return TXC[k]=t}
 function scaleTex(col){const k="s"+col;if(TXC[k])return TXC[k];const c=cv(128,128),g=c.getContext("2d"),r=(col>>16)&255,gg=(col>>8)&255,b=col&255;g.fillStyle="rgb("+(r*.7|0)+","+(gg*.7|0)+","+(b*.7|0)+")";g.fillRect(0,0,128,128);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const px=x*8+(y%2)*4,py=y*8,k2=.75+Math.random()*.4;g.fillStyle="rgb("+Math.min(255,r*k2|0)+","+Math.min(255,gg*k2|0)+","+Math.min(255,b*k2|0)+")";g.beginPath();g.arc(px,py,5,0,Math.PI);g.fill();g.strokeStyle="rgba(0,0,0,.35)";g.lineWidth=1;g.stroke()}
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);return TXC[k]=t}
 const fm=(col,r)=>{const m=M(col,{r:r==null?.85:r});try{m.map=furTex(col)}catch(e){}return m};
 const sm=(col,r)=>{const m=M(col,{r:r==null?.35:r,m:.1});try{m.map=scaleTex(col)}catch(e){}return m};
 function tufts(mat,n,cx,cy,cz,rx,ry,rz,len,down,seed){const g=new T.Group();let q=seed||7;const R=()=>{q=(q*16807)%2147483647;return q/2147483647};
  for(let i=0;i<n;i++){const a=R()*6.283,b=Math.acos(2*R()-1),x=Math.sin(b)*Math.cos(a),y=Math.cos(b),z=Math.sin(b)*Math.sin(a);
   const c=new T.Mesh(new T.ConeGeometry(len*.12*(.7+R()*.6),len*(.7+R()*.7),3),mat);c.position.set(cx+x*rx,cy+y*ry,cz+z*rz);
   const d=new T.Vector3(x,y-(down||0),z).normalize();c.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d);g.add(c)}return g}
 function hornSpiral(mat,ring,x,y,z,side,len,curl){const g=new T.Group();let px=0,py=0,pz=0,ang=0;const N=9;
  for(let i=0;i<N;i++){const t=i/N,r=.034*(1-t*.8),h=len/N,c=new T.Mesh(new T.CylinderGeometry(r*.85,r,h*1.1,8),i%2?ring:mat);ang+=curl/N;
   c.position.set(px,py+h/2*Math.cos(ang),pz-h/2*Math.sin(ang)*1);c.rotation.x=-ang*.9;px+=0;py+=h*Math.cos(ang);pz-=h*Math.sin(ang);g.add(c)}
  g.position.set(x,y,z);g.rotation.z=-side*.55;g.rotation.y=side*.3;return g}
 function wrapAnim(F,fn){const pl=F.play,up=F.update;F.atk=0;
  F.play=function(n,ts){pl.call(this,n,ts);if(n==="attack")this.atk=.75};
  F.update=function(dt){up.call(this,dt);this.t=(this.t||0)+dt;if(this.atk>0)this.atk-=dt;fn(this,dt)};return F}
 /* ---- THE CHORUS: a hooded figure whose face and chest are all mouths, singing ---- */
 function mouth(r,col){const g=new T.Group(),lip=new T.Mesh(new T.TorusGeometry(r,r*.3,8,20),M(0x8a5058,{r:.5}));lip.scale.y=1.5;g.add(lip);
  const cav=new T.Mesh(new T.CircleGeometry(r,16),new T.MeshBasicMaterial({color:0x040102}));cav.scale.y=1.5;cav.position.z=-.002;g.add(cav);
  const tm=M(0xf2ecda,{r:.4});for(let i=0;i<10;i++){const a=i/10*6.283,t=new T.Mesh(new T.BoxGeometry(r*.17,r*.34,r*.1),tm);t.position.set(Math.cos(a)*r*.86,Math.sin(a)*r*1.26,.0);t.rotation.z=a+1.57;g.add(t)}
  const gl=glow(col,r*8);gl.position.z=-.04;g.add(gl);g.userData.gl=gl;return g}
 ABOM.chorus=function(c){
  const F=window.__fig({stut:1,limbs:{arm:1.9,neck:1.4},g:"m",outfit:"peasant",skin:0xd9d1c3,cloth:0xcfcabd,pants:0xb9b3a4,hair:null,acc:["Robe","Hood","Claws"],s:1.55,face:3,eye:0xbfe6ff,formal:1,fseed:41});
  hideFace(F);const s=sk(F),ms=[];
  const hd=new T.Group();hd.add(sph(.118,1,1.08,1.02,M(0x040306,{r:.9}),0,HY+.005,.005));
  [[0,.06,.112,.034],[0,-.012,.118,.042],[0,-.086,.106,.03]].forEach(([x,y,z,r],i)=>{const m=mouth(r,0xa0d8ff);m.position.set(x,HY+y,z);hd.add(m);ms.push({m,ph:i*1.3,base:1})});attach(s,"Head",hd);
  const ch=new T.Group();for(let i=0;i<9;i++){const r=.032+((i*7)%3)*.008,m=mouth(r,0xa0d8ff);m.position.set(((i%3)-1)*.095,1.02+Math.floor(i/3)*.14,.13-Math.abs((i%3)-1)*.03);m.rotation.y=((i%3)-1)*.35;ch.add(m);ms.push({m,ph:i*.9,base:.8})}attach(s,"spine_03",ch);
  wrapAnim(F,(F,dt)=>{const k=1+F.atk*1.1;ms.forEach(o=>{const open=.4+.6*Math.max(0,Math.sin(F.t*3.1+o.ph));o.m.scale.set(1,Math.min(1.6,(.35+open*o.base)*k+(F.atk>0?.5:0)),1);const gl=o.m.userData.gl;if(gl){gl.material.opacity=.5+.5*open+(F.atk>0?.6:0)}})});
  F.tele=function(){this.atk=.9};return F};
 /* ---- animal and monster heads ---- */
 function jackalHead(){
  const hd=new T.Group(),fur=fm(0x3a322c,.85),dark=M(0x050403,{r:.5}),gold=M(0xe0b84a,{e:0x805010,ei:.45,m:.7,r:.35}),pink=M(0x6a2a2a,{r:.6});
  hd.add(sph(.118,1,1.05,1.12,fur,0,HY+.01,-.005));
  hd.add(cone(.066,.27,fur,0,HY-.015,.2,Math.PI/2,0,0,8));hd.add(sph(.03,1,.8,1.2,dark,0,HY-.0,.335));
  const jaw=cone(.05,.22,fur,0,HY-.07,.17,Math.PI/2,0,0,6);hd.add(jaw);
  [-1,1].forEach(sd=>{hd.add(cone(.055,.27,fur,sd*.08,HY+.2,-.03,-.12,0,-sd*.22,4));hd.add(cone(.034,.2,pink,sd*.08,HY+.195,-.015,-.12,0,-sd*.22,4));
   const e=eye(.026,0xffc020,null,true);e.position.set(sd*.062,HY+.045,.09);e.rotation.y=sd*.55;hd.add(e)});
  const col=new T.Mesh(new T.TorusGeometry(.135,.028,6,18),gold);col.rotation.x=Math.PI/2;col.position.set(0,HY-.14,0);hd.add(col);hd.add(tufts(fur,70,0,HY+.01,-.005,.12,.13,.13,.06,0,3));hd.add(tufts(fur,46,0,HY-.12,-.01,.15,.07,.15,.11,.9,5));
  const teeth=M(0xefe6cc,{r:.3}),tg=M(0xb04a58,{r:.35});
  [-1,1].forEach(sd=>{hd.add(cone(.009,.05,teeth,sd*.032,HY-.062,.265,Math.PI,0,0,4));hd.add(cone(.007,.035,teeth,sd*.032,HY-.098,.255,0,0,0,4));hd.add(cone(.004,.05,teeth,sd*.04,HY-.04,.34,Math.PI/2,0,sd*.6,3));
   hd.add(boxm(.006,.1,.006,M(0x1a1410),sd*.045,HY-.01,.28,.0,0,sd*.5))});
  hd.add(boxm(.05,.012,.14,tg,0,HY-.082,.215));hd.add(boxm(.075,.014,.03,M(0x0a0a0a,{r:.2}),0,HY+.008,.325));
  [-1,1].forEach(sd=>hd.add(boxm(.07,.018,.03,M(0x201a16),sd*.07,HY+.075,.1,0,sd*.25,-sd*.35)));
  hd.userData.jaw=jaw;return hd}
 function goatHead(){
  const hd=new T.Group(),fur=fm(0xcfc3a8,.9),dark=M(0x120c08,{r:.5});
  hd.add(sph(.108,1,1.1,1.1,fur,0,HY+.015,-.005));
  const sn=cone(.07,.27,fur,0,HY-.03,.185,Math.PI/2,0,0,4);sn.scale.set(1,1,.8);hd.add(sn);hd.add(sph(.026,1.4,.7,1,dark,0,HY-.02,.325));
  const jaw=cone(.04,.2,fur,0,HY-.085,.15,Math.PI/2,0,0,4);hd.add(jaw);
  const bd=cone(.03,.2,fur,0,HY-.19,.15,Math.PI+.2,0,0,5);hd.add(bd);
  [-1,1].forEach(sd=>{hd.add(boxm(.2,.025,.075,fur,sd*.17,HY+.045,-.02,0,sd*.2,-sd*.35));
   const e=eye(.027,0xe8d030,null,true);e.position.set(sd*.07,HY+.05,.07);e.rotation.y=sd*.9;e.rotation.x=0;hd.add(e);e.rotation.z=1.57});
  hd.add(tufts(fur,60,0,HY+.015,-.005,.11,.12,.12,.045,0,11));
  const ho=M(0x2a2218,{r:.5}),hr=M(0x6a5a40,{r:.5});[-1,1].forEach(sd=>{hd.add(hornSpiral(ho,hr,sd*.07,HY+.1,-.02,sd,.42,2.6))});
  const tm=M(0xe6dcc0,{r:.35});for(let i=0;i<6;i++)hd.add(boxm(.012,.02,.008,tm,-.03+i*.012,HY-.082,.265));
  for(let i=0;i<12;i++){const x=(i%4-1.5)*.012;hd.add(cone(.006,.12+((i*7)%5)*.02,fur,x,HY-.24-(i%3)*.01,.12+(i%3)*.01,Math.PI+.15,0,0,3))}
  [-1,1].forEach(sd=>{hd.add(sph(.012,.8,1.6,1,M(0x050303),sd*.022,HY-.02,.318));hd.add(boxm(.06,.01,.018,M(0x7a5a52,{r:.5}),sd*.0,HY-.1,.25))});
  hd.userData.jaw=jaw;return hd}
 function fishHead(){
  const hd=new T.Group(),skin=sm(0x4f7d6e,.3),fin=M(0x2a5a6a,{r:.6,side:2,tr:true,op:.85}),lip=M(0x7a3a4a,{r:.5}),tm=M(0xece4cc,{r:.4});
  hd.add(sph(.125,1.05,.98,1.18,skin,0,HY+.005,.0));
  hd.add(boxm(.17,.03,.07,lip,0,HY-.065,.135));const jaw=boxm(.15,.025,.09,lip,0,HY-.095,.11);hd.add(jaw);
  for(let i=0;i<8;i++){const x=-.07+i*.02;hd.add(cone(.007,.03,tm,x,HY-.08,.165,Math.PI,0,0,3))}
  [-1,1].forEach(sd=>{const e=eye(.052,0xe8e030,null,false);e.position.set(sd*.1,HY+.035,.075);e.rotation.y=sd*1.1;hd.add(e);
   for(let k=0;k<3;k++)hd.add(cone(.012,.1-k*.015,fin,sd*.125,HY-.12-k*.02,-.01+k*.012,0,0,sd*(1.2+k*.1),4));
   hd.add(cone(.008,.13,fin,sd*.04,HY-.15,.15,Math.PI-.2,0,0,3))});
  for(let k=0;k<8;k++){hd.add(cone(.014,.14-k*.012,fin,0,HY+.115+(k<3?0:-.01*(k-3)),.07-k*.03,-.25,0,0,4))}
  [-1,1].forEach(sd=>{for(let k=0;k<4;k++)hd.add(boxm(.004,.045,.012,M(0x0a1c18),sd*.118,HY-.04-k*.012,.0+k*.015,0,0,sd*.2));
   for(let k=0;k<2;k++)hd.add(cone(.004,.12,M(0x2a6a5a),sd*.045,HY-.11,.16+k*.01,Math.PI/2+.5,0,sd*(.3+k*.4),3))});
  hd.add(sph(.09,1.1,.8,1,M(0x6a9a8a,{r:.15,m:.1,tr:true,op:.35}),0,HY+.04,.04));
  hd.userData.jaw=jaw;return hd}

 /* ---- undead: a real skull on the shoulders; the rest rots away in the shader ---- */
 function skullHead(glowCol,jawOpen){
  const hd=new T.Group(),bn=M(0xd8ceb0,{r:.55}),dk=M(0x050403,{r:.4}),gl=new T.MeshBasicMaterial({color:glowCol,fog:false});
  hd.add(sph(.098,1,1.08,1.1,bn,0,HY+.02,-.01));hd.add(sph(.075,1,.8,.9,bn,0,HY-.03,.045));
  [-1,1].forEach(sd=>{hd.add(sph(.03,1,1.05,.7,dk,sd*.04,HY+.01,.085));const e=sph(.011,1,1,.8,gl,sd*.04,HY+.01,.098);hd.add(e);hd.add(sph(.045,.5,.9,.6,bn,sd*.085,HY-.03,.04))});
  hd.add(cone(.017,.04,dk,0,HY-.03,.105,0,0,Math.PI,3));
  for(let i=0;i<7;i++)hd.add(boxm(.011,.02,.008,bn,-.033+i*.011,HY-.07,.108));
  const jaw=new T.Group();jaw.position.set(0,HY-.065,.02);jaw.add(boxm(.09,.03,.09,bn,0,-.012,.045));for(let i=0;i<7;i++)jaw.add(boxm(.011,.018,.008,bn,-.033+i*.011,.004,.088));
  jaw.add(boxm(.012,.07,.03,bn,-.045,.02,-.01));jaw.add(boxm(.012,.07,.03,bn,.045,.02,-.01));hd.add(jaw);
  hd.add(sph(.012,1,1,1,M(0x6a1010),.03,HY+.07,.09));hd.userData.jaw=jaw;return hd}
 function skeleton(cfg,gc){
  const F=window.__fig(cfg);hideFace(F);const s=sk(F),hd=skullHead(gc);attach(s,"Head",hd);const jaw=hd.userData.jaw;
  wrapAnim(F,(F,dt)=>{jaw.rotation.x=(F.atk>0?.55*Math.sin(Math.min(1,(.75-F.atk)/.4)*Math.PI):.06+.05*Math.sin(F.t*2.3))});F.tele=function(){this.atk=.9};return F}
 ABOM.skelLegion=function(c){return skeleton({stut:1,g:"m",outfit:"peasant",skin:0xd8ceb0,cloth:0x4a3a22,pants:0x3a3020,hair:null,armor:0x8a6a3a,acc:["Helm","Armor","Sword","Shield"],s:1.12,face:2,eye:0xff6a20,formal:0,fseed:71},0xff7a20)};

 /* ---- the mummy (wrapped in linen, loose strips trailing) and the frozen draugr (frost crust, icicles) ---- */
 function strips(s,boneName,defs,F){const gs=[];defs.forEach(([x,y,z,L,rz],i)=>{const g=new T.Group(),m=new T.Mesh(new T.PlaneGeometry(.045,L),M(0xb8a878,{r:.95,side:2}));m.position.y=-L/2;g.add(m);g.position.set(x,y,z);g.rotation.z=rz;g.userData.p=i;attach(s,boneName,g);gs.push(g)});
  return gs}
 ABOM.mummy=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0xc8c0a0,cloth:0xb8ae88,pants:0xb8ae88,hair:null,acc:["Claws"],s:1.08,face:3,eye:0x80ffb0,fseed:81});
  hideFace(F);const s=sk(F),hd=new T.Group(),dk=M(0x030202,{r:.4}),gl=new T.MeshBasicMaterial({color:0x80ffb0,fog:false});
  hd.add(sph(.1,1,1.08,1.08,M(0xcbbf98,{r:.95}),0,HY+.02,-.005));
  [-1,1].forEach(sd=>{hd.add(sph(.03,1.2,.55,.6,dk,sd*.04,HY+.02,.086));hd.add(sph(.009,1,1,1,gl,sd*.04,HY+.02,.098))});
  for(let i=0;i<6;i++){const b=new T.Mesh(new T.TorusGeometry(.098,.007,4,16),M(0xa89a6a,{r:.95}));b.rotation.x=Math.PI/2+(i%2?.2:-.2);b.rotation.y=i*.7;b.position.set(0,HY-.03+i*.027,0);b.scale.set(1,1,1.05);hd.add(b)}
  attach(s,"Head",hd);
  const gs=strips(s,"Head",[[.05,HY+.0,-.09,.55,.2],[-.06,HY+.02,-.09,.4,-.15],[.0,HY-.02,-.1,.7,.05]]).concat(strips(s,"spine_03",[[.1,1.3,-.14,.7,.15],[-.12,1.25,-.14,.55,-.2],[0,1.2,-.16,.8,.0]]));
  wrapAnim(F,(F,dt)=>{gs.forEach((g,i)=>{g.rotation.x=.25+.18*Math.sin(F.t*1.6+i*1.3)+(F.atk>0?.5:0);g.rotation.z+=Math.sin(F.t*.9+i)*.002})});
  F.tele=function(){this.atk=.9};return F};
 ABOM.draugr=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x9ac0d0,cloth:0x3a4a58,pants:0x28323e,hair:0xdde8f0,armor:0x6a7a88,acc:["Helm","Armor","Axe","Claws","Scar"],s:1.18,face:3,eye:0x70e0ff,fseed:83});
  hideFace(F);const s=sk(F),hd=new T.Group(),dk=M(0x04080c,{r:.4}),gl=new T.MeshBasicMaterial({color:0x70e8ff,fog:false}),ice=M(0xbfe6ff,{e:0x2060a0,ei:.5,r:.08,m:.1,tr:true,op:.78});
  hd.add(sph(.098,1,1.08,1.08,M(0x7a98a8,{r:.45}),0,HY+.02,-.005));
  [-1,1].forEach(sd=>{hd.add(sph(.028,1.1,.7,.6,dk,sd*.04,HY+.025,.085));hd.add(sph(.011,1,1,1,gl,sd*.04,HY+.025,.1))});
  hd.add(sph(.09,1.05,.7,.9,M(0x8aa4b4,{r:.5}),0,HY-.035,.04));
  for(let i=0;i<7;i++)hd.add(cone(.007,.05+(i%3)*.03,ice,-.04+i*.0135,HY-.075,.085+(i%2)*.01,Math.PI,0,0,4));
  for(let i=0;i<9;i++){const a=i/9*6.28;hd.add(cone(.012,.07+(i%3)*.04,ice,Math.cos(a)*.1,HY+.1,Math.sin(a)*.1,0,0,Math.cos(a)*.5,5))}
  attach(s,"Head",hd);
  const sh=new T.Group();[-1,1].forEach(sd=>{for(let k=0;k<5;k++)sh.add(cone(.02,.16+k*.05,ice,sd*(.16+k*.025),1.42+(k%2)*.03,-.02+(k%3)*.03,0,0,-sd*(.25+k*.12),5))});
  for(let k=0;k<6;k++)sh.add(cone(.016,.12+(k%3)*.06,ice,-.1+k*.04,1.3,-.12,Math.PI,0,0,5));
  attach(s,"spine_03",sh);
  wrapAnim(F,(F,dt)=>{sh.position.y=Math.sin(F.t*1.7)*.004});F.tele=function(){this.atk=.9};return F};

 /* ---- the rotted woodsman (overgrown with moss and fungus) and the drowned dead (seaweed, barnacles, chain) ---- */
 function fungus(mat,cap,x,y,z,sz,rx,rz){const g=new T.Group(),st=new T.Mesh(new T.CylinderGeometry(sz*.12,sz*.18,sz*.5,6),M(0xd8d0b0,{r:.8}));st.position.y=sz*.25;g.add(st);
  const c=new T.Mesh(new T.SphereGeometry(sz*.5,10,6,0,6.283,0,Math.PI/2),mat);c.position.y=sz*.5;c.scale.y=.55;g.add(c);g.position.set(x,y,z);g.rotation.set(rx||0,0,rz||0);return g}
 ABOM.woodsman=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x7a8a62,cloth:0x3a3424,pants:0x2a2418,hair:null,acc:["Axe","Claws","Scar"],s:1.1,face:3,eye:0xc8ff80,fseed:91,hunch:.3});
  hideFace(F);const s=sk(F),hd=new T.Group(),dk=M(0x030402,{r:.4}),gl=new T.MeshBasicMaterial({color:0xb8ff60,fog:false}),moss=M(0x3a5a1a,{r:1}),cap=M(0xc8601c,{e:0x401800,ei:.2,r:.6}),cap2=M(0xe8dcc0,{r:.7});
  hd.add(sph(.099,1,1.08,1.08,M(0x6a7a55,{r:.9}),0,HY+.02,-.005));hd.add(sph(.1,1.02,.55,1.05,moss,0,HY+.07,-.01));
  [-1,1].forEach(sd=>{hd.add(sph(.03,1.2,.75,.6,dk,sd*.04,HY+.02,.086));hd.add(sph(.01,1,1,1,gl,sd*.04,HY+.02,.098))});
  hd.add(boxm(.07,.02,.03,dk,0,HY-.06,.085));
  hd.add(fungus(cap,0,.07,HY+.08,.0,.09,0,-.5));hd.add(fungus(cap2,0,-.05,HY+.1,-.04,.07,0,.4));hd.add(tufts(moss,40,0,HY+.02,-.005,.1,.11,.11,.05,.3,17));
  attach(s,"Head",hd);
  const bk=new T.Group();[[.16,1.45,-.06],[-.17,1.38,-.05],[.05,1.3,-.16],[-.08,1.18,-.15],[.14,1.2,-.14]].forEach(([x,y,z],i)=>{bk.add(fungus(i%2?cap:cap2,0,x,y,z,.13+i*.015,Math.PI/2,x>0?-.6:.6))});
  bk.add(tufts(moss,70,0,1.3,-.06,.2,.25,.12,.07,.2,23));attach(s,"spine_03",bk);
  const vines=strips(s,"spine_03",[[.15,1.45,.0,.6,.15],[-.17,1.4,.0,.5,-.2],[.0,1.25,-.17,.7,.05]]);vines.forEach(v=>{v.children[0].material=M(0x2a4a14,{r:.9,side:2});v.children[0].scale.x=.6});
  wrapAnim(F,(F,dt)=>{vines.forEach((g,i)=>{g.rotation.x=.15+.12*Math.sin(F.t*1.1+i*1.7)})});F.tele=function(){this.atk=.9};return F};
 ABOM.drowned=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x6a8a82,cloth:0x2a3a34,pants:0x1c2a26,hair:0x1a2a20,acc:["Claws","Scar"],s:1.06,face:3,eye:0x90ffd0,fseed:93,hunch:.35});
  hideFace(F);const s=sk(F),hd=new T.Group(),dk=M(0x020606,{r:.4}),gl=new T.MeshBasicMaterial({color:0x70ffd0,fog:false}),bar=M(0xc8c4b0,{r:.8}),wd=M(0x2a4a30,{r:.4,side:2});
  hd.add(sph(.101,1,1.1,1.08,M(0x6f8e86,{r:.3}),0,HY+.02,-.005));
  [-1,1].forEach(sd=>{hd.add(sph(.032,1.2,.9,.6,dk,sd*.04,HY+.025,.086));hd.add(sph(.011,1,1,1,gl,sd*.04,HY+.025,.1))});
  for(let i=0;i<9;i++){const a=i*2.2;hd.add(cone(.012,.03,bar,Math.cos(a)*.085,HY+.03+Math.sin(a*1.7)*.05,.04+Math.abs(Math.sin(a))*.05,Math.PI/2,0,0,5))}
  attach(s,"Head",hd);
  const body=new T.Group();for(let i=0;i<14;i++){const a=i*1.9,r=.18;body.add(cone(.02,.05,bar,Math.cos(a)*.17,1.1+(i%5)*.07+Math.sin(a)*.04,Math.abs(Math.sin(a))*.12+.04,Math.PI/2,0,0,5))}
  for(let i=0;i<12;i++){const l=new T.Mesh(new T.TorusGeometry(.028,.007,5,10),M(0x4a3a2a,{r:.5,m:.7}));const a=i/12*Math.PI*1.7+.3;l.position.set(Math.cos(a)*.2,1.42-i*.045,Math.sin(a)*.14);l.rotation.set(i%2?0:1.57,a,0);body.add(l)}
  attach(s,"spine_03",body);
  const wd2=strips(s,"Head",[[.04,HY+.01,-.08,.6,.1],[-.05,HY+.0,-.09,.5,-.12],[.07,HY-.02,.0,.35,.2]]).concat(strips(s,"spine_03",[[.14,1.42,-.02,.75,.1],[-.15,1.38,-.02,.6,-.15],[.0,1.3,-.16,.9,.0],[.1,1.2,-.15,.7,.12]]));
  wd2.forEach(g=>{g.children[0].material=wd;g.children[0].scale.x=1.5});
  wrapAnim(F,(F,dt)=>{wd2.forEach((g,i)=>{g.rotation.x=.2+.22*Math.sin(F.t*1.3+i*1.1)});F.dr=(F.dr||0)-dt;if(F.dr<0){F.dr=.18+Math.random()*.3;try{DFX.drip(F.g)}catch(e){}}});F.tele=function(){this.atk=.9};return F};

 /* ---- bog hag, frost giant, cave troll ---- */
 const rock=(r,col,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(new T.IcosahedronGeometry(r,0),M(col,{r:.95}));m.position.set(x,y,z);m.scale.set(sx||1,sy||1,sz||1);m.rotation.set(x*17,y*13,z*11);return m};
 ABOM.bogHag=function(c){
  const F=window.__fig({stut:1,g:"f",outfit:"peasant",skin:0x6a8a5a,cloth:0x2a3a22,pants:0x1a2616,hair:null,acc:["Hood","Robe","Staff","Claws"],s:1.0,face:3,eye:0xc8ff40,fseed:95,hunch:.5});
  hideFace(F);const s=sk(F),hd=new T.Group(),dk=M(0x050804,{r:.4}),gl=new T.MeshBasicMaterial({color:0xd0ff40,fog:false}),skin=M(0x6a8a5a,{r:.7}),wart=M(0x4a6a3a,{r:.9}),hair=M(0xb8b8a8,{r:.9,side:2});
  hd.add(sph(.098,1,1.1,1.05,skin,0,HY+.02,-.005));hd.add(cone(.028,.11,skin,0,HY-.0,.11,Math.PI/2+.45,0,0,6));
  [-1,1].forEach(sd=>{hd.add(sph(.026,1.1,.8,.6,dk,sd*.04,HY+.035,.086));hd.add(sph(.011,1,1,1,gl,sd*.04,HY+.035,.098));hd.add(sph(.02,1,.6,1,wart,sd*.075,HY-.02,.07))});
  hd.add(sph(.018,1,1,1,wart,.02,HY-.02,.15));hd.add(sph(.014,1,1,1,wart,-.04,HY+.07,.08));hd.add(cone(.02,.07,skin,0,HY-.085,.075,Math.PI-.5,0,0,5));
  for(let i=0;i<4;i++)hd.add(boxm(.012,.018,.008,M(0xb8a878,{r:.5}),-.02+i*.013,HY-.058,.1+(i%2)*.004));
  attach(s,"Head",hd);
  const hr=strips(s,"Head",[[.07,HY+.04,-.03,.75,.15],[-.07,HY+.04,-.03,.8,-.15],[.1,HY+.0,.0,.6,.25],[-.1,HY+.0,.0,.65,-.25],[.0,HY+.06,-.07,.9,.0]]);hr.forEach(g=>{g.children[0].material=hair;g.children[0].scale.x=.5});
  const bt=new T.Group(),gm=[0x60ff90,0xff80c0,0xe0e070];for(let i=0;i<4;i++){const b=sph(.035,1,1.2,1,M(gm[i%3],{e:gm[i%3],ei:.6,r:.2,tr:true,op:.8}),-.2+i*.13,1.0-(i%2)*.05,.12);bt.add(b);bt.add(boxm(.004,.08,.004,M(0x3a2a1a),-.2+i*.13,1.07,.12))}
  attach(s,"pelvis",bt);
  const wisp=new T.Group(),wm=new T.MeshBasicMaterial({color:0x90ffa0,fog:false}),wb=new T.Mesh(new T.SphereGeometry(.07,10,8),wm);wisp.add(wb);wisp.add(glow(0x80ff90,.9));F.g.add(wisp);
  wrapAnim(F,(F,dt)=>{hr.forEach((g,i)=>{g.rotation.x=.15+.12*Math.sin(F.t*1.2+i*1.5)});const sc=F.g.scale.x||1;wisp.position.set(Math.cos(F.t*.9)*.9/sc,1.6/sc+Math.sin(F.t*1.7)*.15,Math.sin(F.t*.9)*.9/sc);wisp.scale.setScalar(1/sc*(1+.2*Math.sin(F.t*8)))});
  F.tele=function(){this.atk=.9};return F};
 function iceCrown(s,withBeard){
  const ice=M(0xbfe6ff,{e:0x2060a0,ei:.5,r:.08,m:.1,tr:true,op:.78}),hd=new T.Group();
  for(let i=0;i<11;i++){const a=i/11*6.28;hd.add(cone(.016,.1+(i%3)*.06,ice,Math.cos(a)*.115,HY+.1,Math.sin(a)*.115,0,0,Math.cos(a)*.35,5))}
  if(withBeard)for(let i=0;i<14;i++){const x=(i%7-3)*.028;hd.add(cone(.012,.1+(i%4)*.05,ice,x,HY-.09-Math.abs(x)*.5,.1+(i%2)*.02,Math.PI,0,0,4))}
  attach(s,"Head",hd);const sh=new T.Group();
  [-1,1].forEach(sd=>{for(let k=0;k<6;k++)sh.add(cone(.025,.16+k*.06,ice,sd*(.17+k*.025),1.43+(k%2)*.04,-.02+(k%3)*.04,0,0,-sd*(.25+k*.1),5))});
  for(let k=0;k<7;k++)sh.add(cone(.02,.13+(k%3)*.07,ice,-.1+k*.034,1.3,-.13,Math.PI-.2,0,0,5));attach(s,"spine_03",sh)}
 ABOM.frostGiant=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0xa8c4d8,cloth:0x56708a,pants:0x3e5468,hair:0xe8f0f8,acc:["Club","Tusks","Claws","Scar"],s:2.5,w:1.15,face:3,eye:0x80f0ff,fseed:97});
  hideFace(F);const s=sk(F),hd=new T.Group(),dk=M(0x04080c,{r:.4}),gl=new T.MeshBasicMaterial({color:0x90f4ff,fog:false});
  hd.add(sph(.105,1,1.08,1.08,M(0x9ab8cc,{r:.5}),0,HY+.02,-.005));hd.add(sph(.1,1.05,.6,1.05,M(0xdce8f4,{r:.8}),0,HY+.08,-.01));
  [-1,1].forEach(sd=>{hd.add(sph(.026,1.2,.7,.6,dk,sd*.045,HY+.03,.09));hd.add(sph(.011,1,1,1,gl,sd*.045,HY+.03,.102))});
  hd.add(sph(.08,1.1,.7,.9,M(0x8aa8bc,{r:.5}),0,HY-.04,.05));hd.add(boxm(.08,.02,.03,dk,0,HY-.065,.1));
  attach(s,"Head",hd);iceCrown(s,true);
  wrapAnim(F,()=>{});F.tele=function(){this.atk=.9};return F};
 ABOM.caveTroll=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x6a7a5a,cloth:0x4a4234,pants:0x32301e,hair:null,acc:["Club","Tusks","Claws","Scar","Spikes"],s:2.15,w:1.3,hunch:.4,face:3,eye:0xffa020,fseed:99});
  hideFace(F);const s=sk(F),hd=new T.Group(),dk=M(0x050402,{r:.4}),gl=new T.MeshBasicMaterial({color:0xffa030,fog:false}),sk_=M(0x66745a,{r:.85}),tusk=M(0xe0d4b0,{r:.5});
  hd.add(sph(.11,1.05,1,1.05,sk_,0,HY+.02,-.005));hd.add(sph(.09,1.2,.8,1,sk_,0,HY-.05,.06));hd.add(boxm(.16,.05,.07,sk_,0,HY+.075,.07,.3,0,0));
  [-1,1].forEach(sd=>{hd.add(sph(.02,1,.8,.6,dk,sd*.045,HY+.04,.1));hd.add(sph(.009,1,1,1,gl,sd*.045,HY+.04,.108));hd.add(cone(.016,.11+.02*sd,tusk,sd*.05,HY-.07,.12,Math.PI+.2,0,sd*.2,5))});
  for(let i=0;i<6;i++)hd.add(cone(.007,.025,tusk,-.035+i*.014,HY-.095,.13,Math.PI,0,0,3));
  hd.add(rock(.025,0x4a5240,.06,HY+.09,.04));hd.add(rock(.02,0x4a5240,-.07,HY+.1,0));
  attach(s,"Head",hd);
  const bk=new T.Group();[[.18,1.4,-.08,.1],[-.2,1.36,-.06,.12],[.05,1.3,-.2,.14],[-.1,1.2,-.19,.1],[.15,1.15,-.17,.09],[0,1.45,-.12,.08]].forEach(([x,y,z,r],i)=>{bk.add(rock(r,i%2?0x5a584e:0x4a4a42,x,y,z,1,.8+(i%3)*.2,1))});
  const crys=M(0xffa040,{e:0xff8010,ei:.9,r:.3});[[.0,1.35,-.24],[.12,1.25,-.22],[-.14,1.3,-.2]].forEach(([x,y,z])=>bk.add(cone(.025,.14,crys,x,y,z,-.5,0,0,5)));
  attach(s,"spine_03",bk);
  wrapAnim(F,()=>{});F.tele=function(){this.atk=.9};return F};
 function priest(cfg,headFn){
  const F=window.__fig(cfg);hideFace(F);const s=sk(F),hd=headFn();attach(s,"Head",hd);const jaw=hd.userData.jaw,jy=jaw?jaw.rotation.x:0;
  wrapAnim(F,(F,dt)=>{if(jaw)jaw.rotation.x=jy+(F.atk>0?.5*Math.sin(Math.min(1,(.75-F.atk)/.4)*Math.PI):.04*Math.sin(F.t*2))});
  F.tele=function(){this.atk=.9};return F}
 ABOM.jackalPriest=function(c){return priest({stut:1,g:"m",outfit:"peasant",skin:0x2a2420,cloth:0xe8dcb0,pants:0xd8cc9c,hair:null,acc:["Staff","Robe","Claws"],s:1.28,face:2,eye:0xffc020,formal:1,fseed:57},jackalHead)};
 ABOM.goatPriest=function(c){return priest({stut:1,g:"m",outfit:"peasant",skin:0x9a8468,cloth:0x3a1018,pants:0x240a0e,hair:null,acc:["Horns_big","Robe","Staff","Claws"],s:1.3,face:2,eye:0xe8d030,formal:1,fseed:61,limbs:{arm:1.25}},goatHead)};
 ABOM.fishPriest=function(c){return priest({stut:1,g:"m",outfit:"bare",skin:0x4f7d6e,cloth:0x1c4a52,pants:0x143a42,hair:null,acc:["Claws","Robe"],s:1.3,face:2,eye:0xe8e030,fseed:67,limbs:{arm:1.5,neck:1.2},barefoot:1},fishHead)};
 /* ---- THE TETRAMORPH: man, lion, ox and eagle on one neck, four wings full of eyes ---- */
 function manFace(eyes){const g=new T.Group(),sk_=M(0xe0c8a8,{r:.6});g.add(sph(.098,1,1.08,1,sk_,0,0,0));g.add(cone(.02,.05,sk_,0,-.015,.09,Math.PI/2,0,0,5));
  [-1,1].forEach(sd=>{const e=eye(.022,0x3a6a9a,eyes,false);e.position.set(sd*.04,.025,.085);g.add(e)});g.add(boxm(.05,.008,.01,M(0x5a3028),0,-.055,.092));g.add(cone(.03,.13,M(0x4a3020),0,-.1,.04,Math.PI,0,0,5));return g}
 function lionFace(){const g=new T.Group(),mane=M(0xc08828,{r:.9}),fur=M(0xe0b060,{r:.7});g.add(sph(.15,1,1,.9,mane,0,0,-.03));g.add(sph(.092,1,1,1,fur,0,0,.02));
  g.add(boxm(.08,.06,.1,fur,0,-.035,.1));g.add(sph(.02,1.4,.8,1,M(0x180c08),0,-.015,.15));
  [-1,1].forEach(sd=>{g.add(sph(.028,1,1,1,fur,sd*.07,.1,-.02));const e=eye(.02,0xffa000,null,true);e.position.set(sd*.045,.03,.085);g.add(e)});
  g.add(boxm(.06,.012,.02,M(0x4a1a10),0,-.07,.14));return g}
 function oxFace(){const g=new T.Group(),hide=M(0x4a3020,{r:.8}),mz=M(0x8a6a60,{r:.7}),hm=M(0xe8e0c0,{r:.4});g.add(sph(.1,1,1.05,1.05,hide,0,0,0));g.add(boxm(.095,.075,.13,mz,0,-.04,.1));
  [-1,1].forEach(sd=>{g.add(sph(.014,1,1,1,M(0x100808),sd*.025,-.035,.168));const e=eye(.02,0x501808,null,false);e.position.set(sd*.07,.035,.065);e.rotation.y=sd*.7;g.add(e);
   const h=new T.Mesh(new T.TorusGeometry(.1,.017,6,14,Math.PI*.9),hm);h.position.set(sd*.1,.06,.0);h.rotation.set(0,sd*Math.PI/2,sd>0?.15:Math.PI-.15);g.add(h);g.add(cone(.025,.07,hide,sd*.12,.04,-.03,0,0,-sd*1.3,4))});return g}
 function eagleFace(){const g=new T.Group(),fe=M(0x8a6a38,{r:.7}),be=M(0xe8b830,{r:.4,m:.2});g.add(sph(.088,1,1.05,1.02,fe,0,0,0));
  const bk=cone(.034,.13,be,0,-.012,.13,Math.PI/2+.45,0,0,5);g.add(bk);
  [-1,1].forEach(sd=>{const e=eye(.02,0xffe020,null,true);e.position.set(sd*.062,.03,.06);e.rotation.y=sd*.9;g.add(e)});
  for(let k=0;k<5;k++)g.add(cone(.012,.1,fe,(k-2)*.02,.1,-.04-Math.abs(k-2)*.012,-.5,0,(k-2)*.15,3));return g}
 ABOM.tetramorph=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0xe8d8b0,cloth:0xf2e8c8,pants:0xdccfa0,hair:null,acc:["Robe","Claws","Halo"],s:1.85,face:3,eye:0xffe070,formal:1,fseed:73});
  hideFace(F);const s=sk(F),eyes=[],hub=new T.Group();hub.position.set(0,HY+.01,0);
  const heads=[manFace(eyes),lionFace(),oxFace(),eagleFace()];
  heads.forEach((h,k)=>{const a=k*Math.PI/2,r=.1;h.position.set(Math.sin(a)*r,0,Math.cos(a)*r);h.rotation.y=a;hub.add(h)});
  hub.add(sph(.07,1,1,1,M(0xf2e8c8),0,0,0));attach(s,"Head",hub);
  const root=bone(s,"spine_03")?"spine_03":(bone(s,"spine_02")?"spine_02":"pelvis"),wings=[];
  [[1.5,.05,.7,1.5],[1.4,.12,-.25,1.25]].forEach(([y,zz,rz,L],i)=>{[-1,1].forEach(sd=>{const g=new T.Group(),w=wing(sd,L,1.0,eyes);g.add(w);g.position.set(sd*.1,y,-.14-i*.02);g.rotation.z=rz*sd;g.userData.base=rz*sd;g.userData.i=i;g.userData.sd=sd;attach(s,root,g);wings.push(g)})});
  const hl=glow(0xffe8a0,2.2);hl.position.set(0,HY,-.05);attach(s,"Head",hl);
  let face=0,target=0,cur=0;F.face=0;F.setFace=k=>{face=k;target=-k*Math.PI/2};
  wrapAnim(F,(F,dt)=>{let d=target-cur;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;cur+=d*Math.min(1,dt*7);hub.rotation.y=cur;
   const k=1+(F.atk||0)*2.2;wings.forEach(w=>{const i=w.userData.i,sd=w.userData.sd;w.rotation.z=w.userData.base+sd*Math.sin(F.t*(1.3+i*.3)*k+i)*.3;w.rotation.y=sd*(.15+Math.sin(F.t*1.1+i)*.1)});watch(eyes,dt,F)});
  F.eyes=eyes;F.tele=function(kind){};return F};
 /* wrongness: stop-motion, long limbs, black eyes on the existing monsters */
 const WRONG=[[/Wraith|Shade|Shadow/,{limbs:{arm:1.9,neck:1.5}}],[/Mummy/,{limbs:{arm:1.5,neck:1.3}}],[/Goblin/,{limbs:{arm:1.7},voidEyes:1}],[/Imp/,{limbs:{arm:1.9},voidEyes:1}],[/Dark Magician/,{limbs:{neck:1.9,arm:1.3},voidEyes:1}],[/Bandit Rogue/,{limbs:{arm:1.5},voidEyes:1}],[/Lizardfolk/,{limbs:{neck:1.7,arm:1.4}}],[/Nymph/,{limbs:{arm:1.8,neck:1.5},voidEyes:1}],[/Yeti/,{limbs:{arm:1.45}}],[/Fallen Paladin/,{limbs:{neck:1.4,arm:1.25}}],[/Renegade Dwarf/,{limbs:{arm:1.6},voidEyes:1}],[/Giant/,{limbs:{arm:1.4}}],[/Demon/,{limbs:{arm:1.5,leg:1.2}}],[/Orc/,{limbs:{arm:1.25}}],[/Bandit/,{limbs:{arm:1.3},voidEyes:1}]];
 MC.forEach(([rx,c])=>{if(c.rig||c.build)return;c.stut=1;for(const[r,d]of WRONG){if(r.test(rx.source)){Object.assign(c,d);break}}});
 /* ---- hill ogre, crag witch, orc shaman, goblin sapper, sand cultist ---- */
 const tor_=(R,r,mat,x,y,z,rx,ry,rz,arc)=>{const m=new T.Mesh(new T.TorusGeometry(R,r,6,16,arc||6.283),mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,rz||0);return m};
 const skull_=(r,mat)=>{const g=new T.Group(),dk=M(0x050403,{r:.5});g.add(sph(r,1,1.05,1,mat,0,0,0));g.add(boxm(r*1.1,r*.6,r*.9,mat,0,-r*.75,r*.1));[-1,1].forEach(d=>g.add(sph(r*.28,1,1.2,.6,dk,d*r*.38,r*.1,r*.85)));return g};
 ABOM.hillOgre=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0xa8886a,cloth:0x6a4a30,pants:0x3a2a1c,hair:0x2a1a10,acc:["Club","Claws","Scar"],s:2.0,w:1.28,hunch:.25,face:3,eye:0xff8030,fseed:101});
  hideFace(F);const s=sk(F),hd=new T.Group(),dk=M(0x080402,{r:.4}),skin=M(0xa4826a,{r:.8}),dsk=M(0x8a6650,{r:.9}),tusk=M(0xe4d8b4,{r:.5}),bone=M(0xe0d6b8,{r:.6});
  hd.add(sph(.115,1.08,1,1.05,skin,0,HY+.01,-.005));hd.add(sph(.1,1.2,.8,1,skin,0,HY-.06,.05));
  hd.add(boxm(.2,.045,.08,dsk,0,HY+.062,.085,.35,0,0));
  [-1,1].forEach(sd=>{hd.add(sph(.014,1,1,.7,dk,sd*.05,HY+.025,.108));hd.add(sph(.006,1,1,1,new T.MeshBasicMaterial({color:0xff8830,fog:false}),sd*.05,HY+.025,.114));
   hd.add(cone(.022,.13,tusk,sd*.06,HY-.065,.1,Math.PI+.35,0,sd*.25,5));hd.add(sph(.03,1,1.3,.8,dsk,sd*.12,HY-.01,0))});
  hd.add(sph(.04,1.2,.8,1,dsk,0,HY-.02,.12));hd.add(boxm(.15,.03,.06,dk,0,HY-.075,.095));
  for(let i=0;i<5;i++)hd.add(sph(.015,1,1.3,.8,tusk,-.05+i*.025,HY-.07,.128));
  hd.add(sph(.07,1,1,1,M(0x2a1a10,{r:.95}),0,HY+.11,-.02));hd.add(cone(.03,.1,M(0x2a1a10,{r:.95}),0,HY+.2,-.03,0,0,0,5));hd.add(tor_(.05,.008,bone,0,HY+.145,-.02,Math.PI/2,0,0));
  attach(s,"Head",hd);
  const ch=new T.Group();for(let i=0;i<7;i++){const a=(i/6-.5)*2.4,sk2=skull_(.035,bone);sk2.position.set(Math.sin(a)*.22,1.3-Math.abs(a)*.08,.15+Math.cos(a)*.03);sk2.rotation.y=a;ch.add(sk2)}
  ch.add(tor_(.22,.008,M(0x3a2a1c),0,1.34,.04,Math.PI/2,0,0));attach(s,"spine_03",ch);
  const fur=new T.Group(),fm=M(0x5a4430,{r:1,side:2});[-1,1].forEach(sd=>{for(let k=0;k<6;k++)fur.add(cone(.04,.14,fm,sd*(.2+k*.012),1.5-k*.01,-.02+(k%3)*.05,0,0,-sd*(.9+k*.1),5))});attach(s,"spine_03",fur);
  const belt=new T.Group();belt.add(tor_(.2,.03,M(0x2a1c10,{r:.8}),0,1.0,0,Math.PI/2,0,0));belt.add(boxm(.12,.1,.02,M(0x8a7a30,{m:.7,r:.4}),0,1.0,.2));attach(s,"pelvis",belt);
  wrapAnim(F,()=>{});F.tele=function(){this.atk=.9};return F};
 ABOM.cragWitch=function(c){
  const F=window.__fig({stut:1,g:"f",outfit:"peasant",skin:0xb8a8b0,cloth:0x3a2a4a,pants:0x241a34,hair:0xd8d0e0,acc:["Robe","Hat_cone","Staff","Scar"],s:1.02,hunch:.3,face:3,eye:0xd070ff,fseed:103});
  const s=sk(F),hair=M(0xd8d0e0,{r:.9,side:2}),twig=M(0x4a3a28,{r:.9}),bone=M(0xe0d6b8,{r:.6}),vio=M(0xc070ff,{e:0xa040ff,ei:1.1,r:.3});
  const hd=new T.Group();hd.add(cone(.022,.08,M(0xa898a0,{r:.7}),0,HY-.01,.1,Math.PI/2+.5,0,0,5));hd.add(sph(.012,1,1,1,M(0x6a5a60),.02,HY-.045,.125));
  [-1,1].forEach(sd=>{hd.add(sph(.011,1,1,1,new T.MeshBasicMaterial({color:0xd070ff,fog:false}),sd*.04,HY+.03,.093))});
  for(let k=0;k<2;k++)[-1,1].forEach(sd=>{for(let j=0;j<4;j++)hd.add(cone(.008,.1+.03*j,twig,sd*(.05+j*.025),HY+.1+j*.04,-.01,-.2-j*.1,0,-sd*(.5+j*.2),4))});
  attach(s,"Head",hd);
  const hr=strips(s,"Head",[[.08,HY+.03,-.03,.95,.12],[-.08,HY+.03,-.03,1.0,-.12],[.11,HY-.01,0,.8,.2],[-.11,HY-.01,0,.85,-.2],[0,HY+.05,-.08,1.1,0]]);hr.forEach(g=>{g.children[0].material=hair;g.children[0].scale.x=.6});
  const ch=new T.Group();for(let i=0;i<5;i++){const a=(i/4-.5)*1.8;const b=i%2?skull_(.022,bone):new T.Mesh(new T.OctahedronGeometry(.025),vio);b.position.set(Math.sin(a)*.17,1.33-Math.abs(a)*.06,.13);ch.add(b)}attach(s,"spine_03",ch);
  const rv=new T.Group(),bl=M(0x08060c,{r:.4});rv.add(sph(.05,1,.85,1.4,bl,0,0,0));rv.add(sph(.032,1,1,1,bl,0,.045,.06));rv.add(cone(.012,.04,M(0x3a3a30),0,.04,.1,Math.PI/2,0,0,4));rv.add(sph(.006,1,1,1,new T.MeshBasicMaterial({color:0xffc040,fog:false}),.015,.055,.085));rv.add(cone(.03,.1,bl,0,-.01,-.09,-Math.PI/2+.3,0,0,4));rv.position.set(.17,1.52,.0);attach(s,"spine_03",rv);
  const orb=new T.Group();for(let i=0;i<3;i++){const o=new T.Mesh(new T.SphereGeometry(.035,8,6),new T.MeshBasicMaterial({color:0xc070ff,fog:false}));orb.add(o)}F.g.add(orb);
  wrapAnim(F,(F,dt)=>{hr.forEach((g,i)=>{g.rotation.x=.12+.1*Math.sin(F.t*1.1+i*1.4)});const sc=F.g.scale.x||1;orb.children.forEach((o,i)=>{const a=F.t*1.4+i*2.09;o.position.set(Math.cos(a)*.55/sc,1.55/sc+Math.sin(F.t*2+i)*.08,Math.sin(a)*.55/sc)});rv.rotation.z=.08*Math.sin(F.t*.9)+((F.atk||0)>0?.3:0)});
  F.tele=function(){this.atk=.9};return F};
 ABOM.orcShaman=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x3f6a2e,cloth:0x4a1a1a,pants:0x2a1010,hair:null,acc:["Tusks","Robe","Staff","Scar"],s:1.12,face:3,eye:0xff5030,fseed:105});
  const s=sk(F),bone=M(0xe4dcc0,{r:.55}),red=M(0xb01810,{r:.6}),dk=M(0x070303,{r:.4}),fth=M(0x1a1a2a,{r:.8,side:2}),rune=new T.MeshBasicMaterial({color:0xff4020,fog:false});
  const hd=new T.Group();const sk2=skull_(.13,bone);sk2.scale.set(1,1.1,1.1);sk2.position.set(0,HY+.07,.0);sk2.rotation.x=-.5;hd.add(sk2);
  [-1,1].forEach(sd=>{const h=tor_(.1,.02,bone,sd*.12,HY+.17,-.02,0,sd*Math.PI/2,sd>0?.2:Math.PI-.2,Math.PI*1.2);hd.add(h);hd.add(boxm(.006,.05,.01,rune,sd*.05,HY+.0,.1))});
  for(let i=0;i<7;i++){const a=(i/6-.5)*2.4;hd.add(cone(.012,.2,i%2?fth:red,Math.sin(a)*.14,HY+.14,-.09-Math.cos(a)*.03,-.5,0,-a*.6,3))}
  for(let i=0;i<3;i++)hd.add(boxm(.09,.012,.01,red,0,HY-.01-i*.02,.1));
  attach(s,"Head",hd);
  const sh=new T.Group();for(let i=0;i<8;i++){const a=(i/7-.5)*2.6,b=skull_(.028,bone);b.position.set(Math.sin(a)*.24,1.34-Math.abs(a)*.09,.12);b.rotation.y=a;sh.add(b)}
  [-1,1].forEach(sd=>{for(let k=0;k<5;k++)sh.add(cone(.012,.16,k%2?fth:red,sd*(.2+k*.02),1.46,-.03,0,0,-sd*(.8+k*.15),3))});
  const sr=[];for(let i=0;i<5;i++){const r=boxm(.05,.008,.01,rune,(i-2)*.07,1.15+(i%2)*.04,.15);sh.add(r);sr.push(r)}attach(s,"spine_03",sh);
  const orb=new T.Group(),sks=[];for(let i=0;i<3;i++){const b=skull_(.04,bone),gl_=sph(.012,1,1,1,rune,0,0,.04);b.add(gl_);orb.add(b);sks.push(b)}F.g.add(orb);
  const fire=glow(0xff4020,1.1);orb.add(fire);
  wrapAnim(F,(F,dt)=>{const sc=F.g.scale.x||1;sks.forEach((b,i)=>{const a=F.t*1.8+i*2.09;b.position.set(Math.cos(a)*.7/sc,1.7/sc+Math.sin(F.t*2.3+i)*.1,Math.sin(a)*.7/sc);b.rotation.y=-a});sr.forEach((r,i)=>{r.scale.y=1+.5*Math.sin(F.t*4+i)})});
  F.tele=function(){this.atk=.9};return F};
 ABOM.goblinSapper=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x6a8a3a,cloth:0x6a4a1a,pants:0x2a1e12,hair:null,hat:0x3a3a3a,acc:["Ears_pointed","Cap","Fangs","Claws"],s:.72,face:3,eye:0xffe040,fseed:107});
  const s=sk(F),brass=M(0xb08a30,{m:.8,r:.35}),lens=M(0x60e0ff,{e:0x20a0c0,ei:.8,r:.1,tr:true,op:.75}),lth=M(0x3a2a18,{r:.8}),pow=M(0x2a2a30,{r:.6}),red=M(0xb02a1a,{r:.6});
  const hd=new T.Group();[-1,1].forEach(sd=>{hd.add(tor_(.032,.008,brass,sd*.04,HY+.05,.095,0,0,0));hd.add(sph(.03,1,1,.3,lens,sd*.04,HY+.05,.098))});
  hd.add(boxm(.09,.012,.01,lth,0,HY+.05,.098));hd.add(tor_(.105,.008,lth,0,HY+.05,0,Math.PI/2,0,0));attach(s,"Head",hd);
  const bd=new T.Group();for(let i=0;i<5;i++){const k=new T.Mesh(new T.CylinderGeometry(.035,.035,.11,8),i%2?red:pow);k.position.set(-.18+i*.09,1.12-(i%2)*.03,.14);k.rotation.z=.7;bd.add(k);bd.add(boxm(.004,.04,.004,lth,-.18+i*.09,1.19-(i%2)*.03,.14))}
  const sp=glow(0xffa040,.6);sp.position.set(-.18,1.24,.14);bd.add(sp);attach(s,"spine_03",bd);
  const bag=new T.Group();bag.add(sph(.13,1,1.1,.9,lth,0,0,0));for(let i=0;i<3;i++){const k=new T.Mesh(new T.CylinderGeometry(.03,.03,.14,8),i==1?red:pow);k.position.set((i-1)*.06,.13,0);bag.add(k)}bag.position.set(0,1.22,-.2);attach(s,"spine_03",bag);
  const fuse=sph(.012,1,1,1,new T.MeshBasicMaterial({color:0xffd060,fog:false}),.06,1.38,-.2);attach(s,"spine_03",fuse);
  wrapAnim(F,(F,dt)=>{const f=.6+.8*Math.abs(Math.sin(F.t*17)*Math.sin(F.t*5.3));sp.scale.setScalar(f);fuse.scale.setScalar(f);F.sp=(F.sp||0)-dt;if(F.sp<0){F.sp=.12+Math.random()*.2;try{DFX.drip&&0}catch(e){}}});
  F.tele=function(){this.atk=.9};return F};
 ABOM.sandCultist=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0xb08a68,cloth:0xb09050,pants:0x6a5428,hair:null,acc:["Robe","Dagger"],s:1.04,face:3,eye:0xffd060,fseed:109});
  const s=sk(F),wrap=M(0xd8c8a0,{r:.95,side:2}),wd=M(0xa89468,{r:.95}),gold=M(0xe0b030,{m:.9,r:.25,e:0x604010,ei:.3}),dk=M(0x080604,{r:.5}),gl=new T.MeshBasicMaterial({color:0xffd060,fog:false});
  const hd=new T.Group();hd.add(sph(.12,1.02,1.0,1.08,wrap,0,HY+.025,-.01));hd.add(sph(.1,1.05,.75,1.05,wd,0,HY+.115,-.005));
  hd.add(sph(.108,1.04,.62,1.04,wrap,0,HY-.045,.015));hd.add(boxm(.2,.05,.012,dk,0,HY+.03,.108));
  [-1,1].forEach(sd=>{hd.add(sph(.011,1.3,.8,.6,gl,sd*.04,HY+.03,.112))});
  for(let i=0;i<5;i++)hd.add(boxm(.2,.008,.01,wd,0,HY-.01-i*.02,.108,0,0,(i%2?.05:-.05)));
  hd.add(sph(.02,1,1,1,gold,0,HY+.12,.09));attach(s,"Head",hd);
  const tail=strips(s,"Head",[[.0,HY-.02,-.12,.55,.0],[.06,HY+.0,-.1,.45,.1]]);tail.forEach(g=>{g.children[0].material=wrap;g.children[0].scale.x=1.4});
  const ch=new T.Group();ch.add(tor_(.14,.025,gold,0,1.34,.03,Math.PI/2+.3,0,0));const sun=new T.Group();sun.add(sph(.05,1,1,.4,gold,0,0,0));for(let i=0;i<12;i++){const a=i/12*6.283;sun.add(cone(.01,.05,gold,Math.cos(a)*.07,Math.sin(a)*.07,0,0,0,a-Math.PI/2,3))}sun.position.set(0,1.2,.17);ch.add(sun);
  const sc=new T.Group();sc.add(sph(.025,1,.6,1.3,M(0x1a3a6a,{m:.5,r:.3,e:0x0a2a5a,ei:.4}),0,0,0));sc.position.set(0,1.12,.16);ch.add(sc);attach(s,"spine_03",ch);
  const sand=new T.Group(),sm=new T.MeshBasicMaterial({color:0xd8b878,fog:false,transparent:true,opacity:.6}),grains=[];for(let i=0;i<12;i++){const g=new T.Mesh(new T.SphereGeometry(.012,4,4),sm);sand.add(g);grains.push(g)}F.g.add(sand);
  wrapAnim(F,(F,dt)=>{const k=F.g.scale.x||1;grains.forEach((g,i)=>{const t=(F.t*.5+i/12)%1,a=i*2.4+F.t*.6;g.position.set(Math.cos(a)*(.5+t*.3)/k,(.1+t*1.6)/k,Math.sin(a)*(.5+t*.3)/k);g.scale.setScalar(1-t*.7)});tail.forEach((g,i)=>{g.rotation.x=.2+.18*Math.sin(F.t*1.5+i)})});
  F.tele=function(){this.atk=.9};return F};
 /* ---- goetic & decan dead: each carries the burning seal of the spirit that raised it ---- */
 function sealTex(seed,col){const c=document.createElement("canvas");c.width=c.height=256;const g=c.getContext("2d");let a=seed*9301+49297;const R=()=>(a=(a*9301+49297)%233280)/233280;
  g.strokeStyle=col;g.fillStyle=col;g.lineWidth=5;g.shadowColor=col;g.shadowBlur=10;g.beginPath();g.arc(128,128,118,0,6.283);g.stroke();g.lineWidth=3;g.beginPath();g.arc(128,128,100,0,6.283);g.stroke();
  const n=5+Math.floor(R()*3),pts=[];for(let i=0;i<n;i++){const t=i/n*6.283+R()*.5,r=62+R()*28;pts.push([128+Math.cos(t)*r,128+Math.sin(t)*r])}
  g.lineWidth=4;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));if(R()<.7)g.closePath();g.stroke();
  pts.forEach(p=>{g.beginPath();g.arc(p[0],p[1],8+R()*5,0,6.283);g.stroke()});g.beginPath();g.moveTo(128,34);g.lineTo(128,222);g.moveTo(34+R()*30,128);g.lineTo(222-R()*30,128);g.stroke();
  for(let i=0;i<8;i++){const t=R()*6.283;g.beginPath();g.moveTo(128+Math.cos(t)*30,128+Math.sin(t)*30);g.lineTo(128+Math.cos(t+.4)*60,128+Math.sin(t+.4)*60);g.stroke()}
  g.beginPath();g.arc(128,128,12,0,6.283);g.stroke();return new T.CanvasTexture(c)}
 function seal(F,s,seed,col,hex,y,sz){const m=new T.Mesh(new T.PlaneGeometry(sz,sz),new T.MeshBasicMaterial({map:sealTex(seed,col),transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:2,fog:false,color:hex}));const g=new T.Group();g.add(m);g.position.set(0,y,-.02);attach(s,"Head",g);return m}
 const flame_=(col,x,y,z,sz)=>{const g=new T.Group(),a=cone(sz*.5,sz*1.8,new T.MeshBasicMaterial({color:col,fog:false,transparent:true,opacity:.9}),0,sz*.9,0,0,0,0,6),b=cone(sz*.3,sz*1.1,new T.MeshBasicMaterial({color:0xfff0b0,fog:false}),0,sz*.6,0,0,0,0,5);g.add(a,b);g.position.set(x,y,z);return g};
 const _fl=[];
 ABOM.baelRevenant=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0xb8ae90,cloth:0x3a1a4a,pants:0x24102e,hair:null,acc:["Robe","Staff","Claws"],s:1.3,face:3,eye:0xffd040,fseed:111});
  hideFace(F);const s=sk(F),bn=M(0xd8ceb0,{r:.55}),dk=M(0x050403,{r:.4}),gl=new T.MeshBasicMaterial({color:0xffc830,fog:false}),gold=M(0xe0b030,{m:.9,r:.25,e:0x604010,ei:.3}),toad=M(0x5a6a3a,{r:.4}),wet=M(0x8a9a5a,{r:.2});
  const mid=skullHead(0xffc830);attach(s,"Head",mid);const jaw=mid.userData.jaw;
  const cr=new T.Group();for(let i=0;i<7;i++){const a=(i/7-.5)*2.4;cr.add(cone(.014,.1+(i%2)*.04,gold,Math.sin(a)*.1,HY+.125,Math.cos(a)*.1-.03,0,0,-a*.4,4))}cr.add(tor_(.1,.012,gold,0,HY+.105,-.02,Math.PI/2,0,0));attach(s,"Head",cr);
  const tdh=new T.Group();tdh.add(sph(.085,1.25,.8,1,toad,0,HY-.01,0));[-1,1].forEach(sd=>{tdh.add(sph(.03,1,1,1,wet,sd*.07,HY+.045,.045));tdh.add(sph(.012,1,1,1,gl,sd*.07,HY+.047,.07));tdh.add(sph(.014,1,1,1,dk,sd*.035,HY-.01,.085))});tdh.add(boxm(.16,.012,.02,dk,0,HY-.045,.075));tdh.add(sph(.05,1.4,.5,.9,wet,0,HY-.06,.03));
  tdh.position.set(-.2,-.05,.0);tdh.rotation.y=.5;const cth=new T.Group();cth.add(sph(.065,1,.95,1,bn,0,HY,0));[-1,1].forEach(sd=>{cth.add(cone(.03,.07,bn,sd*.045,HY+.08,-.01,0,0,-sd*.3,3));cth.add(sph(.02,1,1.1,.6,dk,sd*.03,HY+.01,.055));cth.add(sph(.008,1,1,1,gl,sd*.03,HY+.01,.063))});cth.add(cone(.01,.02,dk,0,HY-.015,.065,Math.PI,0,0,3));for(let i=0;i<4;i++)cth.add(cone(.004,.025,bn,-.02+i*.013,HY-.04,.06,Math.PI,0,0,3));cth.position.set(.2,-.05,0);cth.rotation.y=-.5;
  attach(s,"spine_03",tdh);attach(s,"spine_03",cth);
  /* side heads hang from a yoke on the shoulders */
  const nk=new T.Group();[-1,1].forEach(sd=>nk.add(cyl_(.03,.04,.3,M(0x8a8470,{r:.8}),sd*.16,1.47,.0,0,0,sd*.55)));attach(s,"spine_03",nk);
  const sl=seal(F,s,11,"#ffc830",0xffffff,HY+.38,.5);
  wrapAnim(F,(F,dt)=>{jaw.rotation.x=(F.atk>0?.55*Math.sin(Math.min(1,(.75-F.atk)/.4)*Math.PI):.06+.05*Math.sin(F.t*2.3));sl.rotation.z=F.t*.5});F.tele=function(){this.atk=.9};return F};
 const cyl_=(r1,r2,h,mat,x,y,z,rx,ry,rz)=>{const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,8),mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,rz||0);return m};
 function antler(sd,mat){const g=new T.Group();const beam=(len,x,y,z,rx,rz)=>cone(.014,len,mat,x,y,z,rx,0,rz,5);
  g.add(beam(.3,sd*.07,HY+.2,-.03,-.15,-sd*.35));[[.12,.3],[.15,.38],[.12,.46]].forEach(([l,h],i)=>g.add(beam(l+.04,sd*(.09+i*.03),HY+.1+h,-.03-i*.02,-.3,-sd*(.9-i*.1))));g.add(beam(.14,sd*.15,HY+.4,-.1,-.5,-sd*.3));return g}
 ABOM.furfurStag=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x2a2420,cloth:0x3a2a22,pants:0x22160e,hair:null,acc:["Claws","Robe"],s:1.25,face:3,eye:0xff7020,fseed:113,hunch:.15});
  hideFace(F);const s=sk(F),bn=M(0xd0c4a4,{r:.55}),dk=M(0x050403,{r:.4}),gl=new T.MeshBasicMaterial({color:0xff7a20,fog:false}),char=M(0x2a1a14,{r:.9}),ant=M(0xc8b890,{r:.6});
  const hd=new T.Group();hd.add(sph(.085,1,1.05,1.1,bn,0,HY+.03,-.01));hd.add(boxm(.075,.07,.19,bn,0,HY-.015,.12,.15,0,0));hd.add(sph(.03,1.2,.8,1,dk,0,HY-.02,.215));
  [-1,1].forEach(sd=>{hd.add(sph(.026,1,1.1,.7,dk,sd*.05,HY+.04,.07));hd.add(sph(.011,1,1,1,gl,sd*.05,HY+.04,.083));hd.add(cone(.025,.12,bn,sd*.1,HY+.06,-.04,0,0,-sd*1.2,4))});
  for(let i=0;i<6;i++)hd.add(boxm(.008,.02,.008,bn,-.02+i*.008,HY-.045,.18));hd.add(boxm(.06,.025,.12,bn,0,HY-.06,.1));
  hd.add(antler(-1,ant));hd.add(antler(1,ant));attach(s,"Head",hd);
  const fl=new T.Group(),flames=[];for(let i=0;i<5;i++){const f=flame_(i%2?0xff5010:0xff9a20,(i-2)*.05,.0+i*.0,0,.08+(i%3)*.03);fl.add(f);flames.push(f)}fl.position.set(0,.98,-.2);const tailc=cone(.03,.5,char,0,.0,-.1,-1.2,0,0,5);fl.add(tailc);attach(s,"pelvis",fl);
  const sh=new T.Group();for(let i=0;i<6;i++)sh.add(flame_(0xff6a18,-.15+i*.06,1.52,-.05,.045));attach(s,"spine_03",sh);
  seal(F,s,13,"#ff7a20",0xffffff,HY+.5,.55);
  wrapAnim(F,(F,dt)=>{fl.children.forEach((f,i)=>{if(f.scale){f.scale.y=1+.35*Math.sin(F.t*11+i*1.9)+.15*Math.sin(F.t*23+i)}});sh.children.forEach((f,i)=>{f.scale.y=1+.4*Math.sin(F.t*13+i*2.3)})});F.tele=function(){this.atk=.9};return F};
 ABOM.andrasOwl=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x8a8a94,cloth:0x1c1c26,pants:0x121218,hair:null,acc:["Sword","Robe","Claws"],s:1.25,face:3,eye:0xffe040,fseed:115});
  hideFace(F);const s=sk(F),bn=M(0xc8c4b8,{r:.7}),dk=M(0x040406,{r:.4}),gl=new T.MeshBasicMaterial({color:0xffe040,fog:false}),fe=M(0x4a4a58,{r:.9,side:2}),fe2=M(0x2a2a36,{r:.9,side:2}),beak=M(0x8a7a50,{r:.4});
  const hd=new T.Group();hd.add(sph(.098,1,1.05,1.0,fe,0,HY+.02,-.01));
  [-1,1].forEach(sd=>{hd.add(cyl_(.058,.058,.02,bn,sd*.048,HY+.03,.082,Math.PI/2,0,0));hd.add(sph(.022,1,1,.8,dk,sd*.048,HY+.03,.095));hd.add(sph(.014,1,1,1,gl,sd*.048,HY+.03,.1));hd.add(cone(.025,.12,fe2,sd*.065,HY+.14,-.02,0,0,-sd*.25,4))});
  hd.add(cone(.022,.09,beak,0,HY-.03,.115,Math.PI/2+.7,0,0,5));hd.add(cone(.012,.04,beak,0,HY-.065,.13,Math.PI,0,0,4));
  for(let i=0;i<14;i++){const a=i/14*6.283;hd.add(cone(.018,.1,i%2?fe:fe2,Math.cos(a)*.1,HY-.07,Math.sin(a)*.1-.01,Math.sin(a)*.3-.3,0,-Math.cos(a)*.3,3))}
  attach(s,"Head",hd);
  const mant=new T.Group();[-1,1].forEach(sd=>{for(let k=0;k<6;k++)mant.add(cone(.03,.35+k*.05,k%2?fe:fe2,sd*(.18+k*.025),1.42-k*.05,-.07-k*.015,.2,0,-sd*(.3+k*.12),4))});for(let k=0;k<6;k++)mant.add(cone(.03,.35,fe2,(k-2.5)*.06,1.35-(k%2)*.1,-.14,Math.PI-.2,0,0,4));attach(s,"spine_03",mant);
  const sl=seal(F,s,17,"#ffe040",0xffffff,HY+.4,.5);
  wrapAnim(F,(F,dt)=>{sl.rotation.z=-F.t*.4;mant.rotation.x=.04*Math.sin(F.t*1.3)});F.tele=function(){this.atk=.9};return F};
 ABOM.bifronsCandle=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0xd8c8a0,cloth:0xcfc4a0,pants:0xb8a880,hair:null,acc:["Robe","Claws"],s:1.12,face:3,eye:0xffc060,fseed:117,hunch:.2,limbs:{arm:1.5,neck:1.3}});
  hideFace(F);const s=sk(F),wax=M(0xe8dcb0,{r:.35,e:0x402810,ei:.15}),dk=M(0x060402,{r:.4}),flc=0xffb040,wdr=M(0xe8dcb0,{r:.3});const cand=[];
  const hd=new T.Group();hd.add(sph(.105,1,1.08,1.05,wax,0,HY+.02,-.005));hd.add(sph(.08,1.1,.9,.8,wax,0,HY-.06,.05));
  [-1,1].forEach(sd=>{hd.add(sph(.034,1,1.25,.7,dk,sd*.045,HY+.025,.088));hd.add(flame_(flc,sd*.045,HY+.0,.075,.012))});
  hd.add(boxm(.08,.02,.02,dk,0,HY-.065,.1));for(let i=0;i<8;i++){const a=i/8*6.28;hd.add(cone(.012,.07+(i%3)*.05,wdr,Math.cos(a)*.1,HY-.03,Math.sin(a)*.09+.02,Math.PI,0,0,4))}
  for(let i=0;i<7;i++){const a=(i/7-.5)*2.6,x=Math.sin(a)*.1,z=Math.cos(a)*.08-.02;hd.add(cyl_(.014,.016,.11+(i%3)*.04,wdr,x,HY+.14+(i%3)*.02,z));const f=flame_(flc,x,HY+.2+(i%3)*.04,z,.02);hd.add(f);cand.push(f)}
  attach(s,"Head",hd);
  const sh=new T.Group();[-1,1].forEach(sd=>{for(let i=0;i<4;i++){const x=sd*(.18+i*.04),y=1.46-i*.03,z=.0+(i%2)*.05;sh.add(cyl_(.018,.02,.12+(i%2)*.06,wdr,x,y,z));const f=flame_(flc,x,y+.08+(i%2)*.03,z,.022);sh.add(f);cand.push(f);sh.add(cone(.02,.2+i*.05,wdr,x,y-.1,z,Math.PI,0,0,4))}});
  for(let i=0;i<5;i++)sh.add(cone(.03,.25+(i%3)*.1,wdr,-.12+i*.06,1.2,.14,Math.PI,0,0,5));attach(s,"spine_03",sh);
  const gl=glow(0xffb040,1.6);gl.position.set(0,HY+.12,0);attach(s,"Head",gl);
  seal(F,s,19,"#ffc070",0xffffff,HY+.5,.5);
  wrapAnim(F,(F,dt)=>{cand.forEach((f,i)=>{f.scale.y=1+.3*Math.sin(F.t*14+i*2.1)+.12*Math.sin(F.t*31+i);f.scale.x=f.scale.z=1/Math.sqrt(f.scale.y)});gl.material.opacity=.7+.2*Math.sin(F.t*9);F.dr=(F.dr||0)-dt;if(F.dr<0){F.dr=.35+Math.random()*.4;try{DFX.drip(F.g)}catch(e){}}});F.tele=function(){this.atk=.9};return F};
 function flagTex(seed){const c=document.createElement("canvas");c.width=128;c.height=160;const g=c.getContext("2d");g.fillStyle="#5a0e12";g.fillRect(0,0,128,160);g.strokeStyle="#d8b050";g.lineWidth=5;g.strokeRect(6,6,116,148);
  g.lineWidth=4;g.beginPath();for(let i=0;i<40;i++){const t=i/40;g.lineTo(64+Math.sin(t*14)*34*(1-t*.3),20+t*120)}g.stroke();g.beginPath();g.arc(64,24,10,0,6.283);g.stroke();g.beginPath();g.moveTo(54,24);g.lineTo(40,14);g.moveTo(74,24);g.lineTo(88,14);g.stroke();
  g.beginPath();g.arc(64,100,38,0,6.283);g.stroke();return new T.CanvasTexture(c)}
 ABOM.eligosBanner=function(c){
  const F=skeleton({stut:1,g:"m",outfit:"peasant",skin:0xd8ceb0,cloth:0x4a1a1a,pants:0x2a1010,hair:null,armor:0x6a6a74,acc:["Helm","Armor","Sword"],s:1.2,face:2,eye:0x30ff90,formal:0,fseed:119},0x30ff90);const s=sk(F);
  const pole=new T.Group(),iron=M(0x4a4a50,{m:.7,r:.4}),gold=M(0xd8b050,{m:.9,r:.3});pole.add(cyl_(.014,.014,1.9,M(0x3a2a18,{r:.8}),0,.95,0));pole.add(cone(.03,.16,iron,0,1.98,0,0,0,0,6));pole.add(boxm(.3,.015,.015,gold,.15,1.78,0));
  const fl=new T.Mesh(new T.PlaneGeometry(.3,.4,6,1),new T.MeshStandardMaterial({map:flagTex(1),side:2,roughness:.9,emissive:0x400808,emissiveIntensity:.3}));fl.position.set(.15,1.58,0);const gpos=fl.geometry.attributes.position,base=gpos.array.slice();pole.add(fl);
  pole.position.set(.22,1.0,-.22);pole.rotation.set(-.12,0,.06);attach(s,"spine_03",pole);
  const sl=seal(F,s,23,"#30ff90",0xffffff,HY+.35,.45);
  const pl=new T.Group();for(let i=0;i<7;i++)pl.add(cone(.012,.2+(i%3)*.06,M(0x9a1010,{side:2}),0,HY+.18+i*.0,-.05-i*.02,-.4-i*.12,0,0,3));attach(s,"Head",pl);
  const up=F.update;wrapAnim(F,(F,dt)=>{const a=gpos.array;for(let i=0;i<a.length;i+=3){const x=base[i];a[i+2]=Math.sin(F.t*5+x*14)*.05*(x+.15)/.3}gpos.needsUpdate=true;sl.rotation.z=F.t*.4});return F};
 ABOM.decanShade=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x8a98b0,cloth:0x1a2038,pants:0x10142a,hair:null,acc:["Robe","Hood","Staff","Claws"],s:1.35,face:3,eye:0x80c8ff,fseed:121,limbs:{arm:1.5,neck:1.2}});
  hideFace(F);const s=sk(F),hd=skullHead(0x80c8ff);attach(s,"Head",hd);const jaw=hd.userData.jaw;
  const ring=new T.Group(),rm=new T.MeshBasicMaterial({color:0x90c8ff,fog:false,transparent:true,opacity:.85,side:2,blending:T.AdditiveBlending,depthWrite:false});
  ring.add(tor_(.42,.008,rm,0,0,0,0,0,0));ring.add(tor_(.34,.005,rm,0,0,0,0,0,0));for(let i=0;i<36;i++){const a=i/36*6.283,L=i%3?.03:.06;const t=boxm(.006,L,.004,rm,Math.cos(a)*.38,Math.sin(a)*.38,0);t.rotation.z=a-Math.PI/2;ring.add(t)}
  for(let i=0;i<12;i++){const a=i/12*6.283;ring.add(sph(.014,1,1,1,new T.MeshBasicMaterial({color:0xfff0c0,fog:false}),Math.cos(a)*.34,Math.sin(a)*.34,0))}
  const rg=new T.Group();rg.add(ring);rg.position.set(0,HY+.02,-.2);attach(s,"Head",rg);
  const stars=new T.Group(),sm=new T.MeshBasicMaterial({color:0xfff0c0,fog:false});for(let i=0;i<10;i++)stars.add(sph(.02,1,1,1,sm,0,0,0));F.g.add(stars);
  const mist=glow(0x6090ff,1.4);mist.position.set(0,1.0,0);attach(s,"spine_03",mist);
  seal(F,s,29,"#90c8ff",0xffffff,HY+.5,.5);
  wrapAnim(F,(F,dt)=>{ring.rotation.z=F.t*.35;jaw.rotation.x=(F.atk>0?.55*Math.sin(Math.min(1,(.75-F.atk)/.4)*Math.PI):.06+.05*Math.sin(F.t*2.3));const k=F.g.scale.x||1;stars.children.forEach((o,i)=>{const a=F.t*.9+i*.628,r=.7+.1*Math.sin(i*2+F.t);o.position.set(Math.cos(a)*r/k,(1.2+Math.sin(a*2+i)*.3)/k,Math.sin(a)*r/k);o.scale.setScalar(1+.4*Math.sin(F.t*6+i))})});F.tele=function(){this.atk=.9};return F};
 /* ---- the three classics, given faces of their own ---- */
 ABOM.goblinClassic=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x5a8a30,cloth:0x4a3a22,pants:0x2a1e12,hair:null,acc:["Club","Claws","Scar"],s:.7,face:3,eye:0xffd020,fseed:131,limbs:{arm:1.6}});
  hideFace(F);const s=sk(F),skin=M(0x62923a,{r:.7}),dsk=M(0x4a7428,{r:.8}),dk=M(0x080a04,{r:.4}),tooth=M(0xd8cc98,{r:.5}),gl=new T.MeshBasicMaterial({color:0xffe030,fog:false}),iron=M(0x5a5a60,{m:.7,r:.5}),rust=M(0x6a3a22,{m:.5,r:.8});
  const hd=new T.Group();hd.add(sph(.115,1.1,1.0,1.0,skin,0,HY+.02,-.005));hd.add(cone(.03,.15,skin,0,HY-.0,.14,Math.PI/2+.55,0,0,6));hd.add(sph(.014,1,1,1,dsk,.015,HY-.035,.2));
  [[-1,.036],[1,.026]].forEach(([sd,r])=>{hd.add(sph(r*1.2,1,1,.8,M(0xe8e090,{r:.3}),sd*.048,HY+.05,.088));hd.add(sph(r*.5,1,1.4,1,dk,sd*.048,HY+.05,.108));hd.add(sph(.035,2.4,.5,.8,dsk,sd*.14,HY+.03,-.01));hd.add(cone(.07,.28,skin,sd*.2,HY+.09,-.02,0,0,-sd*1.35,4)).scale.z=.25});
  hd.add(boxm(.15,.016,.02,dk,0,HY-.05,.1));[-.05,-.028,-.006,.022,.045].forEach((x,i)=>hd.add(cone(.008,.03+(i%2)*.025,tooth,x,HY-.045,.108,i%2?0:Math.PI,0,0,3)));
  [[.05,.07],[-.07,.04],[.08,-.02]].forEach(([x,y])=>hd.add(sph(.012,1,1,.7,dsk,x,HY+y,.1)));
  const bk=new T.Mesh(new T.CylinderGeometry(.115,.095,.14,10,1,true),rust);bk.position.set(0,HY+.115,-.005);bk.rotation.z=.15;hd.add(bk);hd.add(sph(.1,1,.35,1,rust,0,HY+.185,-.005));[-1,1].forEach(sd=>hd.add(sph(.008,1,1,1,iron,sd*.09,HY+.11,.05)));hd.add(boxm(.03,.1,.01,iron,0,HY+.11,.115));
  attach(s,"Head",hd);
  const bd=new T.Group();for(let i=0;i<6;i++)bd.add(cone(.012,.07,tooth,(i-2.5)*.045,1.28-Math.abs(i-2.5)*.02,.14,Math.PI,0,0,3));bd.add(tor_(.17,.01,M(0x3a2a18),0,1.34,.02,Math.PI/2+.4,0,0));
  const lid=cyl_(.15,.15,.02,iron,.22,1.1,.2,Math.PI/2,0,0);bd.add(lid);bd.add(sph(.03,1,1,1,rust,.22,1.1,.22));
  [-1,1].forEach(sd=>bd.add(sph(.075,1,.7,1,rust,sd*.19,1.43,0)));attach(s,"spine_03",bd);
  const rat=new T.Group();rat.add(sph(.04,1,.8,1.6,M(0x4a3a30),0,0,0));rat.add(cone(.012,.15,M(0xa07a7a),0,0,-.1,-Math.PI/2,0,0,4));rat.position.set(-.1,.97,.17);attach(s,"pelvis",rat);
  wrapAnim(F,()=>{});F.tele=function(){this.atk=.9};return F};
 ABOM.orcRaider=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x3f6a2e,cloth:0x4a2a20,pants:0x2a1e18,hair:null,acc:["Axe","Claws","Scar","Spikes"],s:1.22,w:1.2,face:3,eye:0xff3a10,fseed:133});
  hideFace(F);const s=sk(F),skin=M(0x486e32,{r:.75}),dsk=M(0x35552a,{r:.85}),dk=M(0x060302,{r:.4}),tusk=M(0xe4d8b0,{r:.5}),iron=M(0x4a4a50,{m:.7,r:.45}),gl=new T.MeshBasicMaterial({color:0xff3a10,fog:false}),paint=M(0xd8d0c0,{r:.7}),blood=M(0xa01010,{r:.7}),lth=M(0x3a2414,{r:.8}),bone=M(0xe0d6b8,{r:.6});
  const hd=new T.Group();hd.add(sph(.112,1.1,1,1.05,skin,0,HY+.01,-.005));hd.add(sph(.098,1.2,.75,1,skin,0,HY-.06,.055));hd.add(boxm(.2,.04,.08,dsk,0,HY+.06,.085,.4,0,0));
  hd.add(sph(.014,1,1,.7,dk,.05,HY+.025,.105));hd.add(sph(.006,1,1,1,gl,.05,HY+.025,.112));hd.add(boxm(.05,.05,.01,lth,-.05,HY+.028,.107,0,0,.4));hd.add(boxm(.2,.008,.01,lth,0,HY+.04,.04,0,0,.2));
  hd.add(boxm(.012,.1,.008,blood,-.05,HY+.0,.112,0,0,.15));
  [-1,1].forEach(sd=>{hd.add(cone(.02,.1,tusk,sd*.052,HY-.085,.115,Math.PI+.4,0,sd*.2,5));hd.add(tor_(.016,.004,iron,sd*.052,HY-.08,.12,0,Math.PI/2,0));hd.add(sph(.028,1,1.4,.8,dsk,sd*.115,HY,0));hd.add(tor_(.018,.004,iron,sd*.12,HY-.03,0,0,Math.PI/2,0))});
  for(let i=0;i<3;i++){hd.add(boxm(.05,.012,.008,paint,.0,HY-.015+i*.0,.112));}hd.add(boxm(.012,.07,.008,paint,.02,HY-.07,.112));hd.add(boxm(.012,.07,.008,paint,-.02,HY-.07,.112));hd.add(tor_(.01,.003,iron,0,HY-.04,.14,0,0,0));
  for(let i=0;i<9;i++)hd.add(cone(.014,.1+(i%3)*.04,M(0x0a0806,{r:.9}),0,HY+.12,.06-i*.016,-.2-i*.03,0,0,4));
  attach(s,"Head",hd);
  const sh=new T.Group();[-1,1].forEach(sd=>{const p=sph(.11,lth,sd*.2,1.43,0,1,.6,1);sh.add(p);for(let k=0;k<3;k++)sh.add(cone(.025,.12-k*.02,iron,sd*(.2+k*.03),1.5+k*.03,k*.03-.03,0,0,-sd*(.5+k*.3),4))});
  const ch=new T.Group();for(let i=0;i<8;i++){const a=(i/7-.5)*2.6;const e=cone(.02,.07,M(0x6a8a50,{r:.6}),Math.sin(a)*.22,1.28-Math.abs(a)*.08,.14+Math.cos(a)*.03,0,0,.4,4);e.scale.z=.3;ch.add(e)}ch.add(tor_(.22,.006,M(0x3a2a18),0,1.34,.04,Math.PI/2+.35,0,0));
  sh.add(ch);for(let i=0;i<5;i++)sh.add(boxm(.015,.28,.012,i%2?blood:paint,-.1+i*.05,1.12,.17,0,0,.1*(i-2)));attach(s,"spine_03",sh);
  const bt=new T.Group();bt.add(tor_(.2,.03,lth,0,1.0,0,Math.PI/2,0,0));bt.add(boxm(.1,.1,.02,iron,0,1.0,.2));[-1,1].forEach(sd=>{const k=skull_(.035,bone);k.position.set(sd*.14,.94,.15);bt.add(k)});attach(s,"pelvis",bt);
  wrapAnim(F,()=>{});F.tele=function(){this.atk=.9};return F};
 ABOM.darkMagi=function(c){
  const F=window.__fig({stut:1,g:"m",outfit:"peasant",skin:0x201830,cloth:0x2a1445,pants:0x1a0c30,hair:null,acc:["Robe","Staff","Claws"],s:1.1,face:3,eye:0xb060ff,fseed:135,limbs:{arm:1.3,neck:1.3}});
  hideFace(F);const s=sk(F),hood=M(0x1a0c30,{r:.85,side:2}),trim=M(0x8a50e0,{e:0x6a30c0,ei:.8,r:.4}),vo=M(0x020104,{r:.9}),gl=new T.MeshBasicMaterial({color:0xc070ff,fog:false}),pg=M(0xd8c8a0,{r:.8,side:2}),chn=M(0x6a6a78,{m:.8,r:.35});
  const hd=new T.Group();hd.add(sph(.125,1.0,1.1,1.1,hood,0,HY+.02,-.02));hd.add(cone(.1,.3,hood,0,HY+.05,-.15,-1.2,0,0,8));hd.add(sph(.092,1,1.05,.95,vo,0,HY+.01,.03));
  hd.add(tor_(.1,.01,trim,0,HY+.02,.045,0,0,0));[-1,1].forEach(sd=>{hd.add(sph(.02,1.4,.8,.7,gl,sd*.04,HY+.02,.098));hd.add(cone(.005,.14,gl,sd*.065,HY+.02,.098,0,0,-sd*1.5,3))});
  attach(s,"Head",hd);
  const bk=new T.Group(),cape=new T.Mesh(new T.PlaneGeometry(.55,1.2,3,6),new T.MeshStandardMaterial({color:0x1a0c30,side:2,roughness:.9,emissive:0x120828,emissiveIntensity:.4}));cape.position.set(0,.8,-.2);bk.add(cape);
  for(let i=0;i<5;i++)bk.add(boxm(.02,.14,.01,new T.MeshBasicMaterial({color:0xc070ff,fog:false}),(i-2)*.1,1.28,-.19));attach(s,"spine_03",bk);
  const tome=new T.Group(),cv=M(0x2a1030,{r:.6}),pg2=boxm(.11,.15,.03,pg,0,0,0);tome.add(boxm(.12,.16,.015,cv,0,0,-.02),boxm(.12,.16,.015,cv,0,0,.02),pg2,sph(.012,1,1,1,gl,0,0,.03));tome.add(tor_(.08,.004,chn,0,0,0,Math.PI/2,0,0));F.g.add(tome);
  const rings=new T.Group(),rm=new T.MeshBasicMaterial({color:0xb060ff,fog:false,transparent:true,opacity:.75,blending:T.AdditiveBlending,depthWrite:false});[0,1,2].forEach(i=>{const r=tor_(.45+i*.12,.006,rm,0,0,0,Math.PI/2*(i%2?.5:1)+i*.5,0,i*.9);rings.add(r)});F.g.add(rings);
  const sl=seal(F,s,31,"#b060ff",0xffffff,HY+.5,.55);
  wrapAnim(F,(F,dt)=>{const k=F.g.scale.x||1;tome.position.set(Math.cos(F.t*.7)*.5/k,(1.3+Math.sin(F.t*1.4)*.1)/k,Math.sin(F.t*.7)*.5/k+.1/k);tome.rotation.y=-F.t*.7+1.57;rings.position.y=1.3/k;rings.children.forEach((r,i)=>{r.rotation.z+=dt*(.6+i*.3);r.rotation.x+=dt*.2*(i%2?1:-1)});rings.scale.setScalar(1/k);sl.rotation.z=F.t*.5;cape.rotation.x=.05*Math.sin(F.t*1.1)});F.tele=function(){this.atk=.9};return F};
 /* ---- detail pass: the Chorus sings in visible waves, the Tetramorph carries wheels of eyes and coals ---- */
 {const _ch=ABOM.chorus;ABOM.chorus=function(c){
  const F=_ch(c),s=sk(F),veil=M(0xe8e2d4,{r:.95,side:2,e:0x303040,ei:.2}),tooth=M(0xf4f0e4,{r:.4}),bead=M(0xf0e0a0,{e:0xa08030,ei:.5,m:.6,r:.3});
  const vs=strips(s,"Head",[[.1,HY+.05,-.04,1.1,.12],[-.1,HY+.05,-.04,1.0,-.12],[.0,HY+.08,-.1,1.3,0],[.14,HY,.0,.8,.25],[-.14,HY,.0,.85,-.25]]);vs.forEach(g=>{g.children[0].material=veil;g.children[0].scale.x=2.4});
  const ch=new T.Group();for(let i=0;i<24;i++){const a=(i/24-.5)*3.4;ch.add(sph(.014,1,1,1,bead,Math.sin(a)*.3,1.45-Math.abs(a)*.09,.12+Math.cos(a)*.08))}
  for(let i=0;i<10;i++)ch.add(cone(.006,.05,tooth,(i%5-2)*.04,1.1+Math.floor(i/5)*.2,.17,Math.PI,0,0,3));attach(s,"spine_03",ch);
  const waves=new T.Group(),wm=[];for(let i=0;i<3;i++){const m=new T.MeshBasicMaterial({color:0xa0d8ff,fog:false,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false,side:2}),r=new T.Mesh(new T.TorusGeometry(.4,.008,5,32),m);r.rotation.x=Math.PI/2;waves.add(r);wm.push(m)}F.g.add(waves);
  wrapAnim(F,(F,dt)=>{vs.forEach((g,i)=>{g.rotation.x=.1+.14*Math.sin(F.t*1.3+i*1.2)});const k=F.g.scale.x||1;waves.position.y=1.3/k;wm.forEach((m,i)=>{const t=(F.t*.45+i/3)%1;waves.children[i].scale.setScalar((.6+t*2.4)/k*k);waves.children[i].position.y=(i-1)*.0;m.opacity=.55*(1-t)})});
  return F}}
 {const _tm=ABOM.tetramorph;ABOM.tetramorph=function(c){
  const F=_tm(c),s=sk(F),eyes=F.eyes||[],gold=M(0xe8c050,{m:.9,r:.25,e:0x805010,ei:.4}),coal=new T.MeshBasicMaterial({color:0xff8a20,fog:false}),fire=new T.MeshBasicMaterial({color:0xffd070,fog:false,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false});
  const wh=new T.Group();[0,1].forEach(k=>{const w=new T.Group(),R=.7+k*.35;w.add(tor_(R,.025,gold,0,0,0,Math.PI/2,0,0));w.add(tor_(R-.08,.012,gold,0,0,0,Math.PI/2,0,0));for(let i=0;i<8;i++){const a=i/8*6.283;w.add(cyl_(.01,.01,R,gold,Math.cos(a)*R/2,0,Math.sin(a)*R/2,Math.PI/2,-a+Math.PI/2,0));const e=eye(.045,[0xffe070,0x70c0ff,0xff7050][i%3],eyes,false);e.position.set(Math.cos(a)*R,0,Math.sin(a)*R);e.rotation.y=Math.PI/2-a;w.add(e)}wh.add(w)});wh.position.y=.35;F.g.add(wh);
  const co=new T.Group();for(let i=0;i<6;i++){const c1=new T.Group();c1.add(sph(.045,1,1,1,coal,0,0,0));c1.add(glow(0xff8a20,.35));co.add(c1)}F.g.add(co);
  const ring=new T.Group();ring.add(tor_(.3,.012,gold,0,0,0,Math.PI/2,0,0));for(let i=0;i<24;i++){const a=i/24*6.283;ring.add(boxm(.012,.03,.006,fire,Math.cos(a)*.3,0,Math.sin(a)*.3,0,-a,0))}ring.position.set(0,HY+.28,-.04);attach(s,"Head",ring);
  const book=new T.Group();book.add(boxm(.2,.26,.04,M(0x7a1a1a,{r:.5}),0,0,0));for(let i=0;i<7;i++)book.add(sph(.014,1,1,1,coal,-.075+i*.025,0,.025));book.position.set(.35,1.2,.3);attach(s,"spine_03",book);
  wrapAnim(F,(F,dt)=>{const k=F.g.scale.x||1;wh.children[0].rotation.y=F.t*.5;wh.children[1].rotation.y=-F.t*.35;wh.scale.setScalar(1);co.children.forEach((c1,i)=>{const a=F.t*1.1+i*1.047;c1.position.set(Math.cos(a)*1.0/k*k,(1.7+Math.sin(F.t*2+i)*.15),Math.sin(a)*1.0/k*k)});ring.rotation.y=F.t*.4;book.rotation.y=Math.sin(F.t*.9)*.2});
  return F}}
 /* register the new monsters */
 const reg=(rx,cfg)=>{MC.unshift([rx,Object.assign({g:"m",s:1,hunch:0},cfg)])};
 reg(/Ophanim/,{build:"ophanim",float:1,far:0});
 reg(/Seraph/,{build:"seraph",float:1});
 reg(/Argus/,{build:"argus"});
 reg(/Chorus/,{build:"chorus",float:0});
 reg(/Tetramorph/,{build:"tetramorph"});
 reg(/Jackal Priest/,{build:"jackalPriest"});
 reg(/Goat-headed/,{build:"goatPriest"});
 reg(/Dagon/,{build:"fishPriest"});
 reg(/Asura/,{build:"asura"});
 reg(/Mummy/,{build:"mummy"});
 reg(/Bog Hag/,{build:"bogHag"});
 reg(/Frost Giant/,{build:"frostGiant"});
 reg(/Cave Troll/,{build:"caveTroll"});
 reg(/Rotted Woodsman/,{build:"woodsman"});
 reg(/Drowned Dead/,{build:"drowned"});
 reg(/Ice Draugr/,{build:"draugr"});
 const add=(b,row)=>{if(typeof FOES!=="undefined"&&FOES[b]&&!FOES[b].some(r=>r[0]===row[0]))FOES[b].push(row)};
 add("forest",["Argus, Hundred-Eyed",56,14,6,2,6,1,300,2,"#c8c0b8","gaze"]);
 add("swamp",["Argus, Hundred-Eyed",56,14,6,2,6,1,300,3,"#c8c0b8","gaze"]);
 add("desert",["Asura",48,15,7,2,6,2,230,2,"#a02030","multi"]);
 add("mountain",["Asura",50,15,7,2,6,2,240,3,"#a02030","multi"]);
 add("forest",["The Chorus",34,12,5,1,6,2,150,2,"#c0d8f0","whisper"]);
 add("swamp",["The Chorus",34,12,5,1,6,2,150,2,"#c0d8f0","whisper"]);
 add("forest",["Tetramorph",78,16,7,2,8,3,400,3,"#e8d890","blind"]);
 add("hills",["Tetramorph",78,16,7,2,8,3,400,3,"#e8d890","blind"]);
 add("desert",["Jackal Priest",36,14,6,1,8,3,150,2,"#d0a040","drain"]);
 add("hills",["Goat-headed Priest",42,14,6,1,10,3,170,2,"#a08060","fear"]);
 add("mountain",["Goat-headed Priest",42,14,6,1,10,3,170,2,"#a08060","fear"]);
 add("swamp",["Dagon's Priest",40,13,6,1,8,3,160,2,"#4a8a8a","whisper"]);
 add("tundra",["Dagon's Priest",40,13,6,1,8,3,160,2,"#4a8a8a","whisper"]);
 add("tundra",["Seraph",70,16,7,2,8,2,380,3,"#f0e0a0","blind"]);
 add("hills",["Ophanim",60,17,6,1,8,3,340,3,"#ffb040","gaze"]);
 add("mountain",["Ophanim",60,17,6,1,8,3,340,3,"#ffb040","gaze"]);

 /* ---------- regional variety: every land gets its own horrors ---------- */
 reg(/Dire Wolf/,{rig:"beast",s:1.75,cloth:0x24201c,pants:0x4a3a30,eye:0xff2010});
 reg(/Goblin Shaman/,{s:.74,skin:0x4a7a2a,cloth:0x5a2a5a,pants:0x2a1430,hair:null,acc:["Ears_pointed","Hat_cone","Staff","Fangs","Claws"],eye:0xc060ff});

 reg(/Rime Hound/,{rig:"beast",s:1.1,cloth:0x8ab4d4,pants:0xdcecf8,eye:0xa0f0ff});
 reg(/Orc Shaman/,{s:1.1,skin:0x3f6a2e,cloth:0x4a1a1a,pants:0x2a1010,hair:null,acc:["Tusks","Robe","Staff","Horns_big","Scar"],eye:0xff5030});
 reg(/Goblin Sapper/,{s:.7,skin:0x6a8a3a,cloth:0x6a4a1a,pants:0x2a1e12,hair:null,hat:0x3a3a3a,acc:["Ears_pointed","Cap","Dagger","Fangs","Claws"],eye:0xffe040});
 reg(/Sand Cultist/,{s:1.02,skin:0xb08a68,cloth:0xb09050,pants:0x6a5428,hair:null,acc:["Hood","Robe","Dagger","Scar"],eye:0xffd060});
 reg(/Bone Legionary/,{build:"skelLegion"});
 reg(/Sand Hound/,{rig:"beast",s:1.2,cloth:0xb09868,pants:0xd8c898,eye:0xffc030});
 reg(/Hill Ogre/,{s:2.0,w:1.25,skin:0xa8886a,cloth:0x6a4a30,pants:0x3a2a1c,hair:0x2a1a10,acc:["Club","Tusks","Scar","Claws"],eye:0xff8030});
 reg(/Crag Witch/,{s:1.02,hunch:.25,skin:0xb8a8b0,cloth:0x3a2a4a,pants:0x241a34,hair:0xd8d0e0,hat:0x241a34,acc:["Robe","Hat_cone","Staff","Scar","Fangs"],eye:0xd070ff});
 reg(/Hill Ogre/,{build:"hillOgre"});reg(/Crag Witch/,{build:"cragWitch"});reg(/Orc Shaman/,{build:"orcShaman"});reg(/Goblin Sapper/,{build:"goblinSapper"});reg(/Sand Cultist/,{build:"sandCultist"});
 reg(/Bael Revenant/,{build:"baelRevenant"});reg(/Furfur/,{build:"furfurStag"});reg(/Andras/,{build:"andrasOwl"});reg(/Bifrons/,{build:"bifronsCandle"});reg(/Eligos/,{build:"eligosBanner"});reg(/Decan Shade/,{build:"decanShade"});
 reg(/^Goblin$/,{build:"goblinClassic"});reg(/^Orc Raider$/,{build:"orcRaider"});reg(/^Dark Magician$/,{build:"darkMagi"});
 reg(/Bloodied Reaver/,{s:1.14,w:1.1,skin:0xb08060,cloth:0x6a1a1a,pants:0x2a1010,hair:0x1a0a08,acc:["Axe","Spikes","Scar","Helm"],eye:0xff2010});
 const V=(b,n,hp,ac,at,dn,ds,db,xp,t,col,sp,u)=>add(b,[n,hp,ac,at,dn,ds,db,xp,t,col,sp||"",u?1:0].slice(0,u?12:11));
 V("forest","Dire Wolf",18,13,5,1,8,3,75,1,"#3a3a3a");
 V("forest","Rotted Woodsman",20,11,5,1,8,2,80,1,"#7a8a62","drain",1);
 V("forest","Goblin Shaman",12,12,4,1,6,2,50,1,"#9a40a0","drain");
 V("tundra","Ice Draugr",30,14,6,1,8,3,120,2,"#9ac0d0","drain",1);
 V("tundra","Rime Hound",14,13,5,1,8,2,55,0,"#cfe4f4");
 V("tundra","Frost Giant",60,15,7,2,8,4,260,3,"#a8c4d8");
 V("mountain","Cave Troll",58,14,7,2,8,4,250,3,"#6a7a5a");
 V("mountain","Orc Shaman",20,13,5,1,6,2,85,2,"#8a2a2a","fear");
 V("mountain","Goblin Sapper",8,12,4,1,6,2,35,0,"#6a8a3a");
 V("swamp","Drowned Dead",22,12,5,1,8,2,85,1,"#6a8a82","drain",1);
 V("swamp","Bog Hag",26,13,6,1,6,3,115,2,"#6a8a5a","charm");
 V("desert","Sand Cultist",18,13,5,1,6,2,70,1,"#b09050","whisper");
 V("desert","Bone Legionary",30,15,6,1,8,3,125,2,"#e4dcc4","",1);
 V("swamp","Bael Revenant",52,14,7,2,6,3,260,3,"#5a6a3a","fear",1);
 V("hills","Furfur Stag-Wight",34,13,6,1,8,3,150,2,"#ff7a20","drain",1);
 V("mountain","Andras Owl-Reaper",36,14,6,1,10,3,165,2,"#8a8a94","fear",1);
 V("forest","Bifrons Candle-Corpse",22,12,5,1,6,2,95,1,"#e8dcb0","drain",1);
 V("desert","Eligos Standard-Bearer",40,15,6,1,10,3,180,2,"#6a1a1a","fear",1);
 V("desert","Decan Shade",46,14,7,1,8,4,230,3,"#90c8ff","drain",1);
 V("desert","Sand Hound",12,13,4,1,6,2,45,0,"#d8c898");
 V("hills","Hill Ogre",44,13,6,2,6,4,170,2,"#a8886a");
 V("hills","Crag Witch",24,12,5,2,6,2,110,2,"#b8a8b0","fear");
 V("hills","Bloodied Reaver",26,14,6,1,10,3,100,1,"#b08060");
})();

/* ===== spell lights and lightning ===== */
(function(){
 if(typeof THREE==="undefined"||typeof fx3==="undefined")return;
 const FX=[];
 const colFor=nm=>/Fire|Flame|Burn|Meteor|Scorch/i.test(nm)?0xff6a20:/Frost|Ice|Cold|Chill/i.test(nm)?0x80d0ff:/Light|Shock|Thunder|Bolt|Storm|Spark/i.test(nm)?0xc8e0ff:/Turn|Smite|Holy|Sacred|Radiant|Sun|Heal|Cure|Bless/i.test(nm)?0xfff0b0:/Poison|Acid|Venom/i.test(nm)?0x80ff50:0xb080ff;
 function bolt(a,b,col,w){
  const n=16,dir=b.clone().sub(a),len=dir.length(),side=new THREE.Vector3(-dir.z,0,dir.x).normalize(),up=new THREE.Vector3(0,1,0),pts=[];
  for(let i=0;i<=n;i++){const t=i/n,j=(i===0||i===n)?0:(1-Math.abs(t-.5)*.6)*len*.045;pts.push(a.clone().lerp(b,t).addScaledVector(side,(Math.random()-.5)*2*j).addScaledVector(up,(Math.random()-.5)*2*j))}
  camera.getWorldDirection(_p);const rt=new THREE.Vector3().crossVectors(_p,up).normalize(),wd=w===0?.05:.022,pos=[],idx=[];
  pts.forEach((q,i)=>{pos.push(q.x+rt.x*wd,q.y+rt.y*wd,q.z+rt.z*wd,q.x-rt.x*wd,q.y-rt.y*wd,q.z-rt.z*wd);if(i<n){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}});
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);
  const m=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthTest:false,fog:false,side:THREE.DoubleSide});
  const l=new THREE.Mesh(g,m);l.renderOrder=20;l.frustumCulled=false;scene.add(l);FX.push({o:l,m,t:0,life:.3,w})}
 function light(pos,col,I,life,dist){const l=new THREE.PointLight(col,I,dist||9);l.position.copy(pos);scene.add(l);FX.push({o:l,l,t:0,life,I})}
 const _sf=fx3.sf;
 fx3.sf=function(k){
  _sf.apply(this,arguments);
  if(k!=="spell")return;
  try{const nm=(typeof curSpell==="string"?curSpell:"")||"",col=colFor(nm);
   camera.getWorldDirection(_p);const fr=camera.position.clone().addScaledVector(_p,.7);fr.y-=.25;
   light(fr,col,3.2,.7,7);
   if(this.g){const to=this.ctr().clone();
    if(/Light|Shock|Thunder|Bolt|Storm|Spark/i.test(nm)){
     const rr=new THREE.Vector3().crossVectors(_p,new THREE.Vector3(0,1,0)).normalize(),from=camera.position.clone().addScaledVector(_p,.7).addScaledVector(rr,.32);from.y-=.32;
     for(let i=0;i<4;i++)bolt(from,to,i<1?0xffffff:col,i);
     light(to,0xe0f0ff,3,.3,10);flash("rgba(220,235,255,.28)");
     if(typeof vfx!=="undefined")vfx.burst(to,0xaad0ff,18,4,.12,.35,0)}
    else light(to,col,2.4,.6,6)}
  }catch(e){}};
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);
  for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t+=dt;const k=Math.max(0,1-f.t/f.life);
   if(f.l)f.l.intensity=f.I*k*k;
   if(f.m){f.m.opacity=k*(f.w?.55:1)*(Math.random()<.35?.4:1)}
   if(f.t>=f.life){scene.remove(f.o);if(f.o.geometry)f.o.geometry.dispose();FX.splice(i,1)}}};
})();

/* ===== creature voices: growls, roars, hisses, breathing during combat ===== */
(function(){
 if(typeof fx3==="undefined")return;
 function kindOf(){const n=(typeof C!=="undefined"&&C&&C.e&&C.e.name)||"";
  if(/wolf|hound|dog|jackal|bear|panther|cat|lion/i.test(n))return"wolf";if(/hydra|dragon|drake|wyrm|serpent|snake|basilisk|lizard/i.test(n))return"roar";
  if(/scorpion|spider|insect|beetle|ant|centipede/i.test(n))return"hiss";if(/beholder|eye|demon|archon|bael|imp|devil|fiend/i.test(n))return"drone";
  if(/chorus|choir|priest/i.test(n))return"wail";if(/tetramorph/i.test(n))return"roar";if(/wraith|ghost|spectre|shade|banshee|lich|skeleton|zombie|mummy|ghoul|undead/i.test(n)||(C&&C.e&&C.e.undead))return"wail";
  if(/giant|ogre|troll|yeti|golem/i.test(n))return"roar";return"grunt"}
 function noiseBuf(d){const n=Math.floor(ac.sampleRate*d),b=ac.createBuffer(1,n,ac.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;return b}
 function osc(type,f1,f2,d,vol,lp,lfo,lfoD,t0){const o=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();o.type=type;f.type="lowpass";f.frequency.value=lp||600;
  o.frequency.setValueAtTime(f1,t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t0+d);
  if(lfo){const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=lfo;lg.gain.value=lfoD||.5*vol;l.connect(lg);lg.connect(g.gain);l.start(t0);l.stop(t0+d+.1)}
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+Math.min(.08,d*.25));g.gain.exponentialRampToValueAtTime(.0004,t0+d);o.connect(f);f.connect(g);g.connect(master);o.start(t0);o.stop(t0+d+.05)}
 function nz(d,vol,type,fr,q,t0,sweepTo){const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf(d);f.type=type;f.frequency.setValueAtTime(fr,t0);if(sweepTo)f.frequency.exponentialRampToValueAtTime(sweepTo,t0+d);f.Q.value=q||1;
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+d*.2);g.gain.exponentialRampToValueAtTime(.0004,t0+d);s.connect(f);f.connect(g);g.connect(master);s.start(t0);s.stop(t0+d+.05)}
 function voice(k,what){try{if(!on||!ac||!master)return;const t=ac.currentTime+.01;
  if(what==="breath"){const v=.05;if(k==="wolf"){nz(.9,v*1.4,"bandpass",500,.9,t,260);nz(.9,v*1.1,"bandpass",300,1,t+1.1,600)}
    else if(k==="roar"){nz(1.4,v*1.6,"lowpass",260,1,t,110)}else if(k==="hiss"){nz(.7,v*1.1,"highpass",4200,.7,t)}else if(k==="drone"){osc("sawtooth",48,46,2.6,.05,170,5,.02,t);osc("sawtooth",50.5,49,2.6,.04,170,0,0,t)}
    else if(k==="wail"){osc("sine",190,150,1.8,.025,500,4,.012,t);nz(1.5,.025,"bandpass",1200,2,t,500)}else{nz(.8,v,"bandpass",420,1,t,220)}return}
  const d={spawn:1,strike:.8,hit:.55,die:1.6}[what]||.8,pw=what==="strike"?1.25:what==="die"?1.0:what==="hit"?.8:1;
  if(k==="wolf"){osc("sawtooth",what==="hit"?520:110,what==="hit"?260:58,d,.16*pw,what==="strike"?900:520,30,.06,t);osc("square",what==="hit"?600:150,what==="hit"?300:70,d*.9,.06*pw,500,38,.03,t);nz(d,.1*pw,"bandpass",what==="strike"?1400:700,1.2,t)}
  else if(k==="roar"){osc("sawtooth",95*(what==="hit"?1.6:1),38,d*1.5,.2*pw,420,22,.08,t);osc("sawtooth",98,44,d*1.5,.12*pw,300,0,0,t);nz(d*1.4,.14*pw,"lowpass",600,.8,t,180)}
  else if(k==="hiss"){nz(d,.12*pw,"highpass",3000,.8,t);if(what!=="hit")for(let i=0;i<5;i++)nz(.05,.09,"bandpass",2400+i*180,6,t+.07*i);else osc("square",1500,700,.18,.05,3000,0,0,t)}
  else if(k==="drone"){osc("sawtooth",58,40,d*1.5,.16*pw,260,6,.07,t);osc("sawtooth",61.5,41.5,d*1.5,.12*pw,260,0,0,t);osc("sine",what==="hit"?900:333,what==="hit"?500:150,d,.05*pw,2000,9,.02,t);nz(d,.07*pw,"bandpass",350,3,t)}
  else if(k==="wail"){osc("sine",260,170,d*1.4,.1*pw,900,6,.04,t);osc("sawtooth",263,168,d*1.4,.04*pw,700,5,.02,t);nz(d,.05*pw,"bandpass",1500,3,t,400)}
  else {osc("sawtooth",what==="hit"?300:130,what==="hit"?150:75,d,.17*pw,700,16,.05,t);nz(d*.7,.09*pw,"bandpass",900,1.5,t)}
 }catch(e){}}
 window.MV=function(w){try{voice(kindOf(),w)}catch(e){}};
 const W=(n,tag,delay)=>{const o=fx3[n];if(typeof o!=="function")return;fx3[n]=function(){const r=o.apply(this,arguments);try{if(!delay)voice(kindOf(),tag);else setTimeout(()=>voice(kindOf(),tag),delay)}catch(e){}return r}};
 W("spawn","spawn",350);W("strike","strike",120);W("hit","hit",0);W("die","die",0);
 setInterval(()=>{try{if(typeof C!=="undefined"&&C&&!C.over&&fx3.g&&!document.hidden)voice(kindOf(),"breath")}catch(e){}},3200);
})();

/* ===== Real-time combat: no turns, no engagements, no dice on screen. Foes hunt you in the world; you swing, block, dodge and cast live. ===== */
(function(){
 if(typeof startCombat==="undefined"||typeof fx3==="undefined")return;
 window.PACK=window.PACK||{m:0,max:2};
 const RT=window.RT={t:0,stun:0,block:false,blockT:0,atkCd:0,spCd:0,dodgeCd:0,inv:0,dash:null,stagger:0,fs:"chase",ft:0,cd:1,dead:0,endT:0,near:0,lastX:0,swingQ:null,nt:[],ntT:0,q:[]};
 /* ---------- sanctuary: monsters cannot enter or spawn in camp, towns, shrines, temples and occult grounds ---------- */
 let ZONES=null;
 function zones(){if(ZONES)return ZONES;ZONES=[{x:SX*TW+1,z:SY*TW+1,r:15}];
  POIS.forEach(p=>{if(p.hidden||p.k==="d")return;if(p.k==="v"||p.k==="s"||p.k==="t"||(typeof SITES!=="undefined"&&SITES[p.id]))ZONES.push({x:p.x*TW+1,z:p.y*TW+1,r:p.k==="v"?12:9})});return ZONES}
 RT.safe=(x,z)=>{if(DG)return false;const Z=zones();for(let i=0;i<Z.length;i++){const q=Z[i];if((x-q.x)*(x-q.x)+(z-q.z)*(z-q.z)<q.r*q.r)return true}return false};
 RT.zones=zones;
 const hpos=()=>DG?dgCam:P;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const live=()=>!!(C&&C.rt&&!C.over);
 RT.busy=()=>!!(C&&C.rt);
 /* ---------- styles and HUD ---------- */
 const st=document.createElement("style");st.textContent=
 "#rtfoe{position:absolute;left:50%;top:46px;transform:translateX(-50%);min-width:210px;max-width:60%;text-align:center;z-index:3;pointer-events:none;display:none;font:700 .85rem Cinzel,serif;color:#f6ecd0;text-shadow:0 1px 3px #000}"+
 "#rtfoe .b{height:9px;margin-top:3px;background:rgba(0,0,0,.6);border:1px solid #3a3f86;border-radius:5px;overflow:hidden}#rtfoe .b i{display:block;height:100%;width:100%;background:linear-gradient(#e0516a,#9c2a44);transition:width .15s}"+
 "#rtbar{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:none;gap:5px;z-index:5;align-items:flex-end;flex-wrap:nowrap;justify-content:center;max-width:98%}"+
 "#rtbar button{min-width:40px;height:40px;border-radius:20px;border:1px solid #e8b04a;background:rgba(18,20,56,.82);color:#f6ecd0;font:700 .66rem Cinzel,serif;padding:0 8px;cursor:pointer;touch-action:none;user-select:none;white-space:nowrap}"+
 "#rtbar button.big{height:52px;min-width:52px;border-radius:26px;background:rgba(150,40,60,.9);font-size:.85rem}#rtbar button:disabled{opacity:.35}#rtbar button.on{background:#e8b04a;color:#14102c}"+
 "@media (hover:hover) and (pointer:fine){#rtbar{pointer-events:none}#rtbar button{cursor:default}}"+
 "#rtbar small{display:block;font:400 .55rem sans-serif;opacity:.75}@media(max-width:700px){#rtbar small{display:none}#rtbar button{min-width:36px;height:36px;padding:0 6px}}";
 document.head.appendChild(st);
 const cw=document.getElementById("view").parentNode;
 const foeBox=document.createElement("div");foeBox.id="rtfoe";foeBox.innerHTML='<span></span><div class="b"><i></i></div>';cw.appendChild(foeBox);
 const bar=document.createElement("div");bar.id="rtbar";cw.appendChild(bar);
 /* ---------- quiet notifications (loot, XP, level) ---------- */
 const note=t=>{RT.nt.push(t);if(!RT.ntT)RT.ntT=setTimeout(()=>{RT.ntT=0;const s=RT.nt.join(" ");RT.nt=[];try{say(s)}catch(e){}},260)};
 const KEEP=/^Loot:|XP|level|talent|sprig|restores you|Level/;
 clog=function(t){if(C){C.lines.push(t);if(C.lines.length>9)C.lines.shift()}if(KEEP.test(String(t)))note(String(t))};
 rc=function(){};
 /* ---------- helpers ---------- */
 const kindOf=n=>/Wolf|Scorpion|Imp|Dust Demon|Seraph|Hound|Sapper|Reaver/.test(n)?"fast":/Mummy|Giant|Yeti|Hydra|Wraith|Argus|Ophan|Troll|Ogre|Draugr|Hag|Drowned|Woodsman|Legionary/.test(n)?"slow":"norm";
 const SPD={fast:4.3,norm:2.9,slow:1.9};
 const rangedOf=n=>/Archer|Magician|Beholder|Witch|Wraith|Nymph|Ophan|Seraph|Chorus|Argus/.test(n);
 const reachOf=sc=>1.35+.5*Math.min(2.2,sc);

 /* ---------- telegraphs: every attack shows its shape on the ground while it winds up ---------- */
 const TK={strike:0xff5030,lunge:0xffa020,slam:0xff2020,pulse:0xb070ff,bolt:0x60d0ff};
 let TG0=null;const TGf=()=>TG0||(TG0=(function(){const g=new THREE.Group();g.visible=false;g.renderOrder=998;
  const mk=(geo,col)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.3,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));m.renderOrder=998;m.rotation.x=-Math.PI/2;return m};
  const disc=mk(new THREE.CircleGeometry(1,40),0xff5030),fill=mk(new THREE.CircleGeometry(1,40),0xff5030),ring=mk(new THREE.RingGeometry(.94,1,48),0xffffff);
  const box=mk(new THREE.PlaneGeometry(1,1),0xff5030),bfill=mk(new THREE.PlaneGeometry(1,1),0xff5030);
  ring.material.opacity=.85;fill.material.opacity=.5;bfill.material.opacity=.5;
  [disc,fill,ring,box,bfill].forEach(o=>g.add(o));scene.add(g);return{g,disc,fill,ring,box,bfill}})());
 const TGp={get g(){return TGf().g},get disc(){return TGf().disc},get fill(){return TGf().fill},get ring(){return TGf().ring},get box(){return TGf().box},get bfill(){return TGf().bfill}};
 function tgHide(){TGp.g.visible=false}
 function atkKindOf(e,rngd){const n=e.name;
  if(/Tetramorph/.test(n)){const k=["strike","lunge","slam","pulse"][(RT.tcount=(RT.tcount||0)+1)%4];return k}
  if(rngd)return"bolt";
  if(RT.pulser)return"pulse";
  if(/Priest/.test(n))return Math.random()<.5?"pulse":"strike";
  if(C.boss||/Giant|Hydra|Mummy|Yeti|Golem|Ogre|Troll/.test(n))return Math.random()<.6?"slam":"strike";
  if(RT.lunger)return toFoe().d>reachOf(foeSc())+.7||Math.random()<.5?"lunge":"strike";
  return"strike"}
 const TDUR={strike:0,lunge:.06,slam:.3,pulse:.22,bolt:.1};
 function tgShape(){const k=RT.ak,b=fx3.base,sc=foeSc(),reach=reachOf(sc);
  let gy=DG?0:Math.max(hfn(b.x,b.z),-.3);TGp.g.position.set(b.x,gy+.08,b.z);TGp.g.rotation.set(0,0,0);
  const circ=(r)=>{TGp.disc.visible=TGp.fill.visible=TGp.ring.visible=true;TGp.box.visible=TGp.bfill.visible=false;TGp.disc.scale.set(r,r,1);TGp.ring.scale.set(r,r,1);RT.tr=r};
  const line=(len,w)=>{TGp.disc.visible=TGp.fill.visible=TGp.ring.visible=false;TGp.box.visible=TGp.bfill.visible=true;RT.tl=len;RT.tw=w};
  if(k==="strike")circ(reach+.9);else if(k==="slam")circ(Math.max(3.4,2.6+sc*1.1));else if(k==="pulse")circ(5.2);
  else if(k==="lunge")line(reach+3.4,1.5);else line(15,1.2);
  const col=TK[k];[TGp.disc,TGp.fill,TGp.box,TGp.bfill].forEach(o=>o.material.color.setHex(col));TGp.g.visible=true}
 function tgUpdate(p){
  const k=RT.ak,hot=p>.8?(p-.8)/.2:0,op=.22+.2*Math.sin(p*18);
  if(k==="lunge"||k==="bolt"){
   if(RT.ft>RT.ftMax*.35){const t=toFoe();RT.aim=[-t.dx/t.d,-t.dz/t.d]}
   const a=RT.aim,ang=Math.atan2(a[0],a[1]);TGp.g.rotation.y=ang;
   const L=RT.tl,W=RT.tw;
   TGp.box.rotation.set(-Math.PI/2,0,0);TGp.bfill.rotation.set(-Math.PI/2,0,0);
   TGp.box.scale.set(W,L,1);TGp.box.position.set(0,0,L/2);TGp.bfill.scale.set(W,L*p,1);TGp.bfill.position.set(0,.01,L*p/2);
   TGp.box.material.opacity=op;
  }else{const r=RT.tr;TGp.fill.scale.set(r*p,r*p,1);TGp.disc.material.opacity=op;TGp.ring.scale.set(r,r,1)}
  TGp.fill.material.color.setHex(TK[k]);TGp.bfill.material.color.setHex(TK[k]);
  if(hot>0){TGp.fill.material.color.lerp(new THREE.Color(0xffffff),hot);TGp.bfill.material.color.lerp(new THREE.Color(0xffffff),hot)}}
 function foeSc(){return fx3.g?fx3.g.scale.y:1}
 function foeFig(){return fx3.g&&fx3.g.userData.fig}
 function glow(k,col){const g=fx3.g;if(!g||!g.userData.mats)return;if(fx3.hitT>0)return;g.userData.mats.forEach(m=>{if(m.emissive){m.emissive.setRGB((col?col[0]:.9)*k,(col?col[1]:.35)*k,(col?col[2]:0)*k);m.emissiveIntensity=k>0?1.1:0}})}
 function toFoe(){const b=fx3.base,p=hpos();const dx=b.x-p.x,dz=b.z-p.z;return{dx,dz,d:Math.hypot(dx,dz)||.001}}
 function inFront(maxD,cosMin,extra){if(!fx3.g||C.e.hp<=0)return false;const t=toFoe();if(t.d-.5*foeSc()>maxD)return false;const fx=-Math.sin(yaw),fz=-Math.cos(yaw);return (t.dx*fx+t.dz*fz)/t.d>=cosMin}
 const wKind=()=>{const w=((hero.eq&&hero.eq.w)||"").toLowerCase();return/bow|sling/.test(w)?"bow":/dagger|knife|wand|rapier/.test(w)?"fin":/hammer|axe|great|maul|flail/.test(w)?"heavy":"norm"};
 const WCD={bow:.55,fin:.3,heavy:.6,norm:.44};
 const WRCH={bow:16,fin:2.4,heavy:2.9,norm:2.6};
 /* ---------- start ---------- */
 const _start=startCombat;
 startCombat=function(f,tier,after,opts){
  if(C&&!C.over)return;opts=opts||{};
  const story=!!after||!!opts.story;if(!story&&!DG&&(RT.safe(P.x,P.z)||(opts.at&&RT.safe(opts.at.x,opts.at.z))))return;
  const e={name:f[0],hp:f[1],max:f[1],ac:f[2],atk:f[3],dn:f[4],ds:f[5],db:f[6],xp:f[7],col:f[9],sp:f[10]||"",undead:!!f[11],skip:0};
  try{const d=(hero&&hero.diff)||"Normal";if(d==="Gentle"){e.hp=e.max=Math.max(1,Math.round(e.max*.7));e.atk=Math.max(0,e.atk-1)}else if(d==="Hard"){e.hp=e.max=Math.round(e.max*1.3);e.atk+=1;e.xp=Math.round(e.xp*1.25)}}catch(x){}
  C={rt:1,story,e,tier,after,ward:0,bless:0,lost:0,over:false,busy:false,menu:null,lines:[],used:{},won:0,dead:0,fh:0,fd:0,near:0};
  const boss=!!(DG&&DG.th&&f[0]===DG.th.boss);C.boss=boss||/Archon|Bael/.test(f[0]);
  try{if(hero.occ&&hero.occ.fort>0){C.fh+=2;hero.occ.fort--}}catch(x){}
  try{if(hero.fate){const k=hero.fate.k;if(k==="hit")C.fh=2;else if(k==="hit-")C.fh=-1;else if(k==="dmg")C.fd=2;else if(k==="ac")C.ward+=2;else if(k==="bad-ac")C.ward-=1;else if(k==="foe-")e.atk-=2;else if(k==="foe+")e.atk+=1;hero.fate=null}}catch(x){}
  try{if(hero.tl){if(hero.tl.S3)C.ward+=3;if(hero.tl.J2)C.fh+=1;if(hero.tl.M2)C.fhOnce=3}}catch(x){}
  fx3.spawn(f);const g=fx3.g;
  if(!g){C=null;return}
  try{if(window.AGE)AGE.foe(g,f[0],boss)}catch(x){}
  /* place the foe in the world */
  let x,z,found=false;
  if(DG){const d=DIMS[DG.s.r][1];x=0;z=-d/2+3.2}
  else if(opts.at){x=opts.at.x;z=opts.at.z}
  else{for(let k=0;k<40&&!found;k++){const a=yaw+(Math.random()-.5)*(k<20?1.8:6.28),dist=(k<20?13:9)+Math.random()*5;x=P.x-Math.sin(a)*dist;z=P.z-Math.cos(a)*dist;
    if(x>2&&z>2&&(story||!RT.safe(x,z))&&!blocked(x,z,.8)&&hfn(x,z)>-.2&&!blocked((P.x+x)/2,(P.z+z)/2,.4))found=true}
   if(!found){x=P.x-Math.sin(yaw)*6;z=P.z-Math.cos(yaw)*6}}
  fx3.base.set(x,DG?0:Math.max(hfn(x,z),-.3),z);g.position.copy(fx3.base);fx3.lungeAmp=.75;
  RT.q.length=0;RT.fs="chase";RT.ft=0;RT.cd=1.2;RT.stagger=0;RT.stun=0;RT.block=false;RT.dead=0;RT.endT=0;RT.atkCd=0;RT.spCd=0;RT.dodgeCd=0;RT.inv=0;RT.dash=null;RT.swingQ=null;RT.lastHit=0;RT.pulser=/Chorus|Ophan|Seraph|Archon|Bael/.test(f[0]);RT.lunger=/Wolf|Hound|Scorpion|Imp|Demon|Orc|Goblin|Dwarf|Paladin|Jackal|Reaver|Cultist/.test(f[0]);RT.rngd=rangedOf(f[0])&&!RT.pulser;RT.kind=kindOf(f[0]);RT.singShown=0;RT.ak=null;RT.tcount=0;tgHide();
  if(DG)$("dng").hidden=true;
  try{if(!localStorage.getItem('occultica.rthint')){localStorage.setItem('occultica.rthint','1');setTimeout(()=>note('Click or F to swing. Hold Q or right-click to block. Space to dodge. 1-6 cast. H heals.'),2200)}}catch(x){}
  buildBar();bar.style.display="flex";foeBox.style.display="block";
  const b=toFoe(),fx=-Math.sin(yaw),fz=-Math.cos(yaw);if((b.dx*fx+b.dz*fz)/b.d<.2)note("A "+f[0]+" comes for you.");
  try{hud()}catch(x2){}
  return C};
 /* ---------- hero actions ---------- */
 const OB=k=>window.OMEN?OMEN.b(k):0,OM=k=>window.OMEN?OMEN.m(k):1;
 const POW=()=>2+Math.floor(((hero&&hero.level)||1)*.6)+OB("dmg");
 RT.wdmg=()=>{const g=gear().w||{d:[1,2]},m=g.f?Math.max(mod(AT().STR),mod(AT().DEX)):mod(AT().STR);return Math.max(2,roll(g.d[0]*2,g.d[1])+m+(g.b||0)+(C.fd||0)+POW())};
 function heroHit(o){
  o=o||{};const e=C.e,g=gear().w||{d:[1,2]},m=g.f?Math.max(mod(AT().STR),mod(AT().DEX)):mod(AT().STR);
  let bonus=OB("hit")+prof()+m+(g.h||0)+gsum("h")+(C.bless>0?2:0)+(C.fh||0)+(C.fhOnce||0);C.fhOnce=0;
  const r=atkRoll(bonus,e.ac);
  const c=fx3.ctr().clone();
  if(!r.hit){sfx("miss");try{dmgNum(r.fumble?"Fumble":"Miss","#cfcfcf",c,false)}catch(x){}return false}
  const cm=r.crit?2:1;let dmg=roll(g.d[0]*(o.dbl?2:1)*cm,g.d[1])+m+(g.b||0);
  if(o.extra)dmg+=roll(o.extra[0]*cm,o.extra[1]);dmg+=(C.fd||0);C.fdOnce&&(dmg+=C.fdOnce,C.fdOnce=0);
  if((hero.eq.w==="Sunblade of Dawn"||hero.eq.w==="Sword of the Blazing Star")&&e.undead)dmg+=roll(2,6);
  if(wKind()==="bow"&&hero.cls==="Ranger")dmg+=2;
  dmg=Math.max(1,dmg+POW());sfx("hit");if(window.PACK)PACK.m=1;
  {let am=null,pv=null;try{const w=hero.eq&&hero.eq.w;if(window.PCK&&w){const mm=PCK.mult(PCK.planetOfItem(w));if(mm.m>1){mm.m=Math.min(2.5,mm.m);am=Object.assign({label:w},mm);pv=PCK.AMP.cur;PCK.AMP.cur=am;if(RT.t-(RT.annT||-99)>9){RT.annT=RT.t;try{PCK.announce(mm,w)}catch(x){}}}}}catch(x){}
   try{foeDamage(dmg)}finally{if(am)PCK.AMP.cur=pv}}
  if(window.PACK){PACK.m=0;if(!o.nocleave)PACK.cleave(dmg)}
  if(C&&!C.over&&e.hp>0){if(!C.boss&&RT.fs==="wind")RT.fs="recover",RT.ft=.5,glow(0);RT.stagger=r.crit||dmg>=e.max*.3?.55:.28;
   /* knockback */
   const t=toFoe();if(t.d<4&&!(fx3.g.userData.far)){const kb=.35;tryMoveFoe(t.dx/t.d*kb,t.dz/t.d*kb)}}
  return true}
 weaponAttack=function(o){fx3.swing();if(!C||!C.rt||C.over)return;o=o||{};const k=wKind();
  if(!inFront(WRCH[k]+.4,k==="bow"?.9:.55)){sfx("miss");return}
  heroHit(o)};
 function doAttack(){
  if(!live()||RT.dead>0||RT.stun>0||RT.block)return;if(RT.atkCd>0){RT.atkBuf=.3;return}const k=wKind();
  RT.atkCd=WCD[k];fx3.swing();RT.swingQ=.06;RT.swingK=k}
 function assist(k){
  /* aim assist: soft-turn toward the best target in front of you and step in for the blow */
  try{const reach=WRCH[k]+(k==="bow"?0:1.6),cands=[];
   if(fx3.g&&C&&C.e&&C.e.hp>0){const t=toFoe();cands.push({x:fx3.base.x,z:fx3.base.z,d:t.d-.5*foeSc(),main:1})}
   if(window.PACK&&PACK.targets)PACK.targets().forEach(q=>cands.push(q));
   const p=hpos();let best=null,bs=9;
   cands.forEach(c=>{const dx=c.x-p.x,dz=c.z-p.z,dd=Math.hypot(dx,dz)||.001;if(c.d==null)c.d=dd-.5;if(c.d>reach)return;
    let a=Math.atan2(-dx,-dz)-yaw;while(a>Math.PI)a-=6.283;while(a<-Math.PI)a+=6.283;const aa=Math.abs(a);if(aa>(k==="bow"?.5:1.25))return;
    const sc=aa+c.d*.05;if(sc<bs){bs=sc;best={a,c,dx,dz,dd}}});
   if(!best)return;
   yaw+=best.a*.75;
   if(k!=="bow"&&best.c.d>1.5){const mv=Math.min(.9,best.c.d-1.3);if(mv>.05)stepPlayer(best.dx/best.dd*mv,best.dz/best.dd*mv)}
  }catch(e){}}
 function swingLand(){const k=RT.swingK;
  if(!live())return;
  assist(k);
  if(!inFront(WRCH[k]+.35,k==="bow"?.92:.34)){if(k!=="bow"&&window.PACK&&PACK.hitOne&&PACK.hitOne(WRCH[k]+.35,.34))return;sfx("miss");return}
  if(k==="bow"){try{const fr=camera.position.clone();camera.getWorldDirection(_p);fr.addScaledVector(_p,.6);fr.y-=.3;vfx.proj(fr,fx3.ctr().clone(),0xffe0a0,.14,.3,()=>{})}catch(e){}}
  heroHit()}
 function doWhirl(){
  if(!live()||RT.dead>0||(RT.wCd||0)>0||RT.stun>0||RT.block)return;
  RT.wCd=5.5;RT.atkCd=Math.max(RT.atkCd,.55);fx3.swing();
  try{if(window.induceTrauma)induceTrauma(.45);flash("rgba(255,255,255,.16)");note("Whirlwind!")}catch(x){}
  RT.q.push([.18,()=>{if(!live())return;const t=toFoe();
   if(t.d-.5*foeSc()<=4.4){const d=RT.wdmg();sfx("hit");PACK.m=1;foeDamage(d);PACK.m=0;try{dmgNum(String(d),"#ffd27a",fx3.ctr().clone(),true)}catch(x){}
    if(C&&!C.over&&C.e.hp>0){RT.stagger=.45;if(!(fx3.g.userData.far))tryMoveFoe(t.dx/t.d*.8,t.dz/t.d*.8)}}
   if(window.PACK)PACK.whirl()}]);
  refreshBar()}
 function doBlock(on){if(!live()||RT.dead>0)return;if(on&&!RT.block){RT.block=true;RT.blockT=0}else if(!on)RT.block=false;refreshBar()}
 function doDodge(){
  if(!live()||RT.dead>0||RT.dodgeCd>0||RT.stun>0)return;RT.dodgeCd=1.1*OM("dodge");RT.inv=.4;RT.block=false;
  let fw=0,st=0;if(keys.w||keys.ArrowUp)fw++;if(keys.s||keys.ArrowDown)fw--;if(keys.a)st--;if(keys.d)st++;fw-=joy.y;st+=joy.x;
  let dx=-Math.sin(yaw)*fw+Math.cos(yaw)*st,dz=-Math.cos(yaw)*fw-Math.sin(yaw)*st;let l=Math.hypot(dx,dz);
  if(l<.1){dx=Math.sin(yaw);dz=Math.cos(yaw);l=1}dx/=l;dz/=l;RT.dash={dx,dz,t:.22};
  try{sfx("miss");vmSwing=-1}catch(e){}}
 function doSpell(i){
  if(!live()||RT.dead>0||RT.spCd>0||RT.stun>0)return;const ks=known(),nm=ks[i];if(!nm)return;const s=SPELLS[nm];
  if(hero.mana<s.mp){note("Not enough "+RES[hero.cls].toLowerCase()+".");return}
  const needT={dmg:1,atk:1,volley:1,turn:1,chord:1,sleep:1}[s.u];
  if(needT&&!inFront(26,.82)){note("No target in sight.");return}
  if(s.u==="atkw"&&!inFront(WRCH[wKind()]+.4,.55)){note("Too far to strike.");return}
  RT.spCd=.7;RT.spellT=1.8;curSpell=nm;const hp0=hero.hp;castSpell(nm,s.u==="heal");
  if(C&&!C.over){if(s.u==="ward"||s.u==="bless"){C.wardT=s.u==="ward"?40:0;C.blessT=s.u==="bless"?30:0;note(nm+(s.u==="ward"?": +"+s.n+" defense for a while.":": +2 to hit for a while."))}
   else if(s.u==="sleep"||s.u==="chord")note(C.e.name+" is held.")}
  try{hud()}catch(e){}refreshBar()}
 function doItem(kind){
  if(!live()||RT.dead>0||RT.stun>0)return;
  const pick=a=>a.find(n=>hero.inv[n]>0);
  let nm=null;
  if(kind==="heal"){nm=pick(hero.hp<maxHP()*.55?["Healing potion","Healing herb"]:["Healing herb","Healing potion"]);if(!nm){note("You have nothing to heal with.");return}}
  else if(kind==="mana"){nm=pick(["Mana potion"]);if(!nm){note("No mana potion.");return}}
  else{nm=pick(["Smoke vial"]);if(!nm){note("No smoke vial.");return}}
  const b=hero.hp,m0=hero.mana;useItem(nm,false);
  if(C&&!C.over){if(hero.hp>b)note("+"+(hero.hp-b)+" HP");if(hero.mana>m0)note("+"+(hero.mana-m0)+" "+RES[hero.cls].toLowerCase())}
  try{hud()}catch(e){}refreshBar()}
 function doSing(){if(!live()||!C.fin||C.sung||C.e.hp>C.e.max*.3)return;C.sung=1;C.sungNow=1;let sh=1;try{sh=Math.max(1,PLN.filter(p=>QST.Q().shards[p.n]).length)}catch(x){}
  const n=12*sh;try{BN.banner("♜ THE CHORD")}catch(x){}try{flash("rgba(255,240,200,.6)")}catch(x){}foeDamage(n);C&&(C.sungNow=0);try{healHero(Math.round(maxHP()*.3))}catch(x){}refreshBar()}
 /* ---------- foe brain ---------- */
 function tryMoveFoe(dx,dz){const b=fx3.base;let nx=b.x+dx,nz=b.z+dz;
  if(DG){const[w,d]=DIMS[DG.s.r];nx=clamp(nx,-w/2+1.2,w/2-1.2);nz=clamp(nz,-d/2+1.2,d/2-1.2);b.x=nx;b.z=nz;return true}
  const r=.45*Math.min(1.4,foeSc()),ox=b.x,oz=b.z,ns=!C||!C.story;
  if(!blocked(nx,b.z,r)&&hfn(nx,b.z)>-.3&&!(ns&&RT.safe(nx,b.z)))b.x=nx;if(!blocked(b.x,nz,r)&&hfn(b.x,nz)>-.3&&!(ns&&RT.safe(b.x,nz)))b.z=nz;
  b.y=Math.max(hfn(b.x,b.z),-.3);return Math.abs(b.x-ox)+Math.abs(b.z-oz)>1e-4}
 function foeImpact(){
  const e=C.e,t=toFoe(),sc=foeSc(),reach=reachOf(sc),n=e.sp==="multi"?2:1;
  const ak=RT.ak||"strike",pp=hpos(),ax=RT.aim?RT.aim[0]:0,az=RT.aim?RT.aim[1]:1;
  const along=-(t.dx*ax+t.dz*az),side=Math.abs(-(t.dx*az-t.dz*ax));
  let hitIn=ak==="bolt"?(side<1.1&&along>0&&t.d<16):ak==="lunge"?(along>-.5&&along<reach+3.6&&side<1.0):ak==="slam"?t.d<=Math.max(3.4,2.6+sc*1.1):ak==="pulse"?t.d<=5.2:t.d<=reach+.9;
  if(ak==="lunge"){const go=Math.min(reach+2.4,Math.max(0,t.d-reach*.6));try{tryMoveFoe(ax*go,az*go)}catch(x){}}
  if(ak==="slam"||ak==="pulse"){try{flash("rgba(255,200,160,.15)")}catch(x){}}
  
  if(ak==='bolt'||(RT.rngd&&ak==='pulse')){try{const to=camera.position.clone();to.y-=.3;vfx.proj(fx3.ctr().clone(),to,/Wraith|Nymph/.test(e.name)?0x80ffd0:0xc080ff,.3,.4,()=>{})}catch(x){}}
  else if(!foeFig())fx3.lunge=0;
  if(C.fin){C.finR=(C.finR||0)+1;try{if(e.hp<=e.max*.6&&C.finR%2===0){PCK.setOff(PCK.OFF+PCK.now().left+300);hero.clockOff=PCK.OFF;const h=PCK.now().hour;flash("rgba(200,200,255,.35)");BN.banner("THE HOUR SHIFTS "+h.g);note("The hour is now "+h.n+" "+h.g+". Change your tune!")}}catch(x){}}
  for(let i=0;i<n&&hero.hp>0;i++){
   RT.q.push([i*.38,()=>{if(!live()||RT.dead>0)return;
    if(!hitIn||RT.inv>0){sfx("miss");if(RT.inv>0){try{dmgNum("Dodged","#9fe0ff",fx3.ctr().clone(),false)}catch(x){}}return}
    if(RT.block&&RT.blockT<.3){sfx("hit");try{dmgNum("Parried","#ffe27a",fx3.ctr().clone(),true)}catch(x){}RT.fs="recover";RT.ft=1.2;RT.stagger=1.2;glow(0);return}
    const ac=calcAC()+C.ward+OB("ac")+(RT.block?3:0),r=atkRoll(e.atk+OB("foe"),ac);
    if(!r.hit){sfx("miss");return}
    let dmg=roll(e.dn*(r.crit?2:1),e.ds)+e.db;if(RT.block)dmg=Math.max(1,Math.ceil(dmg*.35));
    hero.hp=Math.max(0,hero.hp-dmg);fx3.hurt(dmg);sfx("hit");RT.lastHit=6;
    if(e.sp==="drain"&&hero.mana>0){hero.mana--}
    if(e.sp==="charm"&&Math.random()<.35&&RT.stun<=0){RT.stun=1.3;note("You are charmed and stand dazed.")}
    if(e.sp==="blind"&&Math.random()<.6){try{flash("rgba(255,250,220,.95)")}catch(x){}RT.stun=Math.max(RT.stun,.9);RT.slow=3;note("Holy light sears your eyes.")}
    if(e.sp==="fear"&&Math.random()<.55){RT.stun=Math.max(RT.stun,.8);RT.slow=4;note("Terror locks your legs.")}
    if(e.sp==="whisper"){hero.mana=Math.max(0,hero.mana-2);if(window.HZ)HZ.spike=1.6;if(Math.random()<.4){RT.slow=3;note("The whispering unsteadies you.")}}
    try{hud()}catch(x){}
    if(hero.hp<=0)rtDie();
   }])}
  RT.fs="recover";RT.ft=.5+(n-1)*.35;glow(0)}
 function findSpot(d0,d1){const p=hpos();for(let k=0;k<50;k++){const a=Math.random()*6.283,d=d0+Math.random()*(d1-d0),x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;
   if(x>2&&z>2&&(C.story||!RT.safe(x,z))&&!blocked(x,z,.8)&&hfn(x,z)>-.2)return{x,z}}return null}
 function foeStep(dt){
  const e=C.e,g=fx3.g,F=foeFig();if(!g)return;
  const t=toFoe(),sc=foeSc(),reach=reachOf(sc),b=fx3.base;let moving=0;
  if(fx3.fw)fx3.fw.set(t.dx/t.d,0,t.dz/t.d);
  if(e.hp<=0){return}
  if(e.skip>0){e.skip-=dt/1.6;if(F)F.play("idle");glow(.0);return}
  if(RT.stagger>0){RT.stagger-=dt;if(F&&F.cur!=="hit"&&F.cur!=="attack")F.play("idle");return}
  g.rotation.y+=angD(g.rotation.y,Math.atan2(-t.dx,-t.dz))*Math.min(1,dt*(RT.fs==="wind"?3:8));
  RT.cd-=dt;
  if(RT.fs==="chase"){
   const want=RT.rngd?8:RT.pulser?3.4:reach*.82;
   if(t.d>want){const sp=SPD[RT.kind]*(C.boss?1.1:1)*(1+C.tier*.04);moving=tryMoveFoe(-t.dx/t.d*sp*dt,-t.dz/t.d*sp*dt)?sp:0;
    if(!moving&&!DG){RT.stuck=(RT.stuck||0)+dt;
     if(RT.stuck>.5&&RT.stuck<3.2){const sg=(Math.floor(RT.stuck*2)%2?1:-1);if(tryMoveFoe(-t.dz/t.d*sp*dt*sg,t.dx/t.d*sp*dt*sg))moving=sp}
     else if(RT.stuck>=3.2){const q=findSpot(7,11);if(q){b.x=q.x;b.z=q.z;b.y=Math.max(hfn(q.x,q.z),-.3)}RT.stuck=0}}
    else RT.stuck=0}
   else if(RT.rngd&&t.d<4.5){tryMoveFoe(t.dx/t.d*SPD.norm*dt,t.dz/t.d*SPD.norm*dt);moving=1}
   if(RT.rngd&&!C.story&&RT.safe(hpos().x,hpos().z))RT.cd=Math.max(RT.cd,.5);
   if(t.d<=(RT.rngd?11:(RT.pulser?4.8:RT.lunger?reach+2.2:reach+.25))&&RT.cd<=0){RT.ak=atkKindOf(e,RT.rngd);RT.fs="wind";RT.ft=Math.max(.5,(C.boss?.95:.8)-C.tier*.05)+(TDUR[RT.ak]||0)+(RT.ak==="slam"?.15:0);RT.ftMax=RT.ft;
    const t0=toFoe();RT.aim=[-t0.dx/t0.d,-t0.dz/t0.d];tgShape();try{tgUpdate(0)}catch(x){}
    if(F){F.play("attack",1.35*(.68/RT.ft));try{F.tele&&F.tele(RT.ak);F.setFace&&F.setFace(["strike","lunge","slam","pulse"].indexOf(RT.ak))}catch(x){}}
    try{window.MV&&MV(RT.ak==="slam"?"spawn":"hit")}catch(x){}}
  }else if(RT.fs==="wind"){
   RT.ft-=dt;const pr=clamp(1-RT.ft/RT.ftMax,0,1);glow(pr*.8);tgUpdate(pr);
   g.rotation.x=(RT.ak==="slam"||RT.ak==="strike"?-.28:RT.ak==="lunge"?.2:0)*Math.sin(Math.min(1,pr*1.4)*Math.PI/2);
   if(RT.ak==="pulse"||RT.ak==="slam"){const sp=1+.05*Math.sin(pr*40)*pr;g.scale.y=g.scale.x*sp}
   if(RT.ft<=0){tgHide();g.rotation.x=0;g.scale.y=g.scale.x;foeImpact()}
  }else if(RT.fs==="recover"){
   RT.ft-=dt;if(RT.ft<=0){RT.fs="chase";RT.cd=Math.max(.35,1.25-C.tier*.12+Math.random()*.7)}}
  if(moving&&F&&RT.fs==="chase"){if(F.hum&&moving>3.4)F.play("run",moving/F.runBase);else F.play("walk",moving/F.base)}
  else if(F&&RT.fs==="chase"&&F.cur!=="hit")F.play("idle");
  b.y=DG?0:Math.max(hfn(b.x,b.z),-.3)}
 const angD=(a,b)=>{let d=b-a;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;return d};
 /* ---------- hero movement extras ---------- */
 function stepPlayer(dx,dz){
  if(DG){const[w,d]=DIMS[DG.s.r];dgCam.x=clamp(dgCam.x+dx,-w/2+1,w/2-1);dgCam.z=clamp(dgCam.z+dz,-d/2+1,d/2-.6);return}
  if(!blocked(P.x+dx,P.z,.45))P.x+=dx;if(!blocked(P.x,P.z+dz,.45))P.z+=dz;
  const tx=Math.floor(P.x/TW),ty=Math.floor(P.z/TW);if(tx!==hx||ty!==hy){hx=tx;hy=ty;try{tileEnter()}catch(e){}}}
 RT.dgMove=function(dt){if(RT.dead>0||RT.stun>0)return;let fw=0,st=0,tr=0;if(keys.w||keys.ArrowUp)fw++;if(keys.s||keys.ArrowDown)fw--;if(keys.a)st--;if(keys.d)st++;if(keys.ArrowLeft)tr++;if(keys.ArrowRight)tr--;
  fw-=joy.y;st+=joy.x;yaw+=tr*1.9*dt;let dx=-Math.sin(yaw)*fw+Math.cos(yaw)*st,dz=-Math.cos(yaw)*fw-Math.sin(yaw)*st;const l=Math.hypot(dx,dz);if(l>1){dx/=l;dz/=l}
  const sp=(keys.Shift?6.5:4.2)*dt*(RT.block?.5:1)*(RT.slow>0?.45:1);if(dx||dz)stepPlayer(dx*sp,dz*sp)};
 /* ---------- death / ending ---------- */
 function rtDie(){if(RT.dead>0)return;RT.dead=2;RT.block=false;try{flash("rgba(0,0,0,.85)");sfx("hit")}catch(e){}note("You fall...");refreshBar()}
 function afterDeath(){RT.dead=0;const c=C;if(!c)return;try{c.over=false;defeat()}catch(e){}
  const was=!!DG;if(!was&&C)C.dead=0;try{endCombat()}catch(e){}}
 function cleanup(){tgHide();bar.style.display="none";foeBox.style.display="none";RT.block=false;RT.dash=null;RT.swingQ=null;glow(0);if(DG)try{$("dng").hidden=false}catch(e){}}
 const _end=endCombat;
 endCombat=function(){const dead=C&&C.dead;const wasDG=!!DG;cleanup();if(C&&C.rt&&dead&&!wasDG)C.dead=0;fx3.lungeAmp=2;return _end.apply(this,arguments)};
 RT.retreat=function(){if(!live())return;C.won=0;note(DG?"You back out of the room.":"You break away.");endCombat()};
 /* victory: let the foe fall, then finish */
 const _vic=victory;
 victory=function(){const r=_vic.apply(this,arguments);RT.endT=1.7;RT.block=false;try{refreshBar()}catch(e){}return r};
 /* ---------- main update ---------- */
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{tick(dt)}catch(e){if(!window.__rte){window.__rte=1;console.warn("rt",e)}}};
 function tick(dt){
  if(!C||!C.rt){return}
  RT.t+=dt;
  if(RT.dead>0){RT.dead-=dt;if(RT.dead<=0)afterDeath();return}
  if(C.over){ if(RT.endT>0){RT.endT-=dt;if(RT.endT<=0){RT.endT=0;endCombat()}} return}
  RT.atkCd=Math.max(0,RT.atkCd-dt);RT.spCd=Math.max(0,RT.spCd-dt);RT.dodgeCd=Math.max(0,RT.dodgeCd-dt);RT.inv=Math.max(0,RT.inv-dt);RT.stun=Math.max(0,RT.stun-dt);if(RT.block)RT.blockT+=dt;
  if(RT.lastHit>0)RT.lastHit-=dt;
  RT.slow=Math.max(0,(RT.slow||0)-dt);RT.spellT=Math.max(0,(RT.spellT||0)-dt);RT.wCd=Math.max(0,(RT.wCd||0)-dt);
  if(C.e&&C.e.sp==="gaze"&&!C.over&&fx3&&fx3.g){try{const f=fx3.ctr(),dx=f.x-camera.position.x,dz=f.z-camera.position.z,dd=Math.hypot(dx,dz)||1,fw=new THREE.Vector3();camera.getWorldDirection(fw);const dot=(fw.x*dx+fw.z*dz)/dd;
   if(dot>.82&&dd<22){RT.gz=(RT.gz||0)+dt;if(window.HZ)HZ.spike=Math.min(1.4,(RT.gz||0)*.35);if(RT.gz>2){RT.slow=.5;RT.gzT=(RT.gzT||0)+dt;if(RT.gzT>1.3){RT.gzT=0;const d=roll(1,4)+1;hero.hp=Math.max(0,hero.hp-d);try{fx3.hurt(d);hud();note("You cannot look away. The Eyes drink at you.")}catch(x){}if(hero.hp<=0)rtDie()}}}
   else RT.gz=Math.max(0,(RT.gz||0)-dt*2)}catch(x){}}
  if(C.wardT>0){C.wardT-=dt;if(C.wardT<=0)C.ward=Math.max(0,C.ward-4)}
  if(C.blessT>0){C.blessT-=dt;if(C.blessT<=0)C.bless=0}
  if(RT.swingQ!=null){RT.swingQ-=dt;if(RT.swingQ<=0){RT.swingQ=null;swingLand()}}
  if(RT.atkBuf>0){RT.atkBuf-=dt;if(RT.atkCd<=0){RT.atkBuf=0;doAttack()}}else if((RT.holdM||RT.holdF)&&RT.atkCd<=0&&!RT.block)doAttack();
  if(RT.dash){const d=RT.dash,s=3.6/.22*dt;stepPlayer(d.dx*s,d.dz*s);d.t-=dt;if(d.t<=0)RT.dash=null}
  for(let i=RT.q.length-1;i>=0;i--){const it=RT.q[i];it[0]-=dt;if(it[0]<=0){RT.q.splice(i,1);it[1]()}}
  foeStep(dt);
  /* engagement range */
  const t=toFoe();
  C.near=(t.d<17||RT.lastHit>0)?1:0;
  if(DG){const d=DIMS[DG.s.r][1];if(dgCam.z>d/2-.9&&!RT.dash){RT.retreat();return}}
  else if(t.d>30){C.won=0;note("You lose the "+C.e.name+".");endCombat();return}
  if(!DG&&!C.story&&RT.safe(hpos().x,hpos().z)&&t.d>6){RT.sz=(RT.sz||0)+dt;if(RT.sz>2.5){C.won=0;note("The "+C.e.name+" will not follow you in here.");endCombat();return}}else RT.sz=0
  /* hud */
  const e=C.e;foeBox.firstChild.textContent=e.name+(e.undead?" (undead)":"")+(e.skip>0?" · held":"");foeBox.querySelector("i").style.width=Math.max(0,e.hp/e.max*100)+"%";
  if(C.fin&&!C.sung&&e.hp<=e.max*.3&&!RT.singShown){RT.singShown=1;buildBar()}
  RT.bk=(RT.bk||0)+dt;if(RT.bk>.5){RT.bk=0;refreshBar()}}
 /* ---------- action bar ---------- */
 let barKey="";
 function buildBar(){bar.innerHTML="";barKey="";
  const mk=(txt,sub,fn,cls,down,up)=>{const b=document.createElement("button");b.type="button";if(cls)b.className=cls;b.innerHTML=txt+(sub?"<small>"+sub+"</small>":"");
   if(down){b.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();down()});if(up){b.addEventListener("pointerup",e=>{e.stopPropagation();up()});b.addEventListener("pointerleave",()=>up());b.addEventListener("pointercancel",()=>up())}}
   else b.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();fn()});bar.appendChild(b);return b};
  mk("Block","Q",null,"blk",()=>doBlock(true),()=>doBlock(false));
  mk("Dodge","Space",doDodge);
  mk("Attack","F / click",doAttack,"big");mk("Whirl","R",doWhirl,"wh");
  known().slice(0,6).forEach((n,i)=>{const s=SPELLS[n];mk(n.length>9?n.slice(0,8)+".":n,(i+1)+" · "+s.mp,()=>doSpell(i),"sp"+i)});
  mk("Heal","H",()=>doItem("heal"),"hl");mk(RES[hero.cls]==="Mana"?"Mana":"Focus","G",()=>doItem("mana"),"mn");
  if(C&&C.fin&&!C.sung&&C.e.hp<=C.e.max*.3)mk("✦ Sing","",doSing,"sing");
  refreshBar()}
 function refreshBar(){if(!C||!C.rt)return;
  const ks=known();ks.slice(0,6).forEach((n,i)=>{const b=bar.querySelector(".sp"+i);if(b)b.disabled=hero.mana<SPELLS[n].mp});
  const wh=bar.querySelector(".wh");if(wh)wh.disabled=(RT.wCd||0)>0;
  const hl=bar.querySelector(".hl");if(hl)hl.disabled=!(hero.inv["Healing potion"]>0||hero.inv["Healing herb"]>0);
  const mn=bar.querySelector(".mn");if(mn)mn.disabled=!(hero.inv["Mana potion"]>0);
  const bk=bar.querySelector(".blk");if(bk)bk.classList.toggle("on",!!RT.block)}
 /* ---------- input ---------- */
 addEventListener("keydown",e=>{if(!hero||!live()||/TEXTAREA|INPUT|SELECT/.test(e.target.tagName))return;const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(k===" "){e.preventDefault();if(!e.repeat)doDodge()}
  else if(k==="f"){RT.holdF=1;if(!e.repeat)doAttack()}
  else if(k==="r"&&!e.repeat)doWhirl();
  else if(k==="q"&&!e.repeat)doBlock(true);
  else if(k==="h"&&!e.repeat)doItem("heal");
  else if(k==="g"&&!e.repeat)doItem("mana");
  else if(k==="v"&&!e.repeat)doItem("smoke");
  else if(/^[1-6]$/.test(k)&&!e.repeat)doSpell(+k-1)});
 addEventListener("keyup",e=>{if((e.key==="q"||e.key==="Q")&&C&&C.rt)doBlock(false);if(e.key==="f"||e.key==="F")RT.holdF=0});
 const vw=document.getElementById("view");let pd=null;
 vw.addEventListener("pointerdown",e=>{if(!live())return;if(e.button===2){doBlock(true);return}if(e.button===0&&e.pointerType!=="touch"&&document.pointerLockElement){RT.holdM=1;doAttack();return}pd={x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId}},true);
 vw.addEventListener("pointerup",e=>{RT.holdM=0;if(!live()){pd=null;return}if(e.button===2){doBlock(false);return}if(pd&&pd.id===e.pointerId){const m=Math.hypot(e.clientX-pd.x,e.clientY-pd.y),dt=performance.now()-pd.t;if(m<9&&dt<380)doAttack()}pd=null},true);
 vw.addEventListener("contextmenu",e=>{if(live())e.preventDefault()});
 /* debug */
 window.__rt={attack:doAttack,spell:doSpell,item:doItem,dodge:doDodge,block:doBlock,die:rtDie};
})();

/* ===== Aged world: dust on upward faces, crevice grime, pitted iron, veined glowing rot, wet blood against dry flesh ===== */
(function(){
 if(typeof THREE==="undefined"||typeof fx3==="undefined")return;
 const T={value:0};
 const GLSL_HEAD="uniform float aDust,aGrime,aIron,aRot,aWet,aGlow,aTime,aBone,aWrap,aFrost,aMoss;uniform vec3 aGlowC;varying vec3 vObj;\n"+
 "float ah(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}\n"+
 "float an(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(ah(i),ah(i+vec3(1,0,0)),f.x),mix(ah(i+vec3(0,1,0)),ah(i+vec3(1,1,0)),f.x),f.y),mix(mix(ah(i+vec3(0,0,1)),ah(i+vec3(1,0,1)),f.x),mix(ah(i+vec3(0,1,1)),ah(i+vec3(1,1,1)),f.x),f.y),f.z);}\n"+
 "float afb(vec3 p){return an(p)*.55+an(p*2.1)*.3+an(p*4.3)*.15;}\n";
 const GLSL_MAIN=`
 vec3 awn=normalize((vec4(normal,0.)*viewMatrix).xyz);vec3 aem=vec3(0.);
 float an1=afb(vObj*3.5);
 if(aWet>0.){float wm=smoothstep(.52,.6,afb(vObj*4.+3.))*aWet;float lm=dot(diffuseColor.rgb,vec3(.3,.59,.11));diffuseColor.rgb=mix(mix(diffuseColor.rgb,vec3(lm)*1.15,.35*aWet),vec3(.3,.01,.02),wm);roughnessFactor=mix(roughnessFactor,.1,wm);}
 if(aRot>0.){float rv=abs(afb(vObj*5.5)-.5);float vein=smoothstep(.03,.0,rv)*aRot;float pat=smoothstep(.6,.85,afb(vObj*2.3+7.))*aRot;
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.03,.02,.02),clamp(pat*.65+vein,0.,1.));
  float pulse=.55+.45*sin(aTime*2.4+afb(vObj*2.)*6.);aem+=aGlowC*vein*pulse*aGlow;normal.xy-=vec2(dFdx(vein),dFdy(vein))*1.5;normal=normalize(normal);}
 if(aIron>0.&&metalnessFactor>.25){float pv=afb(vObj*55.);normal.xy-=vec2(dFdx(pv),dFdy(pv))*aIron*7.;normal=normalize(normal);diffuseColor.rgb*=1.-aIron*smoothstep(.55,.8,pv)*.45;roughnessFactor=max(roughnessFactor,.45+.25*aIron*pv);}
 if(aBone>0.){float bn=afb(vObj*4.3+13.),bt=.62-aBone*.22;float m=smoothstep(bt,bt+.05,bn),edge=smoothstep(bt-.07,bt,bn)-m;
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.03,.03),edge*.85);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.8,.74,.6)*(.75+.5*afb(vObj*34.)),m);roughnessFactor=mix(roughnessFactor,.6,m);metalnessFactor*=1.-m;
  float hole=smoothstep(bt+.16,bt+.2,bn)*aBone;diffuseColor.rgb*=1.-hole*.7;}
 if(aWrap>0.){float st=sin(vObj.y*34.+afb(vObj*4.)*4.+vObj.x*7.+vObj.z*5.);float band=smoothstep(-.15,.1,st),gap=smoothstep(.86,.97,st);
  vec3 lin=vec3(.78,.7,.5)*(.62+.55*afb(vObj*38.));float stain=smoothstep(.55,.8,afb(vObj*3.1+9.));lin=mix(lin,vec3(.32,.2,.1),stain*.6);
  diffuseColor.rgb=mix(vec3(.3,.22,.14),lin,band*(1.-gap*.5));roughnessFactor=.95;metalnessFactor=0.;}
 if(aFrost>0.){float fn=afb(vObj*9.+3.);float fmk=smoothstep(.44,.62,fn+awn.y*.2)*aFrost;vec3 ic=vec3(.7,.87,1.);diffuseColor.rgb=mix(diffuseColor.rgb,ic,fmk*.85);roughnessFactor=mix(roughnessFactor,.1,fmk);metalnessFactor=mix(metalnessFactor,0.,fmk);
  float spk=step(.982,ah(floor(vObj*170.)));aem+=vec3(.85,.96,1.)*spk*aFrost*.9+vec3(.04,.1,.18)*fmk;}
 if(aMoss>0.){float mn=afb(vObj*7.+21.);float mm=smoothstep(.42,.6,mn+awn.y*.25)*aMoss;vec3 mc=mix(vec3(.1,.22,.05),vec3(.32,.44,.12),afb(vObj*30.));diffuseColor.rgb=mix(diffuseColor.rgb,mc,mm*.9);roughnessFactor=mix(roughnessFactor,.95,mm);metalnessFactor*=1.-mm;}
 if(metalnessFactor<.25){float sk1=afb(vObj*95.),sk2=afb(vObj*26.+11.);normal.xy-=clamp(vec2(dFdx(sk1),dFdy(sk1))*.25,-.08,.08)+clamp(vec2(dFdx(sk2),dFdy(sk2))*.5,-.12,.12);normal=normalize(normal);
  roughnessFactor=clamp(roughnessFactor*(.82+.4*afb(vObj*8.+5.)),.08,1.);diffuseColor.rgb*=.9+.2*sk2;
  float fr=pow(1.-clamp(dot(normalize(vViewPosition),normal),0.,1.),3.);aem+=diffuseColor.rgb*vec3(.55,.18,.1)*fr*.5;}
 float gm=clamp(aGrime*(smoothstep(.45,.72,afb(vObj*7.))*.9+(1.-awn.y)*.12),0.,1.);diffuseColor.rgb*=1.-gm*.6;
 float upm=smoothstep(.35,.85,awn.y);float dm=clamp(upm*aDust*(.5+an1*.9),0.,1.);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.6,.58,.53),dm);roughnessFactor=mix(roughnessFactor,1.,dm);metalnessFactor*=1.-dm;aem*=1.-dm;
 `;
 function patch(m,U){
  if(!m||!m.isMeshStandardMaterial||m.userData.aged)return;m.userData.aged=1;
  const ob=m.onBeforeCompile,ok=m.customProgramCacheKey;
  m.onBeforeCompile=function(sh,r){if(ob)ob.call(this,sh,r);
   sh.uniforms.aDust=U.dust;sh.uniforms.aGrime=U.grime;sh.uniforms.aIron=U.iron;sh.uniforms.aRot=U.rot;sh.uniforms.aWet=U.wet;sh.uniforms.aBone=U.bone;sh.uniforms.aWrap=U.wrap;sh.uniforms.aFrost=U.frost;sh.uniforms.aMoss=U.moss;sh.uniforms.aGlow=U.glow;sh.uniforms.aGlowC=U.glowC;sh.uniforms.aTime=T;
   sh.vertexShader="varying vec3 vObj;\n"+sh.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvObj=position;");
   sh.fragmentShader=GLSL_HEAD+sh.fragmentShader.replace("#include <normal_fragment_maps>","#include <normal_fragment_maps>\n"+GLSL_MAIN).replace("#include <emissivemap_fragment>","#include <emissivemap_fragment>\ntotalEmissiveRadiance+=aem;")};
  m.customProgramCacheKey=function(){return (ok?ok.call(this):"")+"|age"};m.needsUpdate=true}
 const mkU=p=>({dust:{value:p.dust||0},grime:{value:p.grime||0},iron:{value:p.iron||0},rot:{value:p.rot||0},wet:{value:p.wet||0},bone:{value:p.bone||0},wrap:{value:p.wrap||0},frost:{value:p.frost||0},moss:{value:p.moss||0},glow:{value:p.glow||0},glowC:{value:new THREE.Color(p.gc==null?0xff5a10:p.gc)}});
 const PROF=[
  [/Bone Legionary/,{dust:.5,grime:.4,rot:.25,glow:.3,bone:.9,gc:0xff8a30}],
  [/Cave Troll/,{grime:.6,rot:.8,glow:1.0,gc:0xff9a30,dust:.2}],
  [/Frost Giant/,{frost:.85,grime:.2,glow:.4,gc:0x60c8ff}],
  [/Rime Hound/,{frost:.9,grime:.15,glow:.3,gc:0x80e0ff}],
  [/Bog Hag/,{grime:.4,wet:.4,moss:.3,rot:.2,glow:.3,gc:0xa0ff40}],
  [/Ice Draugr/,{dust:.1,grime:.25,rot:.35,glow:.5,bone:.3,frost:1,gc:0x60c8ff}],
  [/Bael Revenant|Furfur|Andras|Bifrons|Eligos|Decan Shade/,{dust:.4,grime:.5,rot:.3,glow:.4,bone:.4,gc:0xff9a30}],
  [/Mummy/,{dust:.5,grime:.45,rot:.2,glow:.2,wrap:1,gc:0xff8a30}],
  [/Rotted Woodsman/,{grime:.5,rot:.3,glow:.3,bone:.35,moss:1,gc:0xa0ff50}],
  [/Drowned Dead/,{grime:.25,rot:.25,glow:.45,bone:.25,wet:1,moss:.14,gc:0x40ffc0}],
  [/Archon/,{dust:.15,grime:.1,glow:.2}],
 [/Bael/,{rot:.8,glow:1.1,grime:.3,wet:.2,iron:.6}],
 [/Wraith|Ghost|Lich/,{dust:.25,grime:.2,rot:.3,glow:.4,gc:0x60ffd0}],
  [/Mummy|Skeleton|Zombie|Ghoul|Hollow King|Dune King/,{dust:.9,grime:.5,rot:.35,glow:.25,bone:.5,gc:0xff8a30}],
  [/Frost Demon/,{rot:.9,glow:.9,grime:.2,gc:0x60b0ff}],
  [/Demon|Imp|Drake|Salamander/,{rot:.9,glow:1.0,grime:.2,wet:.1}],
  [/Hydra|Lizard|Scorpion/,{grime:.4,wet:.25,rot:.15,glow:.4,gc:0x80ff40}],
  [/Wolf|Yeti/,{grime:.35,wet:.2,dust:.15}],
  [/Orc|Goblin|Bandit|Giant|Dwarf|Gorrum|Paladin/,{grime:.6,wet:.18,iron:.9,dust:.12}],
  [/Magician|Witch|Nymph/,{grime:.3,iron:.5,rot:.12,glow:.3}],
  [/Beholder/,{grime:.3,wet:.3,rot:.2,glow:.5,gc:0xc040ff}]];
 function profFor(name){for(const[r,p]of PROF)if(r.test(name))return p;return{grime:.3,iron:.6,dust:.1}}
 /* a creature: clone its materials so each foe has its own wounds and rot */
 function foe(g,name,boss,pp){if(!g||g.userData.agedFoe)return;g.userData.agedFoe=1;try{alive(g)}catch(e){}const p=Object.assign({},pp||profFor(name||""));if(boss){p.rot=(p.rot||0)+.2;p.grime=(p.grime||0)+.2;p.dust=(p.dust||0)+.15}
  const U=mkU(p);g.userData.age={U,base:p.wet||0};const map=new Map();
  g.traverse(o=>{if(!(o.isMesh||o.isSkinnedMesh))return;const arr=Array.isArray(o.material)?o.material:[o.material];
   const out=arr.map(m=>{if(!m||!m.isMeshStandardMaterial)return m;if(map.has(m))return map.get(m);const c=m.clone();c.skinning=m.skinning;if(m.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile)c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;
    c.userData=Object.assign({},m.userData);c.userData.aged=0;patch(c,U);map.set(m,c);return c});
   o.material=Array.isArray(o.material)?out:out[0]});
  if(g.userData.mats)g.userData.mats=g.userData.mats.map(m=>map.get(m)||m)}
 /* living motion: breathing chest, drifting head, restless shoulders layered over the animation */
 function alive(g){const F=g.userData.fig;if(!F||!F.update||F.breath)return;let sk=null;g.traverse(o=>{if(!sk&&o.isSkinnedMesh)sk=o.skeleton});if(!sk)return;
  const B=n=>sk.bones.find(b=>b.name.toLowerCase()===n),sp2=B("spine_02"),sp3=B("spine_03"),hd=B("head"),nk=B("neck_01"),cl=B("clavicle_l"),cr=B("clavicle_r");if(!sp3&&!hd)return;
  F.breath=1;const ph=Math.random()*6.28,u=F.update;let tt=0;
  F.update=function(dt){u.call(this,dt);if(this.dead)return;tt+=dt;const c=this.atk>0?2.2:1;
   if(sp3)sp3.rotation.x+=Math.sin(tt*1.7*c+ph)*.02*c;if(sp2)sp2.rotation.z+=Math.sin(tt*.8+ph)*.018;
   if(cl)cl.rotation.z+=Math.sin(tt*1.7*c+ph)*.03;if(cr)cr.rotation.z-=Math.sin(tt*1.7*c+ph)*.03;
   const h=nk||hd;if(h){h.rotation.y+=Math.sin(tt*.37+ph)*.1+Math.sin(tt*1.3+ph*2)*.025;h.rotation.x+=Math.sin(tt*.6+ph)*.04+(Math.sin(tt*.21+ph)>.93?.12:0)}}}
 function npc(g,seed){const p={grime:.12+((seed*37)%10)/10*.2,dust:.06};foe(g,"",false,p)}
 function hurt(g,frac){const a=g&&g.userData.age;if(!a)return;a.U.wet.value=Math.min(1,a.base+(1-frac)*.85)}
 /* static scenery: shared materials, patched in place */
 function scene(g,p){if(!g)return;const U=mkU(p);g.traverse(o=>{if(!o.isMesh)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>patch(m,U))})}
 window.AGE={foe,npc,hurt,scene,patch,profFor,T};
 const _fd=foeDamage;foeDamage=function(){const r=_fd.apply(this,arguments);try{if(C&&C.e&&fx3.g)hurt(fx3.g,Math.max(0,C.e.hp)/C.e.max)}catch(e){}return r};
 const _vu=vmUpdate;vmUpdate=function(dt){_vu(dt);T.value=clock};
 try{const _dy=fx3.die;fx3.die=function(){_dy.apply(this,arguments);try{if(this.g)this.g.traverse(o=>{if(o.userData&&o.userData.eyeglow)o.visible=false})}catch(e){}}}catch(e){}
 try{const _br=buildRoom;buildRoom=function(i,th,s){const g=_br.apply(this,arguments);try{scene(g,{dust:.55,grime:.5,iron:.4})}catch(e){}return g}}catch(e){}
 let tries=0;const iv=setInterval(()=>{if(++tries>30){clearInterval(iv);return}try{if(typeof poiMeshes==="undefined"||!POIS.length||!poiMeshes[POIS[0].id])return;clearInterval(iv);
  POIS.forEach(p=>{if(p.k==="r"||p.k==="t"||p.k==="d")scene(poiMeshes[p.id],{dust:.5,grime:.4,iron:.3})})}catch(e){}},1000);
})();

/* ===== NPCs reach out: they hail you when you come near, and story-critical ones open the conversation themselves ===== */
(function(){
 if(typeof NPCS==="undefined"||typeof talk==="undefined")return;
 const cool={},HAIL=5.2,OPEN=4.2;let scanT=0;
 const KEEP={shrine:"Brother Anselm",fort:"Sergeant Voss",hut:"Morrigan Mirewood"},CALL={shrine:"Traveller! Come in. It concerns the hours.",fort:"You there! Climb up. There is something you must see.",hut:"Hold, wanderer. Bring me your herbs and let us talk."};
 const Qg=()=>(window.QST&&QST.Q&&hero)?QST.Q():null;
 /* does this NPC hold something the story needs right now? */
 function crucial(n){const q=Qg();if(!q)return false;
  if(/Anselm/.test(n.name)){const a=q.act;return (a===1&&!q.fl.anselm)||(a===1&&q.ok.a1&&q.ok.a2&&q.ok.a3&&q.ok.a4&&!q.fl.ret1)||(a===2&&["b1","b2","b3","b4","b5","b7"].every(k=>q.ok[k])&&!q.fl.ret2)}
  if(/Voss/.test(n.name))return q.act===1&&!q.fl.tower&&!(q.seen&&q.seen.voss);
  if(/Morrigan/.test(n.name))return q.act===1&&!(q.seen&&q.seen.morr);
  return false}
 function markSeen(n){const q=Qg();if(!q)return;q.seen=q.seen||{};if(/Voss/.test(n.name))q.seen.voss=1;if(/Morrigan/.test(n.name))q.seen.morr=1}
 const HAILS={Merchant:["Wares for the road, traveller!","Come, have a look. Honest prices."],Innkeeper:["A warm bed and a hot meal in here!","You look tired. The inn is open."],"Fortune-teller":["The cards stirred as you came near.","Sit a moment. I have seen your face in the spread."],Herbalist:["Mind where you step, the herbs are in season.","Hello there. Hurt anywhere?"],Farmer:["Fair day, eh?","Watch the fence, friend."]};
 const GEN=["Well met, traveller.","You there! A word, if you have a moment.","Mind the road out past the stones."];
 function hail(n,d){const q=HAILS[n.job]||GEN,line=q[Math.floor(Math.random()*q.length)];
  try{say(n.name+": \u201c"+line+"\u201d")}catch(e){}
  try{const g=npcMeshes[n.id];if(g&&g.userData&&g.userData.fig){}}catch(e){}}
 function busy(){return !!(C||D||DG||packOpen||occOpen||(window.HM&&HM.open&&HM.open.classList&&HM.open.classList.contains("on")))}
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{scan(dt)}catch(e){if(!window.__me){window.__me=1;console.warn("meet",e)}}};
 function scan(dt){
  scanT-=dt;if(scanT>0)return;scanT=.4;
  if(!hero||busy())return;
  const now=performance.now()/1000;
  /* keepers who live indoors call out from their doorway */
  for(const id in KEEP){const p=POIS.find(q=>q.id===id);if(!p)continue;const nm=KEEP[id],d=Math.hypot(p.x*TW+1-P.x,p.y*TW+1-P.z),k="poi_"+id,ke="enter_"+id,c=cool[k]||0,ce=cool[ke]||0;
   if(d>11||!crucial({name:nm}))continue;
   if(window.HM&&HM.near&&HM.near()&&id!=="fort"&&now-ce>60){cool[ke]=now;markSeen({name:nm});try{say(nm+" sees you at the door and waves you in.")}catch(e){}HM.enter();return}
   if(now-c>45){cool[k]=now;try{say(nm+" calls out: \u201c"+CALL[id]+"\u201d")}catch(e){}return}}
  for(const n of NPCS){const g=npcMeshes[n.id];if(!g)continue;
   const d=Math.hypot(g.position.x-P.x,g.position.z-P.z);
   if(d>HAIL)continue;
   const c=cool[n.id]||0;
   if(crucial(n)){if(d<OPEN&&now-c>40){cool[n.id]=now;try{faceNpc(n)}catch(e){}talk(n);markSeen(n);return}}
   else if(now-c>70){cool[n.id]=now;hail(n,d);return}}}
 window.MEET={crucial};
})();

/* ===== first-person arms from the Quaternius body (real fingers, UAL animations) ===== */
(function(){
 if(typeof THREE==="undefined"||!window.__fig||!window.__HUM)return;
 const HQ=window.HQ={on:1,y:-1.74,z:.16,s:1.0,useFit:0,ikOn:1,rr:[75,0,10],rl:[60,0,-50],dk:.8,tr:[0,.04,-.52],tl:[0,.0,-.48],sh:[0,-.27,.1],zeta:.12,fov:72,y:-1.72,z:.2,rx:0,sepT:.62,tgt:[0,-.27,-.58],x:0,F:null,key:"",cur:"",one:0,lastSw:-1,lastCast:0,lastShake:0,blkOn:false};
 const SKIN={Human:0xd9a77c,Dwarf:0xcf9a74,Elf:0xe6c3a0,Halfling:0xdcab82,Gnome:0xd4a37a,"Half-Elf":0xe0b48e,"Half-Orc":0xa89a6a};
 function kind(){const w=(hero.eq&&hero.eq.w)||"";
  if(/Dagger|knife/i.test(w))return"dagger";if(/bow/i.test(w))return"bow";if(/staff|wand/i.test(w))return"staff";if(/Mace|hammer|club/i.test(w))return"mace";
  if(/sword|blade|Flamebrand|Frostfang|Sunblade|Blazing|Compass|Plumb|Square/i.test(w))return"sword";
  return{Fighter:"sword",Paladin:"mace",Cleric:"mace",Rogue:"dagger",Magician:"staff",Ranger:"bow"}[hero.cls]||"sword"}
 const ACC={sword:"Sword",dagger:"Dagger",staff:"Staff",mace:"Club",bow:"Staff"};
 function build(){
  const k=kind(),cl=(typeof JOBS_CLS!=="undefined"&&JOBS_CLS[hero.cls])||0x6a5a4a;
  const acc=[ACC[k]];
  const F=window.__fig({g:"m",outfit:"peasant",skin:SKIN[hero.race]||SKIN.Human,cloth:cl,pants:0x3a2e22,hair:null,acc,face:1,s:1,w:1});
  if(!F||!F.g)return null;
  const H=window.__HUM,hide=new Set();
  ["head"].forEach(p=>{const nm="m_peasant_"+p;(H.ms[nm]||[]).forEach(x=>hide.add(x.g))});
  
  F.g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false;
    if(o.isSkinnedMesh&&hide.has(o.geometry))o.visible=false}});
  return F}
 const _vu=vmUpdate;let others=null;
 vmUpdate=function(dt){
  _vu(dt);
  try{
   if(!HQ.on||!vmScene||!vmG||!window.__HUM.ok||!window.__HUM.sc.anims)return;
   const k=kind(),key=k+"|"+((hero.eq&&hero.eq.w)||"")+"|"+((hero.eq&&hero.eq.s)||"")+"|"+hero.cls+"|"+hero.race;
   if(k==="bow"){HQ.vis(false);return}
   if(key!==HQ.key||!HQ.F){
    
    if(HQ.piv)vmScene.remove(HQ.piv);HQ.F=build();HQ.key=key;if(!HQ.F)return;HQ.piv=new THREE.Group();HQ.piv.add(HQ.F.g);vmScene.add(HQ.piv);HQ.cur="";HQ.F.g.rotation.y=Math.PI;
    HQ.F.play("idle");HQ.F.mixer.update(.01);HQ.fit2()
   }
   HQ.vis(true);if(vmCam&&vmCam.fov!==HQ.fov){vmCam.fov=HQ.fov;vmCam.updateProjectionMatrix()}
   const F=HQ.F;
   // triggers
   if(vmSwing>=0&&HQ.lastSw<0){F.cur="";F.dead=false;F.play("attack",1.9);HQ.one=.5}
   if(vmCast>0&&HQ.lastCast<=0){F.cur="";F.play("cast",1.7);HQ.one=.5}
   if(typeof shakeT!=="undefined"&&shakeT>.3&&HQ.lastShake<=.3){F.cur="";F.play("hit",1.6)}
   HQ.lastSw=vmSwing;HQ.lastCast=vmCast;HQ.lastShake=typeof shakeT!=="undefined"?shakeT:0;
   F.update(dt);
   const mv=Math.abs(joy.x)+Math.abs(joy.y)+(keys.w||keys.s||keys.a||keys.d||keys.ArrowUp||keys.ArrowDown?1:0);
   const bobY=Math.sin(bob*.5)*(mv?.02:.003),bobX=Math.cos(bob*.25)*(mv?.014:0);
   const asp=vmCam?vmCam.aspect:1.5,back=Math.max(0,1.35-asp)*.25;
   F.g.rotation.y=Math.PI+(HQ.yaw||0);F.g.rotation.y=Math.PI+(HQ.yaw||0);F.g.scale.setScalar(HQ.s);if(HQ.fo)F.g.position.set(HQ.fo.x,HQ.fo.y,HQ.fo.z+back);HQ.piv.position.set(HQ.x+bobX,bobY,0);HQ.piv.rotation.x=HQ.rx;F.g.updateMatrixWorld(true);HQ.arms();
  }catch(e){if(!HQ.err){HQ.err=1;console.warn("HQ",e)}}
 };
 HQ.fit=function(){
  const F=HQ.F;F.g.rotation.y=Math.PI;F.g.scale.setScalar(1);F.g.position.set(0,0,0);HQ.piv.position.set(0,0,0);HQ.piv.rotation.set(0,0,0);HQ.piv.updateMatrixWorld(true);
  let hr=null,hl=null;F.g.traverse(o=>{if(o.isBone){if(o.name==="hand_r")hr=o;if(o.name==="hand_l")hl=o}});
  if(!hr||!hl){HQ.nofit=1;return}
  const a=new THREE.Vector3(),b=new THREE.Vector3();hr.getWorldPosition(a);hl.getWorldPosition(b);
  const sep=a.distanceTo(b),mid=a.clone().add(b).multiplyScalar(.5);
  HQ.s=Math.max(.8,Math.min(1.1,HQ.sepT/sep));
  // place so the midpoint of the hands lands at HQ.tgt in camera space (rotation about x by rx applied after)
  HQ.fo=new THREE.Vector3(-mid.x*HQ.s,-mid.y*HQ.s,-mid.z*HQ.s).add(new THREE.Vector3(HQ.tgt[0],HQ.tgt[1],HQ.tgt[2]));
  HQ.sepRaw=sep;HQ.mid=mid.toArray()};

 const wq=new THREE.Quaternion(),pq=new THREE.Quaternion(),qq=new THREE.Quaternion();
 const wp=(b,v)=>{b.getWorldPosition(v);return v};
 function rot(b,a,c){qq.setFromUnitVectors(a.clone().normalize(),c.clone().normalize());b.getWorldQuaternion(wq);wq.premultiply(qq);if(b.parent)b.parent.getWorldQuaternion(pq);else pq.identity();b.quaternion.copy(pq.invert().multiply(wq));b.updateMatrixWorld(true)}
 function ik2(up,lo,ha,T,hint){
  const S=new THREE.Vector3(),E=new THREE.Vector3(),W=new THREE.Vector3();
  wp(up,S);wp(lo,E);wp(ha,W);const l1=S.distanceTo(E),l2=E.distanceTo(W);
  const dv=T.clone().sub(S),d=Math.max(.12,Math.min(dv.length(),(l1+l2)*.995));const u=dv.normalize();
  let pv=E.clone().sub(S);pv.addScaledVector(u,-pv.dot(u));if(pv.length()<1e-4)pv.set(0,-1,0);pv.normalize();
  const hh=hint.clone();hh.addScaledVector(u,-hh.dot(u));if(hh.length()>1e-4){hh.normalize();pv.multiplyScalar(.35).addScaledVector(hh,.65).normalize()}
  const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  const E2=S.clone().addScaledVector(u,a).addScaledVector(pv,h);
  rot(up,E.clone().sub(S),E2.clone().sub(S));
  wp(lo,E);wp(ha,W);rot(lo,W.clone().sub(E),T.clone().sub(E));
  return}
 HQ.ref=null;
 HQ.fit2=function(){const F=HQ.F;F.g.rotation.y=Math.PI;F.g.scale.setScalar(1);F.g.position.set(0,0,0);HQ.piv.position.set(0,0,0);HQ.piv.rotation.set(0,0,0);HQ.piv.updateMatrixWorld(true);
  const B={};F.g.traverse(o=>{if(o.isBone)B[o.name]=o});HQ.B=B;if(!(B.upperarm_r&&B.upperarm_l&&B.hand_r&&B.hand_l&&B.lowerarm_r&&B.lowerarm_l)){HQ.noik=1;return}
  const a=wp(B.upperarm_r,new THREE.Vector3()),b=wp(B.upperarm_l,new THREE.Vector3()),v=a.clone().sub(b);HQ.yaw=Math.atan2(v.z,v.x);F.g.rotation.y=Math.PI+HQ.yaw;F.g.updateMatrixWorld(true);
  wp(B.upperarm_r,a);wp(B.upperarm_l,b);const M=a.add(b).multiplyScalar(.5);HQ.fo=new THREE.Vector3(HQ.sh[0]-M.x,HQ.sh[1]-M.y,HQ.sh[2]-M.z);HQ.ref=null};
 HQ.fit2=function(){const F=HQ.F;F.g.rotation.y=Math.PI;F.g.scale.setScalar(1);F.g.position.set(0,0,0);HQ.piv.position.set(0,0,0);HQ.piv.rotation.set(0,0,0);HQ.piv.updateMatrixWorld(true);
  const B={};F.g.traverse(o=>{if(o.isBone)B[o.name]=o});HQ.B=B;if(!(B.upperarm_r&&B.upperarm_l&&B.hand_r&&B.hand_l&&B.lowerarm_r&&B.lowerarm_l)){HQ.noik=1;return}
  const a=wp(B.upperarm_r,new THREE.Vector3()),b=wp(B.upperarm_l,new THREE.Vector3()),v=a.clone().sub(b);HQ.yaw=Math.atan2(v.z,v.x);F.g.rotation.y=Math.PI+HQ.yaw;F.g.updateMatrixWorld(true);
  wp(B.upperarm_r,a);wp(B.upperarm_l,b);const M=a.add(b).multiplyScalar(.5);HQ.fo=new THREE.Vector3(HQ.sh[0]-M.x,HQ.sh[1]-M.y,HQ.sh[2]-M.z);HQ.ref=null};
 HQ.arms=function(){
  const F=HQ.F;if(!F)return;
  if(false){const B={};F.g.traverse(o=>{if(o.isBone)B[o.name]=o});HQ.B=B;if(!(B.upperarm_r&&B.lowerarm_r&&B.hand_r&&B.upperarm_l&&B.lowerarm_l&&B.hand_l)){HQ.noik=1;console.warn("HQ no arm bones",Object.keys(B).filter(n=>/arm|hand/i.test(n)))}}
  if(HQ.noik||!HQ.ikOn)return;
  const B=HQ.B;if(B.Head)B.Head.scale.setScalar(.001);F.g.updateMatrixWorld(true);
  const hr=wp(B.hand_r,new THREE.Vector3()),hl=wp(B.hand_l,new THREE.Vector3());
  if(!HQ.ref||HQ.refKey!==HQ.key){HQ.ref=[hr.clone(),hl.clone()];HQ.refKey=HQ.key}
  const k=HQ.dk,sr=wp(B.upperarm_r,new THREE.Vector3()),sl=wp(B.upperarm_l,new THREE.Vector3()),tr=sr.add(new THREE.Vector3(...HQ.tr)).addScaledVector(hr.clone().sub(HQ.ref[0]),k),tl=sl.add(new THREE.Vector3(...HQ.tl)).addScaledVector(hl.clone().sub(HQ.ref[1]),k);
  const q0r=B.hand_r.getWorldQuaternion(new THREE.Quaternion()),q0l=B.hand_l.getWorldQuaternion(new THREE.Quaternion());
  ik2(B.upperarm_r,B.lowerarm_r,B.hand_r,tr,new THREE.Vector3(.5,-1,.25));
  ik2(B.upperarm_l,B.lowerarm_l,B.hand_l,tl,new THREE.Vector3(-.5,-1,.25));
  const D=Math.PI/180,fix=(b,q0,r)=>{const R=new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0]*D,r[1]*D,r[2]*D,"YXZ"));const nq=R.multiply(q0);const pq2=b.parent.getWorldQuaternion(new THREE.Quaternion());b.quaternion.copy(pq2.invert().multiply(nq));b.updateMatrixWorld(true)};
  fix(B.hand_r,q0r,HQ.rr);fix(B.hand_l,q0l,HQ.rl);
  F.g.updateMatrixWorld(true)};
 HQ.vis=function(v){
  if(!others){others=[]}
  vmScene.children.forEach(o=>{if(o.isLight||o===vmG||(o===HQ.piv))return;if(v){if(o.userData._hq!==undefined){o.visible=o.userData._hq;delete o.userData._hq}}else{}
   });
  if(v){vmScene.children.forEach(o=>{if(o.isLight||o===vmG||(o===HQ.piv))return;if(o.userData._hq===undefined)o.userData._hq=o.visible;o.visible=false})}
  if(v){vmG.visible=!D&&!packOpen;vmG.children.forEach(o=>{o.visible=false})}
  if(HQ.piv)HQ.piv.visible=v&&!D&&!packOpen;
 };
})();

/* ===== Omens: tarot and I Ching readings become timed, visible effects that change how the game plays ===== */
(function(){
 if(typeof TAROT==="undefined"||typeof HLOW==="undefined")return;
 /* Golden Dawn style attribution of each Major Arcanum to a planet (zodiac signs by their rulers) */
 const TPL=["Mercury","Mercury","Moon","Venus","Mars","Venus","Mercury","Moon","Sun","Mercury","Jupiter","Venus","Moon","Mars","Jupiter","Saturn","Mars","Saturn","Moon","Sun","Sun","Saturn"];
 /* each I Ching trigram: a boon when the Changes favour you, a burden when they do not */
 const TRI={
  Heaven:{g:{k:"dmg",v:2},b:{k:"dmg",v:-1},gt:"Heaven lends your blows weight: +2 damage",bt:"Heaven turns its face: -1 damage"},
  Earth:{g:{k:"hp",v:8},b:{k:"hp",v:-4},gt:"Earth bears you up: +8 max HP",bt:"Earth gives way: -4 max HP"},
  Water:{g:{k:"mreg",v:.3},b:{k:"mreg",v:-.15},gt:"Water flows into you: mana returns steadily",bt:"Water drains from you: mana leaks away"},
  Fire:{g:{k:"hit",v:2},b:{k:"hit",v:-1},gt:"Fire clears your eye: +2 to hit",bt:"Smoke fills your eye: -1 to hit"},
  Thunder:{g:{k:"dodge",v:.6},b:{k:"dodge",v:1.5},gt:"Thunder quickens you: dodge recharges faster",bt:"Thunder startles you: dodge recharges slowly"},
  Wind:{g:{k:"speed",v:1.12},b:{k:"speed",v:.9},gt:"Wind fills your stride: you move faster",bt:"Wind pushes against you: you move slower"},
  Mountain:{g:{k:"ac",v:3},b:{k:"ac",v:-1},gt:"Mountain stands behind you: +3 AC",bt:"Mountain looms over you: -1 AC"},
  Lake:{g:{k:"herb",v:1.8},b:{k:"herb",v:.5},gt:"Lake brings abundance: more herbs from the fallen",bt:"Lake runs dry: fewer herbs from the fallen"}};
 const ADD={hit:1,dmg:1,ac:1,foe:1,hp:1,mreg:1};
 const PRES={hit:{k:"hit",v:2,t:"+2 to hit"},dmg:{k:"dmg",v:2,t:"+2 damage"},ac:{k:"ac",v:2,t:"+2 AC"},"foe-":{k:"foe",v:-2,t:"foes strike at -2"},
  "hit-":{k:"hit",v:-1,t:"-1 to hit"},"bad-ac":{k:"ac",v:-1,t:"-1 AC"},"foe+":{k:"foe",v:1,t:"foes strike at +1"}};
 const cur=()=>{const o=hero&&hero.omen;return o&&o.left>0?o:null};
 const OMEN=window.OMEN={
  b(k){const o=cur();let s=0;if(o)o.fx.forEach(f=>{if(f.k===k&&ADD[k])s+=f.v});if(window.DAYT&&ADD[k])s+=DAYT.perm(k);return s},
  m(k){const o=cur();let s=1;if(o)o.fx.forEach(f=>{if(f.k===k&&!ADD[k])s*=f.v});if(window.DAYT&&!ADD[k])s*=DAYT.perm(k,true);return s},
  attuned(pl){const o=cur();return !!(o&&o.fx.some(f=>f.k==="att"&&f.v===pl))},
  cur,
  describe(fx){const out=[];fx.forEach(f=>{if(f.t)out.push(f.t)});return out},
  set(o){hero.omen=o;chip(true)},
  clear(){if(hero)hero.omen=null;chip(true)}};
 function hourBoost(pl){try{return PCK.now().hour.n===pl}catch(e){return false}}
 function fromTarot(cards){
  const past=cards[0],pres=cards[1],fut=cards[2],t=TAROT[pres.i],key=pres.rev?t[4]:t[3],fx=[],name=[];
  const ppl=TPL[past.i];
  if(!past.rev){fx.push({k:"att",v:ppl,t:ppl+" is attuned: its weapons, spells and herbs hit harder"})}
  if(PRES[key]){const p=PRES[key];fx.push({k:p.k,v:p.v,t:p.t})}
  if(fut.rev)fx.push({k:"spawn",v:.6,t:"more wanderers on the road"},{k:"reward",v:1.4,t:"richer spoils (+40% XP and gold)"});
  else fx.push({k:"spawn",v:1.5,t:"a quieter road"},{k:"reward",v:1.2,t:"richer spoils (+20% XP and gold)"});
  hero.fate=null;
  const pp=TPL[pres.i],dur=900*(hourBoost(pp)||hourBoost(ppl)?1.5:1);
  OMEN.set({name:t[0]+(pres.rev?" reversed":""),src:"tarot",fx,left:dur,max:dur,sub:"Past: "+TAROT[past.i][0]+(past.rev?" (rev)":"")+" · Future: "+TAROT[fut.i][0]+(fut.rev?" (rev)":"")});
  return "The reading holds for a while: "+OMEN.describe(fx).join("; ")+"."+(dur>900?" The hour agrees with the cards, and the omen lasts longer.":"")}
 const kindOf=n=>HEXG.includes(n)?"good":HEXB.includes(n)?"bad":"mid";
 function trigFx(n){
  const lo=HLOW[n-1],lower=TRIGN[lo[0]],upper=TRIGN[lo[1]],kd=kindOf(n),fx=[];
  const add=(tr,bad)=>{const d=TRI[tr];const e=bad?d.b:d.g;fx.push({k:e.k,v:e.v,t:bad?d.bt:d.gt})};
  if(kd==="good"){add(lower,false);add(upper,false)}else if(kd==="mid")add(upper,false);else add(lower,true);
  return fx}
 OMEN.iching=function(n1,n2){
  const fx1=trigFx(n1),dur=720;let fx2=null;
  if(n2)fx2=trigFx(n2);
  OMEN.set({name:"Hexagram "+n1+" · "+HEX[n1-1].split("|")[0],src:"iching",fx:fx1,left:dur,max:dur,next:fx2?{at:dur/2,fx:fx2,name:"Hexagram "+n2+" · "+HEX[n2-1].split("|")[0]}:null,sub:TRIGN[HLOW[n1-1][0]]+" below, "+TRIGN[HLOW[n1-1][1]]+" above"});
  return "The hexagram settles on you: "+OMEN.describe(fx1).join("; ")+"."+(fx2?" When the old line turns, so will your fortune.":"")};
 const _tr=tarotReading;
 tarotReading=function(){const r=_tr.apply(this,arguments);try{r.eff=r.eff.replace(/, brings fate: .*$/,", sets your fate.")+" "+fromTarot(r.cards)}catch(e){console.warn("omen",e)}return r};
 /* ---- tick: countdown, change of lines, mana flow, expiry ---- */
 let chipEl=null,lastTxt="";
 function chip(force){
  if(!chipEl){chipEl=document.createElement("div");chipEl.id="omenchip";
   chipEl.style.cssText="position:fixed;left:10px;bottom:96px;max-width:260px;padding:6px 10px;border:1px solid #6a4a9a;border-radius:6px;background:rgba(14,8,26,.78);color:#e6d8ff;font:12px/1.35 Georgia,serif;pointer-events:none;z-index:22;display:none;white-space:normal";document.body.appendChild(chipEl)}
  const o=cur();
  if(!o||(typeof C!=="undefined"&&false)){chipEl.style.display="none";lastTxt="";return}
  const m=Math.floor(o.left/60),s=Math.floor(o.left%60),txt="<b>"+(o.glyph?o.glyph+" ":o.src==="tarot"?"☽ ":"☯ ")+o.name+"</b> <span style='opacity:.7'>"+m+":"+(s<10?"0":"")+s+"</span><br><span style='opacity:.8'>"+o.fx.filter(f=>f.t).map(f=>f.t.replace(/ (is attuned:).*/,' attuned')).join(" · ")+"</span>";
  if(force||txt!==lastTxt){chipEl.innerHTML=txt;lastTxt=txt}chipEl.style.display=(typeof hero!=="undefined"&&hero&&!document.getElementById("start")?.offsetParent)?"block":"none"}
 const _vu=vmUpdate;let acc=0;
 vmUpdate=function(dt){_vu(dt);try{
  const o=cur();
  if(!o){if(hero&&hero.omen){hero.omen=null;try{note("The omen fades.")}catch(e){}chip(true)}
   const mr0=OMEN.b("mreg");if(mr0&&!(typeof C!=="undefined"&&C&&!C.rt))hero.mana=Math.max(0,Math.min(maxMP(),hero.mana+mr0*dt));return}
  if(typeof C!=="undefined"&&C&&!C.rt)return;
  o.left-=dt;
  if(o.next&&o.left<=o.next.at){o.fx=o.next.fx;o.name=o.next.name;o.next=null;try{note("The line turns: "+OMEN.describe(o.fx).join("; "))}catch(e){}chip(true)}
  const mr=OMEN.b("mreg");if(mr){hero.mana=Math.max(0,Math.min(maxMP(),hero.mana+mr*dt))}
  acc+=dt;if(acc>.5){acc=0;chip(false);try{if(hero.hp>maxHP())hero.hp=maxHP()}catch(e){}}
 }catch(e){}};
})();

/* ===== forest canopy: leaves overhead, dappled shade, light shafts, extra understory trees ===== */
(function(){
 if(typeof THREE==="undefined"||typeof updateTOD==="undefined")return;
 const CP=window.CANOPY={on:1,cv:0,cov:null};
 let built=false,shafts=[];
 function leafTex(){
  const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");
  const cols=["#1f4220","#2a5526","#356a2c","#447d34","#58943d","#6fa648"];let s=7;const R=()=>{s=(s*16807)%2147483647;return s/2147483647};
  for(let i=0;i<150;i++){const px=R()*256,py=R()*256,sz=10+R()*20,rot=R()*6.283;
   for(const ox of[0,-256,256])for(const oy of[0,-256,256]){const X=px+ox,Y=py+oy;if(X<-40||X>296||Y<-40||Y>296)continue;
    x.save();x.translate(X,Y);x.rotate(rot);x.fillStyle=cols[(R()*cols.length)|0];x.beginPath();x.ellipse(0,0,sz,sz*.42,0,0,6.283);x.fill();
    x.strokeStyle="rgba(20,50,18,.55)";x.lineWidth=1;x.beginPath();x.moveTo(-sz,0);x.lineTo(sz,0);x.stroke();x.restore()}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2.4,2.4);t.anisotropy=4;return t}
 function shaftTex(){const c=document.createElement("canvas");c.width=32;c.height=128;const x=c.getContext("2d");
  const g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,"rgba(255,240,180,0)");g.addColorStop(.25,"rgba(255,240,180,.9)");g.addColorStop(1,"rgba(255,240,180,.15)");x.fillStyle=g;x.fillRect(0,0,32,128);
  const h=x.createLinearGradient(0,0,32,0);h.addColorStop(0,"rgba(0,0,0,1)");h.addColorStop(.5,"rgba(0,0,0,0)");h.addColorStop(1,"rgba(0,0,0,1)");x.globalCompositeOperation="destination-out";x.fillStyle=h;x.fillRect(0,0,32,128);
  return new THREE.CanvasTexture(c)}
 function build(){
  built=true;const geo=new THREE.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);
  const mat=new THREE.MeshLambertMaterial({map:leafTex(),alphaTest:.5,side:THREE.DoubleSide,fog:true});
  const list=[],cov=new Float32Array(W*H);
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
   if(biome[y][x]!=="forest"||map[y][x]==="water")continue;
   const cx=x*TW+1,cz=y*TW+1;if(siteNear(cx,cz,10)||(Math.abs(x-SX)+Math.abs(y-SY)<6))continue;
   const d=vn(x/4.2+7,y/4.2+3);if(d<.47)continue;
   cov[y*W+x]=Math.min(1,(d-.47)*3.2);
   const n=d>.72?2:1;
   for(let k=0;k<n;k++){const r1=hs(x*3+k,y*7),r2=hs(x*5,y*11+k),r3=hs(x+k*9,y*13);
    list.push({x:cx+(r1-.5)*TW*1.4,z:cz+(r2-.5)*TW*1.4,y:hfn(cx,cz)+5.3+r3*2.6,s:4.6+r1*3,ry:r2*6.283,tx:(r3-.5)*.35,tz:(r1-.5)*.35})}}
  const mesh=new THREE.InstancedMesh(geo,mat,list.length),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),sc=new THREE.Vector3();
  list.forEach((d,i)=>{e.set(d.tx,d.ry,d.tz);q.setFromEuler(e);p.set(d.x,d.y,d.z);sc.set(d.s,1,d.s);m.compose(p,q,sc);mesh.setMatrixAt(i,m)});
  Object.defineProperty(mesh,"frustumCulled",{get:()=>false,set:()=>{}});world.add(mesh);CP.mesh=mesh;CP.cov=cov;
  /* light shafts in the gaps */
  const sm=new THREE.MeshBasicMaterial({map:shaftTex(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,opacity:0,side:THREE.DoubleSide}),sg=new THREE.PlaneGeometry(1,1);sg.translate(0,.5,0);
  CP.smat=sm;let n=0;
  for(let y=2;y<H-2&&n<110;y++)for(let x=2;x<W-2&&n<110;x++){
   if(biome[y][x]!=="forest"||cov[y*W+x]>0||tileSolid(x,y)||hs(x*17,y*5)>.2)continue;
   let near=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)near+=cov[(y+dy)*W+x+dx]>0?1:0;if(near<8)continue;
   const cx=x*TW+1,cz=y*TW+1,s=new THREE.Mesh(sg,sm);s.position.set(cx,hfn(cx,cz),cz);s.scale.set(1.3+hs(x,y)*1.2,6.8,1);s.renderOrder=3;world.add(s);shafts.push(s);n++}
  /* understory trees need hit circles so you walk among them */
 }
 function covAt(px,pz){if(!CP.cov)return 0;const tx=Math.floor(px/TW),ty=Math.floor(pz/TW);let s=0,w=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const a=tx+dx,b=ty+dy;if(a<0||b<0||a>=W||b>=H)continue;const k=dx===0&&dy===0?2:1;s+=CP.cov[b*W+a]*k;w+=k}return s/w}
 const _u=updateTOD;
 updateTOD=function(){const day=_u.apply(this,arguments);
  try{if(!CP.on)return day;if(!built&&typeof world!=="undefined"&&world&&world.children.length>8)build();
   if(built){const tv=covAt(camera.position.x,camera.position.z);CP.cv+=(tv-CP.cv)*.06;const k=CP.cv;
    sunL.intensity*=1-.38*k;hemi.intensity*=1-.14*k;
    if(CP.smat){const near=Math.min(1,Math.max(0,k*1.4));CP.smat.opacity=.2*day*(.35+near)*(todDay>.2?1:0);}
    const cp=camera.position;shafts.forEach(s=>{const dx=cp.x-s.position.x,dz=cp.z-s.position.z;s.visible=dx*dx+dz*dz<1400;if(s.visible)s.rotation.y=Math.atan2(dx,dz)})}}catch(e){if(!window.__cpe){window.__cpe=1;console.warn("canopy",e)}}
  return day};
})();

/* ===== The Seven Day-Temples, and three odd places. Each planet's temple opens only in its own hour or on its own day ===== */
(function(){
 if(typeof SITES==="undefined"||typeof PLN==="undefined"||typeof PCK==="undefined"||typeof buildSite==="undefined")return;
 const T={
  saturn:{pl:"Saturn",name:"Chapel of the Slow Lead",guard:"Draugr",gl:"Lead is the oldest patience. Here the hour is kept by the one who keeps all hours, and it keeps them slowly. Black monoliths lean toward an hourglass of stone, and the sand does not fall.",
   boon:[{k:"ac",v:3,t:"Lead in the bones: +3 AC"},{k:"dodge",v:1.2,t:"Saturn's hand is slow: dodge recharges a little slower"}],perm:{ac:1},permT:"+1 AC for ever",win:"The last Draugr crumbles. The sand in the stone hourglass falls, one grain, and the whole chapel exhales."},
  jupiter:{pl:"Jupiter",name:"Grove of the Thunderer",guard:"Fallen Paladin",gl:"Tin, law and the oak that draws the lightning. Four columns hold up nothing at all but the sky, and a single great oak stands where the altar should be. The air tastes of rain that has not fallen yet.",
   boon:[{k:"hp",v:10,t:"Jove's largesse: +10 max HP"},{k:"reward",v:1.25,t:"Jove's largesse: +25% XP and gold"}],perm:{hp:4},permT:"+4 max HP for ever",win:"The Paladin kneels, then falls. Thunder rolls over a clear sky. The oak is wet with rain that never fell."},
  mars:{pl:"Mars",name:"Iron Ward-Hall",guard:"Orc Warrior",gl:"Iron, war and the sharpening of things. A ring of spears faces outward and four braziers burn red. At the centre an anvil, and on the anvil, nothing: the thing that was forged here is already out in the world.",
   boon:[{k:"dmg",v:3,t:"Iron in your arm: +3 damage"},{k:"hit",v:1,t:"Iron in your eye: +1 to hit"}],perm:{dmg:1},permT:"+1 damage for ever",win:"The last warrior drops his axe, and the braziers flare once, white-hot, then settle."},
  sun:{pl:"Sun",name:"Altar of the Unsetting Sun",guard:"Ushabti Guardian",gl:"Gold, the heart, the noon that does not lean. A golden disc stands on a pole in a ring of white sand and burns without fire. You cannot look at it for long, and you do not want to look away.",
   boon:[{k:"hit",v:2,t:"The Sun's clarity: +2 to hit"},{k:"hp",v:6,t:"The Sun's warmth: +6 max HP"}],perm:{hit:1},permT:"+1 to hit for ever",win:"The Guardian lies down in the sand and is gold, and then dust. The disc turns one degree toward you."},
  venus:{pl:"Venus",name:"Rose Terraces of Cypris",guard:"Nymph",gl:"Copper, roses and the harmony of unequal things. Three arches of living rose, a basin of clear water and the sound of someone humming just out of sight. The thorns are sharper than they look.",
   boon:[{k:"herb",v:2,t:"Cypris is generous: twice the herbs from the fallen"},{k:"mreg",v:.3,t:"Cypris soothes: mana returns steadily"}],perm:{mreg:.08},permT:"a thread of mana returns for ever",win:"The humming stops. Where the Nymph fell, a rose opens, and the scent is the first kind thing you have smelled in days."},
  mercury:{pl:"Mercury",name:"Causeway of the Caduceus",guard:"Bog Imp",gl:"Quicksilver, speech and the road between two places. A staff taller than a tree stands at the end of a plank causeway, two serpents climbing it in opposite directions. Everything here is a crossing.",
   boon:[{k:"speed",v:1.15,t:"Hermes' heel: you move faster"},{k:"dodge",v:.6,t:"Hermes' heel: dodge recharges faster"}],perm:{speed:1.04},permT:"a little faster for ever",win:"The imps scatter, laughing. A feather lands on the staff and stays."},
  moon:{pl:"Moon",name:"Silver Pool of Selene",guard:"Goetic Wraith",gl:"Silver, tides and the things that are only true by night. A round pool in a ring of white stones holds a second, smaller moon, even at noon. A crescent of silver stands upright above it, and does not cast a shadow.",
   boon:[{k:"mreg",v:.5,t:"Selene's tide: mana returns quickly"},{k:"spawn",v:1.5,t:"Selene hushes the road: fewer wanderers"}],perm:{mreg:.12},permT:"mana returns faster for ever",win:"The Wraith pours itself into the pool and is gone. The little moon in the water turns full."}};
 const KEYS=Object.keys(T);
 const OD={garden:{name:"Hanging Gardens of the Ravine",col:"#7aff9a",gl:"Terraces climb the walls of a ravine, each green with plants that have no business growing together: henbane beside rose, wormwood beside jasmine. Water falls from terrace to terrace, and somewhere above, a gardener who is not there is still working."},
  mirror:{name:"The Mirror Flats",col:"#cfe8ff",gl:"A salt flat so level and so wet it has become a sky. Your reflection walks beneath you, a step behind, and looks slightly more interested than you do. The old scryers said that a mirror shows what is, and also what is hidden."},
  bell:{name:"The Drowned Bell Tower",col:"#9ab0a0",gl:"A tower rises out of the bog to the height of ten men and goes on down for who knows how far. A bell still hangs in the arch, green with age. It is not a good idea to ring it. People have always rung it."}};
 const DT=()=>{if(!hero.dt)hero.dt={};return hero.dt};
 const done=k=>!!(hero&&hero.dt&&hero.dt[k]&&hero.dt[k].done);
 const nDone=()=>KEYS.filter(done).length;
 const open=pl=>{const n=PCK.now();return n.hour.n===pl||n.day.n===pl};
 const glyph=pl=>(PLN.find(p=>p.n===pl)||{}).g||"";
 const minsTo=pl=>{const s=PCK.sched(8).find(x=>x.pl.n===pl);return s?Math.max(0,Math.ceil(s.inMs/60000)):0};
 window.DAYT={T,KEYS,done,nDone,open,heptad:()=>!!(hero&&nDone()>=7),perm(k,mult){let s=mult?1:0;KEYS.forEach(q=>{if(done(q)&&T[q].perm&&T[q].perm[k]!=null){if(mult)s*=T[q].perm[k];else s+=T[q].perm[k]}});return s}};
 ITEMS["Heptad Seal"]={t:"c",hp:8,mp:6,sp:1,ac:1,m:1,desc:"Seven hours, seven metals, seven temples. The Unmoved One cannot ignore the sound of all seven together."};
 /* ---------- helpers ---------- */
 const rowOf=n=>{for(const b in FOES){const r=FOES[b].find(x=>x[0]===n);if(r)return r}return FOES.forest[0]};
 function bless(k){const t=T[k],pl=t.pl;
  OMEN.set({name:"Blessing of "+pl,src:"temple",glyph:glyph(pl),fx:[{k:"att",v:pl,t:pl+" is attuned: its weapons, spells and herbs hit harder"}].concat(t.boon),left:1800,max:1800,sub:t.name});
  try{say("The blessing of "+pl+" settles on you for a long while: "+OMEN.describe(OMEN.cur().fx).join("; ")+".")}catch(e){}}
 function spot(wx,wz,d){for(let k=0;k<40;k++){const a=Math.random()*6.283,x=wx+Math.cos(a)*d,z=wz+Math.sin(a)*d;
   if(x>2&&z>2&&!blocked(x,z,.7)&&hfn(x,z)>-.2&&!RT.safe(x,z))return{x,z,a}}return null}
 function packFight(p,rowName,hpMul,after,label){
  occClose();const f=rowOf(rowName).slice();f[1]=Math.round(f[1]*hpMul);f[7]=Math.round(f[7]*1.8);
  const wx=p.x*TW+1,wz=p.z!=null?p.z:p.y*TW+1,s=spot(wx,wz,14),tier=Math.max(2,tierAt(p.x,p.y));
  if(s){P.x=s.x;P.z=s.z;yaw=Math.atan2(-(wx-s.x),-(wz-s.z))+Math.PI;}
  const fw=[-Math.sin(yaw),-Math.cos(yaw)],n=Math.min(3,1+Math.floor((hero.level||1)/4));
  try{say(label||"Something answers.")}catch(e){}
  setTimeout(()=>{if(C)return;
   if(window.__mkRoamer)for(let i=0;i<n;i++){const lx=P.x+fw[0]*(13+i*1.5)+(i%2?3:-3),lz=P.z+fw[1]*(13+i*1.5)+(i%2?-3:3);try{window.__mkRoamer(rowOf(rowName),tier,lx,lz);const r=window.__ROAM[window.__ROAM.length-1];if(r){r.mode="chase";r.hp=Math.round(r.f[1]*hpMul*.7)}}catch(e){}}
   startCombat(f,tier,won=>{if(won)after();else try{say("The trial is not finished. The door will open again in the hour.")}catch(e){}},{at:{x:P.x+fw[0]*10,z:P.z+fw[1]*10}})},500)}
 function offer(p,k){const t=T[k],pl=t.pl,d=DT();if(!open(pl)||herbCount(pl)<2)return;
  spendHerbs(pl,2);const st=d[k]||(d[k]={});
  if(st.done){bless(k);reopen(p,"");return}
  packFight(p,t.guard,1.3,()=>{st.done=1;hero.xp+=0;try{const out=[];addXp(120+hero.level*20,out);fixStats();hud();say(t.win+" "+out.join(" ")+" Talisman of "+pl+": "+t.permT+".")}catch(e){}
   bless(k);try{if(nDone()>=7){BN.banner("♅ THE HEPTAD");say("Seven temples, seven hours. The seven talismans hum in tune. Something far away stops listening to silence.")}}catch(e){}try{QST.tick()}catch(e){}},"The inner door opens and the temple's guardians come out of the "+pl+" light.")}
 /* ---------- SITES entries ---------- */
 KEYS.forEach(k=>{const t=T[k],pl=t.pl,col=PLN.find(q=>q.n===pl).c;
  SITES["dt_"+k]={col,lore:t.gl+(done(k)?"":""),cw:240,cv:()=>symCanvas("hept",0,col),acts:[
   {t:()=>open(pl)?"The door stands open ("+(PCK.now().hour.n===pl?"its hour":"its day")+")":"The door is sealed until the hour of "+pl+" (about "+minsTo(pl)+" min)",dis:()=>true,f:()=>{}},
   {t:()=>"Wait for the hour of "+pl,hide:()=>open(pl),f:p=>{const add=PCK.skipTo(pl);reopen(p,add?"You sit with the sealed door until the sky turns. It is the hour of "+pl+".":"The hour has already come.")}},
   {t:()=>done(k)?"Offer 2 "+pl+" herbs for the blessing ("+herbCount(pl)+" held)":"Offer 2 "+pl+" herbs and open the inner door ("+herbCount(pl)+" held)",dis:()=>!open(pl)||herbCount(pl)<2,f:p=>offer(p,k)},
   {t:()=>"Talisman of "+pl+": "+(done(k)?t.permT:"not yet earned"),dis:()=>true,f:()=>{}},
   {t:()=>"Day-temples attuned: "+nDone()+"/7"+(nDone()>=7?" (Heptad Seal earned)":""),dis:()=>true,f:()=>{}}]}});
 SITES.dt_garden={col:OD.garden.col,lore:OD.garden.gl,cw:240,cv:()=>symCanvas("rose",0,OD.garden.col),acts:[
  {t:()=>"Tend the garden"+((hero.steps-((DT().garden||{}).t||-999))<220?" (it needs time to grow back)":""),dis:()=>(hero.steps-((DT().garden||{}).t||-999))<220,f:p=>{
   const d=DT();d.garden={t:hero.steps};const got=[];for(let i=0;i<3;i++){const pl=PLN[Math.floor(Math.random()*7)],h=pl.h[Math.floor(Math.random()*3)];giveItem(h,2);OCCP().herbs[h]=1;got.push("2 "+h)}giveItem("Healing herb",3);reopen(p,"You work the terraces until your hands are green. You take "+got.join(", ")+" and 3 healing herb.")}}]};
 SITES.dt_mirror={col:OD.mirror.col,lore:OD.mirror.gl,cw:240,cv:()=>symCanvas("rings",0,OD.mirror.col),acts:[
  {t:()=>"Gaze into the mirror (scry for a hidden place)",f:p=>{const left=POIS.filter(q=>q.hidden&&!found[q.id]);
   if(!left.length){const o=[];addXp(60,o);fixStats();hud();reopen(p,"The mirror shows only yourself, a little older. "+o.join(" "));return}
   left.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));const q=left[0];found[q.id]=1;draw();
   let dir="";try{dir=QST.dirTo(q.id)}catch(e){}reopen(p,"The reflection lifts a hand and points. The salt clouds, and you see "+q.name+". "+dir+".")}}]};
 SITES.dt_bell={col:OD.bell.col,lore:OD.bell.gl,cw:240,cv:()=>symCanvas("penta",0,OD.bell.col),acts:[
  {t:()=>"Ring the bell"+((hero.steps-((DT().bell||{}).t||-999))<300?" (the water is still)":""),dis:()=>(hero.steps-((DT().bell||{}).t||-999))<300,f:p=>{
   DT().bell={t:hero.steps};packFight(p,"Lemure",1.2,()=>{try{const out=[];addXp(160+hero.level*15,out);giveItem("Healing potion");giveItem("Mana potion");fixStats();hud();say("The bell goes quiet. The Lemures sink. In the shallows: a healing potion and a mana potion. "+out.join(" "))}catch(e){}},"The bell speaks, and the bog answers.")}}]};
 /* ---------- structures ---------- */
 function build(p,g,id){
  const key=id.slice(3),t=T[key],st=PM("flag",0xe8e0f0,.1,1),dk=M(0x2a2630,{roughness:.6}),
   glow=(c,i)=>M(c,{emissive:c,emissiveIntensity:i||1.2,flatShading:false}),
   col=t?parseInt(PLN.find(q=>q.n===t.pl).c.slice(1),16):0x88aa88,csS=t?PLN.find(q=>q.n===t.pl).c:"#88aa88",
   light=(c,i,d,y)=>{const l=new THREE.PointLight(c,i,d);l.position.set(0,y,0);g.add(l);return l};
  if(t){mk(g,new THREE.CylinderGeometry(6.6,7,.4,40),dk,0,.15,0);decal(g,"hept",6.2,csS,.4);
   for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,x=Math.cos(a)*5,z=Math.sin(a)*5;mk(g,new THREE.CylinderGeometry(.4,.5,4.2,10),st,x,2.3,z);mk(g,new THREE.SphereGeometry(.34,10,8),glow(col,1.4),x,4.7,z,{ns:1})}
   mk(g,new THREE.CylinderGeometry(.9,1.1,.9,8),dk,0,.65,0);const orb=mk(g,new THREE.OctahedronGeometry(.5),glow(col,1.8),0,1.9,0,{ns:1});if(typeof SPIN!=="undefined")SPIN.push({o:orb,ax:"y",sp:1.1})}
  if(key==="saturn"){for(let i=0;i<7;i++){const a=i/7*6.283;mk(g,new THREE.BoxGeometry(.9,4.5+(i%3)*.6,.6),M(0x18141c,{roughness:.5}),Math.cos(a)*6.4,2.3,Math.sin(a)*6.4,{r:[0,-a,(i%2?.07:-.07)]})}
   mk(g,new THREE.ConeGeometry(1.1,2.4,8),st,0,3.4,0,{r:[Math.PI,0,0]});mk(g,new THREE.ConeGeometry(1.1,2.4,8),st,0,5.8,0)}
  else if(key==="jupiter"){[-5.6,5.6].forEach(x=>[-5.6,5.6].forEach(z=>{mk(g,new THREE.CylinderGeometry(.55,.65,7,12),st,x,3.6,z);mk(g,new THREE.BoxGeometry(1.5,.4,1.5),M(0xe0b84a,{metalness:.6,roughness:.35}),x,7.2,z)}));
   mk(g,new THREE.CylinderGeometry(.55,.8,4,8),M(0x4a3420),0,2.2,-2.6);mk(g,new THREE.SphereGeometry(2.6,10,8),M(0x2f5a2a,{flatShading:true}),0,5.6,-2.6)}
  else if(key==="mars"){for(let i=0;i<12;i++){const a=i/12*6.283;mk(g,new THREE.ConeGeometry(.14,5.2,5),M(0x8a8a90,{metalness:.8,roughness:.3}),Math.cos(a)*6.3,2.6,Math.sin(a)*6.3,{r:[Math.sin(a)*.18,0,-Math.cos(a)*.18]})}
   for(let i=0;i<4;i++){const a=i/4*6.283+.78,x=Math.cos(a)*3.4,z=Math.sin(a)*3.4;mk(g,new THREE.CylinderGeometry(.35,.25,1.2,6),dk,x,.9,z);mk(g,new THREE.ConeGeometry(.3,.8,6),glow(0xff4a20,1.8),x,1.9,z,{ns:1})}
   mk(g,new THREE.BoxGeometry(1.6,.6,.8),dk,0,1.5,-1.4)}
  else if(key==="sun"){mk(g,new THREE.CylinderGeometry(.18,.22,8,8),M(0xe0b84a,{metalness:.6,roughness:.35}),0,4.2,0);const d=mk(g,new THREE.CylinderGeometry(1.5,1.5,.2,24),glow(0xffd860,1.6),0,8.4,0,{r:[Math.PI/2,0,0],ns:1});
   for(let i=0;i<12;i++){const a=i/12*6.283;mk(g,new THREE.BoxGeometry(.12,1.1,.1),glow(0xffd860,1.3),Math.cos(a)*2.1,8.4+Math.sin(a)*2.1,0,{r:[0,0,a-Math.PI/2],ns:1})}}
  else if(key==="venus"){for(let i=0;i<3;i++){const a=i/3*6.283+.5,x=Math.cos(a)*4.6,z=Math.sin(a)*4.6;mk(g,new THREE.TorusGeometry(2.1,.18,6,16,Math.PI),M(0x3f7a3a),x,2.2,z,{r:[0,-a+Math.PI/2,0]});
    for(let k=0;k<9;k++){const b=k/8*Math.PI;mk(g,new THREE.SphereGeometry(.2,6,5),M(k%2?0xff7aa8:0xff4a7a),x+Math.cos(b)*2.1*Math.cos(a+Math.PI/2),2.2+Math.sin(b)*2.1,z+Math.cos(b)*2.1*Math.sin(a+Math.PI/2),{ns:1})}}
   mk(g,new THREE.CylinderGeometry(1.7,1.7,.3,20),M(0x7ad0e8,{roughness:.1,metalness:.3,transparent:true,opacity:.85}),0,.55,0,{ns:1})}
  else if(key==="mercury"){for(let i=-3;i<=3;i++)mk(g,new THREE.BoxGeometry(1.4,.12,.6),M(0x6a5030),i*1.7,.05,8.5);
   mk(g,new THREE.CylinderGeometry(.14,.16,9,8),M(0xc8c8d4,{metalness:.9,roughness:.2}),0,4.6,-2.2);
   [0,Math.PI].forEach(r=>{const k=mk(g,new THREE.TorusKnotGeometry(.55,.09,60,6,2,3),M(0xc8c8d4,{metalness:.9,roughness:.2}),0,4.6,-2.2,{r:[Math.PI/2,0,r]});k.scale.set(1,1,3)});
   [-1,1].forEach(s=>mk(g,new THREE.BoxGeometry(2.2,.12,.8),M(0xeee8d8),s*1.3,9.2,-2.2,{r:[0,0,s*.35]}))}
  else if(key==="moon"){mk(g,new THREE.CylinderGeometry(4,4,.15,32),M(0xcfe0ff,{emissive:0x7a90c0,emissiveIntensity:.9,roughness:.1,metalness:.4}),0,.5,0,{ns:1});
   for(let i=0;i<10;i++){const a=i/10*6.283;mk(g,new THREE.SphereGeometry(.6,8,6),M(0xe6e6ec,{flatShading:true}),Math.cos(a)*4.6,.5,Math.sin(a)*4.6)}
   mk(g,new THREE.TorusGeometry(2.4,.22,8,24,Math.PI*1.2),M(0xdfe6ff,{emissive:0xa0b0e0,emissiveIntensity:.8,metalness:.7}),0,5,0,{r:[0,0,Math.PI*.9],ns:1})}
  else if(key==="garden"){const cols=[0x3f7a3a,0x4f8a3a,0x5f9a44,0x6faa4c];for(let i=0;i<4;i++){mk(g,new THREE.BoxGeometry(11-i*2.2,.9,6-i*1),M(0x5a5048),0,.45+i*1.1,-i*1.2);mk(g,new THREE.BoxGeometry(10.6-i*2.2,.25,5.6-i*1),M(cols[i]),0,1+i*1.1,-i*1.2,{ns:1});
    for(let k=0;k<8;k++){mk(g,new THREE.SphereGeometry(.28,6,5),M([0xff7aa8,0xffe14a,0xb08aff,0xffffff][k%4]),(k-3.5)*(1.2-i*.18),1.3+i*1.1,2.6-i*1.2+(k%2)*.4,{ns:1})}}
   [-3,3].forEach(x=>mk(g,new THREE.BoxGeometry(.5,3.6,.12),M(0x9ad0f0,{transparent:true,opacity:.6,roughness:.1}),x,2.4,2.9,{ns:1}))}
  else if(key==="mirror"){mk(g,new THREE.CylinderGeometry(8,8,.06,48),M(0xdcecff,{metalness:1,roughness:.04}),0,.12,0,{ns:1});
   for(let i=0;i<16;i++){const a=i/16*6.283,h=.8+hs(i,5)*1.4;mk(g,new THREE.ConeGeometry(.35,h,5),M(0xf4f6fa,{roughness:.2}),Math.cos(a)*8.6,h/2,Math.sin(a)*8.6)}
   mk(g,new THREE.TorusGeometry(1.6,.1,8,24),M(0xcfe8ff,{emissive:0x9ac0ff,emissiveIntensity:.7}),0,1.8,0,{r:[Math.PI/2,0,0],ns:1})}
  else if(key==="bell"){mk(g,new THREE.CylinderGeometry(2.2,2.6,11,10),M(0x5a5a52,{roughness:.8}),0,5.2,0);mk(g,new THREE.CylinderGeometry(3.4,3.4,.3,16),M(0x2f3a2a,{transparent:true,opacity:.85}),0,.3,0,{ns:1});
   mk(g,new THREE.BoxGeometry(5,.5,5),M(0x5a5a52),0,11,0);mk(g,new THREE.ConeGeometry(1,1.8,10),M(0x6a8a62,{metalness:.6,roughness:.5}),0,9.6,0,{r:[Math.PI,0,0]});
   for(let i=0;i<6;i++){const a=i/6*6.283;mk(g,new THREE.CylinderGeometry(.1,.14,2.4+(i%3),5),M(0x3a342a),Math.cos(a)*4.6,1,Math.sin(a)*4.6,{r:[(i%2?.15:-.15),0,.1]})}}
 }
 /* wild herb patches grow back after a while */
 const gotAt={};
 setInterval(()=>{try{if(!hero||typeof PICK==="undefined")return;const now=Date.now();PICK.forEach(q=>{if(q.k!=="herb")return;
   if(got[q.id]){if(!gotAt[q.id])gotAt[q.id]=now;else if(now-gotAt[q.id]>480000&&Math.hypot(q.x*TW+1-P.x,q.y*TW+1-P.z)>12){delete got[q.id];delete gotAt[q.id];if(pickMeshes[q.id])pickMeshes[q.id].visible=true}}})}catch(e){}},15000);
 window.DAYT.build=build;
 try{TIPS.push("Seven small temples keep the planets' hours. Each opens in its own planet's hour or on its day. Offer two of its herbs, pass the trial, and keep its talisman and a long blessing.")}catch(e){}
})();

/* ===== pack fights: monsters swarm, 2 strike at once, cleave + splash + whirlwind hit the crowd ===== */
(function(){
 if(!window.RT||!window.__ROAM||!window.PACK||typeof vmUpdate==="undefined")return;
 const PACK=window.PACK,R=window.__ROAM,RR=r=>1.35+.5*Math.min(2.2,r.F.g.scale.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const live=()=>!!(C&&C.rt&&!C.over&&!DG&&RT.dead<=0);
 const mem=()=>R.filter(r=>r.mob&&!r.dead);
 PACK.count=()=>mem().length;
 /* ---------- wind-up ground rings + pack roles ---------- */
 let TGG=null,TGM=null;
 function tgMake(){if(!TGG){TGG={d:new THREE.CircleGeometry(1,28),r:new THREE.RingGeometry(.93,1,32)}}
  const g=new THREE.Group();g.visible=false;
  const mk=(geo,o)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xff4020,transparent:true,opacity:o,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.renderOrder=998;return m};
  const bg=mk(TGG.d,.2),fill=mk(TGG.d,.45),ring=mk(TGG.r,.8);g.add(bg,fill,ring);g.userData={bg,fill,ring};scene.add(g);return g}
 function tgShow(r,rad){if(!r.tg)r.tg=tgMake();r.tgR=rad;r.tg.visible=true;tgSet(r,0)}
 function tgSet(r,p){const t=r.tg;if(!t)return;const g=r.F.g,u=t.userData;t.position.set(g.position.x,hfn(g.position.x,g.position.z)+.1,g.position.z);
  u.bg.scale.set(r.tgR,r.tgR,1);u.ring.scale.set(r.tgR,r.tgR,1);u.fill.scale.set(Math.max(.01,r.tgR*p),Math.max(.01,r.tgR*p),1);
  const hot=p>.8?(p-.8)/.2:0;u.fill.material.color.setRGB(1,.25+.75*hot,.12+.88*hot)}
 function tgHide(r){if(r.tg)r.tg.visible=false}
 function hp0(r){let h=r.f[1];try{const d=(hero&&hero.diff)||"Normal";if(d==="Gentle")h=Math.max(1,Math.round(h*.7));else if(d==="Hard")h=Math.round(h*1.3)}catch(x){}return h}
 function pos(r,y){const p=r.F.g.position.clone();p.y+=y||1.3;return p}
 function kill(r){
  r.dead=1;r.mob=0;r.st=null;tgHide(r);try{window.DFX&&DFX.die(pos(r,1.0),r.f[0],r.F.g.scale.y,r.f[11])}catch(x){}try{r.F.play("die",1.1)}catch(x){}
  const out=[],tier=(C&&C.tier)||0,RW=window.OMEN?OMEN.m("reward"):1,g=Math.round((rnd(8)+tier*5)*(1+tier)*.7*RW);hero.gold+=g;
  const xp=Math.max(1,Math.round(r.f[7]*RW));let msg=r.f[0]+" falls. +"+xp+" XP, "+g+" gp";
  if(Math.random()<.5*(window.OMEN?OMEN.m("herb"):1)){giveItem("Healing herb");msg+=", herb"}
  if(Math.random()<.12){giveItem("Healing potion");msg+=", potion"}
  const heal=Math.round(maxHP()*.07);hero.hp=Math.min(maxHP(),hero.hp+heal);
  try{addXp(xp,out);const lv=out.find(s=>/LEVEL UP/.test(s));if(lv)msg+=" — "+lv;fixStats();hud()}catch(x){}
  try{sfx("win");note(msg)}catch(x){}
  if(window.induceTrauma)try{induceTrauma(.18)}catch(x){}}
 function hurt(r,n,col){
  if(r.dead||n<=0)return;r.hp-=n;
  try{dmgNum(String(n),col||"#ffd27a",pos(r),n>=8)}catch(x){}
  try{window.DFX&&DFX.hit(pos(r,1.2),r.f[0],n)}catch(x){}
  if(r.hp<=0){kill(r);return}
  try{r.F.play("hit",1.2)}catch(x){}r.cd=Math.max(r.cd||0,.9);if(r.st==="wind"){r.st="app";tgHide(r)}}
 PACK.cleave=function(dmg){
  if(!live())return;const fx=-Math.sin(yaw),fz=-Math.cos(yaw);
  mem().forEach(r=>{const g=r.F.g,dx=g.position.x-P.x,dz=g.position.z-P.z,d=Math.hypot(dx,dz)||1;
   if(d-.5*g.scale.y<=3.3&&(dx*fx+dz*fz)/d>-.15){sfx("hit");hurt(r,Math.max(1,Math.round(dmg*.8)))}})};
 PACK.targets=function(){if(!live())return[];return mem().map(r=>{const g=r.F.g;return{x:g.position.x,z:g.position.z,d:Math.hypot(g.position.x-P.x,g.position.z-P.z)-.5*g.scale.y,r}})};
 PACK.hitOne=function(reach,cosMin){
  if(!live())return false;const fx=-Math.sin(yaw),fz=-Math.cos(yaw);let best=null,bd=99;
  mem().forEach(r=>{const g=r.F.g,dx=g.position.x-P.x,dz=g.position.z-P.z,d=Math.hypot(dx,dz)||1,dd=d-.5*g.scale.y;if(dd<=reach&&(dx*fx+dz*fz)/d>=cosMin&&dd<bd){bd=dd;best=r}});
  if(!best)return false;sfx("hit");let dmg=RT.wdmg();if(Math.random()<.1){dmg=Math.round(dmg*1.8)}hurt(best,dmg);try{fx3.strike&&0}catch(x){}return true};
 PACK.whirl=function(){
  if(!live())return;mem().forEach(r=>{const g=r.F.g,dx=g.position.x-P.x,dz=g.position.z-P.z,d=Math.hypot(dx,dz)||1;
   if(d-.5*g.scale.y<=4.4){hurt(r,RT.wdmg(),"#ffe9a8");if(!r.dead){g.position.x+=dx/d*.9;g.position.z+=dz/d*.9}}})};
 /* spells splash the crowd around the main target */
 const _fd=foeDamage;
 foeDamage=function(n){const r=_fd.apply(this,arguments);
  try{if(!PACK.m&&RT.spellT>0&&fx3&&fx3.base&&C&&C.rt){const bx=fx3.base.x,bz=fx3.base.z;
    mem().forEach(m=>{const g=m.F.g;if(Math.hypot(g.position.x-bx,g.position.z-bz)<5.6)hurt(m,Math.max(1,Math.round(n*.6)),"#d9b0ff")})}}catch(x){}
  return r};
 function impact(r){
  const g=r.F.g,d=Math.hypot(P.x-g.position.x,P.z-g.position.z);
  if(!live()||d>RR(r)+1.6){return}
  if(RT.inv>0){try{dmgNum("Dodged","#9fe0ff",pos(r),false)}catch(x){}return}
  const ac=calcAC()+C.ward+(window.OMEN?OMEN.b("ac"):0)+(RT.block?3:0),a=atkRoll(r.f[3]+(window.OMEN?OMEN.b("foe"):0),ac);
  if(!a.hit){sfx("miss");return}
  let dmg=Math.max(1,Math.round((roll(r.f[4]*(a.crit?2:1),r.f[5])+r.f[6])*.65));if(RT.block)dmg=Math.max(1,Math.ceil(dmg*.35));
  hero.hp=Math.max(0,hero.hp-dmg);try{fx3.hurt(dmg)}catch(x){}sfx("hit");RT.lastHit=6;
  if(/Wolf|Spider|Scorpion|Snake/.test(r.f[0])&&Math.random()<.2){RT.slow=Math.max(RT.slow||0,1.5)}
  try{hud()}catch(x){}if(hero.hp<=0)window.__rt.die()}
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{tick(dt)}catch(e){if(!window.__pke){window.__pke=1;console.warn("pack",e)}}};
 function tick(dt){
  if(!C||!C.rt){R.forEach(r=>{tgHide(r);if(r.mob){r.mob=0;r.st=null}});return}
  const act=live();
  R.forEach(r=>{if(r.dead||r.mob)return;const g=r.F.g,d=Math.hypot(P.x-g.position.x,P.z-g.position.z);
   if(act&&d<24&&!RT.safe(g.position.x,g.position.z)){r.mob=1;if(r.hp==null)r.hp=hp0(r);r.cd=1.2+Math.random()*2;r.st="app";r.role=["rusher","flanker","lurker"][(PACK.rn=(PACK.rn||0)+1)%3];r.lt=3+Math.random()*3;r.fl=Math.random()<.5?1:-1}});
  let busy=0;const M=mem();M.forEach(r=>{if(r.st==="wind")busy++});
  M.forEach(r=>{
   const g=r.F.g,F=r.F,dx=P.x-g.position.x,dz=P.z-g.position.z,d=Math.hypot(dx,dz)||1,rr=RR(r);
   r.hd+=((a,b)=>{let q=b-a;while(q>Math.PI)q-=6.283;while(q<-Math.PI)q+=6.283;return q})(r.hd,Math.atan2(dx,dz))*Math.min(1,dt*7);
   let sx=0,sz=0;const others=M.filter(o=>o!==r).map(o=>o.F.g.position);if(fx3&&fx3.g&&fx3.base)others.push(fx3.base);
   others.forEach(p=>{const ex=g.position.x-p.x,ez=g.position.z-p.z,ed=Math.hypot(ex,ez);if(ed<1.3&&ed>.01){sx+=ex/ed*(1.3-ed);sz+=ez/ed*(1.3-ed)}});
   let mx=0,mz=0,moving=0;
   if(act){
    r.lt-=dt;let tx=dx,tz=dz,td=d,sp=(F.spd||2.2)*1.05,want=rr*.9;
    if(r.role==="flanker"&&d>rr+1.5){const a=Math.atan2(-dz,-dx)+r.fl*(d>6?.55:.9),cx=P.x+Math.cos(a)*(rr+.8),cz=P.z+Math.sin(a)*(rr+.8);tx=cx-g.position.x;tz=cz-g.position.z;td=Math.hypot(tx,tz)||1;sp*=1.25}
    else if(r.role==="lurker"&&r.lt>0&&d<7.5){tx=-dx;tz=-dz;want=-1;sp*=.8}
    if(r.role==="lurker"&&r.lt<=0)sp*=1.5;
    if(want<0){mx=tx/d*sp;mz=tz/d*sp;moving=sp}else if(d>want){mx=tx/td*sp;mz=tz/td*sp;moving=sp}
    r.cd-=dt;
    if(r.st==="app"&&d<rr+1.15&&r.cd<=0&&busy<PACK.max&&!(r.role==="lurker"&&r.lt>0)){r.st="wind";r.wt=r.wm=(r.role==="rusher"?.62:.78);busy++;F.play("attack",1.3*(.62/r.wm));tgShow(r,rr+1.6);try{window.MV&&MV("hit")}catch(x){}}
    else if(r.st==="wind"){r.wt-=dt;tgSet(r,clamp(1-r.wt/r.wm,0,1));if(r.wt<=0){tgHide(r);impact(r);r.st="app";r.cd=2.2+Math.random()*1.6;if(r.role==="lurker")r.lt=2.5+Math.random()*2}}}
   {const vx=mx+sx*2.2,vz=mz+sz*2.2;let ok=false;
    if(Math.abs(vx)+Math.abs(vz)>.01){const sg=r.sgn||1;
     for(const ang of [0,.8*sg,-.8*sg,1.5*sg,-1.5*sg]){const c=Math.cos(ang),s2=Math.sin(ang),wx=vx*c-vz*s2,wz=vx*s2+vz*c,nx=g.position.x+wx*dt,nz=g.position.z+wz*dt;
      if(!tileSolid(Math.floor(nx/TW),Math.floor(nz/TW))&&hfn(nx,nz)>-.3&&!RT.safe(nx,nz)){g.position.x=nx;g.position.z=nz;ok=true;if(ang!==0)r.sgn=ang>0?sg:-sg;break}}
     if(!ok){r.sgn=-(r.sgn||1);r.stk=(r.stk||0)+dt}else r.stk=0}
    if((r.stk||0)>2.5){/* wedged: hop to a clear spot nearer the hero */
     const a2=Math.random()*6.283,qx=P.x+Math.cos(a2)*6,qz=P.z+Math.sin(a2)*6;
     if(!tileSolid(Math.floor(qx/TW),Math.floor(qz/TW))&&hfn(qx,qz)>-.2&&!RT.safe(qx,qz)){g.position.x=qx;g.position.z=qz}r.stk=0}}
   g.position.y=hfn(g.position.x,g.position.z)+(g.userData.float?.45+Math.sin(clock*2+r.hd)*.1:0);g.rotation.y=r.hd;
   if(r.st!=="wind"&&F.cur!=="hit"&&F.cur!=="attack"){if(moving>0)F.play(F.hum&&moving>3.2?"run":"walk",moving/(F.hum&&moving>3.2?F.runBase:F.base));else F.play("idle")}});
  if(act&&M.length){try{foeBox.firstChild.textContent+="  +"+M.length+" more"}catch(x){}}
 }
})();

/* ===== death + wound effects: blood, bone dust, embers, light motes, scorch and gore marks ===== */
(function(){
 if(typeof vmUpdate==="undefined"||typeof THREE==="undefined")return;
 const P_=[],POOL=[];let GEO=null,MAT={};
 const KIND=n=>/Skeleton|Bael|Furfur|Andras|Bifrons|Eligos|Decan|Mummy|Draugr|Legionary|Wraith|Shade|Drowned|Woodsman|Zombie|Ghoul/i.test(n)?"bone":/Demon|Imp|Bael|Hell|Asura|Archon/i.test(n)?"fire":/Chorus|Tetramorph|Ophan|Seraph|Priest|Argus|Beholder|Dagon/i.test(n)?"holy":"flesh";
 const COL={bone:[0xd8d0b8,0xb0a890,0x8a8470],fire:[0xff8a20,0xff5010,0xffc040],holy:[0xfff0b0,0xc8a8ff,0xffffff],flesh:[0x8a0f0f,0xb01818,0x5a0808]};
 function mat(c){return MAT[c]||(MAT[c]=new THREE.MeshBasicMaterial({color:c,fog:true}))}
 function spawn(x,y,z,vx,vy,vz,life,sz,c,grav,glow){
  if(P_.length>140)return;if(!GEO)GEO=new THREE.IcosahedronGeometry(1,0);
  const m=new THREE.Mesh(GEO,mat(c));m.position.set(x,y,z);m.scale.setScalar(sz);m.renderOrder=5;scene.add(m);
  P_.push({m,vx,vy,vz,l:life,L:life,sz,g:grav,gl:glow})}
 const gy=(x,z)=>{try{return DG?0:Math.max(hfn(x,z),-.3)}catch(e){return 0}};
 function pool(x,z,sc,c,life){
  const g=new THREE.CircleGeometry(1,14),m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.62,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  m.rotation.x=-Math.PI/2;m.position.set(x,gy(x,z)+.04,z);m.scale.set(.1,.1,1);scene.add(m);POOL.push({m,l:life,L:life,s:sc,t:0})}
 const DFX=window.DFX={
  drip(g){if(!g)return;const sc=g.scale.y||1;spawn(g.position.x+(Math.random()-.5)*.5*sc,g.position.y+(.5+Math.random()*1.0)*sc,g.position.z+(Math.random()-.5)*.5*sc,0,0,0,1.0,.03+Math.random()*.02,0x7ab8d8,10)},
  breath(p,fx,fz){for(let i=0;i<3;i++)spawn(p.x,p.y,p.z,fx*(.6+Math.random()*.8),.2+Math.random()*.5,fz*(.6+Math.random()*.8),.9+Math.random()*.5,.05+Math.random()*.05,0xdcecf8,-.4)},
  hit(p,name,n){const k=KIND(name),cs=COL[k],c=Math.min(14,2+Math.round(n*.8));
   for(let i=0;i<c;i++){const a=Math.random()*6.283,s=1.2+Math.random()*2.6;spawn(p.x,p.y,p.z,Math.cos(a)*s,1+Math.random()*2.5,Math.sin(a)*s,.5+Math.random()*.4,.035+Math.random()*.04,cs[i%3],k==="holy"?-1.5:9,k==="fire"||k==="holy")}},
  die(p,name,sc,und){const k=und?"bone":KIND(name),cs=COL[k],s=Math.max(.7,sc||1),x=p.x,z=p.z,y0=gy(x,z);
   const N=Math.round(26*Math.min(2,s));
   for(let i=0;i<N;i++){const a=Math.random()*6.283,sp=(k==="flesh"?2.5:1.2)*(.4+Math.random())*s;
    if(k==="flesh")spawn(x,y0+.8*s,z,Math.cos(a)*sp,1.5+Math.random()*3,Math.sin(a)*sp,.8+Math.random()*.6,.05+Math.random()*.06,cs[i%3],10);
    else if(k==="bone")spawn(x+(Math.random()-.5)*.6,y0+.2+Math.random()*1.4*s,z+(Math.random()-.5)*.6,Math.cos(a)*.5,.4+Math.random()*1.2,Math.sin(a)*.5,1.3+Math.random()*.9,.05+Math.random()*.1,cs[i%3],-.3);
    else if(k==="fire")spawn(x+(Math.random()-.5)*.8,y0+.3+Math.random()*s,z+(Math.random()-.5)*.8,Math.cos(a)*.6,1.6+Math.random()*2.2,Math.sin(a)*.6,1+Math.random()*1.2,.05+Math.random()*.07,cs[i%3],-2.5,true);
    else spawn(x+(Math.random()-.5)*.6,y0+.2+Math.random()*1.8*s,z+(Math.random()-.5)*.6,Math.cos(a)*.3,1+Math.random()*2.4,Math.sin(a)*.3,1.4+Math.random()*1.2,.04+Math.random()*.07,cs[i%3],-1.2,true)}
   if(k==="flesh"){pool(x,z,1.1*s,0x4a0808,14);for(let i=0;i<3;i++)pool(x+(Math.random()-.5)*1.4*s,z+(Math.random()-.5)*1.4*s,.3+Math.random()*.4,0x5a0a0a,12)}
   else if(k==="fire")pool(x,z,1.3*s,0x120a06,16);
   else if(k==="bone")pool(x,z,1.0*s,0x3a3630,10);
   else pool(x,z,1.4*s,0xfff0c0,3.5)}};
 const _vu=vmUpdate;vmUpdate=function(dt){_vu(dt);try{
  for(let i=P_.length-1;i>=0;i--){const q=P_[i];q.l-=dt;if(q.l<=0){scene.remove(q.m);P_.splice(i,1);continue}
   q.vy-=q.g*dt;q.m.position.x+=q.vx*dt;q.m.position.y+=q.vy*dt;q.m.position.z+=q.vz*dt;
   const gr=gy(q.m.position.x,q.m.position.z)+.03;if(q.m.position.y<gr&&q.g>0){q.m.position.y=gr;q.vy=0;q.vx*=.6;q.vz*=.6}
   q.m.scale.setScalar(q.sz*Math.max(.05,Math.min(1,q.l/(q.L*.4))))}
  for(let i=POOL.length-1;i>=0;i--){const q=POOL[i];q.t+=dt;q.l-=dt;if(q.l<=0){scene.remove(q.m);q.m.geometry.dispose();q.m.material.dispose();POOL.splice(i,1);continue}
   const g=Math.min(1,q.t/.6);q.m.scale.set(q.s*g,q.s*g,1);q.m.material.opacity=.62*Math.min(1,q.l/3)}
 }catch(e){}};
 /* frosty foes steam in the cold */
 setInterval(()=>{try{if(typeof C!=="undefined"&&C&&!C.over&&C.e&&/Frost|Rime|Draugr|Yeti/.test(C.e.name)&&fx3.g&&!document.hidden){const p=fx3.ctr().clone(),t=fx3.base,dx=(typeof P!=="undefined"?P.x:0)-t.x,dz=(typeof P!=="undefined"?P.z:0)-t.z,l=Math.hypot(dx,dz)||1;p.y+=.55*(fx3.g.scale.y||1);DFX.breath(p,dx/l,dz/l)}}catch(e){}},420);
 /* main-foe hooks */
 try{const _fd=foeDamage;foeDamage=function(n){const r=_fd.apply(this,arguments);try{if(typeof n==="number"&&n>0&&C&&C.e&&fx3.ctr&&!(window.PACK&&PACK.m))DFX.hit(fx3.ctr().clone(),C.e.name,n)}catch(e){}return r}}catch(e){}
 try{const _dy=fx3.die;fx3.die=function(){try{if(C&&C.e&&fx3.ctr){const p=fx3.ctr().clone();p.y=gy(p.x,p.z)+1;DFX.die(p,C.e.name,fx3.g?fx3.g.scale.y:1,C.e.undead)}}catch(e){}return _dy.apply(this,arguments)}}catch(e){}
})();

/* ===== dungeon entrances: braziers, skull stakes, bone piles, warding circles ===== */
(function(){
 if(typeof POIS==="undefined"||typeof THREE==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE,flames=[],done={};
 const rf=(a,i)=>{const x=Math.sin(a*127.1+i*311.7)*43758.5453;return x-Math.floor(x)};
 const M=(c,e)=>new T.MeshStandardMaterial({color:c,roughness:.9,emissive:e||0,emissiveIntensity:e?1.2:0});
 const stone=M(0x5a554e),bone=M(0xd8d0b8),wood=M(0x3a2a1a),fl=new T.MeshBasicMaterial({color:0xff8a2a,transparent:true,opacity:.9,fog:true}),fl2=new T.MeshBasicMaterial({color:0xffd060,transparent:true,opacity:.95,fog:true});
 function brazier(x,z){const g=new T.Group(),b=new T.Mesh(new T.CylinderGeometry(.34,.22,.9,8),stone);b.position.y=.45;g.add(b);
  const bowl=new T.Mesh(new T.CylinderGeometry(.46,.3,.22,10),stone);bowl.position.y=1;g.add(bowl);
  const f=new T.Mesh(new T.ConeGeometry(.3,.8,7),fl);f.position.y=1.45;g.add(f);const f2=new T.Mesh(new T.ConeGeometry(.17,.55,6),fl2);f2.position.y=1.38;g.add(f2);flames.push({f,f2,s:Math.random()*9});g.position.set(x,0,z);return g}
 function stake(x,z,i){const g=new T.Group(),p=new T.Mesh(new T.CylinderGeometry(.05,.07,1.9,6),wood);p.position.y=.95;g.add(p);
  const sk=new T.Mesh(new T.SphereGeometry(.15,10,8),bone);sk.scale.set(1,1.1,1.1);sk.position.y=1.95;g.add(sk);
  const jw=new T.Mesh(new T.BoxGeometry(.16,.07,.14),bone);jw.position.set(0,1.82,.05);g.add(jw);
  [-1,1].forEach(s=>{const e=new T.Mesh(new T.SphereGeometry(.035,6,5),new T.MeshBasicMaterial({color:0x000000}));e.position.set(s*.06,1.98,.13);g.add(e)});
  g.rotation.set((rf(i,3)-.5)*.25,rf(i,4)*6.28,(rf(i,5)-.5)*.25);g.position.set(x,0,z);return g}
 function bones(x,z,i){const g=new T.Group();for(let k=0;k<7;k++){const b=new T.Mesh(new T.CylinderGeometry(.03,.03,.3+rf(i,k)*.3,5),bone);b.position.set((rf(i,k+9)-.5)*.9,.05,(rf(i,k+19)-.5)*.9);b.rotation.set(1.57,0,rf(i,k)*6.28);g.add(b)}
  const sk=new T.Mesh(new T.SphereGeometry(.13,8,6),bone);sk.position.set(.1,.12,0);g.add(sk);g.position.set(x,0,z);return g}
 function circle(r,col){const m=new T.Mesh(new T.RingGeometry(r-.07,r,40),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.55,side:2,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));m.rotation.x=-Math.PI/2;m.position.y=.06;return m}
 function dress(p,pm){
  const g=new T.Group(),seed=p.x*31+p.y*17,col=[0xff6a30,0x9a60ff,0x40e0c0,0xff3040,0xffc040][Math.floor(rf(seed,1)*5)];
  const put=(o,x,z)=>{const h=hfn(pm.position.x+x,pm.position.z+z)-pm.position.y;o.position.y+=h;g.add(o)};
  [[-1,1],[1,1]].forEach(([s],i)=>put(brazier(s*3.2,5.2),s*3.2,5.2));
  for(let i=0;i<5;i++){const a=.4+i*(Math.PI-.8)/4+Math.PI*.0,r=6.5+rf(seed,i)*2.5,x=Math.cos(a+Math.PI*.5+ (rf(seed,i+30)-.5))*r*1.0,z=Math.abs(Math.sin(a))*r*.9+1.5;put(stake(x*(i%2?1:-1)*.8,z,i+seed),x*(i%2?1:-1)*.8,z)}
  for(let i=0;i<4;i++){const x=(rf(seed,i+40)-.5)*10,z=3+rf(seed,i+50)*6;put(bones(x,z,i+seed),x,z)}
  const c=circle(4.2,col);c.position.set(0,.06+ (hfn(pm.position.x,pm.position.z+4.5)-pm.position.y),4.5);c.scale.set(1,1,1);g.add(c);
  const c2=circle(2.6,col);c2.position.copy(c.position);g.add(c2);
  g.userData.entr=1;pm.add(g)}
 let tries=0;const iv=setInterval(()=>{if(++tries>60){clearInterval(iv);return}
  try{if(typeof poiMeshes==="undefined")return;POIS.forEach(p=>{if(p.k!=="d"||done[p.id]||!poiMeshes[p.id])return;done[p.id]=1;dress(p,poiMeshes[p.id])})}catch(e){}},1500);
 const _vu=vmUpdate;vmUpdate=function(dt){_vu(dt);try{const t=(typeof clock!=="undefined"?clock:0);flames.forEach(q=>{const k=1+.18*Math.sin(t*14+q.s)+.1*Math.sin(t*23+q.s*2);q.f.scale.set(1/Math.sqrt(k),k,1/Math.sqrt(k));q.f2.scale.set(1,1.1-(k-1),1)})}catch(e){}};
})();

/* ===== jump: a visual hop on Space outside real-time fights. Collisions stay tile-based, so it can never wedge you in anything ===== */
(function(){
 if(typeof vmUpdate==="undefined")return;
 const J=window.JMP={y:0,v:0,air:false,dip:0,lastLand:0};
 const G=19,V0=5.4;
 function ok(){
  if(typeof hero==="undefined"||!hero||J.air)return false;
  if(typeof C!=="undefined"&&C&&C.rt&&!C.over)return false;      /* Space is the dodge in a fight */
  if(typeof C!=="undefined"&&C&&!C.rt)return false;
  if((typeof D!=="undefined"&&D)||(typeof packOpen!=="undefined"&&packOpen)||(typeof occOpen!=="undefined"&&occOpen))return false;
  if(document.pointerLockElement==null&&document.getElementById("start")&&document.getElementById("start").offsetParent)return false;
  if(window.medTimer)return false;
  return true}
 function go(){if(!ok())return false;J.v=V0;J.air=true;try{if(window.sfx)sfx("miss")}catch(e){}return true}
 JMP.go=go;
 addEventListener("keydown",e=>{
  if(e.code!=="Space"||e.repeat||/TEXTAREA|INPUT|SELECT|BUTTON/.test(e.target.tagName))return;
  if(go())e.preventDefault()});
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{
  dt=Math.min(dt,.05);
  if(J.air){J.v-=G*dt;J.y+=J.v*dt;if(J.y<=0){J.y=0;J.v=0;J.air=false;J.dip=.16}}
  if(J.dip>0)J.dip=Math.max(0,J.dip-dt*.9);
  if(J.y>0||J.dip>0){const off=J.y-J.dip*1.2;camera.position.y+=off}
 }catch(e){if(!window.__jpe){window.__jpe=1;console.warn("jump",e)}}};
})();

/* Anti-stuck: clears the spawn area of understory hit circles, and frees the player from any pocket. */
(function(){
 const R=.5;
 function free(x,z,r){return !blocked(x,z,r)}
 function findFree(r0){
  for(let rad=.8;rad<=10;rad+=.6){const n=Math.max(8,Math.round(rad*7));
   for(let i=0;i<n;i++){const a=i/n*Math.PI*2,x=P.x+Math.sin(a)*rad,z=P.z+Math.cos(a)*rad;
    if(x>2&&z>2&&x<W*TW-2&&z<H*TW-2&&free(x,z,r0))return[x,z]}}
  return null}
 window.UNSTICK=function(r0){const f=findFree(r0||1.0);if(f){P.x=f[0];P.z=f[1];return true}return false};
 /* spawn clearing */
 function clearSpawn(){if(!window.TREEH||typeof SX==="undefined")return;
  for(const k of Array.from(TREEH.keys())){const tx=k%W,ty=Math.floor(k/W);if(Math.hypot(tx-SX,ty-SY)<9)TREEH.delete(k)}}
 let t=0,lx=0,lz=0,hold=0,first=true;
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{
  if(typeof DG!=="undefined"&&DG)return;
  if(first&&typeof SX!=="undefined"&&window.TREEH){clearSpawn();first=false}
  if(typeof C!=="undefined"&&C&&C.rt&&!C.over)return;
  if(blocked(P.x,P.z,R)){UNSTICK(R);return}
  const want=(typeof keys!=="undefined"&&(keys.w||keys.a||keys.s||keys.d||keys.ArrowUp||keys.ArrowDown))||(typeof joy!=="undefined"&&(Math.abs(joy.x)+Math.abs(joy.y)>.3));
  if(want){hold+=Math.min(dt,.1);if(hold>=1.4){
    if(Math.hypot(P.x-lx,P.z-lz)<.5)UNSTICK(1.1);
    lx=P.x;lz=P.z;hold=0}}
  else{hold=0;lx=P.x;lz=P.z}
 }catch(e){if(!window.__use){window.__use=1;console.warn("unstick",e)}}};
})();

/* ===== Walkable maze dungeons: first-person exploration through doors, with secrets, keys, traps and treasure ===== */
(function(){
 if(typeof DGT==="undefined"||typeof dg3==="undefined")return;
 const SIDES=["N","E","S","W"],OPP={N:"S",S:"N",E:"W",W:"E"},DXY={N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]};
 const GW=5,GH=4,H5=5;
 const MZ=window.MZ={on:false,pop:false,room:null,near:null,cool:0,fight:false,L:null};
 const sidx=s=>SIDES.indexOf(s);
 function rngf(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s>>>=0;s^=s<<5;s>>>=0;return s/4294967296}}
 function sh(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
 const ek=(a,b)=>a<b?a+"-"+b:b+"-"+a;
 const NAMES={
  corridor:{crypt:"Bone-lined Passage",cave:"Ice Tunnel",mine:"Timbered Drift",sunk:"Flooded Passage",tomb:"Painted Corridor",lair:"Gnawed Tunnel"},
  hall:{crypt:"Hall of Niches",cave:"Frozen Hollow",mine:"Cross-cut",sunk:"Silted Gallery",tomb:"Pillared Hall",lair:"Midden Hall"},
  trap:{crypt:"Corridor of Whispers",cave:"Thin Ice Gallery",mine:"Rotten Gantry",sunk:"Slick Causeway",tomb:"Corridor of Jackals",lair:"Snare Run"},
  well:{crypt:"Cistern of Tears",cave:"Meltwater Pool",mine:"Deep Spring",sunk:"Font of the Drowned",tomb:"Well of Reeds",lair:"Giant's Trough"},
  shrine:{crypt:"Shrine of the Pale Saint",cave:"Rime Altar",mine:"Dwarf Shrine",sunk:"Reliquary Niche",tomb:"Shrine of Anubis",lair:"Totem Alcove"},
  vault:{crypt:"Reliquary Vault",cave:"Frozen Vault",mine:"Paymaster's Vault",sunk:"Treasury of the Deep",tomb:"Treasure Chamber",lair:"Giant's Larder"},
  key:{crypt:"Weeping Alcove",cave:"Glittering Grotto",mine:"Lamp Store",sunk:"Reliquary Niche",tomb:"Scarab Alcove",lair:"Giant's Pantry"},
  treasure:{crypt:"Burial Cache",cave:"Ice Cache",mine:"Ore Cache",sunk:"Drowned Cache",tomb:"Canopic Cache",lair:"Trophy Nook"},
  fight:{crypt:"Ossuary",cave:"Ice Gallery",mine:"Lantern Gallery",sunk:"Algae Hall",tomb:"Hall of Jackals",lair:"Bone-strewn Hall"}};
 const DRI={start:0,hall:1,corridor:1,fight:3,treasure:2,shrine:2,well:2,trap:1,key:2,vault:2,boss:5};
 /* ---------- layout ---------- */
 function genLayout(p){
  const R=rngf(sh(p.id+"|maze")),th=DGT[p.id],N=GW*GH,id=(x,y)=>y*GW+x,adj=Array.from({length:N},()=>({}));
  const link=(a,b,s)=>{adj[a][s]=b;adj[b][OPP[s]]=a};
  const sx=2,sy=GH-1,seen=new Set([id(sx,sy)]),list=[[sx,sy]];
  while(list.length){const k=R()<.5?list.length-1:Math.floor(R()*list.length),[x,y]=list[k],opts=SIDES.filter(s=>{const nx=x+DXY[s][0],ny=y+DXY[s][1];return nx>=0&&ny>=0&&nx<GW&&ny<GH&&!seen.has(id(nx,ny))});
   if(!opts.length){list.splice(k,1);continue}const s=opts[Math.floor(R()*opts.length)],nx=x+DXY[s][0],ny=y+DXY[s][1];link(id(x,y),id(nx,ny),s);seen.add(id(nx,ny));list.push([nx,ny])}
  /* loops */
  let extra=4,tries=0;while(extra>0&&tries++<80){const x=Math.floor(R()*GW),y=Math.floor(R()*GH),s=SIDES[Math.floor(R()*4)],nx=x+DXY[s][0],ny=y+DXY[s][1];
   if(nx<0||ny<0||nx>=GW||ny>=GH||adj[id(x,y)][s]!=null)continue;link(id(x,y),id(nx,ny),s);extra--}
  const bfs=()=>{const d=new Array(N).fill(-1),par=new Array(N).fill(-1),q=[id(sx,sy)];d[q[0]]=0;while(q.length){const a=q.shift();for(const s of SIDES){const b=adj[a][s];if(b!=null&&d[b]<0){d[b]=d[a]+1;par[b]=a;q.push(b)}}}return{d,par}};
  let{d:dist,par}=bfs();
  let boss=0,bd=-1;for(let i=0;i<N;i++){const y=Math.floor(i/GW);if(dist[i]>bd||(dist[i]===bd&&y<Math.floor(boss/GW))){bd=dist[i];boss=i}}
  SIDES.forEach(s=>{const b=adj[boss][s];if(b!=null&&b!==par[boss]){delete adj[boss][s];delete adj[b][OPP[s]]}});
  ({d:dist,par}=bfs());
  const deg=i=>SIDES.filter(s=>adj[i][s]!=null).length,start=id(sx,sy);
  const nodes=[];for(let i=0;i<N;i++)nodes.push({id:i,x:i%GW,y:Math.floor(i/GW),doors:adj[i],dist:dist[i],type:"hall",deg:deg(i),seed:sh(p.id+"n"+i)});
  nodes[start].type="start";nodes[boss].type="boss";nodes[boss].deg=1;
  const pool=nodes.filter(n=>n.id!==start&&n.id!==boss),ends=pool.filter(n=>n.deg===1).sort((a,b)=>b.dist-a.dist),mid=pool.filter(n=>n.deg>1).sort((a,b)=>R()-.5);
  const take=()=>ends.length?ends.shift():(mid.length?mid.shift():null);
  const key=take();if(key)key.type="key";
  const vault=take();if(vault){vault.type="vault"}
  const sec=take();if(sec){sec.type="treasure";sec.secret=true}
  const tr=take();if(tr)tr.type="treasure";
  /* the vault's door needs a brass key, the secret room's door must be found */
  const brassNode=pool.filter(n=>n.type==="hall"&&n.dist>=2&&n.dist<bd-1)[0];
  const rest=nodes.filter(n=>n.type==="hall");
  rest.forEach(n=>{const r=R();
   if(n.deg===2&&((n.doors.N!=null&&n.doors.S!=null)||(n.doors.E!=null&&n.doors.W!=null))){n.type=r<.34?"trap":"corridor"}
   else if(n.deg===1){n.type=r<.5?"shrine":"well"}
   else n.type=r<.28?"fight":(r<.42?"shrine":"hall")});
  /* make sure the road to the boss has real fights and a well/shrine to rest at */
  const path=[];for(let c=boss;c!==-1;c=par[c])path.unshift(c);
  path.filter(i=>nodes[i].type!=="start"&&nodes[i].type!=="boss").forEach((i,k)=>{const n=nodes[i];if(k%3===1&&n.type!=="key"&&n.type!=="vault"&&n.type!=="treasure"){n.type="fight";n.cavern=1}});
  nodes.forEach(n=>{if(n.type==="fight"){n.waves=n.dist>=3&&R()<.45?2:1;n.deep=n.dist>=bd*.6}});
  const fights=nodes.filter(n=>n.type==="fight").sort((a,b)=>a.dist-b.dist);if(fights.length){const bn=fights.find(n=>n.dist>=2)||fights[0];bn.brass=true}
  if(!nodes.some(n=>n.type==="shrine")){const c=nodes.find(n=>n.type==="corridor"||n.type==="hall");if(c)c.type="shrine"}
  if(!nodes.some(n=>n.type==="well")){const c=nodes.find(n=>n.type==="corridor"||n.type==="hall"||n.type==="trap");if(c)c.type="well"}
  /* names */
  const k=p.id;nodes.forEach(n=>{
   n.name=n.type==="start"?th.n[0]:n.type==="boss"?th.n[5]:(NAMES[n.type]||NAMES.hall)[k]||th.n[1];
   if(n.type==="fight"&&hs(n.id,4)>.5)n.name=th.n[3]});
  /* sizes (absolute, before rotation) */
  nodes.forEach(n=>{const ns=(n.doors.N!=null&&n.doors.S!=null&&n.deg===2),ew=(n.doors.E!=null&&n.doors.W!=null&&n.deg===2);
   const d=({start:[9,9],hall:[12,12],fight:[14,14],treasure:[9,9],shrine:[10,10],well:[10,10],key:[9,9],vault:[9,9],boss:[16,20]})[n.type];
   if(d)n.dim=d;else if(n.type==="corridor"||n.type==="trap"){const L=n.type==="trap"?17:13,Wd=n.type==="trap"?6:5;n.dim=ns?[Wd,L]:ew?[L,Wd]:[8,8]}else n.dim=[10,10]});
  /* edges that are special */
  const E={};if(vault){const e=SIDES.find(s=>adj[vault.id][s]!=null);if(e)E[ek(vault.id,adj[vault.id][e])]="brass"}
  if(sec){const e=SIDES.find(s=>adj[sec.id][s]!=null);if(e)E[ek(sec.id,adj[sec.id][e])]="secret"}
  const be=SIDES.find(s=>adj[boss][s]!=null);if(be)E[ek(boss,adj[boss][be])]="iron";
  return{nodes,start,boss,maxd:bd,edges:E,th}}
 /* ---------- state ---------- */
 const MS=()=>{const s=DG.s;if(!s.mz)s.mz={cur:-1,vis:{},clr:{},got:{},open:{},found:{},trap:{},spoil:{},w2:{},mapAll:0};return s.mz};
 const dgSolidTint={crypt:0x8a9a8a,cave:0x9fc8e8,mine:0xa0805a,sunk:0x6f8f6f,tomb:0xd0b078,lair:0x8a6a4a};
 const tex=(rx,ry)=>{const t=brickTex().clone();t.needsUpdate=true;t.repeat.set(rx,ry);return t};
 const isOpenEdge=(a,b)=>{const m=MS(),k=ek(a,b),e=MZ.L.edges[k];if(m.open[k])return true;if(e==="iron")return !!DG.s.unl;return false};
 /* ---------- room builder ---------- */
 const matCache={};const MC=(c,o)=>{const k=c+JSON.stringify(o||{});return matCache[k]||(matCache[k]=M(c,o))};
 function buildNode(node,entry){
  const th=DG.th,L=MZ.L,m=MS(),tint=dgSolidTint[DG.p.id]||0x8a8a8a,cave=DG.p.id==="cave",R=rngf(node.seed);
  const rot=(2-sidx(entry)+4)%4,odd=rot%2===1,w=odd?node.dim[1]:node.dim[0],d=odd?node.dim[0]:node.dim[1],h=node.type==="boss"?7:(w<=6?4:H5);
  const g=new THREE.Group();g.userData.lights=[];const obs=[],ints=[],doors=[],pl=[];
  const lside=s=>SIDES[(sidx(s)+rot)%4];
  const wallM=(rx)=>{const t=tex(rx,h/2.5);return M(tint,{map:t,bumpMap:t,bumpScale:2.2,flatShading:false,roughness:.95})};
  const ft=flagTex().clone();ft.needsUpdate=true;ft.repeat.set(w/3,d/3);
  mk(g,new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),M(tint,{map:ft,bumpMap:ft,bumpScale:1.8,flatShading:false}),0,0,0,{ns:1});
  mk(g,new THREE.PlaneGeometry(w,d).rotateX(Math.PI/2),M(0x1a1612,{flatShading:false}),0,h,0,{ns:1});
  mk(g,new THREE.PlaneGeometry(w,h),wallM(w/3),0,h/2,-d/2,{ns:1});mk(g,new THREE.PlaneGeometry(w,h).rotateY(Math.PI),wallM(w/3),0,h/2,d/2,{ns:1});
  mk(g,new THREE.PlaneGeometry(d,h).rotateY(Math.PI/2),wallM(d/3),-w/2,h/2,0,{ns:1});mk(g,new THREE.PlaneGeometry(d,h).rotateY(-Math.PI/2),wallM(d/3),w/2,h/2,0,{ns:1});
  /* doors */
  const lpos={N:[0,-d/2,0],S:[0,d/2,Math.PI],E:[w/2,0,-Math.PI/2],W:[-w/2,0,Math.PI/2]};
  const mkDoor=(ls,kind,txt)=>{const dgp=new THREE.Group(),fr=M(0x3a2a1c);
   [-1.25,1.25].forEach(x=>mk(dgp,new THREE.BoxGeometry(.5,3.3,.55),fr,x,1.65,0));mk(dgp,new THREE.BoxGeometry(3.4,.55,.55),fr,0,3.4,0);
   if(kind==="open"){mk(dgp,new THREE.PlaneGeometry(2,3.2),new THREE.MeshBasicMaterial({color:0x07050a}),0,1.6,-.05,{ns:1});mk(dgp,new THREE.PlaneGeometry(1.3,1.5),new THREE.MeshBasicMaterial({color:0xffd890,transparent:true,opacity:.14,depthWrite:false}),0,1.6,-.08,{ns:1})}
   else if(kind==="iron"){for(let k=-3;k<=3;k++)mk(dgp,new THREE.BoxGeometry(.1,3.2,.1),M(0x55565e,{metalness:.7,roughness:.4}),k*.3,1.6,.05);for(let k=0;k<4;k++)mk(dgp,new THREE.BoxGeometry(2.1,.1,.1),M(0x55565e,{metalness:.7}),0,.5+k*.8,.05);mk(dgp,new THREE.SphereGeometry(.18,8,6),M(0xff3a2a,{emissive:0xff2010,emissiveIntensity:1.2}),0,1.5,.2,{ns:1})}
   else if(kind==="brass"){mk(dgp,new THREE.BoxGeometry(2.1,3.2,.2),M(0x8a6a2a,{metalness:.6,roughness:.4}),0,1.6,0);for(let k=0;k<3;k++)mk(dgp,new THREE.BoxGeometry(2.1,.12,.25),M(0xe0b84a,{metalness:.7,emissive:0x604010,emissiveIntensity:.4}),0,.7+k*.9,.02);mk(dgp,new THREE.SphereGeometry(.15,8,6),M(0xffd060,{emissive:0xffa020,emissiveIntensity:1}),0,1.5,.2,{ns:1})}
   else{mk(dgp,new THREE.BoxGeometry(2.1,3.2,.2),M(0x4a3220),0,1.6,0);for(let k=0;k<3;k++)mk(dgp,new THREE.BoxGeometry(2.1,.12,.25),M(0x2a2a30,{metalness:.6}),0,.7+k*.9,.02)}
   if(txt){const lb=label(txt);lb.position.y=4.1;lb.scale.set(5,.9,1);dgp.add(lb)}
   const q=lpos[ls];dgp.position.set(q[0],0,q[1]);dgp.rotation.y=q[2];g.add(dgp)};
  SIDES.forEach(as=>{const nb=node.doors[as],ls=lside(as);let kind=null,txt=null,ref=null;
   if(node.type==="start"&&as==="S"){kind="open";txt="Stair up to the world";ref={as,to:"exit"}}
   else if(nb!=null){const e=L.edges[ek(node.id,nb)],op=isOpenEdge(node.id,nb);
    if(e==="secret"&&!m.found[ek(node.id,nb)]){ref={as,to:nb,secret:1};kind=null;mk(g,new THREE.BoxGeometry(.06,2.4,.04),M(0x0a0806),(ls==="N"||ls==="S"?-.45:0),1.5,(ls==="N"?-d/2+.03:ls==="S"?d/2-.03:0),{ns:1,r:[0,0,.1]});}
    else{kind=op?"open":(e==="iron"?"iron":e==="brass"?"brass":"wood");txt=e==="iron"&&!op?"Sealed with iron":e==="brass"&&!op?"Brass lock":(e==="secret"?"Hidden door":null);ref={as,to:nb,e,op}}
    if(!op&&!kind)kind=null}
   if(ref){ref.ls=ls;doors.push(ref);if(kind)mkDoor(ls,kind,txt);
    if(ref.to!=="exit"&&!ref.secret&&ref.e&&!ref.op||ref.to==="exit"||ref.secret){}}});
  /* door interaction points */
  doors.forEach(dr=>{const q={N:[0,-d/2+1.4],S:[0,d/2-1.4],E:[w/2-1.4,0],W:[-w/2+1.4,0]}[dr.ls];dr.x=q[0];dr.z=q[1]});
  /* torches & pillars */
  const fc=cave?0x8ad0ff:0xff9a30,lc=cave?0x7ab8ff:0xff8a3a,nL=Math.max(2,Math.min(4,Math.round((w+d)/9)));
  const torchAt=(x,z,ry)=>{mk(g,new THREE.BoxGeometry(.12,.5,.12),M(0x3a2a1a),x,2.2,z);mk(g,new THREE.ConeGeometry(.14,.4,6),M(fc,{emissive:fc,emissiveIntensity:1.5}),x,2.6,z,{ns:1});
   const l=new THREE.PointLight(lc,1.6,15);l.position.set(x,2.8,z);l.userData.base=1.6;g.add(l);g.userData.lights.push(l)};
  const tpos=[];for(let i=0;i<nL;i++){const t=(i+.5)/nL,sideE=i%2?1:-1;if(w>=d)tpos.push([-w/2+w*t,sideE*(d/2-.25)]);else tpos.push([sideE*(w/2-.25),-d/2+d*t])}
  tpos.forEach(([x,z])=>{if(!doors.some(dr=>Math.hypot(dr.x-x,dr.z-z)<2.4))torchAt(x,z)});
  if(!g.userData.lights.length)torchAt(w>=d?0:(w/2-.25),w>=d?(d/2-.25):0);
  const stone=M(tint,{map:brickTex(),flatShading:false});
  const pillar=(x,z)=>{mk(g,new THREE.CylinderGeometry(.45,.5,h,10),stone,x,h/2,z);obs.push({x,z,r:.7})};
  if(node.type==="fight"||node.type==="boss"||node.type==="hall")for(let z=-d/2+3.5;z<=d/2-3;z+=5)[-1,1].forEach(sx=>{const px=sx*(w/2-1.6);if(!doors.some(dr=>Math.hypot(dr.x-px,dr.z-z)<2.5))pillar(px,z)});
  /* ---- props ---- */
  const wood=M(0x6a4a2a),dk=M(0x2a2018),bone=M(0xe4dcc4),gold=M(0xe0b84a,{emissive:0xb88a20,emissiveIntensity:.7});
  const barrel=(x,z)=>{mk(g,new THREE.CylinderGeometry(.4,.4,.95,10),wood,x,.48,z);mk(g,new THREE.CylinderGeometry(.42,.42,.07,10),M(0x3a3a40,{metalness:.5}),x,.75,z,{ns:1});obs.push({x,z,r:.5})};
  const crate=(x,z,sc,ry)=>{mk(g,new THREE.BoxGeometry(.9*sc,.9*sc,.9*sc),wood,x,.45*sc,z,{r:[0,ry||0,0]});mk(g,new THREE.BoxGeometry(.95*sc,.08*sc,.95*sc),dk,x,.9*sc-.04,z,{r:[0,ry||0,0],ns:1});obs.push({x,z,r:.62*sc})};
  const skull=(x,z)=>{mk(g,new THREE.SphereGeometry(.13,8,6),bone,x,.14,z,{ns:1})};
  const corner=(k)=>[(k&1?1:-1)*(w/2-1.1),(k&2?1:-1)*(d/2-1.1)];
  const free=(x,z,r)=>!doors.some(dr=>Math.hypot(dr.x-x,dr.z-z)<(r||1.6))&&!obs.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+(r||.6)*.5);
  const scatter=(n,fn)=>{let t=0;for(let i=0;i<n&&t<n*6;t++){const x=(R()-.5)*(w-3),z=(R()-.5)*(d-3);if(free(x,z,1.8)){fn(x,z,R());i++}}};
  const pid=DG.p.id;
  const dressing=()=>{
   if(node.type==="corridor"||node.type==="trap"){ /* a few things along the walls */
    scatter(2,(x,z,r)=>{if(Math.abs(x)>w/2-1.2)return;if(r<.5)barrel(x>0?w/2-.8:-w/2+.8,z);else skull(x,z)})}
   else if(node.type==="hall"||node.type==="fight"){scatter(node.type==="fight"?3:2,(x,z,r)=>{const e=Math.abs(x)>w/2-3;if(!e)return;if(r<.4)barrel(x,z);else if(r<.7)crate(x,z,1,r*6);else skull(x,z)})
    for(let k=0;k<6;k++)mk(g,new THREE.BoxGeometry(.3,.1,.1),bone,(R()-.5)*(w-4),.06,(R()-.5)*(d-4),{r:[0,R()*6,0],ns:1})}
   /* theme dressing */
   if(pid==="cave"){for(let k=0;k<18;k++)mk(g,new THREE.ConeGeometry(.12+R()*.12,.7+R()*1.1,5),M(0xcfeaff,{transparent:true,opacity:.85,roughness:.1}),(R()-.5)*(w-2),h-.4,(R()-.5)*(d-2),{r:[Math.PI,0,0],ns:1});
    scatter(3,(x,z,r)=>{mk(g,new THREE.ConeGeometry(.3+r*.3,1+r*1.4,5),M(0xa8d8f0,{transparent:true,opacity:.8,roughness:.1}),x,.5+r*.5,z);obs.push({x,z,r:.5})})}
   if(pid==="mine"){for(let z=-d/2+2;z<d/2;z+=3)mk(g,new THREE.BoxGeometry(w,.35,.4),M(0x5a3d22),0,h-.3,z);
    scatter(2,(x,z,r)=>{const o=Math.abs(x)>w/2-3;if(!o)return;mk(g,new THREE.BoxGeometry(1.5,.7,.9),M(0x4a4a50,{metalness:.4}),x,.5,z,{r:[0,r*3,0]});mk(g,new THREE.BoxGeometry(1.3,.35,.7),M(0x8a5a2a),x,.95,z,{r:[0,r*3,0]});obs.push({x,z,r:.9})});
    for(let k=0;k<4;k++){const sd=R()<.5?-1:1;mk(g,new THREE.BoxGeometry(.25,.5,.25),M(0xffb040,{emissive:0xff8a20,emissiveIntensity:1.1}),sd*(w/2-.15),1+R()*2,-d/2+R()*d,{ns:1})}}
   if(pid==="sunk"){mk(g,new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),M(0x2a6a6a,{transparent:true,opacity:.55,roughness:.1,flatShading:false}),0,.12,0,{ns:1});
    scatter(3,(x,z,r)=>{mk(g,new THREE.SphereGeometry(.4+r*.3,7,5),M(0x2f5a3a),x,.1,z,{s:[1,.4,1]})})}
   if(pid==="tomb"){const gl=[0x4ad0c0,0xe0b84a,0xc04030];for(let k=0;k<5;k++){const ss=R()<.5?-1:1,pp=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.8),new THREE.MeshBasicMaterial({color:gl[k%3],transparent:true,opacity:.28}));pp.position.set(ss*(w/2-.06),2.2,-d/2+2+R()*(d-4));pp.rotation.y=-ss*Math.PI/2;g.add(pp)}
    scatter(2,(x,z,r)=>{if(Math.abs(x)<w/2-2.5)return;mk(g,new THREE.CylinderGeometry(.3,.25,.8,8),M(0xb89860),x,.4,z);obs.push({x,z,r:.4})})}
   if(pid==="crypt"||pid==="lair"){scatter(pid==="lair"?4:3,(x,z,r)=>{for(let k=0;k<5;k++)skull(x+(R()-.5)*1.2,z+(R()-.5)*1.2)})}
   if(pid==="lair"){scatter(2,(x,z,r)=>{if(Math.abs(x)<w/2-3)return;mk(g,new THREE.CylinderGeometry(.9,.9,1.4,10),M(0x3a3a40),x,.7,z);obs.push({x,z,r:1})})}
  };
  dressing();
  /* ---- chests, altars and features ---- */
  const addChest=(x,z,ry,key,opts)=>{const open=!!m.got[key],ch=new THREE.Group();ch.position.set(x,0,z);ch.rotation.y=ry||0;
   mk(ch,new THREE.BoxGeometry(1.4,.8,.8),M(0x6b4a22),0,.4,0);mk(ch,new THREE.BoxGeometry(1.4,.25,.8),M(0x7b5a2a),0,open?1.0:.9,open?-.5:0,{r:[open?-1.1:0,0,0]});mk(ch,new THREE.BoxGeometry(.2,.4,.84),gold,0,.65,0,{ns:1});
   if(!open){const l=new THREE.PointLight(0xffd060,.9,5);l.position.set(0,1.2,0);ch.add(l)}g.add(ch);obs.push({x,z,r:.9});
   if(!open)ints.push({x,z,r:2,t:opts&&opts.t||"Open the chest",use:()=>chestUse(node,key,opts||{})})};
  const addAltar=(x,z)=>{mk(g,new THREE.BoxGeometry(2.2,.9,1.2),M(0x4a4650),x,.45,z);mk(g,new THREE.BoxGeometry(1.8,.2,.9),M(0x6a6670),x,1,z);const o=mk(g,new THREE.OctahedronGeometry(.22),M(0xc0a8ff,{emissive:0xa080ff,emissiveIntensity:1.5}),x,1.5,z,{ns:1});
   const l=new THREE.PointLight(0xb090ff,1.2,8);l.position.set(x,1.8,z);g.add(l);obs.push({x,z,r:1.3})};
  const addWell=(x,z)=>{mk(g,new THREE.CylinderGeometry(1.1,1.2,.8,14),M(0x5a5a62),x,.4,z);mk(g,new THREE.CylinderGeometry(.9,.9,.1,14),M(0x1a4a6a,{emissive:0x0a2a4a,emissiveIntensity:.8,transparent:true,opacity:.9,flatShading:false,roughness:.1}),x,.78,z,{ns:1});obs.push({x,z,r:1.4})};
  const addPed=(x,z,glow,col)=>{mk(g,new THREE.CylinderGeometry(.35,.5,1,8),M(0x5a5a62),x,.5,z);if(glow){mk(g,new THREE.OctahedronGeometry(.2),M(col||0xe0b84a,{emissive:col||0xe0b84a,emissiveIntensity:1.6}),x,1.4,z,{ns:1});const l=new THREE.PointLight(col||0xffd060,1,6);l.position.set(x,1.7,z);g.add(l)}obs.push({x,z,r:.6})};
  const T=node.type,cl=!!m.clr[node.id];
  if(T==="treasure"){addChest(0,-d/2+1.5,0,"c"+node.id+"a",{t:"Open the cache",rich:node.secret});if(node.secret||R()<.5)addChest(w/2-1.8,-d/2+1.8,-.3,"c"+node.id+"b",{t:"Open the second chest"})}
  if(T==="vault"){addChest(-1.8,-d/2+1.6,.1,"v"+node.id+"a",{t:"Open the strongbox",rich:1});addChest(1.8,-d/2+1.6,-.1,"v"+node.id+"b",{t:"Open the strongbox",rich:1});
   for(let k=0;k<16;k++)mk(g,new THREE.SphereGeometry(.14+R()*.1,6,5),gold,(R()-.5)*(w-3),.12,(R()-.5)*(d-4),{ns:1})}
  if(T==="shrine"){addAltar(0,-d/2+1.8);ints.push({x:0,z:-d/2+1.8,r:2.4,t:"Approach the altar",use:()=>shrineUse(node)})}
  if(T==="well"){addWell(0,-1);ints.push({x:0,z:-1,r:2.6,t:"Look into the water",use:()=>wellUse(node)})}
  if(T==="key"){const got=!!DG.s.ch[2]||!!m.got["key"+node.id];addPed(0,-d/2+1.6,!got,0xc0c0d0);
   ints.push({x:0,z:-d/2+1.6,r:2.2,t:got?"Examine the empty pedestal":"Take what rests on the pedestal",use:()=>keyUse(node,got)});
   if(R()<.7)crate(w/2-1.2,-d/2+1.2,1,.3)}
  if(T==="boss"){ /* throne dais, braziers and the hoard */
   mk(g,new THREE.BoxGeometry(8,.5,5),stone,0,.25,-d/2+2.5);mk(g,new THREE.BoxGeometry(6,.5,3.6),stone,0,.7,-d/2+2.3);mk(g,new THREE.BoxGeometry(1.6,.8,1.3),M(0x3a2a2a),0,1.4,-d/2+1.6);mk(g,new THREE.BoxGeometry(1.6,2.6,.3),M(0x3a2a2a),0,2.4,-d/2+1.0);
   [-1,1].forEach(sx=>{mk(g,new THREE.CylinderGeometry(.5,.35,1.2,8),M(0x2a2a30),sx*5,.6,-d/2+2.6);mk(g,new THREE.ConeGeometry(.35,.9,6),M(0xff8a30,{emissive:0xff6a10,emissiveIntensity:1.8}),sx*5,1.7,-d/2+2.6,{ns:1});const l=new THREE.PointLight(0xff7a30,1.6,14);l.position.set(sx*5,2.2,-d/2+2.8);l.userData.base=1.6;g.add(l);g.userData.lights.push(l)});
   if(DG.s.clr[5]){const bx=new THREE.Group();bx.position.set(0,.95,-d/2+3.3);mk(bx,new THREE.BoxGeometry(1.6,.8,.9),M(0x6b4a22),0,.4,0);mk(bx,new THREE.BoxGeometry(1.6,.25,.9),M(0x7b5a2a),0,DG.s.boss?1.0:.9,DG.s.boss?-.55:0,{r:[DG.s.boss?-1.2:0,0,0]});
    if(!DG.s.boss){const l=new THREE.PointLight(0xffd060,1.6,8);l.position.set(0,1.4,0);bx.add(l)}g.add(bx);
    for(let k=0;k<14;k++)mk(g,new THREE.SphereGeometry(.18+hs(k,2)*.2,6,5),gold,(hs(k,5)-.5)*3.6,1.05,-d/2+3.3+(hs(k,7)-.5)*1.6,{ns:1});
    if(!DG.s.boss)ints.push({x:0,z:-d/2+3.3,r:2.8,t:"Open the hoard",use:hoardUse})}}
  /* trap plates */
  if(T==="trap"){const n=2+Math.round(R());for(let k=0;k<n;k++){const z=-d/2+3.5+(d-7)*(k+.5)/n,sprung=!!m.trap[node.id+"."+k];pl.push({x:(R()-.5)*(w-2.4),z,k,key:node.id+"."+k,sprung});
    const q=pl[pl.length-1];mk(g,new THREE.BoxGeometry(1.2,sprung?.02:.07,1.2),M(sprung?0x1a1612:0x6a6258),q.x,sprung?.01:.04,q.z,{ns:1})}}
  /* spoils of a won fight */
  if(T==="fight"&&cl&&!m.spoil[node.id]){const x=0,z=0;mk(g,new THREE.SphereGeometry(.3,6,5),M(0x4a3a2a),x,.2,z,{s:[1.6,.6,1.2]});mk(g,new THREE.SphereGeometry(.12,6,5),gold,x+.2,.45,z,{ns:1});
   ints.push({x,z,r:2.2,t:"Search the remains",use:()=>spoilUse(node)})}
  /* hidden-wall search points */
  doors.filter(dr=>dr.secret).forEach(dr=>ints.push({x:dr.x,z:dr.z,r:2.2,t:"Search the wall",use:()=>searchWall(node,dr)}));
  /* dread shafts of light */
  const gp=new THREE.BufferGeometry(),pa=new Float32Array(60*3);for(let k=0;k<60;k++){pa[k*3]=(R()-.5)*(w-1);pa[k*3+1]=R()*h;pa[k*3+2]=(R()-.5)*(d-1)}gp.setAttribute("position",new THREE.BufferAttribute(pa,3));g.add(new THREE.Points(gp,new THREE.PointsMaterial({size:.06,color:0xffe8b0,transparent:true,opacity:.35,depthWrite:false})));
  g.add(new THREE.AmbientLight(cave?0x506080:0x504840,1.5));
  g.userData.fog=new THREE.Color(tint).multiplyScalar(.1);g.userData.camz=d/2-1.6;
  return{g,w,d,h,rot,doors,obs,ints,plates:pl,entry,node}}
 /* ---------- navigation ---------- */
 function showRoom(r){if(dg3.g)scene.remove(dg3.g);dg3.g=r.g;scene.add(r.g);scene.fog=dungFog;dungFog.color.copy(r.g.userData.fog);scene.background=r.g.userData.fog}
 function setNode(id,entry,keepPos){
  const L=MZ.L,node=L.nodes[id],m=MS();m.cur=id;m.vis[id]=1;
  MZ.room=buildNode(node,entry);try{window.DGART&&DGART.dress(MZ.room,node,entry)}catch(e){console.warn('dgart',e)}DIMS[10]=[MZ.room.w,MZ.room.d];if(window.DR)window.DR[10]=window.DR[DRI[node.type]||1];DG.th.n[10]=node.name;DG.s.r=10;
  showRoom(MZ.room);
  if(!keepPos){dgCam.x=0;dgCam.z=MZ.room.d/2-1.6;yaw=0;pitch=0}
  MZ.cool=1.2;MZ.near=null;MZ.visT=0}
 function roomMsg(node){const m=MS(),T=node.type,cl=m.clr[node.id];
  return({start:"The stair ends here. Behind you, daylight. Ahead, a dark door.",hall:"A crossroads of old stone. The air moves, which means there is a way through.",corridor:"A narrow way. The torchlight does not reach the end.",trap:"The floor here is too clean. Someone has been taking care of this corridor.",
   fight:cl?"The room is quiet now.":"Something here has not left. You can hear it breathing.",treasure:"A quiet cache. Something glints under the dust.",shrine:"Small, old and kept. The altar still holds a glow.",well:"Water drips somewhere, and a still pool answers it.",key:"A small chamber with a pedestal. Something rests on it.",vault:"The door was locked for a reason. The air smells of coin.",boss:cl?"The deepest chamber is quiet. The hoard waits.":"The deepest chamber. Something large waits, and it knows you are here."})[T]||""}
 function go(side){
  const r=MZ.room,dr=r.doors.find(q=>q.ls===side);if(!dr)return;
  if(dr.to==="exit"){closeDg();return}
  const abs=dr.as,nb=dr.to;flash("rgba(0,0,0,1)");
  const prev=r.node.id;setNode(nb,OPP[abs]);const node=MZ.L.nodes[nb];DG.msg=roomMsg(node);
  const m=MS();passive(node);renderDg();trigger(node)}
 /* a quick perception roll the first time you step into a room with a hidden door */
 function passive(node){const m=MS();m.seenS=m.seenS||{};for(const as of SIDES){const nb=node.doors[as];if(nb==null)continue;const e=ek(node.id,nb);if(MZ.L.edges[e]==="secret"&&!m.found[e]){if(m.seenS[e])continue;m.seenS[e]=1;
   const dc=11+DG.t*2,rr=rnd(20)+mod(AT().WIS)+(hero.cls==="Ranger"?2:0);if(rr>=dc){m.found[e]=1;DG.msg+=" You notice a draught from a seam in the wall: a hidden door! (d20 "+sg(mod(AT().WIS))+" = "+rr+" vs DC "+dc+")";setNode(node.id,MZ.room.entry,true)}else DG.msg+=" Something about the north wall feels wrong, but you cannot say what."}}}
 /* ---------- fights ---------- */
 function foeFor(node){const th=DG.th;if(node.type==="boss"){const bs=FOES[th.b][FOES[th.b].length-1];return[th.boss,Math.round(bs[1]*1.6),bs[2]+1,bs[3]+1,bs[4],bs[5],bs[6],bs[7]*3,3,bs[9],bs[10]||"",!!th.u]}
  const pool=FOES[th.b].filter(x=>x[8]<=DG.t+1);return node.deep&&Math.random()<.6?pool[pool.length-1]:pickOne(pool)}
 function startFight(node,wave){const dg=DG,m=MS();if(!dg||C)return;MZ.fight=true;
  startCombat(foeFor(node),node.type==="boss"?Math.min(3,DG.t+1):Math.min(3,DG.t+(node.deep?1:0)),won=>{MZ.fight=false;if(DG!==dg)return;
   if(won){if(node.type==="boss"){DG.s.clr[5]=1;DG.msg=DG.th.boss+" falls. The hoard is yours to open."}
    else if(node.waves===2&&!m.w2[node.id]){m.w2[node.id]=1;DG.msg="One falls, and another comes out of the dark!";setTimeout(()=>{if(DG===dg&&!C&&MZ.room&&MZ.room.node.id===node.id)startFight(node,2)},1200)}
    else{m.clr[node.id]=1;DG.msg="The room falls quiet. Something may be left on the floor.";m.w2[node.id]=0}
    setNode(node.id,MZ.room.entry,true);
   }else{DG.msg="You backed out of the fight.";dgCam.x=0;dgCam.z=MZ.room.d/2-1.8;MZ.cool=3}
   renderDg()})}
 function trigger(node){const m=MS();if(C||MZ.fight)return;
  if(node.type==="fight"&&!m.clr[node.id]){MZ.armed=node.id}
  else if(node.type==="boss"&&!DG.s.clr[5]){MZ.armed=node.id}else MZ.armed=-1}
 /* ---------- interactions ---------- */
 function popup(title,text,btns){MZ.pop=true;try{document.exitPointerLock()}catch(e){}const b=$("dngbox");b.innerHTML="";b.style.cssText="";b.appendChild(el("h2",title));if(text)b.appendChild(el("p",text,"sub"));
  if(DG.msg)b.appendChild(el("p",DG.msg,"msg"));const row=el("div");row.className="menu";btns.forEach(q=>row.appendChild(btn(q.t,q.fn,q.c||"alt",q.dis)));row.appendChild(btn("Step back",()=>close(),"go"));b.appendChild(row)}
 function close(msg){MZ.pop=false;if(msg!=null)DG.msg=msg;if(MZ.room)setNode(MZ.room.node.id,MZ.room.entry,true);renderDg()}
 function again(){if(MZ.pop){MZ.room&&setNode(MZ.room.node.id,MZ.room.entry,true)}}
 function dmg(n,txt){const d=Math.max(0,Math.min(hero.hp-1,n));hero.hp-=d;return d}
 function trapHit(){const t=DG.t,k=pickOne(["A dart trap hisses from the wall","The floor drops a hand's breadth and a blade swings","A gout of old flame breathes from a crack","Rotten stone rains from the ceiling","A cloud of pale gas bursts from a vent"]);const d=dmg(roll(1+t,6));return k+"! You take "+d+" damage."}
 function chestUse(node,key,o){const m=MS(),t=DG.t;if(m.got[key])return;const trapped=hs(node.id*7+key.length,t)<.18+t*.07;
  const open=()=>{let pre="";if(trapped&&!m.got["d"+key])pre=trapHit()+" ";m.got[key]=1;
   const mim=!trapped&&!o.rich&&hs(node.id*3,key.charCodeAt(0))<.1&&!C;
   if(mim){DG.msg="The chest bites! It was a mimic.";MZ.pop=false;const pool=FOES[DG.th.b].filter(x=>x[8]<=DG.t+1),dg=DG;MZ.fight=true;setNode(node.id,MZ.room.entry,true);renderDg();
    startCombat(pool[pool.length-1],DG.t,w=>{MZ.fight=false;if(DG!==dg)return;if(w){const out=[lootChest(),lootChest()];DG.msg="The mimic falls. Inside: "+out.join("; ")+".";sfx("win")}else{DG.msg="You backed out of the fight.";dgCam.x=0;dgCam.z=MZ.room.d/2-1.8}renderDg()});return}
   const out=[lootChest()];if(o.rich){out.push(lootChest());out.push(addLoot(pickOne(POOL[Math.min(3,DG.t+1)])))}
   try{sfx("win")}catch(e){}hud();close(pre+"Inside: "+out.join("; ")+".")};
  const chestBtns=()=>{const found=!!m.got["f"+key],st=!!m.got["s"+key],arr=[{t:"Open it",fn:open,c:"go"}];
   if(!st)arr.push({t:"Search for traps"+(hero.cls==="Rogue"?" (rogue skill)":""),fn:()=>{m.got["s"+key]=1;const rr=rnd(20)+mod(AT().WIS)+prof()+(hero.cls==="Rogue"?3:0),dc=11+t;
     if(rr>=dc){DG.msg=trapped?"You find a wire under the lid: trapped. (d20 roll "+rr+" vs DC "+dc+")":"You find nothing wrong. (d20 roll "+rr+" vs DC "+dc+")";if(trapped)m.got["f"+key]=1}else DG.msg="You see nothing. That proves nothing. ("+rr+" vs DC "+dc+")";popup("The chest","",chestBtns())}});
   if(found&&!m.got["d"+key])arr.push({t:"Disarm the trap",fn:()=>{const rr=rnd(20)+mod(AT().DEX)+prof()+(hero.cls==="Rogue"?3:0)+(hero.inv.Lockpicks?2:0),dc=12+t;m.got["d"+key]=1;if(rr>=dc)DG.msg="Click. The trap is dead. ("+rr+" vs DC "+dc+")";else DG.msg="Your hand slips. "+trapHit()+" ("+rr+" vs DC "+dc+")";hud();popup("The chest","",chestBtns())}});return arr};
  popup(o.t||"A chest","Dust, iron bands and a lock that has not been used in a long time.",chestBtns())}
 function spoilUse(node){const m=MS();m.spoil[node.id]=1;const t=DG.t,g=(rnd(10)+4)*(t+1);hero.gold+=g;const out=[g+" gp"];
  if(Math.random()<.55){giveItem("Healing herb");out.push("Healing herb")}if(Math.random()<.25){giveItem("Healing potion");out.push("Healing potion")}if(Math.random()<.15){giveItem("Mana potion");out.push("Mana potion")}
  if(node.brass&&!hero.inv["Brass key"]&&!MS().got.brassTaken){MS().got.brassTaken=1;giveItem("Brass key");out.push("a small Brass key")}
  DG.msg="You search the remains: "+out.join(", ")+".";close(DG.msg)}
 function keyUse(node,got){const m=MS();if(got){popup("The pedestal","A ring in the dust shows where something lay.",[]);return}
  const opts=[{t:"Take the Iron key",c:"go",fn:()=>{m.got["key"+node.id]=1;DG.s.ch[2]=1;giveItem("Iron key");const t=DG.t,rr=rnd(20)+mod(AT().DEX),dc=10+t*2;let msg="Iron key taken. ";if(rr<dc){const d=dmg(roll(1+t,6));msg+="A dart whips out of the pedestal. You take "+d+" damage. (d20 "+sg(mod(AT().DEX))+" = "+rr+" vs DC "+dc+")"}else msg+="Nothing happens, this time.";const x=lootChest();msg+=" Under it: "+x+".";close(msg)}}];
  popup("The pedestal","An old iron key rests on a stone cushion. It is much too tidy.",opts)}
 function shrineUse(node){const m=MS(),k="sh"+node.id,used=m.got[k];
  popup(DG.th.n[10]||"Shrine","A small altar, kept by no one, glowing a little.",[
   {t:used?"The glow has faded":"Pray: heal and restore",fn:()=>{m.got[k]=1;fixStats();hero.hp=hero.maxHp;hero.mana=hero.maxMana;hud();close("Warmth moves through you. HP and "+RES[hero.cls].toLowerCase()+" are full.")},dis:!!used,c:"go"},
   {t:"Offer 15 gp for a blessing",fn:()=>{if(hero.gold<15)return;hero.gold-=15;hud();try{OMEN.set({name:"Shrine blessing",src:"shrine",glyph:"✦",fx:[{k:"dmg",v:2,t:"The shrine's hand: +2 damage"},{k:"ac",v:1,t:"The shrine's hand: +1 AC"}],left:900,max:900,sub:node.name});close("The glow settles on you like a cloak. (Blessing: +2 damage, +1 AC for 15 minutes.)")}catch(e){close("Nothing answers.")}},dis:hero.gold<15||!!m.got["of"+node.id]}])}
 function wellUse(node){const m=MS();
  popup(node.name,"The water is dark and very still. Your reflection is a half-beat behind you.",[
   {t:"Drink",fn:()=>{if(m.got["w"+node.id]){close("The water tastes of nothing now.");return}m.got["w"+node.id]=1;const r=rnd(6);
     if(r===1){const d=dmg(roll(2,4));close("It is bitter and wrong. You take "+d+" damage and lose your footing for a moment.")}
     else if(r<=3)close("Cold and clean. You feel a little better.",hero.hp=Math.min(maxHP(),hero.hp+Math.ceil(maxHP()*.25)));
     else if(r<=5){hero.hp=Math.min(maxHP(),hero.hp+Math.ceil(maxHP()*.5));hero.mana=Math.min(maxMP(),hero.mana+Math.ceil(maxMP()*.4));hud();close("Sweet water, with a spark in it. You are much restored.")}
     else{fixStats();hero.hp=hero.maxHp;hero.mana=hero.maxMana;hud();close("The pool glows briefly. You are whole again.")}hud()}},
   {t:"Throw in a coin",fn:()=>{if(hero.gold<1)return;hero.gold--;if(Math.random()<.65&&!m.mapAll){m.mapAll=1;L_revealAll();close("The ripples settle into a map of the halls around you. You remember every room.")}else close("The coin sinks. The reflection nods, once.");hud()}},
   {t:"Fill a flask",fn:()=>{if(m.got["f"+node.id]){close("The flask comes up empty.");return}m.got["f"+node.id]=1;giveItem("Healing herb");close("You steep a healing herb in the pool and wrap it: Healing herb.")}}])}
 function L_revealAll(){const m=MS();MZ.L.nodes.forEach(n=>{m.vis[n.id]=1})}
 function hoardUse(){const s=DG.s,th=DG.th;s.boss=1;const o=[lootChest(),lootChest(),addLoot(pickOne(POOL[Math.min(3,DG.t+1)])),addLoot("Silver key")],x=[];addXp(100*(DG.t+1),x);fixStats();
  const bonus=addLoot(pickOne(POOL[Math.min(3,DG.t+1)]));o.push(bonus);DG.msg="HOARD: "+o.join(", ")+". "+x.join(" ");sfx("win");close(DG.msg)}
 function searchWall(node,dr){const m=MS(),e=ek(node.id,dr.to),dc=11+DG.t*2,rr=rnd(20)+Math.max(mod(AT().WIS),mod(AT().INT))+prof()+(hero.cls==="Rogue"?3:0);
  if(rr>=dc){m.found[e]=1;close("Your fingers find a seam. A door grinds out of the wall! (d20 roll "+rr+" vs DC "+dc+")")}else close("You tap along the wall and find only stone. You may try again. (roll "+rr+" vs DC "+dc+")")}
 function doorUse(node,dr){const m=MS();
  if(dr.to==="exit"){go(dr.ls);return}
  const e=MZ.L.edges[ek(node.id,dr.to)],op=isOpenEdge(node.id,dr.to);
  if(op){go(dr.ls);return}
  if(e==="brass"){popup("A brass-bound door","The lock is brass, small and well oiled. Whatever is kept here, someone cared about it.",[
   {t:"Use the Brass key",fn:()=>{if(!hero.inv["Brass key"])return;hero.inv["Brass key"]--;if(hero.inv["Brass key"]<=0)delete hero.inv["Brass key"];m.open[ek(node.id,dr.to)]=1;close("The key turns. The door opens on the smell of coin.")},c:"go",dis:!hero.inv["Brass key"]},
   {t:"Pick the lock",fn:()=>{const rr=rnd(20)+mod(AT().DEX)+prof()+(hero.inv.Lockpicks?2:0)+(hero.cls==="Rogue"?3:0),dc=13+DG.t;if(rr>=dc){m.open[ek(node.id,dr.to)]=1;close("Click. The door swings open. ("+rr+" vs DC "+dc+")")}else close("The pick slips. ("+rr+" vs DC "+dc+") Try again.")}}]);return}
  if(e==="iron"){popup("The Sealed Door","A heavy door with an old iron lock. The way ahead is the deepest chamber.",[
   {t:"Use the Iron key",fn:()=>{hero.inv["Iron key"]--;if(hero.inv["Iron key"]<=0)delete hero.inv["Iron key"];DG.s.unl=1;close("The key turns. The door grinds open.")},c:"go",dis:!hero.inv["Iron key"]},
   {t:"Pick the lock"+(hero.cls==="Rogue"?" (rogue skill)":""),fn:()=>{dgRollQuiet("You work the lock",mod(AT().DEX)+prof()+(hero.inv.Lockpicks?2:0)+(hero.cls==="Rogue"?3:0),12+DG.t,()=>{DG.s.unl=1;return" The door swings open."})}},
   {t:"Force the door",fn:()=>{dgRollQuiet("You shoulder the door",mod(AT().STR),14+DG.t,()=>{DG.s.unl=1;return" Wood splinters."},()=>{const d=dmg(roll(1,6));return" You take "+d+" damage."})}}].concat(
    (window.PZ&&PZ.DEF&&PZ.DEF["dg_"+DG.p.id])?[{t:"✦ "+PZ.DEF["dg_"+DG.p.id].title+(PZ.DEF["dg_"+DG.p.id]?"":""),fn:()=>{MZ.pop=false;PZ.run("dg_"+DG.p.id,{dg:1})},c:"go"}]:[]));return}
  /* ordinary closed door */
  m.open[ek(node.id,dr.to)]=1;DG.msg="The door creaks open.";setNode(node.id,MZ.room.entry,true);renderDg()}
 function dgRollQuiet(label,bonus,dc,okFn,failFn){const r=rnd(20),t=r+bonus,ok=r===20||(r!==1&&t>=dc);let msg=label+" (d20 "+r+sg(bonus)+" = "+t+" vs DC "+dc+"): ";if(ok)msg+="success."+(okFn()||"");else msg+="failed."+((failFn&&failFn())||"");close(msg)}
 /* ---------- per-frame ---------- */
 function nearest(){const r=MZ.room;if(!r)return null;let best=null,bd=9;
  r.ints.forEach(q=>{const dd=Math.hypot(q.x-dgCam.x,q.z-dgCam.z);if(dd<q.r&&dd<bd){bd=dd;best={t:q.t,use:q.use}}});
  r.doors.forEach(dr=>{if(dr.secret)return;const dd=Math.hypot(dr.x-dgCam.x,dr.z-dgCam.z);if(dd<2&&dd<bd){bd=dd;const nb=dr.to,e=nb==="exit"?null:MZ.L.edges[ek(r.node.id,nb)],op=nb==="exit"||isOpenEdge(r.node.id,nb);
    best={t:nb==="exit"?"Climb the stair out of the dungeon":op?"Go through the door":(e==="iron"?"Try the sealed door":e==="brass"?"Try the brass door":"Open the door"),use:()=>doorUse(r.node,dr)}}});
  return best}
 function walk(dt){const r=MZ.room;if(!r||MZ.pop||C||MZ.fight||packOpen||D||occOpen)return;
  let fw=0,st=0,tr=0;if(keys.w||keys.ArrowUp)fw++;if(keys.s||keys.ArrowDown)fw--;if(keys.a)st--;if(keys.d)st++;if(keys.ArrowLeft)tr++;if(keys.ArrowRight)tr--;
  fw-=joy.y;st+=joy.x;yaw+=tr*1.9*dt;let dx=-Math.sin(yaw)*fw+Math.cos(yaw)*st,dz=-Math.cos(yaw)*fw-Math.sin(yaw)*st;const l=Math.hypot(dx,dz);if(l>1){dx/=l;dz/=l}
  const sp=(keys.Shift?6.5:4.2)*dt*(window.OMEN?OMEN.m("speed"):1);dx*=sp;dz*=sp;
  const hw=r.w/2-.55,hd=r.d/2-.55,dOpen=ls=>{const q=r.doors.find(z=>z.ls===ls);return q&&(q.to==="exit"||isOpenEdge(r.node.id,q.to))};
  const ok=(x,z)=>{let lim=null;
   if(z<-hd&&!(dOpen("N")&&Math.abs(x)<.9))return false;if(z>hd&&!(dOpen("S")&&Math.abs(x)<.9))return false;if(x>hw&&!(dOpen("E")&&Math.abs(z)<.9))return false;if(x<-hw&&!(dOpen("W")&&Math.abs(z)<.9))return false;
   if(Math.abs(x)>r.w/2-.2||Math.abs(z)>r.d/2-.2)return false;
   for(const o of r.obs)if(Math.hypot(o.x-x,o.z-z)<o.r)return false;return true};
  if(ok(dgCam.x+dx,dgCam.z))dgCam.x+=dx;if(ok(dgCam.x,dgCam.z+dz))dgCam.z+=dz;
  if(dgCam.z<-hd&&dOpen("N")){go("N");return}if(dgCam.z>hd&&dOpen("S")){go("S");return}if(dgCam.x>hw&&dOpen("E")){go("E");return}if(dgCam.x<-hw&&dOpen("W")){go("W");return}
  /* trap plates */
  r.plates.forEach(q=>{if(q.sprung||MS().trap[q.key])return;if(Math.hypot(q.x-dgCam.x,q.z-dgCam.z)<.75){MS().trap[q.key]=1;q.sprung=true;const dc=10+DG.t*2,rr=rnd(20)+mod(AT().DEX)+(hero.cls==="Rogue"?3:0)+(hero.cls==="Ranger"?1:0);
    if(rr>=dc)DG.msg="A click underfoot. You freeze, then step clear before it matters. (d20 "+sg(mod(AT().DEX))+" = "+rr+" vs DC "+dc+")";else{DG.msg="A click underfoot... "+trapHit()+" (d20 = "+rr+" vs DC "+dc+")";hud()}setNode(r.node.id,r.entry,true);renderDg()}});
  /* fights are sprung when you come far enough in */
  if(MZ.armed===r.node.id&&MZ.cool<=0&&dgCam.z<r.d/2-(r.node.type==="boss"?5:3.4)){MZ.armed=-1;startFight(r.node)}
  if(MZ.cool>0)MZ.cool-=dt;
  /* re-arm after a retreat if the foe is still there */
  if(MZ.armed===-1&&MZ.cool<=0&&!C){const n=r.node;if(n.type==="fight"&&!MS().clr[n.id])MZ.armed=n.id;else if(n.type==="boss"&&!DG.s.clr[5])MZ.armed=n.id}
 }
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!DG||!DG.mz||!MZ.room){const pr=document.getElementById("prompt");if(MZ.on&&pr){pr.style.display="none"}MZ.on=!!(DG&&DG.mz);return}
  MZ.on=true;dt=Math.min(dt,.06);walk(dt);
  const n=(MZ.pop||C)?null:nearest(),pr=document.getElementById("prompt");MZ.near=n;
  if(pr){if(n){pr.style.display="block";pr.textContent=n.t+"  (E)"}else pr.style.display="none"}
  drawMap();
 }catch(e){if(!window.__mze){window.__mze=1;console.warn("maze",e)}}};
 addEventListener("keydown",e=>{if(!DG||!DG.mz)return;if(e.code==="KeyM"){e.preventDefault();MZ.bigMap=!MZ.bigMap;return}
  if(e.code!=="KeyE"||e.repeat||/TEXTAREA|INPUT|SELECT/.test(e.target.tagName))return;e.stopImmediatePropagation();e.preventDefault();
  if(MZ.pop||C||packOpen||D||occOpen)return;const n=MZ.near;if(n)n.use()},true);
 /* ---------- map ---------- */
 let mapC=null;
 function drawMap(){if(!MZ.L)return;const cw=document.querySelector(".cw");if(!mapC&&cw){mapC=document.createElement("canvas");mapC.id="mzmap";mapC.style.cssText="position:absolute;right:8px;top:8px;border:1px solid var(--brass);background:rgba(8,6,10,.78);z-index:3;pointer-events:none";cw.appendChild(mapC)}
  if(!mapC)return;const big=!!MZ.bigMap,cs=big?40:20,pad=8,W2=GW*cs+pad*2,H2=GH*cs+pad*2;if(mapC.width!==W2){mapC.width=W2;mapC.height=H2;mapC.style.width=(big?W2*1.4:W2)+"px"}mapC.style.display="block";
  const g=mapC.getContext("2d"),m=MS(),L=MZ.L;g.clearRect(0,0,W2,H2);
  const px=n=>pad+n.x*cs,py=n=>pad+n.y*cs,col=n=>({start:"#8a8a98",boss:"#a02020",key:"#c0c0d8",vault:"#e0b84a",treasure:"#c8a030",shrine:"#9a80e0",well:"#4a90d0",fight:m.clr[n.id]?"#4a6a4a":"#7a3030",trap:"#8a7040",corridor:"#5a5a60",hall:"#5a5a60"})[n.type];
  L.nodes.forEach(n=>{if(!m.vis[n.id])return;SIDES.forEach(s=>{const b=n.doors[s];if(b==null)return;const nb=L.nodes[b];if(!(m.vis[b]||isOpenEdge(n.id,b)||true))return;if(L.edges[ek(n.id,b)]==="secret"&&!m.found[ek(n.id,b)])return;
    const x1=px(n)+cs/2,y1=py(n)+cs/2,x2=px(nb)+cs/2,y2=py(nb)+cs/2;g.strokeStyle=m.vis[b]?"#b8a878":"#5a5040";g.lineWidth=big?3:2;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
    if(!m.vis[b]){g.fillStyle="#2a2630";g.fillRect(px(nb)+cs*.3,py(nb)+cs*.3,cs*.4,cs*.4);g.fillStyle="#b8a878";g.font=(cs*.35)+"px serif";g.textAlign="center";g.fillText("?",px(nb)+cs/2,py(nb)+cs*.66)}})});
  L.nodes.forEach(n=>{if(!m.vis[n.id])return;g.fillStyle=col(n);g.fillRect(px(n)+cs*.15,py(n)+cs*.15,cs*.7,cs*.7);if(n.id===m.cur){g.strokeStyle="#fff";g.lineWidth=2;g.strokeRect(px(n)+cs*.1,py(n)+cs*.1,cs*.8,cs*.8);
    const r=MZ.room,rot=r?r.rot:0;let fx=-Math.sin(yaw),fy=-Math.cos(yaw);for(let k=0;k<rot;k++){const t=fx;fx=fy;fy=-t}
    const cx=px(n)+cs/2,cy=py(n)+cs/2;g.fillStyle="#fff";g.beginPath();g.moveTo(cx+fx*cs*.3,cy+fy*cs*.3);g.lineTo(cx-fy*cs*.15-fx*cs*.1,cy+fx*cs*.15-fy*cs*.1);g.lineTo(cx+fy*cs*.15-fx*cs*.1,cy-fx*cs*.15-fy*cs*.1);g.closePath();g.fill()}});}
 /* ---------- hud ---------- */
 const _rd=renderDg;
 renderDg=function(){if(!DG||!DG.mz){return _rd.apply(this,arguments)}
  if(MZ.pop)return;const b=$("dngbox");b.innerHTML="";b.style.cssText="padding:6px 10px;gap:3px;max-height:22vh";const s=DG.s,n=MZ.room&&MZ.room.node;fixStats();
  const h=el("p",(n?n.name+" · ":"")+"HP "+hero.hp+"/"+maxHP()+" · "+RES[hero.cls]+" "+hero.mana+"/"+maxMP()+" · "+hero.gold+" gp"+(hero.inv["Iron key"]?" · Iron key":"")+(hero.inv["Brass key"]?" · Brass key":"")+(s.boss?" · Cleared":""),"sub");h.style.cssText="margin:0;font-weight:700";b.appendChild(h);
  if(DG.msg){const q=el("p",DG.msg,"msg");q.style.cssText="margin:0;font-size:.86rem";b.appendChild(q)}
  if(!MZ.hinted){MZ.hinted=1;const q=el("p","WASD to walk, mouse to look, E to open and use, M for the map.","sub");q.style.cssText="margin:0;font-size:.8rem";b.appendChild(q)}
  const row=el("div");row.className="menu";row.style.cssText="flex-direction:row;flex-wrap:wrap;gap:5px";
  const mb=(t,f,c)=>{const x=btn(t,f,c);x.style.cssText="padding:4px 10px;font-size:.82rem;min-height:0";return x};
  row.appendChild(mb("Use (E)",()=>{if(!MZ.pop&&!C&&MZ.near)MZ.near.use();else toast("Nothing to use here.")},"go"));row.appendChild(mb("Pack",openPack,"alt"));row.appendChild(mb("Map (M)",()=>{MZ.bigMap=!MZ.bigMap},"alt"));b.appendChild(row)}
 const _enter=enterDg;
 enterDg=function(p){if(!DGT[p.id])return;MZ.pop=false;MZ.fight=false;MZ.armed=-1;
  DG={p,th:DGT[p.id],t:tierAt(p.x,p.y),prev:0,msg:DGT[p.id].intro,s:dgState(p),mz:1};MZ.L=genLayout(p);MS();DG.s.r=10;
  if(!ITEMS["Brass key"])ITEMS["Brass key"]={t:"k",desc:"Opens small brass locks, such as a vault door."};
  $("dng").hidden=false;dg3.enter();const m=MS();m.cur=-1;setNode(MZ.L.start,"S");MZ.armed=-1;DG.msg=DG.th.intro+" "+roomMsg(MZ.L.nodes[MZ.L.start]);try{const mi=$("mini");if(mi)mi.style.display="none"}catch(e){}renderDg()};
 const _close=closeDg;
 closeDg=function(){const had=DG&&DG.mz;MZ.pop=false;MZ.fight=false;MZ.room=null;MZ.on=false;_close.apply(this,arguments);if(had){try{const mi=$("mini");if(mi)mi.style.display="";if(mapC)mapC.style.display="none";const pr=$("prompt");if(pr)pr.style.display="none"}catch(e){}}};
 window.MZgen=genLayout;MZ.setNode=setNode;MZ.go=go;MZ.doorUse=doorUse;MZ.startFight=startFight;MZ.nearest=nearest;MZ.walk=walk;MZ.build=buildNode;MZ.popup=popup;
})();

/* ===== dungeon art: every room gets its own materials, occult floor sigils, murals, statues and mood ===== */
(function(){
 if(!window.MZ||typeof THREE==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE,anims=[];
 const rng=s=>{s=(s>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s>>>=0;s^=s<<5;s>>>=0;return s/4294967296}};
 const hash=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
 const cvs=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
 const hex=n=>"#"+("000000"+(n>>>0).toString(16)).slice(-6);
 const shade=(n,k)=>{const r=Math.min(255,Math.max(0,((n>>16)&255)*k)),g=Math.min(255,Math.max(0,((n>>8)&255)*k)),b=Math.min(255,Math.max(0,(n&255)*k));return"rgb("+(r|0)+","+(g|0)+","+(b|0)+")"};
 /* ---------- materials ---------- */
 const MM={};const M=(c,o)=>{o=o||{};const k=c+"|"+JSON.stringify(o);return MM[k]||(MM[k]=new T.MeshStandardMaterial(Object.assign({color:c,roughness:.85,metalness:0},o)))};
 const BM=(c,o)=>new T.MeshBasicMaterial(Object.assign({color:c,transparent:true,depthWrite:false},o||{}));
 const TC={};
 function surf(kind,c1,c2,seed){const key=kind+c1+c2+seed;if(TC[key])return TC[key];const S=256,c=cvs(S,S),g=c.getContext("2d"),R=rng(seed+hash(kind));
  g.fillStyle=hex(c1);g.fillRect(0,0,S,S);
  const speck=n=>{for(let i=0;i<n;i++){g.fillStyle="rgba("+(R()<.5?"255,255,255":"0,0,0")+","+(.03+R()*.06)+")";g.fillRect(R()*S,R()*S,1+R()*3,1+R()*3)}};
  if(kind==="ashlar"||kind==="sand"){let y=0;while(y<S){const hh=28+R()*26;let x=-R()*40;while(x<S){const ww=44+R()*70;g.fillStyle=shade(c1,.8+R()*.4);g.fillRect(x+1.5,y+1.5,ww-3,hh-3);x+=ww}
    g.fillStyle=hex(c2);g.fillRect(0,y,S,2.5);y+=hh}
   if(kind==="sand")for(let r=0;r<4;r++){const yy=20+r*62;for(let k=0;k<10;k++){const x=8+k*24+R()*6;g.strokeStyle=hex(c2);g.lineWidth=2;g.beginPath();g.moveTo(x,yy);g.lineTo(x,yy+14+R()*8);g.moveTo(x-5,yy+4+R()*6);g.lineTo(x+5,yy+4+R()*6);g.stroke()}}speck(250)}
  else if(kind==="brick"){for(let y=0;y<S;y+=16){for(let x=((y/16)%2)*18-18;x<S;x+=36){g.fillStyle=shade(c1,.75+R()*.5);g.fillRect(x+1,y+1,34,14)}}g.fillStyle=hex(c2);for(let y=0;y<S;y+=16)g.fillRect(0,y,S,1.5);speck(300)}
  else if(kind==="marble"){speck(80);for(let v=0;v<16;v++){g.strokeStyle="rgba("+((c2>>16)&255)+","+((c2>>8)&255)+","+(c2&255)+","+(.2+R()*.5)+")";g.lineWidth=.6+R()*2;g.beginPath();let x=R()*S,y=0;g.moveTo(x,y);while(y<S){y+=6+R()*10;x+=(R()-.5)*26;g.lineTo(x,y)}g.stroke()}
   for(let i=0;i<10;i++){const gr=g.createRadialGradient(R()*S,R()*S,0,R()*S,R()*S,40+R()*50);gr.addColorStop(0,"rgba(255,255,255,.08)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,S,S)}}
  else if(kind==="hex"){const r=24,h=r*Math.sqrt(3);for(let row=-1;row<S/h+1;row++)for(let col=-1;col<S/(r*1.5)+1;col++){const cx=col*r*1.5,cy=row*h+(col%2?h/2:0);g.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;g.lineTo(cx+Math.cos(a)*(r-2),cy+Math.sin(a)*(r-2))}g.closePath();g.fillStyle=shade(c1,.7+R()*.6);g.fill();g.strokeStyle=hex(c2);g.lineWidth=2;g.stroke()}speck(150)}
  else if(kind==="checker"){for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=(x+y)%2?hex(c2):shade(c1,.9+R()*.2);g.fillRect(x*64,y*64,64,64)}g.strokeStyle="rgba(0,0,0,.4)";g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,S);g.moveTo(0,i*64);g.lineTo(S,i*64);g.stroke()}speck(300)}
  else if(kind==="flag"){for(let i=0;i<14;i++){const x=R()*S,y=R()*S,w=40+R()*60,h=40+R()*60;g.fillStyle=shade(c1,.75+R()*.5);g.fillRect(x,y,w,h);g.fillRect(x-S,y,w,h);g.fillRect(x,y-S,w,h);g.strokeStyle=hex(c2);g.lineWidth=2.5;g.strokeRect(x,y,w,h)}speck(300)}
  else if(kind==="plaster"){speck(300);for(let i=0;i<14;i++){const x=R()*S,y=R()*S,gr=g.createRadialGradient(x,y,0,x,y,30+R()*50);gr.addColorStop(0,"rgba("+((c2>>16)&255)+","+((c2>>8)&255)+","+(c2&255)+",.35)");gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(0,0,S,S)}
   g.strokeStyle="rgba(0,0,0,.4)";g.lineWidth=1;for(let k=0;k<5;k++){let x=R()*S,y=R()*S;g.beginPath();g.moveTo(x,y);for(let j=0;j<8;j++){x+=(R()-.5)*30;y+=R()*20;g.lineTo(x,y)}g.stroke()}}
  else if(kind==="bone"){g.fillStyle=hex(c2);g.fillRect(0,0,S,S);for(let row=0;row<8;row++)for(let col=0;col<8;col++){const x=col*32+(row%2?16:0),y=row*32+16;g.fillStyle=shade(c1,.8+R()*.35);g.beginPath();g.ellipse(x,y-2,12,13,0,0,6.283);g.fill();g.fillRect(x-7,y+8,14,8);g.fillStyle="#0a0806";g.beginPath();g.ellipse(x-5,y-3,3.2,3.8,0,0,6.283);g.ellipse(x+5,y-3,3.2,3.8,0,0,6.283);g.fill();g.beginPath();g.moveTo(x,y+1);g.lineTo(x-2,y+6);g.lineTo(x+2,y+6);g.fill();g.fillRect(x-6,y+12,12,1.2)}}
  else if(kind==="obsidian"){for(let i=0;i<30;i++){g.strokeStyle="rgba(255,255,255,"+(.03+R()*.08)+")";g.lineWidth=1+R()*6;g.beginPath();const x=R()*S;g.moveTo(x,0);g.lineTo(x+(R()-.5)*120,S);g.stroke()}
   g.strokeStyle=hex(c2);g.lineWidth=1.2;for(let k=0;k<6;k++){let x=R()*S,y=R()*S;g.beginPath();g.moveTo(x,y);for(let j=0;j<7;j++){x+=(R()-.5)*50;y+=(R()-.5)*50;g.lineTo(x,y)}g.stroke()}}
  else if(kind==="copper"){for(let y=0;y<S;y+=64)for(let x=0;x<S;x+=64){g.fillStyle=shade(c1,.8+R()*.4);g.fillRect(x+2,y+2,60,60);g.fillStyle="rgba(0,0,0,.5)";[[6,6],[56,6],[6,56],[56,56]].forEach(([a,b])=>{g.beginPath();g.arc(x+a,y+b,2.4,0,6.283);g.fill()})}
   for(let i=0;i<26;i++){const x=R()*S,y=R()*S,gr=g.createRadialGradient(x,y,0,x,y,10+R()*28);gr.addColorStop(0,"rgba("+((c2>>16)&255)+","+((c2>>8)&255)+","+(c2&255)+",.7)");gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(0,0,S,S)}}
  else if(kind==="ice"){for(let i=0;i<22;i++){g.beginPath();const x=R()*S,y=R()*S;g.moveTo(x,y);for(let k=0;k<4;k++)g.lineTo(x+(R()-.5)*110,y+(R()-.5)*110);g.closePath();g.fillStyle=shade(c1,.8+R()*.4);g.globalAlpha=.55;g.fill();g.globalAlpha=1;g.strokeStyle=hex(c2);g.lineWidth=1;g.stroke()}}
  else if(kind==="organic"){speck(100);g.lineCap="round";for(let k=0;k<16;k++){let x=R()*S,y=R()*S,a=R()*6.283,w=4+R()*4;for(let j=0;j<20;j++){g.strokeStyle="rgba("+((c2>>16)&255)+","+((c2>>8)&255)+","+(c2&255)+",.5)";g.lineWidth=w;g.beginPath();g.moveTo(x,y);x+=Math.cos(a)*10;y+=Math.sin(a)*10;a+=(R()-.5)*.8;g.lineTo(x,y);g.stroke();w*=.93;if(R()<.07){let x2=x,y2=y,a2=a+1;for(let q=0;q<6;q++){g.lineWidth=w*.6;g.beginPath();g.moveTo(x2,y2);x2+=Math.cos(a2)*9;y2+=Math.sin(a2)*9;a2+=(R()-.5);g.lineTo(x2,y2);g.stroke()}}}}}
  else if(kind==="moss"){speck(250);for(let i=0;i<40;i++){const x=R()*S,y=R()*S,gr=g.createRadialGradient(x,y,0,x,y,12+R()*26);gr.addColorStop(0,"rgba("+((c2>>16)&255)+","+((c2>>8)&255)+","+(c2&255)+",.6)");gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(0,0,S,S)}
   g.strokeStyle="rgba(0,0,0,.35)";g.lineWidth=2;for(let y=0;y<S;y+=48){g.beginPath();g.moveTo(0,y);g.lineTo(S,y);g.stroke()}}
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;return TC[key]=t}
 /* ---------- occult sigils painted on a transparent canvas ---------- */
 function runes(g,cx,cy,r,n,col,sz,R){g.strokeStyle=col;g.lineWidth=2;for(let i=0;i<n;i++){const a=i/n*6.283,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;g.save();g.translate(x,y);g.rotate(a+Math.PI/2);g.beginPath();g.moveTo(0,-sz);g.lineTo(0,sz);const k=1+Math.floor(R()*3);for(let j=0;j<k;j++){const yy=-sz+R()*sz*2,dir=R()<.5?-1:1;g.moveTo(0,yy);g.lineTo(dir*sz*.6,yy+(R()-.3)*sz*.8)}g.stroke();g.restore()}}
 function poly(g,cx,cy,r,n,skip,rot){g.beginPath();for(let i=0;i<=n;i++){const a=rot+((i*skip)%n)/n*6.283,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}
 function circ(g,cx,cy,r,w){g.lineWidth=w||3;g.beginPath();g.arc(cx,cy,r,0,6.283);g.stroke()}
 const SIGIL={
  pentagram(g,R,col){const c=256;circ(g,c,c,238,5);circ(g,c,c,206,2);circ(g,c,c,150,2);g.lineWidth=5;poly(g,c,c,206,5,2,-Math.PI/2);runes(g,c,c,178,36,col,12,R);for(let i=0;i<5;i++){const a=-Math.PI/2+i/5*6.283;circ(g,c+Math.cos(a)*206,c+Math.sin(a)*206,16,3)}},
  invpent(g,R,col){const c=256;circ(g,c,c,238,5);circ(g,c,c,214,2);g.lineWidth=5;poly(g,c,c,214,5,2,Math.PI/2);runes(g,c,c,226,44,col,8,R);g.lineWidth=3;g.beginPath();g.arc(c,c+70,34,0,6.283);g.stroke();for(let k=0;k<2;k++){g.beginPath();g.moveTo(c-60-k*14,c-90);g.lineTo(c-30,c-150);g.stroke();g.beginPath();g.moveTo(c+60+k*14,c-90);g.lineTo(c+30,c-150);g.stroke()}},
  hexagram(g,R,col){const c=256;circ(g,c,c,240,4);circ(g,c,c,222,2);g.lineWidth=5;poly(g,c,c,200,3,1,-Math.PI/2);poly(g,c,c,200,3,1,Math.PI/2);circ(g,c,c,110,3);circ(g,c,c,40,3);runes(g,c,c,232,60,col,6,R)},
  eye(g,R,col){const c=256;circ(g,c,c,240,4);g.lineWidth=6;poly(g,c,c,200,3,1,-Math.PI/2);g.lineWidth=3;g.beginPath();g.moveTo(c-110,c+30);g.quadraticCurveTo(c,c-100,c+110,c+30);g.quadraticCurveTo(c,c+120,c-110,c+30);g.stroke();circ(g,c,c+22,34,5);g.fillStyle=col;g.beginPath();g.arc(c,c+22,14,0,6.283);g.fill();for(let i=0;i<24;i++){const a=i/24*6.283;g.beginPath();g.moveTo(c+Math.cos(a)*216,c+Math.sin(a)*216);g.lineTo(c+Math.cos(a)*236,c+Math.sin(a)*236);g.stroke()}},
  tree(g,R,col){const c=256,P=[[256,40],[160,110],[352,110],[160,210],[352,210],[256,260],[160,350],[352,350],[256,410],[256,480]];circ(g,c,c,250,3);g.lineWidth=3;[[0,1],[0,2],[1,2],[1,3],[2,4],[3,4],[1,5],[2,5],[3,5],[4,5],[3,6],[4,7],[5,6],[5,7],[6,7],[6,8],[7,8],[5,8],[8,9]].forEach(([a,b])=>{g.beginPath();g.moveTo(P[a][0],P[a][1]);g.lineTo(P[b][0],P[b][1]);g.stroke()});P.forEach(([x,y])=>{g.fillStyle="rgba(0,0,0,.5)";g.beginPath();g.arc(x,y,22,0,6.283);g.fill();circ(g,x,y,22,4)})},
  metatron(g,R,col){const c=256,r=62,pts=[[0,0]];for(let i=0;i<6;i++){const a=i/6*6.283;pts.push([Math.cos(a)*r,Math.sin(a)*r]);pts.push([Math.cos(a)*r*2,Math.sin(a)*r*2])}circ(g,c,c,244,4);pts.forEach(([x,y])=>circ(g,c+x,c+y,r*.5,2));g.lineWidth=2;for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){g.beginPath();g.moveTo(c+pts[i][0],c+pts[i][1]);g.lineTo(c+pts[j][0],c+pts[j][1]);g.stroke()}},
  septagram(g,R,col){const c=256;circ(g,c,c,242,5);circ(g,c,c,196,2);g.lineWidth=4;poly(g,c,c,190,7,3,-Math.PI/2);poly(g,c,c,150,7,2,-Math.PI/2);for(let i=0;i<7;i++){const a=-Math.PI/2+i/7*6.283,x=c+Math.cos(a)*220,y=c+Math.sin(a)*220;circ(g,x,y,18,3);g.beginPath();g.moveTo(x-8,y);g.lineTo(x+8,y);g.moveTo(x,y-8);g.lineTo(x,y+8);g.stroke()}},
  ouroboros(g,R,col){const c=256;g.lineCap="round";g.lineWidth=34;g.beginPath();g.arc(c,c,190,.5,6.283);g.stroke();g.fillStyle=col;g.beginPath();g.moveTo(c+190*Math.cos(.5)+8,c+190*Math.sin(.5)-20);g.lineTo(c+190*Math.cos(.5)+60,c+190*Math.sin(.5));g.lineTo(c+190*Math.cos(.5)+8,c+190*Math.sin(.5)+20);g.fill();g.lineWidth=2;for(let i=0;i<60;i++){const a=.8+i/60*5.4;g.beginPath();g.moveTo(c+Math.cos(a)*176,c+Math.sin(a)*176);g.lineTo(c+Math.cos(a)*204,c+Math.sin(a)*204);g.stroke()}circ(g,c,c,140,3);g.lineWidth=5;g.beginPath();g.arc(c-20,c,70,.9,5.4);g.stroke();g.beginPath();g.arc(c+20,c,70,4.0,2.2,true);g.stroke()},
  chaos(g,R,col){const c=256;circ(g,c,c,240,3);g.lineWidth=7;for(let i=0;i<8;i++){const a=i/8*6.283;g.beginPath();g.moveTo(c,c);g.lineTo(c+Math.cos(a)*200,c+Math.sin(a)*200);g.stroke();const x=c+Math.cos(a)*200,y=c+Math.sin(a)*200;g.beginPath();g.moveTo(x+Math.cos(a-2.5)*30,y+Math.sin(a-2.5)*30);g.lineTo(x,y);g.lineTo(x+Math.cos(a+2.5)*30,y+Math.sin(a+2.5)*30);g.stroke()}circ(g,c,c,28,6)},
  moons(g,R,col){const c=256;circ(g,c,c,242,4);circ(g,c,c,220,2);for(let i=0;i<3;i++){const a=-Math.PI/2+i/3*6.283;circ(g,c+Math.cos(a)*86,c+Math.sin(a)*86,86,4)}g.lineWidth=7;g.beginPath();g.arc(c-110,c,46,-1.3,1.3);g.stroke();g.beginPath();g.arc(c+110,c,46,Math.PI-1.3,Math.PI+1.3);g.stroke();circ(g,c,c,40,5);runes(g,c,c,231,48,col,7,R)},
  labyrinth(g,R,col){const c=256;g.lineWidth=7;for(let r=30;r<240;r+=26){g.beginPath();const gap=R()*6.283;g.arc(c,c,r,gap+.5,gap+6.283);g.stroke()}g.lineWidth=5;for(let k=0;k<4;k++){const a=k*1.5708;g.beginPath();g.moveTo(c+Math.cos(a)*30,c+Math.sin(a)*30);g.lineTo(c+Math.cos(a)*240,c+Math.sin(a)*240);g.stroke()}},
  yantra(g,R,col){const c=256;circ(g,c,c,246,4);circ(g,c,c,206,3);for(let i=0;i<16;i++){const a=i/16*6.283;g.beginPath();g.ellipse(c+Math.cos(a)*186,c+Math.sin(a)*186,22,9,a,0,6.283);g.stroke()}g.lineWidth=4;for(let k=0;k<4;k++){poly(g,c,c,160-k*28,3,1,-Math.PI/2+(k%2?Math.PI:0))}circ(g,c,c,16,4)},
  triquetra(g,R,col){const c=256;circ(g,c,c,240,4);g.lineWidth=8;for(let i=0;i<3;i++){const a=-Math.PI/2+i/3*6.283;g.beginPath();g.arc(c+Math.cos(a)*90,c+Math.sin(a)*90,120,a+Math.PI-1.05,a+Math.PI+1.05);g.stroke()}circ(g,c,c,60,3);runes(g,c,c,222,40,col,8,R)}
 };
 const SIGK=Object.keys(SIGIL);
 const SC={};
 function sigilTex(kind,col,seed){const key=kind+col+seed;if(SC[key])return SC[key];const c=cvs(512,512),g=c.getContext("2d"),R=rng(seed+hash(kind));g.strokeStyle=col;g.fillStyle=col;g.lineCap="round";g.lineJoin="round";SIGIL[kind](g,R,col);return SC[key]=new T.CanvasTexture(c)}
 /* ---------- murals ---------- */
 const MUR=["eye","moon","serpent","sun","hand","skull","figure","tree","chalice","star","horns","wheel"];
 const MC={};
 function muralTex(kind,gold,bg,seed){const key=kind+gold+bg+seed;if(MC[key])return MC[key];const W=256,H=384,c=cvs(W,H),g=c.getContext("2d"),R=rng(seed+hash(kind));
  g.fillStyle=hex(bg);g.fillRect(0,0,W,H);for(let i=0;i<300;i++){g.fillStyle="rgba(0,0,0,"+R()*.12+")";g.fillRect(R()*W,R()*H,2+R()*10,2+R()*6)}
  const G=hex(gold);g.strokeStyle=G;g.fillStyle=G;g.lineWidth=5;g.lineCap="round";g.strokeRect(10,10,W-20,H-20);g.lineWidth=2;g.strokeRect(20,20,W-40,H-40);
  const cx=W/2,cy=H/2;g.lineWidth=5;
  if(kind==="eye"){g.beginPath();g.moveTo(40,cy);g.quadraticCurveTo(cx,cy-110,W-40,cy);g.quadraticCurveTo(cx,cy+110,40,cy);g.stroke();g.beginPath();g.arc(cx,cy,34,0,6.283);g.stroke();g.beginPath();g.arc(cx,cy,12,0,6.283);g.fill();for(let i=0;i<14;i++){const a=-Math.PI+i/13*Math.PI;g.beginPath();g.moveTo(cx+Math.cos(a)*110,cy-70+Math.sin(a)*40);g.lineTo(cx+Math.cos(a)*140,cy-90+Math.sin(a)*60);g.stroke()}}
  else if(kind==="moon"){for(let i=0;i<5;i++){const y=70+i*60,ph=i/4;g.beginPath();g.arc(cx,y,22,0,6.283);g.stroke();g.beginPath();g.arc(cx,y,22,-Math.PI/2,Math.PI/2);g.ellipse(cx,y,Math.abs(22*(1-2*ph))+.01,22,0,Math.PI/2,-Math.PI/2,ph>.5);g.fill()}}
  else if(kind==="serpent"){g.lineWidth=18;g.beginPath();g.moveTo(cx,60);for(let i=0;i<6;i++){g.bezierCurveTo(cx+(i%2?-90:90),90+i*45,cx+(i%2?-90:90),120+i*45,cx,135+i*45)}g.stroke();g.beginPath();g.arc(cx,52,18,0,6.283);g.fill();g.lineWidth=3;g.strokeStyle=hex(bg);g.beginPath();g.moveTo(cx-6,48);g.lineTo(cx-6,56);g.moveTo(cx+6,48);g.lineTo(cx+6,56);g.stroke()}
  else if(kind==="sun"){g.beginPath();g.arc(cx,cy,56,0,6.283);g.stroke();for(let i=0;i<20;i++){const a=i/20*6.283;g.beginPath();g.moveTo(cx+Math.cos(a)*70,cy+Math.sin(a)*70);g.lineTo(cx+Math.cos(a)*(i%2?100:120),cy+Math.sin(a)*(i%2?100:120));g.stroke()}g.beginPath();g.arc(cx-18,cy-8,5,0,6.283);g.arc(cx+18,cy-8,5,0,6.283);g.fill();g.beginPath();g.arc(cx,cy+14,22,.2,Math.PI-.2);g.stroke()}
  else if(kind==="hand"){g.lineWidth=9;[[-60,-20,-.25],[-30,-60,-.1],[0,-70,0],[30,-60,.1],[62,-14,.7]].forEach(([x,y,r],i)=>{g.beginPath();g.moveTo(cx+x*.5,cy+50);g.lineTo(cx+x,cy+y);g.stroke()});g.lineWidth=4;g.beginPath();g.roundRect?g.roundRect(cx-44,cy+40,88,70,14):g.rect(cx-44,cy+40,88,70);g.stroke();g.beginPath();g.arc(cx,cy+75,16,0,6.283);g.stroke();g.beginPath();g.arc(cx,cy+75,5,0,6.283);g.fill()}
  else if(kind==="skull"){g.beginPath();g.ellipse(cx,cy-20,56,64,0,0,6.283);g.stroke();g.fillRect(cx-30,cy+40,60,34);g.fillStyle=hex(bg);g.beginPath();g.ellipse(cx-22,cy-26,14,17,0,0,6.283);g.ellipse(cx+22,cy-26,14,17,0,0,6.283);g.fill();g.beginPath();g.moveTo(cx,cy);g.lineTo(cx-9,cy+18);g.lineTo(cx+9,cy+18);g.fill();g.strokeStyle=hex(bg);g.lineWidth=3;for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(cx+i*12,cy+44);g.lineTo(cx+i*12,cy+72);g.stroke()}g.strokeStyle=G;g.lineWidth=5;[-1,1].forEach(s=>{g.beginPath();g.moveTo(cx+s*60,cy-40);g.quadraticCurveTo(cx+s*130,cy-100,cx+s*118,cy+20);g.stroke()})}
  else if(kind==="figure"){g.beginPath();g.arc(cx,cy-70,20,0,6.283);g.fill();g.beginPath();g.moveTo(cx-18,cy-48);g.lineTo(cx-58,cy+110);g.lineTo(cx+58,cy+110);g.lineTo(cx+18,cy-48);g.closePath();g.stroke();g.beginPath();g.moveTo(cx-18,cy-30);g.lineTo(cx-90,cy-70);g.moveTo(cx+18,cy-30);g.lineTo(cx+90,cy-70);g.stroke();g.beginPath();g.arc(cx,cy-130,40,3.6,5.8);g.stroke()}
  else if(kind==="tree"){g.lineWidth=10;g.beginPath();g.moveTo(cx,H-50);g.lineTo(cx,cy);g.stroke();g.lineWidth=5;for(let i=0;i<7;i++){const y=cy+10-i*20,l=40+i*6;g.beginPath();g.moveTo(cx,y+40);g.quadraticCurveTo(cx-l/2,y,cx-l,y-18);g.moveTo(cx,y+40);g.quadraticCurveTo(cx+l/2,y,cx+l,y-18);g.stroke()}for(let i=0;i<5;i++){g.beginPath();g.moveTo(cx+(i-2)*14,H-50);g.lineTo(cx+(i-2)*34,H-30);g.stroke()}}
  else if(kind==="chalice"){g.beginPath();g.moveTo(cx-60,cy-60);g.quadraticCurveTo(cx-60,cy+20,cx,cy+30);g.quadraticCurveTo(cx+60,cy+20,cx+60,cy-60);g.closePath();g.stroke();g.beginPath();g.moveTo(cx,cy+30);g.lineTo(cx,cy+100);g.moveTo(cx-40,cy+110);g.lineTo(cx+40,cy+110);g.stroke();g.beginPath();g.moveTo(cx-40,cy-30);g.lineTo(cx+40,cy-30);g.stroke();g.beginPath();g.arc(cx,cy-110,18,0,6.283);g.stroke()}
  else if(kind==="star"){poly(g,cx,cy,100,5,2,-Math.PI/2);circ(g,cx,cy,108,4);for(let i=0;i<30;i++){g.fillRect(R()*(W-60)+30,R()*(H-60)+30,3,3)}}
  else if(kind==="horns"){g.beginPath();g.arc(cx,cy+30,50,0,6.283);g.stroke();[-1,1].forEach(s=>{g.beginPath();g.moveTo(cx+s*30,cy-12);g.quadraticCurveTo(cx+s*100,cy-40,cx+s*80,cy-110);g.stroke()});g.beginPath();g.arc(cx-18,cy+22,6,0,6.283);g.arc(cx+18,cy+22,6,0,6.283);g.fill();g.beginPath();g.moveTo(cx-14,cy+60);g.lineTo(cx,cy+100);g.lineTo(cx+14,cy+60);g.stroke()}
  else{circ(g,cx,cy,100,5);circ(g,cx,cy,70,3);for(let i=0;i<12;i++){const a=i/12*6.283;g.beginPath();g.moveTo(cx+Math.cos(a)*70,cy+Math.sin(a)*70);g.lineTo(cx+Math.cos(a)*100,cy+Math.sin(a)*100);g.stroke();g.beginPath();g.arc(cx+Math.cos(a)*116,cy+Math.sin(a)*116,6,0,6.283);g.fill()}g.beginPath();g.moveTo(cx,cy-60);g.lineTo(cx,cy+60);g.moveTo(cx-60,cy);g.lineTo(cx+60,cy);g.stroke()}
  return MC[key]=new T.CanvasTexture(c)}
 window.DGART_T={surf,sigilTex,muralTex,SIGK,MUR};
 /* ---------- shape helpers ---------- */
 const add=(p,geo,mat,x,y,z,rx,ry,rz,sx,sy,sz)=>{const m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.rotation.set(rx||0,ry||0,rz||0);if(sx!=null)m.scale.set(sx,sy==null?sx:sy,sz==null?sx:sz);p.add(m);return m};
 const box=(p,w,h,d,mat,x,y,z,rx,ry,rz)=>add(p,new T.BoxGeometry(w,h,d),mat,x,y,z,rx,ry,rz);
 const cyl=(p,r1,r2,h,mat,x,y,z,seg,rx,ry,rz)=>add(p,new T.CylinderGeometry(r1,r2,h,seg||10),mat,x,y,z,rx,ry,rz);
 const sph=(p,r,mat,x,y,z,sx,sy,sz)=>add(p,new T.SphereGeometry(r,12,9),mat,x,y,z,0,0,0,sx==null?1:sx,sy==null?1:sy,sz==null?1:sz);
 const cone=(p,r,h,mat,x,y,z,seg,rx,ry,rz)=>add(p,new T.ConeGeometry(r,h,seg||6),mat,x,y,z,rx,ry,rz);
 const tor=(p,R,r,mat,x,y,z,rx,ry,rz)=>add(p,new T.TorusGeometry(R,r,8,24),mat,x,y,z,rx,ry,rz);
 const glowM=(c,i)=>new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:i||1.4,roughness:.4});
 const FLM={};const flameM=c=>FLM[c]||(FLM[c]=new T.MeshBasicMaterial({color:c}));
 const flames=[];
 function candle(p,x,z,h,col){const g=new T.Group();g.position.set(x,0,z);cyl(g,.04,.045,h||.25,M(0xe8dcc0,{roughness:.6}),0,(h||.25)/2,0,6);const f=cone(g,.03,.09,flameM(col||0xffc060),0,(h||.25)+.05,0,5);flames.push(f);p.add(g);return g}
 function candleRing(p,cx,cz,r,n,col,h){for(let i=0;i<n;i++){const a=i/n*6.283;candle(p,cx+Math.cos(a)*r,cz+Math.sin(a)*r,h||.2+((i*7)%5)*.05,col)}}
 /* ---------- statues ---------- */
 const STONE=c=>M(c,{roughness:.9});
 const ST={
  hooded(c,col){const m=STONE(col),g=new T.Group();cone(g,.55,1.9,m,0,.95,0,10);sph(g,.2,m,0,2,0,1,1.1,1);cone(g,.26,.4,m,0,2.1,.02,8);box(g,.14,.5,.14,m,-.4,1.3,.35,-.9,0,.1);box(g,.14,.5,.14,m,.4,1.3,.35,-.9,0,-.1);const e=sph(g,.04,glowM(c.glow||0xff4020,1.6),0,2.0,.18);return g},
  angel(c,col){const m=STONE(col),g=new T.Group();cone(g,.5,1.7,m,0,.85,0,10);sph(g,.2,m,0,1.9,0,1,1.1,1);box(g,.5,.18,.5,m,0,1.82,.18,.9,0,0);box(g,.14,.5,.14,m,-.25,1.3,.3,-1.1,0,.2);box(g,.14,.5,.14,m,.25,1.3,.3,-1.1,0,-.2);
   [-1,1].forEach(s=>{for(let i=0;i<6;i++){const f=box(g,.14,1.3-i*.12,.04,m,s*(.5+i*.2),1.4+i*.1,-.2,0,0,-s*(.35+i*.1));f.rotation.y=s*.25}});return g},
  idol(c,col){const m=STONE(col),g=new T.Group();box(g,1.2,.5,1.2,m,0,.25,0);box(g,.9,.9,.7,m,0,.95,0);box(g,.6,.7,.6,m,0,1.75,0);sph(g,.34,m,0,2.3,0,1,1.1,1);
   [-1,1].forEach(s=>{cone(g,.09,.6,STONE(0xe8e0c8),s*.26,2.7,0,5,0,0,-s*.5);cone(g,.14,.5,m,s*.38,2.35,0,4,0,0,s*1.5)});add(g,new T.ConeGeometry(.12,.3,5),m,0,2.15,.36,Math.PI/2);const gl=glowM(c.glow||0xff3010,1.8);sph(g,.05,gl,-.14,2.38,.3);sph(g,.05,gl,.14,2.38,.3);
   for(let i=0;i<6;i++){const a=i/6*Math.PI-Math.PI/2;box(g,.12,.9,.12,m,Math.sin(a)*.8,1.2+Math.cos(a)*.5,.1,0,0,Math.sin(a)*1.2)}return g},
  gargoyle(c,col){const m=STONE(col),g=new T.Group();box(g,.8,.7,.8,m,0,.35,0);sph(g,.4,m,0,1.0,0,1,.8,1.2);sph(g,.22,m,0,1.35,.5);cone(g,.08,.25,m,-.12,1.62,.5,4);cone(g,.08,.25,m,.12,1.62,.5,4);[-1,1].forEach(s=>{const w=box(g,.9,.04,.6,m,s*.7,1.3,-.15,0,s*.3,-s*.5);cone(g,.1,.4,m,s*.3,.75,.5,4,Math.PI/2)});sph(g,.04,glowM(0xff2010,1.8),-.08,1.4,.7);sph(g,.04,glowM(0xff2010,1.8),.08,1.4,.7);return g},
  knight(c,col){const m=STONE(col),g=new T.Group();box(g,.5,.8,.35,m,0,1.2,0);box(g,.2,.9,.2,m,-.13,.45,0);box(g,.2,.9,.2,m,.13,.45,0);box(g,.3,.3,.3,m,0,1.8,0);cone(g,.15,.3,m,0,2.05,0,4);box(g,.18,.55,.18,m,-.4,1.3,0,0,0,.2);box(g,.18,.55,.18,m,.4,1.3,.1,-.4,0,-.2);box(g,.06,1.6,.02,M(0x9aa0aa,{metalness:.7,roughness:.4}),.45,.9,.35);box(g,.3,.06,.06,m,.45,1.3,.35);box(g,.05,.7,.4,M(0x2a2a30,{metalness:.5}),-.45,1.2,.15);return g},
  sphinx(c,col){const m=STONE(col),g=new T.Group();box(g,1.2,.9,2,m,0,.45,0);box(g,.6,.8,.6,m,0,1.2,.9);sph(g,.3,m,0,1.8,1.0,1,1.1,1);box(g,.9,.3,.3,m,0,1.9,.9);box(g,.3,.2,1.1,m,-.35,.1,1.5);box(g,.3,.2,1.1,m,.35,.1,1.5);[-1,1].forEach(s=>box(g,.06,.8,.7,m,s*.62,1.1,-.1,0,0,-s*.2));return g},
  armed(c,col){const m=STONE(col),g=new T.Group();cone(g,.6,1.2,m,0,.6,0,10);box(g,.6,.9,.4,m,0,1.6,0);sph(g,.24,m,0,2.3,0,1,1.1,1);sph(g,.03,glowM(c.glow||0xffc040,2),0,2.35,.22);
   for(let i=0;i<8;i++){const s=i%2?1:-1,k=Math.floor(i/2),a=-.6+k*.5;box(g,.1,.8,.1,m,s*.55,1.7+k*.12-.3,.05,0,0,s*(1.0+k*.3-.5)*(1-.3*(k>1)))}return g},
  kneel(c,col){const m=STONE(col),g=new T.Group();cone(g,.45,1.1,m,0,.55,0,9);sph(g,.2,m,0,1.25,.35,1,1,1);box(g,.3,.5,.3,m,-.2,.7,.55,-1,0,0);box(g,.3,.5,.3,m,.2,.7,.55,-1,0,0);cone(g,.35,.5,m,0,1.35,.2,8,.6);return g},
  obelisk(c,col){const m=STONE(col),g=new T.Group();box(g,1,.4,1,m,0,.2,0);add(g,new T.CylinderGeometry(.2,.4,3.2,4),m,0,2,0,0,Math.PI/4);cone(g,.2,.4,M(0xe0b84a,{metalness:.7,emissive:0x604010,emissiveIntensity:.5}),0,3.8,0,4,0,Math.PI/4);const e=sph(g,.1,glowM(c.glow||0xff8020,2),0,2.8,.28,1,.6,.4);g.userData.pulse=e;return g},
  totem(c,col){const m=STONE(col),g=new T.Group();for(let i=0;i<5;i++){const y=.4+i*.55;sph(g,.36,m,0,y,0,1,.85,1);const gl=glowM(c.glow||0xffa030,1.4);sph(g,.05,gl,-.13,y+.06,.3);sph(g,.05,gl,.13,y+.06,.3);box(g,.2,.05,.04,M(0x050403),0,y-.14,.33)}return g},
  skullpile(c,col){const g=new T.Group(),b=M(0xe0d8c0,{roughness:.6});for(let i=0;i<40;i++){const a=i*2.4,r=(i%9)*.14,y=.12+Math.floor(i/9)*.22;sph(g,.13,b,Math.cos(a)*r,y,Math.sin(a)*r,1,1.05,1.1)}return g},
  weeper(c,col){const m=STONE(col),g=new T.Group();cone(g,.5,1.8,m,0,.9,0,10);sph(g,.19,m,0,1.9,.05,1,1.1,1);box(g,.5,.5,.1,m,0,1.9,.22,-.2,0,0);[-1,1].forEach(s=>box(g,.12,.5,.12,m,s*.15,1.8,.25,-1.4,0,s*.25));return g}
 };
 /* ---------- themed palettes ---------- */
 const TH={
  crypt:{wall:[["ashlar",0x6a7268,0x2a2e2a],["bone",0xd0c8b0,0x2a241c],["plaster",0x8a8a7e,0x3a3a30],["marble",0x70747a,0x20242a]],floor:[["flag",0x585c58,0x20221f],["checker",0x6a6e68,0x1c1e1c],["hex",0x5a5e5a,0x1a1c1a]],ceil:0x1a1c1a,acc:[0xff5a30,0xb080ff,0xe0e8ff,0x60ff90],st:[0x7a7e78,0x8a8a80]},
  cave:{wall:[["ice",0x8ab8d8,0x2a4a6a],["obsidian",0x1c2030,0x4a6aa0],["ice",0x6aa0c8,0x1a3a5a]],floor:[["ice",0x7aa8c8,0x2a4a6a],["obsidian",0x242a3a,0x5a8ad0]],ceil:0x0e1420,acc:[0x70c0ff,0xa090ff,0xb0ffe8],st:[0x9ac0d8,0x6a88a8]},
  mine:{wall:[["brick",0x6a4a30,0x2a1a10],["copper",0x8a5a2a,0x3a8a6a],["ashlar",0x5a4a3a,0x1a1208]],floor:[["flag",0x4a3a2a,0x1a1208],["copper",0x6a4a28,0x2a7a5a],["hex",0x5a4a3a,0x1a1208]],ceil:0x1a120a,acc:[0xffa040,0xff6a20,0xffd070],st:[0x8a7a62,0x6a5a48]},
  sunk:{wall:[["moss",0x3a5a48,0x2a6a3a],["ashlar",0x4a6a5a,0x1a3a2a],["copper",0x4a6a58,0x5acaa0]],floor:[["moss",0x2a4a3a,0x1a5a3a],["flag",0x3a5a4a,0x142a20]],ceil:0x10201a,acc:[0x40ffc0,0x60e0ff,0x90ff70],st:[0x5a7a6a,0x6a8a78]},
  tomb:{wall:[["sand",0xb89868,0x5a3a18],["marble",0xc8b080,0x6a4a20],["ashlar",0xa88858,0x4a3218]],floor:[["checker",0xb89868,0x3a2a14],["flag",0xa08050,0x3a2a14],["hex",0xb89868,0x4a3a1a]],ceil:0x2a2010,acc:[0xffc040,0x40d0c0,0xff6a40],st:[0xc0a070,0xa88858]},
  lair:{wall:[["organic",0x6a3a30,0xb85a4a],["bone",0xc8b898,0x3a2a1c],["ashlar",0x5a4a3a,0x1a1208]],floor:[["organic",0x4a2a22,0x9a4a3a],["flag",0x4a3c30,0x1a1208]],ceil:0x1a0e0a,acc:[0xff4a20,0xffa040,0xc0ff60],st:[0x7a6a58,0x8a7a62]}};
 /* ---------- placement helpers ---------- */
 function ctxOf(r,node){const R=rng(node.seed||(node.id*7919+13)),g=r.g,w=r.w,d=r.d,h=r.h;
  const pid=DG.p.id,theme=TH[pid]||TH.crypt;
  const nearDoor=(x,z,rad)=>r.doors.some(dr=>Math.hypot(dr.x-x,dr.z-z)<(rad||2.4));
  const free=(x,z,rad)=>!nearDoor(x,z,2.8)&&!r.obs.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+(rad||.8));
  const wallPos=(side,u,inset)=>{inset=inset==null?1:inset;return side==="N"?[u,-d/2+inset,0]:side==="S"?[u,d/2-inset,Math.PI]:side==="W"?[-w/2+inset,u,Math.PI/2]:[w/2-inset,u,-Math.PI/2]};
  const slots=(side,n,margin)=>{const L=(side==="N"||side==="S")?w:d,out=[];for(let i=0;i<n;i++){const u=-L/2+margin+(L-2*margin)*(i+.5)/n;const p=wallPos(side,u,1);out.push({u,side,x:side==="N"||side==="S"?u:p[0],z:side==="N"||side==="S"?p[1]:u,ry:p[2]})}
   return out.filter(s=>!nearDoor(s.x,s.z,2.5)&&!r.g.userData.lights.some(l=>Math.hypot(l.position.x-s.x,l.position.z-s.z)<1.0))};
  const put=(obj,x,z,ry,rad)=>{obj.position.set(x,0,z);obj.rotation.y=ry||0;g.add(obj);if(rad)r.obs.push({x,z,r:rad});return obj};
  return{r,g,w,d,h,R,pid,theme,node,nearDoor,free,wallPos,slots,put,pick:a=>a[Math.floor(R()*a.length)],doors:r.doors}}
 function mural(c,side,u,y,kind,col,bg,sc){const[x,z,ry]=c.wallPos(side,u,.06),W=1.6*(sc||1),H=2.4*(sc||1),g=new T.Group();g.position.set(side==="N"||side==="S"?u:x,y,side==="N"||side==="S"?z:u);g.rotation.y=ry;
  const t=muralTex(kind,col,bg,c.node.id),m=new T.Mesh(new T.PlaneGeometry(W,H),new T.MeshStandardMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.35,roughness:.8}));g.add(m);
  box(g,W+.16,.1,.1,M(0x3a2a18),0,H/2+.05,.03);box(g,W+.16,.1,.1,M(0x3a2a18),0,-H/2-.05,.03);box(g,.1,H,.1,M(0x3a2a18),-W/2-.03,0,.03);box(g,.1,H,.1,M(0x3a2a18),W/2+.03,0,.03);c.g.add(g);return g}
 function banner(c,side,u,col,kind,seed){const[x,z,ry]=c.wallPos(side,u,.15),g=new T.Group(),H=c.h-1.2,t=muralTex(kind,0xe0b84a,col,seed||c.node.id);g.position.set(side==="N"||side==="S"?u:x,c.h-.5-H/2,side==="N"||side==="S"?z:u);g.rotation.y=ry;
  const m=new T.Mesh(new T.PlaneGeometry(1.1,H),new T.MeshStandardMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.25,roughness:.9,side:2}));g.add(m);box(g,1.3,.08,.08,M(0x2a1a0a),0,H/2,.03);c.g.add(g);anims.push(t2=>{m.rotation.x=Math.sin(t2*.8+u)*.015})}
 function floorSigil(c,kind,col,size,x,z,rot,pulse,op){const t=sigilTex(kind,hex(col),c.node.id),m=new T.Mesh(new T.PlaneGeometry(size,size).rotateX(-Math.PI/2),BM(0xffffff,{map:t,color:col,opacity:op||.8,blending:T.AdditiveBlending}));m.position.set(x||0,.035,z||0);m.rotation.y=rot||0;m.renderOrder=3;c.g.add(m);
  if(pulse)anims.push(t2=>{m.material.opacity=(op||.8)*(.7+.3*Math.sin(t2*1.4+size))});return m}
 function ceilSigil(c,kind,col,size){const t=sigilTex(kind,hex(col),c.node.id+3),m=new T.Mesh(new T.PlaneGeometry(size,size).rotateX(Math.PI/2),BM(0xffffff,{map:t,color:col,opacity:.5,blending:T.AdditiveBlending}));m.position.set(0,c.h-.04,0);c.g.add(m);anims.push(t2=>{m.material.opacity=.4+.2*Math.sin(t2*.9)})}
 function dim(c,col,k){const L=c.g.userData.lights;L.forEach(l=>{l.color.setHex(col);if(k)l.intensity=l.userData.base=l.userData.base*k});c.g.children.forEach(o=>{if(o.isAmbientLight){o.color.setHex(col);o.intensity=1.1}})}
 function fogC(c,col){c.g.userData.fog=new T.Color(col).multiplyScalar(.1)}
 const sconce=(c,x,z,ry,col)=>{const g=new T.Group();box(g,.14,.5,.14,M(0x2a2a2a,{metalness:.6}),0,1.9,0);cyl(g,.18,.1,.2,M(0x3a3a3a,{metalness:.6}),0,2.2,0,8);const f=cone(g,.14,.4,flameM(col||0xffb050),0,2.5,0,6);flames.push(f);g.position.set(x,0,z);g.rotation.y=ry;c.g.add(g)};
 const pillarFancy=(c,x,z,kind,col)=>{const g=new T.Group(),m=STONE(col),h=c.h;cyl(g,.55,.6,.4,m,0,.2,0,10);
  if(kind==="twist"){for(let i=0;i<8;i++){const a=i*.9;cyl(g,.17,.17,h/7,m,Math.cos(a)*.2,.4+i*h/8,Math.sin(a)*.2,8)}}
  else if(kind==="serpent"){cyl(g,.3,.3,h,m,0,h/2,0,10);const sm=M(0x2a5a3a,{roughness:.5});for(let i=0;i<7;i++)tor(g,.34,.07,sm,0,.6+i*h/8,0,Math.PI/2+.4,0,0).rotation.z=i*.5;sph(g,.14,sm,.3,h-.6,.2,1.3,.8,1);sph(g,.03,glowM(0xffd030,2),.37,h-.55,.3)}
  else if(kind==="faces"){cyl(g,.4,.4,h,m,0,h/2,0,12);for(let i=0;i<4;i++){const y=1+i*(h-1.5)/3;sph(g,.2,STONE(col),0,y,.36,1,1,.5);sph(g,.04,glowM(0xffa030,1.5),-.07,y+.04,.5);sph(g,.04,glowM(0xffa030,1.5),.07,y+.04,.5)}}
  else if(kind==="runes"){cyl(g,.4,.4,h,m,0,h/2,0,12);const rg=glowM(col===0?0xffffff:0x80d0ff,1.6);for(let i=0;i<9;i++)box(g,.04,.3,.02,rg,Math.sin(i*.9)*.1-.0,.8+i*.4,.41,0,0,i*.2)}
  else{cyl(g,.42,.42,h,m,0,h/2,0,12)}
  cyl(g,.6,.5,.4,m,0,h-.2,0,10);g.position.set(x,0,z);c.g.add(g);c.r.obs.push({x,z,r:.7});return g};
 /* ---------- room styles ---------- */
 function sideList(c){return["N","S","W","E"]}
 function murals(c,n,kinds,col,bg){let i=0;const sides=["N","W","E","S"];for(const s of sides){const L=c.slots(s,Math.max(1,Math.round(((s==="N"||s==="S")?c.w:c.d)/4.2)),1.5);for(const sl of L){if(i>=n)return;mural(c,s,sl.u,2.35,kinds[(i++)%kinds.length],col,bg)}}}
 function statuesAlong(c,kinds,n,col,rad,inset){const sides=["N","S","W","E"];let i=0;for(const s of sides){const L=c.slots(s,Math.max(2,Math.round(((s==="N"||s==="S")?c.w:c.d)/3.6)),1.4);for(const sl of L){if(i>=n)return;const k=kinds[i%kinds.length],o=ST[k]({glow:c.theme.acc[0]},col);const p=c.wallPos(s,sl.u,inset||1.0);c.put(o,s==="N"||s==="S"?sl.u:p[0],s==="N"||s==="S"?p[1]:sl.u,p[2],rad||.7);i++}}}
 const STYLES={
  pentagram(c){floorSigil(c,"pentagram",c.theme.acc[0],Math.min(c.w,c.d)-1.5,0,0,0,1);candleRing(c.g,0,0,Math.min(c.w,c.d)/2-1.2,12,0xff6030);for(let i=0;i<5;i++){const a=-Math.PI/2+i/5*6.283,r=Math.min(c.w,c.d)/2-1.6;const x=Math.cos(a)*r,z=Math.sin(a)*r;if(c.free(x,z))c.put(ST.hooded({glow:0xff3010},c.theme.st[0]),x,z,Math.atan2(-x,-z),.6)}dim(c,0xff4a30);fogC(c,0x401008)},
  hands(c){const m=STONE(c.theme.st[0]);for(let k=0;k<9;k++){const x=(c.R()-.5)*(c.w-3),z=(c.R()-.5)*(c.d-3);if(!c.free(x,z))continue;const g=new T.Group();cyl(g,.3,.2,.7,m,0,.2,0,8);for(let f=0;f<5;f++){const a=(f-2)*.3;cyl(g,.05,.04,.8,m,Math.sin(a)*.25,.8,Math.cos(a)*.05,6,0,0,-a)}c.put(g,x,z,c.R()*6,.5)}
   for(let k=0;k<7;k++){const x=(c.R()-.5)*(c.w-2),z=(c.R()-.5)*(c.d-2),g=new T.Group();cyl(g,.18,.1,1.2,m,0,c.h-.6,0,8);for(let f=0;f<5;f++)cyl(g,.04,.025,.6,m,(f-2)*.09,c.h-1.4,0,5,0,0,(f-2)*.2);g.position.set(x,0,z);c.g.add(g)}
   const a=ST.armed({glow:0xb080ff},c.theme.st[0]);if(c.free(0,0))c.put(a,0,-c.d/4,0,.9);floorSigil(c,"hexagram",0xb080ff,Math.min(c.w,c.d)-3,0,0,0,1,.55);dim(c,0xb080ff);fogC(c,0x20103a)},
  eyes(c){murals(c,6,["eye"],0xffd060,0x20140a);ceilSigil(c,"eye",0xffc040,Math.min(c.w,c.d)-2);const o=ST.obelisk({glow:0xffa020},c.theme.st[0]);if(c.free(0,0))c.put(o,0,0,0,.9);anims.push(t=>{if(o.userData.pulse)o.userData.pulse.material.emissiveIntensity=1.5+Math.sin(t*2)});floorSigil(c,"eye",0xffc040,Math.min(c.w,c.d)-2.5,0,0,0,1,.6);dim(c,0xffc060);fogC(c,0x302008)},
  bones(c){for(let k=0;k<4;k++){const x=(k%2?1:-1)*(c.w/2-1.6),z=(k<2?-1:1)*(c.d/4);if(c.free(x,z)){const o=ST.skullpile({},0);c.put(o,x,z,0,.9)}}for(let k=0;k<3;k++){const g=new T.Group(),b=M(0xe0d8c0,{roughness:.6});tor(g,.5,.05,b,0,0,0,Math.PI/2);for(let i=0;i<6;i++){const a=i/6*6.283;cyl(g,.03,.03,.5,b,Math.cos(a)*.5,.2,Math.sin(a)*.5,5);candle(g,Math.cos(a)*.5,Math.sin(a)*.5,.2+.0,0xfff0c0)}cyl(g,.01,.01,c.h-2.4,M(0x2a2a2a),0,(c.h-2.4)/2+.3,0,4);g.position.set((k-1)*3.5,c.h-1.5,0);c.g.add(g)}
   floorSigil(c,"invpent",0xe8e0c0,Math.min(c.w,c.d)-3,0,0,0,1,.4);dim(c,0xd8d0b0);fogC(c,0x242018)},
  angels(c){const L=[[-1,-1],[1,-1],[-1,1],[1,1]];L.forEach(([sx,sz],i)=>{const x=sx*(c.w/2-2.2),z=sz*(c.d/4);if(c.free(x,z))c.put(ST.angel({},0xd8dce8),x,z,Math.atan2(-sx,0)+ (i%2?.4:-.4),.9)});floorSigil(c,"tree",0xb0c8ff,Math.min(c.w,c.d)-2.5,0,0,0,1,.55);for(const s of["N","S"]){const L2=c.slots(s,2,2);L2.forEach(sl=>banner(c,s,sl.u,0x202c4a,"star"))}dim(c,0xb8d0ff);fogC(c,0x182040)},
  idols(c){const o=ST.idol({glow:0xff3010},c.theme.st[1]);if(c.free(0,-c.d/4))c.put(o,0,-c.d/4,0,1.0);statuesAlong(c,["gargoyle"],6,c.theme.st[0]);murals(c,3,["horns","skull","hand"],0xff8a30,0x2a0e08);floorSigil(c,"chaos",0xff5a20,Math.min(c.w,c.d)-3,0,-c.d/4,0,1,.55);dim(c,0xff6a30);fogC(c,0x3a1008)},
  cages(c){const iron=M(0x4a4a50,{metalness:.7,roughness:.5}),bone=M(0xe0d8c0);for(let k=0;k<5;k++){const x=(c.R()-.5)*(c.w-3),z=(c.R()-.5)*(c.d-3),g=new T.Group();cyl(g,.015,.015,c.h-2.4,iron,0,(c.h-2.4)/2+1.8,0,4);for(let i=0;i<8;i++){const a=i/8*6.283;cyl(g,.02,.02,1.1,iron,Math.cos(a)*.4,1.25,Math.sin(a)*.4,4)}tor(g,.4,.025,iron,0,1.8,0,Math.PI/2);tor(g,.4,.025,iron,0,.7,0,Math.PI/2);sph(g,.12,bone,0,.85,0);cyl(g,.05,.05,.45,bone,0,.5,0,5);g.position.set(x,0,z);c.g.add(g);anims.push(t=>{g.rotation.z=Math.sin(t*.7+k)*.03})}
   for(let k=0;k<4;k++){const x=(c.R()-.5)*(c.w-2),z=(c.R()-.5)*(c.d-2);const g=new T.Group();for(let i=0;i<10;i++)tor(g,.05,.012,iron,0,c.h-.2-i*.22,0,i%2?0:1.57);g.position.set(x,0,z);c.g.add(g)}floorSigil(c,"hexagram",0xe0a060,Math.min(c.w,c.d)-3,0,0,0,1,.5);dim(c,0xffa050);fogC(c,0x2a1a0c)},
  sarcophagi(c){const m=STONE(c.theme.st[0]);for(const s of["W","E"]){const L=c.slots(s,Math.max(2,Math.round(c.d/4.2)),2);L.forEach((sl,i)=>{const g=new T.Group();box(g,1.1,.7,2.4,m,0,.35,0);box(g,1.0,.3,2.3,STONE(c.theme.st[1]),0,.85,0);sph(g,.28,STONE(0xe0b84a),0,1.05,.8,1,.7,1);box(g,.5,.05,1.3,M(0xe0b84a,{emissive:0x604010,emissiveIntensity:.5,metalness:.6}),0,1.02,-.2);const p=c.wallPos(s,sl.u,1.3);c.put(g,p[0],sl.u,Math.PI/2+(s==="W"?Math.PI:0),1.0)})}
   murals(c,4,["eye","figure","sun"],0xe0b84a,0x1a3a3a);floorSigil(c,"yantra",0x40d0c0,Math.min(c.w,c.d)-3,0,0,0,1,.45);dim(c,0x50e0d0);fogC(c,0x08201c)},
  lab(c){const wood=M(0x5a3a1a);const cg=new T.Group();cyl(cg,.7,.55,.8,M(0x1a1a1e,{metalness:.5}),0,1.1,0,12);cyl(cg,.6,.6,.04,glowM(0x60ff60,1.8),0,1.46,0,12);for(let i=0;i<3;i++){const a=i*2.1;cyl(cg,.04,.04,1.2,M(0x2a2a2a),Math.cos(a)*.6,.6,Math.sin(a)*.6,5,0,0,Math.cos(a)*.2)}if(c.free(0,0))c.put(cg,0,-1,0,1.0);const bub=[];for(let i=0;i<6;i++){const b=sph(cg,.06,glowM(0x90ff90,1),0,1.5,0);bub.push(b)}anims.push(t=>{bub.forEach((b,i)=>{const k=(t*.5+i/6)%1;b.position.set(Math.sin(i*2+t)*.3,1.5+k*1.2,Math.cos(i*2+t)*.3);b.scale.setScalar(1-k)})});
   for(const s of["N","W","E"]){const L=c.slots(s,Math.max(1,Math.round(((s==="N")?c.w:c.d)/4)),1.8);L.forEach(sl=>{const g=new T.Group();box(g,2.2,2.6,.5,wood,0,1.3,0);for(let sh=0;sh<4;sh++){box(g,2.1,.05,.45,M(0x3a2410),0,.4+sh*.6,.05);for(let b=0;b<5;b++){const col=[0x60ff90,0xff80c0,0xe0e070,0x80c0ff,0xffa040][(b+sh)%5];cyl(g,.08,.08,.28,glowM(col,.7),-.8+b*.4,.58+sh*.6,.05,8)}}const p=c.wallPos(s,sl.u,.5);c.put(g,s==="N"?sl.u:p[0],s==="N"?p[1]:sl.u,p[2],1.1)})}
   floorSigil(c,"septagram",0x80ff90,Math.min(c.w,c.d)-3,0,-1,0,1,.5);dim(c,0x80ff90);fogC(c,0x0c2a10)},
  mirrors(c){const mm=M(0x10141a,{metalness:.95,roughness:.08});for(const s of["N","S","W","E"]){const L=c.slots(s,Math.max(1,Math.round(((s==="N"||s==="S")?c.w:c.d)/4.5)),1.8);L.forEach(sl=>{const g=new T.Group();box(g,1.6,2.8,.12,M(0x8a7a50,{metalness:.7,roughness:.4}),0,1.7,0);const mr=box(g,1.4,2.6,.05,mm,0,1.7,.07);g.userData.m=mr;const p=c.wallPos(s,sl.u,.12);g.position.set(s==="N"||s==="S"?sl.u:p[0],0,s==="N"||s==="S"?p[1]:sl.u);g.rotation.y=p[2];c.g.add(g)})}
   floorSigil(c,"moons",0xd0e0ff,Math.min(c.w,c.d)-2.5,0,0,0,1,.55);for(let i=0;i<3;i++){const x=(i-1)*3,z=0;if(c.free(x,z))c.put(ST.weeper({},0x9a9ea8),x,z,Math.PI*i,.8)}dim(c,0xb0c8ff);fogC(c,0x10182a)},
  labyrinth(c){floorSigil(c,"labyrinth",0xffc860,Math.min(c.w,c.d)-1.5,0,0,0,1,.65);for(let i=0;i<8;i++){const a=i/8*6.283,r=Math.min(c.w,c.d)/2-1.3,x=Math.cos(a)*r,z=Math.sin(a)*r;if(c.free(x,z)){const g=new T.Group();box(g,.5,2.2+(i%3)*.5,.35,STONE(c.theme.st[0]),0,1.2,0,0,0,(i%2?.04:-.04));c.put(g,x,z,a+Math.PI/2,.6)}}for(const[x,z]of[[-1,-1],[1,-1],[1,1],[-1,1]]){const px=x*(c.w/2-1.3),pz=z*(c.d/2-1.3);if(c.free(px,pz))pillarFancy(c,px,pz,"twist",c.theme.st[1])}dim(c,0xffc060);fogC(c,0x2a1a08)},
  serpent(c){for(const[x,z]of[[-1,-1],[1,-1],[1,1],[-1,1]]){const px=x*(c.w/2-1.4),pz=z*(c.d/2-1.4);if(c.free(px,pz))pillarFancy(c,px,pz,"serpent",c.theme.st[0])}floorSigil(c,"ouroboros",0x60e080,Math.min(c.w,c.d)-2.5,0,0,0,1,.6);murals(c,4,["serpent"],0x60e080,0x0c2a14);dim(c,0x70f090);fogC(c,0x0a2410)},
  observatory(c){const stars=new T.BufferGeometry(),n=220,pa=new Float32Array(n*3);for(let i=0;i<n;i++){pa[i*3]=(c.R()-.5)*(c.w-.5);pa[i*3+1]=c.h-.05;pa[i*3+2]=(c.R()-.5)*(c.d-.5)}stars.setAttribute("position",new T.BufferAttribute(pa,3));c.g.add(new T.Points(stars,new T.PointsMaterial({size:.12,color:0xd8e8ff,transparent:true,opacity:.9,depthWrite:false})));
   const og=new T.Group();sph(og,.35,glowM(0xffd070,1.6),0,0,0);const rings=[];[1,1.7,2.4].forEach((r,i)=>{const t=tor(og,r,.03,M(0xb0a070,{metalness:.8,roughness:.3}),0,0,0,Math.PI/2+i*.5,i*.7,0);const pl=sph(t,.12+i*.03,glowM([0x80c0ff,0xff8060,0xc0ff80][i],1),r,0,0);rings.push(t)});og.position.set(0,1.8,0);c.g.add(og);c.r.obs.push({x:0,z:0,r:.9});anims.push(t=>{rings.forEach((r,i)=>{r.rotation.z=t*(.3+i*.15)})});
   floorSigil(c,"metatron",0x90b0ff,Math.min(c.w,c.d)-2.5,0,0,0,1,.5);ceilSigil(c,"septagram",0x90b0ff,Math.min(c.w,c.d)-2);dim(c,0x90b0ff);fogC(c,0x08102a)},
  chapel(c){const wood=M(0x3a1a14,{roughness:.7});for(let row=0;row<3;row++)for(const sx of[-1,1]){const x=sx*(c.w/4+.3),z=-c.d/4+row*2.2+1;if(!c.free(x,z))continue;const g=new T.Group();box(g,2.4,.5,.7,wood,0,.25,0);box(g,2.4,.9,.12,wood,0,.8,-.3);c.put(g,x,z,0,1.2)}
   const sides=["N","S"];sides.forEach(s=>{c.slots(s,3,1.5).forEach(sl=>banner(c,s,sl.u,0x5a0a10,"horns"))});for(let i=0;i<4;i++){const x=(i-1.5)*(c.w/4.5);if(c.free(x,-c.d/2+1.2)){const g=new T.Group();cyl(g,.25,.2,.7,M(0x3a3a3e,{metalness:.5}),0,.35,0);cyl(g,.22,.22,.04,glowM(0xaa1010,1.6),0,.72,0);c.put(g,x,-c.d/2+1.4,0,.45)}}
   floorSigil(c,"invpent",0xff3030,Math.min(c.w,c.d)-4,0,1,0,1,.5);dim(c,0xff4040);fogC(c,0x300808)},
  crystal(c){const cols=[0xff60c0,0x60c0ff,0x80ff90,0xffd060,0xc080ff];for(let k=0;k<9;k++){const x=(c.R()-.5)*(c.w-2.5),z=(c.R()-.5)*(c.d-2.5);if(!c.free(x,z))continue;const g=new T.Group(),col=cols[k%5];for(let i=0;i<6;i++){const a=i*1.1;cone(g,.1+c.R()*.12,.8+c.R()*1.6,new T.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.8,transparent:true,opacity:.82,roughness:.1}),Math.cos(a)*.3,.6,Math.sin(a)*.3,5,(c.R()-.5)*.5,0,(c.R()-.5)*.5)}c.put(g,x,z,0,.8);anims.push(t=>{g.children.forEach((q,i)=>q.material.emissiveIntensity=.6+.4*Math.sin(t*1.5+i+k))})}
   floorSigil(c,"yantra",0xe0a0ff,Math.min(c.w,c.d)-3,0,0,0,1,.45);dim(c,0xd0a0ff);fogC(c,0x1a1030)},
  skullthrone(c){const o=ST.skullpile({},0);o.scale.setScalar(2);if(c.free(0,-c.d/4))c.put(o,0,-c.d/4,0,1.8);for(const[x,z]of[[-1,-1],[1,-1],[-1,1],[1,1]]){const px=x*(c.w/2-1.5),pz=z*(c.d/4);if(c.free(px,pz))c.put(ST.totem({glow:0xffa030},c.theme.st[0]),px,pz,0,.6)}floorSigil(c,"chaos",0xff3a20,Math.min(c.w,c.d)-3,0,0,0,1,.5);dim(c,0xff5030);fogC(c,0x300a06)},
  reliquary(c){const m=STONE(c.theme.st[0]);for(const s of["W","E"]){c.slots(s,Math.max(2,Math.round(c.d/3.5)),1.5).forEach((sl,i)=>{const p=c.wallPos(s,sl.u,.9),k=["kneel","hooded","weeper"][i%3];c.put(ST[k]({glow:0x60e0ff},c.theme.st[i%2]),p[0],sl.u,p[2],.7)})}
   for(let i=0;i<10;i++){const x=(c.R()-.5)*(c.w-3),z=(c.R()-.5)*(c.d-3);if(c.free(x,z))candle(c.g,x,z,.3,0xfff0c0)}floorSigil(c,"tree",0x80e0ff,Math.min(c.w,c.d)-3,0,0,0,1,.45);dim(c,0x80d0ff);fogC(c,0x0a1c24)},
  forge(c){const iron=M(0x2a2a30,{metalness:.7,roughness:.5});const an=new T.Group();box(an,1.4,.8,.7,iron,0,.8,0);box(an,.9,.5,.4,iron,0,.3,0);cone(an,.2,.7,iron,.9,1.25,0,4,0,0,-1.57);box(an,2.2,.1,1.2,M(0x3a2a20),0,.05,0);if(c.free(0,-1))c.put(an,0,-1,0,1.2);
   const fire=new T.Group();box(fire,1.8,.9,1.2,STONE(0x4a3a30),0,.45,0);box(fire,1.4,.1,.8,glowM(0xff5010,2.2),0,.92,0);cone(fire,.4,.8,flameM(0xff8020),0,1.4,0,6);flames.push(fire.children[fire.children.length-1]);const p=c.wallPos("N",0,1.2);if(c.free(0,-c.d/2+1.5))c.put(fire,0,-c.d/2+1.4,0,1.2);
   statuesAlong(c,["knight"],4,0x6a6a72);floorSigil(c,"hexagram",0xff7020,Math.min(c.w,c.d)-3,0,0,0,1,.4);dim(c,0xff7030);fogC(c,0x2a0c04)},
  drowned(c){const w=new T.Mesh(new T.PlaneGeometry(c.w-.2,c.d-.2).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x2a8a8a,transparent:true,opacity:.5,roughness:.05,metalness:.3}));w.position.y=.18;c.g.add(w);anims.push(t=>{w.position.y=.18+Math.sin(t*.8)*.02});
   for(let k=0;k<8;k++){const x=(c.R()-.5)*(c.w-2),z=(c.R()-.5)*(c.d-2);if(!c.free(x,z))continue;const g=new T.Group();for(let i=0;i<5;i++)cone(g,.05,1+c.R(),M(0x2a6a3a,{side:2}),(c.R()-.5)*.4,.7,(c.R()-.5)*.4,4);c.put(g,x,z,0,.4)}
   const o=ST.kneel({},0x5a8a7a);if(c.free(0,0))c.put(o,0,0,0,.8);statuesAlong(c,["weeper"],3,0x5a8a7a);floorSigil(c,"triquetra",0x40ffd0,Math.min(c.w,c.d)-3,0,0,0,1,.5);dim(c,0x40ffd0);fogC(c,0x062a28)},
  menagerie(c){statuesAlong(c,["sphinx","gargoyle","knight","idol"],6,c.theme.st[0],.9);murals(c,4,["wheel","sun","tree","chalice"],0xe0b84a,0x1c1410);floorSigil(c,"hexagram",0xe0b84a,Math.min(c.w,c.d)-3,0,0,0,1,.45);dim(c,0xffc070);fogC(c,0x241808)}
 };
 const GEN=["pentagram","hands","eyes","bones","angels","idols","cages","sarcophagi","lab","mirrors","labyrinth","serpent","observatory","chapel","crystal","skullthrone","reliquary","forge","drowned","menagerie"];
 const THEMEFAV={crypt:["bones","angels","pentagram","reliquary","hands","chapel","mirrors","eyes"],cave:["crystal","mirrors","observatory","eyes","labyrinth","angels","reliquary","hands"],mine:["forge","cages","lab","idols","labyrinth","menagerie","skullthrone","pentagram"],sunk:["drowned","serpent","reliquary","hands","eyes","lab","angels","mirrors"],tomb:["sarcophagi","eyes","menagerie","labyrinth","serpent","observatory","idols","angels"],lair:["skullthrone","bones","idols","cages","chapel","pentagram","hands","forge"]};
 const CORR=["procession","gauntlet","chains","gallery","candlewalk"];
 const CSTY={
  procession(c){const rw=c.w<c.d?c.w:c.d;const len=Math.max(c.w,c.d);const m=new T.Mesh(new T.PlaneGeometry(c.w<c.d?1.6:len-1,c.w<c.d?len-1:1.6).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x6a1018,roughness:.95}));m.position.y=.03;c.g.add(m);[-1,1].forEach(s=>{const ln=new T.Mesh(new T.PlaneGeometry(c.w<c.d?.1:len-1,c.w<c.d?len-1:.1).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xe0b84a}));ln.position.set(c.w<c.d?s*.7:0,.04,c.w<c.d?0:s*.7);c.g.add(ln)});dim(c,0xff7a50)},
  gauntlet(c){const ks=["knight","hooded","angel","gargoyle"];const n=Math.round(Math.max(c.w,c.d)/3.2);for(let i=0;i<n;i++){const t=-.5+(i+.5)/n,sd=i%2?1:-1;const x=c.w<c.d?sd*(c.w/2-.8):t*(c.w-2),z=c.w<c.d?t*(c.d-2):sd*(c.d/2-.8);if(c.free(x,z,.5))c.put(ST[ks[i%4]]({glow:0xff3020},c.theme.st[i%2]),x,z,c.w<c.d?-sd*Math.PI/2:(sd>0?Math.PI:0),.5)}dim(c,0xff6040);fogC(c,0x200c08)},
  chains(c){const iron=M(0x4a4a50,{metalness:.7,roughness:.5});const n=Math.round(Math.max(c.w,c.d)*1.4);for(let i=0;i<n;i++){const x=(c.R()-.5)*(c.w-1),z=(c.R()-.5)*(c.d-1);const L=1.2+c.R()*(c.h-2),g=new T.Group();for(let k=0;k<Math.floor(L/.16);k++)tor(g,.05,.012,iron,0,c.h-.1-k*.16,0,k%2?0:1.57,0,0);if(c.R()<.3)sph(g,.12,M(0xe0d8c0),0,c.h-L,0);g.position.set(x,0,z);c.g.add(g);anims.push(t=>{g.rotation.z=Math.sin(t*.9+i)*.02})}dim(c,0xb0b8d0)},
  gallery(c){const side=c.w<c.d?["W","E"]:["N","S"];side.forEach(s=>{c.slots(s,Math.max(2,Math.round(Math.max(c.w,c.d)/2.4)),1).forEach((sl,i)=>mural(c,s,sl.u,2.2,MUR[(i*3+c.node.id)%MUR.length],c.theme.acc[0],0x1a1410,.9))});dim(c,c.theme.acc[1])},
  candlewalk(c){const n=Math.round(Math.max(c.w,c.d)/.9);for(let i=0;i<n;i++){const t=-.5+(i+.5)/n;[-1,1].forEach(sd=>{const x=c.w<c.d?sd*(c.w/2-.6):t*(c.w-1.4),z=c.w<c.d?t*(c.d-1.4):sd*(c.d/2-.6);if(!c.nearDoor(x,z,1.8))candle(c.g,x,z,.15+((i*5)%4)*.07,0xffb060)})}dim(c,0xff9a50)}
 };
 const SPEC={
  start(c){floorSigil(c,"pentagram",0xe0d8b0,Math.min(c.w,c.d)-2,0,-.5,0,1,.35);for(const s of["W","E"])c.slots(s,2,2).forEach(sl=>banner(c,s,sl.u,0x2a2420,"star"));for(const sx of[-1,1]){const x=sx*(c.w/2-1.4),z=-c.d/2+1.4;if(c.free(x,z)){const g=new T.Group();cyl(g,.4,.3,.9,M(0x3a3a3e,{metalness:.5}),0,.45,0);const f=cone(g,.3,.7,flameM(0xffa040),0,1.2,0,6);flames.push(f);c.put(g,x,z,0,.5)}}fogC(c,0x201a14)},
  boss(c){ceilSigil(c,"chaos",c.theme.acc[0],Math.min(c.w,c.d)-3);floorSigil(c,"pentagram",c.theme.acc[0],c.w-3,0,2,0,1,.55);for(const sx of[-1,1]){const x=sx*(c.w/2-1.5),z=-c.d/2+5;if(c.free(x,z))c.put(ST.idol({glow:0xff2010},c.theme.st[0]),x,z,0,1.2);for(let k=0;k<3;k++){const px=sx*(c.w/2-1.2),pz=-c.d/2+9+k*3.4;if(c.free(px,pz))pillarFancy(c,px,pz,"runes",c.theme.st[1])}}
   for(let k=0;k<2;k++){const x=(k?1:-1)*3;if(c.free(x,c.d/4))c.put(ST.hooded({glow:0xff3010},c.theme.st[0]),x,c.d/4,Math.PI,.6)}for(const s of["W","E"])c.slots(s,3,3).forEach(sl=>mural(c,s,sl.u,3.2,["skull","horns","eye"][sl.u>0?1:0],0xff5030,0x180806,1.3));dim(c,0xff4020,1.1);fogC(c,0x2a0604)},
  shrine(c){candleRing(c.g,0,-c.d/2+1.8,2.6,16,0xffc070,.28);const s=ST.angel({},0xdcd8d0);c.put(s,0,-c.d/2+.9,0,.5);floorSigil(c,"triquetra",0xffe0a0,6,0,-c.d/2+2,0,1,.7);for(const sd of["W","E"])c.slots(sd,1,2).forEach(sl=>banner(c,sd,sl.u,0x2a1a3a,"moon"));dim(c,0xffd890);fogC(c,0x201808)},
  well(c){for(let i=0;i<8;i++){const a=i/8*6.283,x=Math.cos(a)*3.2,z=-1+Math.sin(a)*3.2;const g=new T.Group();box(g,.5,1.6+(i%3)*.3,.4,STONE(c.theme.st[0]),0,.9,0,0,0,(i%2?.05:-.05));const rg=glowM(0x60c0ff,1.4);box(g,.05,.3,.02,rg,0,1.3,.21);if(c.free(x,z,.3))c.put(g,x,z,a+Math.PI/2,.4)}floorSigil(c,"moons",0x70c0ff,9,0,-1,0,1,.6);dim(c,0x70c0ff);fogC(c,0x08182a)},
  key(c){floorSigil(c,"hexagram",0xc0c0e0,5,0,-c.d/2+1.6,0,1,.7);const rays=new T.Mesh(new T.CylinderGeometry(.9,.9,c.h,16,1,true),BM(0xc0d0ff,{opacity:.1,blending:T.AdditiveBlending,side:2}));rays.position.set(0,c.h/2,-c.d/2+1.6);c.g.add(rays);for(const sd of["W","E"])c.slots(sd,1,2).forEach(sl=>mural(c,sd,sl.u,2.3,"hand",0xc0c0e0,0x14141c));dim(c,0xb0c0ff);fogC(c,0x10142a)},
  treasure(c){const gold=M(0xe0b84a,{metalness:.8,roughness:.3,emissive:0x604010,emissiveIntensity:.3});for(let i=0;i<4;i++){const x=(i<2?-1:1)*(c.w/2-1.2),z=(i%2?1:-1)*(c.d/4);if(c.free(x,z)){const g=new T.Group();cyl(g,.3,.18,.9,gold,0,.45,0,10);cyl(g,.2,.3,.25,gold,0,.95,0,10);c.put(g,x,z,0,.4)}}murals(c,2,["chalice","sun"],0xe0b84a,0x2a1810);floorSigil(c,"yantra",0xe0b84a,Math.min(c.w,c.d)-2,0,0,0,1,.35);dim(c,0xffd070);fogC(c,0x2a1c08)},
  vault(c){const gold=M(0xe0b84a,{metalness:.8,roughness:.3,emissive:0x604010,emissiveIntensity:.35});for(let i=0;i<5;i++){const x=(c.R()-.5)*(c.w-2.5),z=(c.R()-.5)*(c.d-3)+1;if(c.free(x,z)){const g=new T.Group();for(let k=0;k<4;k++)box(g,.9,.18,.5,gold,0,.1+k*.19,0,0,.1*k,0);c.put(g,x,z,0,.7)}}for(const s of["W","E"])c.slots(s,2,1.8).forEach(sl=>banner(c,s,sl.u,0x3a2a0a,"sun"));floorSigil(c,"septagram",0xffd060,Math.min(c.w,c.d)-2,0,0,0,1,.5);dim(c,0xffd060,1.1);fogC(c,0x302006)}
 };
 /* ---------- entry point ---------- */
 function dress(r,node){
  if(!r||!r.g||r.g.userData.dressed)return;r.g.userData.dressed=1;anims.length=0;flames.length=0;
  const c=ctxOf(r,node),th=c.theme,R=c.R,pid=c.pid;
  /* surfaces: floor, ceiling and four walls get a per-room material */
  const kids=r.g.children,seed=((node.seed||node.id*977)+hash(pid))>>>0;
  const wpick=th.wall[(seed>>>3)%th.wall.length],fpick=th.floor[(seed>>>5)%th.floor.length];
  const wt=surf(wpick[0],wpick[1],wpick[2],seed),ft=surf(fpick[0],fpick[1],fpick[2],seed+5);
  const mkWall=(rx,ry)=>{const t=wt.clone();t.needsUpdate=true;t.repeat.set(rx,ry);return new T.MeshStandardMaterial({map:t,bumpMap:t,bumpScale:wpick[0]==="obsidian"||wpick[0]==="ice"?.6:2,roughness:wpick[0]==="obsidian"||wpick[0]==="ice"?.25:.92,metalness:wpick[0]==="obsidian"?.3:0,color:0xffffff})};
  try{
   const fl=kids[0],ce=kids[1];
   if(fl&&fl.isMesh){const t=ft.clone();t.needsUpdate=true;t.repeat.set(r.w/3.5,r.d/3.5);fl.material=new T.MeshStandardMaterial({map:t,bumpMap:t,bumpScale:1.4,roughness:fpick[0]==="obsidian"||fpick[0]==="ice"||fpick[0]==="marble"?.3:.9,color:0xffffff})}
   if(ce&&ce.isMesh)ce.material=new T.MeshStandardMaterial({color:th.ceil,roughness:1});
   if(kids[2]&&kids[2].isMesh)kids[2].material=mkWall(r.w/3,r.h/3);if(kids[3]&&kids[3].isMesh)kids[3].material=mkWall(r.w/3,r.h/3);
   if(kids[4]&&kids[4].isMesh)kids[4].material=mkWall(r.d/3,r.h/3);if(kids[5]&&kids[5].isMesh)kids[5].material=mkWall(r.d/3,r.h/3)}catch(e){}
  /* baseboards + cornice so walls feel built */
  const trim=M(0x2a2620,{roughness:.9});
  [[0,-r.d/2+.15,r.w,.35,.3],[0,r.d/2-.15,r.w,.35,.3]].forEach(([x,z,w2,h2,d2])=>{box(r.g,w2,h2,d2,trim,x,h2/2,z);box(r.g,w2,.3,.4,trim,x,r.h-.15,z)});
  [[-r.w/2+.15,0],[r.w/2-.15,0]].forEach(([x,z])=>{box(r.g,.3,.35,r.d,trim,x,.17,z);box(r.g,.4,.3,r.d,trim,x,r.h-.15,z)});
  const T0=node.type;let sty;
  if(SPEC[T0]&&T0!=="hall"&&T0!=="fight")sty=SPEC[T0];
  else if(T0==="corridor"||T0==="trap"){const k=CORR[(node.id*3+(seed&7))%CORR.length];sty=CSTY[k]}
  else{const fav=THEMEFAV[pid]||GEN,pool=((seed>>>11)&3)?fav:GEN,k=pool[(node.id+(seed>>>7))%pool.length];sty=STYLES[k]||STYLES.menagerie}
  try{if(T0==="boss"||T0==="start"||T0==="shrine"||T0==="well"||T0==="key"||T0==="treasure"||T0==="vault"){SPEC[T0](c);if(T0==="boss"&&STYLES.pillars)0;
    if(T0==="shrine"||T0==="vault"||T0==="treasure"||T0==="key"){murals(c,2,[MUR[node.id%MUR.length],MUR[(node.id+5)%MUR.length]],th.acc[0],0x1a1410)}}
   else sty(c)}catch(e){console.warn("dgart style",e)}
  /* a few ornaments for every room: candles and a mural pair so none is bare */
  try{if(T0==="hall"||T0==="fight"){const n=2+Math.floor(R()*3);for(let i=0;i<n;i++){const x=(R()-.5)*(r.w-3),z=(R()-.5)*(r.d-3);if(c.free(x,z))candleRing(r.g,x,z,.25,3+Math.floor(R()*3),th.acc[0]>0?0xffb060:0xffb060,.18)}}}catch(e){}
  r.g.userData.style=sty&&sty.name;
 }
 window.DGART={dress,STYLES,SPEC,CSTY,ST};
 const _vu=vmUpdate;vmUpdate=function(dt){_vu(dt);try{if(window.MZ&&MZ.room&&MZ.room.g&&MZ.room.g.userData.dressed){const t=performance.now()/1000;for(let i=0;i<anims.length;i++)anims[i](t);for(let i=0;i<flames.length;i++){const f=flames[i];f.scale.y=1+.25*Math.sin(t*13+i*2.1)+.1*Math.sin(t*27+i);f.scale.x=f.scale.z=1/Math.sqrt(f.scale.y)}}}catch(e){}};
 })();

/* ===== THE FOUR GUARDIANS: Raphael, Michael, Uriel, Gabriel — rare help for a player who is nearly dead ===== */
(function(){
 if(typeof vmUpdate==="undefined"||typeof THREE==="undefined")return;
 const T=THREE;let cur=null,lastEnd=-1e9,GLOWT=null,banner=null;
 const glowTex=()=>{if(GLOWT)return GLOWT;const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d"),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,"rgba(255,255,255,1)");r.addColorStop(.35,"rgba(255,255,255,.45)");r.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=r;g.fillRect(0,0,64,64);return GLOWT=new T.CanvasTexture(c)};
 const AN={
  Raphael:{col:0x40e090,robe:0xe8f4e8,trim:0x20a060,hair:0x8a5a2a,wing:0xf0fff4,tip:0x30d080,line:"The healing angel Raphael lays a hand upon you. “Rise. God heals.”",who:"Raphael — Medicine of God"},
  Michael:{col:0xff5030,robe:0xd8c070,trim:0xb02020,hair:0xe8d8a0,wing:0xfff8f0,tip:0xe03020,line:"The archangel Michael draws his flaming sword. “Who is like God? Stand behind me.”",who:"Michael — Who Is Like God"},
  Uriel:{col:0xffa020,robe:0xff9a30,trim:0xffe070,hair:0xff7010,wing:0xffe8b0,tip:0xff8010,line:"Uriel, the flame of God, kindles the dark. “Let there be light.”",who:"Uriel — Fire of God"},
  Gabriel:{col:0x80c0ff,robe:0xf4f8ff,trim:0x90b8f0,hair:0xf0e0a0,wing:0xe8f2ff,tip:0x80b0ff,line:"Gabriel sounds the horn. “Fear not. Strength is given to you.”",who:"Gabriel — Strength of God"}};
 const mats=[];
 const bm=(c,o)=>{const m=new T.MeshBasicMaterial({color:c,transparent:true,fog:false,side:2,opacity:1});m.userData.b=1;mats.push(m);return m};
 const sm=(c,e,ei,o)=>{o=o||{};const m=new T.MeshStandardMaterial({color:c,emissive:e||c,emissiveIntensity:ei==null?.45:ei,roughness:o.r==null?.55:o.r,metalness:o.m||0,transparent:true,opacity:1,side:2});mats.push(m);return m};
 const mesh=(geo,m,x,y,z,rx,ry,rz)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx||0,ry||0,rz||0);return o};
 const spr=(col,s,op)=>{const m=new T.SpriteMaterial({map:glowTex(),color:col,blending:T.AdditiveBlending,transparent:true,depthWrite:false,fog:false,opacity:op==null?.8:op});m.userData.sp=op==null?.8:op;mats.push(m);const p=new T.Sprite(m);p.scale.set(s,s,1);return p};
 const cone=(r,h,m,x,y,z,rx,ry,rz,seg)=>mesh(new T.ConeGeometry(r,h,seg||8),m,x,y,z,rx,ry,rz);
 const cyl=(r1,r2,h,m,x,y,z,rx,ry,rz,seg)=>mesh(new T.CylinderGeometry(r1,r2,h,seg||10),m,x,y,z,rx,ry,rz);
 const sph=(r,m,x,y,z,sx,sy,sz)=>{const o=mesh(new T.SphereGeometry(r,14,10),m,x,y,z);o.scale.set(sx||1,sy||1,sz||1);return o};
 const box=(w,h,d,m,x,y,z,rx,ry,rz)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);
 const tor=(R,r,m,x,y,z,rx,ry,rz,arc)=>mesh(new T.TorusGeometry(R,r,6,28,arc||6.283),m,x,y,z,rx,ry,rz);
 function wing(sd,A,big){
  const g=new T.Group(),w=bm(A.wing),tp=bm(A.tip);
  for(let row=0;row<3;row++)for(let i=0;i<8-row;i++){const L=(.9+i*.12)*(1.1-row*.18)*big,a=-.25+i*.2+row*.05;
   const f=cone(.15+row*.02,L*1.15,i>5-row?tp:w,0,0,0,0,0,0,5);f.scale.z=.12;f.geometry=f.geometry.clone();f.geometry.translate(0,L/2,0);f.rotation.z=-sd*(a+.65);f.rotation.x=-.35-row*.1;f.position.set(sd*(.1+i*.02),.1-row*.12,-.02-row*.03);g.add(f)}
  return g}
 function body(A,name){
  const G=new T.Group(),robe=sm(A.robe,A.col,.25),trim=sm(A.trim,A.trim,.6),skin=sm(0xf0d4b8,0xffe0c0,.35);
  G.add(cone(.55,1.7,robe,0,.9,0,0,0,0,18));G.add(cyl(.2,.3,.7,robe,0,1.7,0,0,0,0,14));
  G.add(tor(.36,.025,trim,0,1.25,0,Math.PI/2,0,0));G.add(tor(.52,.03,trim,0,.12,0,Math.PI/2,0,0));
  G.add(sph(.15,skin,0,2.17,0,.95,1.1,1));G.add(cyl(.06,.07,.12,skin,0,2.03,0));
  G.add(sph(.162,sm(A.hair,A.hair,.4),0,2.22,-.03,1,1,1.0));
  for(let i=0;i<5;i++)G.add(cone(.05,.5,sm(A.hair,A.hair,.4),(i-2)*.07,1.95,-.14,Math.PI,0,0,5));
  [-1,1].forEach(sd=>{G.add(sph(.012,bm(0x203040),sd*.055,2.2,.145,1,1.3,.6));
   G.add(cyl(.05,.045,.62,robe,sd*.3,1.72,.12,-.5,0,sd*.25,8));G.add(sph(.05,skin,sd*.38,1.45,.3))});
  G.add(tor(.28,.018,bm(A.col),0,2.62,-.03,Math.PI/2-.15,0,0));G.add(spr(A.col,1.3,.6)).position.set(0,2.45,-.1);
  const wl=wing(-1,A,1),wr=wing(1,A,1);wl.position.set(-.12,1.85,-.2);wr.position.set(.12,1.85,-.2);G.add(wl,wr);G.userData.wings=[wl,wr];
  const aura=spr(A.col,5.2,.28);aura.position.set(0,1.5,-.3);G.add(aura);
  const extra=[];
  if(name==="Raphael"){const st=cyl(.025,.025,2.5,sm(0x8a6a3a),.55,1.25,.3,0,0,0,6);G.add(st);for(let i=0;i<14;i++){const a=i*.9;G.add(sph(.03,bm(0x30e090),.55+Math.cos(a)*.06,.7+i*.1,.3+Math.sin(a)*.06))}
   G.add(sph(.1,bm(0x40ffa0),.55,2.55,.3));const fl=spr(0x40ff90,.9,.9);fl.position.set(.55,2.55,.3);G.add(fl);extra.push(fl)}
  if(name==="Michael"){const st=sm(0xdcdcd8,0xffffff,.5,{m:.8,r:.25}),gd=sm(0xe8c040,0xe8c040,.5,{m:.9});
   G.add(cyl(.2,.17,.5,gd,0,1.55,0,0,0,0,10).clone());const sw=new T.Group();sw.add(box(.07,1.7,.02,st,0,1.2,0));sw.add(box(.5,.06,.06,gd,0,.3,0));
   [0,1,2,3,4,5].forEach(i=>{const f=cone(.09-i*.008,.45,bm(i%2?0xff8020:0xffd060),(i%3-1)*.05,1.7+i*.18,0,0,0,0,5);sw.add(f);extra.push(f)});sw.position.set(.62,1.35,.35);sw.rotation.set(-.3,0,-.2);G.add(sw);
   const sh=cyl(.42,.42,.07,gd,-.6,1.4,.3,Math.PI/2,.5,0,20);G.add(sh);G.add(cyl(.34,.34,.075,sm(0xb02020,0xb02020,.4),-.6,1.4,.3,Math.PI/2,.5,0,20));
   G.add(box(.1,.6,.09,gd,-.58,1.4,.35,0,.5,0));G.add(box(.5,.1,.09,gd,-.58,1.4,.35,0,.5,0));
   [-1,1].forEach(sd=>G.add(sph(.15,gd,sd*.3,1.95,0,1.2,.7,1)));G.add(cone(.2,.6,bm(0xe03020),0,2.5,-.12,.3,0,0,6));
   const cl=box(.9,1.7,.04,sm(0xb02020,0x800000,.35),0,1.0,-.38,.05,0,0);G.add(cl)}
  if(name==="Uriel"){const dsk=spr(0xffc040,2.2,.95);dsk.position.set(0,2.4,-.35);G.add(dsk);extra.push(dsk);
   for(let i=0;i<9;i++){const a=i/9*6.283,f=cone(.05,.4,bm(0xff7010),Math.cos(a)*.3,2.62+Math.sin(a)*.3,-.1,0,0,a-Math.PI/2,5);G.add(f);extra.push(f)}
   const sc=cyl(.07,.07,.5,sm(0xf0e0b0),.56,1.5,.3,0,0,Math.PI/2,10);G.add(sc);
   const fb=new T.Group();[0,1,2].forEach(i=>{const f=cone(.14-i*.03,.5+i*.12,bm(i?0xffd060:0xff6010),0,i*.1,0,0,0,0,7);fb.add(f);extra.push(f)});fb.position.set(-.5,1.75,.35);G.add(fb);
   const fl=spr(0xff8020,1.4,.9);fl.position.set(-.5,1.9,.35);G.add(fl)}
  if(name==="Gabriel"){const br=sm(0xf0d070,0xf0d070,.6,{m:.9,r:.3});G.add(cyl(.025,.04,1.5,br,.5,1.75,.38,-1.1,.2,0,10));G.add(cone(.2,.4,br,.95,2.45,.7,-1.1,.2,0,14).clone());
   const bell=mesh(new T.CylinderGeometry(.22,.03,.45,14,1,true),br,.98,2.58,.78,-1.1,.2,0);G.add(bell);
   G.add(cone(.2,.4,bm(0xffffff),.5,.5,.4,Math.PI,0,0,6));const lily=new T.Group();[0,1,2,3,4].forEach(i=>lily.add(cone(.05,.22,bm(0xffffff),Math.cos(i*1.26)*.07,.12,Math.sin(i*1.26)*.07,0,0,.5,5)));lily.position.set(-.45,1.5,.35);G.add(lily);
   G.add(tor(.18,.03,bm(0xe8f0ff),0,2.88,-.03,0,0,0,4.2));for(let i=0;i<6;i++){const s=sph(.025,bm(0xffffff),Math.cos(i*1.05)*.5,2.7+Math.sin(i*1.05)*.5,-.2);G.add(s);extra.push(s)}
   const ring=tor(.5,.012,bm(0xa0d0ff),0,2.0,0,Math.PI/2,0,0);G.add(ring)}
  G.userData.extra=extra;return G}
 function banner_(name,A){if(!banner){banner=document.createElement("div");banner.style.cssText="position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:60;pointer-events:none;text-align:center;font-family:Georgia,'Palatino Linotype',serif;color:#fff6d8;text-shadow:0 0 18px #ffd070,0 2px 4px #000;transition:opacity 1s;opacity:0;max-width:86vw;letter-spacing:.04em";document.body.appendChild(banner)}
  banner.innerHTML='<div style="font-size:min(5.4vw,34px);margin-bottom:6px">'+A.who.split(" — ")[0]+'</div><div style="font-size:min(3.2vw,17px);font-style:italic;opacity:.92">'+A.line.split("“")[1].replace("”","")+'</div>';banner.style.opacity="1"}
 function effect(name){
  try{const mx=maxHP();
   if(name==="Raphael"){hero.hp=mx;if(C&&C.lines)clog("✦ Raphael heals every wound.")}
   else if(name==="Michael"){hero.hp=Math.min(mx,hero.hp+Math.ceil(mx*.4));if(C&&C.e&&!C.over){const d=Math.ceil(C.e.hp*.85+C.e.max*.15);clog("✦ Michael's sword falls upon "+C.e.name+".");foeDamage(Math.min(d,C.e.hp))}}
   else if(name==="Uriel"){hero.hp=Math.min(mx,hero.hp+Math.ceil(mx*.5));if(hero.maxMana)hero.mana=hero.maxMana;try{if(DG&&DG.s&&DG.s.mz)DG.s.mz.mapAll=1}catch(e){}if(C&&C.e&&!C.over){clog("✦ Uriel's fire scours "+C.e.name+".");foeDamage(Math.min(C.e.hp,Math.ceil(C.e.max*.3)))}}
   else if(name==="Gabriel"){hero.hp=Math.min(mx,hero.hp+Math.ceil(mx*.6));if(hero.maxMana)hero.mana=hero.maxMana;hero.gold=(hero.gold||0)+40;if(C&&C.lines)clog("✦ Gabriel's horn restores your strength (+40 gp).")}
   try{sfx("win")}catch(e){}}catch(e){console.warn("angel fx",e)}}
 function summon(name){try{if(window.MV)MV.angel(name)}catch(e){}
  if(cur||typeof camera==="undefined"||typeof scene==="undefined")return false;
  const A=AN[name];if(!A)return false;mats.length=0;
  const G=body(A,name);const fw=new T.Vector3();camera.getWorldDirection(fw);fw.y=0;if(fw.lengthSq()<1e-4)fw.set(0,0,-1);fw.normalize();
  const D=5.4,x=camera.position.x+fw.x*D,z=camera.position.z+fw.z*D,y0=camera.position.y-1.55;
  G.position.set(x,y0+3,z);G.rotation.y=Math.atan2(-fw.x,-fw.z);G.scale.setScalar(.01);G.traverse(o=>{o.frustumCulled=false;o.renderOrder=8});scene.add(G);
  cur={G,A,name,t:0,x,z,y0,done:0,ms:mats.slice(),fw};
  mats.forEach(m=>{m.userData.base=m.userData.sp!=null?m.userData.sp:1});
  hero.hp=Math.max(hero.hp,Math.ceil(maxHP()*.2));banner_(name,A);try{say&&0}catch(e){}return true}
 const _vu=vmUpdate;vmUpdate=function(dt){_vu(dt);try{tick(dt)}catch(e){console.warn("angel",e);if(cur){try{scene.remove(cur.G)}catch(_){}cur=null}}};
 function tick(dt){
  if(cur){const c=cur,G=c.G;c.t+=dt;const t=c.t;
   const a=t<1.6?t/1.6:(t>6?Math.max(0,1-(t-6)/1.4):1),e=1-Math.pow(1-Math.min(1,t/1.6),3);
   const sc=(.01+e*1.05);G.scale.setScalar(sc*(t>6?1+(t-6)*.1:1));
   G.position.set(c.x+c.fw.x*Math.sin(t*.4)*0,c.y0+(1-e)*3+Math.sin(t*1.6)*.12+(t>6?(t-6)*.9:0)+.25,c.z);
   c.ms.forEach(m=>{m.opacity=a*(m.userData.base||1)});
   const wf=Math.sin(t*2.4)*.12+.1;G.userData.wings.forEach((w,i)=>{w.rotation.z=(i?-1:1)*wf;w.rotation.y=(i?1:-1)*(.15+Math.sin(t*2.4)*.05)});
   G.userData.extra.forEach((o,i)=>{if(o.isSprite)o.scale.setScalar((o.userData.s0||(o.userData.s0=o.scale.x))*(1+.12*Math.sin(t*7+i)));else o.scale.y=1+.2*Math.sin(t*9+i*1.7)});
   if(!c.done&&t>1.5){c.done=1;effect(c.name)}
   if(banner&&t>5.6)banner.style.opacity="0";
   if(t>7.4){scene.remove(G);G.traverse(o=>{if(o.geometry)o.geometry.dispose()});cur=null;lastEnd=performance.now()/1000;try{if(window.__angelFlag)__angelFlag.end=1}catch(e){}}
   return}
  /* trigger: only when really struggling, only now and then */
  const now=performance.now()/1000;if(now-lastEnd<420||now<40)return;
  if(typeof C==="undefined"||!C||C.over||C.won||!C.e||typeof hero==="undefined"||!hero.maxHp)return;
  const f=hero.hp/maxHP();if(f>=.25)return;
  if(C.angR==null)C.angR=0;
  const lvl=f<.1?2:1;if(C.angR>=lvl)return;C.angR=lvl;
  if(Math.random()>(lvl===2?.4:.2))return;
  const w=[["Raphael",1.2+(f<.1?1:0)],["Michael",1.6],["Uriel",1],["Gabriel",1+((hero.maxMana&&hero.mana<hero.maxMana*.25)?1.2:0)]];let tot=0;w.forEach(q=>tot+=q[1]);let r=Math.random()*tot,pick="Michael";for(const q of w){if((r-=q[1])<0){pick=q[0];break}}
  summon(pick)}
 window.ANGEL={seek:t=>{if(cur)cur.t=t},summon,names:Object.keys(AN),active:()=>!!cur};
})();

/* ===== phone controls: a Jump button (a dodge in a real-time fight) and a hold-to-Aim button ===== */
(function(){
 const touch=(window.matchMedia&&matchMedia("(pointer:coarse)").matches)||window.__forceTouch;
 if(!touch)return;
 const cw=document.querySelector(".cw");if(!cw)return;
 const st=document.createElement("style");st.textContent=".tbtn{position:absolute;right:14px;width:62px;height:62px;border-radius:50%;border:2px solid rgba(201,162,74,.65);background:rgba(20,16,12,.55);color:#f0dca0;font:600 13px Georgia,serif;z-index:4;touch-action:none;user-select:none;-webkit-user-select:none;display:none;align-items:center;justify-content:center;text-align:center;line-height:1.1;box-shadow:0 0 10px rgba(0,0,0,.5)}.tbtn.on{display:flex}.tbtn:active,.tbtn.dn{background:rgba(201,162,74,.65);color:#1a1208}#tjump{bottom:96px}#taim{bottom:164px}";document.head.appendChild(st);
 const mk=(id,txt)=>{const b=document.createElement("div");b.id=id;b.className="tbtn";b.textContent=txt;cw.appendChild(b);return b};
 const jb=mk("tjump","Jump"),ab=mk("taim","Aim");
 const rt=()=>typeof C!=="undefined"&&C&&C.rt&&!C.over;
 jb.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();jb.classList.add("dn");try{if(rt()){window.__rt&&__rt.dodge()}else if(window.JMP)JMP.go()}catch(x){}});
 const jup=()=>jb.classList.remove("dn");jb.addEventListener("pointerup",jup);jb.addEventListener("pointercancel",jup);jb.addEventListener("pointerleave",jup);
 const aim=v=>{try{if(window.TP)TP.aimOn=v}catch(x){}ab.classList.toggle("dn",!!v)};
 ab.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();try{ab.setPointerCapture(e.pointerId)}catch(x){}aim(1)});
 ["pointerup","pointercancel","lostpointercapture"].forEach(ev=>ab.addEventListener(ev,()=>aim(0)));
 setInterval(()=>{const live=typeof hero!=="undefined"&&hero&&!(typeof D!=="undefined"&&D)&&!(typeof packOpen!=="undefined"&&packOpen)&&!(typeof occOpen!=="undefined"&&occOpen);
  const st0=document.getElementById("start");const started=!st0||!st0.offsetParent;
  jb.classList.toggle("on",!!(live&&started));ab.classList.toggle("on",!!(live&&started&&rt()))},400);
})();

/* ===== third-person battle camera: damped over-the-shoulder follow, full animated hero ===== */
(function(){
 if(typeof THREE==="undefined"||!window.__fig||!window.RT)return;
 const TP=window.TP={on:1,lock:1,b:0,F:null,key:"",dist:3.1,h:.55,side:.55,kp:7.5,kl:16,pos:null,look:null,yaw:0,lastSw:-1,lastCast:0,lastShake:0,lx:0,lz:0,spd:0,dead:0,wasDead:0};
 const SKIN={Human:0xd9a77c,Dwarf:0xcf9a74,Elf:0xe6c3a0,Halfling:0xdcab82,Gnome:0xd4a37a,"Half-Elf":0xe0b48e,"Half-Orc":0xa89a6a};
 function kind(){const w=(hero.eq&&hero.eq.w)||"";
  if(/Dagger|knife/i.test(w))return"Dagger";if(/staff|wand|bow/i.test(w))return"Staff";if(/Mace|hammer|club/i.test(w))return"Club";
  return{Paladin:"Club",Cleric:"Club",Rogue:"Dagger",Magician:"Staff",Ranger:"Dagger"}[hero.cls]||"Sword"}
 function build(){
  const k=kind(),cl=(typeof JOBS_CLS!=="undefined"&&JOBS_CLS[hero.cls])||0x6a5a4a,acc=[k];if(hero.eq&&hero.eq.s)acc.push("Shield");
  const F=window.__fig({g:"m",outfit:"peasant",skin:SKIN[hero.race]||SKIN.Human,cloth:cl,pants:0x3a2e22,hair:0x3a2818,hairStyle:"simple",acc,face:1,s:1,w:1,fseed:7});
  if(F&&F.g){F.g.traverse(o=>{if(o.isMesh)o.frustumCulled=false});scene.add(F.g)}return F}
 function ease(a,b,k,dt){return a+(b-a)*(1-Math.exp(-k*dt))}
 const _vu=vmUpdate,tmp=new THREE.Vector3(),fwd=new THREE.Vector3(),rgt=new THREE.Vector3(),want=new THREE.Vector3(),lk=new THREE.Vector3();
 vmUpdate=function(dt){
  _vu(dt);
  try{
   if(TP.fov0==null)TP.fov0=camera.fov;
   const eng=!!(TP.on&&C&&C.rt&&window.__HUM&&window.__HUM.ok&&hero);
   TP.b=ease(TP.b,eng?1:0,eng?5:4,dt);if(Math.abs(TP.b-(eng?1:0))<.01)TP.b=eng?1:0;
   if(TP.b<=0){if(camera.fov!==TP.fov0){camera.fov=TP.fov0;camera.updateProjectionMatrix()}TP.n=1;if(TP.F)TP.F.g.visible=false;if(!window.HQ.on){window.HQ.on=1}TP.pos=null;return}
   const key=kind()+"|"+((hero.eq&&hero.eq.s)||"")+"|"+hero.cls+"|"+hero.race;
   if(key!==TP.key||!TP.F){if(TP.F)scene.remove(TP.F.g);TP.F=build();TP.key=key;if(!TP.F)return;TP.F.play(kind()==="Sword"?"idle":"idle")}
   const F=TP.F;window.HQ.on=0;window.HQ.vis&&window.HQ.vis(false);vmG.visible=false;F.g.visible=true;
   // hero placement from base camera
   const c0=camera.position,bx=c0.x,bz=c0.z;
   const feetY=(DG?0:Math.max(hfn(P.x,P.z),-.45))+(window.JMP?JMP.y:0);
   const sp=Math.hypot(bx-TP.lx,bz-TP.lz)/Math.max(dt,.001);TP.lx=bx;TP.lz=bz;TP.spd=ease(TP.spd,Math.min(sp,9),10,dt);
   F.g.position.set(bx,feetY,bz);
   // body faces the aim, turning smoothly
   const want_y=yaw+Math.PI;let d=want_y-TP.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));TP.yaw+=d*(1-Math.exp(-14*dt));F.g.rotation.y=TP.yaw;
   // animation triggers
   const sw=vmSwing,cs=vmCast;
   if(RT.dead>0&&!TP.wasDead){F.cur="";F.play("die")}
   TP.wasDead=RT.dead>0;
   if(RT.dead<=0){
    if(sw>=0&&TP.lastSw<0){F.cur="";F.play("attack",1.9)}
    else if(cs>0&&TP.lastCast<=0){F.cur="";F.play("cast",1.6)}
    else if(typeof shakeT!=="undefined"&&shakeT>.3&&TP.lastShake<=.3){F.cur="";F.play("hit",1.5)}
    else if(F.one<=0){const mv=TP.spd>.6;F.play(mv?(TP.spd>5?"run":"walk"):"idle",mv?Math.max(.8,Math.min(1.8,TP.spd/2.6)):1)}
   }
   TP.lastSw=sw;TP.lastCast=cs;TP.lastShake=typeof shakeT!=="undefined"?shakeT:0;
   F.update(dt);
   // damped camera
   camera.getWorldDirection(fwd);rgt.crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();
   /* crowd awareness: more monsters nearby -> pull back and widen the view so flankers are visible */
   {let n=1;(window.__ROAM||[]).forEach(r=>{if(r.F&&r.F.g&&r.F.g.visible&&!r.dead&&Math.hypot(P.x-r.F.g.position.x,P.z-r.F.g.position.z)<20)n++});
    TP.n=ease(TP.n||1,n,1.6,dt);const kk=Math.max(0,Math.min(1,(TP.n-1)/2));TP.kk=kk;
    const tf=TP.fov0+16*kk*TP.b;if(Math.abs(camera.fov-tf)>.03){camera.fov=tf;camera.updateProjectionMatrix()}}
   /* aim mode (hold right mouse / Z): slide in tight over the right shoulder, zoom, slow the turn rate */
   TP.aim=ease(TP.aim||0,(TP.aimOn&&C&&C.rt&&!C.over&&RT.dead<=0)?1:0,9,dt);if(TP.aim<.003)TP.aim=0;
   {const tf2=camera.fov-9*TP.aim*TP.b;if(TP.aim>0&&TP.b>0){camera.fov=tf2;camera.updateProjectionMatrix()}
    const ch=document.getElementById("tpx");if(ch)ch.style.opacity=(TP.aim*TP.b).toFixed(2)}
   const dist=(DG?1.9*(1+.2*(TP.kk||0)):TP.dist*(1+.4*(TP.kk||0)))*(1-.58*TP.aim),hd=new THREE.Vector3(fwd.x,0,fwd.z).normalize();
   const head=tmp.set(bx,feetY+1.55,bz);
   want.copy(head).addScaledVector(fwd,-dist).addScaledVector(rgt,(DG?.35:TP.side)+.38*TP.aim);want.y+=TP.h*(DG?.5:1)*(1-.45*TP.aim);
   if(!DG&&want.y<hfn(want.x,want.z)+.35)want.y=hfn(want.x,want.z)+.35;
   lk.copy(head).addScaledVector(fwd,8).addScaledVector(rgt,.15*(1-TP.aim));lk.y=head.y+fwd.y*8-.15;
   /* target lock-on: frame hero and foe together, turn the hero toward the foe */
   TP.lk=ease(TP.lk||0,(!TP.aimOn&&TP.lock&&C&&C.rt&&!C.over&&fx3&&fx3.g&&RT.dead<=0)?1:0,5,dt);
   if(TP.lk>.01){const fc=fx3.ctr(),hx=fc.x-bx,hz=fc.z-bz,sep=Math.max(1.2,Math.hypot(hx,hz)),dx=hx/sep,dz=hz/sep;
    const ld=Math.max(DG?2.2:3.2,Math.min(DG?4.5:8.5,(DG?1.8:2.3)+sep*.4)),sd=new THREE.Vector3(-dz,0,dx);   /* right-hand side of the hero->foe line */
    const lw=new THREE.Vector3(bx-dx*ld,head.y+(DG?.5:.9)+sep*.1,bz-dz*ld).addScaledVector(sd,DG?.4:.85);
    if(!DG&&lw.y<hfn(lw.x,lw.z)+.35)lw.y=hfn(lw.x,lw.z)+.35;
    const mid=new THREE.Vector3((bx*.55+fc.x*.45),(head.y*.6+fc.y*.4),(bz*.55+fc.z*.45));
    want.lerp(lw,TP.lk);lk.lerp(mid,TP.lk);
    const yt=Math.atan2(-dx,-dz);let dy=yt-yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));yaw+=dy*(1-Math.exp(-5.5*dt))*TP.lk;
    pitch+=(-.1-pitch)*(1-Math.exp(-2.5*dt))*TP.lk*.6}
   /* obstruction: march from the hero's head toward the wanted camera spot; stop short of walls, pillars, steep ground and room edges */
   {let free=1;const N=14,o=head,dv=want.clone().sub(o);
    for(let i=1;i<=N;i++){const sf=i/N,px=o.x+dv.x*sf,py=o.y+dv.y*sf,pz=o.z+dv.z*sf;let hit=false;
     if(DG){try{const dm=DIMS[DG.s.r],w=dm[0],d=dm[1];hit=px<-w/2+.45||px>w/2-.45||pz<-d/2+.45||pz>d/2-.3}catch(x){}}
     else{try{hit=blocked(px,pz,.3)||hfn(px,pz)+.28>py}catch(x){}}
     if(hit){free=Math.max(0,(i-1.6)/N);break}}
    free=Math.max(.14,free);
    TP.fr=TP.fr==null?free:(free<TP.fr?ease(TP.fr,free,16,dt):ease(TP.fr,free,2.6,dt));
    want.copy(o).addScaledVector(dv,Math.min(1,TP.fr));
    F.g.visible=TP.fr>.3||true;F.g.traverse(q=>{if(q.isSkinnedMesh)q.visible=TP.fr>.22})}
   if(!TP.pos){TP.pos=new THREE.Vector3().copy(c0);TP.look=new THREE.Vector3().copy(lk)}
   TP.pos.x=ease(TP.pos.x,want.x,TP.kp,dt);TP.pos.y=ease(TP.pos.y,want.y,TP.kp,dt);TP.pos.z=ease(TP.pos.z,want.z,TP.kp,dt);
   TP.look.x=ease(TP.look.x,lk.x,TP.kl,dt);TP.look.y=ease(TP.look.y,lk.y,TP.kl,dt);TP.look.z=ease(TP.look.z,lk.z,TP.kl,dt);
   // blend from first-person
   const b=TP.b,e=b*b*(3-2*b);
   const base=c0.clone(),fp=new THREE.Quaternion().copy(camera.quaternion);
   c0.copy(base).lerp(TP.pos,e);
   const m=new THREE.Matrix4().lookAt(c0,TP.look,new THREE.Vector3(0,1,0)),q=new THREE.Quaternion().setFromRotationMatrix(m);
   camera.quaternion.copy(fp).slerp(q,e);
   if(b<.35){const hide=b>0&&TP.b<.35;}
  }catch(e){if(!TP.err){TP.err=1;console.warn("TP",e)}}
 };
addEventListener("keydown",e=>{if(e.code==="Tab"&&C&&C.rt&&TP.b>.5){e.preventDefault();TP.lock=TP.lock?0:1;try{note(TP.lock?"Target lock: on (Tab)":"Target lock: off (Tab)")}catch(x){}}});
addEventListener("keydown",e=>{if(e.code==="KeyC"&&!e.ctrlKey&&!e.metaKey&&!/INPUT|TEXTAREA/.test((e.target&&e.target.tagName)||"")){TP.on=TP.on?0:1;try{note(TP.on?"Battle view: third person (C to switch)":"Battle view: first person (C to switch)")}catch(x){}}});

 {const d=document.createElement("div");d.id="tpx";d.style.cssText="position:fixed;left:50%;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border:1px solid #d33;border-radius:50%;box-shadow:0 0 6px #d33;pointer-events:none;opacity:0;z-index:30";document.body.appendChild(d)}
 addEventListener("keydown",e=>{if(e.code==="KeyZ"&&!e.repeat)TP.aimOn=1});
 addEventListener("keyup",e=>{if(e.code==="KeyZ")TP.aimOn=0});
 addEventListener("blur",()=>{TP.aimOn=0});
})();

/* ===== trauma camera shake: smooth noise, quadratic response, steady decay, tightly capped ===== */
(function(){
 const TR=window.TRAUMA={t:0,time:0,decay:1.0,maxYaw:.032,maxPitch:.028,maxRoll:.04,maxOff:.045,freq:19,lastS:0,lastCast:0,on:1};
 const fade=t=>t*t*t*(t*(t*6-15)+10);
 const hash=(i,s)=>{let h=(i*374761393+s*668265263)|0;h=(h^(h>>>13))*1274126177|0;return(((h^(h>>>16))>>>0)/4294967295)*2-1};
 function noise(x,s){const i=Math.floor(x),f=x-i,a=hash(i,s)*f,b=hash(i+1,s)*(f-1);return(a+(b-a)*fade(f))*2}   /* 1D gradient (Perlin) noise, about -1..1 */
 window.induceTrauma=TR.induce=function(a){TR.t=Math.min(1,TR.t+Math.max(0,a||0))};
 const _vu=vmUpdate,qq=new THREE.Quaternion(),ee=new THREE.Euler();
 vmUpdate=function(dt){
  _vu(dt);
  try{
   if(typeof shakeT!=="undefined"){if(shakeT>TR.lastS+.02)TR.induce(.3+shakeT*.5);TR.lastS=shakeT}
   if(typeof vmCast!=="undefined"){if(vmCast>0&&TR.lastCast<=0)TR.induce(.12);TR.lastCast=vmCast}
   if(!TR.on||TR.t<=.001){TR.t=Math.max(0,TR.t-dt*TR.decay);return}
   TR.time+=dt;TR.t=Math.max(0,TR.t-dt*TR.decay);
   const k=TR.t*TR.t,x=TR.time*TR.freq;
   ee.set(noise(x,11)*TR.maxPitch*k,noise(x,23)*TR.maxYaw*k,noise(x,37)*TR.maxRoll*k,"YXZ");
   qq.setFromEuler(ee);camera.quaternion.multiply(qq);
   camera.position.x+=noise(x,41)*TR.maxOff*k;camera.position.y+=noise(x,53)*TR.maxOff*k*.6;
  }catch(e){if(!TR.err){TR.err=1;console.warn("TRAUMA",e)}}
 };
})();

/* ===== analogue-horror / 16-bit crush: applied mostly to the monsters (silhouette mask), driven by danger ===== */
(function(){
 if(typeof POST==="undefined")return;
 const HZ=window.HZ={dbgPass:1,on:1,v:0,tgt:0,lv:20,dbg:-1,rt:null,w:0,h:0};
 function patch(){
  const m=POST.mComp;if(!m||m.userData.hzz)return;m.userData.hzz=1;
  let f=m.fragmentShader;
  f=f.replace("uniform float exp,","uniform float hzz,hlv;uniform float exp,");
  f=f.replace("void main(){","float mk1(vec2 p){float a=texture2D(tS,p).a;return smoothstep(.3,.42,a)*(1.-smoothstep(.58,.7,a));}float mk(vec2 p){return mk1(p)*mk1(p+vec2(tpx.x*1.5,0.))*mk1(p-vec2(tpx.x*1.5,0.))*mk1(p+vec2(0.,tpx.y*1.5))*mk1(p-vec2(0.,tpx.y*1.5));}float bay(vec2 p){p=mod(floor(p),2.);return p.x<.5?(p.y<.5?0.:.75):(p.y<.5?.5:.25);}void main(){");
  f=f.replace("gl_FragColor=vec4(col,1.);}",
   "if(hzz>.01){"+
   "vec2 R=mix(vec2(1920.,1080.),vec2(400.,225.),min(1.,hzz*1.3));vec2 uvM=(floor(vUv*R)+.5)/R;"+
   "float bp=fract(time*.11),tear=1./(1.+pow((vUv.y-bp)*26.,2.));uvM.x+=tear*.012*hzz+(hash(vec2(floor(vUv.y*R.y),floor(time*9.)))-.5)*.003*hzz;"+
   "vec2 o=vec2(.0045,.008);float m0=mk(vUv);"+
   "float ring=max(max(mk(vUv+vec2(o.x,0.)),mk(vUv-vec2(o.x,0.))),max(mk(vUv+vec2(0.,o.y)),mk(vUv-vec2(0.,o.y))));"+
   "float Lb=dot(col,vec3(.299,.587,.114));col=mix(vec3(Lb),col,1.-.4*hzz);col*=mix(vec3(1.),vec3(.82,.72,.72),hzz);col*=1.-smoothstep(.08,.5,r2*1.5)*.5*hzz;"+
   "vec3 cm=texture2D(tS,uvM).rgb*exp;cm=clamp((cm*(2.51*cm+.03))/(cm*(2.43*cm+.59)+.14),0.,1.);"+
   "float Lm=dot(cm,vec3(.299,.587,.114));cm=mix(vec3(Lm),cm,.4);cm*=vec3(1.05,.62,.55);cm=pow(max(cm,0.),vec3(1.5))*1.1;"+
   "cm=floor(cm*hlv+bay(uvM*R))/hlv;cm*=.85+.15*step(.5,fract(uvM.y*R.y*.5));cm+=(hash(uvM*R+time)-.5)*.12;cm*=.92+.08*hash(vec2(floor(time*14.),1.));"+
   "float mm=mk(uvM);col=mix(col,cm,mm);"+
   "float halo=clamp(ring-m0,0.,1.);col=mix(col,vec3(.5,.03,.04)*(.7+.3*hash(vec2(floor(time*10.),2.))),halo*hzz*.85);"+
   "}gl_FragColor=vec4(col,1.);}");
  m.fragmentShader=f;m.uniforms.hzz={value:0};m.uniforms.hlv={value:HZ.lv};m.needsUpdate=true}
 try{patch()}catch(e){console.warn("hzz",e)}
 const _ip=initPost;try{initPost=function(){_ip();try{patch()}catch(e){}}}catch(e){}
 function markFoe(g){if(g.userData._mk)return;g.userData._mk=1;g.traverse(o=>{if(!o.isMesh)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(!m||m.transparent||/Hair/.test(m.name||"")||m.userData._mk)return;m.userData._mk=1;m.opacity=.5;if(m.alphaTest)m.alphaTest*=.5})})}
 function foes(){const a=[];if(typeof C!=="undefined"&&C&&C.rt&&fx3&&fx3.g&&fx3.g.parent)a.push(fx3.g);(window.__ROAM||[]).forEach(r=>{if(r.F&&r.F.g&&r.F.g.visible)a.push(r.F.g)});return a}
 const _pr=postRender;
 postRender=function(t){
  try{
   patch();try{renderer.setClearAlpha(1)}catch(e){}const m=POST.mComp;if(m&&m.uniforms.hzz){
    const dt=Math.min(.1,Math.max(.001,(performance.now()-(HZ.t0||performance.now()))/1000));HZ.t0=performance.now();
    let tg=0;
    if(HZ.on&&hero&&typeof C!=="undefined"){
     const safe=window.RT&&RT.safe&&!DG&&RT.safe(P.x,P.z);
     if(C&&C.rt)tg=.95;
     else{let dmin=99;(window.__ROAM||[]).forEach(r=>{if(r.F&&r.F.g&&r.F.g.visible){const d=Math.hypot(P.x-r.F.g.position.x,P.z-r.F.g.position.z);if(d<dmin)dmin=d}});
      tg=dmin<34?Math.min(.85,(34-dmin)/16):0}
     if(safe&&!(C&&C.rt))tg=0;
     if(hero.maxHp&&hero.hp/hero.maxHp<.35)tg=Math.min(1,tg+.15)}
    if(HZ.spike>0){tg=Math.min(1,Math.max(tg,.4)+HZ.spike*.5);HZ.spike=Math.max(0,HZ.spike-dt*.8)}
    if(HZ.dbg>=0)tg=HZ.dbg;
    HZ.v+=(tg-HZ.v)*(1-Math.exp(-(tg>HZ.v?3:1.2)*dt));if(Math.abs(HZ.v-tg)<.005)HZ.v=tg;
    m.uniforms.hzz.value=HZ.v;m.uniforms.hlv.value=HZ.lv;
    if(HZ.v>.01)foes().forEach(markFoe);
   }
  }catch(e){if(!HZ.err){HZ.err=1;console.warn("HZ",e)}}
  return _pr(t)};
 addEventListener("keydown",e=>{if(e.code==="KeyX"&&!e.ctrlKey&&!/INPUT|TEXTAREA/.test((e.target&&e.target.tagName)||"")){HZ.on=HZ.on?0:1;try{note(HZ.on?"Horror filter: on (X)":"Horror filter: off (X)")}catch(x){}}});
})();

/* ===== dread: heartbeat, drone and whispers rise as monsters near; hallucination flashes ===== */
(function(){
 const AC=window.AudioContext||window.webkitAudioContext;
 const D=window.DREAD={x:null,danger:0,on:1,nextBeat:0,nextWhisper:0,nextHal:20};
 const lines=["…behind you…","It knows your name.","Do not look back.","Closer.","You were never alone here.","It is counting your breaths.","Turn around. Turn around.","The eyes remember you."];
 let master,droneG,noise;
 function enabled(){try{return localStorage.getItem("occultica.sfx.on")!=="0"}catch(e){return true}}
 function init(){
  if(D.x||!AC)return;D.x=new AC();const X=D.x;
  master=X.createGain();master.gain.value=0;master.connect(X.destination);
  droneG=X.createGain();droneG.gain.value=0;droneG.connect(master);
  [[36,"sine"],[38.7,"triangle"],[72.5,"sine"]].forEach(([f,t],i)=>{const o=X.createOscillator();o.type=t;o.frequency.value=f;const g=X.createGain();g.gain.value=i===2?.25:1;o.connect(g);g.connect(droneG);o.start()});
  const n=X.sampleRate*2,b=X.createBuffer(1,n,X.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;noise=b;
  master.gain.setTargetAtTime(1,X.currentTime,.5)}
 ["pointerdown","keydown"].forEach(ev=>addEventListener(ev,()=>{init();if(D.x&&D.x.state==="suspended")D.x.resume()},{passive:true}));
 function beat(t,amp){const X=D.x,o=X.createOscillator(),g=X.createGain();o.type="sine";o.frequency.setValueAtTime(70,t);o.frequency.exponentialRampToValueAtTime(38,t+.12);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(amp,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g);g.connect(master);o.start(t);o.stop(t+.25)}
 function whisper(amp){const X=D.x,s=X.createBufferSource();s.buffer=noise;s.loop=true;const bp=X.createBiquadFilter();bp.type="bandpass";bp.frequency.value=1400+Math.random()*2200;bp.Q.value=4+Math.random()*4;
  const g=X.createGain(),t=X.currentTime;g.gain.value=0;const syl=3+((Math.random()*4)|0);let tt=t;for(let i=0;i<syl;i++){const l=.07+Math.random()*.12;g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(amp*(.5+Math.random()*.7),tt+l*.4);g.gain.linearRampToValueAtTime(0,tt+l);tt+=l+.03+Math.random()*.06;if(Math.random()<.2)tt+=.2}
  const pn=X.createStereoPanner?X.createStereoPanner():null;if(pn){pn.pan.value=Math.random()*2-1;s.connect(bp);bp.connect(g);g.connect(pn);pn.connect(master)}else{s.connect(bp);bp.connect(g);g.connect(master)}s.start(t);s.stop(tt+.1)}
 function dangerNow(){
  if(typeof hero==="undefined"||!hero)return 0;
  if(typeof C!=="undefined"&&C&&C.rt)return C.near?1:.7;
  let dm=99;(window.__ROAM||[]).forEach(r=>{if(r.F&&r.F.g&&r.F.g.visible){const d=Math.hypot(P.x-r.F.g.position.x,P.z-r.F.g.position.z);if(d<dm)dm=d}});
  let v=dm<42?Math.min(1,(42-dm)/34):0;
  if(window.RT&&RT.safe&&!DG&&RT.safe(P.x,P.z))v=0;
  if(typeof DG!=="undefined"&&DG)v=Math.max(v,.25);
  return v}
 setInterval(()=>{
  try{
   const dg=D.on&&enabled()?dangerNow():0;D.danger+=(dg-D.danger)*.25;
   if(!D.x||D.x.state!=="running")return;
   const X=D.x,t=X.currentTime,v=D.danger;
   droneG.gain.setTargetAtTime(v>.05?Math.pow(v,1.4)*.22:0,t,.4);
   if(v>.1&&document.visibilityState==="visible"){
    if(D.nextBeat<t){const bpm=52+v*88,per=60/bpm;beat(t+.02,.18+v*.5);beat(t+.02+per*.3,.1+v*.3);D.nextBeat=t+per}
    if(v>.3&&D.nextWhisper<t){whisper(.035+v*.08);D.nextWhisper=t+1.5+Math.random()*(6-v*4)}
   }
   D.nextHal-=.12;if(D.nextHal<=0){D.nextHal=18+Math.random()*30;
    if(v>.35&&!(typeof C!=="undefined"&&C)&&typeof hero!=="undefined"&&hero){if(window.HZ)HZ.spike=1.2;try{flash("rgba(110,0,10,.28)")}catch(e){}if(Math.random()<.6){try{note(lines[(Math.random()*lines.length)|0])}catch(e){}}if(window.DREAD&&D.x)whisper(.12)}}
  }catch(e){}
 },120);
})();

/* ===== texup: higher-resolution, more detailed stone and ground textures (all procedural, nothing to download) ===== */
(function(){
 if(typeof brickTex==="undefined"||typeof flagTex==="undefined"||typeof noiseTex==="undefined")return;
 const R=(()=>{let s=1234567;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}})();
 const aniso=()=>{try{return Math.min(8,renderer.capabilities.getMaxAnisotropy())}catch(e){return 4}};
 function fin(c){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;try{t.anisotropy=aniso()}catch(e){}return t}
 /* grain, speckle and mottling pass, shared */
 function grain(g,w,amt,seed){const d=g.getImageData(0,0,w,w),p=d.data;
  for(let y=0;y<w;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,n=vn(x*.02+seed,y*.02)*.5+vn(x*.07,y*.07+seed)*.3+vn(x*.25,y*.25)*.2,f=1+(n-.5)*amt+(R()-.5)*amt*.35;p[i]=Math.max(0,Math.min(255,p[i]*f));p[i+1]=Math.max(0,Math.min(255,p[i+1]*f));p[i+2]=Math.max(0,Math.min(255,p[i+2]*f))}
  g.putImageData(d,0,0)}
 function cracks(g,w,n,len,col){g.strokeStyle=col;g.lineCap="round";for(let i=0;i<n;i++){let x=R()*w,y=R()*w,a=R()*6.28;g.lineWidth=1+R()*2.2;g.beginPath();g.moveTo(x,y);const L=len*(.4+R());for(let s=0;s<L;s+=8){a+=(R()-.5)*.9;x+=Math.cos(a)*8;y+=Math.sin(a)*8;g.lineTo(x,y)}g.stroke()}}
 function stains(g,w){/* damp streaks running down from the top of each course and green moss low down */
  for(let i=0;i<26;i++){const x=R()*w,y=R()*w*.8,l=60+R()*220,wd=6+R()*26,gr=g.createLinearGradient(0,y,0,y+l);gr.addColorStop(0,"rgba(10,14,10,.0)");gr.addColorStop(.2,"rgba(10,16,10,"+(.1+R()*.14)+")");gr.addColorStop(1,"rgba(10,14,10,0)");g.fillStyle=gr;g.fillRect(x,y,wd,l)}
  for(let i=0;i<22;i++){const x=R()*w,y=R()*w,r=20+R()*70,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,"rgba(58,86,38,"+(.18+R()*.2)+")");gr.addColorStop(1,"rgba(58,86,38,0)");g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}}
 function chips(g,w,n){for(let i=0;i<n;i++){const x=R()*w,y=R()*w,r=3+R()*9;g.fillStyle="rgba(8,6,4,"+(.25+R()*.35)+")";g.beginPath();for(let k=0;k<6;k++){const a=k/6*6.283,rr=r*(.5+R()*.7);k?g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.7):g.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*.7)}g.fill()}}
 /* a single rounded block: lit top-left edge, shaded bottom-right edge, soft face */
 function block(g,x,y,bw,bh,r,gp,b,mort){
  g.fillStyle=`rgb(${r+b},${r+b-4},${r+b-12})`;const rad=Math.min(14,bw*.06);
  g.beginPath();g.moveTo(x+rad,y);g.lineTo(x+bw-rad,y);g.quadraticCurveTo(x+bw,y,x+bw,y+rad);g.lineTo(x+bw,y+bh-rad);g.quadraticCurveTo(x+bw,y+bh,x+bw-rad,y+bh);g.lineTo(x+rad,y+bh);g.quadraticCurveTo(x,y+bh,x,y+bh-rad);g.lineTo(x,y+rad);g.quadraticCurveTo(x,y,x+rad,y);g.fill();
  const hi=g.createLinearGradient(x,y,x+bw*.55,y+bh*.9);hi.addColorStop(0,"rgba(255,248,230,.20)");hi.addColorStop(.45,"rgba(255,248,230,0)");hi.addColorStop(1,"rgba(0,0,0,.26)");g.fillStyle=hi;g.fill();
  g.lineWidth=3;g.strokeStyle="rgba(0,0,0,.35)";g.stroke()}
 const BIG=()=>{try{return qual>=3}catch(e){return false}};
 brickTex=function(){if(tex.b&&tex.b.__hi)return tex.b;const w=BIG()?1024:512,K=w/1024;c=document.createElement("canvas");c.width=c.height=w;const g=c.getContext("2d");
  g.fillStyle="#17130f";g.fillRect(0,0,w,w);
  const rows=8,rh=w/rows;for(let r=0;r<rows;r++){const y=r*rh,off=(r%2)*128;for(let x=-256;x<w;x+=256){const sh=Math.floor((R()-.5)*40),tone=R();const base=132+sh;
    block(g,x+off+6,y+6,244,rh-12,base,0,(tone>.8?-14:tone<.15?10:0),0)}}
  cracks(g,w,16,160,"rgba(10,8,6,.55)");chips(g,w,70);stains(g,w);grain(g,w,.36,3.7);
  const t=fin(c);t.__hi=1;return tex.b=t};
 flagTex=function(){if(tex.f&&tex.f.__hi)return tex.f;const w=BIG()?1024:512,K=w/1024;c=document.createElement("canvas");c.width=c.height=w;const g=c.getContext("2d");
  g.fillStyle="#13100d";g.fillRect(0,0,w,w);
  for(let r=0;r<4;r++)for(let q=0;q<4;q++){const sh=Math.floor((R()-.5)*34);const x=q*256+(r%2?64:0),y=r*256;
   for(const ox of[0,-1024]){block(g,x+ox+7,y+7,242,242,124+sh,0,0,0)}
   /* worn centre */const wg=g.createRadialGradient(x+128,y+128,10,x+128,y+128,130);wg.addColorStop(0,"rgba(255,245,225,.10)");wg.addColorStop(1,"rgba(0,0,0,.10)");g.fillStyle=wg;g.fillRect(x+7,y+7,242,242)}
  cracks(g,w,22,200,"rgba(8,6,4,.6)");chips(g,w,90);stains(g,w);grain(g,w,.42,9.1);
  const t=fin(c);t.__hi=1;return tex.f=t};
 /* terrain detail map: more octaves and 4x the pixels */
 const _nt=noiseTex;
 noiseTex=function(w,seed,rep,bright){const S=Math.max(w,512),k=128/S*(w>=256?w/128:1),c=document.createElement("canvas");c.width=c.height=S;const g=c.getContext("2d"),d=g.createImageData(S,S);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const n=(vn(x*.09*k+seed,y*.09*k)*.45+vn(x*.3*k,y*.3*k+seed)*.3+vn(x*.9*k,y*.9*k)*.12+Math.random()*.13),v=Math.floor((bright?170:90)+n*(bright?85:150));const i=(y*S+x)*4;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
  g.putImageData(d,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;try{t.anisotropy=aniso()}catch(e){}t.repeat.set(rep[0],rep[1]);return t};
})();

/* ===== post2: valley mist (height fog), sun shafts, and ambient occlusion in the dungeons ===== */
(function(){
 if(typeof THREE==="undefined"||typeof postRender==="undefined")return;
 const SC=THREE.ShaderChunk;
 /* ---- 1. height fog: thicker in hollows and near the floor, thinner up high ---- */
 SC.fog_pars_vertex=SC.fog_pars_vertex.replace("varying float fogDepth;","varying float fogDepth;\n\tvarying float fogY;");
 SC.fog_vertex=SC.fog_vertex.replace("fogDepth = - mvPosition.z;","fogDepth = - mvPosition.z;\n\tfogY = cameraPosition.y + viewMatrix[0][1]*mvPosition.x + viewMatrix[1][1]*mvPosition.y + viewMatrix[2][1]*mvPosition.z;");
 SC.fog_pars_fragment=SC.fog_pars_fragment.replace("varying float fogDepth;","varying float fogDepth;\n\tvarying float fogY;");
 SC.fog_fragment=SC.fog_fragment.replace("gl_FragColor.rgb = mix(","fogFactor = clamp( fogFactor * ( 1.0 + 1.9 * exp( - max( fogY, 0.0 ) * 0.17 ) ), 0.0, 1.0 );\n\tgl_FragColor.rgb = mix(");
 const P2=window.POST2={shafts:0,ao:0,aoK:.85,shK:.55};
 const vs="varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}";
 let shaft=null,aoMat=null,blurMat=null,mulMat=null,dRT=null,aRT=null,bRT=null,dMat=null,dw=0,dh=0;
 function mats(){if(shaft)return;
  shaft=new THREE.ShaderMaterial({vertexShader:vs,uniforms:{t:{value:null},sun:{value:new THREE.Vector2(.5,.8)},k:{value:0},tint:{value:new THREE.Color(1,.88,.66)}},
   fragmentShader:"uniform sampler2D t;uniform vec2 sun;uniform float k;uniform vec3 tint;varying vec2 vUv;"+
    "void main(){vec2 d=(sun-vUv)*.92/24.;vec2 uv=vUv;float acc=0.,w=1.;"+
    "for(int i=0;i<24;i++){uv+=d;vec3 c=texture2D(t,uv).rgb;float l=max(c.r,max(c.g,c.b));acc+=smoothstep(.78,1.25,l)*w;w*=.962;}"+
    "float fall=smoothstep(1.5,.0,length((vUv-sun)*vec2(1.7,1.)));gl_FragColor=vec4(tint*acc/24.*k*fall*2.2,1.);}",
   blending:THREE.AdditiveBlending,transparent:true,depthTest:false,depthWrite:false});
  aoMat=new THREE.ShaderMaterial({vertexShader:vs,uniforms:{tD:{value:null},px:{value:new THREE.Vector2(1,1)},near:{value:.1},far:{value:100},fy:{value:400},rad:{value:.75},k:{value:.85}},
   fragmentShader:"#include <packing>\nuniform sampler2D tD;uniform vec2 px;uniform float near,far,fy,rad,k;varying vec2 vUv;"+
    "float L(vec2 uv){return -perspectiveDepthToViewZ(unpackRGBAToDepth(texture2D(tD,uv)),near,far);}"+
    "float hh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}"+
    "void main(){float l0=L(vUv);if(l0>far*.9){gl_FragColor=vec4(1.);return;}"+
    "float rp=clamp(rad*fy/l0,3.,70.);float nr=0.,fr=0.;float a0=hh(gl_FragCoord.xy)*6.283;float bias=.03+l0*.012;"+
    "for(int i=0;i<16;i++){float fi=float(i);float a=a0+fi*2.39996;float r=rp*(.2+.8*fract(fi*.618));"+
    "vec2 o=vec2(cos(a),sin(a))*r*px;float ls=L(vUv+o);float dz=l0-ls;float w=smoothstep(rad*2.4,rad*.5,abs(dz));nr+=step(bias,dz)*w;fr+=step(bias,-dz)*w;}"+
    "float occ=max(0.,nr-fr*.9)/16.;float ao=1.-clamp(occ*2.4,0.,1.)*k;gl_FragColor=vec4(vec3(ao),1.);}",
   blending:THREE.NoBlending,depthTest:false,depthWrite:false});
  blurMat=new THREE.ShaderMaterial({vertexShader:vs,uniforms:{tA:{value:null},tD:{value:null},d:{value:new THREE.Vector2(1,0)},near:{value:.1},far:{value:100}},fragmentShader:"#include <packing>\nuniform sampler2D tA,tD;uniform vec2 d;uniform float near,far;varying vec2 vUv;float L(vec2 uv){return -perspectiveDepthToViewZ(unpackRGBAToDepth(texture2D(tD,uv)),near,far);}void main(){float l0=L(vUv);float s=texture2D(tA,vUv).r,w=1.;for(int i=-5;i<=5;i++){if(i==0)continue;vec2 uv=vUv+d*float(i);float li=L(uv);float wi=exp(-float(i*i)*.09)*step(abs(li-l0),.12+l0*.05);s+=texture2D(tA,uv).r*wi;w+=wi;}gl_FragColor=vec4(vec3(s/w),1.);}",blending:THREE.NoBlending,depthTest:false,depthWrite:false});
  mulMat=new THREE.ShaderMaterial({vertexShader:vs,uniforms:{tA:{value:null}},fragmentShader:"uniform sampler2D tA;varying vec2 vUv;void main(){gl_FragColor=vec4(vec3(texture2D(tA,vUv).r),1.);}",blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.ZeroFactor,blendDst:THREE.SrcColorFactor,transparent:true,depthTest:false,depthWrite:false});
  dMat=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking})}
 const sv=new THREE.Vector3();
 function hideForDepth(){const h=[];scene.traverse(o=>{if(!o.visible)return;let bad=o.isSprite||o.isPoints||o.isLine||o.isSkinnedMesh||o.isLight;
   if(!bad&&o.isMesh&&o.material){const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){if(m.transparent||m.blending===THREE.AdditiveBlending||m.side===THREE.DoubleSide&&m.alphaTest>0){bad=true;break}}}
   if(bad&&!o.isLight&&!o.isScene){o.visible=false;h.push(o)}});return h}
 const _pr=postRender;
 postRender=function(t){_pr.apply(this,arguments);
  try{if(!POST.on||!POST.rt)return;mats();const ac=renderer.autoClear;renderer.autoClear=false;
   /* sun shafts (outdoors, daytime) */
   if(P2.shafts&&!DG&&typeof sunM!=="undefined"){sv.copy(sunM.position).project(camera);
    const vis=sv.z<1&&Math.abs(sv.x)<1.6&&Math.abs(sv.y)<1.6,day=Math.max(0,Math.min(1,(todDay-.2)*1.6));
    if(vis&&day>.02){shaft.uniforms.t.value=POST.rt.texture;shaft.uniforms.sun.value.set(sv.x*.5+.5,sv.y*.5+.5);shaft.uniforms.k.value=P2.shK*day*(qual>=3?1.2:1);renderer.setRenderTarget(null);POST.quad.material=shaft;renderer.render(POST.sc,POST.cam)}}
   /* ambient occlusion (dungeons only: they are small, so the extra depth pass is cheap) */
   if(P2.ao&&DG){const W=Math.max(2,POST.w>>1),H=Math.max(2,POST.h>>1);
    if(!dRT||dw!==W||dh!==H){if(dRT)dRT.dispose();dRT=new THREE.WebGLRenderTarget(W,H,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,depthBuffer:true});if(aRT)aRT.dispose();if(bRT)bRT.dispose();const o2={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,depthBuffer:false};aRT=new THREE.WebGLRenderTarget(W,H,o2);bRT=new THREE.WebGLRenderTarget(W,H,o2);dw=W;dh=H}
    const hid=hideForDepth(),oc=new THREE.Color();renderer.getClearColor(oc);const oa=renderer.getClearAlpha(),fog=scene.fog;scene.fog=null;
    scene.overrideMaterial=dMat;renderer.setRenderTarget(dRT);renderer.setClearColor(0xffffff,1);renderer.clear();renderer.render(scene,camera);
    scene.overrideMaterial=null;scene.fog=fog;renderer.setClearColor(oc,oa);hid.forEach(o=>o.visible=true);
    const u=aoMat.uniforms;u.tD.value=dRT.texture;u.px.value.set(1/W,1/H);u.near.value=camera.near;u.far.value=camera.far;u.fy.value=H/(2*Math.tan(camera.fov*Math.PI/360));u.k.value=P2.aoK;
    renderer.setRenderTarget(aRT);POST.quad.material=aoMat;renderer.render(POST.sc,POST.cam);
    const bu=blurMat.uniforms;bu.tD.value=dRT.texture;bu.near.value=camera.near;bu.far.value=camera.far;
    for(let i=0;i<2;i++){bu.tA.value=aRT.texture;bu.d.value.set(1/W,0);renderer.setRenderTarget(bRT);POST.quad.material=blurMat;renderer.render(POST.sc,POST.cam);bu.tA.value=bRT.texture;bu.d.value.set(0,1/H);renderer.setRenderTarget(aRT);renderer.render(POST.sc,POST.cam)}
    mulMat.uniforms.tA.value=aRT.texture;renderer.setRenderTarget(null);POST.quad.material=mulMat;renderer.render(POST.sc,POST.cam)}
   renderer.autoClear=ac;renderer.setRenderTarget(null)
  }catch(e){if(!window.__p2e){window.__p2e=1;console.warn("post2",e)}}};
})();

/* ===== cfx: battle feel. Swing lights, slash trails, impact rings, hit-stop, camera punch, monster magic ===== */
(function(){
 if(typeof THREE==="undefined"||typeof fx3==="undefined"||typeof vmUpdate==="undefined")return;
 const CF=window.CFX={stop:0,sh:0,fov:0,shT:0,list:[],lights:[]};
 const V3=THREE.Vector3,live=()=>typeof C!=="undefined"&&C&&C.rt&&!C.over;
 const lowQ=()=>{try{return qual<=0}catch(e){return false}};
 /* ---------- textures (made once) ---------- */
 const T={};
 function cv(w,h,fn){const c=document.createElement("canvas");c.width=w;c.height=h;fn(c.getContext("2d"),w,h);const t=new THREE.CanvasTexture(c);return t}
 function tex(k){if(T[k])return T[k];
  if(k==="slash")T[k]=cv(256,128,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,"rgba(255,255,255,0)");gr.addColorStop(.55,"rgba(255,255,255,.55)");gr.addColorStop(1,"rgba(255,255,255,1)");
    g.fillStyle=gr;g.beginPath();g.moveTo(0,h*.52);g.quadraticCurveTo(w*.55,h*.02,w,h*.18);g.quadraticCurveTo(w*.6,h*.3,0,h*.52);g.fill();
    g.globalCompositeOperation="destination-in";const m=g.createLinearGradient(0,0,0,h);m.addColorStop(0,"rgba(0,0,0,.2)");m.addColorStop(.35,"rgba(0,0,0,1)");m.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=m;g.fillRect(0,0,w,h)});
  else if(k==="ring")T[k]=cv(256,256,(g,w,h)=>{const gr=g.createRadialGradient(128,128,70,128,128,126);gr.addColorStop(0,"rgba(255,255,255,0)");gr.addColorStop(.72,"rgba(255,255,255,.9)");gr.addColorStop(.86,"rgba(255,255,255,.35)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,w,h)});
  else if(k==="glow")T[k]=cv(128,128,(g,w,h)=>{const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.25,"rgba(255,255,255,.55)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,w,h)});
  else if(k==="sigil")T[k]=cv(512,512,(g,w,h)=>{g.translate(256,256);g.strokeStyle="#fff";g.fillStyle="#fff";g.lineCap="round";
    const ring=(r,lw,a)=>{g.globalAlpha=a;g.lineWidth=lw;g.beginPath();g.arc(0,0,r,0,6.2832);g.stroke()};
    ring(240,5,1);ring(228,2,.7);ring(176,3,.9);ring(150,2,.6);
    g.globalAlpha=.9;g.lineWidth=3;
    for(let i=0;i<36;i++){const a=i/36*6.2832;g.beginPath();g.moveTo(Math.cos(a)*(i%3?228:216)*1,Math.sin(a)*(i%3?228:216));g.lineTo(Math.cos(a)*240,Math.sin(a)*240);g.stroke()}
    /* hexagram + inner triangle */
    for(let s=0;s<2;s++){g.beginPath();for(let i=0;i<3;i++){const a=s*3.1416+i*2.0944-1.5708;const x=Math.cos(a)*176,y=Math.sin(a)*176;i?g.lineTo(x,y):g.moveTo(x,y)}g.closePath();g.stroke()}
    /* rune glyphs between the rings */
    g.lineWidth=4;for(let i=0;i<12;i++){g.save();g.rotate(i/12*6.2832);g.translate(0,-203);g.beginPath();
      const t=i%4;if(t===0){g.moveTo(-9,10);g.lineTo(0,-12);g.lineTo(9,10)}else if(t===1){g.moveTo(-8,-12);g.lineTo(-8,12);g.moveTo(-8,-2);g.lineTo(9,-12)}else if(t===2){g.moveTo(0,-12);g.lineTo(0,12);g.moveTo(-9,0);g.lineTo(9,0)}else{g.moveTo(-9,-10);g.lineTo(9,10);g.moveTo(9,-10);g.lineTo(-9,10)}g.stroke();g.restore()}
    g.globalAlpha=.8;g.beginPath();g.arc(0,0,22,0,6.2832);g.fill()});
  return T[k]}
 /* ---------- light pool: never add or remove lights mid-fight, so there is no shader hitch ---------- */
 function lights(){if(CF.lights.length)return CF.lights;for(let i=0;i<3;i++){const l=new THREE.PointLight(0xffffff,0,11,2);l.userData.k=0;l.visible=false;scene.add(l);CF.lights.push(l)}return CF.lights}
 function lamp(pos,col,I,life,dist){if(lowQ()||CF.off)return;const L=lights();let b=L[0];for(const l of L)if(l.userData.k<b.userData.k)b=l;
  b.position.copy(pos);b.color.setHex(col);b.userData.I=I;b.userData.k=1;b.userData.life=life;b.distance=dist||10}
 /* ---------- generic timed effects ---------- */
 function add(o,life,upd,fin){scene.add(o);CF.list.push({o,t:0,life,upd,fin})}
 const matA=(map,col,op)=>new THREE.MeshBasicMaterial({map,color:col,transparent:true,opacity:op==null?1:op,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,side:THREE.DoubleSide,fog:false});
 const fwd=()=>{camera.getWorldDirection(_f);return _f},_f=new V3(),_r=new V3(),_u=new V3(0,1,0);
 /* flat ring on the ground (shockwave) */
 function groundRing(pos,col,r0,r1,life,op){const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),matA(tex("ring"),col,op||.9));m.rotation.x=-Math.PI/2;m.position.copy(pos);m.renderOrder=996;m.scale.setScalar(r0);
  add(m,life,(k)=>{m.scale.setScalar(r0+(r1-r0)*Math.sqrt(k));m.material.opacity=(op||.9)*(1-k)})}
 /* camera-facing ring (impact burst) */
 function burstRing(pos,col,r1,life){const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),matA(tex("ring"),col,1));m.position.copy(pos);m.renderOrder=997;
  add(m,life,(k)=>{m.quaternion.copy(camera.quaternion);m.scale.setScalar(.25+r1*Math.sqrt(k));m.material.opacity=1-k})}
 function glowBall(pos,col,s,life){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex("glow"),color:col,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,fog:false}));sp.position.copy(pos);sp.renderOrder=997;
  add(sp,life,(k)=>{sp.scale.setScalar(s*(1.2-.5*k));sp.material.opacity=1-k})}
 /* spinning rune circle on the floor */
 function sigil(pos,col,r,life,spin,fade){const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),matA(tex("sigil"),col,0));m.rotation.x=-Math.PI/2;m.position.copy(pos);m.renderOrder=995;m.scale.setScalar(r);m.material.depthTest=true;m.material.polygonOffset=true;m.material.polygonOffsetFactor=-4;
  add(m,life,(k)=>{m.rotation.z+=spin*.016;const a=fade==="out"?(1-k):Math.min(1,k*4)*(k>.85?(1-k)/.15:1);m.material.opacity=.85*a});return m}
 /* slash crescent in front of the camera */
 function slash(col,flip,big){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.75),matA(tex("slash"),col,1));m.renderOrder=999;const roll=(Math.random()*.7-.35)+(flip?.9:-.9),sz=big?1.5:1;
  add(m,.2,(k)=>{const f=fwd();_r.crossVectors(f,_u).normalize();const sweep=-.55+k*1.1;m.position.copy(camera.position).addScaledVector(f,1.05).addScaledVector(_r,sweep*(flip?-1:1)*.6);m.position.y-=.12;
    m.quaternion.copy(camera.quaternion);m.rotateZ(roll);m.scale.set(sz*(.7+k*.6),sz*(1-.4*k),1);m.material.opacity=Math.sin(Math.min(1,k*1.15)*Math.PI*.9)*.95})}
 /* beam from one point to another (monster bolts, lightning) */
 function beam(a,b,col,w,life){const len=a.distanceTo(b),g=new THREE.CylinderGeometry(w,w*.55,len,8,1,true);g.translate(0,len/2,0);g.rotateX(Math.PI/2);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,fog:false}));m.position.copy(a);m.lookAt(b);m.renderOrder=997;
  add(m,life,(k)=>{m.material.opacity=.9*(1-k)*(Math.random()<.3?.5:1);m.scale.x=m.scale.y=1-.7*k},()=>{g.dispose()})}
 /* ---------- camera punch + FOV kick + hit-stop ---------- */
 function punch(a,fov,stop){if(a>CF.sh){CF.sh=a;CF.shT=0}CF.fov=Math.max(CF.fov,fov||0);if(stop)CF.stop=Math.max(CF.stop,stop)}
 let _rr=null;
 function patchRender(){if(_rr||typeof renderer==='undefined'||!renderer)return;_rr=renderer.render.bind(renderer);renderer.render=rend}
 function rend(s,c){
  if(s===scene&&c===camera&&(CF.sh>.002||CF.fov>.02)){
   const px=camera.position.x,py=camera.position.y,pz=camera.position.z,rx=camera.rotation.x,ry=camera.rotation.y,fv=camera.fov;
   const a=CF.sh,t=performance.now()*.05;
   camera.position.x+=Math.sin(t*1.7)*a*.09;camera.position.y+=Math.cos(t*2.3)*a*.07;
   camera.rotation.x+=Math.sin(t*2.9)*a*.03;camera.rotation.y+=Math.cos(t*2.1)*a*.03;
   if(CF.fov>.02){camera.fov=fv-CF.fov;camera.updateProjectionMatrix()}
   _rr(s,c);try{CF.scn={calls:renderer.info.render.calls,tris:renderer.info.render.triangles}}catch(e){}
   camera.position.set(px,py,pz);camera.rotation.x=rx;camera.rotation.y=ry;if(CF.fov>.02){camera.fov=fv;camera.updateProjectionMatrix()}
   return}
  const r_=_rr(s,c);if(s===scene&&c===camera)try{CF.scn={calls:renderer.info.render.calls,tris:renderer.info.render.triangles}}catch(e){}return r_}
 /* ---------- colours by weapon and by monster ---------- */
 function weaponCol(){const w=(hero&&hero.eq&&hero.eq.w)||"";
  if(/Flamebrand|Fire/i.test(w))return 0xff7a24;if(/Frostfang|Frost/i.test(w))return 0x8ad0ff;if(/Sunblade|Blazing Star|Holy|Sun/i.test(w))return 0xffe488;
  if(/Compass|Plumb|Square/i.test(w))return 0x9ab0ff;if(/staff|wand/i.test(w))return 0xc89aff;return 0xe6eeff}
 function foeCol(){const n=(C&&C.e&&C.e.name)||"";
  if(/Chorus|Seraph|Ophan|Tetramorph|Argus/i.test(n))return 0xffe9a0;
  if(/Bael|Furfur|Imp|Demon|Eligos|Fire|Sapper|Cultist/i.test(n))return 0xff6a2a;
  if(/Witch|Hag|Shaman|Drowned|Nymph|Wraith/i.test(n))return/Wraith|Nymph/.test(n)?0x6affd0:0x8aff5a;
  if(/Beholder|Eye/i.test(n))return 0xff5fd0;
  if(/Andras|Bifrons|Decan|Candle|Shade|Ghoul|Skeleton|Legion|Revenant/i.test(n))return 0x9aa8ff;
  if(/Magician|Mage|Sorcer/i.test(n))return 0xb07cff;
  if(/Hydra|Scorpion|Spider|Snake/i.test(n))return 0x9bff60;
  return 0xb07cff}
 const base=()=>{const b=fx3.base;return b?new V3(b.x,(DG?0:Math.max(hfn(b.x,b.z),-.3))+.1,b.z):null};
 /* ---------- 0. big procedural arm swing (windup, fast slash, overshoot, recover) layered over the arm animation ---------- */
 const SW={t:-1,k:"norm",fl:false,hit:0,fz:0};CF.SW=SW;
 const ease=x=>x*x*(3-2*x);
 function swingDrive(dt){
  const P=(window.HQ&&HQ.on&&HQ.piv)||(window.H3R&&H3R())||null,pk=P&&P===(window.HQ&&HQ.piv)?1:3.2;if(!P)return;
  /* take back what we added last frame (only on values the arm code did not already reset) */
  if(SW.w){const w=SW.w,keys=[[P.rotation,"x",0],[P.rotation,"y",1],[P.rotation,"z",2],[P.position,"x",3],[P.position,"y",4],[P.position,"z",5]];
   for(const [o,k,i] of keys)if(Math.abs(o[k]-w.v[i])<1e-9)o[k]-=w.d[i];SW.w=null}
  const im2=document.querySelector("#vmo img");
  if(SW.t<0)return;
  const big=SW.k==="heavy",dur=big?.62:SW.k==="light"||SW.k==="fast"?.34:.46,wind=big?.34:.24,hitAt=wind+.2;
  if(SW.fz>0){SW.fz-=dt;dt=0}
  SW.t+=dt/dur;const t=SW.t;if(t>=1){SW.t=-1;return}
  let w;/* 0..1 windup, then strike */
  const a=t<wind?ease(t/wind):1,st=t<wind?0:t<hitAt?ease((t-wind)/(hitAt-wind)):1,rc=t<hitAt?0:ease((t-hitAt)/(1-hitAt));
  const sg=SW.fl?-1:1,amp=big?1.35:1;
  /* windup lifts and cocks the weapon back, the strike whips across and down past the target, then eases home */
  const yaw=sg*(.42*a*(1-st)-.62*st*(1-rc)+0)*amp, pit=(.38*a*(1-st)-.5*st*(1-rc))*amp, rol=sg*(-.35*a*(1-st)+.7*st*(1-rc))*amp;
  const zf=-.2*st*(1-rc)*amp+.07*a*(1-st), xo=sg*(.08*a*(1-st)-.16*st*(1-rc)), yo=(.07*a*(1-st)-.1*st*(1-rc));
  const xo2=xo*pk,yo2=yo*pk,zf2=zf*pk;P.rotation.y+=yaw;P.rotation.x+=pit;P.rotation.z+=rol;P.position.x+=xo2;P.position.y+=yo2;P.position.z+=zf2;
  /* the painted weapon (what most players see): same timeline, drawn as a big 2D arc */
  if(im2&&im2.offsetParent!==null&&!(window.HQ&&HQ.on)){const H=(im2.parentNode.clientHeight||400),hv=big?1:.8,wr=a*(1-st),sk=st*(1-rc);
   const X=(.12*wr-.52*sk)*H*hv,Y=(-(big?.26:.1)*wr+(big?.2:.07)*sk)*H,R=(18*wr-(big?60:52)*sk),S=1+(big?.38:.24)*sk-.05*wr;
   im2.style.transformOrigin="62% 92%";im2.style.transform+=" translate("+X.toFixed(1)+"px,"+Y.toFixed(1)+"px) rotate("+R.toFixed(1)+"deg) scale("+S.toFixed(3)+")"}
  SW.w={d:[pit,yaw,rol,xo2,yo2,zf2],v:[P.rotation.x,P.rotation.y,P.rotation.z,P.position.x,P.position.y,P.position.z]};
  if(!SW.hit&&t>=hitAt-.02){SW.hit=1;if(live())punch(big?.8:.4,big?7:4)}
 }
 CF.swingDrive=swingDrive;
 /* ---------- 1. player swing ---------- */
 let flip=false;const _sw=fx3.swing;
 fx3.swing=function(){_sw.apply(this,arguments);try{window.SWN=(window.SWN|0)+1;if(window.HQ)HQ.lastSw=-1;/* always restart the arm animation, even if the last swing has not finished */const ww=((typeof hero!=="undefined"&&hero&&hero.eq&&hero.eq.w)||"").toLowerCase(),kk0=/mace|hammer|club|axe|flail|maul/.test(ww)?"heavy":/dagger|knife|dart/.test(ww)?"light":"norm";SW.t=0;SW.k=kk0;SW.hit=0;SW.fl=!SW.fl;if(live()){punch(kk0==="heavy"?.5:.28,kk0==="heavy"?5:3)}}catch(e){}try{if(!live())return;flip=!flip;const col=weaponCol(),k=(typeof RT!=="undefined"&&RT.swingK)||"norm",big=k==="heavy";
   slash(col,flip,big);
   const f=fwd();_r.crossVectors(f,_u).normalize();const p=camera.position.clone().addScaledVector(f,1.1).addScaledVector(_r,flip?.3:-.3);
   lamp(p,col,big?3.2:2.2,.16,8);
   if(k!=="bow"&&k!=="fin"&&(/Flamebrand|Frostfang|Sunblade|Blazing/.test((hero.eq&&hero.eq.w)||"")))vfx.burst(p,col,6,1.6,.1,.4,-2)
  }catch(e){}};
 /* ---------- 2. impacts on the monster ---------- */
 const _hit=fx3.hit;
 fx3.hit=function(n){_hit.apply(this,arguments);try{if(SW.t>=0&&typeof n==="number"){SW.fz=n>=10?.1:.06;SW.hit=1}
   if(typeof n!=="number"||!this.g)return;const c=this.ctr().clone(),e=C&&C.e,mx=e?e.max:30,big=n>=10||n>=mx*.18,huge=n>=mx*.3||n>=24;
   const col=weaponCol();
   lamp(c,huge?0xfff0c0:0xffd890,huge?5.5:big?3.8:2.4,huge?.34:.22,11);
   burstRing(c,huge?0xffffff:col,huge?3.4:big?2.2:1.2,huge?.38:.26);
   if(big){groundRing(base(),0xffd890,.6,huge?5:3,.4,.55);vfx.burst(c,0xffffff,huge?30:16,huge?7.5:5.5,.1,.45,9)}
   else vfx.burst(c,0xffe0a0,7,4.2,.08,.35,9);
   punch(huge?1.3:big?.75:.32,huge?2.6:big?1.3:.5,huge?.11:big?.07:.035);
   if(huge)try{flash("rgba(255,244,220,.28)")}catch(x){}
  }catch(e){}};
 const _upd=fx3.update;
 fx3.update=function(dt){if(CF.stop>0){CF.stop-=dt;dt*=.04}return _upd.call(this,dt)};
 /* ---------- 3. death burst ---------- */
 const _die=fx3.die;
 fx3.die=function(){const c=this.g&&this.ctr().clone();_die.apply(this,arguments);try{if(!c)return;const col=foeCol();
   lamp(c,col,6,.7,13);burstRing(c,col,4.5,.6);glowBall(c,col,4.2,.5);const b=base();if(b){groundRing(b,col,.5,6,.8,.7);sigil(b,col,2.3,1.6,.6,"out")}
   vfx.burst(c,col,34,3.6,.16,1.2,-1.2);vfx.burst(c,0xffffff,14,6,.08,.5,3);punch(1.5,3,.12);
  }catch(e){}};
 /* ---------- 4. you get hurt ---------- */
 const _hurt=fx3.hurt;
 fx3.hurt=function(d){_hurt.apply(this,arguments);try{if(typeof d==="number")punch(Math.min(1.8,.5+d*.08),Math.min(3,d*.2),d>=6?.06:0)}catch(e){}};
 /* ---------- 5. monster magic, telegraphed ---------- */
 const S={fs:"",ak:"",orb:null,sg:null,col:0,t:0};
 function endCast(){if(S.orb){scene.remove(S.orb);S.orb.material.dispose();S.orb=null}if(S.sg){S.sg.userData.dead=1;S.sg=null}}
 function beginWind(){endCast();const ak=RT.ak,b=base();if(!b)return;S.col=foeCol();S.t=0;S.ak=ak;
  if(ak==="pulse"||ak==="bolt"||ak==="slam"){
   const r=ak==="pulse"?5.2:ak==="slam"?3.4:1.8;
   const m=sigil(b,S.col,r,Math.max(.5,(RT.ftMax||.9)+.25),ak==="bolt"?2.6:-1.5);S.sg=m;
   if(ak==="bolt"||ak==="pulse"){const o=new THREE.Sprite(new THREE.SpriteMaterial({map:tex("glow"),color:S.col,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,fog:false}));o.renderOrder=997;scene.add(o);S.orb=o}}}
 function windTick(dt){const p=Math.max(0,Math.min(1,1-RT.ft/RT.ftMax)),c=fx3.g&&fx3.ctr();if(!c)return;S.t+=dt;
  if(S.orb){S.orb.position.set(c.x,c.y+.25,c.z);const s=.4+p*2.4+Math.sin(S.t*22)*.08;S.orb.scale.setScalar(s);S.orb.material.opacity=.4+.6*p;
   if(Math.random()<dt*(10+p*25)){const q=new V3(c.x+(Math.random()-.5)*3.2,c.y+(Math.random()-.5)*2.2,c.z+(Math.random()-.5)*3.2);vfx.spawn(q,S.col,.1,new V3(c.x-q.x,c.y+.25-q.y,c.z-q.z).multiplyScalar(2.4),.4,{})}}
  if(S.ak==="pulse"||S.ak==="bolt")lamp(c,S.col,.6+p*2.4,.1,9)}
 function fire(ak){const c=fx3.g&&fx3.ctr().clone(),b=base();if(!c)return;const col=S.col||foeCol();
  if(ak==="bolt"){const to=camera.position.clone();to.y-=.35;beam(c,to,col,.12,.24);glowBall(c,col,2.6,.3);lamp(c,col,4,.3,12);vfx.burst(c,col,16,4,.1,.5,0);
    to.addScaledVector(fwd(),-.2);glowBall(to,col,1.6,.25)}
  else if(ak==="pulse"){if(b){groundRing(b,col,.4,6.2,.55,.95);groundRing(b,0xffffff,.2,5.2,.38,.55)}lamp(c,col,5,.4,14);glowBall(c,col,3.6,.35);vfx.burst(c,col,28,6.5,.12,.6,0)}
  else if(ak==="slam"){if(b){groundRing(b,0xffb070,.4,5.2,.5,.9);const d=new V3(b.x,b.y,b.z);for(let i=0;i<10;i++)vfx.smoke(d.clone().add(new V3((Math.random()-.5)*3,.1,(Math.random()-.5)*3)))}lamp(b?new V3(b.x,b.y+.6,b.z):c,0xffa050,4.5,.35,12);vfx.burst(b||c,0xffd2a0,18,4.5,.12,.5,8);punch(1.2,1.6,.06)}
  else if(ak==="lunge"){lamp(c,0xffa020,3,.25,10);vfx.burst(c,0xffc060,10,4,.1,.4,4)}
  else{lamp(c,0xff5030,2.2,.2,9);vfx.burst(c,0xff8060,8,3.5,.1,.35,4)}
 }
 /* ---------- 6. player spells (extra layers on top of spells3d) ---------- */
 const _sf=fx3.sf;
 fx3.sf=function(k){_sf.apply(this,arguments);try{if(k!=="spell"||!this.g)return;const nm=(typeof curSpell==="string"?curSpell:"")||"",c=this.ctr().clone(),b=base();
   const fire_=/Fire|Flame|Burn|Meteor|Scorch/i.test(nm),ice=/Frost|Ice|Cold|Chill/i.test(nm),holy=/Turn|Smite|Holy|Sacred|Radiant|Sun|Heal|Cure|Bless/i.test(nm),bolt_=/Light|Shock|Thunder|Bolt|Storm|Spark/i.test(nm),poi=/Poison|Acid|Venom/i.test(nm);
   const col=fire_?0xff7a24:ice?0x8ad0ff:holy?0xffe488:bolt_?0xc8e0ff:poi?0x8aff5a:0xb07cff;
   if(b)sigil(b,col,2.6,.9,1.8,"out");
   burstRing(c,col,3.2,.45);lamp(c,col,4.5,.45,12);glowBall(c,col,3,.35);
   if(fire_){vfx.burst(c,0xff9040,26,3.8,.16,.9,-3);vfx.burst(c,0xffe080,12,5.5,.09,.5,3)}
   else if(ice){vfx.burst(c,0xcff0ff,26,4.4,.1,.8,7);vfx.burst(c,0xffffff,10,6,.07,.5,8)}
   else if(holy){for(let i=0;i<14;i++)vfx.spawn(new V3(c.x+(Math.random()-.5)*1.5,c.y-1+Math.random()*.4,c.z+(Math.random()-.5)*1.5),0xfff0b0,.18,new V3(0,3+Math.random()*2,0),.9,{});flash("rgba(255,244,200,.22)")}
   else if(poi){vfx.burst(c,0x8aff5a,22,2.6,.2,1,-1)}
   else vfx.burst(c,col,24,4.5,.12,.7,0);
   punch(.6,1.4,.04)
  }catch(e){}};
 /* ---------- F3: small performance read-out ---------- */
 const pf=document.createElement("div");pf.style.cssText="position:fixed;left:8px;top:8px;z-index:99998;background:rgba(0,0,0,.7);color:#9f9;font:12px monospace;padding:4px 8px;border-radius:4px;display:none;pointer-events:none;white-space:pre";document.body.appendChild(pf);
 let pfOn=false;CF.togglePerf=()=>{pfOn=!pfOn;CF.pfOn=pfOn;pf.style.display=pfOn?"block":"none"};let pfN=0,pfT=performance.now();
 addEventListener("keydown",e=>{if(e.code==="F3"){e.preventDefault();CF.togglePerf()}});
 function pfTick(){if(!pfOn)return;pfN++;const n=performance.now();if(n-pfT>500){const f=pfN*1000/(n-pfT);pfN=0;pfT=n;let w=0,t=0;try{w=CF.scn.calls;t=CF.scn.tris}catch(e){}
   pf.textContent=Math.round(f)+" fps   graphics level "+(typeof qual!=="undefined"?qual:"?")+"\ndraw calls "+w+"   triangles "+(t/1000|0)+"k"}}
 /* ---------- per-frame driver ---------- */
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{
   patchRender();pfTick();dt=Math.min(dt,.05);swingDrive(dt);
   /* the pool lights only exist for the shaders during a fight (every extra light costs on every surface) */
   {CF.tailT=live()?1.4:Math.max(0,(CF.tailT||0)-dt);const want=!CF.off;if(want&&!CF.lights.length&&typeof scene!=="undefined"&&scene)lights();/* keep them in the scene (intensity 0 when idle): switching the light count would recompile every material and freeze the game at fight start */for(const l of CF.lights)if(l.visible!==want)l.visible=want}
   /* light pool decay */
   for(const l of CF.lights){if(l.userData.k>0){l.userData.k=Math.max(0,l.userData.k-dt/l.userData.life);const k=l.userData.k;l.intensity=l.userData.I*k*k}else l.intensity=0}
   /* effects */
   for(let i=CF.list.length-1;i>=0;i--){const f=CF.list[i];f.t+=dt;const k=Math.min(1,f.t/f.life);try{f.upd(k)}catch(e){}
    if(k>=1||f.o.userData.dead){scene.remove(f.o);if(f.o.material&&f.o.material.dispose)f.o.material.dispose();if(f.fin)f.fin();CF.list.splice(i,1)}}
   /* camera shake decay */
   CF.sh=Math.max(0,CF.sh-dt*5.5);CF.fov=Math.max(0,CF.fov-dt*14);
   /* monster wind-up state machine */
   if(live()&&typeof RT!=="undefined"){const fs=RT.fs;
    if(fs==="wind"&&S.fs!=="wind")beginWind();
    if(fs==="wind")windTick(dt);
    if(S.fs==="wind"&&fs!=="wind"){const ak=S.ak;endCast();if(!(RT.stagger>0))fire(ak)}
    S.fs=fs}
   else{if(S.fs==="wind")endCast();S.fs=""}
  }catch(e){if(!window.__cfe){window.__cfe=1;console.warn("cfx",e)}}};
})();

/* ===== Monster motion layer: everything here is animation written in code, layered on top of the model's own clips =====
   - secondary motion: tails, necks, heads, claws, eye stalks and arms follow through and lag behind the body (springs)
   - body language: crouch and lean back on wind-up, snap forward on the strike, stalk with a sway while chasing, breathe at rest
   - reactions: flinch, recoil and knock-back when hit (stronger hit = bigger reaction, heavier monsters move less), head leads each turn
   - deaths: giants topple slowly and shake the ground, spirits drift up and spin, beasts roll over, people stagger back and fall */
(function(){
 if(typeof fx3==="undefined"||typeof THREE==="undefined")return;
 const T=THREE,MAN=window.MAN={on:1,n:0};
 const S=new WeakMap(),_q=new T.Quaternion(),_e=new T.Euler();
 const clamp=(x,a,b)=>x<a?a:x>b?b:x,ease=x=>x*x*(3-2*x);
 const angD=(a,b)=>{let d=b-a;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;return d};
 const sp=()=>({x:0,v:0});
 function spr(o,k,c,dt,tgt){o.v+=(-k*(o.x-(tgt||0))-c*o.v)*dt;o.x+=o.v*dt}

 /* add an offset to a rotation / scale value and take it back next frame, but only if nobody else rewrote it meanwhile */
 function addAxis(o,key,d,mem,mul){
  const cur=o[key];
  if(mem&&mem.after!==undefined&&Math.abs(cur-mem.after)<1e-7){o[key]=mul?cur/mem.d:cur-mem.d}
  mem.d=d;o[key]=mul?o[key]*d:o[key]+d;mem.after=o[key]}
 function addBone(b,m,x,y,z){
  if(m.after&&b.quaternion.equals(m.after))b.quaternion.copy(m.before);
  m.before.copy(b.quaternion);_e.set(x,y,z,"XYZ");_q.setFromEuler(_e);b.quaternion.multiply(_q);m.after.copy(b.quaternion)}

 function init(g){
  const F=g.userData.fig,B={};
  g.traverse(o=>{if(o.isBone)B[o.name]=o});
  const s={F,B,mem:{},bm:{},t0:Math.random()*20,prevFs:"chase",prevYaw:g.rotation.y,pb:null,sv:0,yr:0,
   p:sp(),r:sp(),kn:sp(),q:sp(),A:sp(),Bs:sp(),hd:sp(),jw:sp(),
   dead:-1,dtype:"",pr:0,snap:0,flinch:0,rig:"none"};
  if(B.N0_1)s.rig="hydra";else if(B.Tail5)s.rig="scorp";else if(B.S0_1)s.rig="eye";else if(B.Tail1&&B.Neck)s.rig="quad";else if(B.spine_03||B.Head)s.rig="hum";
  const nm=(typeof C!=="undefined"&&C&&C.e&&C.e.name)||"";
  s.nm=nm;
  s.type=/Giant|Troll|Ogre|Yeti|Asura|Golem|Ushabti|Hill|Stone/.test(nm)?"giant":(g.userData.float||/Wraith|Ghost|Shade|Seraph|Archon|Ophan|Eye|Imp\b|Lemure|Homunculus|Shadow|Candle|Spirit|Chorus|Tetramorph|Argus/.test(nm))?"flyer":(s.rig==="quad"||s.rig==="hydra"||s.rig==="scorp")?"beast":"person";
  return s}
 function bm(s,name){return s.bm[name]||(s.bm[name]={before:new T.Quaternion(),after:null})}
 function bone(s,name,x,y,z){const b=s.B[name];if(!b)return;const m=bm(s,name);if(!m.after)m.after=new T.Quaternion();addBone(b,m,x,y,z);m.on=1}

 /* ---------- events ---------- */
 const _hit=fx3.hit;
 fx3.hit=function(n){_hit.apply(this,arguments);try{
   const g=this.g;if(!g||typeof n!=="number"||!MAN.on)return;const s=S.get(g)||(S.set(g,init(g)),S.get(g));
   const e=(typeof C!=="undefined"&&C&&C.e)||{max:30},mass=clamp(g.scale.y/1.1,.8,2.6),m=clamp(n/Math.max(8,(e.max||30)*.22),.35,1.5)/mass;
   s.p.v+=-7*m;s.r.v+=(Math.random()<.5?-1:1)*(4+4*Math.random())*m;s.kn.v+=7.5*m;s.q.v-=2.6*m;s.hd.v+=(Math.random()-.5)*9*m;s.Bs.v+=-6*m;s.A.v+=(Math.random()-.5)*8*m;s.flinch=.3;s.jw.v+=5*m}catch(x){}};
 const _die=fx3.die;
 fx3.die=function(){_die.apply(this,arguments);try{
   const g=this.g;if(!g||!MAN.on)return;const s=S.get(g)||(S.set(g,init(g)),S.get(g));s.dead=0;s.dtype=s.type;s.shook=0;
   const F=g.userData.fig;if(F&&F.acts&&F.acts.die){if(s.type==="giant")F.acts.die.setEffectiveTimeScale(.55);else if(s.type==="flyer")F.acts.die.setEffectiveTimeScale(.45)}
   s.p.v+=-6;s.kn.v+=s.type==="giant"?3:9}catch(x){}};

 /* ---------- per frame ---------- */
 function frame(dt){
  const g=fx3.g;if(!g||!MAN.on)return;dt=Math.min(dt,.05);if(dt<=0)return;
  let s=S.get(g);if(!s){s=init(g);S.set(g,s)}
  const t=(typeof clock!=="undefined"?clock:performance.now()/1000)+s.t0,rt=window.RT,live=typeof C!=="undefined"&&C&&C.rt&&rt;
  const sc=g.scale.y,mass=clamp(sc/1.1,.8,2.6),dead=s.dead>=0;
  const fs=live?rt.fs:"chase",stag=live&&rt.stagger>0;
  let pr=0;if(live&&fs==="wind"&&rt.ftMax)pr=clamp(1-rt.ft/rt.ftMax,0,1);
  s.pr+=(pr-s.pr)*Math.min(1,dt*(pr>s.pr?9:14));pr=s.pr;
  /* movement of the foe (logic position, not the drawn one) */
  const b=fx3.base;let spd=0;
  if(b){if(s.pb){const vx=(b.x-s.pb.x)/dt,vz=(b.z-s.pb.z)/dt;spd=Math.hypot(vx,vz)}else s.pb=b.clone();s.pb.copy(b)}
  s.sv+=(spd-s.sv)*Math.min(1,dt*6);
  const ry=g.rotation.y;s.yr+=(angD(s.prevYaw,ry)/dt-s.yr)*Math.min(1,dt*10);s.prevYaw=ry;
  /* release of a wind-up = the strike */
  if(s.prevFs==="wind"&&fs!=="wind"&&!dead){s.p.v+=6.5;s.kn.v-=7/mass;s.q.v+=2.2;s.Bs.v+=7;s.A.v+=(Math.random()-.5)*10;s.snap=1}
  s.prevFs=fs;
  s.flinch=Math.max(0,s.flinch-dt);s.snap=Math.max(0,s.snap-dt*3.2);
  /* body springs: lean, roll, push-back, squash */
  const moving=s.sv>.6&&fs==="chase";
  let pT=0,rT=0,qT=0;
  if(!dead){
   pT=-.11*pr-(stag?.2:0)+(moving?.045:0);
   rT=Math.sin(t*(moving?6.2:.9))*(moving?.05*Math.min(2,s.sv/2):.012);
   qT=-.07*pr+.012*Math.sin(t*2.1);
  }
  spr(s.p,70,9,dt,pT);spr(s.r,55,8,dt,rT);spr(s.kn,50,7.5,dt,0);spr(s.q,90,11,dt,qT);
  spr(s.A,34,4.6,dt,clamp(-s.yr*.1,-.7,.7));spr(s.Bs,34,5,dt,clamp(-s.sv*.04,-.35,.35)+(-.25*pr));spr(s.hd,60,6,dt,0);spr(s.jw,70,8,dt,clamp(pr*.7,0,.8)+(stag?.35:0));
  /* death */
  let rise=0,spin=0,roll=0,shrink=0,pdie=0;
  if(dead){s.dead+=dt;const d=s.dead;
   if(s.dtype==="flyer"){rise=1.5*ease(clamp(d/1.7,0,1));spin=2.4*ease(clamp(d/1.7,0,1));shrink=.35*ease(clamp(d/1.7,0,1))}
   else if(s.dtype==="beast"){roll=-1.25*ease(clamp((d-.1)/.5,0,1))}
   else if(s.dtype==="giant"){pdie=-.18*ease(clamp(d/1.1,0,1));if(d<1.2)s.r.v+=(Math.random()-.5)*.8;
     if(d>.95&&!s.shook){s.shook=1;try{if(window.CFX){CFX.sh=Math.max(CFX.sh||0,1.1);CFX.shT=0;CFX.fov=Math.max(CFX.fov||0,3)}const p=fx3.ctr().clone();p.y=g.position.y+.2;for(let i=0;i<7;i++)vfx.smoke(p.clone().add(new T.Vector3((Math.random()-.5)*2.2,.1,(Math.random()-.5)*2.2)))}catch(x){}}}
   else{pdie=-.1*ease(clamp(d/.5,0,1))}
  }
  /* apply to the whole body */
  const mem=s.mem;
  addAxis(g.rotation,"x",s.p.x+pdie,mem.x||(mem.x={}));
  addAxis(g.rotation,"z",s.r.x+roll,mem.z||(mem.z={}));
  if(spin)addAxis(g.rotation,"y",spin,mem.y||(mem.y={}));
  if(!g.userData.fig){/* simple models: keep scale alone */}
  else{const T0=s.F.root;addAxis(T0.scale,"y",1+s.q.x-shrink,mem.sy||(mem.sy={}),true);addAxis(T0.scale,"x",1-s.q.x*.5-shrink,mem.sx||(mem.sx={}),true);addAxis(T0.scale,"z",1-s.q.x*.5-shrink,mem.sz||(mem.sz={}),true)}
  if(fx3.fw){g.position.x+=fx3.fw.x*s.kn.x;g.position.z+=fx3.fw.z*s.kn.x}
  g.position.y+=rise-.05*sc*pr;
  /* bones */
  if(!s.F||dead&&s.dtype!=="flyer")return;
  const cam=camera.position,gp=g.position,look=clamp(angD(ry,Math.atan2(cam.x-gp.x,cam.z-gp.z))*1.25,-.75,.75);
  const A=s.A.x,Bq=s.Bs.x,hd=s.hd.x,jw=s.jw.x,w=(f,ph)=>Math.sin(t*f+ph),al=1+.7*pr+(moving?.4:0);
  switch(s.rig){
   case"hum":
    bone(s,"spine_02",.015*w(2.2,0)+.05*Bq,0,.04*A);
    bone(s,"spine_03",.02*w(2.2,.4)+.07*Bq,look*.25,.05*A);
    bone(s,"neck_01",-.05*pr-.12*hd+.04*Bq,look*.3,.05*A+.1*hd);
    bone(s,"Head",-.08*pr-.15*hd+.05*Bq,look*.45,.06*A+.12*hd);
    ["l","r"].forEach((sd,i)=>{const k=i?-1:1;bone(s,"upperarm_"+sd,.05*w(1.7,i*3)+.1*Bq,0,k*(.1*A+.03*w(1.3,i*2)));bone(s,"lowerarm_"+sd,.12*Bq+.04*w(2,i),0,0)});
    break;
   case"quad":
    bone(s,"Spine",.03*w(2.4,0)+.06*Bq,0,.04*A);
    bone(s,"Neck",-.2*pr-.1*hd+.05*Bq,look*.35,.05*A);
    bone(s,"Head",-.15*pr-.12*hd,look*.4,.05*hd);
    bone(s,"Jaw",jw*.9,0,0);
    bone(s,"Tail1",.08*Bq,0,.28*A+.2*al*w(3,0));
    bone(s,"Tail2",.1*Bq,0,.4*A+.28*al*w(3,-.9));
    break;
   case"hydra":
    for(let n=0;n<3;n++){["1","2","3","h"].forEach((k,i)=>{
      const z=.2*al*w(1.5,n*2.1-i*.8)+.3*A*(i+1)/4,x=.14*w(1.1,n*1.3-i*.7+1)+.28*Bq*(i+1)/4-.18*pr*(i<3?1:0)+.1*hd;
      bone(s,"N"+n+"_"+k,x,i===0?look*.35:0,z)});
      bone(s,"N"+n+"_j",jw,0,0)}
    bone(s,"Tail1",.05*Bq,0,.25*A+.18*w(2,0));bone(s,"Tail2",.05*Bq,0,.35*A+.22*w(2,-.8));
    bone(s,"Body",.02*w(1.8,0),0,0);
    break;
   case"scorp":
    for(let i=1;i<=5;i++){const f=i/5;bone(s,"Tail"+i,(.12+.2*pr+.1*(s.snap))*(-1)+.12*Bq*f,0,.12*al*w(1.8,-i*.6)+.15*A*f)}
    ["CR_a","CL_a"].forEach((n,i)=>bone(s,n,0,0,(i?-1:1)*(.22*w(2.1,i*2)+.45*pr+.25*s.flinch)));
    bone(s,"Body",.02*w(2,0),0,.02*A);
    break;
   case"eye":
    for(let i=0;i<5;i++){["1","2"].forEach((k,j)=>bone(s,"S"+i+"_"+k,.26*w(1.1+.17*i,i*1.7-j*.6)+.25*Bq,0,.3*w(.9+.13*i,i*2.3+1-j*.5)+.3*A+.15*hd))}
    bone(s,"Jaw",jw*.8,0,0);bone(s,"Body",.03*w(1.6,0)+.06*Bq,look*.15,.04*A);
    break}
 }
 let _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{frame(dt);MAN.n++}catch(e){if(!window.__manE){window.__manE=1;console.warn("MAN",e)}}};
})();

/* ===== Dark occult mood: grim palettes for every region and the night, cold shadows / sickly highlights in the final grade,
   murkier fog, candle-flicker on the hero's lantern, dimmer dungeon fill light. One switch (MOOD.set) returns to the original bright look. ===== */
(function(){
 if(typeof ATM==="undefined"||typeof NIGHT==="undefined")return;
 const M=window.MOOD={on:1,k:1,patched:0};
 const LS={get:()=>{try{return localStorage.getItem("occultica.mood")}catch(e){return null}},set:v=>{try{localStorage.setItem("occultica.mood",v)}catch(e){}}};
 const keys=Object.keys(ATM);
 const ORIG={atm:{},night:{top:NIGHT.top.getHex(),hor:NIGHT.hor.getHex(),fog:NIGHT.fog.getHex()}};
 keys.forEach(k=>{const a=ATM[k];ORIG.atm[k]={sk:a.sk.slice(),fog:a.fog,n:a.n,f:a.f,hm:a.hm.slice(),sun:a.sun,si:a.si}});
 /* grim palettes: bruised skies, murky fog, cold fill light, weak sickly sun */
 const DARK={atm:{
  forest:{sk:[0x1f2d3a,0x6c7c78],fog:0x3e4c46,n:10,f:74,hm:[0x7e8e9c,0x1f2c1a],sun:0xe4d4b0,si:.78},
  tundra:{sk:[0x2e3a52,0x8c9ab0],fog:0x78869a,n:9,f:58,hm:[0x8c9cb6,0x4a5262],sun:0xc4d0e4,si:.68},
  mountain:{sk:[0x242c3a,0x7c808c],fog:0x525862,n:12,f:70,hm:[0x7a8294,0x34302a],sun:0xdcd2c0,si:.72},
  swamp:{sk:[0x16241f,0x4e5e40],fog:0x2c3828,n:4,f:40,hm:[0x62745a,0x181e10],sun:0xa8ba88,si:.42},
  desert:{sk:[0x30304a,0xa87c58],fog:0x7a5c40,n:12,f:78,hm:[0xb89468,0x5a4228],sun:0xffb468,si:.95},
  hills:{sk:[0x26364a,0x74807c],fog:0x485448,n:12,f:82,hm:[0x7c8c9a,0x2a3a22],sun:0xe4d8b8,si:.8}},
  night:{top:0x03040c,hor:0x141a2c,fog:0x0c1220}};
 function applyPal(src){
  keys.forEach(k=>{const a=ATM[k],s=src.atm[k];if(!s)return;a.sk=s.sk.slice();a.fog=s.fog;a.n=s.n;a.f=s.f;a.hm=s.hm.slice();a.sun=s.sun;a.si=s.si});
  NIGHT.top.setHex(src.night.top);NIGHT.hor.setHex(src.night.hor);NIGHT.fog.setHex(src.night.fog)}
 M.set=function(on){M.on=on?1:0;LS.set(M.on?"1":"0");applyPal(M.on?DARK:ORIG);try{if(typeof tgt!=="undefined")lerpAtm(.5)}catch(e){}
  try{if(POST.mComp&&POST.mComp.uniforms.occ)POST.mComp.uniforms.occ.value=M.on}catch(e){}};
 M.isOn=()=>!!M.on;
 const st=LS.get();if(st==="0")M.on=0;
 applyPal(M.on?DARK:ORIG);

 function patchPost(){
  try{const m=POST&&POST.mComp;if(!m||M.patched)return;
   let f=m.fragmentShader;
   if(f.indexOf("uniform float occ")<0){
    f=f.replace("uniform float exp,","uniform float occ;uniform float exp,");
    f=f.replace("col*=1.-smoothstep(.12,.62,r2*1.8)*vig;",
     "col*=1.-smoothstep(.12,.62,r2*1.8)*vig;"+
     "{float lg=dot(col,vec3(.299,.587,.114));vec3 g2=mix(vec3(lg),col,mix(1.,.72,occ));"+
     "g2=mix(g2,g2*vec3(.80,.92,1.12),(1.-smoothstep(.0,.5,lg))*.6*occ);"+
     "g2=mix(g2,g2*vec3(1.10,.98,.82),smoothstep(.45,.95,lg)*.3*occ);"+
     "g2=mix(g2,g2*g2*(3.-2.*g2),.24*occ);"+
     "g2*=1.-.3*occ*smoothstep(.1,.7,r2*1.6);"+
     "g2+=vec3(.15,.0,.015)*occ*smoothstep(.22,.62,r2*1.5)*.5*(1.-lg);"+
     "col=g2;}");
    f=f.replace("(hash(uv*900.+time)-.5)*.02","(hash(uv*900.+time)-.5)*(.02+.014*occ)");
    m.fragmentShader=f;m.uniforms.occ={value:M.on};m.needsUpdate=true}
   M.patched=1}catch(e){console.warn("mood post",e)}}

 let _l=0;
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{
   if(!M.patched)patchPost();
   if(typeof scene==="undefined"||!scene||!M.on)return;
   _l+=dt;
   /* colder, deeper shadows: less fill light, so the sun and torches do the work */
   const fighting=!!(fx3.g&&typeof C!=="undefined"&&C&&!C.over);
   if(typeof hemi!=="undefined"&&hemi&&!DG)hemi.intensity*=fighting?.98:.82;
   /* fights: a cold rim light from behind the monster so its shape reads against the gloom, and a stronger colored glow on it */
   if(!M.rim&&typeof THREE!=="undefined"){M.rim=new THREE.DirectionalLight(0x8aa4ff,0);M.rim.target=new THREE.Object3D();scene.add(M.rim,M.rim.target)}
   /* a soft key light on the monster from the camera's upper left, so it reads against bright or dark ground */
   if(!M.key&&typeof THREE!=="undefined"){M.key=new THREE.DirectionalLight(0xfff0dc,0);M.key.target=new THREE.Object3D();scene.add(M.key,M.key.target)}
   if(M.key){let wk=0;if(fighting){const g=fx3.g,cp=camera.position,gp=g.position;M.key.position.set(cp.x-Math.cos(yaw)*3.5,cp.y+4.5,cp.z+Math.sin(yaw)*3.5);M.key.target.position.set(gp.x,gp.y+1,gp.z);M.key.target.updateMatrixWorld();wk=.7}
    M.key.intensity+=(wk-M.key.intensity)*Math.min(1,dt*5)}
   if(M.rim){let want=0;
    if(fighting){const g=fx3.g,cp=camera.position,gp=g.position,dx=gp.x-cp.x,dz=gp.z-cp.z,d=Math.hypot(dx,dz)||1;
     M.rim.position.set(gp.x+dx/d*7,gp.y+4.2,gp.z+dz/d*7);M.rim.target.position.set(gp.x,gp.y+1,gp.z);M.rim.target.updateMatrixWorld();
     const F=g.userData.fig;M.rim.color.setHex(0x7f98ff);if(F&&F.eye)M.rim.color.lerp(new THREE.Color(F.eye),.35);want=.95}
    M.rim.intensity+=(want-M.rim.intensity)*Math.min(1,dt*5)}
   if(fighting&&typeof foeL!=="undefined"&&foeL&&foeL.intensity>0&&foeL.intensity<1.4){foeL.intensity=Math.min(1.15,foeL.intensity*1.6);foeL.distance=11}
   /* candle-flicker on the hero's lantern */
   if(!DG&&typeof lantern!=="undefined"&&lantern){const t=(typeof clock!=="undefined"?clock:_l),fl=1+.16*Math.sin(t*13.1)*Math.sin(t*5.3+1)+.07*Math.sin(t*31);lantern.intensity*=fl;lantern.color.setHex(0xffa65a)}
   /* dungeons: dim the flat fill light so the torches stand out */
   if(typeof DG!=="undefined"&&DG&&typeof dg3!=="undefined"&&dg3.g){dg3.g.traverse(o=>{if(o.isAmbientLight){if(o.__m0===undefined)o.__m0=o.intensity;o.intensity=o.__m0*.62}})}
  }catch(e){if(!window.__moodE){window.__moodE=1;console.warn("mood",e)}}};
})();

/* ===== Weather: drizzle, storm with lightning and thunder, creeping mist, snow squalls, dust storms. Chosen by region, changes slowly. ===== */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE;
 const LS={get:()=>{try{return localStorage.getItem("occultica.weather")}catch(e){return null}},set:v=>{try{localStorage.setItem("occultica.weather",v)}catch(e){}}};
 const W=window.WX={state:"clear",k:0,tk:0,on:LS.get()!=="0",timer:25+Math.random()*30,lt:0,fl:0,thunderAt:-1,seed:Math.random()};
 /* what each state looks like: visible streaks, speed, slant, length, colour, fog squeeze, light loss, gloom, sound */
 const ST={
  clear:{n:0},
  drizzle:{n:.45,spd:15,sl:.12,len:.55,col:[.62,.72,.85,.3],fog:.18,lite:.3,gloom:.35,snd:.5,msg:"A cold drizzle starts to fall."},
  storm:{n:1,spd:24,sl:.32,len:.95,col:[.66,.76,.92,.38],fog:.32,lite:.6,gloom:.7,snd:1,light:1,msg:"The sky bruises. Rain hammers down, and thunder walks the hills."},
  mist:{n:0,fog:.55,lite:.25,gloom:.3,msg:"Mist crawls up out of the ground."},
  snow:{n:.8,spd:3.2,sl:.25,len:.12,col:[.95,.97,1,.75],fog:.35,lite:.35,gloom:.15,snd:.25,msg:"A squall of snow sweeps in."},
  dust:{n:.7,spd:7,sl:1.3,len:.5,col:[.92,.76,.5,.4],fog:.5,lite:.35,gloom:.25,snd:.3,msg:"A dust storm rises, and the horizon goes blood-brown."}};
 const BIOME={
  forest:{clear:5,drizzle:3,mist:3,storm:1},hills:{clear:5,drizzle:3,mist:2,storm:2},swamp:{clear:1,drizzle:3,mist:6,storm:1},
  mountain:{clear:3,mist:3,storm:3,drizzle:1},tundra:{clear:3,snow:5,mist:2},desert:{clear:6,dust:3}};
 function pickState(){const b=BIOME[(typeof lastBiome!=="undefined"&&lastBiome)||"forest"]||BIOME.forest;let tot=0;for(const k in b)tot+=b[k];let r=Math.random()*tot;for(const k in b){r-=b[k];if(r<=0)return k}return"clear"}
 W.set=function(s){if(!ST[s])return;W.state=s;W.timer=90+Math.random()*120;try{if(ST[s].msg&&typeof toast==="function")toast(ST[s].msg)}catch(e){}};
 W.setOn=function(v){W.on=!!v;LS.set(v?"1":"0");if(!v)W.state="clear"};

 /* ---------- streak particles (rain, snow, dust), all moved on the graphics card ---------- */
 const N=2600;let streaks=null;
 function build(){
  const pos=new Float32Array(N*2*3),sd=new Float32Array(N*2*3),en=new Float32Array(N*2);
  for(let i=0;i<N;i++){const a=Math.random()*2-1,b=Math.random()*2-1,c=Math.random();
   for(let j=0;j<2;j++){const o=(i*2+j);sd[o*3]=a;sd[o*3+1]=b;sd[o*3+2]=c;en[o]=j}}
  const g=new T.BufferGeometry();g.setAttribute("position",new T.BufferAttribute(pos,3));g.setAttribute("seed",new T.BufferAttribute(sd,3));g.setAttribute("endf",new T.BufferAttribute(en,1));
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,fog:false,uniforms:{uCam:{value:new T.Vector3()},uT:{value:0},uK:{value:0},uSpd:{value:20},uLen:{value:.7},uSl:{value:.2},uR:{value:15},uH:{value:18},uCol:{value:new T.Vector4(.7,.8,.95,.35)}},
   vertexShader:"attribute vec3 seed;attribute float endf;uniform vec3 uCam;uniform float uT,uK,uSpd,uLen,uSl,uR,uH;varying float vA;"+
   "void main(){float idx=fract(seed.z*7.31+seed.x*3.7);if(idx>uK){gl_Position=vec4(2.,2.,2.,1.);vA=0.;return;}"+
   "float ph=fract(seed.z-uT*uSpd/uH);float yy=uCam.y+uH*(.5-ph)-2.;"+
   "vec2 w=vec2(seed.x,seed.y)*uR*2.+uSl*uT*uSpd*.5;vec2 q=mod(w-uCam.xz+uR,2.*uR)-uR;"+
   "vec3 p=vec3(uCam.x+q.x+uSl*(yy-uCam.y),yy,uCam.z+q.y);"+
   "p-=endf*uLen*normalize(vec3(-uSl,1.,0.));"+
   "float d=length(p-uCam);vA=smoothstep(uR*1.4,uR*.4,length(q))*smoothstep(.6,2.,d);"+
   "gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}",
   fragmentShader:"uniform vec4 uCol;varying float vA;void main(){gl_FragColor=vec4(uCol.rgb,uCol.a*vA);}"});
  streaks=new T.LineSegments(g,m);streaks.frustumCulled=false;streaks.renderOrder=40;streaks.visible=false;scene.add(streaks)}

 /* ---------- sound (own audio context: rain bed and thunder) ---------- */
 let X=null,rainG=null,rainF=null;
 function audio(){if(X)return true;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;X=new AC();
   const nb=X.createBuffer(1,X.sampleRate*3,X.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;W.nb=nb;
   const s=X.createBufferSource();s.buffer=nb;s.loop=true;rainF=X.createBiquadFilter();rainF.type="bandpass";rainF.frequency.value=3200;rainF.Q.value=.35;rainG=X.createGain();rainG.gain.value=0;s.connect(rainF);rainF.connect(rainG);rainG.connect(X.destination);s.start();return true}catch(e){return false}}
 function thunder(far){if(!audio()||X.state==="suspended")return;const t=X.currentTime,s=X.createBufferSource();s.buffer=W.nb;const f=X.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(far?260:520,t);f.frequency.exponentialRampToValueAtTime(70,t+2.6);
  const g=X.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(far?.28:.5,t+.12);g.gain.setTargetAtTime(.0001,t+.3,.9);s.connect(f);f.connect(g);g.connect(X.destination);s.start(t,Math.random()*1.5,3.6);
  const o=X.createOscillator(),og=X.createGain();o.type="sine";o.frequency.setValueAtTime(48,t);o.frequency.exponentialRampToValueAtTime(30,t+2);og.gain.setValueAtTime(.0001,t);og.gain.linearRampToValueAtTime(.18,t+.2);og.gain.setTargetAtTime(.0001,t+.5,.7);o.connect(og);og.connect(X.destination);o.start(t);o.stop(t+3)}
 ["pointerdown","keydown","touchstart"].forEach(ev=>addEventListener(ev,()=>{try{if(audio()&&X.state==="suspended")X.resume()}catch(e){}},{passive:true}));

 const gray=new T.Color(0x56606a),_c=new T.Color();
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{
   if(typeof scene==="undefined"||!scene||typeof world==="undefined")return;
   const out=world.visible&&!DG&&W.on;
   if(!streaks)build();
   /* decide what comes next */
   if(out){W.timer-=dt;if(W.timer<=0){let s=pickState();if(s===W.state)s="clear";W.set(s)}}
   else if(W.state!=="clear"&&!W.on)W.state="clear";
   const tgt=out?W.state:"clear";
   if(tgt!=="clear"){W.sn=tgt;W.sc=ST[tgt]}
   const S=W.sc||ST.drizzle,nm=W.sn||"drizzle";
   W.k+=((tgt!=="clear"?1:0)-W.k)*Math.min(1,dt*.22);
   const k=W.k;
   if(k<.01){streaks.visible=false;if(rainG&&X)rainG.gain.value=0;return}
   const u=streaks.material.uniforms;
   if(S.n>0){u.uCam.value.copy(camera.position);u.uT.value=(typeof clock!=="undefined"?clock:performance.now()/1000);u.uK.value=Math.min(1,S.n*Math.min(1,k*1.4));
    u.uSpd.value=S.spd;u.uLen.value=S.len;u.uSl.value=S.sl;u.uCol.value.set(S.col[0],S.col[1],S.col[2],S.col[3]);u.uR.value=nm==="snow"?12:15;streaks.visible=u.uK.value>.01}
   else streaks.visible=false;
   /* squeeze the world: nearer fog, a heavier sky, weaker sun */
   const f=S.fog||0,lite=S.lite||0,gl=S.gloom||0;
   if(typeof worldFog!=="undefined"&&worldFog){worldFog.far*=1-f*k;worldFog.near*=1-f*k*1.1;worldFog.color.lerp(nm==="dust"?_c.setHex(0x9a7a52):nm==="snow"?_c.setHex(0xaab4c0):gray,.45*k*Math.min(1,gl*2+.3))}
   if(typeof sunL!=="undefined"&&sunL)sunL.intensity*=1-lite*k;
   if(typeof hemi!=="undefined"&&hemi)hemi.intensity*=1-.25*gl*k;
   if(typeof skyM!=="undefined"&&skyM&&skyM.material&&skyM.material.uniforms){skyM.material.uniforms.top.value.lerp(nm==="dust"?_c.setHex(0x70583c):gray,.55*k*Math.min(1,gl*2+.2));skyM.material.uniforms.hor.value.lerp(nm==="dust"?_c.setHex(0xa88a60):gray,.55*k*Math.min(1,gl*2+.2))}
   /* lightning and thunder in storms */
   if(S.light&&k>.5){W.lt-=dt;if(W.lt<=0){W.lt=5+Math.random()*14;W.fl=1;W.thunderAt=.4+Math.random()*2.4}}
   if(W.fl>0){W.fl=Math.max(0,W.fl-dt*5.5);const q=W.fl*(.55+.45*Math.sin(W.fl*40));
    if(typeof hemi!=="undefined"&&hemi)hemi.intensity+=2.4*q;if(typeof sunL!=="undefined"&&sunL)sunL.intensity+=1.6*q;
    if(typeof skyM!=="undefined"&&skyM&&skyM.material&&skyM.material.uniforms){skyM.material.uniforms.top.value.lerp(_c.setHex(0xdfe6ff),.8*q);skyM.material.uniforms.hor.value.lerp(_c.setHex(0xf2f4ff),.8*q)}}
   if(W.thunderAt>=0){W.thunderAt-=dt;if(W.thunderAt<0){W.thunderAt=-1;thunder(Math.random()<.4)}}
   /* rain bed */
   if(rainG&&X){const g=(S.snd||0)*k*.10;rainG.gain.setTargetAtTime(g,X.currentTime,.4);if(rainF)rainF.frequency.value=nm==="snow"?900:nm==="dust"?1800:3200}
  }catch(e){if(!window.__wxE){window.__wxE=1;console.warn("WX",e)}}};
})();

/* ===== Occult props and ground detail: rune monoliths, bone piles, candle shrines, graves, scarecrows, gibbet cages, broken carts,
   ritual circles, puddles, ravens on the stones; cobwebs, bones and candles inside dungeon rooms. All procedural, drawn in a few batches. ===== */
(function(){
 if(typeof THREE==="undefined"||typeof vmUpdate==="undefined")return;
 const T=THREE;
 const PR=window.PROPS={on:1,built:0,sets:[],n:0};
 const LS={get:()=>{try{return localStorage.getItem("occultica.props")}catch(e){return null}},set:v=>{try{localStorage.setItem("occultica.props",v)}catch(e){}}};
 if(LS.get()==="0")PR.on=0;
 PR.setOn=v=>{PR.on=v?1:0;LS.set(v?"1":"0")};
 const hs=(a,b,c)=>{const v=Math.sin(a*12.9898+b*78.233+(c||0)*37.719)*43758.5453;return v-Math.floor(v)};

 /* ---------- tiny mesh builder: merge boxes / cones / spheres into one coloured geometry ---------- */
 const _m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_p=new T.Vector3(),_s=new T.Vector3(),_c=new T.Color();
 function merge(parts,seed){
  const P=[],C=[];let k=0;
  for(const p of parts){
   let g=p.g.index?p.g.toNonIndexed():p.g.clone();
   _e.set(p.r?p.r[0]:0,p.r?p.r[1]:0,p.r?p.r[2]:0);_q.setFromEuler(_e);_p.set(p.p[0],p.p[1],p.p[2]);_s.set(p.s?p.s[0]:1,p.s?p.s[1]:1,p.s?p.s[2]:1);_m.compose(_p,_q,_s);g.applyMatrix4(_m);
   const a=g.attributes.position;_c.setHex(p.c);const j=.88+.24*hs(seed||1,k++,3);
   for(let i=0;i<a.count;i++){P.push(a.getX(i),a.getY(i),a.getZ(i));C.push(_c.r*j,_c.g*j,_c.b*j)}}
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(P,3));g.setAttribute("color",new T.Float32BufferAttribute(C,3));g.computeVertexNormals();return g}
 const box=(w,h,d)=>new T.BoxGeometry(w,h,d),cyl=(a,b,h,n)=>new T.CylinderGeometry(a,b,h,n||7),cone=(r,h,n)=>new T.ConeGeometry(r,h,n||6),ico=(r)=>new T.IcosahedronGeometry(r,0),sph=(r)=>new T.SphereGeometry(r,6,5);
 const SOLID=new T.MeshLambertMaterial({vertexColors:true});
 const GLOW=c=>new T.MeshBasicMaterial({color:c,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:true,side:T.DoubleSide});

 /* ---------- prop recipes: [solid geometry, glow geometry (optional), glow colour] ---------- */
 function flameGeo(){const g=new T.PlaneGeometry(.2,.34);g.translate(0,.17,0);const a=g.clone().rotateY(Math.PI/2);return merge([{g,p:[0,0,0],c:0xffffff},{g:a,p:[0,0,0],c:0xffffff}])}
 const REC={
  rune:()=>{const par=[{g:box(.9,3.2,.55),p:[0,1.6,0],c:0x2a2b30},{g:box(.8,.5,.6),p:[0,.1,0],r:[0,.2,0],c:0x24252a},{g:cone(.5,.5,4),p:[0,3.4,0],r:[0,.78,0],s:[1,1,.7],c:0x2c2d33}];
   const gl=[];for(let i=0;i<5;i++)gl.push({g:box(.3-(i%2)*.1,.05,.02),p:[(i%2?.08:-.08),.7+i*.45,.285],c:0xffffff});gl.push({g:box(.05,1.8,.02),p:[0,1.7,.285],c:0xffffff});
   return[merge(par,1),merge(gl,2),0xff3a1e]},
  bones:()=>{const par=[];for(let i=0;i<4;i++){const a=i*1.7;par.push({g:ico(.13),p:[Math.cos(a)*.35,.1,Math.sin(a)*.3],s:[1,.9,1.1],c:0xd8d0b8});par.push({g:box(.06,.06,.5),p:[Math.cos(a+1)*.3,.04,Math.sin(a+2)*.35],r:[0,a*2,.2],c:0xcdc4a8})}
   par.push({g:ico(.2),p:[0,.17,0],s:[1,1.05,1.15],c:0xe2dac0});par.push({g:box(.14,.07,.12),p:[0,.06,.17],c:0xe2dac0});return[merge(par,2)]},
  candles:()=>{const par=[{g:cyl(.42,.46,.05,8),p:[0,.025,0],c:0x2a2018}];const gl=[];
   [[0,0,.5],[.22,.1,.3],[-.2,-.12,.38],[.1,-.25,.22],[-.28,.12,.26]].forEach((q,i)=>{par.push({g:cyl(.05,.06,q[2],6),p:[q[0],.05+q[2]/2,q[1]],c:0xd8cfae});par.push({g:cyl(.035,.04,.04,5),p:[q[0],.07+q[2],q[1]],c:0x201810});gl.push({g:flameGeo(),p:[q[0],.08+q[2],q[1]],s:[.55,.55,.55],c:0xffffff})});
   par.push({g:ico(.1),p:[.05,.12,-.05],s:[1,.9,1],c:0xe2dac0});
   return[merge(par,3),merge(gl,4),0xffa040]},
  grave:()=>{const par=[{g:box(.7,.12,1.4),p:[0,.06,.4],c:0x2e281f},{g:box(.5,.9,.14),p:[0,.5,-.2],c:0x4a4d52},{g:cone(.3,.28,4),p:[0,1.04,-.2],r:[0,.78,0],s:[1,1,.3],c:0x4a4d52}];return[merge(par,5)]},
  cross:()=>{const par=[{g:box(.7,.12,1.3),p:[0,.06,.4],c:0x2e281f},{g:box(.1,1.2,.1),p:[0,.6,-.2],c:0x3a2c1e},{g:box(.5,.1,.1),p:[0,.95,-.2],c:0x3a2c1e}];return[merge(par,6)]},
  scarecrow:()=>{const par=[{g:cyl(.05,.06,2,5),p:[0,1,0],c:0x4a3a26},{g:box(1.5,.08,.08),p:[0,1.5,0],r:[0,0,.08],c:0x4a3a26},{g:box(.5,.7,.3),p:[0,1.35,0],c:0x4a3820},{g:sph(.22),p:[0,1.95,0],c:0x8a7a52},{g:cone(.35,.4,6),p:[0,2.28,0],c:0x241a12},{g:cyl(.4,.4,.04,8),p:[0,2.1,0],c:0x241a12},
    {g:box(.18,.6,.04),p:[-.7,1.2,0],r:[0,0,.1],c:0x5a4630},{g:box(.18,.5,.04),p:[.68,1.25,0],r:[0,0,-.12],c:0x5a4630}];
   const gl=[{g:box(.05,.05,.02),p:[-.07,1.97,.2],c:0xffffff},{g:box(.05,.05,.02),p:[.07,1.97,.2],c:0xffffff}];return[merge(par,7),merge(gl,8),0xff3010]},
  cage:()=>{const par=[{g:cyl(.07,.09,3.4,5),p:[0,1.7,0],c:0x2c241a},{g:box(1.1,.08,.08),p:[.55,3.3,0],c:0x2c241a},{g:cyl(.01,.01,.5,3),p:[1.1,3.05,0],c:0x2a2a2e},
    {g:cyl(.3,.34,.06,8),p:[1.1,2.5,0],c:0x2a2a2e},{g:cyl(.3,.3,.06,8),p:[1.1,3.0,0],c:0x2a2a2e}];
   for(let i=0;i<6;i++){const a=i*1.0472;par.push({g:cyl(.012,.012,.55,3),p:[1.1+Math.cos(a)*.29,2.75,Math.sin(a)*.29],c:0x2a2a2e})}
   par.push({g:ico(.18),p:[1.1,2.72,0],s:[1,1.1,1.1],c:0xd0c8ae});return[merge(par,8)]},
  cart:()=>{const par=[{g:box(1.7,.12,1.0),p:[0,.55,0],r:[0,0,.12],c:0x3a2a1a},{g:box(1.7,.4,.08),p:[0,.78,.5],r:[0,0,.12],c:0x34261a},{g:box(1.7,.4,.08),p:[0,.78,-.5],r:[0,0,.12],c:0x34261a},{g:box(1.5,.08,.08),p:[-1.4,.2,.1],r:[0,.2,.3],c:0x3a2a1a},
    {g:cyl(.5,.5,.08,10),p:[.1,.5,.58],r:[Math.PI/2,0,0],c:0x2c2016},{g:cyl(.5,.5,.08,10),p:[.1,.16,-.7],r:[1.2,0,.5],c:0x2c2016},{g:box(.12,.12,1),p:[.1,.5,0],c:0x2c2016}];return[merge(par,9)]},
  mound:()=>{const par=[{g:sph(.9),p:[0,0,0],s:[1.4,.32,1],c:0x2e281f},{g:cyl(.04,.05,1.2,4),p:[.2,.7,0],r:[0,0,.2],c:0x3a2c1e}];return[merge(par,10)]}};

 /* ---------- ground discs: puddles (glossy), ritual circles (glowing) ---------- */
 function sigilTex(){const c=document.createElement("canvas");c.width=c.height=256;const g=c.getContext("2d");g.translate(128,128);g.strokeStyle="#ff4a30";g.fillStyle="#ff4a30";g.lineCap="round";
  g.lineWidth=5;g.beginPath();g.arc(0,0,118,0,6.283);g.stroke();g.lineWidth=2.5;g.beginPath();g.arc(0,0,102,0,6.283);g.stroke();
  g.lineWidth=2;g.beginPath();for(let i=0;i<5;i++){const a=-1.5708+i*4*Math.PI/5;g.lineTo(Math.cos(a)*100,Math.sin(a)*100)}g.closePath();g.stroke();
  for(let i=0;i<16;i++){const a=i*6.283/16;g.save();g.rotate(a);g.fillRect(-1.5,108,3,9+((i%3)*3));g.restore()}
  g.lineWidth=2;g.beginPath();g.arc(0,0,34,0,6.283);g.stroke();g.beginPath();g.moveTo(-24,14);g.lineTo(0,-28);g.lineTo(24,14);g.lineTo(-24,14);g.stroke();
  for(let i=0;i<5;i++){const a=-1.5708+i*1.2566;g.beginPath();g.arc(Math.cos(a)*100,Math.sin(a)*100,7,0,6.283);g.stroke()}
  const t=new T.CanvasTexture(c);t.anisotropy=4;return t}
 function webTex(){const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d");g.strokeStyle="rgba(235,238,245,.85)";g.lineWidth=1.2;
  for(let i=0;i<=6;i++){const a=i/6*Math.PI/2;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*126,Math.sin(a)*126);g.stroke()}
  for(let r=18;r<126;r+=17){g.beginPath();let first=1;for(let i=0;i<=6;i++){const a=i/6*Math.PI/2,rr=r+(Math.sin(i*5+r)*3);const x=Math.cos(a)*rr,y=Math.sin(a)*rr;if(first){g.moveTo(x,y);first=0}else g.quadraticCurveTo((x+px)/2*.93,(y+py)/2*.93,x,y);var px=x,py=y}g.stroke()}
  const t=new T.CanvasTexture(c);return t}
 function flameTex(){const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d");const gr=g.createRadialGradient(32,40,2,32,36,30);gr.addColorStop(0,"rgba(255,250,200,1)");gr.addColorStop(.35,"rgba(255,170,60,.8)");gr.addColorStop(1,"rgba(255,80,10,0)");g.fillStyle=gr;g.beginPath();g.ellipse(32,38,14,28,0,0,6.283);g.fill();return new T.CanvasTexture(c)}

 /* ---------- placement ---------- */
 const TYPES={ /* name: [recipe, how many near player we draw, ground offset] */
  rune:{r:"rune"},bones:{r:"bones"},candles:{r:"candles"},grave:{r:"grave"},cross:{r:"cross"},scarecrow:{r:"scarecrow"},cage:{r:"cage"},cart:{r:"cart"},mound:{r:"mound"}};
 function place(){
  const L={};for(const k in TYPES)L[k]=[];const puddles=[],circles=[],ravens=[];
  const near=(tx,ty,d)=>POIS.some(p=>Math.abs(p.x-tx)<=d&&Math.abs(p.y-ty)<=d);
  const add=(k,tx,ty,j,sc)=>{const x=(tx+.5+(hs(tx,ty,j)-.5)*.8)*TW,z=(ty+.5+(hs(ty,tx,j+3)-.5)*.8)*TW,y=hfn(x,z);if(y<-.15)return null;const o=[x,y-.04,z,hs(x,z,5)*6.283,(sc||1)*(.85+.3*hs(z,x,7))];L[k].push(o);return o};
  for(let ty=2;ty<H-2;ty++)for(let tx=2;tx<W-2;tx++){
   if(!reach[ty*W+tx]||tileSolid(tx,ty))continue;
   if(Math.abs(tx-SX)<4&&Math.abs(ty-SY)<4)continue;
   const b=biome[ty][tx],r=hs(tx,ty,1),pn=near(tx,ty,2);
   if(pn)continue;
   const bi=b==="swamp"?1.6:b==="forest"||b==="hills"?1:b==="mountain"?.8:b==="tundra"?.6:.7;
   if(r<.010*bi){const o=add("rune",tx,ty,1,1+hs(tx,ty,9)*.5);if(o&&hs(tx,ty,11)<.5)ravens.push([o[0]+.1,o[1]+3.35,o[2],o[3]])}
   else if(r<.026*bi)add("bones",tx,ty,2,1);
   else if(r<.031*bi){const n=3+((hs(tx,ty,4)*4)|0);for(let i=0;i<n;i++){const o=add(i%3===2?"cross":"grave",tx+(i%2)*.5,ty+(i>>1)*.4,20+i,1);if(o&&i===0&&hs(tx,ty,13)<.4)ravens.push([o[0],o[1]+1.05,o[2]-.4,o[3]])}add("mound",tx,ty,40,1)}
   else if(r<.034*bi&&(b==="forest"||b==="hills"||b==="desert"))add("scarecrow",tx,ty,3,1);
   else if(r<.037*bi)add("cage",tx,ty,5,1+hs(tx,ty,6)*.4);
   else if(r<.039*bi)add("cart",tx,ty,6,1);
   else if(r<.0405*bi){const x=(tx+.5)*TW,z=(ty+.5)*TW,y=hfn(x,z);if(y>-.1)circles.push([x,y+.05,z,hs(x,z,2)*6.283,4.5+hs(z,x,1)*3])}
   if((b==="swamp"&&hs(tx,ty,8)<.16)||(b==="forest"&&hs(tx,ty,8)<.025)||(b==="hills"&&hs(tx,ty,8)<.015)){const x=(tx+.5+(hs(tx,ty,9)-.5))*TW,z=(ty+.5+(hs(ty,tx,9)-.5))*TW,y=hfn(x,z);if(y>-.18&&y<.9)puddles.push([x,y+.03,z,hs(x,z,3)*6.283,.55+hs(z,x,2)*1.1])}}
  /* every shrine, crypt and ruin gets a candle cluster or two and a bone pile */
  POIS.forEach((p,i)=>{if(p.hidden)return;for(let k=0;k<3;k++){const a=hs(i,k,1)*6.283,d=3.2+hs(i,k,2)*1.8,x=p.x*TW+1+Math.cos(a)*d,z=p.y*TW+1+Math.sin(a)*d,y=hfn(x,z);if(y<-.15||tileSolid(Math.floor(x/TW),Math.floor(z/TW)))continue;L[k===2?"bones":"candles"].push([x,y-.03,z,hs(x,z,5)*6.283,1])}});
  return{L,puddles,circles,ravens}}

 /* ---------- batches: one instanced mesh for the solid part, one for the glow ---------- */
 const WIN=75;let root=null,lastPx=1e9,lastPz=1e9,lt=0;
 const dummy=new T.Object3D();
 function build(){
  if(root){scene.remove(root)}
  root=new T.Group();root.name="props";scene.add(root);PR.sets=[];
  const data=place();PR.data=data;
  for(const k in data.L){const list=data.L[k];if(!list.length)continue;const rec=REC[TYPES[k].r]();
   const sol=new T.InstancedMesh(rec[0],SOLID,Math.max(1,list.length));sol.count=0;sol.frustumCulled=false;sol.castShadow=false;sol.receiveShadow=false;root.add(sol);
   let gl=null;if(rec[1]){gl=new T.InstancedMesh(rec[1],GLOW(rec[2]),Math.max(1,list.length));gl.count=0;gl.frustumCulled=false;gl.renderOrder=30;root.add(gl)}
   PR.sets.push({k,list,sol,gl,glow:rec[2]})}
  /* ravens: black bird silhouettes perched on stones and graves */
  if(data.ravens.length){const rg=merge([{g:ico(.16),p:[0,.18,0],s:[1,.9,1.5],c:0x0c0c10},{g:cone(.05,.2,4),p:[0,.2,.24],r:[Math.PI/2,0,0],c:0x2a2418},{g:sph(.1),p:[0,.33,.13],c:0x0c0c10},{g:box(.07,.04,.4),p:[0,.17,-.28],r:[.3,0,0],c:0x0c0c10}],11);
   const L2=data.ravens.map(r=>[r[0],r[1],r[2],r[3],1]);const sol=new T.InstancedMesh(rg,SOLID,L2.length);sol.count=0;sol.frustumCulled=false;root.add(sol);PR.sets.push({k:"raven",list:L2,sol,gl:null})}
  /* puddles + ritual circles: flat discs */
  const pg=new T.CircleGeometry(1,14);pg.rotateX(-Math.PI/2);
  const pm=new T.MeshStandardMaterial({color:0x0b1216,roughness:.04,metalness:.55,transparent:true,opacity:.82,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  if(data.puddles.length){const im=new T.InstancedMesh(pg,pm,data.puddles.length);im.count=0;im.frustumCulled=false;im.renderOrder=2;root.add(im);PR.sets.push({k:"puddle",list:data.puddles,sol:im,gl:null,flat:1})}
  if(data.circles.length){const cg=new T.PlaneGeometry(1,1);cg.rotateX(-Math.PI/2);const cm=new T.MeshBasicMaterial({map:sigilTex(),transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:true,color:0xffffff,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
   const im=new T.InstancedMesh(cg,cm,data.circles.length);im.count=0;im.frustumCulled=false;im.renderOrder=3;root.add(im);PR.sets.push({k:"circle",list:data.circles,sol:im,gl:null,flat:1,circ:1,mat:cm})}
  PR.built=1;lastPx=1e9;PR.n=PR.sets.reduce((a,s)=>a+s.list.length,0)}
 function refresh(cx,cz,far){
  const R2=far*far;
  for(const S of PR.sets){let n=0;const arr=S.sol.instanceMatrix.array;
   for(let i=0;i<S.list.length;i++){const o=S.list[i],dx=o[0]-cx,dz=o[2]-cz;if(dx*dx+dz*dz>R2)continue;
    dummy.position.set(o[0],o[1],o[2]);dummy.rotation.set(0,o[3],0);dummy.scale.setScalar(o[4]);dummy.updateMatrix();dummy.matrix.toArray(arr,n*16);n++}
   S.sol.count=n;S.sol.instanceMatrix.needsUpdate=true;
   if(S.gl){S.gl.instanceMatrix.array.set(arr.subarray(0,n*16));S.gl.count=n;S.gl.instanceMatrix.needsUpdate=true}}}

 /* ---------- dungeons: cobwebs in the corners, bones and candles by the walls ---------- */
 const WEBT={t:null};
 function dungeonProps(g,i){
  try{let w=12,dd=12,h=5;const f=g.children[0],c=g.children[1];
   if(f&&f.geometry&&f.geometry.parameters&&f.geometry.parameters.width){w=f.geometry.parameters.width;dd=f.geometry.parameters.height;if(c&&c.position&&c.position.y>2)h=c.position.y}
   else{const bb=new T.Box3().setFromObject(g);w=Math.max(6,bb.max.x-bb.min.x-.6);dd=Math.max(6,bb.max.z-bb.min.z-.6);h=Math.max(4,Math.min(8,bb.max.y))}
   const seed=(g.id||1)*.37+i;
   if(!WEBT.t)WEBT.t=webTex();
   const wm=new T.MeshBasicMaterial({map:WEBT.t,transparent:true,depthWrite:false,side:T.DoubleSide,opacity:.55,color:0xcfd4dc,fog:true});
   const pg=new T.PlaneGeometry(1.7,1.7);pg.translate(.85,-.85,0);
   [[-1,-1],[1,-1],[-1,1],[1,1]].forEach((c,k)=>{if(hs(seed,k,1)<.3)return;const sc=.9+hs(seed,k,2)*.8;
     const A=new T.Mesh(pg,wm);A.position.set(c[0]*(w/2-.03),h-.02,c[1]*(dd/2-.03));A.scale.set(-c[0]*sc,sc,sc);A.renderOrder=5;g.add(A);
     const B=new T.Mesh(pg,wm);B.position.set(c[0]*(w/2-.03),h-.02,c[1]*(dd/2-.03));B.rotation.y=Math.PI/2;B.scale.set(c[1]*sc,sc*.85,sc);B.renderOrder=5;g.add(B)});
   /* wall-hugging bone piles and candle clusters */
   const rb=REC.bones(),rc=REC.candles();
   for(let k=0;k<4;k++){const side=hs(seed,k,3)<.5?-1:1,x=side*(w/2-1+(hs(seed,k,4)-.5)*.8),z=(hs(seed,k,5)-.5)*(dd-3);
    if(k<2){const m=new T.Mesh(rb[0],SOLID);m.position.set(x,0,z);m.rotation.y=hs(seed,k,6)*6.28;m.scale.setScalar(1.3);g.add(m)}
    else{const m=new T.Mesh(rc[0],SOLID);m.position.set(x,0,z);g.add(m);const f=new T.Mesh(rc[1],GLOW(rc[2]));f.position.set(x,0,z);f.userData.flame=1;f.renderOrder=30;g.add(f);if(window.PROPS)PR.dgFlames.push(f)}}
   try{if(window.PPW)PPW.dungeon(g,w,dd,h,seed)}catch(e){if(!window.__ppE2){window.__ppE2=1;console.warn('ppdg',e)}}
  }catch(e){if(!window.__prE){window.__prE=1;console.warn("props dg",e)}}}
 PR.dgFlames=[];
/* rooms are decorated once, when they first appear (see the per-frame hook) */

 /* ---------- per frame ---------- */
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{
   if(typeof world==="undefined"||!world||typeof hfn!=="function"||typeof biome==="undefined"||typeof POIS==="undefined"||typeof camera==="undefined"||!camera)return;
   const out=PR.on&&world.visible&&!DG;
   if(root)root.visible=out;
   const t=(typeof clock!=="undefined"?clock:0);
   if(DG&&PR.on&&typeof dg3!=="undefined"&&dg3.g&&!dg3.g.userData.__pr){const g=dg3.g;g.userData.__pr=1;PR.dgFlames.length=0;dungeonProps(g,0)}
   if(PR.dgFlames.length&&DG){PR.dgFlames.forEach(f=>{f.material.opacity=.75+.25*Math.sin(t*14+f.id)*Math.sin(t*5.3)})}
   if(!out)return;
   if(!PR.built||(world.children.length>30&&!root)){try{build()}catch(e){PR.built=1;console.warn("props build",e)}}
   if(!root)return;
   lt+=dt;const cp=camera.position,moved=Math.hypot(cp.x-lastPx,cp.z-lastPz);
   if(moved>3||lt>1.5){lt=0;lastPx=cp.x;lastPz=cp.z;const far=Math.min(WIN,((typeof worldFog!=="undefined"&&worldFog)?worldFog.far:80)*1.05+4);refresh(cp.x,cp.z,far)}
   /* candle flames and rune glow breathe; the ritual circles pulse slowly */
   for(const S of PR.sets){if(S.gl){const m=S.gl.material;if(S.k==="candles")m.opacity=.8+.2*Math.sin(t*13)*Math.sin(t*4.1);else m.opacity=.55+.4*(.5+.5*Math.sin(t*1.7+S.k.length))}
    if(S.circ)S.mat.opacity=.45+.35*(.5+.5*Math.sin(t*.9))}
  }catch(e){if(!window.__prF){window.__prF=1;console.warn("props",e)}}};
})();

/* ===== Impact debris: what a monster is made of decides what flies out of it (blood, ichor, ash, rock dust, ice shards, embers,
   spirit wisps), plus stains that settle on the ground and fade. Can be switched off in Graphics options ("Blood and debris"). ===== */
(function(){
 if(typeof fx3==="undefined"||typeof vfx==="undefined"||typeof THREE==="undefined")return;
 const T=THREE,GORE=window.GORE={on:1,n:0};
 const LS={get:()=>{try{return localStorage.getItem("occultica.gore")}catch(e){return null}},set:v=>{try{localStorage.setItem("occultica.gore",v)}catch(e){}}};
 if(LS.get()==="0")GORE.on=0;
 GORE.setOn=v=>{GORE.on=v?1:0;LS.set(v?"1":"0")};
 const R=(a,b)=>a+Math.random()*(b-a);
 /* what is this thing made of? */
 const KINDS=[
  [/Wraith|Ghost|Shade|Spirit|Seraph|Archon|Ophan|Chorus|Candle|Lemure|Goetic|Decan/i,{k:"spirit",c:[0x9ad8ff,0x6fb0e8],add:1,st:0x5a8ab0,sa:.5,g:-1.2}],
  [/Mummy|Draugr|Skeleton|Bone|Legionary|Ushabti|Barrow|Ghoul|Wight/i,{k:"ash",c:[0xb8aa90,0x8a7e68],st:0x5a5246,sa:.5,g:4}],
  [/Giant|Golem|Stone|Gargoyle|Troll|Ogre/i,{k:"stone",c:[0xa89c88,0x7a7064],st:0x4a4338,sa:.4,g:8}],
  [/Frost|Ice|Yeti|Rime|Snow/i,{k:"ice",c:[0xe4f4ff,0xa8d4f0],st:0x7a98b0,sa:.45,g:7}],
  [/Demon|Imp|Fire|Flame|Salamander|Asura|Dust Demon|Bael/i,{k:"ember",c:[0xff8a30,0xff5018],add:1,st:0x2a1008,sa:.6,g:2}],
  [/Hydra|Bog|Swamp|Lizard|Scorpion|Slime|Mire|Drowned|Hag|Nymph/i,{k:"ichor",c:[0x6a8a28,0x4a6a1c],st:0x1e3410,sa:.7,g:8}],
  [/Beholder|Eye|Homunculus/i,{k:"ichor2",c:[0x8a3a9a,0x5a2a7a],st:0x2a1038,sa:.65,g:8}]];
 const BLOOD={k:"blood",c:[0x7a0f0a,0x520806],st:0x2a0605,sa:.75,g:9};
 function kindOf(nm){for(const[r,d]of KINDS)if(r.test(nm))return d;return BLOOD}

 /* ---------- particles (normal blending, so blood is dark, not glowing) ---------- */
 const P=[];
 function spark(pos,col,size,vel,life,g,add){const s=vfx.get(!!add);s.material.color.setHex(col);s.position.copy(pos);s.scale.setScalar(size);s.material.opacity=1;P.push({s,v:vel,life,max:life,size,g,add:!!add})}
 function burst(pos,d,n,speed,size,up){
  for(let i=0;i<n;i++){const v=new T.Vector3(R(-1,1),R(-.3,1)+up,R(-1,1)).normalize().multiplyScalar(speed*R(.35,1.1));
   spark(pos,d.c[i%2],size*R(.5,1.2),v,R(.45,1)*(d.k==="spirit"?1.8:1),d.g,d.add)}}

 /* ---------- stains on the ground ---------- */
 let tex=null;
 function splat(){if(tex)return tex;const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d");g.translate(64,64);g.fillStyle="#fff";
  g.beginPath();for(let i=0;i<=24;i++){const a=i/24*6.283,r=24+10*Math.sin(i*3.1)+8*Math.cos(i*5.3)+Math.random()*8;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill();
  for(let i=0;i<14;i++){const a=Math.random()*6.283,r=34+Math.random()*26,s=1.5+Math.random()*4.5;g.beginPath();g.arc(Math.cos(a)*r,Math.sin(a)*r,s,0,6.283);g.fill();
   g.lineWidth=s*.6;g.beginPath();g.moveTo(Math.cos(a)*24,Math.sin(a)*24);g.lineTo(Math.cos(a)*r,Math.sin(a)*r);g.stroke()}
  tex=new T.CanvasTexture(c);return tex}
 const D=[];let di=0;
 function decal(x,y,z,size,col,alpha,life,add){
  let o=D[di%14];if(!o){const m=new T.Mesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:splat(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,fog:true}));m.renderOrder=4;m.visible=false;scene.add(m);o={m,t:0,life:0,a:0,size:1};D[di%14]=o}
  di++;o.m.material.color.setHex(col);o.m.material.blending=add?T.AdditiveBlending:T.NormalBlending;
  o.m.position.set(x,y+.03,z);o.m.rotation.y=Math.random()*6.283;o.size=size;o.a=alpha;o.life=life;o.t=0;o.m.scale.setScalar(size*.5);o.m.visible=true}
 function ground(x,z){return(typeof DG!=="undefined"&&DG)?0:Math.max(hfn(x,z),-.3)}

 /* ---------- hooks ---------- */
 let kind=BLOOD,nm="";
 const _spawn=fx3.spawn;fx3.spawn=function(f){_spawn.apply(this,arguments);try{nm=(f&&f[0])||"";kind=kindOf(nm)}catch(e){}};
 const _hit=fx3.hit;
 fx3.hit=function(n){_hit.apply(this,arguments);try{
   if(!GORE.on||typeof n!=="number"||!this.g||!this.base)return;
   const c=this.ctr().clone(),big=n>=10;
   burst(c,kind,Math.min(28,5+(n*.7|0)),big?4.6:3.2,kind.k==="stone"||kind.k==="ice"?.12:.09,.3);
   if(kind.k==="stone"||kind.k==="ash")burst(c.clone(),{c:[0x6a6254,0x4a443a],g:6,k:"x"},4,2.2,.16,.3);
   if(Math.random()<.85){const a=Math.random()*6.283,d=R(.4,1.3),b=this.base;decal(b.x+Math.cos(a)*d,ground(b.x,b.z),b.z+Math.sin(a)*d,Math.min(1.6,.35+n*.04),kind.st,kind.sa,R(12,22),kind.add)}
   GORE.n++}catch(e){}};
 const _die=fx3.die;
 fx3.die=function(){_die.apply(this,arguments);try{
   if(!GORE.on||!this.g||!this.base)return;const b=this.base,c=this.ctr().clone();
   burst(c,kind,34,5.4,.13,.5);
   if(kind.k==="spirit"||kind.k==="ash")burst(c.clone(),{c:[0xdad4c0,0xaaa28c],g:-.5,k:"x"},18,1.8,.18,1.2);
   decal(b.x,ground(b.x,b.z),b.z,2.6+this.g.scale.y*.6,kind.st,Math.min(.9,kind.sa+.15),30,kind.add);
   for(let i=0;i<3;i++){const a=Math.random()*6.283,d=R(.8,1.8);decal(b.x+Math.cos(a)*d,ground(b.x,b.z),b.z+Math.sin(a)*d,R(.5,1.2),kind.st,kind.sa,R(20,30),kind.add)}}catch(e){}};

 /* ---------- per frame ---------- */
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{
   dt=Math.min(dt,.05);
   for(let i=P.length-1;i>=0;i--){const p=P[i];p.life-=dt;if(p.life<=0){scene.remove(p.s);vfx.pool.push(p.s);P.splice(i,1);continue}
    p.v.y-=p.g*dt;p.s.position.addScaledVector(p.v,dt);const k=p.life/p.max;p.s.material.opacity=Math.min(1,k*1.6)*(p.add?.9:.95);p.s.scale.setScalar(p.size*(.5+.5*k))}
   for(const o of D){if(!o||!o.m.visible)continue;o.t+=dt;const k=o.t/o.life;if(k>=1){o.m.visible=false;continue}
    o.m.scale.setScalar(o.size*(.5+.5*Math.min(1,o.t/.35)));o.m.material.opacity=o.a*(k>.7?(1-k)/.3:1)}
   /* stains belong to the place where the fight happened */
   if(typeof C!=="undefined"&&(!C||C.over)&&!(fx3.g))for(const o of D)if(o&&o.m.visible&&o.t>6)o.life=Math.min(o.life,o.t+2)
  }catch(e){if(!window.__goreE){window.__goreE=1;console.warn("GORE",e)}}};
})();

/* ===== The world obeys the planetary clock. Moon: spirits walk the roads and hidden doors show themselves. Mars: more and fiercer
   wanderers, and the smith lights his forge. Saturn: the dead rise near old graves, mist creeps in. Venus: shrines are kind and
   nymphs bless you. Each hour announces itself. Switchable in Graphics options ("Living hours"). ===== */
(function(){
 if(typeof PCK==="undefined"||typeof THREE==="undefined"||typeof vmUpdate==="undefined"||typeof POIS==="undefined"||typeof FOES==="undefined")return;
 const T=THREE,HW=window.HW={on:1,ents:[],hour:"",sharp:0,last:""};
 const LS={get:()=>{try{return localStorage.getItem("occultica.hours")}catch(e){return null}},set:v=>{try{localStorage.setItem("occultica.hours",v)}catch(e){}}};
 if(LS.get()==="0")HW.on=0;
 HW.setOn=v=>{HW.on=v?1:0;LS.set(v?"1":"0");if(!v)clearAll()};
 const R=(a,b)=>a+Math.random()*(b-a);
 const hourN=()=>{try{return PCK.now().hour.n}catch(e){return""}};
 const MSG={
  Moon:"☽ The hour of the Moon. Pale shapes drift along the road, and hidden doors let themselves be seen.",
  Mars:"♂ The hour of Mars. Hunters stir, and the smith has lit his forge.",
  Saturn:"♄ The hour of Saturn. The old graves are not quiet, and the mist comes up to meet the dead.",
  Venus:"♀ The hour of Venus. The shrines are kind, and the water-spirits come to bless the road.",
  Sun:"☉ The hour of the Sun. The road is bright, and the herbs lift their heads.",
  Mercury:"☿ The hour of Mercury. Locks loosen and tongues run quick.",
  Jupiter:"♃ The hour of Jupiter. A generous hour: wanderers keep their distance."};
 const LORE=[
  "'The ones who counted the hours are still counting. Do not make them lose their place.'",
  "'Saturn keeps the doors that close. Mercury keeps the ones that open. Learn which is which.'",
  "'Weeds grow where a shard has gone quiet. Follow the dead grass.'",
  "'The Unmoved One is not angry. It is only tired of moving. That is worse.'",
  "'Herbs cut under their own star carry more than their weight. Cut them under a strange star, and they carry something else.'",
  "'A circle drawn in the right hour holds. A circle drawn in the wrong hour only looks like one.'",
  "'I forgot my name three hours ago. It was a good one. Do you have it?'",
  "'The road remembers everyone who walked it. The road is not kind about it.'"];
 const NYMPH=["'Drink. The water remembers when it was kind.'","'Rest your hands here. Everything that is heavy sinks in a still pool.'","'Take this. It was given to me, and I have no use for gifts.'"];

 /* ---------- sprite textures ---------- */
 const TX={};
 function tex(kind){if(TX[kind])return TX[kind];const c=document.createElement("canvas");c.width=96;c.height=144;const g=c.getContext("2d");
  const col=kind==="nymph"?[255,170,200]:kind==="ember"?[255,150,60]:[170,205,255];
  const gr=g.createRadialGradient(48,70,2,48,70,60);gr.addColorStop(0,"rgba(255,255,255,.95)");gr.addColorStop(.25,"rgba("+col+",.6)");gr.addColorStop(1,"rgba("+col+",0)");
  g.fillStyle=gr;g.fillRect(0,0,96,144);
  /* hooded shape that trails off into wisps */
  g.fillStyle="rgba(255,255,255,.55)";g.beginPath();g.moveTo(48,18);g.quadraticCurveTo(70,24,70,56);g.quadraticCurveTo(76,96,62,128);g.quadraticCurveTo(54,118,48,134);g.quadraticCurveTo(42,118,34,128);g.quadraticCurveTo(20,96,26,56);g.quadraticCurveTo(26,24,48,18);g.fill();
  g.fillStyle="rgba(10,12,30,.8)";g.beginPath();g.ellipse(48,48,11,13,0,0,6.283);g.fill();
  g.fillStyle="rgba("+col+",1)";g.fillRect(40,46,4,3);g.fillRect(52,46,4,3);
  const t=new T.CanvasTexture(c);return TX[kind]=t}
 function mkSprite(kind,sx,sy){const m=new T.SpriteMaterial({map:tex(kind),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0,fog:true});const s=new T.Sprite(m);s.scale.set(sx||1.5,sy||2.2,1);s.renderOrder=20;return s}
 function ground(x,z){return Math.max(hfn(x,z),-.3)}
 function okTile(x,z){const tx=Math.floor(x/TW),ty=Math.floor(z/TW);return tx>1&&ty>1&&tx<W-2&&ty<H-2&&reach[ty*W+tx]&&!tileSolid(tx,ty)&&hfn(x,z)>-.2}
 function addEnt(o){o.fade=0;o.t=Math.random()*10;o.spr.position.set(o.x,ground(o.x,o.z)+(o.h||1.5),o.z);scene.add(o.spr);HW.ents.push(o);return o}
 function rmEnt(o){scene.remove(o.spr);if(o.grp)scene.remove(o.grp);const i=HW.ents.indexOf(o);if(i>=0)HW.ents.splice(i,1)}
 function clearAll(){HW.ents.slice().forEach(rmEnt)}
 const village=()=>POIS.find(p=>p.id==="village");

 /* ---------- the smith's forge (Mars hour) ---------- */
 function mkForge(){const v=village();if(!v)return null;
  const vx=v.x*TW+1,vz=v.y*TW+1;let x=0,z=0,ok=false;
  for(const[ox,oz]of[[7.5,6.5],[-7.5,6.5],[8,-6],[-8,-6],[0,9.5],[9.5,0]]){x=vx+ox;z=vz+oz;if(okTile(x,z)){ok=true;break}}
  if(!ok)return null;
  const g=new T.Group(),gy=ground(x,z);g.position.set(x,gy,z);
  const dark=new T.MeshLambertMaterial({color:0x2a2622}),wood=new T.MeshLambertMaterial({color:0x4a3320});
  const anvil=new T.Mesh(new T.BoxGeometry(.9,.5,.45),dark);anvil.position.set(0,.55,0);const base=new T.Mesh(new T.CylinderGeometry(.35,.45,.45,8),wood);base.position.set(0,.22,0);
  const hearth=new T.Mesh(new T.CylinderGeometry(.7,.85,.7,10),new T.MeshLambertMaterial({color:0x4a423c}));hearth.position.set(1.7,.35,.2);
  const glow=new T.Mesh(new T.CylinderGeometry(.55,.55,.08,10),new T.MeshBasicMaterial({color:0xff7a28}));glow.position.set(1.7,.72,.2);
  const smith=new T.Group(),body=new T.Mesh(new T.CylinderGeometry(.3,.38,1.1,8),new T.MeshLambertMaterial({color:0x5a3a22})),head=new T.Mesh(new T.SphereGeometry(.24,8,6),new T.MeshLambertMaterial({color:0xc89868})),hat=new T.Mesh(new T.CylinderGeometry(.27,.27,.12,8),new T.MeshLambertMaterial({color:0x201814}));
  body.position.y=.85;head.position.y=1.6;hat.position.y=1.82;smith.add(body,head,hat);smith.position.set(-.9,0,.1);
  const hammer=new T.Mesh(new T.BoxGeometry(.12,.7,.12),wood);hammer.position.set(-.5,1.2,.1);hammer.userData.hm=1;
  g.add(anvil,base,hearth,glow,smith,hammer);g.userData={glow,hammer,smith};
  const fs=mkSprite("ember",3.2,3.2);fs.position.set(1.7,1.2,.2);g.add(fs);g.userData.fs=fs;
  scene.add(g);
  const spr=new T.Object3D();return addEnt({k:"smith",x:x-.2,z:z,spr,grp:g,h:0,R:4.2})}

 /* ---------- spawning ---------- */
 function nearestHidden(){let b=null,bd=1e9;POIS.forEach(p=>{if(p.hidden&&!found[p.id]){const d=Math.hypot(p.x*TW+1-P.x,p.y*TW+1-P.z);if(d<bd){bd=d;b=p}}});return b?{p:b,d:bd}:null}
 let spT=0,smT=0,gvT=0,lastWx="",mT=0;
 function outdoors(){return typeof world!=="undefined"&&world&&world.visible&&!DG&&hero}
 function spawnSpirits(h,dt){
  const n=performance.now()/1000;if(n<spT)return;spT=n+3;
  if(h==="Moon"){if(HW.ents.filter(e=>e.k==="spirit").length>=3)return;
   for(let k=0;k<12;k++){const a=Math.random()*6.283,d=R(9,20),x=P.x+Math.cos(a)*d,z=P.z+Math.sin(a)*d;if(!okTile(x,z))continue;
    addEnt({k:"spirit",x,z,spr:mkSprite("spirit",1.5,2.2),h:1.6,R:3.4,life:75,used:0});break}}
  if(h==="Venus"){
   POIS.forEach(p=>{if(p.k!=="t"&&p.k!=="v"&&p.id!=="shrine")return;const px=p.x*TW+1,pz=p.y*TW+1;if(Math.hypot(px-P.x,pz-P.z)>34)return;
    if(HW.ents.some(e=>e.k==="nymph"&&e.poi===p.id))return;
    for(let i=0;i<2;i++)for(let k=0;k<10;k++){const a=Math.random()*6.283,d=R(3,5.5),x=px+Math.cos(a)*d,z=pz+Math.sin(a)*d;if(!okTile(x,z))continue;
     addEnt({k:"nymph",poi:p.id,x,z,spr:mkSprite("nymph",1.5,2.2),h:1.5,R:3.4,used:0});break}})}}
 const UNDEAD=/Wraith|Mummy|Skeleton|Ghoul|Wight|Draugr|Fallen Paladin/;
 const GRAVE=new Set(["crypt","ruin","cathedral","lair","tomb","ice","cave"]);
 function raiseDead(dt){
  const n=performance.now()/1000;if(n<gvT)return;gvT=n+6;
  const RM=window.__ROAM;if(!RM||RM.length>=6||typeof window.__mkRoamer!=="function")return;
  const busy=!!((typeof C!=="undefined"&&C)||(typeof D!=="undefined"&&D)||packOpen||occOpen);if(busy)return;
  const near=POIS.filter(p=>GRAVE.has(p.id)&&Math.hypot(p.x*TW+1-P.x,p.y*TW+1-P.z)<38);if(!near.length)return;
  const p=near[Math.floor(Math.random()*near.length)],px=p.x*TW+1,pz=p.y*TW+1;
  for(let k=0;k<12;k++){const a=Math.random()*6.283,d=R(5,10),x=px+Math.cos(a)*d,z=pz+Math.sin(a)*d;
   if(!okTile(x,z)||Math.hypot(x-P.x,z-P.z)<12)continue;
   const tx=Math.floor(x/TW),ty=Math.floor(z/TW),t=tierAt(tx,ty);let list=[];
   for(const b in FOES)for(const f of FOES[b])if(UNDEAD.test(f[0])&&f[8]<=t+1)list.push(f);if(!list.length)continue;
   try{window.__mkRoamer(list[Math.floor(Math.random()*list.length)],t,x,z);HW.raised=(HW.raised||0)+1}catch(e){}break}}
 function moonDoors(dt){
  const n=performance.now()/1000;if(n<mT)return;mT=n+1;
  POIS.forEach(p=>{if(p.hidden&&!found[p.id]&&Math.hypot(p.x*TW+1-P.x,p.y*TW+1-P.z)<20){found[p.id]=1;try{say("☽ The moonlight shows a door in the "+BIOMES[biome[p.y][p.x]].n+": "+p.name+".");hud()}catch(e){}}})}

 /* ---------- interaction ---------- */
 function nearEnt(){if(!HW.on||!outdoors())return null;let b=null,bd=99;
  for(const e of HW.ents){if(e.used||e.fade<.5)continue;const d=Math.hypot(e.x-P.x,e.z-P.z);if(d<e.R&&d<bd){bd=d;b=e}}return b}
 HW.near=()=>{try{return !!nearEnt()}catch(e){return false}};
 HW.label=()=>{const e=nearEnt();return e?(e.k==="spirit"?"Listen to the spirit":e.k==="nymph"?"Accept the nymph's blessing":"Visit the smith's forge"):""};
 const give=(hp,mp)=>{try{hero.hp=Math.min(hero.maxHp,hero.hp+Math.ceil(hero.maxHp*hp));hero.mana=Math.min(hero.maxMana,hero.mana+Math.ceil(hero.maxMana*mp));hud()}catch(e){}};
 HW.use=function(){const e=nearEnt();if(!e)return;
  if(e.k==="spirit"){e.used=1;e.life=Math.min(e.life,6);
   const nh=nearestHidden();let extra="";
   if(nh&&Math.random()<.55){found[nh.p.id]=1;extra=" It points a long finger at "+nh.p.name+". You will know the way now.";hud()}
   give(0,.25);try{sfx("win")}catch(x){}
   say("☽ "+LORE[Math.floor(Math.random()*LORE.length)]+extra+" (+25% mana)")}
  else if(e.k==="nymph"){e.used=1;give(.3,.15);try{sfx("win")}catch(x){}
   try{hero.rit=hero.rit||{};hero.rit.bless=Date.now()+180000}catch(x){}
   say("♀ "+NYMPH[Math.floor(Math.random()*NYMPH.length)]+" (+30% health, +15% mana, and a blessing for 3 minutes)")}
  else if(e.k==="smith")smithMenu()};
 function smithMenu(){
  const b=occPanel("The Smith's Forge","#ff8a3a");
  b.appendChild(el("p","The smith works only in the hour of Mars, and the iron is hot. He will sharpen your blade or bring up your armor, for a price.","sub"));
  const m=el("div",null,"menu");m.style.gridTemplateColumns="1fr";b.appendChild(m);
  const buy=(t,cost,fn)=>m.appendChild(btn(t+" ("+cost+" gp)",()=>{if(hero.gold<cost)return;hero.gold-=cost;fn();hud();smithMenu()},"go",hero.gold<cost));
  buy("Sharpen weapon: +2 damage for your next 3 fights",25,()=>{HW.sharp=3;say("The wheel screams and sparks fall. Your weapon bites harder for 3 fights.")});
  buy("Mend and polish armor: +1 AC for your next 3 fights",30,()=>{hero.rit=hero.rit||{};hero.rit.pol=3;say("The smith hammers out the dents. Armor +1 for 3 fights.")});
  m.appendChild(btn("Leave the forge",()=>occClose(),"alt"))}
 try{const _id=interact;interact=function(){if(!C&&!packOpen&&!D&&!DG&&!occOpen&&hero&&HW.near())return HW.use();return _id.apply(this,arguments)}}catch(e){}

 /* sharpened weapon: the smith's work lasts three fights */
 try{const _fd=foeDamage;foeDamage=function(n){if(typeof n==="number"&&HW.sharp>0&&n>0)n+=2;return _fd.call(this,n)}}catch(e){}
 try{const _sc=startCombat;startCombat=function(){const r=_sc.apply(this,arguments);try{
   if(HW.sharp>0)HW.sharp--;
   if(hero.rit&&hero.rit.pol>0){hero.rit.pol--;if(C&&C.e)C.e.atk=Math.max(1,(C.e.atk||1)-1)}
   if(HW.on&&C&&C.e){const h=hourN();
    if(h==="Mars"&&Math.random()<.5){C.e.atk=(C.e.atk||1)+1;try{say("♂ Mars is up. The "+C.e.name+" fights harder.")}catch(e){}}
    if(h==="Saturn"&&/Wraith|Mummy|Skeleton|Ghoul|Draugr|Wight|Paladin/.test(C.e.name)){C.e.hp=Math.ceil(C.e.hp*1.15);C.e.max=Math.max(C.e.max,C.e.hp)}}}catch(e){}return r}}catch(e){}

 /* ---------- hour changes ---------- */
 function onHour(h){
  HW.hour=h;if(!HW.on||!hero)return;
  /* the old hour's visitors leave */
  HW.ents.slice().forEach(e=>{if((e.k==="spirit"&&h!=="Moon")||(e.k==="nymph"&&h!=="Venus")||(e.k==="smith"&&h!=="Mars"))e.leave=1});
  try{if(MSG[h]&&outdoors())toast(MSG[h])}catch(e){}
  /* the weather follows the hour */
  try{if(window.WX&&WX.on&&outdoors()){const bt=biome[Math.floor(P.z/TW)][Math.floor(P.x/TW)];
   if(h==="Saturn"&&Math.random()<.75)WX.set("mist");
   else if(h==="Mars"&&Math.random()<.5)WX.set(bt==="desert"?"dust":bt==="tundra"?"snow":"storm");
   else if(h==="Venus"&&Math.random()<.4&&bt!=="desert"&&bt!=="tundra")WX.set("drizzle")}}catch(e){}
  if(h==="Mars")smT=0}

 /* ---------- per frame ---------- */
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{
   if(!HW.on||typeof hero==="undefined"||!hero||typeof scene==="undefined"||!scene)return;
   dt=Math.min(dt,.05);const h=hourN();if(h!==HW.hour)onHour(h);
   const out=outdoors(),clk=(typeof clock!=="undefined"?clock:performance.now()/1000);
   if(out&&!occOpen){
    const busy=!!((typeof C!=="undefined"&&C)||(typeof D!=="undefined"&&D));
    if(!busy){spawnSpirits(h,dt);
     if(h==="Moon")moonDoors(dt);
     if(h==="Saturn")raiseDead(dt);
     if(h==="Mars"){const nn=performance.now()/1000;if(nn>=smT){smT=nn+8;if(!HW.ents.some(e=>e.k==="smith")&&Math.hypot((village()?village().x*TW+1:0)-P.x,(village()?village().y*TW+1:0)-P.z)<70)mkForge();
       const RM=window.__ROAM,sf=window.__ts;if(RM&&RM.length<6&&typeof sf==="function"&&Math.random()<.7)sf()}}}}
   /* a nymph's blessing slowly mends you while you walk */
   if(out&&hero.rit&&hero.rit.bless>Date.now()){HW.bt=(HW.bt||0)+dt;if(HW.bt>5){HW.bt=0;if(hero.hp<hero.maxHp){hero.hp++;try{hud()}catch(e){}}}}
   for(let i=HW.ents.length-1;i>=0;i--){const e=HW.ents[i];e.t+=dt;
    const d=Math.hypot(e.x-P.x,e.z-P.z),vis=out&&!(e.k==="smith"&&false);
    if(e.life!==undefined){e.life-=dt;if(e.life<=0)e.leave=1}
    const want=(!vis||e.leave||d>46)?0:(e.k==="smith"?1:Math.min(1,Math.max(0,(26-d)/10))*(e.used?.45:1));
    e.fade+=(want-e.fade)*Math.min(1,dt*(e.leave?1.4:2.2));
    if(e.k==="spirit"||e.k==="nymph"){
     e.x+=Math.cos(e.t*.31+i)*dt*.35;e.z+=Math.sin(e.t*.27+i*2)*dt*.35;
     e.spr.position.set(e.x,ground(e.x,e.z)+e.h+Math.sin(e.t*1.3+i)*.28,e.z);
     e.spr.material.opacity=e.fade*(.7+.3*Math.sin(e.t*2.2+i))*(e.used?.5:1);e.spr.visible=e.fade>.02}
    else if(e.k==="smith"&&e.grp){e.grp.visible=out&&e.fade>.05;
     const gd=e.grp.userData;gd.glow.material.color.setRGB(1,.35+.25*Math.sin(clk*9)*Math.sin(clk*3.3),.12);gd.fs.material.opacity=(.55+.25*Math.sin(clk*11))*e.fade;
     gd.hammer.rotation.z=Math.sin(clk*7)>.4?-.9:.3;gd.smith.rotation.y=Math.sin(clk*.4)*.3}
    if((e.leave&&e.fade<.03)||(d>60&&e.k!=="smith")){rmEnt(e)}}
  }catch(er){if(!window.__hwE){window.__hwE=1;console.warn("HW",er)}}};

 /* OMEN spawn multiplier: Mars hour wanderers come twice as fast, Venus and Jupiter hours the road is quieter */
 try{if(window.OMEN&&OMEN.m){const _m=OMEN.m;OMEN.m=function(k){let r=_m.apply(this,arguments);if(k==="spawn"&&HW.on){const h=hourN();if(h==="Mars")r*=.5;else if(h==="Venus"||h==="Jupiter")r*=1.7}return r}}}catch(e){}
})();

/* ===== Rituals: gather the herbs, wait for the hour, trace the sigil, speak the words. Four rites: Ward (Saturn), Bind a Spirit (Moon),
   Curse (Mars), Open a Sealed Door (Mercury). Press B or use the Rites button. ===== */
(function(){
 if(typeof PCK==="undefined"||typeof PLN==="undefined"||typeof vmUpdate==="undefined"||typeof THREE==="undefined")return;
 const T=THREE,RIT=window.RIT={open:false,ph:"",rite:null};
 const NODEPL=PLN.map(p=>p.n);
 /* the seven nodes sit on a circle, one per wandering star */
 const RITES=[
  {id:"ward",n:"Ward the Land",pl:"Saturn",herbs:2,seq:[6,2,5,1,4,0],words:"Claustra mea sunt, terminus meus est. Nothing crosses that I have not named.",
   desc:"A ring of saturnine light around where you stand. For five minutes, wanderers will not come near, and those inside are driven out.",need:()=>(typeof world!=="undefined"&&world&&world.visible&&!DG)?"":"Raise a ward outdoors."},
  {id:"bind",n:"Bind a Spirit",pl:"Moon",herbs:2,seq:[1,4,0,3,6],words:"Per lunam et per umbram, come and be held. One fight, and you are free.",
   desc:"Bind a moon-spirit to your next fight. It strikes the foe every few seconds until the fight is done.",need:()=>spiritNear()?"":"No spirit is near. They walk the roads in the hour of the Moon."},
  {id:"curse",n:"Lay a Curse",pl:"Mars",herbs:2,seq:[3,0,4,1,5,2],words:"Ferrum in sanguine, sanguis in ferro. Let the first blow find you weak.",
   desc:"Your next foe begins wounded and strikes weaker. Cheap, and it costs you nothing but a little of yourself.",need:()=>""},
  {id:"open",n:"Open a Sealed Door",pl:"Mercury",herbs:2,seq:[2,5,1,4,0],words:"Aperi, Ianua. The key was only ever a question.",
   desc:"Every iron seal, brass lock and hidden door in the room you stand in opens. Dungeons only.",need:()=>(typeof DG!=="undefined"&&DG&&window.MZ&&MZ.on&&MZ.room)?"":"Only in a dungeon, standing in a room with a locked door."},
  {id:"cleanse",n:"Rite of Cleansing",pl:"Sun",herbs:2,seq:[0,3,6,2,5],words:"Lux in tenebris. Take back what I lent you, and leave me what is mine.",
   desc:"Washes the stain of forbidden power from you: Corruption falls by 25. The Sun's own rite.",need:()=>(window.COR&&COR.val()>0)?"":"You are not corrupted."}];
 const DARK={curse:8,bind:5,open:3,ward:0,cleanse:-25};
 const rs=()=>{hero.rit=hero.rit||{};return hero.rit};
 function spiritNear(){try{return window.HW&&HW.ents.find(e=>e.k==="spirit"&&!e.used&&Math.hypot(e.x-P.x,e.z-P.z)<14&&e.fade>.3)}catch(e){return null}}
 const hCount=pl=>herbCount(pl);
 function when(pl){const m=PCK.mult(pl);return m.kind==="hour"||m.kind==="both"?{q:1.5,tag:"in its hour"}:m.kind==="day"?{q:1,tag:"on its day"}:null}
 const fmt=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
 const wait=pl=>{const h=PCK.sched(8).find(s=>s.pl.n===pl);return h?fmt(h.inMs):"later"};

 /* ---------- the panel ---------- */
 let box=null,ov=null,cv=null,cx=null,btnEl=null;
 function ensure(){if(ov)return;
  ov=document.createElement("div");ov.className="ov";ov.id="ritp";ov.hidden=true;ov.style.zIndex=13;
  ov.innerHTML='<div class="box" id="ritbox" style="max-width:520px;background:rgba(14,10,22,.97);border-color:#9a5ac0;text-align:center"></div>';
  document.body.appendChild(ov);box=ov.querySelector("#ritbox");
  /* a small always-visible button, for people without a keyboard */
  btnEl=document.createElement("button");btnEl.id="ritbtn";btnEl.textContent="☉ Rites (B)";btnEl.type="button";
  btnEl.style.cssText="position:fixed;right:10px;top:150px;z-index:9;padding:6px 10px;border:1px solid #6a4a9a;border-radius:6px;background:rgba(14,8,26,.78);color:#e6d8ff;font:13px Cinzel,Georgia,serif;cursor:pointer;display:none";
  btnEl.onclick=()=>{if(RIT.open)close();else openList()};document.body.appendChild(btnEl)}
 function canOpen(){return !!hero&&!C&&!D&&!packOpen&&!occOpen&&(!ov||ov.hidden)}
 function close(){if(!ov)return;ov.hidden=true;RIT.open=false;RIT.ph="";occOpen=false;try{hud()}catch(e){}}
 function openList(msg){ensure();if(!hero)return;if(!RIT.open&&!canOpen())return;
  const q=rs();if(!q.gift){q.gift=1;["Saturn","Moon","Mars","Mercury"].forEach(pl=>{const h=PLN.find(p=>p.n===pl).h[0];hero.inv[h]=(hero.inv[h]||0)+2});try{say("You find a pouch of herbs tucked into your pack: two each for Saturn, the Moon, Mars and Mercury.")}catch(e){}}
  RIT.open=true;RIT.ph="list";occOpen=true;ov.hidden=false;box.innerHTML="";
  const h=document.createElement("h2");h.textContent="☉ The Rites";h.style.color="#c8a0ff";box.appendChild(h);
  const c=PCK.now();
  mk("p","Knowledge is not free. Gather the herbs of a star, wait for its hour (or its day, for a weaker rite), trace its sigil, then speak the words. The current hour is "+c.hour.g+" "+c.hour.n+" ("+fmt(c.left)+" left).","sub");
  if(msg)mk("p",msg,"msg");
  const act=[];if(q.ward>Date.now())act.push("Ward: "+fmt(q.ward-Date.now())+" left");if(q.bound)act.push("Spirit bound");if(q.curse)act.push("Curse laid");
  if(act.length)mk("p","Active: "+act.join(" · "),"sub");
  try{if(window.QOL)mk("p",QOL.hint(),"sub")}catch(e){}
  RITES.forEach(r=>{const w=when(r.pl),hc=hCount(r.pl),why=r.need(),pl=PLN.find(p=>p.n===r.pl);
   const st=!w?"wait for the "+r.pl+" hour (in "+wait(r.pl)+")":hc<r.herbs?"need "+r.herbs+" "+r.pl+" herbs ("+hc+")":why?why:"ready"+(w.q>1?" ✦ potent":"");
   const b=document.createElement("button");b.type="button";b.className=(w&&hc>=r.herbs&&!why)?"go":"alt";b.style.cssText="text-align:left;display:block;width:100%;margin:2px 0";
   b.innerHTML="<b>"+pl.g+" "+r.n+"</b> <span style='opacity:.7'>("+r.pl+")</span><br><span style='font-size:.85em;opacity:.8'>"+r.desc+"</span><br><span style='font-size:.85em;color:"+((w&&hc>=r.herbs&&!why)?"#ffd890":"#c8a0a0")+"'>"+st+"</span>";
   b.disabled=!(w&&hc>=r.herbs&&!why);b.onclick=()=>startRite(r,w);box.appendChild(b)});
  const x=document.createElement("button");x.type="button";x.className="alt";x.textContent="Close (B)";x.onclick=close;box.appendChild(x)}
 function mk(tag,txt,cls){const e=document.createElement(tag);e.textContent=txt;if(cls)e.className=cls;box.appendChild(e);return e}

 /* ---------- the sigil game ---------- */
 const SZ=300,CXY=150,RAD=112;
 const np=i=>{const a=-Math.PI/2+i*2*Math.PI/7;return[CXY+Math.cos(a)*RAD,CXY+Math.sin(a)*RAD]};
 let G=null;
 function startRite(r,w){
  if(spendCheck(r))return;
  RIT.rite=r;RIT.ph="watch";box.innerHTML="";
  const pl=PLN.find(p=>p.n===r.pl);
  const h=document.createElement("h2");h.textContent=pl.g+" "+r.n;h.style.color="#c8a0ff";box.appendChild(h);
  const info=mk("p","Watch the sigil. Then trace it from the first star to the last.","sub");
  cv=document.createElement("canvas");cv.width=SZ;cv.height=SZ;cv.style.cssText="width:min(300px,80vw);height:min(300px,80vw);touch-action:none;margin:0 auto;border-radius:50%;background:radial-gradient(circle,#1a1228 0%,#0a0710 80%);cursor:crosshair";box.appendChild(cv);cx=cv.getContext("2d");
  const bar=document.createElement("div");bar.style.cssText="height:5px;background:#2a2118;border-radius:3px;overflow:hidden;margin:6px auto;width:min(300px,80vw)";const bi=document.createElement("div");bi.style.cssText="height:100%;width:100%;background:#c9a24c";bar.appendChild(bi);box.appendChild(bar);
  const x=document.createElement("button");x.type="button";x.className="alt";x.textContent="Abandon the rite";x.onclick=()=>{G=null;openList()};box.appendChild(x);
  G={r,w,t:0,phase:"watch",idx:0,mist:0,info,bi,trail:[],drag:false,pos:null,done:0,time:0,spent:false,hit:{}};
  cv.onpointerdown=e=>{if(!G||G.phase!=="trace")return;try{cv.setPointerCapture(e.pointerId)}catch(x){}G.drag=true;ptr(e)};
  cv.onpointermove=e=>{if(G&&G.drag)ptr(e)};cv.onpointerup=cv.onpointercancel=()=>{if(G)G.drag=false};
  tickGame()}
 function ptr(e){if(!G||G.phase!=="trace")return;const b=cv.getBoundingClientRect(),x=(e.clientX-b.left)*SZ/b.width,y=(e.clientY-b.top)*SZ/b.height;G.pos=[x,y];
  for(let i=0;i<7;i++){const[nx,ny]=np(i);if(Math.hypot(nx-x,ny-y)<22)touch(i)}}
 function touch(i){const g=G;if(g.last===i)return;g.last=i;const want=g.r.seq[g.idx];
  if(i===want){g.idx++;g.trail.push(i);g.flash={i,c:"#ffe08a",t:.4};try{sfx("hit")}catch(e){}if(g.idx>=g.r.seq.length)finish(true)}
  else if(g.trail[g.trail.length-1]!==i){g.mist++;g.flash={i,c:"#ff5a5a",t:.5};try{sfx("miss")}catch(e){}if(g.mist>2)finish(false)}}
 function spendCheck(r){return hCount(r.pl)<r.herbs}
 function tickGame(){if(!G||!RIT.open||RIT.ph!=="watch"&&RIT.ph!=="trace"){return}
  const g=G,nw=performance.now(),dtt=Math.min(1.5,(nw-(g.lt||nw))/1000);g.lt=nw;g.dt=dtt;g.t+=dtt;draw();
  if(g.phase==="watch"){const dur=1.0+g.r.seq.length*.55;g.info.textContent="Watch the sigil…";if(g.t>dur+.6){g.phase="trace";RIT.ph="trace";g.time=0;g.last=-1;g.info.textContent="Now trace it: touch or drag through the stars in the same order."}}
  else if(g.phase==="trace"){g.time+=dtt;const lim=g.r.seq.length*2.6+4;g.bi.style.width=Math.max(0,100*(1-g.time/lim))+"%";if(g.time>lim)finish(false)}
  if(g&&G===g&&g.phase!=="done")setTimeout(tickGame,33)}
 function draw(){const g=G;cx.clearRect(0,0,SZ,SZ);
  /* outer rings and heptagram scaffold */
  cx.strokeStyle="rgba(150,110,200,.35)";cx.lineWidth=1;cx.beginPath();cx.arc(CXY,CXY,RAD+22,0,6.283);cx.stroke();cx.beginPath();cx.arc(CXY,CXY,RAD-30,0,6.283);cx.stroke();
  cx.strokeStyle="rgba(150,110,200,.18)";cx.beginPath();for(let i=0;i<=7;i++){const[x,y]=np((i*3)%7);i?cx.lineTo(x,y):cx.moveTo(x,y)}cx.stroke();
  const seq=g.r.seq;let shown=0;
  if(g.phase==="watch"){shown=Math.min(seq.length,Math.floor(g.t/.55));
   cx.strokeStyle="rgba(255,224,138,.85)";cx.lineWidth=3;cx.beginPath();for(let i=0;i<shown;i++){const[x,y]=np(seq[i]);i?cx.lineTo(x,y):cx.moveTo(x,y)}
   if(shown>0&&shown<seq.length){const f=(g.t/.55)%1,[ax,ay]=np(seq[shown-1]),[bx,by]=np(seq[shown]);cx.lineTo(ax+(bx-ax)*f,ay+(by-ay)*f)}cx.stroke()}
  else if(g.phase==="trace"||g.phase==="done"){
   cx.strokeStyle=g.phase==="done"&&g.ok?"rgba(255,230,150,.95)":"rgba(255,224,138,.8)";cx.lineWidth=3.5;cx.beginPath();g.trail.forEach((i,k)=>{const[x,y]=np(i);k?cx.lineTo(x,y):cx.moveTo(x,y)});
   if(g.drag&&g.pos&&g.trail.length)cx.lineTo(g.pos[0],g.pos[1]);cx.stroke()}
  /* faint hint of the first star only while tracing */
  for(let i=0;i<7;i++){const[x,y]=np(i);const hit=g.trail.includes(i),nxt=g.phase==="trace"&&g.idx===0&&i===seq[0]&&Math.sin(g.t*8)>0,wv=g.phase==="watch"&&seq.slice(0,shown).includes(i);
   cx.fillStyle=hit||wv?"#ffe08a":nxt?"#9a8ac0":"#3a3050";cx.beginPath();cx.arc(x,y,hit||wv?9:7,0,6.283);cx.fill();
   if(g.flash&&g.flash.i===i&&g.flash.t>0){cx.strokeStyle=g.flash.c;cx.lineWidth=3;cx.beginPath();cx.arc(x,y,16+(.5-g.flash.t)*14,0,6.283);cx.stroke();g.flash.t-=(g.dt||.033)}
   cx.fillStyle="#d8c8f0";cx.font="14px serif";cx.textAlign="center";cx.fillText(PLN[i].g,x,y-14)}
  cx.fillStyle="rgba(255,255,255,.5)";cx.font="12px serif";cx.fillText("mistakes: "+g.mist+"/2",CXY,CXY+4)}
 function finish(ok){const g=G;if(!g||g.phase==="done")return;g.phase="done";g.ok=ok;RIT.ph="done";g.drag=false;draw();
  const r=g.r;spendHerbs(r.pl,r.herbs);try{hud()}catch(e){}
  setTimeout(()=>{if(!RIT.open)return;box.innerHTML="";
   const q=g.w.q*(g.mist===0?1:.7),potent=ok&&g.mist===0&&g.w.q>1;
   const h=document.createElement("h2");
   if(!ok){h.textContent="The sigil breaks";h.style.color="#e08080";box.appendChild(h);mk("p","The lines slip, and the circle goes cold. The herbs are ash. Nothing answers.","msg");
    try{sfx("miss")}catch(e){}
    const b=document.createElement("button");b.type="button";b.className="alt";b.textContent="Back to the rites";b.onclick=()=>{G=null;openList()};box.appendChild(b);return}
   h.textContent=(potent?"✦ The sigil blazes":"The sigil holds");h.style.color="#ffe08a";box.appendChild(h);
   mk("p",r.words,"msg").style.fontStyle="italic";
   mk("p",potent?"A perfect tracing in the right hour. The rite will be potent.":"The rite will work, though not at full strength.","sub");
   const b=document.createElement("button");b.type="button";b.className="go";b.textContent="Speak the words";b.onclick=()=>{close();effect(r,potent?1.5:1,potent);G=null};box.appendChild(b)},700)}

 /* ---------- what the rites do ---------- */
 function effect(r,q,potent){const s=rs();
  try{sfx("win");if(window.ENV&&ENV.enabled()&&ENV.state()==="running")ENV.S.resonance()}catch(e){}
  try{if(typeof flash==="function")flash("rgba(200,160,255,.3)")}catch(e){}
  if(r.id==="ward"){s.ward=Date.now()+300000*q;s.wx=P.x;s.wz=P.z;buildRing();try{say("♄ The ward is drawn. For "+Math.round(5*q)+" minutes, nothing wild will cross this ring.")}catch(e){}}
  else if(r.id==="bind"){const sp=spiritNear();if(sp){sp.used=1;sp.leave=1}s.bound=q;try{say("☽ The spirit sighs, and settles into your shadow. It will fight for you once.")}catch(e){}}
  else if(r.id==="curse"){s.curse=q;try{say("♂ The curse is laid. Your next foe will begin wounded and strike weaker.")}catch(e){}}
  else if(r.id==="open"){let n=0;try{const m=DG.s.mz,cur=m.cur;Object.keys(MZ.L.edges).forEach(k=>{const p=k.split("-");if((+p[0]===cur||+p[1]===cur)&&/iron|brass|secret/.test(MZ.L.edges[k])&&!m.open[k]){m.open[k]=1;n++}});
    if(n){DG.s.unl=1;MZ.setNode(cur,MZ.room.entry,true);try{renderDg()}catch(e){}}}catch(e){console.warn("open rite",e)}
    try{say(n?"☿ Aperi. "+n+" seal"+(n>1?"s":"")+" fall away, and the door stands open.":"☿ The words work, but there is nothing sealed in this room. The rite is wasted.")}catch(e){}}
  try{if(typeof BN!=="undefined"&&BN.banner)BN.banner(PLN.find(p=>p.n===r.pl).g+" "+r.n.toUpperCase())}catch(e){}
  try{if(window.COR&&DARK[r.id])COR.add(DARK[r.id]*(DARK[r.id]>0&&q>1?.75:1)|0||DARK[r.id],r.id==='cleanse'?'cleansed':r.n.toLowerCase())}catch(e){}
  try{save()}catch(e){}}

 /* the ward: a glowing ring on the ground, wanderers kept out */
 let ring=null;
 function dotTex(){const c=document.createElement("canvas");c.width=c.height=32;const g=c.getContext("2d");const gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,"rgba(255,235,170,1)");gr.addColorStop(.4,"rgba(220,170,80,.5)");gr.addColorStop(1,"rgba(220,170,80,0)");g.fillStyle=gr;g.fillRect(0,0,32,32);return new T.CanvasTexture(c)}
 const WR=24;
 function buildRing(){if(ring){scene.remove(ring);ring=null}const s=rs();if(!(s.ward>Date.now())||typeof scene==="undefined"||!scene)return;
  ring=new T.Group();const m=new T.SpriteMaterial({map:dotTex(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.8,fog:false});
  for(let i=0;i<56;i++){const a=i/56*6.283,x=s.wx+Math.cos(a)*WR,z=s.wz+Math.sin(a)*WR,sp=new T.Sprite(m);sp.scale.set(4,4,1);sp.position.set(x,Math.max(hfn(x,z),-.3)+.7,z);sp.userData.a=a;ring.add(sp)}scene.add(ring)}
 const inWard=(x,z)=>{const s=hero&&hero.rit;return !!(s&&s.ward>Date.now()&&Math.hypot(x-s.wx,z-s.wz)<WR+14)};
 if(window.OMEN&&OMEN.m){const _m=OMEN.m;OMEN.m=function(k){let r=_m.apply(this,arguments);try{if(k==="spawn"&&hero&&inWard(P.x,P.z))r*=60}catch(e){}return r}}

 /* bound spirit and curse, in the fight */
 let spr=null;
 function wisp(){if(spr)return spr;const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d");const gr=g.createRadialGradient(32,32,2,32,32,30);gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.3,"rgba(160,200,255,.7)");gr.addColorStop(1,"rgba(120,160,255,0)");g.fillStyle=gr;g.fillRect(0,0,64,64);
  spr=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));spr.scale.set(1.2,1.2,1);spr.renderOrder=30;scene.add(spr);return spr}
 try{const _sc=startCombat;startCombat=function(){const r=_sc.apply(this,arguments);try{if(C&&C.e&&hero&&hero.rit){const s=hero.rit;
    if(s.curse){const q=s.curse;s.curse=0;C.e.hp=Math.max(1,Math.ceil(C.e.hp*(1-.25*q)));C.e.atk=Math.max(1,Math.floor((C.e.atk||1)*(1-.25*q)));try{clog("♂ The curse is on it. It starts wounded, and strikes weaker.")}catch(e){}}
    if(s.bound){C.bound=s.bound;s.bound=0;C.bt=performance.now()+2200;try{clog("☽ Your bound spirit flickers into the fight.")}catch(e){}}}}catch(e){}return r}}catch(e){}

 /* ---------- hooks: key, button, per-frame ---------- */
 addEventListener("keydown",e=>{if(!hero||e.repeat||/TEXTAREA|INPUT|SELECT/.test((e.target&&e.target.tagName)||""))return;
  if(e.key==="b"||e.key==="B"){if(RIT.open){close();e.preventDefault()}else if(canOpen()){openList();e.preventDefault()}}
  else if(e.key==="Escape"&&RIT.open){close();e.stopImmediatePropagation();e.preventDefault()}},true);
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!hero)return;dt=Math.min(dt,.05);
   ensure();btnEl.style.display=(!hero||C||DG&&false)?"none":"block";
   const s=hero.rit;
   if(s&&s.ward>Date.now()){
    if(!ring)buildRing();
    if(ring){const t=(typeof clock!=="undefined"?clock:performance.now()/1000);ring.visible=!DG&&world.visible;ring.children.forEach((sp,i)=>{sp.material.opacity=.8;sp.position.y=Math.max(hfn(sp.position.x,sp.position.z),-.3)+.7+Math.sin(t*2+sp.userData.a*7)*.25;const k=.8+.3*Math.sin(t*3+sp.userData.a*5);sp.scale.set(4*k,4*k,1)})}
    /* drive out anything wild inside */
    const RM=window.__ROAM;if(RM&&!DG)for(let i=RM.length-1;i>=0;i--){const r=RM[i],g=r.F.g.position;if(!r.dead&&inWard(g.x,g.z)&&Math.hypot(g.x-s.wx,g.z-s.wz)<WR){const dx=g.x-s.wx,dz=g.z-s.wz,d=Math.hypot(dx,dz)||1;g.x+=dx/d*dt*5;g.z+=dz/d*dt*5;r.mode="wander"}}}
   else if(ring){scene.remove(ring);ring=null;if(s&&s.ward){s.ward=0;try{say("♄ The ward fades.")}catch(e){}}}
   /* the bound spirit strikes */
   if(C&&C.bound&&!C.over&&C.e&&C.e.hp>0&&fx3.g){const w=wisp(),nowT=performance.now();
    const g=fx3.g.position,t=(typeof clock!=="undefined"?clock:0);w.position.set(g.x+Math.cos(t*2)*1.6,g.y+1.6+Math.sin(t*3)*.3,g.z+Math.sin(t*2)*1.6);w.material.opacity=.9;
    if(nowT>=C.bt){C.bt=nowT+3000;const d=Math.ceil((3+(hero.level||1)*.8)*C.bound);try{foeDamage(d);clog("☽ The spirit rakes it for "+d+".")}catch(e){}}}
   else if(spr)spr.material.opacity=0;
  }catch(e){if(!window.__ritE){window.__ritE=1;console.warn("RIT",e)}}};
 RIT.openList=openList;RIT.close=close;RIT.effect=effect;
})();

/* ===== Corruption: forbidden power has a price. Dark rites and goetic magic raise it; you hit harder, but the world darkens, whispers start,
   villagers shy away, and the ending changes. A Rite of Cleansing (Sun hour) washes it back. ===== */
(function(){
 if(typeof vmUpdate==="undefined"||typeof foeDamage==="undefined")return;
 const COR=window.COR={};
 const TIERS=[{n:"Clean",min:0,dmg:0},{n:"Tainted",min:20,dmg:1},{n:"Marked",min:50,dmg:2},{n:"Hollowed",min:80,dmg:3}];
 const val=()=>((typeof hero!=="undefined"&&hero)&&hero.cor)||0;
 COR.val=val;
 COR.tier=()=>{const v=val();let t=0;TIERS.forEach((x,i)=>{if(v>=x.min)t=i});return t};
 COR.name=()=>TIERS[COR.tier()].n;
 const SHIFT=["You feel clean. For now.","A cold thread has been sewn into you. Strength comes with it.","Something moves behind your eyes when you are not looking. Your blows land harder.","You are more hollow than you are whole. Everything bites harder now, including you."];
 COR.add=function(n,why){if(!(typeof hero!=="undefined"&&hero)||!n)return;const t0=COR.tier();hero.cor=Math.max(0,Math.min(100,(hero.cor||0)+n));const t1=COR.tier();
  try{say((n>0?"☠ Corruption +"+n:"✦ Corruption "+n)+(why?" ("+why+")":"")+". "+(t1!==t0?TIERS[t1].n+": "+SHIFT[t1]:""))}catch(e){}
  if(t1>t0){try{flash("rgba(90,0,30,.4)")}catch(e){}try{if(typeof BN!=="undefined"&&BN.banner)BN.banner("☠ "+TIERS[t1].n.toUpperCase())}catch(e){}}
  paint()};
 /* power */
 try{const _fd=foeDamage;foeDamage=function(n){if(typeof n==="number"&&n>0&&(typeof hero!=="undefined"&&hero))n+=TIERS[COR.tier()].dmg;return _fd.call(this,n)}}catch(e){}
 try{const _cs=castSpell;castSpell=function(nm){const r=_cs.apply(this,arguments);try{if(/Summon Goetic Spirit/.test(nm))COR.add(3,"goetic summoning");else if(/Binding Sigil/.test(nm))COR.add(2,"binding")}catch(e){}return r}}catch(e){}
 /* the chip */
 let chip=null;
 function paint(){if(!chip){chip=document.createElement("div");chip.id="corchip";chip.style.cssText="position:fixed;right:10px;top:188px;z-index:9;min-width:118px;padding:5px 9px;border:1px solid #6a2a3a;border-radius:6px;background:rgba(20,6,12,.8);color:#f0d0d8;font:12px/1.3 Cinzel,Georgia,serif;display:none;pointer-events:none";document.body.appendChild(chip)}
  const v=val(),t=COR.tier();chip.style.display=((typeof hero!=="undefined"&&hero)&&v>0)?"block":"none";
  chip.innerHTML="<b>☠ "+TIERS[t].n+"</b> "+Math.round(v)+"<div style='height:4px;margin-top:3px;background:#2a1018;border-radius:2px;overflow:hidden'><div style='height:100%;width:"+v+"%;background:linear-gradient(90deg,#8a2a3a,#d04a5a)'></div></div>"+(t?"<div style='opacity:.7;font-size:11px'>+"+TIERS[t].dmg+" damage</div>":"")}
 /* whispers */
 const WH=["...it was not yours to take...","...we remember the hour you called us...","...turn around...","...the quiet is patient. so patient...","...you are so warm...","...give back the shards...","...do you hear the clock stop?...","...he is behind you. no. behind you...","...stay a while. the hours are long here..."];
 let wT=0,dT=0,lastC=-1;
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!(typeof hero!=="undefined"&&hero))return;
   const t=COR.tier(),v=val(),now=performance.now()/1000;
   if(t!==lastC){lastC=t;paint()}
   /* the mood answers: the final grade gets heavier and redder */
   try{if(window.MOOD&&MOOD.isOn()&&POST&&POST.mComp&&POST.mComp.uniforms.occ)POST.mComp.uniforms.occ.value=1+v*.006}catch(e){}
   if(t>=1&&!C&&!D&&!DG&&now>wT){wT=now+[0,80,50,28][t]*(.7+Math.random()*.6);if(wT-now>0&&Math.random()<.9){try{toast(WH[Math.floor(Math.random()*WH.length)])}catch(e){}if(t>=2)try{flash("rgba(70,0,20,.22)")}catch(e){}}}
   /* the Hollowed bleed slowly */
   if(t>=3&&!C&&!DG&&now>dT){dT=now+20;if(hero.hp>2){hero.hp--;try{hud()}catch(e){}}}
  }catch(e){if(!window.__corE){window.__corE=1;console.warn("COR",e)}}};
 /* villagers notice */
 const REACT={Innkeeper:"Edda sets your cup down without meeting your eye. 'The inn is open. Quietly, please.'",Priest:"Brother Anselm's hand goes to his holy symbol, then falls away. 'I will talk to you. I will not touch you.'",Merchant:"The merchant counts your coins twice, and counts you once. 'Gold is gold,' he says, to himself.","Old soldier":"Voss squares his shoulders, the way men do before a dog they do not trust.",Herbalist:"Morrigan sniffs, and smiles with half her mouth. 'Oh, you have been busy. I can smell it.'",Farmer:"The farmer crosses himself, quickly, as if he hoped you would not see."};
 try{const _t=talk;talk=function(n){try{if(n&&COR.tier()>=2&&Math.random()<.5)toast((REACT[n.job]||n.name+" steps back as you approach."))}catch(e){}return _t.apply(this,arguments)}}catch(e){}
 /* the ending */
 COR.ending=function(){const t=COR.tier();return[
  "The bells ring clean over Occultica, and Brother Anselm blesses you at the shrine door. The quiet that was in the world is gone, and nothing has taken its place in you.",
  "The bells ring, though a few villagers cross the road rather than meet your eye. A thread of the cold you borrowed is still sewn into you.",
  "The bells ring, and Brother Anselm will not look at your hands. Something is still listening to you from the quiet, and it is not done.",
  "The hours turn, but the quiet has found a new keeper. When you sleep you hear the shards singing in the wrong key, and you find that you know the tune."][t]};
 COR.paint=paint;
})();

/* ===== Companions and a recovering village. Ser Aldric Thorne (hedge-knight, Mars and Saturn) comes to the village once the crypt is cleared;
   Sera Vane (hedge-witch, Moon and Venus) once three dungeons are cleared. They walk with you and help in fights. The village itself recovers
   as dungeons fall: lanterns, banners, a market, more people. ===== */
(function(){
 if(typeof vmUpdate==="undefined"||typeof POIS==="undefined"||typeof THREE==="undefined"||typeof fx3==="undefined")return;
 const T=THREE,CM=window.CMP={on:1,list:[]},VIL=window.VIL={lv:0};
 const DUN=["crypt","mine","lair","sunk","tomb","cave"];
 const won=id=>!!(hero.dg&&hero.dg[id]&&hero.dg[id].clr&&hero.dg[id].clr[5]);
 const lv=()=>{try{return hero?DUN.filter(won).length:0}catch(e){return 0}};
 const village=()=>POIS.find(p=>p.id==="village");
 const ground=(x,z)=>Math.max(hfn(x,z),-.3);
 const okTile=(x,z)=>{const tx=Math.floor(x/TW),ty=Math.floor(z/TW);return tx>1&&ty>1&&tx<W-2&&ty<H-2&&reach[ty*W+tx]&&!tileSolid(tx,ty)&&hfn(x,z)>-.2};
 const R=(a,b)=>a+Math.random()*(b-a);
 const state=()=>{hero.cmp=hero.cmp||{};return hero.cmp};
 const outdoors=()=>typeof world!=="undefined"&&world&&world.visible&&!DG&&hero;

 /* ---------- the two companions ---------- */
 const WHO={
  aldric:{name:"Ser Aldric Thorne",job:"Hedge-knight",pl:"Mars",need:()=>won("crypt"),needTxt:"He is not here yet. Clear the Hollow Crypt first.",
   cfg:{gear:{cloak:0x7a1e1e,belt:0x3a2616},iris:0x4a3220,skin:0xc89a78,cloth:0x5a6a7a,pants:0x2a2a30,hair:0x2a1a0e,hat:0x3a3a40,acc:["Helm","Armor","Sword","Shield"],armor:0x8a929c,s:1.08,w:1.05,face:2,g:"m",fseed:7788,outfit:"ranger",formal:0,hairStyle:"simple",beard:true},
   off:[[-10,-3],[10,-3],[-9,6],[9,7]],
   intro:["A man in dented mail leans on the village well. He watched you walk out of the crypt.","'The road you are on wants a second sword,' says Ser Aldric Thorne. 'I am sworn to no lord. I would like to be sworn to something.'","He strikes the foe every few seconds and takes a third of the blow meant for you. He hits harder in the hour of Mars."],
   gift:"Aldric: 'Forward, then.'"},
  sera:{name:"Sera Vane",job:"Hedge-witch",pl:"Moon",need:()=>lv()>=3,needTxt:"She is not here yet. Clear three dungeons first.",
   cfg:{gear:{cloak:0x2a2458,scarf:0x8a8aa8},iris:0x3a6a3a,skin:0xd8b898,cloth:0x3a2a5a,pants:0x2a1a4a,hair:0x1a1010,hat:0x3a2a4a,acc:["Robe","Hat_cone"],s:1.0,w:1,face:1,g:"f",fseed:4242,outfit:"peasant",formal:1,hairStyle:"long"},
   off:[[10,4],[-10,4],[9,-6],[-9,-7]],
   intro:["A woman in a moth-eaten robe sits on the inn step, sorting seeds by moonlight, though it is afternoon.","'The Moon told me to look for you,' says Sera Vane, without looking up. 'She does not say much. She said you would need a second pair of eyes.'","She mends you now and then in a fight, sees farther in the dark, and can smell where hidden doors are."],
   gift:"Sera: 'Mind the shadows. They have opinions.'"}};
 const MODE={follow:1,wait:2};

 /* a figure for each */
 function mkFig(id){try{if(typeof window.__fig!=="function")return null;const F=window.__fig(Object.assign({},WHO[id].cfg));if(!F)return null;
   F.g.userData.cmp=id;window.__ALL&&window.__ALL.add&&window.__ALL.add(F);scene.add(F.g);return F}catch(e){console.warn("cmp fig",e);return null}}
 function post(id){const v=village();if(!v)return null;const vx=v.x*TW+1,vz=v.y*TW+1;for(const o of WHO[id].off){const x=vx+o[0],z=vz+o[1];if(okTile(x,z))return{x,z}}return{x:vx+WHO[id].off[0][0],z:vz+WHO[id].off[0][1]}}
 function ensure(id){let c=CM.list.find(o=>o.id===id);if(c)return c;
  const F=mkFig(id);if(!F)return null;const p=post(id);if(!p)return null;
  c={id,F,x:p.x,z:p.z,hd:0,mode:"post",hx:p.x,hz:p.z};F.g.position.set(c.x,ground(c.x,c.z),c.z);F.play("idle");CM.list.push(c);return c}
 const near=(c,r)=>Math.hypot(c.x-P.x,c.z-P.z)<r;

 /* ---------- interaction (E) ---------- */
 function nearC(){if(!CM.on||!outdoors()||C||D||packOpen||occOpen)return null;let b=null,bd=3.6;
  for(const c of CM.list){const d=Math.hypot(c.x-P.x,c.z-P.z);if(d<bd){bd=d;b=c}}return b}
 const prevN=window.HW&&HW.near,prevL=window.HW&&HW.label,prevU=window.HW&&HW.use;
 if(window.HW){
  HW.near=()=>{try{return !!nearC()}catch(e){}return prevN()};
  HW.label=()=>{const c=nearC();if(c)return c.mode==="post"?"Speak with "+WHO[c.id].name:WHO[c.id].name;return prevL()};
  HW.use=()=>{const c=nearC();if(c)return talk2(c);return prevU()}}
 function talk2(c){const w=WHO[c.id],s=state(),b=occPanel(w.name,"#d8c8a0");
  if(c.mode==="post"&&!s[c.id]){
   w.intro.forEach(t=>b.appendChild(el("p",t,"sub")));
   const m=el("div",null,"menu");m.style.gridTemplateColumns="1fr";b.appendChild(m);
   m.appendChild(btn("Take "+(c.id==="aldric"?"Aldric":"Sera")+" along",()=>{s[c.id]=1;c.mode="follow";occClose();try{say(w.gift);toast("☉ "+w.name+" joins you. You can dismiss them by speaking to them again.")}catch(e){}},"go"));
   m.appendChild(btn("Not yet",()=>occClose(),"alt"))}
  else{b.appendChild(el("p",w.name+" ("+w.job+", "+w.pl+")","sub"));
   const m=el("div",null,"menu");m.style.gridTemplateColumns="1fr";b.appendChild(m);
   m.appendChild(btn(c.mode==="wait"?"Ask them to follow":"Ask them to wait here",()=>{c.mode=c.mode==="wait"?"follow":"wait";occClose()},"alt"));
   m.appendChild(btn("Send them home to the village",()=>{s[c.id]=0;c.mode="home";occClose();try{say(w.name+" heads back to the village.")}catch(e){}},"alt"));
   m.appendChild(btn("Close",()=>occClose(),"go"))}}

 /* ---------- movement ---------- */
 let lastSpawnTry=0;
 function moveC(c,dt,idx){const F=c.F,g=F.g;let tx,tz,spd=0,face=null;
  const slot=idx%2?1:-1;
  if(c.mode==="post"||c.mode==="home"){tx=c.hx;tz=c.hz}
  else if(c.mode==="wait"){tx=c.x;tz=c.z}
  else{const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
   const inFight=!!(C&&!C.over);
   tx=P.x-fx*(inFight?-2.2:2.6)+rx*slot*(inFight?2.4:1.8);tz=P.z-fz*(inFight?-2.2:2.6)+rz*slot*(inFight?2.4:1.8)}
  const dx=tx-c.x,dz=tz-c.z,d=Math.hypot(dx,dz),far=Math.hypot(c.x-P.x,c.z-P.z);
  if(c.mode==="home"&&d<.4){c.mode="post"}
  if((c.mode==="follow")&&far>38){const a=Math.random()*6.283;let nx=P.x+Math.cos(a)*5,nz=P.z+Math.sin(a)*5;if(okTile(nx,nz)){c.x=nx;c.z=nz}}
  else if(d>.45){spd=c.mode==="follow"?(far>9?7:far>4.5?4.6:2.8):1.6;const st=Math.min(d,spd*dt),nx=c.x+dx/d*st,nz=c.z+dz/d*st;
   if(!tileSolid(Math.floor(nx/TW),Math.floor(nz/TW))&&hfn(nx,nz)>-.35){c.x=nx;c.z=nz}else{const ax=c.x+dx/d*st;if(!tileSolid(Math.floor(ax/TW),Math.floor(c.z/TW)))c.x=ax;else{const az=c.z+dz/d*st;if(!tileSolid(Math.floor(c.x/TW),Math.floor(az/TW)))c.z=az}}
   face=Math.atan2(dx,dz)}
  else if(c.mode==="follow"||c.mode==="wait"){face=Math.atan2(P.x-c.x,P.z-c.z)}
  else if(c.mode==="post"){face=Math.atan2(P.x-c.x,P.z-c.z);if(Math.hypot(P.x-c.x,P.z-c.z)>9)face=null}
  g.position.set(c.x,ground(c.x,c.z),c.z);
  if(face!==null){let a=face-c.hd;while(a>Math.PI)a-=6.2832;while(a<-Math.PI)a+=6.2832;c.hd+=a*Math.min(1,dt*6);g.rotation.y=c.hd}
  if(c.act>0){c.act-=dt}else{if(spd>.4)F.play("walk",Math.max(.6,spd/(F.base||2)));else F.play("idle")}}

 /* ---------- help in fights ---------- */
 let fightId=null;
 function helpTick(){
  if(!C||C.over||!C.e||C.e.hp<=0||!fx3.g)return;
  const s=state(),now=performance.now();
  if(fightId!==C){fightId=C;CM.t0=now;CM.sn=now+4500;CM.ak=now+3500;CM.moonUsed=0;
   const names=CM.list.filter(c=>s[c.id]&&c.mode!=="home").map(c=>c.id==="aldric"?"Aldric":"Sera");if(names.length)try{clog("✦ "+names.join(" and ")+" stand with you.")}catch(e){}try{if(window.MV)CM.list.filter(c=>s[c.id]&&c.mode!=="home").forEach(c=>MV.ally(c.id,"join"))}catch(e){}}
  const lvl=hero.level||1,hr=(()=>{try{return PCK.now().hour.n}catch(e){return""}})();
  const al=CM.list.find(c=>c.id==="aldric"&&s.aldric&&c.mode!=="home"),se=CM.list.find(c=>c.id==="sera"&&s.sera&&c.mode!=="home");
  if(al&&now>=CM.ak&&!C.over){CM.ak=now+4500;const d=Math.ceil((2+lvl*.6)*(hr==="Mars"?1.6:1));al.act=1.1;al.F.play("attack",1.4);try{if(window.MV)MV.ally("aldric","attack")}catch(e){}try{foeDamage(d);clog("⚔ Ser Aldric cuts it for "+d+".")}catch(e){}}
  if(se&&now>=CM.sn){CM.sn=now+9000;const h=Math.ceil(hero.maxHp*(hr==="Venus"?.1:.07));hero.hp=Math.min(hero.maxHp,hero.hp+h);se.act=1.2;se.F.play("cast",1.2);try{if(window.MV)MV.ally("sera","cast")}catch(e){}
   try{clog("☽ Sera murmurs a charm: you mend "+h+".");hud()}catch(e){}
   if(hr==="Moon"&&!CM.moonUsed&&C.e){CM.moonUsed=1;C.e.atk=Math.max(1,(C.e.atk||1)-1);try{clog("☽ The Moon dims the foe's strikes.")}catch(e){}}}}
 /* Aldric takes a third of every blow aimed at you */
 try{const _h=fx3.hurt;fx3.hurt=function(d){try{const s=hero&&hero.cmp;if(s&&s.aldric&&CM.list.some(c=>c.id==="aldric"&&c.mode!=="home")&&typeof d==="number"&&d>1){const r=Math.floor(d*.33);if(r>0){hero.hp=Math.min(hero.maxHp,hero.hp+r);try{clog("🛡 Aldric turns aside "+r+" of the blow.")}catch(e){}try{if(window.MV)MV.ally("aldric","guard")}catch(e){}}}}catch(e){}return _h.apply(this,arguments)}}catch(e){}
 /* out of combat */
 let sT=0;
 function senses(){const s=state();if(!s.sera)return;const n=performance.now()/1000;if(n<sT)return;sT=n+8;
  POIS.forEach(p=>{if(p.hidden&&!found[p.id]&&Math.hypot(p.x*TW+1-P.x,p.y*TW+1-P.z)<26){found[p.id]=1;try{say("☽ Sera tilts her head. 'There. Something is hidden near here.' You find "+p.name+".");hud()}catch(e){}}})}
 if(window.OMEN&&OMEN.m){const _m=OMEN.m;OMEN.m=function(k){let r=_m.apply(this,arguments);try{if(k==="spawn"&&hero&&hero.cmp&&hero.cmp.aldric)r*=1.35}catch(e){}return r}}

 /* ---------- the village recovers ---------- */
 let vg=null,vilPeople=[],lamps=[],banners=[];
 const dot=(()=>{let t=null;return()=>{if(t)return t;const c=document.createElement("canvas");c.width=c.height=32;const g=c.getContext("2d");const gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,"rgba(255,240,190,1)");gr.addColorStop(.35,"rgba(255,170,70,.55)");gr.addColorStop(1,"rgba(255,140,40,0)");g.fillStyle=gr;g.fillRect(0,0,32,32);return t=new T.CanvasTexture(c)}})();
 const PC=[0x9a7ad0,0xe8c860,0xd05a40,0xe8d070,0x58b890,0x58a8d8,0x8a8a98];
 function lamp(x,z){const g=ground(x,z),post=new T.Mesh(new T.CylinderGeometry(.07,.1,2.3,6),new T.MeshLambertMaterial({color:0x3a2a1a}));post.position.set(x,g+1.15,z);vg.add(post);
  const box=new T.Mesh(new T.BoxGeometry(.28,.34,.28),new T.MeshBasicMaterial({color:0xffc880}));box.position.set(x,g+2.4,z);vg.add(box);
  const s=new T.Sprite(new T.SpriteMaterial({map:dot(),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.9,fog:false}));s.scale.set(2.6,2.6,1);s.position.set(x,g+2.4,z);vg.add(s);lamps.push({s,ph:Math.random()*9})}
 function banner(x,z,col){const g=ground(x,z),pole=new T.Mesh(new T.CylinderGeometry(.05,.07,3.6,6),new T.MeshLambertMaterial({color:0x2a2018}));pole.position.set(x,g+1.8,z);vg.add(pole);
  const cl=new T.Mesh(new T.PlaneGeometry(.9,1.5,4,4),new T.MeshLambertMaterial({color:col,side:T.DoubleSide}));cl.position.set(x+.5,g+2.8,z);vg.add(cl);banners.push({m:cl,ph:Math.random()*6})}
 function stall(x,z,col,ry){const g=ground(x,z),s=new T.Group();s.position.set(x,g,z);s.rotation.y=ry||0;
  const wood=new T.MeshLambertMaterial({color:0x5a3e24}),tb=new T.Mesh(new T.BoxGeometry(2,.8,.9),wood);tb.position.y=.4;s.add(tb);
  [[-.95,-.4],[.95,-.4],[-.95,.4],[.95,.4]].forEach(p=>{const q=new T.Mesh(new T.CylinderGeometry(.05,.05,2.2,5),wood);q.position.set(p[0],1.1,p[1]);s.add(q)});
  const ca=new T.Mesh(new T.BoxGeometry(2.4,.08,1.4),new T.MeshLambertMaterial({color:col}));ca.position.set(0,2.25,0);ca.rotation.x=.18;s.add(ca);
  for(let i=0;i<5;i++){const it=new T.Mesh(new T.BoxGeometry(.25,.2,.25),new T.MeshLambertMaterial({color:PC[(i*2+3)%7]}));it.position.set(-.8+i*.4,.92,0);s.add(it)}
  vg.add(s)}
 function placeRing(vx,vz,r,a0,tryR){for(let k=0;k<8;k++){const x=vx+Math.cos(a0)*(r+k*.8),z=vz+Math.sin(a0)*(r+k*.8);if(okTile(x,z))return[x,z]}return null}
 function buildVillage(L){
  const v=village();if(!v||typeof scene==="undefined"||!scene)return;
  if(vg){scene.remove(vg);vg=null;lamps=[];banners=[]}
  vilPeople.forEach(p=>{scene.remove(p.F.g);try{window.__ALL.delete(p.F)}catch(e){}});vilPeople=[];
  if(L<1)return;
  vg=new T.Group();const vx=v.x*TW+1,vz=v.y*TW+1;
  const nl=L>=5?10:6;for(let i=0;i<nl;i++){const p=placeRing(vx,vz,9.5+(i%2)*.6,i/nl*6.283+.3);if(p)lamp(p[0],p[1])}
  if(L>=2)for(let i=0;i<4;i++){const p=placeRing(vx,vz,12,i/4*6.283+.9);if(p)banner(p[0],p[1],PC[(i*2+L)%7])}
  if(L>=3)for(let i=0;i<3;i++){const p=placeRing(vx,vz,13,i*2.1+2.2);if(p)stall(p[0],p[1],PC[(i*3+1)%7],Math.atan2(vx-p[0],vz-p[1]))}
  scene.add(vg);
  /* people */
  const want=L>=6?4:L>=4?2:0,CF=[{iris:0x3a5a7a,skin:0xd8b898,cloth:0x7a5a3a,pants:0x3a2a1a,hair:0x4a2a1a,hat:0xd8c070,acc:["Hat_wide"],s:1,w:1,face:1,g:"m",fseed:1201,outfit:"peasant",formal:0,hairStyle:"simple"},
   {iris:0x3a6a3a,skin:0xe0b890,cloth:0x9a4a5a,pants:0x4a2a3a,hair:0x6a3a1a,hat:0xd86a8a,acc:[],s:.98,w:.98,face:0,g:"f",fseed:1302,outfit:"peasant",formal:0,hairStyle:"buns"},
   {iris:0x4a3220,skin:0xb08a68,cloth:0x4a6a4a,pants:0x2a3a2a,hair:0x1a1008,hat:0x4a5a2a,acc:["Cap"],s:1.02,w:1,face:2,g:"m",fseed:1403,outfit:"ranger",formal:0,hairStyle:"buzzed"},
   {iris:0x6a5a3a,skin:0xd0a888,cloth:0xc8b070,pants:0x5a4a2a,hair:0x8a6a3a,hat:0xc04030,acc:["Cap"],s:.96,w:1,face:1,g:"f",fseed:1504,outfit:"peasant",formal:1,hairStyle:"long"}];
  for(let i=0;i<want;i++){try{const F=window.__fig(Object.assign({},CF[i%CF.length]));if(!F)continue;window.__ALL&&window.__ALL.add(F);
    const p=placeRing(vx,vz,5+i*1.3,i*1.7+.5);if(!p)continue;F.g.position.set(p[0],ground(p[0],p[1]),p[1]);scene.add(F.g);
    vilPeople.push({F,x:p[0],z:p[1],hx:p[0],hz:p[1],tx:p[0],tz:p[1],hd:Math.random()*6,wait:Math.random()*5,mode:"idle"})}catch(e){}}}
 const MSGS=["","The first lanterns are lit along the road. Someone has swept the steps.","Banners go up over the village.","A market has opened. Occultica is trading again.","New faces on the green. People are coming back.","The whole village is strung with lights.","Occultica is alive again. Even the dogs are barking."];
 function villageTick(dt){
  const L=lv();
  if(L!==VIL.lv&&outdoors()){VIL.lv=L;try{buildVillage(L)}catch(e){console.warn("village",e)}}
  const v=village();if(!v)return;
  const t=(typeof clock!=="undefined"?clock:performance.now()/1000),vx=v.x*TW+1,vz=v.y*TW+1,dd=Math.hypot(vx-P.x,vz-P.z);
  if(vg){vg.visible=outdoors()&&dd<70;
   if(vg.visible){lamps.forEach(l=>{l.s.material.opacity=.7+.25*Math.sin(t*9+l.ph)*Math.sin(t*3.1+l.ph)});banners.forEach(b=>{b.m.rotation.y=Math.sin(t*1.8+b.ph)*.25;b.m.rotation.z=Math.sin(t*2.4+b.ph)*.05})}}
  const sn=(hero.vilSeen||0);
  if(outdoors()&&dd<30&&L>sn){hero.vilSeen=L;try{toast("🏘 "+MSGS[Math.min(6,L)]);if(typeof say==="function")say(MSGS[Math.min(6,L)])}catch(e){}}
  vilPeople.forEach(p=>{const g=p.F.g;g.visible=outdoors()&&dd<70;if(!g.visible)return;
   let spd=0;const busy=!!(C||D||occOpen);
   if(Math.hypot(p.x-P.x,p.z-P.z)<3||busy){p.mode="idle";p.wait=Math.max(p.wait,1);p.hd+=((Math.atan2(P.x-p.x,P.z-p.z)-p.hd+9.42)%6.283-3.14)*Math.min(1,dt*3)}
   else if(p.mode==="idle"){p.wait-=dt;if(p.wait<=0){const a=Math.random()*6.283,r=2+Math.random()*5;const tx=p.hx+Math.cos(a)*r,tz=p.hz+Math.sin(a)*r;if(okTile(tx,tz)){p.tx=tx;p.tz=tz;p.mode="walk"}else p.wait=1.5}}
   else{const ex=p.tx-p.x,ez=p.tz-p.z,ed=Math.hypot(ex,ez);if(ed<.2){p.mode="idle";p.wait=3+Math.random()*7}else{spd=.9;const nx=p.x+ex/ed*spd*dt,nz=p.z+ez/ed*spd*dt;if(tileSolid(Math.floor(nx/TW),Math.floor(nz/TW))){p.mode="idle";p.wait=2;spd=0}else{p.x=nx;p.z=nz;p.hd+=((Math.atan2(ex,ez)-p.hd+9.42)%6.283-3.14)*Math.min(1,dt*6)}}}
   g.position.set(p.x,ground(p.x,p.z),p.z);g.rotation.y=p.hd;if(spd>0)p.F.play("walk",spd/(p.F.base||2));else p.F.play("idle")})}

 /* ---------- per frame ---------- */
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(typeof hero==="undefined"||!hero||typeof scene==="undefined"||!scene)return;dt=Math.min(dt,.05);
   const s=state(),out=outdoors();
   /* appear in the village when earned, follow when recruited */
   for(const id in WHO){const w=WHO[id];let c=CM.list.find(o=>o.id===id);
    if(!c&&out&&(s[id]||w.need())&&performance.now()-lastSpawnTry>1500){lastSpawnTry=performance.now();c=ensure(id);if(c&&s[id]){c.mode="follow";const a=Math.random()*6.283;c.x=P.x+Math.cos(a)*3;c.z=P.z+Math.sin(a)*3}}
    if(c){c.F.g.visible=out&&CM.on&&!!(s[id]||w.need());if(c.F.g.visible){moveC(c,dt,CM.list.indexOf(c));if(!s[id]&&c.mode==="follow")c.mode="post"}}}
   if(CM.on){helpTick();if(out&&!C)senses()}
   villageTick(dt);
  }catch(e){if(!window.__cmE){window.__cmE=1;console.warn("CMP",e)}}};
 CM.WHO=WHO;CM.state=state;CM.rebuild=()=>{VIL.lv=-1};
})();

/* ===== Every dungeon has a rule of its planet, and some rooms hold an offer: risk against reward. ===== */
(function(){
 if(typeof enterDg==="undefined"||typeof vmUpdate==="undefined"||typeof startCombat==="undefined")return;
 const DR=window.DRULE={on:1,id:""};
 const RULES={
  crypt:{pl:"Saturn",g:"♄",n:"Rule of the Crypt: The Dead Do Not Stay Down",t:"Every undead thing rises once more after it falls, at 40% strength. Strike twice."},
  mine:{pl:"Mars",g:"♂",n:"Rule of the Mine: Forge Heat",t:"The heat saps you (1 HP every 15 seconds outside fights). Your hits land +1 harder in the fire."},
  lair:{pl:"Jupiter",g:"♃",n:"Rule of the Barrow: The Giants' Hall",t:"Foes here have 20% more life, but every kill feeds you for 3 HP."},
  sunk:{pl:"Venus",g:"♀",n:"Rule of the Sanctum: The Water Rises",t:"Linger in one room for a minute and the water climbs, costing 1 HP every 12 seconds. Keep moving."},
  tomb:{pl:"Mercury",g:"☿",n:"Rule of the Tomb: The Sand Pours",t:"After six minutes inside, sand pours from the ceilings (1 HP every 10 seconds) until you leave."},
  cave:{pl:"Moon",g:"☽",n:"Rule of the Cave: The Moon Rules the Dark",t:"The hour decides: in the Moon and Venus hours, foes have 15% less life; in the Sun, Mars and Saturn hours, 15% more."}};
 const hourN=()=>{try{return PCK.now().hour.n}catch(e){return""}};
 const nowS=()=>performance.now()/1000;
 let chip=null,t0=0,roomT=0,tickT=0,msg="";
 function paint(){if(!chip){chip=document.createElement("div");chip.id="drule";chip.style.cssText="position:fixed;left:12px;top:62px;max-width:280px;z-index:9;padding:6px 10px;border:1px solid #7a5a3a;border-radius:6px;background:rgba(18,12,6,.82);color:#f0e0c0;font:12px/1.35 Cinzel,Georgia,serif;pointer-events:none;display:none";document.body.appendChild(chip)}
  const r=DR.id&&RULES[DR.id];chip.style.display=(r&&typeof DG!=="undefined"&&DG&&DR.on)?"block":"none";
  if(r)chip.innerHTML="<b>"+r.g+" "+r.n.replace(/^Rule of the \w+: /,"")+"</b><br><span style='opacity:.8'>"+r.t+"</span>"}
 /* enter */
 try{const _e=enterDg;enterDg=function(p){const r=_e.apply(this,arguments);try{if(!DR.on||!p||!RULES[p.id])return r;DR.id=p.id;t0=roomT=tickT=nowS();
   const R=RULES[p.id];try{toast(R.g+" "+R.n)}catch(e){}try{DG.msg=(DG.msg?DG.msg+" ":"")+R.n+". "+R.t}catch(e){}paint()}catch(e){}return r}}catch(e){}
 /* leave: the chip is hidden whenever DG is falsy (paint runs per frame) */
 /* fights */
 try{const _sc=startCombat;startCombat=function(){const r=_sc.apply(this,arguments);try{
   if(DR.on&&DG&&DR.id&&C&&C.e){const id=DR.id,e=C.e;let f=1;
    if(id==="lair")f=1.2;
    else if(id==="cave"){const h=hourN();f=(h==="Moon"||h==="Venus")?.85:(h==="Mars"||h==="Saturn"||h==="Sun")?1.15:1}
    if(f!==1){e.hp=Math.max(1,Math.ceil(e.hp*f));e.max=Math.max(e.max,e.hp)}
    if(id==="cave")try{clog("☽ "+(f<1?"The Moon is with you in here.":f>1?"The dark is hungry in this hour.":"The cave watches."))}catch(x){}}}catch(e){}return r}}catch(e){}
 try{const _fd=foeDamage;foeDamage=function(n){
   try{if(DR.on&&DG&&DR.id&&C&&C.e&&typeof n==="number"&&n>0){const e=C.e;
     if(DR.id==="mine")n+=1;
     if(DR.id==="crypt"&&!C.rose&&e.hp-n<=0&&/Skeleton|Ghoul|Mummy|Wraith|Draugr|Wight|Zombie|Dead|Hollow King|Shade|Lemure|Barrow|Ushabti|Revenant|Undead|Bone/i.test(e.name+" ")){C.rose=1;e.hp=Math.max(2,Math.ceil(e.max*.4));try{fx3.hit(n)}catch(x){}try{clog("♄ The dead do not stay down! It rises again.")}catch(x){}try{sfx("hit")}catch(x){}return}}}catch(er){}
   return _fd.call(this,n)}}catch(e){}
 try{const _v=victory;victory=function(){const r=_v.apply(this,arguments);try{if(DR.on&&DG&&DR.id==="lair"){hero.hp=Math.min(hero.maxHp,hero.hp+3);try{clog("♃ You feed on the kill: +3 HP.")}catch(x){}}}catch(e){}return r}}catch(e){}
 /* room timers */
 try{if(window.MZ&&MZ.setNode){const _sn=MZ.setNode;MZ.setNode=function(id,entry,keep){const m=(DG&&DG.s&&DG.s.mz)||null,first=!!(m&&!m.vis[id]);const r=_sn.apply(this,arguments);try{if(!keep)roomT=nowS();if(!keep&&first)offerMaybe(id)}catch(e){}return r}}}catch(e){}
 function drain(n,why){if(!(hero.hp>1))return;hero.hp=Math.max(1,hero.hp-n);try{hud();toast(why)}catch(e){}}
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(typeof hero==="undefined"||!hero)return;
   if(!(DG&&DR.id)){if(DR.id&&!DG){DR.id=""}paint();return}
   paint();const n=nowS(),busy=!!(C||D||(window.MZ&&MZ.pop)||packOpen||occOpen);
   if(busy||!DR.on){return}
   if(DR.id==="mine"&&n>=tickT){tickT=n+15;if(!(hero.inv&&hero.inv["Talisman of Mars"]))drain(1,"♂ The heat saps you.")}
   if(DR.id==="sunk"){if(n-roomT>60&&n>=tickT){tickT=n+12;drain(1,"♀ The water is at your knees. Move on.")}}
   if(DR.id==="tomb"){if(n-t0>360&&n>=tickT){tickT=n+10;drain(1,"☿ Sand pours from the ceiling. Find the way out.")}}
  }catch(e){if(!window.__drE){window.__drE=1;console.warn("DRULE",e)}}};

 /* ---------- offers in side rooms ---------- */
 function offerMaybe(id){try{
   if(!DR.on||!window.MZ||!MZ.L)return;const node=MZ.L.nodes[id];if(!node||node.type==="start"||node.id===MZ.L.boss||node.id===MZ.L.start)return;
   if(Math.random()>.24)return;
   setTimeout(()=>{try{if(!DG||!MZ.room||MZ.room.node.id!==id||MZ.pop||C)return;
     const k=Math.floor(Math.random()*3),end=msg=>{MZ.pop=false;DG.msg=msg;MZ.setNode(MZ.room.node.id,MZ.room.entry,true);try{renderDg();hud()}catch(e){}};
     if(k===0)MZ.popup("The Whispering Altar","A low altar, a bowl of old ash, and a voice from under the stone. 'A gift for a gift,' it says. 'I will not ask twice.'",[
       {t:"Accept the dark gift: +6 max HP for ever, +10 Corruption",c:"alt",fn:()=>{hero.gift=(hero.gift||0)+6;try{fixStats()}catch(e){}hero.hp+=6;try{if(window.COR)COR.add(10,"the altar's gift")}catch(e){}end("The voice laughs, very softly. You feel larger than you did. +6 max HP.")}},
       {t:"Offer your blood: lose 8 HP, gain 40 gold and a herb",c:"alt",dis:hero.hp<=9,fn:()=>{hero.hp-=8;hero.gold+=40;try{const pl=PLN[Math.floor(Math.random()*7)];giveItem(pl.h[0])}catch(e){}end("The ash drinks. Coins fall out of the dark like hail. +40 gold.")}}]);
     else if(k===1)MZ.popup("The Gambler's Bowl","A bowl of knucklebones and a silver coin on the rim. A card scratched into the stone: STAKE 20. The bones are warm, as though just thrown.",[
       {t:"Stake 20 gold on the bones",c:"alt",dis:hero.gold<20,fn:()=>{hero.gold-=20;if(Math.random()<.48){hero.gold+=70;end("The bones fall in your favour. +50 gold, net.")}else end("The bones fall in a pattern you will see in dreams. -20 gold.")}}]);
     else MZ.popup("The Sleeping Guardian","A stone thing sits in a niche, its chest rising and falling, and a small chest lies between its feet. Its breath smells of cold rain.",[
       {t:"Steal the chest quietly (DEX check)",c:"alt",fn:()=>{const r=Math.floor(Math.random()*20)+1+(typeof mod==="function"&&typeof AT==="function"?mod(AT().DEX):0);
         if(r>=13){const pl=PLN[Math.floor(Math.random()*7)];giveItem("Elixir of "+pl.n);hero.gold+=25;end("You lift the chest from between its feet, breath held. An Elixir of "+pl.n+" and 25 gold. ("+r+" vs DC 13)")}
         else{const d=Math.max(0,Math.min(hero.hp-1,Math.floor(Math.random()*6)+2));hero.hp-=d;end("A stone hand closes on your ankle, and lets go again. You take "+d+" damage and leave with nothing. ("+r+" vs DC 13)")}}}])}catch(e){console.warn("offer",e)}},800)}catch(e){}}
 try{if(window.OMEN&&OMEN.b){const _b=OMEN.b;OMEN.b=function(k){let r=_b.apply(this,arguments);if(k==="hp"&&typeof hero!=="undefined"&&hero&&hero.gift)r=(r||0)+hero.gift;return r}}}catch(e){}
 DR.RULES=RULES;
})();

/* ===== Quality of life: planetary lore in the journal, an hour guide, richer minimap markers, and an autosave indicator. ===== */
(function(){
 if(typeof PLN==="undefined"||typeof vmUpdate==="undefined")return;
 const QOL=window.QOL={};
 const DO={
  Saturn:"Ward the Land. The dead walk near graves; mist rises. Good for brewing endurance, bad for travel.",
  Jupiter:"A generous hour: the road is quiet and wanderers keep their distance. Good for shopping and long walks.",
  Mars:"Curse a foe and visit the smith (sharpen or polish). Wanderers hunt harder, so go to fight.",
  Sun:"Cleanse your Corruption. Brew healing, forge shards, and walk in the open.",
  Venus:"Shrines are kind and nymphs bless the road. Rest here; the road is quiet.",
  Mercury:"Open sealed doors in dungeons. Locks, riddles and trades go easier.",
  Moon:"Spirits drift the roads: speak to them or Bind one. Hidden doors reveal themselves."};
 const RITE={Saturn:"Ward the Land",Moon:"Bind a Spirit",Mars:"Lay a Curse",Mercury:"Open a Sealed Door",Sun:"Rite of Cleansing"};
 const hourN=()=>{try{return PCK.now().hour.n}catch(e){return""}};
 const fmt=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
 QOL.hint=function(){const h=hourN(),c=PCK.now(),p=PLN.find(x=>x.n===h);if(!p)return"";
  const nxt=PCK.sched(8).slice(1).find(s=>RITE[s.pl.n]);
  return p.g+" Best now ("+h+"): "+DO[h]+(nxt&&!RITE[h]?" Next rite hour: "+nxt.pl.g+" "+nxt.pl.n+" in "+fmt(nxt.inMs)+".":"")};

 /* ---------- journal: planetary lore ---------- */
 function addLore(){try{const b=document.getElementById("occbox");if(!b||b.querySelector("#lore"))return;
  const w=document.createElement("div");w.id="lore";
  const mk=(tag,txt,cls)=>{const e=document.createElement(tag);e.textContent=txt;if(cls)e.className=cls;w.appendChild(e);return e};
  mk("h3","Hour guide");mk("p",QOL.hint(),"sub");
  mk("h3","Planetary lore");
  PLN.forEach(p=>{const known=(hero.occ&&hero.occ.herbs)||{},n=p.h.filter(h=>known[h]).length,
   e=mk("p",p.g+" "+p.n+": "+p.v+" · "+p.m+" · herbs: "+p.h.map(h=>known[h]?h:"?").join(", ")+" ("+n+"/3 known)","sub");e.title=DO[p.n]||"";
   const s=document.createElement("small");s.style.cssText="display:block;opacity:.75;margin:-4px 0 4px 14px";s.textContent="In its hour: "+DO[p.n];w.appendChild(s)});
  if(window.COR){mk("h3","Corruption");mk("p","☠ "+COR.name()+" ("+Math.round(COR.val())+"/100). "+({0:"Clean. Forbidden power costs something; you have paid nothing yet.",1:"Tainted. +1 damage. A cold thread is sewn through you.",2:"Marked. +2 damage. Whispers and cold looks from villagers.",3:"Hollowed. +3 damage, and you bleed slowly. The ending will remember this."})[COR.tier()],"sub")}
  if(window.VIL){mk("h3","Occultica");const L=VIL.lv>0?VIL.lv:0;mk("p","The village has recovered "+L+"/6 steps. "+["Dark and quiet.","Lanterns are lit.","Banners are up.","The market is open.","New faces on the green.","The whole village is strung with lights.","Occultica is alive again."][Math.min(6,L)],"sub");
   const s=(hero.cmp||{});mk("p","Companions: "+((s.aldric?"Ser Aldric Thorne (Mars) ":"")+(s.sera?"Sera Vane (Moon) ":"")||"none yet. Clear dungeons and return to the village."),"sub")}
  b.appendChild(w)}catch(e){console.warn("lore",e)}}
 try{if(window.QST&&QST.openJournal){const _oj=QST.openJournal;QST.openJournal=function(){const r=_oj.apply(this,arguments);addLore();return r}}}catch(e){}

 /* ---------- minimap markers ---------- */
 try{const _dm=drawMini;drawMini=function(){_dm.apply(this,arguments);try{
   const fx=P.x/TW,fz=P.z/TW,t=(typeof clock!=="undefined"?clock:0);
   /* companions: blue dots */
   if(window.CMP)CMP.list.forEach(c=>{if(c.F.g.visible){mx.fillStyle=c.id==="sera"?"#c0a0ff":"#80c0ff";mx.fillRect(c.x/TW-1,c.z/TW-1,2,2)}});
   /* spirits and the forge */
   if(window.HW)HW.ents.forEach(e=>{if(e.fade<.3)return;mx.fillStyle=e.k==="smith"?"#ff9040":e.k==="nymph"?"#ff90c0":"#cfe4ff";mx.fillRect(e.x/TW-1,e.z/TW-1,2,2)});
   /* ward ring */
   const s=hero.rit;if(s&&s.ward>Date.now()){mx.strokeStyle="rgba(255,220,120,.8)";mx.lineWidth=1;mx.beginPath();mx.arc(s.wx/TW,s.wz/TW,24/TW,0,6.283);mx.stroke()}
   /* undiscovered hidden doors you have been told about are drawn already; flag the village and pulse the player */
   mx.strokeStyle="rgba(255,90,58,"+(.4+.3*Math.sin(t*4))+")";mx.beginPath();mx.arc(fx,fz,3.2+Math.sin(t*4),0,6.283);mx.stroke()}catch(e){}}}catch(e){}

 /* ---------- autosave indicator ---------- */
 let ind=null,hideT=0;
 function flashSave(){try{if(!ind){ind=document.createElement("div");ind.id="savechip";ind.textContent="✦ Saved";ind.style.cssText="position:fixed;right:12px;bottom:10px;z-index:9;padding:3px 9px;border-radius:12px;background:rgba(14,10,6,.75);border:1px solid #7a6a3a;color:#e9ddbf;font:12px Cinzel,Georgia,serif;opacity:0;transition:opacity .4s;pointer-events:none";document.body.appendChild(ind)}
  ind.style.opacity=1;clearTimeout(hideT);hideT=setTimeout(()=>{ind.style.opacity=0},1600)}catch(e){}}
 try{const _s=save;save=function(){const r=_s.apply(this,arguments);flashSave();return r}}catch(e){}
 let lastAuto=performance.now();
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(typeof hero==="undefined"||!hero)return;
   if(performance.now()-lastAuto>60000){lastAuto=performance.now();if(!C&&!D&&!DG&&!occOpen&&!packOpen&&hero.hp>0)save()}}catch(e){}};
})();

/* ===== Real surface detail for creatures: every low-poly body is smoothed and subdivided (skin weights carried along), then displaced with
   creature-specific relief (scale plates, stone chunks, flesh wrinkles), and its normals follow the relief. Cached per model, so it costs
   nothing after the first of each kind. Switch in Graphics options ("Creature detail"). ===== */
(function(){
 if(typeof THREE==="undefined"||!window.AGE)return;
 const T=THREE,MESH=window.MESH={on:1,tris:0,n:0};
 const LS={get:()=>{try{return localStorage.getItem("occultica.mesh")}catch(e){return null}},set:v=>{try{localStorage.setItem("occultica.mesh",v)}catch(e){}}};
 if(LS.get()==="0")MESH.on=0;
 MESH.setOn=v=>{MESH.on=v?1:0;LS.set(v?"1":"0")};

 /* ---------- noise (deterministic on object-space position, so seams stay closed) ---------- */
 const fr=x=>x-Math.floor(x);
 function h3(x,y,z){let n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return fr(n)}
 function vn(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy),uz=fz*fz*(3-2*fz);
  const a=h3(ix,iy,iz),b=h3(ix+1,iy,iz),c=h3(ix,iy+1,iz),d=h3(ix+1,iy+1,iz),e=h3(ix,iy,iz+1),f=h3(ix+1,iy,iz+1),g=h3(ix,iy+1,iz+1),h=h3(ix+1,iy+1,iz+1);
  return (a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy)*(1-uz)+(e+(f-e)*ux+(g-e)*uy+(e-f-g+h)*ux*uy)*uz}
 const fbm=(x,y,z)=>vn(x,y,z)*.55+vn(x*2.1,y*2.1,z*2.1)*.3+vn(x*4.3,y*4.3,z*4.3)*.15;
 /* cell (Worley) distance: scales and plates */
 function worley(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let d1=9,d2=9;
  for(let k=-1;k<=1;k++)for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=ix+i,cy=iy+j,cz=iz+k,px=cx+h3(cx,cy,cz)-x,py=cy+h3(cy,cz,cx+3.1)-y,pz=cz+h3(cz,cx,cy+7.7)-z,d=px*px+py*py+pz*pz;
   if(d<d1){d2=d1;d1=d}else if(d<d2)d2=d}
  return[Math.sqrt(d1),Math.sqrt(d2)]}
 /* relief profiles: return displacement in [-1,1] (multiplied by the profile amplitude) */
 const PROFILES={
  scale:{amp:.016,f:(x,y,z)=>{const[a,b]=worley(x*9,y*9,z*9);const edge=Math.min(1,(b-a)*3.2);return(edge-.55)*1.1+(fbm(x*3,y*3,z*3)-.5)*.35}},
  chitin:{amp:.014,f:(x,y,z)=>{const[a,b]=worley(x*5,y*7,z*5);const edge=Math.min(1,(b-a)*2.6);return(Math.pow(edge,.7)-.5)*1.2+(vn(x*30,y*30,z*30)-.5)*.1}},
  stone:{amp:.03,f:(x,y,z)=>{const r=Math.abs(fbm(x*4,y*4,z*4)-.5)*2;const q=Math.round((fbm(x*2.2,y*2.2,z*2.2))*5)/5;return(q-.5)*1.4+(r-.5)*.35}},
  flesh:{amp:.007,f:(x,y,z)=>(fbm(x*14,y*14,z*14)-.5)*1.3+(vn(x*60,y*60,z*60)-.5)*.25},
  fur:{amp:.004,f:(x,y,z)=>(fbm(x*10,y*10,z*10)-.5)*1.1},
  bone:{amp:.005,f:(x,y,z)=>(fbm(x*18,y*18,z*18)-.5)+(vn(x*80,y*80,z*80)-.5)*.2},
  cloth:{amp:.0045,f:(x,y,z)=>{const w=Math.sin(x*140)*Math.sin(z*140)*.25+Math.sin(y*30+fbm(x*4,y*4,z*4)*9)*.5;return w+(fbm(x*7,y*7,z*7)-.5)*.6}},
  hide:{amp:.01,f:(x,y,z)=>{const r=Math.abs(fbm(x*6,y*6,z*6)-.5)*2;return(.5-r)*1.2+(fbm(x*22,y*22,z*22)-.5)*.4}}};
 function profileFor(mname,cname){const n=mname||"";
  if(cname==="Human"){if(/^(Eye|Iris|Sclera|Lip|Face|Orb|Glass)/i.test(n))return null;return PROFILES.cloth}
  if(/^(Eye|Iris|Sclera|Lip|Face|Hair|Orb|Hat|Cloth|Rope|Glass)/i.test(n))return null;
  if(/Scale/i.test(n)||/Hydra|Lizard|Drake|Dragon|Salamander/i.test(cname||""))return PROFILES.scale;
  if(/Shell|Chitin/i.test(n)||/Scorpion/i.test(cname||""))return PROFILES.chitin;
  if(/Giant|Golem|Gargoyle|Troll|Stone/i.test(cname||"")&&!/Armor|Steel/i.test(n))return PROFILES.stone;
  if(/Bone/i.test(n)||/Skeleton|Legionary|Draugr/i.test(cname||""))return PROFILES.bone;
  if(/Fur/i.test(n))return PROFILES.fur;
  if(/Armor|Steel|Iron|Metal/i.test(n))return null;
  if(/Beholder|Abom/i.test(cname||""))return PROFILES.hide;
  return PROFILES.flesh}

 /* ---------- subdivision, carrying skin weights ---------- */
 function weldNormals(pos,nor){const nv=pos.count,map=new Map(),key=new Array(nv);
  for(let i=0;i<nv;i++){const k=Math.round(pos.getX(i)*2e3)+","+Math.round(pos.getY(i)*2e3)+","+Math.round(pos.getZ(i)*2e3);key[i]=k;let a=map.get(k);if(!a){a=[0,0,0];map.set(k,a)}a[0]+=nor.getX(i);a[1]+=nor.getY(i);a[2]+=nor.getZ(i)}
  const w=new Float32Array(nv*3);for(let i=0;i<nv;i++){const a=map.get(key[i]),l=Math.hypot(a[0],a[1],a[2])||1;w[i*3]=a[0]/l;w[i*3+1]=a[1]/l;w[i*3+2]=a[2]/l}return w}
 function subdivide(G,wn){
  const pos=G.attributes.position,nor=G.attributes.normal,uv=G.attributes.uv,si=G.attributes.skinIndex,sw=G.attributes.skinWeight,col=G.attributes.color,idx=G.index.array,nv=pos.count;
  const emap=new Map(),mids=[];
  const mid=(a,b)=>{const lo=a<b?a:b,hi=a<b?b:a,k=lo*nv+hi;let m=emap.get(k);if(m===undefined){m=nv+mids.length;mids.push([lo,hi]);emap.set(k,m)}return m};
  const ni=new (nv+idx.length*1.5>65000?Uint32Array:Uint32Array)(idx.length*4);let o=0;
  for(let i=0;i<idx.length;i+=3){const a=idx[i],b=idx[i+1],c=idx[i+2],ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
   ni[o++]=a;ni[o++]=ab;ni[o++]=ca;ni[o++]=ab;ni[o++]=b;ni[o++]=bc;ni[o++]=ca;ni[o++]=bc;ni[o++]=c;ni[o++]=ab;ni[o++]=bc;ni[o++]=ca}
  const tot=nv+mids.length,P=new Float32Array(tot*3),N=new Float32Array(tot*3),WN=new Float32Array(tot*3),UV=uv?new Float32Array(tot*2):null,
   SI=si?new si.array.constructor(tot*4):null,SW=sw?new Float32Array(tot*4):null,COL=col?new Float32Array(tot*col.itemSize):null,cs=col?col.itemSize:0;
  for(let i=0;i<nv;i++){P[i*3]=pos.getX(i);P[i*3+1]=pos.getY(i);P[i*3+2]=pos.getZ(i);N[i*3]=nor.getX(i);N[i*3+1]=nor.getY(i);N[i*3+2]=nor.getZ(i);WN[i*3]=wn[i*3];WN[i*3+1]=wn[i*3+1];WN[i*3+2]=wn[i*3+2];
   if(UV){UV[i*2]=uv.getX(i);UV[i*2+1]=uv.getY(i)}if(SI){for(let k=0;k<4;k++){SI[i*4+k]=si.array[i*4+k];SW[i*4+k]=sw.array[i*4+k]}}if(COL)for(let k=0;k<cs;k++)COL[i*cs+k]=col.array[i*cs+k]}
  for(let m=0;m<mids.length;m++){const a=mids[m][0],b=mids[m][1],v=nv+m;
   const ax=P[a*3],ay=P[a*3+1],az=P[a*3+2],bx=P[b*3],by=P[b*3+1],bz=P[b*3+2],mx=(ax+bx)/2,my=(ay+by)/2,mz=(az+bz)/2;
   const wax=WN[a*3],way=WN[a*3+1],waz=WN[a*3+2],wbx=WN[b*3],wby=WN[b*3+1],wbz=WN[b*3+2];
   const da=(mx-ax)*wax+(my-ay)*way+(mz-az)*waz,db=(mx-bx)*wbx+(my-by)*wby+(mz-bz)*wbz;
   const qx=((mx-da*wax)+(mx-db*wbx))/2,qy=((my-da*way)+(my-db*wby))/2,qz=((mz-da*waz)+(mz-db*wbz))/2,al=.7;
   P[v*3]=mx+(qx-mx)*al;P[v*3+1]=my+(qy-my)*al;P[v*3+2]=mz+(qz-mz)*al;
   let nx=N[a*3]+N[b*3],ny=N[a*3+1]+N[b*3+1],nz=N[a*3+2]+N[b*3+2],l=Math.hypot(nx,ny,nz)||1;N[v*3]=nx/l;N[v*3+1]=ny/l;N[v*3+2]=nz/l;
   nx=wax+wbx;ny=way+wby;nz=waz+wbz;l=Math.hypot(nx,ny,nz)||1;WN[v*3]=nx/l;WN[v*3+1]=ny/l;WN[v*3+2]=nz/l;
   if(UV){UV[v*2]=(UV[a*2]+UV[b*2])/2;UV[v*2+1]=(UV[a*2+1]+UV[b*2+1])/2}
   if(COL)for(let k=0;k<cs;k++)COL[v*cs+k]=(COL[a*cs+k]+COL[b*cs+k])/2;
   if(SI){const acc={};for(let k=0;k<4;k++){const wa=SW[a*4+k],wb=SW[b*4+k];if(wa>0)acc[SI[a*4+k]]=(acc[SI[a*4+k]]||0)+wa*.5;if(wb>0)acc[SI[b*4+k]]=(acc[SI[b*4+k]]||0)+wb*.5}
    const ent=Object.keys(acc).map(k=>[+k,acc[k]]).sort((p,q)=>q[1]-p[1]).slice(0,4);let s=0;ent.forEach(e=>s+=e[1]);s=s||1;for(let k=0;k<4;k++){if(ent[k]){SI[v*4+k]=ent[k][0];SW[v*4+k]=ent[k][1]/s}else{SI[v*4+k]=0;SW[v*4+k]=0}}}}
  const g=new T.BufferGeometry();g.setAttribute("position",new T.BufferAttribute(P,3));g.setAttribute("normal",new T.BufferAttribute(N,3));
  if(UV)g.setAttribute("uv",new T.BufferAttribute(UV,2));if(SI){g.setAttribute("skinIndex",new T.BufferAttribute(SI,4));g.setAttribute("skinWeight",new T.BufferAttribute(SW,4))}if(COL)g.setAttribute("color",new T.BufferAttribute(COL,cs));
  g.setIndex(new T.BufferAttribute(ni,1));return{g,wn:WN}}
 function displace(g,wn,prof,hgt){const P=g.attributes.position,N=g.attributes.normal,n=P.count,A=prof.amp*hgt,e=hgt*.006,sc=1/hgt;
  for(let i=0;i<n;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),wx=wn[i*3],wy=wn[i*3+1],wz=wn[i*3+2];
   const X=x*sc,Y=y*sc,Z=z*sc,es=e*sc,d0=prof.f(X,Y,Z),dx=prof.f(X+es,Y,Z),dy=prof.f(X,Y+es,Z),dz=prof.f(X,Y,Z+es);
   const gx=(dx-d0)*A/e,gy=(dy-d0)*A/e,gz=(dz-d0)*A/e;
   P.setXYZ(i,x+wx*d0*A,y+wy*d0*A,z+wz*d0*A);
   let nx=N.getX(i),ny=N.getY(i),nz=N.getZ(i);const dp=gx*nx+gy*ny+gz*nz;nx-=gx-dp*nx;ny-=gy-dp*ny;nz-=gz-dp*nz;const l=Math.hypot(nx,ny,nz)||1;N.setXYZ(i,nx/l,ny/l,nz/l)}}

 /* ---------- applying it to a monster ---------- */
 const CACHE=new Map();
 function upgrade(g,name){
  if(!MESH.on||!g||g.userData.meshUp||g.userData.qm)return;g.userData.meshUp=1;
  const swap=new Map();
  g.traverse(o=>{if(!(o.isMesh||o.isSkinnedMesh))return;const G=o.geometry;if(!G||!G.index||!G.attributes.normal||(G.attributes.skinIndex&&G.attributes.skinIndex.isInterleavedBufferAttribute)||G.attributes.position.isInterleavedBufferAttribute||G.morphAttributes&&Object.keys(G.morphAttributes).length)return;
   const m=Array.isArray(o.material)?o.material[0]:o.material,prof=profileFor(m&&m.name,name);if(!prof)return;
   const key=G.uuid+"|"+(name||"");
   let NG=CACHE.get(key);
   if(NG===undefined){NG=null;const vc=G.attributes.position.count;
    if(vc>=14000||vc<24){CACHE.set(key,null);return}
    try{const bb=new T.Box3().setFromBufferAttribute(G.attributes.position),hgt=Math.max(.05,Math.max(bb.max.y-bb.min.y,bb.max.x-bb.min.x,bb.max.z-bb.min.z));
     let wn=weldNormals(G.attributes.position,G.attributes.normal),cur=G,lv=vc<1200?2:1;
     for(let l=0;l<lv;l++){const r=subdivide(cur,wn);cur=r.g;wn=r.wn;if(cur.attributes.position.count>90000)break}
     displace(cur,wn,prof,hgt);cur.computeBoundingSphere();cur.computeBoundingBox();NG=cur;MESH.tris+=cur.index.count/3;MESH.n++}catch(e){console.warn("mesh2",e);NG=null}
    CACHE.set(key,NG)}
   if(NG){o.geometry=NG;swap.set(G,NG)}});
  /* fur shells and other copies that share a swapped body follow it */
  g.traverse(o=>{if(!(o.isMesh||o.isSkinnedMesh))return;const s=swap.get(o.geometry);if(s)o.geometry=s})}
 MESH.upgrade=upgrade;
 /* every monster gets it as it is created */
 const _f=AGE.foe;AGE.foe=function(g,name){try{upgrade(g,name||"")}catch(e){console.warn("mesh2 foe",e)}return _f.apply(this,arguments)};
})();

/* ===== Dread pass: monsters loom larger and lower, the world gutters when a fight starts, mist crawls at their feet, and the humanoid ones
   wear trophies and spikes. Switch in Graphics options ("Dread"). ===== */
(function(){
 if(typeof fx3==="undefined"||typeof vmUpdate==="undefined"||typeof THREE==="undefined")return;
 const T=THREE,SC=window.SCARE={on:1,k:0};
 const LS={get:()=>{try{return localStorage.getItem("occultica.dread")}catch(e){return null}},set:v=>{try{localStorage.setItem("occultica.dread",v)}catch(e){}}};
 if(LS.get()==="0")SC.on=0;
 SC.setOn=v=>{SC.on=v?1:0;LS.set(v?"1":"0")};
 /* 1. they loom: small things grow most, big things a little */
 try{const _sp=fx3.spawn;fx3.spawn=function(f){_sp.apply(this,arguments);try{const g=this.g;if(SC.on&&g&&!g.userData.loomed){g.userData.loomed=1;const s=g.scale.y,k=s<1.15?1.38:s<2?1.22:1.1;g.scale.multiplyScalar(k)}}catch(e){}}}catch(e){}
 /* 2 and 3. the world gutters, mist at their feet */
 const dark=new T.Color(0x070a12),_c=new T.Color();let mT=0;
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(typeof scene==="undefined"||!scene)return;dt=Math.min(dt,.05);
   const fighting=!!(SC.on&&fx3.g&&typeof C!=="undefined"&&C&&!C.over&&!DG);
   SC.k+=((fighting?1:0)-SC.k)*Math.min(1,dt*(fighting?1.6:.9));const k=SC.k;
   if(k>.01&&typeof worldFog!=="undefined"&&worldFog){
    if(typeof hemi!=="undefined"&&hemi)hemi.intensity*=1-.38*k;
    if(typeof sunL!=="undefined"&&sunL)sunL.intensity*=1-.5*k;
    worldFog.far*=1-.3*k;worldFog.near*=1-.35*k;worldFog.color.lerp(dark,.4*k);
    if(typeof skyM!=="undefined"&&skyM&&skyM.material&&skyM.material.uniforms){skyM.material.uniforms.top.value.lerp(dark,.35*k);skyM.material.uniforms.hor.value.lerp(_c.setHex(0x1a1c26),.35*k)}
    try{if(POST&&POST.mComp&&POST.mComp.uniforms.occ&&window.MOOD&&MOOD.isOn())POST.mComp.uniforms.occ.value+=.3*k}catch(e){}}
   if(fighting){mT-=dt;if(mT<=0&&window.vfx&&vfx.smoke){mT=.5;const b=fx3.base,s=fx3.g.scale.y||1,a=Math.random()*6.283,r=(.6+Math.random()*1.2)*s;
     try{vfx.smoke(new T.Vector3(b.x+Math.cos(a)*r,(b.y||0)+.15,b.z+Math.sin(a)*r))}catch(e){}}}
  }catch(e){if(!window.__scE){window.__scE=1;console.warn("SCARE",e)}}};
 /* 4. trophies and spikes on the humanoid ones */
 const BONE=0xcdbf9f,mBone=new T.MeshStandardMaterial({color:BONE,roughness:.85,metalness:0}),mDark=new T.MeshStandardMaterial({color:0x2a2018,roughness:.9}),mSpike=new T.MeshStandardMaterial({color:0x6a6258,roughness:.5,metalness:.6});
 function skull(sz){const g=new T.Group(),c=new T.Mesh(new T.SphereGeometry(sz,8,6),mBone),j=new T.Mesh(new T.BoxGeometry(sz*1.1,sz*.45,sz*.9),mBone);j.position.set(0,-sz*.85,sz*.1);
  const e1=new T.Mesh(new T.SphereGeometry(sz*.22,5,4),mDark),e2=e1.clone();e1.position.set(-sz*.38,sz*.1,sz*.85);e2.position.set(sz*.38,sz*.1,sz*.85);g.add(c,j,e1,e2);return g}
 function spike(len,r){const m=new T.Mesh(new T.ConeGeometry(r,len,6),mSpike);m.position.y=len/2;const g=new T.Group();g.add(m);return g}
 function dim(g){const seen=new Set();g.traverse(o=>{if(!o.material)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(!m||!m.color||seen.has(m)||m.userData.__dim)return;seen.add(m);m.userData.__dim=1;
  if(!/eye|flame|fire|glow/i.test(m.name||"")&&!(m.emissiveIntensity>1.2)){const _o=m.onBeforeCompile;m.onBeforeCompile=function(sh){if(_o)_o.apply(this,arguments);sh.fragmentShader=sh.fragmentShader.replace(/#include <dithering_fragment>/,"gl_FragColor.rgb=min(gl_FragColor.rgb,vec3(.58));\n#include <dithering_fragment>");};m.customProgramCacheKey=function(){return"cap"};m.needsUpdate=true}

  const c=m.color,l=.3*c.r+.59*c.g+.11*c.b;if(/bone|horn|tooth|teeth|fang|claw|tusk/i.test(m.name||"")){c.setHex(0x5e5546);m.map=null;m.vertexColors=false;m.needsUpdate=true;if(m.roughness!==undefined)m.roughness=Math.max(m.roughness,.9);return}if(l>.55){const k=Math.max(.45,.55/l)*.9;c.multiplyScalar(k)}})})}
 function adorn(g,name){if(g.userData&&g.userData.qm)return;
  if(!SC.on||!g||g.userData.adorned)return;g.userData.adorned=1;
  if(!/Orc|Goblin|Bandit|Gorrum|Paladin|Dwarf|Giant|Bael|Magician|Legionary|Draugr/i.test(name))return;
  const F=g.userData.fig;if(!F||!F.meshes)return;let skel=null;for(const m of F.meshes){if(m.skeleton){skel=m.skeleton;break}}
  if(!skel||typeof window.__boneOf!=="function")return;
  const att=(bn,obj,x,y,z,rx,ry,rz)=>{try{const b=window.__boneOf(skel,bn);if(!b)return;const i=skel.bones.indexOf(b),gp=new T.Group();gp.matrixAutoUpdate=false;gp.matrix.copy(skel.boneInverses[i]);gp.matrixWorldNeedsUpdate=true;
     obj.position.set(x,y,z);if(rx!==undefined)obj.rotation.set(rx,ry,rz);gp.add(obj);b.add(gp)}catch(e){}};
  const big=/Giant|Orc|Gorrum|Bael/i.test(name);
  /* belt: trophy skulls on cords */
  [[-.2,.98,.16,.045],[.12,.95,.18,.04],[.28,1.0,.1,.035]].forEach((p,i)=>{const s=skull(p[3]);att("pelvis",s,p[0],p[1],p[2],0,i*.8,0)});
  /* shoulders: spikes */
  if(/Orc|Giant|Gorrum|Bael|Paladin|Legionary/i.test(name)){[["upperarm_l",-1],["upperarm_r",1]].forEach(([b,sd])=>{for(let k=0;k<3;k++){const sp=spike(.13+k*.02,.03);att(b,sp,sd*(.31+k*.02),1.43+k*.025,-.01+k*.03,0,0,-sd*(.9+k*.12))}})}}
 const _f=AGE.foe;AGE.foe=function(g,name){const r=_f.apply(this,arguments);try{adorn(g,name||"")}catch(e){console.warn("adorn",e)}try{dim(g)}catch(e){}return r};
})();

/* ===== detail pass: sharper textures, bigger shadows and an environment for reflections on strong GPUs ===== */
(function(){
 if(typeof THREE==="undefined"||typeof renderer==="undefined"||typeof scene==="undefined")return;
 const T=THREE,D=window.DETAIL={on:1,env:null};
 let maxA=4;try{maxA=Math.min(16,renderer.capabilities.getMaxAnisotropy())}catch(e){}
 const q=()=>{try{return GFX.q}catch(e){return 2}};
 /* sharper textures: every map in the world gets the card's best anisotropic filtering */
 function sharpen(){try{if(!D.on||q()<2)return;let n=0;const seen=D.seen||(D.seen=new WeakSet());
  const fix=t=>{if(t&&!seen.has(t)){seen.add(t);if(t.anisotropy<maxA){t.anisotropy=maxA;t.needsUpdate=true;n++}}};
  scene.traverse(o=>{if(!o.material)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(!m)return;["map","normalMap","roughnessMap","emissiveMap","bumpMap"].forEach(k=>fix(m[k]))})});return n}catch(e){}}
 /* dusk environment so metals, wet stone and scales reflect something */
 function env(){try{if(D.env||q()<2||!T.PMREMGenerator)return;
  const c=document.createElement("canvas");c.width=256;c.height=128;const g=c.getContext("2d"),gr=g.createLinearGradient(0,0,0,128);
  gr.addColorStop(0,"#2a2f55");gr.addColorStop(.45,"#6a4a58");gr.addColorStop(.5,"#a06a48");gr.addColorStop(.52,"#2a2018");gr.addColorStop(1,"#0e0c0a");g.fillStyle=gr;g.fillRect(0,0,256,128);
  g.fillStyle="rgba(255,200,130,.9)";g.beginPath();g.arc(190,58,7,0,6.283);g.fill();
  const tx=new T.CanvasTexture(c);tx.mapping=T.EquirectangularReflectionMapping;
  const pm=new T.PMREMGenerator(renderer);pm.compileEquirectangularShader();const rt=pm.fromEquirectangular(tx);D.env=rt.texture;tx.dispose();pm.dispose();
  scene.environment=D.env;
  scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m&&m.isMeshStandardMaterial)m.envMapIntensity=.45})})}catch(e){console.warn("env",e)}}
 /* stronger shadows on Ultra */
 let shDone=0;
 function shadows(){try{if(shDone||q()<3||typeof sunL==="undefined"||!sunL||!sunL.shadow)return;shDone=1;
  sunL.shadow.mapSize.set(2048,2048);sunL.shadow.radius=2.5;sunL.shadow.bias=-.0004;try{sunL.shadow.map&&sunL.shadow.map.dispose();sunL.shadow.map=null}catch(e){}}catch(e){}}
 let t0=0,tick=0;
 const _vu=typeof vmUpdate!=="undefined"?vmUpdate:null;
 if(_vu)vmUpdate=function(dt){_vu(dt);try{const n=performance.now();if(n-t0>3000){t0=n;tick++;shadows();env();sharpen()}}catch(e){}};
 /* new materials created later (monsters, props) get the environment strength too */
 const _a=scene.add;scene.add=function(o){const r=_a.apply(this,arguments);try{if(D.env&&o&&o.traverse)o.traverse(x=>{if(x.material)(Array.isArray(x.material)?x.material:[x.material]).forEach(m=>{if(m&&m.isMeshStandardMaterial&&m.envMapIntensity===1)m.envMapIntensity=.45})})}catch(e){}return r};
 /* townsfolk and companions get the smoother, softly folded surfaces too (monsters are handled by their own path) */
 try{if(window.__fig&&window.MESH){const _f=window.__fig;window.__fig=function(c){const F=_f.apply(this,arguments);try{if(F&&F.g&&!(c&&c.stut))setTimeout(()=>{try{if(MESH.on&&!F.g.userData.meshUp)MESH.upgrade(F.g,"Human")}catch(e){}},0)}catch(e){}return F}}}catch(e){}
})();

/* ===== ground cover: dense blades of grass, tiny flowers and pebbles that grow around you as you walk ===== */
(function(){
 if(typeof THREE==="undefined"||typeof hfn==="undefined"||typeof map==="undefined"||typeof vmUpdate==="undefined")return;
 const T3=THREE,GC=window.GCOV={on:1,r:0};
 const q=()=>{try{return GFX.q}catch(e){return 2}};
 const hash=(x,y,s)=>{const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n)};
 /* blade-cluster geometry: 5 tapered blades, dark at the root, light at the tip */
 function bladeGeo(){const P=[],C=[];const bl=[[0,0,.05,.55,.9],[.05,.04,.04,.75,1],[-.05,.05,.05,.5,.85],[.03,-.05,.04,.9,1.05],[-.04,-.03,.045,.65,.95]];
  bl.forEach(([x,z,w,h,hh],i)=>{const a=i*1.26,cs=Math.cos(a),sn=Math.sin(a),lean=.12+.08*(i%3);
   const pt=(u,y,l)=>[x+(u*cs)*w+sn*l*lean*y,y,z+(u*sn)*w-cs*l*lean*y];
   const v=[pt(-1,0,0),pt(1,0,0),pt(0,hh,1)];v.forEach((p,k)=>{P.push(p[0],p[1]*1,p[2]);const t=k===2?1:0;C.push(.22+.78*t,.26+.8*t,.16+.55*t)})});
  const g=new T3.BufferGeometry();g.setAttribute("position",new T3.Float32BufferAttribute(P,3));g.setAttribute("color",new T3.Float32BufferAttribute(C,3));g.computeVertexNormals();
  const n=g.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,0,1,0);return g}

 /* fern: 9 arching fronds with a tapered leaflet strip on each */
 function fernGeo(){const P=[],C=[],n=5;for(let f=0;f<9;f++){const a=f*.698+(f%2)*.2,len=.75+(f%3)*.14,rise=.34+(f%4)*.07,cs=Math.cos(a),sn=Math.sin(a);
   const pts=[];for(let i=0;i<=n;i++){const t=i/n,r=t*len,y=Math.sin(t*Math.PI*.82)*rise+t*.06;pts.push([cs*r,y,sn*r,.115*Math.pow(1-t,.55)+.012])}
   for(let i=0;i<n;i++){const a0=pts[i],b0=pts[i+1],px=-sn,pz=cs;const v=[[a0[0]-px*a0[3],a0[1],a0[2]-pz*a0[3]],[a0[0]+px*a0[3],a0[1],a0[2]+pz*a0[3]],[b0[0]-px*b0[3],b0[1],b0[2]-pz*b0[3]],[b0[0]+px*b0[3],b0[1],b0[2]+pz*b0[3]]];
    const c0=.3+.7*(i/n),c1=.3+.7*((i+1)/n);[0,1,2,1,3,2].forEach(k=>{const p=v[k],cc=k<2?c0:(k===2?c1:c1);P.push(p[0],p[1],p[2]);C.push(.2+.8*cc*.7,.3+.7*cc,.12+.4*cc)})}}
  const g=new T3.BufferGeometry();g.setAttribute("position",new T3.Float32BufferAttribute(P,3));g.setAttribute("color",new T3.Float32BufferAttribute(C,3));g.computeVertexNormals();const nn=g.attributes.normal;for(let i=0;i<nn.count;i++)nn.setXYZ(i,0,1,0);return g}
 function shrubGeo(){const parts=[[0,.28,0,.42],[.32,.22,.1,.3],[-.28,.2,-.12,.32],[.05,.2,-.34,.28]],P=[],C=[],N=[];
  parts.forEach(([x,y,z,r],pi)=>{const g=new T3.IcosahedronGeometry(r,1),p=g.attributes.position,nm=g.attributes.normal;for(let i=0;i<p.count;i++){const hv=.85+.3*hash(i,pi,3);P.push(x+p.getX(i)*hv,y+p.getY(i)*(.8*hv),z+p.getZ(i)*hv);N.push(nm.getX(i),nm.getY(i),nm.getZ(i));const sh=.55+.45*(p.getY(i)/r+1)/2,v=hash(i,pi,5)*.2;C.push((.22+v)*sh,(.38+v*.8)*sh,(.14+v*.4)*sh)}});
  const g=new T3.BufferGeometry();g.setAttribute("position",new T3.Float32BufferAttribute(P,3));g.setAttribute("normal",new T3.Float32BufferAttribute(N,3));g.setAttribute("color",new T3.Float32BufferAttribute(C,3));return g}
 const XT={value:0};
 const mat=new T3.MeshLambertMaterial({vertexColors:true,side:T3.DoubleSide});
 mat.onBeforeCompile=sh=>{sh.uniforms.uT=XT;sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nuniform float uT;").replace("#include <begin_vertex>","#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph=instanceMatrix[3].x*.7+instanceMatrix[3].z*.5;transformed.x+=(sin(uT*1.6+ph)+.4*sin(uT*3.1+ph*2.))*position.y*.1;transformed.z+=cos(uT*1.2+ph)*position.y*.07;\n#endif")};
 mat.customProgramCacheKey=()=>"gcov";
 const MAXB=11000,MAXF=900,MAXP=700,MAXFN=1500,MAXSH=260;let blades,flow,peb,fern,shrub,built=0;
 function init(){
 blades=new T3.InstancedMesh(bladeGeo(),mat,MAXB);blades.frustumCulled=false;blades.count=0;blades.instanceColor=new T3.InstancedBufferAttribute(new Float32Array(MAXB*3).fill(1),3);blades.onBeforeRender=()=>{XT.value=performance.now()/1000};
 const fg=new T3.OctahedronGeometry(.07,0),fm=new T3.MeshLambertMaterial({color:0xffffff});flow=new T3.InstancedMesh(fg,fm,MAXF);flow.frustumCulled=false;flow.count=0;flow.instanceColor=new T3.InstancedBufferAttribute(new Float32Array(MAXF*3).fill(1),3);
 const pg=new T3.DodecahedronGeometry(.1,0),pm=new T3.MeshLambertMaterial({color:0x8a8478});peb=new T3.InstancedMesh(pg,pm,MAXP);peb.frustumCulled=false;peb.count=0;
 fern=new T3.InstancedMesh(fernGeo(),mat,MAXFN);fern.frustumCulled=false;fern.count=0;fern.instanceColor=new T3.InstancedBufferAttribute(new Float32Array(MAXFN*3).fill(1),3);
 shrub=new T3.InstancedMesh(shrubGeo(),new T3.MeshLambertMaterial({vertexColors:true}),MAXSH);shrub.frustumCulled=false;shrub.count=0;shrub.instanceColor=new T3.InstancedBufferAttribute(new Float32Array(MAXSH*3).fill(1),3);
 [blades,flow,peb,fern,shrub].forEach(m=>{m.castShadow=false;m.receiveShadow=false;world.add(m)});fern.receiveShadow=false;shrub.castShadow=true;
 built=1}
 const FL=[[1,.95,.85],[1,.85,.3],[.75,.55,.95],[.95,.5,.55],[.6,.8,1]];
 const mm=new T3.Matrix4(),qq=new T3.Quaternion(),pp=new T3.Vector3(),ss=new T3.Vector3(),ya=new T3.Vector3(0,1,0),cc=new T3.Color();
 let lx=1e9,lz=1e9,tm=0;
 function rebuild(cx,cz){
  const Q=q(),R=Q>=3?24:Q>=2?16:Q>=1?9:0;GC.r=R;if(!R){blades.count=flow.count=peb.count=fern.count=shrub.count=0;return}
  const cell=.85,x0=Math.floor((cx-R)/cell),x1=Math.floor((cx+R)/cell),z0=Math.floor((cz-R)/cell),z1=Math.floor((cz+R)/cell);
  let nb=0,nf=0,np=0,nfn=0,nsh=0;const vx=SX*TW,vz=SY*TW;
  for(let ix=x0;ix<=x1;ix++)for(let iz=z0;iz<=z1;iz++){
   const jx=hash(ix,iz,1),jz=hash(ix,iz,2),x=(ix+jx)*cell,z=(iz+jz)*cell,dx=x-cx,dz=z-cz,d2=dx*dx+dz*dz;if(d2>R*R)continue;
   const tx=Math.floor(x/TW),ty=Math.floor(z/TW);if(tx<0||ty<0||tx>=W||ty>=H)continue;const tn=map[ty][tx],tl=T[tn];if(!tl||tl.s)continue;
   const dv=Math.hypot(x-vx,z-vz);const inV=dv<12;const r=hash(ix,iz,3);
   const dens=(tn==="grass"||tn==="hill"||tn==="bog")?.82:tn==="sand"?.14:tn==="rock"?.1:tn==="ruin"?.08:0;
   const fade=1-Math.pow(Math.sqrt(d2)/R,2.2);if(r>dens*fade*(inV?.45:1))continue;
   const y=hfn(x,z);
   if(tn==="rock"||tn==="ruin"){if(np<MAXP){const s=.5+hash(ix,iz,6)*1.2;pp.set(x,y+.03,z);qq.setFromEuler(new T3.Euler(hash(ix,iz,7)*3,hash(ix,iz,8)*6,0));ss.set(s,s*.6,s);mm.compose(pp,qq,ss);peb.setMatrixAt(np++,mm)}continue}
   {const bm=biome[ty][tx],wet=bm==="swamp"||bm==="forest",r2=hash(ix,iz,20);
    if(wet&&(tn==="grass"||tn==="bog"||tn==="hill")&&R>=16){
     if(r2<(bm==="swamp"?.05:.04)*fade&&nfn<MAXFN){const s=.55+hash(ix,iz,21)*.9;pp.set(x+.15,y-.02,z);qq.setFromAxisAngle(ya,hash(ix,iz,22)*6.28);ss.set(s,s*(.8+hash(ix,iz,23)*.5),s);mm.compose(pp,qq,ss);fern.setMatrixAt(nfn,mm);const k=.75+hash(ix,iz,24)*.5;cc.setRGB(k*(bm==="swamp"?.8:1),k*1.1,k*(bm==="swamp"?.8:.9));fern.setColorAt(nfn,cc);nfn++}
     else if(r2>.955&&bm==="forest"&&nsh<MAXSH&&!inV){const s=.8+hash(ix,iz,25)*.9;pp.set(x,y-.04,z);qq.setFromAxisAngle(ya,hash(ix,iz,26)*6.28);ss.set(s,s*(.8+hash(ix,iz,27)*.4),s);mm.compose(pp,qq,ss);shrub.setMatrixAt(nsh,mm);const k=.8+hash(ix,iz,28)*.45,au=hash(ix,iz,29)>.8;cc.setRGB(au?k*1.6:k,au?k*.9:k*1.05,au?k*.5:k*.9);shrub.setColorAt(nsh,cc);nsh++}}}
   if(nb<MAXB){const h=(tn==="sand"?.35:tn==="bog"?.8:.65)+hash(ix,iz,4)*.7,w=.8+hash(ix,iz,5)*.6;qq.setFromAxisAngle(ya,hash(ix,iz,9)*6.28);pp.set(x,y,z);ss.set(w,h,w);mm.compose(pp,qq,ss);blades.setMatrixAt(nb,mm);
    const base=new T3.Color(tl.c),k=.7+hash(ix,iz,10)*.6;cc.setRGB(Math.min(1.4,base.r*2.4*k),Math.min(1.4,base.g*2.2*k),Math.min(1.4,base.b*1.9*k));blades.setColorAt(nb,cc);nb++}
   if(r<.035*fade&&tn!=="sand"&&nf<MAXF){const f=FL[Math.floor(hash(ix,iz,11)*FL.length)];pp.set(x+.2,y+.3+hash(ix,iz,12)*.2,z);qq.identity();ss.set(1,1,1);mm.compose(pp,qq,ss);flow.setMatrixAt(nf,mm);cc.setRGB(f[0],f[1],f[2]);flow.setColorAt(nf,cc);nf++}}
  blades.count=nb;flow.count=nf;peb.count=np;fern.count=nfn;shrub.count=nsh;fern.instanceMatrix.needsUpdate=shrub.instanceMatrix.needsUpdate=true;if(fern.instanceColor)fern.instanceColor.needsUpdate=true;if(shrub.instanceColor)shrub.instanceColor.needsUpdate=true;blades.instanceMatrix.needsUpdate=flow.instanceMatrix.needsUpdate=peb.instanceMatrix.needsUpdate=true;if(blades.instanceColor)blades.instanceColor.needsUpdate=true;if(flow.instanceColor)flow.instanceColor.needsUpdate=true}
 const _vu=vmUpdate;
 vmUpdate=function(dt){_vu(dt);try{if(!built){if(typeof world==='undefined'||!world)return;init()}const on=GC.on&&world.visible&&!(typeof DG!=="undefined"&&DG);blades.visible=flow.visible=peb.visible=fern.visible=shrub.visible=!!on;try{if(typeof C!=="undefined"&&C)blades.visible=false}catch(e){}try{if(window.SKY2&&SKY2.snow>.5){blades.visible=false;fern.visible=SKY2.snow<.7;flow.visible=SKY2.snow<.8&&flow.visible}}catch(e){}if(!on)return;
   tm+=dt;const moved=Math.hypot(P.x-lx,P.z-lz);if(moved>1.6||tm>2.5&&moved>.3||lx>1e8){tm=0;lx=P.x;lz=P.z;rebuild(P.x,P.z)}}catch(e){if(!GC.err){GC.err=1;console.warn("GCOV",e)}}};
 window.GCOV.rebuild=()=>{lx=1e9};
})();

/* ===== PPW: places the Fantasy Props models — village life, wilderness camps, dungeon dressing ===== */
(function(){
 if(typeof THREE==="undefined"||!window.PP||typeof vmUpdate==="undefined")return;
 const T=THREE,PW=window.PPW={on:1,built:0};
 const hs=(a,b,c)=>{const v=Math.sin(a*12.9898+b*78.233+(c||0)*37.719)*43758.5453;return v-Math.floor(v)};
 const q=()=>{try{return GFX.q}catch(e){return 2}};
 /* ---------- flames (additive cross-planes, flickering) ---------- */
 let FT=null,FG=null;const flames=[];
 function flameTex(){if(FT)return FT;const c=document.createElement("canvas");c.width=32;c.height=64;const g=c.getContext("2d"),r=g.createRadialGradient(16,40,1,16,36,26);r.addColorStop(0,"rgba(255,245,200,1)");r.addColorStop(.35,"rgba(255,170,60,.85)");r.addColorStop(1,"rgba(255,90,20,0)");g.fillStyle=r;g.fillRect(0,0,32,64);return FT=new T.CanvasTexture(c)}
 function flame(parent,x,y,z,s){if(!FG){FG=new T.PlaneGeometry(.16,.3);FG.translate(0,.15,0)}
  const m=new T.MeshBasicMaterial({map:flameTex(),transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:true,side:T.DoubleSide}),a=new T.Mesh(FG,m),b=new T.Mesh(FG,m);b.rotation.y=Math.PI/2;
  const g=new T.Group();g.add(a);g.add(b);g.position.set(x,y,z);g.scale.setScalar(s||1);g.renderOrder=30;g.userData.ph=hs(x,z,1)*6.28;parent.add(g);flames.push(g);return g}
 /* ---------- village ---------- */
 const HOFF=[[-5,-3],[5,-4],[-6,3],[6,3],[0,-7]];
 let vp=null;
 function villageItems(bx,bz){const L=[],gy=(x,z)=>hfn(x,z);
  const add=(n,x,z,ry,s,dy,rx,rz)=>{L.push({n,x:bx+x,y:gy(bx+x,bz+z)+(dy||0),z:bz+z,ry:ry||0,s:s||1,rx:rx||0,rz:rz||0})};
  const face=(x,z)=>Math.atan2(-x,-z);          /* turn to face the village centre */
  HOFF.forEach((o,i)=>{const l=Math.hypot(o[0],o[1]),fx=-o[0]/l,fz=-o[1]/l,sx=-fz,sz=fx,px=o[0]+fx*3.3,pz=o[1]+fz*3.3;
   const at=(a,b)=>[px+sx*a+fx*b,pz+sz*a+fz*b];const ry=face(o[0],o[1]);
   if(i===0){let p=at(-1.6,0);add("Barrel_Apples",p[0],p[1],hs(i,1,1)*6);p=at(-.7,.2);add("Barrel",p[0],p[1],1.1);p=at(1.4,0);add("Crate_Wooden",p[0],p[1],ry+.1);add("FarmCrate_Apple",p[0],p[1],ry+.5,1,1.09);p=at(2.4,.3);add("Bucket_Wooden_1",p[0],p[1],0,1.3)}
   if(i===1){let p=at(-1.8,-.2);add("Workbench",p[0],p[1],ry);p=at(-.4,.6);add("Anvil_Log",p[0],p[1],ry+.4);p=at(1.2,.2);add("WeaponStand",p[0],p[1],ry);p=at(2.4,.5);add("Whetstone",p[0],p[1],ry-.4,.9);p=at(-1.8,-.2);add("Sword_Bronze",p[0]-.1,p[1],ry,1,.88,Math.PI/2,0)}
   if(i===2){let p=at(-.8,.2);add("Table_Large",p[0],p[1],ry+Math.PI/2);add("Mug",p[0]+.2,p[1]-.1,0,1,.84);add("Mug",p[0]-.25,p[1]+.2,2,1,.84);const t1=at(.35,.5),t2=at(-2,.5);add("Stool",t1[0],t1[1],0);add("Stool",t2[0],t2[1],1.3);p=at(1.8,.1);add("Bench",p[0],p[1],ry+Math.PI/2)}
   if(i===3){let p=at(-1,0);add("Cauldron",p[0],p[1],0,1.15);p=at(.4,.3);add("Pot_1",p[0],p[1],.5);p=at(1.6,-.2);add("Bucket_Wooden_1",p[0],p[1],0,1.3);p=at(2.4,.2);add("Rope_2",p[0],p[1],.4);add("Bag",at(-2.2,.3)[0],at(-2.2,.3)[1],.8)}
   if(i===4){let p=at(-1.8,0);add("FarmCrate_Carrot",p[0],p[1],ry+.1,1.3);add("FarmCrate_Empty",p[0]+.1,p[1]+.6,ry-.2,1.3);p=at(.2,.3);add("Barrel_Holder",p[0],p[1],ry);p=at(1.8,0);add("Crate_Wooden",p[0],p[1],ry+.3);add("Pouch_Large",p[0]+.4,p[1],0,1.4)}});
  /* market corner */
  add("Stall_Empty",-3.4,2.6,face(-3.4,2.6)+.2,1.3);add("Stall_Cart_Empty",3.6,3.2,face(3.6,3.2),1.2);
  add("Bench",1.0,-4.4,Math.PI/2+.1);add("Crate_Wooden",-1.4,3.9,.6);add("Barrel",-.6,4.1,0);
  return L}
 /* ---------- wilderness: crates, barrels and carts beside the existing roadside carts ---------- */
 let field=null,fRoot=null,campItems=null,lastCx=1e9,lastCz=1e9;
 function campsBuild(){const PR=window.PROPS;if(!PR||!PR.data)return false;const L=[],c=PR.data.L;
  (c.cart||[]).forEach((o,i)=>{const x=o[0],z=o[2],ry=o[3],s=o[4]||1,y=hfn(x,z);
   L.push({n:"Stall_Cart_Empty",x,y,z,ry,s:1.2});
   const sx=Math.cos(ry),sz=-Math.sin(ry),fx=Math.sin(ry),fz=Math.cos(ry);
   const p=(a,b)=>[x+sx*a+fx*b,z+sz*a+fz*b];
   let w=p(2.2,.2);L.push({n:"Crate_Wooden",x:w[0],y:hfn(w[0],w[1]),z:w[1],ry:ry+.3,s:1});
   if(hs(i,1,5)<.6){w=p(2.2,.2);L.push({n:"FarmCrate_Empty",x:w[0],y:hfn(w[0],w[1])+1.09,z:w[1],ry:ry+1,s:1.2})}
   w=p(-2.4,.8);L.push({n:"Barrel",x:w[0],y:hfn(w[0],w[1]),z:w[1],ry:ry*2,s:1});
   if(hs(i,2,5)<.7){w=p(-2.9,-.2);L.push({n:"Barrel",x:w[0],y:hfn(w[0],w[1]),z:w[1],ry:ry*3,s:1})}
   w=p(1,2.2);L.push({n:"Bag",x:w[0],y:hfn(w[0],w[1]),z:w[1],ry:ry+2,s:1.3});
   if(hs(i,3,5)<.35){w=p(.2,-2);L.push({n:"Coin_Pile",x:w[0],y:hfn(w[0],w[1]),z:w[1],ry:0,s:2})}});
  /* a lone candlestand beside each shrine / ruin candle cluster, and rope + chain by the gibbets */
  (c.candles||[]).forEach((o,i)=>{if(hs(i,7,2)<.45)return;const x=o[0]+.7,z=o[2]+.4,y=hfn(x,z);L.push({n:"CandleStick_Stand",x,y,z,ry:hs(i,8,2)*6,s:1.1,fl:1})});
  (c.cage||[]).forEach((o,i)=>{const x=o[0]+1.2,z=o[2]+.8,y=hfn(x,z);L.push({n:"Chain_Coil",x,y,z,ry:hs(i,4,4)*6,s:1.4});if(hs(i,5,4)<.5)L.push({n:"Rope_1",x:x-.8,y:hfn(x-.8,z),z:z+.3,ry:1,s:1.3})});
  return L}
 /* ---------- dungeon rooms ---------- */
 PW.dungeon=function(g,w,dd,h,seed){if(!PW.on)return;const L=[],fl=[],r=(k)=>hs(seed,k,11);let k=0;
  const wall=(d)=>{const side=r(k++)<.5?-1:1,x=side*(w/2-d),z=(r(k++)-.5)*(dd-3);return[x,z,side]};
  const faceIn=(x,z)=>Math.atan2(-x,-z);
  const add=(n,x,z,ry,s,dy)=>L.push({n,x,y:dy||0,z,ry:ry||0,s:s||1});
  /* storage corner */
  {const cx=(r(k++)<.5?-1:1)*(w/2-1.1),cz=(r(k++)<.5?-1:1)*(dd/2-1.1),b=r(k++);
   add("Barrel",cx,cz,r(k++)*6);add(b<.5?"Crate_Wooden":"Crate_Metal",cx+(cx>0?-1.1:1.1),cz,r(k++)*.8);if(b<.6)add("Barrel",cx,cz+(cz>0?-.95:.95),r(k++)*6);if(b>.35)add("FarmCrate_Empty",cx+(cx>0?-1.1:1.1),cz,r(k++)*.8,1.3,b<.5?1.09:.85)}
  /* treasure */
  if(r(k++)<.65){const p=wall(1.0);add("Chest_Wood",p[0],p[1],faceIn(p[0],p[1]),1.5);if(r(k++)<.6)add("Coin_Pile",p[0]-p[2]*.1,p[1]+.9,r(k++)*6,2.4);if(r(k++)<.5)add("Key_Gold",p[0]-p[2]*.1,p[1]-.8,r(k++)*6,3,.01)}
  /* candlestands with flames */
  for(let i=0;i<2;i++){const p=wall(.8);add("CandleStick_Stand",p[0],p[1],0,1.15);fl.push([p[0]+0,1.25*1.15,p[1]])}
  /* prisoner's corner */
  if(r(k++)<.45){const p=wall(1.2);add("Cage_Small",p[0],p[1],faceIn(p[0],p[1]),2.1);add("Chain_Coil",p[0]*.8,p[1]+1.2,r(k++)*6,1.6);add("Rope_1",p[0]*.85,p[1]-1.3,r(k++)*6,1.4)}
  if(r(k++)<.4){const p=wall(.9);add("Bookcase_2",p[0],p[1],faceIn(p[0],p[1]),1.3);add("Book_Stack_2",p[0]*.85,p[1]+1,r(k++)*6,1.6);add("Scroll_1",p[0]*.8,p[1]-.8,r(k++)*6,2.2,.02)}
  if(r(k++)<.3){const p=wall(1.0);add("WeaponStand",p[0],p[1],faceIn(p[0],p[1]),1.2)}
  if(r(k++)<.25){const p=wall(1.4);add("Cauldron",p[0],p[1],0,1.3)}
  if(r(k++)<.5){const p=wall(.8);add(r(k++)<.5?"Vase_2":"Vase_4",p[0],p[1],r(k++)*6,1.6)}
  if(r(k++)<.4){const p=wall(1.5);add("Chalice",p[0],p[1],0,3,0);add("Potion_2",p[0]+.3,p[1]+.1,0,2.2);add("SmallBottles_1",p[0]-.3,p[1],1,2)}
  const root=new T.Group();root.name="ppdg";g.add(root);PP.place(root,L);
  fl.forEach(f=>{flame(root,f[0],f[1],f[2],1.4)});PW.dgRoot=root};
 /* ---------- per frame ---------- */
 const vu=vmUpdate;let vDone=0,tt=0;
 vmUpdate=function(dt){vu(dt);try{
   if(!PW.on||typeof world==="undefined"||!world||typeof hfn!=="function"||typeof POIS==="undefined")return;
   tt+=dt;
   if(!vp){const v=POIS.find(p=>p.id==="village");if(v&&world.children.length>30){const bx=v.x*TW+1,bz=v.y*TW+1;vp=new T.Group();vp.name="ppvillage";world.add(vp);PP.place(vp,villageItems(bx,bz))}}
   if(!field&&window.PROPS&&PROPS.built&&PROPS.data){const items=campsBuild();if(items&&items.length){fRoot=new T.Group();fRoot.name="ppcamps";scene.add(fRoot);
      /* flames for the candle stands */
      const fls=items.filter(o=>o.fl);fls.forEach(o=>{{const f=flame(fRoot,o.x,o.y+1.4,o.z,1.5);f.userData.far=1}});campItems=items;PW.items=items;field=PP.field(fRoot,items)}else field=false}
   const out=world.visible&&!DG;if(vp)vp.visible=out;if(fRoot)fRoot.visible=out;
   const cpp=camera.position;flames.forEach(f=>{const p=f.userData.ph;if(f.userData.far){f.visible=out&&Math.hypot(f.position.x-cpp.x,f.position.z-cpp.z)<55;if(!f.visible)return}f.scale.y=1.2+.25*Math.sin(tt*13+p)*Math.sin(tt*4.1+p);f.rotation.y+=dt*.8});
   if(field&&out){const cp=camera.position;if(Math.hypot(cp.x-lastCx,cp.z-lastCz)>3){lastCx=cp.x;lastCz=cp.z;field.refresh(cp.x,cp.z,q()>=3?60:q()>=2?45:32)}}
  }catch(e){if(!window.__ppE){window.__ppE=1;console.warn("ppworld",e)}}}
})();
