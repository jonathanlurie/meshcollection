// This file is supposed to be ran with Node and aim at generating a raw binary
// file that contains points coordinates

const fs = require('fs')

let interval = {
  x: {min: 0, max: 13200},
  y: {min: 0, max: 8000},
  z: {min: 0, max: 11400}
}

let nbPoints = 1000000

let xyz = new Float32Array(nbPoints*3)

for(let i=0; i<nbPoints; i+=3){
  xyz[i] = Math.random() * (interval.x.max - interval.x.min) + interval.x.min
  xyz[i + 1] = Math.random() * (interval.y.max - interval.y.min) + interval.y.min
  xyz[i + 2] = Math.random() * (interval.z.max - interval.z.min) + interval.z.min
}

var buf = Buffer.from(xyz.buffer)
fs.writeFileSync(`${nbPoints}_xyz_float32_3.raw`, buf)
