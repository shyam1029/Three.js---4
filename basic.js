//
// IMPORTS
//
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

// SOUND EFFECTS

const crashAudio = document.getElementById('crash-audio');
const jumpAudio = document.getElementById('jump-audio');
jumpAudio.volume = 0.5;
const bonusAudio = document.getElementById('bonus-audio');
bonusAudio.volume = 0.5;
const bgAudio = document.getElementById('game-audio');
bgAudio.volume = 0.2;

// DOM
const progressContainer = document.querySelector('.progress-bar-container');
const progressBar = document.querySelector('progress#progress-bar');
const progressText = document.querySelector('label.progress-bar');

// MANAGER
const manager = new THREE.LoadingManager();

manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
    setTimeout(() => {
        progressText.innerText = 'Almost done...';
    }, 1300);
};

manager.onLoad = function ( ) {
    progressContainer.style.display = 'none';
};

manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
    progressBar.value = itemsLoaded/itemsTotal;
};

manager.onError = function ( url ) {
	console.log( 'There was an error loading ' + url );
};


//UTILITIES
let canvas = document.querySelector('canvas.webgl');
let sizes = {
    width : window.innerWidth,
    height : window.innerHeight
}
let aspect = sizes.width / sizes.height;

//
// MODELS
//
const gltfLoader = new GLTFLoader(manager);
const dracoloader = new DRACOLoader(manager);
dracoloader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dracoloader.setDecoderConfig({type: 'js'});

gltfLoader.setDRACOLoader(dracoloader);

// FAKE HDR
const colorArray = new Uint8Array([170, 170, 170]); // RGB = light gray
const solidTexture = new THREE.DataTexture(colorArray, 1, 1, THREE.RGBFormat);
solidTexture.needsUpdate = true;

let loadAssets = async () => {
    let [gltf] = await Promise.all([
        gltfLoader.loadAsync('./assets/models/ship_compressed.glb')
    ]);
    onLoadAssets(gltf);
};

loadAssets();

let model;
let onLoadAssets = (gltf) => {
    model = gltf.scene;
    model.position.set(0, -0.3, 48);
    model.scale.set(0.002, 0.002, 0.002);
    model.rotation.y = -Math.PI;
    model.traverse(child => {
        if (child.isMesh && child.material && 'metalness' in child.material) {
            child.material.envMap = solidTexture;
            child.material.metalness = 0.1;
            child.material.roughness = 0.1;
            child.material.envMapIntensity = 0.1; // more glow pop
            child.material.emissive = new THREE.Color(0xffffff);
            child.material.emissiveIntensity = 0.005;
            child.material.needsUpdate = true;
        }
    }); 
    player.material.transparent = true;
    player.material.opacity = 0;
    player.material.needsUpdate = true;
    scene.add(model);
}

// gltfLoader.load('./assets/models/ship_compressed.glb', (gltf) => {
//     let model = gltf.scene;
//     model.position.set(0, -0.3, 48);
//     model.scale.set(0.002, 0.002, 0.002);
//     model.rotation.y = -Math.PI;
//     scene.add(model);
//     model.traverse(child => {
//         if (child.isMesh && child.material && 'metalness' in child.material) {
//             child.material.envMap = solidTexture;
//             child.material.metalness = 0.1;
//             child.material.roughness = 0.1;
//             child.material.envMapIntensity = 0.1; // more glow pop
//             child.material.emissive = new THREE.Color(0xffffff);
//             child.material.emissiveIntensity = 0.005;
//             child.material.needsUpdate = true;
//         }
//     });      
// })

//
// SCENE
//
let scene = new THREE.Scene();


// PLAYER

let makePlayer = () => {
    let cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.3, 0.7),
        new THREE.MeshStandardMaterial({
            color: 'red'
        })
    );
    cube.position.z = 48;
    cube.position.y = -0.3;
    cube.geometry.computeBoundingBox();
    playerBox = new THREE.Box3();
    return cube;
}
let playerBox;
let player = makePlayer();
scene.add(player);

//  REWARDS

let rewardComputeBoxArr = [];
let rewardMeshArr = [];

let makeRewardComputeBox = (reward) => {
    const box = new THREE.Box3();

    reward.geometry.computeBoundingBox();

    box.copy(reward.geometry.boundingBox).applyMatrix4(reward.matrixWorld);
    rewardComputeBoxArr.push(box);
}

