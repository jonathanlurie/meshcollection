import { BufferGeometry, BufferAttribute, Float32BufferAttribute, Object3D, ShaderMaterial, Color, FrontSide, AdditiveBlending, Mesh, Points, AxesHelper } from 'three';
import EventManager from '@jonathanlurie/eventmanager';

/*! rollup-plugin-webworkify/workerhelper.js v0.0.4 | MIT Licensed | Allex Wang <allex.wxn@gmail.com> */
var win = window, BlobBuilder = win.BlobBuilder || win.WebKitBlobBuilder || win.MozBlobBuilder || win.MSBlobBuilder, URL = win.URL || win.webkitURL || win.mozURL || win.msURL, SCRIPT_TYPE = "application/javascript", TARGET = "undefined" == typeof Symbol ? "__t" + +new Date() : Symbol(), Worker = win.Worker, nextTick = win.setImmediate || function(e) {
  return setTimeout(e, 1);
};

function workerCtor(e, t) {
  return function r(n) {
    var o = this;
    if (!(o instanceof r)) return new r(n);
    if (!t) return new Worker(e);
    if (Worker && !n) {
      var i = createSourceObject(';(function(f){f&&new(f.default?f["default"]:f)(self)}((' + t.toString() + ")()))"), a = new Worker(i);
      return URL.revokeObjectURL(i), o[TARGET] = a;
    }
    var c = new WorkerEmitter({
      close: function() {
        this.destroy();
      }
    }, o);
    Object.assign(new WorkerEmitter(o, c), {
      isThisThread: !0,
      terminate: function() {
        c.close(), this.destroy();
      }
    }), t().call(c, c);
  };
}

function WorkerEmitter(e, t) {
  var r = Object.create(null);
  return e.onmessage = null, e.addEventListener = function(e, t) {
    var n = r[e] || (r[e] = []);
    ~n.indexOf(t) || n.push(t);
  }, e.removeEventListener = function(e, t) {
    var n, o = r[e];
    o && -1 !== (n = o.indexOf(t)) && (o.splice(n, 1), o.length || delete r[e]);
  }, e.postMessage = function(r) {
    nextTick(function() {
      var n = r;
      if (t.onmessage) try {
        t.onmessage({
          data: n,
          target: e
        });
      } catch (e) {
        console.error(e);
      }
      t.emit("message", {
        type: "message",
        data: n,
        target: e,
        timeStamp: +new Date()
      });
    });
  }, e.emit = function(t, n) {
    var o = r[t];
    o && o.forEach(function(t, r) {
      return t.call(e, n);
    });
  }, e.destroy = function() {
    Object.keys(r).forEach(function(e) {
      var t = r[e];
      t && (t.length = 0, delete r[e]);
    }), r = null;
  }, e;
}

if (Worker) {
  var testWorker, objURL = createSourceObject("self.onmessage = function () {}"), testArray = new Uint8Array(1);
  try {
    if (/(?:Trident|Edge)\/(?:[567]|12)/i.test(navigator.userAgent)) throw new Error("Not available");
    (testWorker = new Worker(objURL)).postMessage(testArray, [ testArray.buffer ]);
  } catch (e) {
    Worker = null;
  } finally {
    URL.revokeObjectURL(objURL), testWorker && testWorker.terminate();
  }
}

function createSourceObject(e) {
  var t = SCRIPT_TYPE;
  try {
    return URL.createObjectURL(new Blob([ e ], {
      type: t
    }));
  } catch (n) {
    var r = new BlobBuilder();
    return r.append(e), URL.createObjectURL(r.getBlob(t));
  }
}

