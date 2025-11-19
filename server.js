// server.js - minimal authoritative server using Express + Socket.IO
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 8080;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// serve client static (client folder) and assets
app.use(express.static(path.join(__dirname, 'client')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

let rooms = {};
let socketRoom = {};

function findRoom(){
  for(const id in rooms){
    if(rooms[id].players.length < 8) return rooms[id];
  }
  const id = 'room_'+Date.now();
  rooms[id] = createRoom(id);
  rooms[id].start();
  return rooms[id];
}

function createRoom(id){
  const room = {
    id,
    players: [],
    npcs: {},
    pickups: {},
    missions: [],
    tickInterval: null,
    tickRate: 20,
    start: function(){
      if(this.tickInterval) return;
      this.tickInterval = setInterval(()=> tickRoom(this), 1000/this.tickRate);
      console.log('room started', this.id);
    },
    stop: function(){ if(this.tickInterval) clearInterval(this.tickInterval); this.tickInterval=null; }
  };
  // init pickups and npcs
  for(let i=0;i<6;i++){
    const pid = 'p_'+i;
    room.pickups[pid] = { id: pid, x: 150 + i*80, y: 150 + (i%3)*40, type: ['wood','scrap','food'][i%3] };
  }
  for(let i=0;i<5;i++){
    const nid = 'z_'+i;
    room.npcs[nid] = { id: nid, x: 200 + i*60, y: 200 + (i%2)*90, hp: 30, type:'walker' };
  }
  return room;
}

function tickRoom(room){
  // move npcs towards nearest player
  for(const nid in room.npcs){
    const n = room.npcs[nid];
    let nearest=null; let nd=1e9;
    for(const p of room.players){
      const d = Math.hypot(p.x - n.x, p.y - n.y);
      if(d < nd){ nd = d; nearest = p; }
    }
    if(nearest){
      const ang = Math.atan2(nearest.y - n.y, nearest.x - n.x);
      const sp = 30;
      n.x += Math.cos(ang) * (sp/room.tickRate);
      n.y += Math.sin(ang) * (sp/room.tickRate);
      if(nd < 28) {
        nearest.hp = Math.max(0, nearest.hp - 6);
      }
    }
  }
  // broadcast snapshot
  const snapshot = { players: room.players.map(p => ({id:p.id,x:p.x,y:p.y,hp:p.hp,inv:p.inv})), npcs: room.npcs, pickups: room.pickups };
  for(const p of room.players){
    const s = io.sockets.sockets.get(p.socketId);
    if(s) s.emit('state_update', snapshot);
  }
}

io.on('connection', (socket)=>{
  console.log('connect', socket.id);
  socket.on('join_request', (data, cb)=>{
    const room = findRoom();
    const player = { socketId: socket.id, id: 'player_'+Date.now(), x: 400, y: 300, hp: 100, inv: [] };
    room.players.push(player);
    socketRoom[socket.id] = room.id;
    socket.join(room.id);
    console.log('player joined', player.id, 'room', room.id);
    cb({ ok:true, roomId: room.id, playerId: player.id });
  });
  socket.on('input', (input)=>{
    const rid = socketRoom[socket.id];
    if(!rid) return;
    const room = rooms[rid];
    const player = room.players.find(p=>p.socketId===socket.id);
    if(!player) return;
    const speed = 160;
    const vx = (input.right?1:0) + (input.left?-1:0);
    const vy = (input.down?1:0) + (input.up?-1:0);
    player.x = Math.max(20, Math.min(1240, player.x + vx * (1/room.tickRate) * speed));
    player.y = Math.max(20, Math.min(700, player.y + vy * (1/room.tickRate) * speed));
  });
  socket.on('action', ({action, payload})=>{
    // implement server-side actions if needed
  });
  socket.on('disconnect', ()=>{
    const rid = socketRoom[socket.id];
    if(rid && rooms[rid]){
      const rm = rooms[rid];
      rm.players = rm.players.filter(p=>p.socketId !== socket.id);
      delete socketRoom[socket.id];
    }
    console.log('disconnect', socket.id);
  });
});

server.listen(PORT, ()=> console.log('Server listening on', PORT));