let makeRewards = (rewardNum) => {
    let colors = [
        "#f47c7c",
        "#f7f488",
        "#A1DE93",
        "#70A107",
        "#C56E90",
        "#908CB8"
    ];
    let rewards = new THREE.Group();
    for(let i=0; i < rewardNum; i++){
        let reward = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.2, 0),
            new THREE.MeshStandardMaterial({color: colors[i % colors.length]})
        );

        reward.position.set(
            Math.random() * playGroundWidth / 2 * (i % 2 == 0 ? -1 : 1),
            -0.5,
            Math.random() * playGroundLength / 2 * (Math.floor(Math.random()*10) % 2 == 0 ? -1 : 1)
        );

        reward.rotation.set((Math.random()/ 3) * (i % 2 == 0 ? -1 : 1), 0, 0);
        let scaleVal = Math.random();
        scaleVal = scaleVal < 0.2 ? 1 : scaleVal;
        reward.scale.set(scaleVal, scaleVal, scaleVal);

        makeRewardComputeBox(reward);
        rewardMeshArr.push(reward)
        rewards.add(reward);
    }
    return rewards;
}

//
// ASTEROID
//

let asteroidComputeBoxArr = [];
let asteroidMeshArr = [];

let makeAsteroidComputeBox = (asteroid) => {
    const box = new THREE.Box3();

    asteroid.geometry.computeBoundingBox();

    box.copy(asteroid.geometry.boundingBox).applyMatrix4(asteroid.matrixWorld);
    asteroidComputeBoxArr.push(box);
}

function createAsteroid(radius = 1) {
    const detail = 128;
    const geometry = new THREE.SphereGeometry(radius, detail, detail);
    const noise = new ImprovedNoise();
    const posAttr = geometry.attributes.position;
  
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
  
      const n = noise.noise(x * 1.5, y * 1.5, z * 1.5);
      const d = n * 0.35;
  
      posAttr.setXYZ(i,
        x + x * d,
        y + y * d,
        z + z * d
      );
    }
  
    geometry.computeVertexNormals();
  
    const material = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.95,
      metalness: 0.05
    });
  
    const asteroid = new THREE.Mesh(geometry, material);
    makeAsteroidComputeBox(asteroid);
    asteroidMeshArr.push(asteroid);
    return asteroid;
}

let playGroundLength = 110;
let playGroundWidth = 20;

let makeAsteroids = (count) =>{
    let asteroids = new THREE.Group();
    for(let i=0; i<count; i++){
        let radius = Math.random() * 0.8;
        let asteroid = createAsteroid(radius);
        asteroid.position.set(
            Math.random() * playGroundWidth / 2 * (i % 2 == 0 ? -1 : 1),
            0,
            Math.random() * playGroundLength / 2 * (Math.floor(Math.random() * 10) % 2 == 0 ? -1 : 1)
        )
        asteroids.add(asteroid);
    }
    return asteroids;
}

let asteroidplane1 = makeAsteroids(30);
let rewards1 = makeRewards(25);
let playGround1 = new THREE.Group();
playGround1.add(asteroidplane1, rewards1);
scene.add(playGround1);

let asteroidplane2 = makeAsteroids(30);
let rewards2 = makeRewards(25);
let playGround2 = new THREE.Group();
playGround2.add(asteroidplane2, rewards2);
playGround2.position.z -= playGroundLength;
scene.add(playGround2);

let asteroidplane3 = makeAsteroids(30);
let rewards3 = makeRewards(25);
let playGround3 = new THREE.Group();
playGround3.add(asteroidplane3, rewards3);
playGround3.position.z -= playGroundLength * 2;
scene.add(playGround3);


//
// CAMERA
//
let camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 1000);
camera.position.set(0, 0.2, 50.5);
scene.add(camera);

//
// LIGHTS
//
let ambientLight = new THREE.AmbientLight('white',1);
scene.add(ambientLight);

const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7);
scene.add(dir);


//
// RENDERER
//
let renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
renderer.setSize(sizes.width, sizes.height);
renderer.render(scene, camera);


//
// RESIZE
//
window.addEventListener('resize', () =>{
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    renderer.setSize(sizes.width, sizes.height);
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
})

//
// CONTROLS PLAYERS ANIMATION
//
let handlePlayer = () => {
    if(playertargetX > player.position.x + 0.02){
        player.position.x += 0.02;
    }else if(playertargetX < player.position.x - 0.02){
        player.position.x -= 0.02;
    }
    if(playerJump){
        playerJump = false;
        jumpTweenActive = true;
        gsap.to(
            player.position, 
            {y: 0.5, ease:'none',duration: 0.28}
        );
        gsap.to(
            player.position, 
            {y: -0.5, ease:'none', duration: 0.28, delay: 0.28, onComplete: () => {
                jumpTweenActive = false;
            }}
        );
    }
}

let gameStart = false;
let currScore = 0;
let maxScore = 0;
let level = 1;
let levelspeed = 10;

setInterval(() => {
    level += 1;
    levelspeed += 5;
    document
        .getElementById('level-container')
        .innerHTML = `<div>Level ${level}</div>`
}, 10 * 1000)