var ObjParserWorker = workerCtor('worker#./workers/ObjParser.worker.js', function() { return (function(e,r){return e(r={exports:{}},r.exports),r.exports})(function (module, exports) {
  

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
      });
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
              });

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
    let objString = e.data;
    let meshData = parse(objString);

    let totalSteps = meshData.cells.length * meshData.cells[0].length + meshData.positions.length;
    let progressStep = 0;


    // Usually 3 because polygons are triangle, but OBJ allows different
    const verticesPerPolygon = meshData.cells[0].length;
    let indices = new Uint32Array( verticesPerPolygon * meshData.cells.length );
    let positions = new Float32Array( 3 * meshData.positions.length );

    // flattening the indices
    for (let i=0; i<meshData.cells.length; i += 1) {
      let newIndex = i * verticesPerPolygon;
      for (let ii=0; ii<verticesPerPolygon; ii += 1) {
        indices[newIndex + ii] = meshData.cells[i][ii];


        // sending some progress info
        if(progressStep%~~(totalSteps/100)===0){
          postMessage({
            status: 'progress',
            step: 'processing',
            progress: progressStep/totalSteps
          });
        }

        progressStep ++;
      }
    }

    // flatening the positions
    for (let p=0; p<meshData.positions.length; p += 1) {
      let newIndex = p * 3;
      positions[newIndex] = meshData.positions[p][0];
      positions[newIndex+1] = meshData.positions[p][1];
      positions[newIndex+2] = meshData.positions[p][2];


      // sending some progress info
      if(progressStep%~~(totalSteps/100)===0){
        postMessage({
          status: 'progress',
          step: 'processing',
          progress: progressStep/totalSteps
        });
      }

      progressStep ++;
    }

    postMessage({
      status: 'progress',
      step: 'done',
      progress: 1
    });

    postMessage({
      status: 'done',
      indices: indices,
      positions: positions,
      verticesPerPolygon: verticesPerPolygon
    });

  });
}

module.exports = ObjParser;

});});

const MESH_FORMAT_LOOKUP = {
  obj: "parseObj"
};

class MeshParser {

  static parseObjFromUrl(url, cbDone, cbProgress){
    fetch(url)
      .then(function(response) {
        if(response.ok === false){
          throw new Error(`No file at ${url}`)
        }
        return response.text()
      })
      .then(function(objString) {

        let worker = new ObjParserWorker();
        worker.addEventListener('message', function (e) {
          let messageData = e.data;
          let status = messageData.status;

          if(status === 'progress'){
            cbProgress(messageData);
          } else if(status === 'done'){
            let geometry = new BufferGeometry();
            geometry.setIndex( new BufferAttribute( messageData.indices, 1 ) );
            geometry.addAttribute( 'position', new BufferAttribute( messageData.positions, messageData.verticesPerPolygon ) );
            geometry.computeBoundingSphere();
            geometry.computeVertexNormals();
            cbDone({
              error: null,
              geometry: geometry
            });
          }

        });
        worker.postMessage(objString);

      })
      .catch( e => {
        cbDone({
          error: e,
          geometry: null
        });
      });


  }



  static parseFromUrl(url, format, cbDone, cbProgress){
    MeshParser[MESH_FORMAT_LOOKUP[format] + 'FromUrl'](url, cbDone, cbProgress);
  }

}

// import RawPointsParserWorker from 'worker#./workers/RawPointsParser.worker.js'

const POINT_FORMAT_LOOKUP = {
  raw: "parseRaw"
};

class PointCloudParser {

  static parseRawFromUrl(url, cbDone, cbProgress){
    fetch(url)
      .then(function(response) {
        if(response.ok === false){
          throw new Error(`No file at ${url}`)
        }
        return response.blob()
      })
      .then(function(pointBlob){
        return new Response(pointBlob).arrayBuffer()
      })
      .then(function(pointBuffer) {
        console.time('points');
        let geometry = new BufferGeometry();
        geometry.addAttribute( 'position', new Float32BufferAttribute( new Float32Array(pointBuffer), 3 ) );
        console.timeEnd('points');

        cbDone({
          error: null,
          geometry: geometry
        });
      })
      .catch( e => {
        cbDone({
          error: e,
          geometry: null
        });
      });


  }



  static parseFromUrl(url, format, cbDone, cbProgress){
    PointCloudParser[POINT_FORMAT_LOOKUP[format] + 'FromUrl'](url, cbDone, cbProgress);
  }

}

/**
 * Events expected:
 *
 * - 'onMeshLoaded': whenever a mesh is loaded. the callback of this event is called with the arg:
 *    @param {THREE.Mesh} mesh - mesh object
 *    @param {string} id - id of the mesh (as used within this collection)
 *
 * - 'onMeshLoadingProgress': when the loading status is updated. The callback arguments are:
 *    @param {string} id - id of the element that could not be loaded
 *    @param {string} step - name of the step being in progression (ie. 'parsing')
 *    @param {number} progress - percentage of progress on the 'step'
 *
 * - 'onMeshLoadError': whenever a mesh could not be loaded, for various reasons. Args of the callbac:
 *    @param {Error} error - the error explaining what was wrong
 *    @param {string} id - id of the element that could not be loaded
 */
