
// main.js - Phaser client with Socket.IO multiplayer support (expects server serving socket.io)
const WIDTH = 1280, HEIGHT = 720, TILE = 32;
let game, sceneMain;
let socket = null;
let localPlayer = null;
let players = {}; // other players
let npcs = {};
let pickups = {};

class BootScene extends Phaser.Scene {
  constructor(){ super({key:'BootScene'}); }
  preload(){
    // dynamically load all files from a manifest. The server provides a manifest; for now attempt to fetch assets/manifest.json
    this.load.json('manifest','assets/manifest.json');
    this.load.on('filecomplete-json-manifest',(key,value)=>{
      const manifest = this.cache.json.get('manifest');
      // manifest should list images and audio; load them
      if(manifest.images){
        for(const img of manifest.images){
          this.load.image(img.key, 'assets/'+img.path);
        }
      }
      if(manifest.sprites){
        for(const s of manifest.sprites){
          this.load.spritesheet(s.key,'assets/'+s.path,{frameWidth:s.frameWidth, frameHeight:s.frameHeight});
        }
      }
      if(manifest.audio){
        for(const a of manifest.audio){
          this.load.audio(a.key,'assets/'+a.path);
        }
      }
      this.load.start();
    });
  }
  create(){ this.scene.start('MainScene'); }
}

class MainScene extends Phaser.Scene {
  constructor(){ super({key:'MainScene'}); }
  create(){
    sceneMain = this;
    this.add.rectangle(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT, 0x1b262c);
    this.playersGroup = this.physics.add.group();
    this.npcGroup = this.physics.add.group();
    this.pickupGroup = this.physics.add.group();

    // create local player using a loaded asset or fallback
    const keys = this.textures.getTextureKeys();
    const playerKey = keys.includes('player') ? 'player' : keys[0];
    const p = this.physics.add.sprite(WIDTH/2, HEIGHT/2, playerKey).setDisplaySize(40,40);
    p.playerId = 'local_'+Date.now();
    p.hp = 100; p.inventory = [];
    this.playersGroup.add(p);
    localPlayer = p;

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({W:Phaser.Input.Keyboard.KeyCodes.W,S:Phaser.Input.Keyboard.KeyCodes.S,A:Phaser.Input.Keyboard.KeyCodes.A,D:Phaser.Input.Keyboard.KeyCodes.D,space:Phaser.Input.Keyboard.KeyCodes.SPACE});

    // HUD
    this.hud = this.add.text(8, HEIGHT-48, 'HP:100', {font:'16px monospace', fill:'#fff'}).setScrollFactor(0).setDepth(999);

    // attempt to connect to socket.io
    try {
      socket = io(); // connects to same origin
      socket.on('connect', ()=>{ document.getElementById('status').innerText = 'Conectado: '+socket.id; socket.emit('join_request',{},(r)=>{ console.log('joined',r); }); });
      socket.on('state_update', (st)=>{ applySnapshot(st); });
      socket.on('disconnect', ()=>{ document.getElementById('status').innerText = 'Desconectado'; });
    } catch(e){
      console.warn('Socket.io not available; running single-player.');
      document.getElementById('status').innerText = 'Single-player';
    }

    // spawn some NPCs if no server
    for(let i=0;i<6;i++){
      const z = this.physics.add.sprite(100+Math.random()*1000,100+Math.random()*400,'zombie').setDisplaySize(36,36);
      z.npcId = 'z_local_'+i; z.hp = 30;
      this.npcGroup.add(z);
      npcs[z.npcId] = z;
    }

    // pickups from manifest if available
    const man = this.cache.json.get('manifest');
    if(man && man.pickups){
      let idx=0;
      for(const pk of man.pickups){
        const spr = this.physics.add.image(200+idx*50, 200+Math.random()*300, pk.key).setDisplaySize(22,22);
        spr.pickId = 'pick_'+idx;
        this.pickupGroup.add(spr);
        pickups[spr.pickId] = {id:spr.pickId, type: pk.type};
        idx++;
      }
    }
  }
  update(time,delta){
    if(!localPlayer) return;
    let vx=0, vy=0;
    if(this.keys.A.isDown) vx=-1; if(this.keys.D.isDown) vx=1;
    if(this.keys.W.isDown) vy=-1; if(this.keys.S.isDown) vy=1;
    const len = Math.hypot(vx,vy);
    const speed = 160 * (len?1/len:1);
    localPlayer.body.setVelocity(vx*speed, vy*speed);

    // send input if socket connected
    if(socket && socket.connected){
      socket.emit('input',{left: this.keys.A.isDown, right:this.keys.D.isDown, up:this.keys.W.isDown, down:this.keys.S.isDown, timestamp:Date.now()});
    }
    this.hud.setText('HP:'+Math.round(localPlayer.hp)+' Inv:'+localPlayer.inventory.map(i=>i.type).join(','));
  }
}

function applySnapshot(st){
  // naive: remove remote players and recreate (simple approach)
  // handle players
  // console.log('snapshot',st);
}

const config = { type: Phaser.AUTO, width: WIDTH, height: HEIGHT, parent:'game-container', physics:{default:'arcade', arcade:{debug:false}}, scene:[BootScene, MainScene] };
window.game = new Phaser.Game(config);