// MENU DOWN
document.querySelector('.menu-container').addEventListener('click', () => {
    document.querySelector('.menu-container').style.display = 'none';
    bgAudio.play();
    setTimeout(() => {
        gameStart = true;
    }, 2000);
})

let reset = () => {
    if(currScore > maxScore){
        maxScore = currScore;
         document.getElementById('max-score').innerHTML = `Max Score: <span> ${Math.floor(maxScore)} </span>`;
    }
    currScore = 0;
    level = 1;
    levelspeed = 10;
    document.getElementById('curr-score').innerHTML = `Current Score: <span> ${Math.floor(currScore)} </span>`
    player.position.set(0, -0.5, 48);
    gameStart = false;

    document.querySelector('.menu-container').style.display = 'flex';

    playGround1.position.z = 0;
    playGround2.position.z = -110;
    playGround3.position.z = -220;
    randomizeAsteroids(playGround1);
    randomizeAsteroids(playGround2);
    randomizeAsteroids(playGround3);
}

let updateBoundingBoxs = () => {
    playerBox.copy(player.geometry.boundingBox).applyMatrix4(player.matrixWorld);

    for(let i=0; i<asteroidComputeBoxArr.length; i++){
        asteroidComputeBoxArr[i].copy(asteroidMeshArr[i].geometry.boundingBox)
        .applyMatrix4(asteroidMeshArr[i].matrixWorld);
    }

    for(let i=0; i<rewardComputeBoxArr.length; i++){
        rewardComputeBoxArr[i].copy(rewardMeshArr[i].geometry.boundingBox)
        .applyMatrix4(rewardMeshArr[i].matrixWorld);
    }
}

let checkCollision = () => {
    for(let i=0; i<asteroidComputeBoxArr.length; i++){
        if(playerBox.intersectsBox(asteroidComputeBoxArr[i])){
            crashAudio.play();
            reset();
        }
    }
    for(let i=0; i<rewardComputeBoxArr.length; i++){
        if(rewardMeshArr[i].visible && playerBox.intersectsBox(rewardComputeBoxArr[i])){
            rewardMeshArr[i].visible = false;
            currScore += 5;
            bonusAudio.play();
        }        
    }
}
//
// PROCESS
//

let randomizeAsteroids = (playGround) => {
    let asteroidArr = playGround.children[0].children;
    let i=0;
    asteroidArr.forEach(asteroid => {
        asteroid.position.set(
            Math.random() * playGroundWidth / 2 * (i % 2 == 0 ? -1 : 1),
            0,
            Math.random() * playGroundLength / 2 * (Math.floor(Math.random()*10) % 2 == 0 ? -1 : 1)
        )
        asteroid.rotation.x = (Math.random() / 3) * (i % 2 == 0 ? -1 : 1);
        i++;
    });
}

let regenerateGround = () => {
    if(playGround1.position.z > playGroundLength) {
        playGround1.position.z = - playGroundLength * 2;
        randomizeAsteroids(playGround1);
    }
    else if(playGround2.position.z > playGroundLength) {
        playGround2.position.z = - playGroundLength * 2;
        randomizeAsteroids(playGround2);
    }
    else if(playGround3.position.z > playGroundLength) {
        playGround3.position.z = - playGroundLength * 2;
        randomizeAsteroids(playGround3);
    }
}

//
// ANIMATION LOOP
//

let clock = new THREE.Clock();
let oldTime = 0;
let animation = () => {
    let time = clock.getElapsedTime();
    let deltaTime = time - oldTime;
    oldTime = time;

    playGround1.position.z += deltaTime * levelspeed;
    playGround2.position.z += deltaTime * levelspeed;
    playGround3.position.z += deltaTime * levelspeed;

    if(model){
        model.position.copy(player.position);
    }
    
    if(gameStart){
        currScore += 0.05;
        document.getElementById('curr-score').innerHTML = `Current Score: <span> ${Math.floor(currScore)} </span>`
        checkCollision();
    }
    handlePlayer();
    updateBoundingBoxs();
    regenerateGround();
    renderer.render(scene, camera);
    requestAnimationFrame(animation);
}

//
// USER CONTROLS
//
let playertargetX = 0;
let playerJump = false;
let jumpTweenActive = false;

let handleKeyDown = (keyEvent) => {
    if(keyEvent.keyCode == 37){
        if(playertargetX == 0){
            playertargetX = -1;
        }
        else if(playertargetX == 1){
            playertargetX = 0
        }
    }
    else if(keyEvent.keyCode == 39){
        if(playertargetX == 0){
            playertargetX = 1;
        }
        else if(playertargetX == -1){
            playertargetX = 0
        }
    }
    else if(keyEvent.keyCode == 38){
        if(!playerJump && !jumpTweenActive){
            jumpAudio.currentTime = 0;
            jumpAudio.play();
            playerJump = true;
        }
    }
}

document.onkeydown = handleKeyDown;

animation();