class MeshCollection extends EventManager {

  constructor(threeContext=null){
    super();
    this._threeContext = threeContext;

    this._container = new Object3D();
    this._container.name = 'meshContainer';
    this._threeContext.getScene().add(this._container);
    this._collection = {};

    // let sphereGeom = new THREE.SphereBufferGeometry( 10, 32, 32 );
    // let sphereMat = new THREE.MeshBasicMaterial( {color: 0xff00ff} );
    // let sphereMesh = new THREE.Mesh( sphereGeom, sphereMat );
    // this._threeContext.getScene().add(sphereMesh)
    // this._threeContext.addSampleShape()

    // const geometry = new THREE.TorusKnotBufferGeometry(10, 3, 100, 16)
    // const material = new THREE.MeshPhongMaterial({ color: Math.ceil(Math.random() * 0xffff00) })
    // const torusKnot = new THREE.Mesh(geometry, material)
    // this._threeContext.getScene().add(torusKnot)

    // // DEBUG
    // let axesHelper = new THREE.AxesHelper(100)
    // this._threeContext.getScene().add(axesHelper)
  }


  _generateFresnelMateral(color) {
    let vertexShader = `
    #version 300 es
    precision highp float;

    uniform vec3 viewVector;
    uniform float c;
    uniform float p;
    varying float intensity;

    void main()
    {
      vec3 vNormal = normalize( normalMatrix * normal );
      vec3 vNormel = normalize( normalMatrix * viewVector );
      intensity = pow( c - dot(vNormal, vNormel), p );
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
    `.trim();

    let fragmentShader = `
    #version 300 es
    precision highp float;
    uniform vec3 glowColor;
    uniform float alpha;
    varying float intensity;
    out vec4 out_FragColor;
    void main()
    {
      vec3 glow = glowColor * intensity;
      out_FragColor = vec4( glow, intensity * alpha);
    }
    `.trim();

    let fresnelMaterial = new ShaderMaterial({
        uniforms: {
          c:   { type: "f", value: 1.0 },
          alpha:   { type: "f", value: 1.0 },
          p:   { type: "f", value: 1.4 },
          glowColor: { type: "c", value: new Color(color) },
          viewVector: { type: "v3", value: this._threeContext.getCamera().position } // TODO: this should be removed after test
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: FrontSide,
        blending: AdditiveBlending,
        transparent: true,

        // depthTest: false,
        depthWrite: false,
      });

      let that = this;

      // TODO: this should also be removed after test
      this._threeContext.on('beforeRender', function(){
        fresnelMaterial.uniforms.viewVector.value = that._threeContext.getCamera().position;
      });

    return fresnelMaterial
  }


  /**
   * Load a mesh file from a distant file, with the provided url.
   * @param {string} url - the url to load the file from
   * @param {object} options - the options object
   * @param {string} options.format - must be one of: 'obj' (no others for the moment :D )
   * @param {string} options.id - the id to attribute to the mesh once it will be part of the collection. Automatically generated if not provided
   * @param {boolean} options.makeVisible - if true, the mesh will be added and made visible once loaded. If false, it's just going to be parsed and will have to be added later using its id (default: true)
   * @param {string} options.color - the color to apply to the mesh in the format '#FFFFFF' (default: '#FFFFFF', does not apply if a material is given)
   * @param {boolean} options.focusOn - once loaded, the camera will look at it
   * @param {THREE.Material} options.material - the material to apply to this mesh (default: a generated Fresnel material)
   */
  loadMeshFromUrl(url, options = {}){
    let that = this;
    let id = 'id' in options ? options.id : Math.random().toString().split('.')[1];
    let makeVisible = 'makeVisible' in options ? options.makeVisible : true;
    let color = 'color' in options ? options.color : '#FFFFFF';
    let material = 'material' in options ? options.material : this._generateFresnelMateral(color);
    let format = 'format' in options ? options.format : 'obj';
    let focusOn = 'focusOn' in options ? options.focusOn : false;

    MeshParser.parseFromUrl(url, format,
      // cbDone,
      function(info){
        if(info.error){
          return that.emit('onMeshLoadError', [info.error, id])
        }

        let geometry = info.geometry;
        let mesh = new Mesh(geometry, material);

        // let geometry = new THREE.SphereBufferGeometry( 10, 32, 32 );
        // let material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
        // let mesh = new THREE.Mesh( geometry, material );

        mesh.name = id;
        mesh.visible = makeVisible;
        that._collection[id] = mesh;
        that._container.add(mesh);
        // that._threeContext.getScene().add(mesh)

        if(focusOn){
          let lookatPos = geometry.boundingSphere.center;
          that._threeContext.getCamera().position.set(lookatPos.x + geometry.boundingSphere.radius * 4, lookatPos.y, lookatPos.z);
          that._threeContext.lookAt(geometry.boundingSphere.center);
        }

        // DEBUG
        // let axesHelper = new THREE.AxesHelper(100)
        // // axesHelper.position.set(geometry.boundingSphere.center.x, geometry.boundingSphere.center.y, geometry.boundingSphere.center.z)
        // that._threeContext.getScene().add(axesHelper)

        that.emit('onMeshLoaded', [mesh, id]);
      },

      // cbProgress
      function(info){
        that.emit('onMeshLoadingProgress', [id, info.step, info.progress]);
      });
  }


  /**
   * Is a mesh with such id in the collection?
   * @return {boolean} true if present in collection, false if not
   */
  has(id){
    return (id in this._collection)
  }


  /**
   * Show the mesh that has such id
   */
  show(id){
    if(id in this._collection){
      this._collection[id].visible = true;
    }
  }


  /**
   * Hide the mesh that has such id
   */
  hide(id){
    if(id in this._collection){
      this._collection[id].visible = false;
    }
  }


  /**
   * NOT WORKING FOR NOW
   */
  detach(id){
    if(id in this._collection){
      // this._container
      let mesh = this._collection[id];
      this._container.remove(mesh);
    }
  }





  /**
   * Load a mesh file from a distant file, with the provided url.
   * @param {string} url - the url to load the file from
   * @param {object} options - the options object
   * @param {number} options.size - size of each point (default: 100, as the space unit is probably going to be micron)
   * @param {string} options.format - must be one of: 'raw' (no others for the moment :D )
   * @param {string} options.id - the id to attribute to the mesh once it will be part of the collection. Automatically generated if not provided
   * @param {boolean} options.makeVisible - if true, the mesh will be added and made visible once loaded. If false, it's just going to be parsed and will have to be added later using its id (default: true)
   * @param {string} options.color - the color to apply to the mesh in the format '#FFFFFF' (default: '#FFFFFF', does not apply if a material is given)
   * @param {boolean} options.focusOn - once loaded, the camera will look at it
   */
  loadPointCloudFromUrl(url, options = {}){
    let that = this;
    let id = 'id' in options ? options.id : Math.random().toString().split('.')[1];
    let makeVisible = 'makeVisible' in options ? options.makeVisible : true;
    let color = 'color' in options ? options.color : '#FFFFFF';
    let format = 'format' in options ? options.format : 'raw';
    let focusOn = 'focusOn' in options ? options.focusOn : false;
    let size = 'size' in options ? options.size : 100;

    PointCloudParser.parseFromUrl(url, format,
      // cbDone,
      function(info){
        if(info.error){
          return that.emit('onMeshLoadError', [info.error, id])
        }

        let material = that._generatePointCloudMaterial(color, size);
        let geometry = info.geometry;
        let particles = new Points( geometry, material );

        particles.name = id;
        particles.visible = makeVisible;
        that._collection[id] = particles;
        that._container.add(particles);
        // that._threeContext.getScene().add(particles)

        if(focusOn){
          let lookatPos = geometry.boundingSphere.center;
          that._threeContext.getCamera().position.set(lookatPos.x + geometry.boundingSphere.radius * 4, lookatPos.y, lookatPos.z);
          that._threeContext.lookAt(geometry.boundingSphere.center);
        }

        // DEBUG
        // let axesHelper = new THREE.AxesHelper(100)
        // // axesHelper.position.set(geometry.boundingSphere.center.x, geometry.boundingSphere.center.y, geometry.boundingSphere.center.z)
        // that._threeContext.getScene().add(axesHelper)

        that.emit('onMeshLoaded', [particles, id]);
      },

      // cbProgress
      function(info){
        that.emit('onMeshLoadingProgress', [id, info.step, info.progress]);
      });
  }





  /**
   *
   * TEST
   */
  addPointCloud(nbPoints=1000, color){
    // https://github.com/mrdoob/three.js/blob/master/examples/webgl_points_sprites.html

    let axesHelper = new AxesHelper(100);
    // axesHelper.position.set(geometry.boundingSphere.center.x, geometry.boundingSphere.center.y, geometry.boundingSphere.center.z)
    this._threeContext.getScene().add(axesHelper);

    let geometry = new BufferGeometry();
    let vertices = [];
    // let textureLoader = new THREE.TextureLoader();

    // for ( let i = 0; i < 10000; i ++ ) {
    //   let x = Math.random() * 20 - 10;
    //   let y = Math.random() * 20 - 10;
    //   let z = Math.random() * 20 - 10;
    //   vertices.push( x, y, z )
    // }

    for ( let i = 0; i < nbPoints; i ++ ) {
      let x = Math.random() * 10000;
      let y = Math.random() * 10000;
      let z = Math.random() * 10000;
      vertices.push( x, y, z );
    }

    geometry.addAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );


    let shader = {
      vertex: `
      uniform float size;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        gl_PointSize = size * ( 150.0 / -mvPosition.z );
        gl_Position = projectionMatrix * mvPosition;
      }`,

      fragment: `
      uniform vec3 color;

      void main() {
        vec2 uv = vec2( gl_PointCoord.x -0.5, 1.0 - gl_PointCoord.y-0.5 );
        float dFromCenter = sqrt(uv.x*uv.x + uv.y*uv.y);
        float alpha = .7;
        float blurStart = 0.3;

        // without blurry edges
        if(dFromCenter > 0.5){
          discard;
        }else {
          vec4 tex = vec4(color, alpha);
          gl_FragColor = tex;
        }

        // with blurry edges
        // if(dFromCenter > 0.5){
        //   discard;
        // }else if(dFromCenter > blurStart) {
        //   alpha = alpha - (dFromCenter - blurStart) / (0.5-blurStart);
        //   vec4 tex = vec4(1.0, 0.0, 0.0, alpha);
        //   gl_FragColor = tex;
        // } else {
        //   vec4 tex = vec4(1.0, 0.0, 0.0, alpha);
        //   gl_FragColor = tex;
        // }
      }`
    };

    let uniforms = {
      size: { value: 100.},
      color: { type: "c", value: new Color(color) },
    };

    // material
    var material = new ShaderMaterial( {
      uniforms:       uniforms,
      vertexShader:   shader.vertex,
      fragmentShader: shader.fragment,
      transparent:    true,
      blending: AdditiveBlending,
      //depthTest: false,
    });

    let particles = new Points( geometry, material );

    this._collection['someparticle'] = particles;
    this._container.add(particles);
  }


