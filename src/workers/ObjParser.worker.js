

function parse(str) {
  if(typeof buf !== 'string') {
    str = str.toString();
  }

  var lines = str.trim().split('\n');

  var positions = [];
  var cells = [];
  var vertexUVs = [];
  var vertexNormals = [];
  var faceUVs = [];
  var faceNormals = [];
  var name = null;

  for(var i=0; i<lines.length; i++) {
    var line = lines[i];

    // sending some progress info
    if(i%~~(lines.length/100)===0){
      postMessage({
        status: 'progress',
        step: 'parsing',
        progress: i/lines.length
      })
    }

    if(line[0] === '#') continue;

    var parts = line
      .trim()
      .replace(/ +/g, ' ')
      .split(' ');

    switch(parts[0]) {
      case 'o':
        name = parts.slice(1).join(' ');
        break;
      case 'v':
        var position = parts.slice(1).map(Number).slice(0, 3);
        positions.push(position);
        break;
      case 'vt':
        var uv = parts.slice(1).map(Number);
        vertexUVs.push(uv);
        break;
      case 'vn':
        var normal = parts.slice(1).map(Number);
        vertexNormals.push(normal);
        break;
      case 'f':
        var positionIndices = [];
        var uvIndices = [];
        var normalIndices = [];

        parts
          .slice(1)
          .forEach(function(part) {
            var indices = part
              .split('/')
              .map(function(index) {
                if(index === '') {
                  return NaN;
                }
                return Number(index);
              })

            positionIndices.push(convertIndex(indices[0], positions.length));

            if(indices.length > 1) {
              if(!isNaN(indices[1])) {
                uvIndices.push(convertIndex(indices[1], vertexUVs.length));
              }
              if(!isNaN(indices[2])) {
                normalIndices.push(convertIndex(indices[2], vertexNormals.length));
              }
            }

          });

          cells.push(positionIndices);

          if(uvIndices.length > 0) {
            faceUVs.push(uvIndices);
          }
          if(normalIndices.length > 0) {
            faceNormals.push(normalIndices);
          }

        break;
      default:
        // skip
    }

  }

  var mesh = {
    positions: positions,
    cells: cells
  };

  if(vertexUVs.length > 0) {
    mesh.vertexUVs = vertexUVs;
  }

  if(faceUVs.length > 0) {
    mesh.faceUVs = faceUVs;
  }

  if(vertexNormals.length > 0) {
    mesh.vertexNormals = vertexNormals;
  }

  if(faceNormals.length > 0) {
    mesh.faceNormals = faceNormals;
  }

  if(name !== null) {
    mesh.name = name;
  }

  return mesh;
}

function convertIndex(objIndex, arrayLength) {
  return objIndex > 0 ? objIndex - 1 : objIndex + arrayLength;
}


// the worker code lies in the export instruction
function ObjParser() {


  addEventListener('message',function (e) {
    // console.log(e.data)
    let objString = e.data
    let meshData = parse(objString)

    let totalSteps = meshData.cells.length * meshData.cells[0].length + meshData.positions.length
    let progressStep = 0


    // Usually 3 because polygons are triangle, but OBJ allows different
    const verticesPerPolygon = meshData.cells[0].length
    let indices = new Uint32Array( verticesPerPolygon * meshData.cells.length )
    let positions = new Float32Array( 3 * meshData.positions.length )

    // flattening the indices
    for (let i=0; i<meshData.cells.length; i += 1) {
      let newIndex = i * verticesPerPolygon
      for (let ii=0; ii<verticesPerPolygon; ii += 1) {
        indices[newIndex + ii] = meshData.cells[i][ii]


        // sending some progress info
        if(progressStep%~~(totalSteps/100)===0){
          postMessage({
            status: 'progress',
            step: 'processing',
            progress: progressStep/totalSteps
          })
        }

        progressStep ++
      }
    }

    // flatening the positions
    for (let p=0; p<meshData.positions.length; p += 1) {
      let newIndex = p * 3
      positions[newIndex] = meshData.positions[p][0]
      positions[newIndex+1] = meshData.positions[p][1]
      positions[newIndex+2] = meshData.positions[p][2]


      // sending some progress info
      if(progressStep%~~(totalSteps/100)===0){
        postMessage({
          status: 'progress',
          step: 'processing',
          progress: progressStep/totalSteps
        })
      }

      progressStep ++
    }

    postMessage({
      status: 'progress',
      step: 'done',
      progress: 1
    })

    postMessage({
      status: 'done',
      indices: indices,
      positions: positions,
      verticesPerPolygon: verticesPerPolygon
    })

  })
}

module.exports = ObjParser