  _generatePointCloudMaterial(color='#FFFFFF', pointSize=100){
    let shader = {
      vertex: `
      uniform float size;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        gl_PointSize = size * ( 150.0 / -mvPosition.z );
        gl_Position = projectionMatrix * mvPosition;
      }`,

      fragment: `
      uniform vec3 color;

      void main() {
        vec2 uv = vec2( gl_PointCoord.x -0.5, 1.0 - gl_PointCoord.y-0.5 );
        float dFromCenter = sqrt(uv.x*uv.x + uv.y*uv.y);
        float alpha = .7;
        float blurStart = 0.3;

        // without blurry edges
        if(dFromCenter > 0.5){
          discard;
        }else {
          vec4 tex = vec4(color, alpha);
          gl_FragColor = tex;
        }

        // with blurry edges
        // if(dFromCenter > 0.5){
        //   discard;
        // }else if(dFromCenter > blurStart) {
        //   alpha = alpha - (dFromCenter - blurStart) / (0.5-blurStart);
        //   vec4 tex = vec4(1.0, 0.0, 0.0, alpha);
        //   gl_FragColor = tex;
        // } else {
        //   vec4 tex = vec4(1.0, 0.0, 0.0, alpha);
        //   gl_FragColor = tex;
        // }
      }`
    };

    let uniforms = {
      size: { value: pointSize},
      color: { type: "c", value: new Color(color) },
    };

    // material
    var material = new ShaderMaterial( {
      uniforms:       uniforms,
      vertexShader:   shader.vertex,
      fragmentShader: shader.fragment,
      transparent:    true,
      blending: AdditiveBlending,
      //depthTest: false, // default: true
    });

    return material
  }


}

export default MeshCollection;
//# sourceMappingURL=meshcollection.js.map
