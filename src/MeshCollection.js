import * as THREE from 'three'
import EventManager from '@jonathanlurie/eventmanager'
import MeshParser from './MeshParser'
import PointCloudParser from './PointCloudParser'

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
 *
 * - 'onMeshLoadWarning': when mesh is asked to be loaded but it's already being processed or in the loaded.
 *    Note that this is based on the ID, not the URL
 *    @param {string} message - the explanation
 *    @param {string} id - ID of the mesh being loaded
 *
 */
class MeshCollection extends EventManager {

  constructor(threeContext=null){
    super()
    this._threeContext = threeContext

    this._container = new THREE.Object3D()
    this._container.name = 'meshContainer'
    this._threeContext.getScene().add(this._container)
    this._collection = {}

    // keeps track of all the meshes that are in the process of being loaded/parsed.
    // This is to prevent reloading of multiple time the same mesh
    this._inProcess = {}

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
    // let axesHelper = new THREE.AxesHelper(10000)
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
    `.trim()

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
    `.trim()

    let fresnelMaterial = new THREE.ShaderMaterial({
        uniforms: {
          c:   { type: "f", value: 1.0 },
          alpha:   { type: "f", value: 1.0 },
          p:   { type: "f", value: 1.4 },
          glowColor: { type: "c", value: new THREE.Color(color) },
          viewVector: { type: "v3", value: this._threeContext.getCamera().position } // TODO: this should be removed after test
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true,

        // depthTest: false,
        depthWrite: false,
      })

      let that = this

      // TODO: this should also be removed after test
      this._threeContext.on('beforeRender', function(){
        fresnelMaterial.uniforms.viewVector.value = that._threeContext.getCamera().position
      })

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
    let that = this
    let id = 'id' in options ? options.id : Math.random().toString().split('.')[1]

    if(id in this._inProcess){
      return this.emit('onMeshLoadWarning', ['The mesh is already being processed.', id])
    }

    if(id in this._collection){
      return this.emit('onMeshLoadWarning', ['The mesh is already loaded.', id])
    }

    let makeVisible = 'makeVisible' in options ? options.makeVisible : true
    let color = 'color' in options ? options.color : '#FFFFFF'
    let material = 'material' in options ? options.material : this._generateFresnelMateral(color)
    let format = 'format' in options ? options.format : 'obj'
    let focusOn = 'focusOn' in options ? options.focusOn : false

    // for the mesh not to be loaded more than once during the processing
    this._inProcess[id] = true

    MeshParser.parseFromUrl(url, format,
      // cbDone,
      function(info){
        if(info.error){
          return that.emit('onMeshLoadError', [info.error, id])
        }

        let geometry = info.geometry
        let mesh = new THREE.Mesh(geometry, material)

        mesh.name = id
        mesh.visible = makeVisible
        that._collection[id] = mesh
        that._container.add(mesh)
        delete that._inProcess[id]

        if(focusOn){
          let lookatPos = geometry.boundingSphere.center
          that._threeContext.getCamera().position.set(lookatPos.x + geometry.boundingSphere.radius * 4, lookatPos.y, lookatPos.z)
          that._threeContext.lookAt(geometry.boundingSphere.center)
        }

        // DEBUG
        // let axesHelper = new THREE.AxesHelper(100)
        // // axesHelper.position.set(geometry.boundingSphere.center.x, geometry.boundingSphere.center.y, geometry.boundingSphere.center.z)
        // that._threeContext.getScene().add(axesHelper)

        that.emit('onMeshLoaded', [mesh, id])
      },

      // cbProgress
      function(info){
        that.emit('onMeshLoadingProgress', [id, info.step, info.progress])
      })
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
      this._collection[id].visible = true
    }
  }


  /**
   * Hide the mesh that has such id
   */
  hide(id){
    if(id in this._collection){
      this._collection[id].visible = false
    }
  }


  /**
   * NOT WORKING FOR NOW
   */
  detach(id){
    if(id in this._collection){
      // this._container
      let mesh = this._collection[id]
      this._container.remove(mesh)
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
   * @param {string} options.blending - blending methods for points among: 'NoBlending', 'NormalBlending', 'AdditiveBlending', 'SubtractiveBlending', 'MultiplyBlending'  (default: 'NoBlending')
   * @param {Number} options.alpha - transparency in [0, 1], 0 is entirely transparent and 1 is entirely opaque (default: 0.7)
   */
  loadPointCloudFromUrl(url, options = {}){
    let that = this
    let id = 'id' in options ? options.id : Math.random().toString().split('.')[1]

    if(id in this._inProcess){
      return this.emit('onMeshLoadWarning', ['The mesh is already being processed.', id])
    }

    if(id in this._collection){
      return this.emit('onMeshLoadWarning', ['The mesh is already loaded.', id])
    }

    let makeVisible = 'makeVisible' in options ? options.makeVisible : true
    let color = 'color' in options ? options.color : '#FFFFFF'
    let format = 'format' in options ? options.format : 'raw'
    let focusOn = 'focusOn' in options ? options.focusOn : false
    let size = 'size' in options ? options.size : 100

    // for the mesh not to be loaded more than once during the processing
    this._inProcess[id] = true

    PointCloudParser.parseFromUrl(url, format,
      // cbDone,
      function(info){
        if(info.error){
          return that.emit('onMeshLoadError', [info.error, id])
        }

        let material = that._generatePointCloudMaterial(color, size, options)
        let geometry = info.geometry
        let particles = new THREE.Points( geometry, material )

        particles.name = id
        particles.visible = makeVisible
        that._collection[id] = particles
        that._container.add(particles)
        delete that._inProcess[id]
        // that._threeContext.getScene().add(particles)

        geometry.computeBoundingSphere()

        if(focusOn){
          let lookatPos = geometry.boundingSphere.center
          that._threeContext.getCamera().position.set(lookatPos.x + geometry.boundingSphere.radius * 4, lookatPos.y, lookatPos.z)
          that._threeContext.lookAt(geometry.boundingSphere.center)
        }

        // DEBUG
        // let axesHelper = new THREE.AxesHelper(100)
        // // axesHelper.position.set(geometry.boundingSphere.center.x, geometry.boundingSphere.center.y, geometry.boundingSphere.center.z)
        // that._threeContext.getScene().add(axesHelper)

        that.emit('onMeshLoaded', [particles, id])
      },

      // cbProgress
      function(info){
        that.emit('onMeshLoadingProgress', [id, info.step, info.progress])
      })
  }





  /**
   *
   * TEST
   */
  addPointCloud(nbPoints=1000, color){
    // https://github.com/mrdoob/three.js/blob/master/examples/webgl_points_sprites.html

    let axesHelper = new THREE.AxesHelper(100)
    // axesHelper.position.set(geometry.boundingSphere.center.x, geometry.boundingSphere.center.y, geometry.boundingSphere.center.z)
    this._threeContext.getScene().add(axesHelper)

    let geometry = new THREE.BufferGeometry();
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
      vertices.push( x, y, z )
    }

    geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) )


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
        // float alpha = .7;
        float alpha = 1.;
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
    }

    let uniforms = {
      size: { value: 100.},
      color: { type: "c", value: new THREE.Color(color) },
    }

    // material
    var material = new THREE.ShaderMaterial( {
      uniforms:       uniforms,
      vertexShader:   shader.vertex,
      fragmentShader: shader.fragment,
      // transparent:    true,
      // blending: THREE.AdditiveBlending,
      //depthTest: false,
    });

    let particles = new THREE.Points( geometry, material )

    this._collection['someparticle'] = particles
    this._container.add(particles)
  }


  _generatePointCloudMaterial(color='#FFFFFF', pointSize=100, options={}){
    let blending = 'blending' in options ? options.blending : 'NoBlending'
    let alpha = 'alpha' in options ? options.alpha : 0.7
    let alphaStr = alpha.toString()
    // for make sure we privide a float to the shader
    if(!~alphaStr.indexOf('.')){
      alphaStr += '.0'
    }

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
        float alpha = ${alphaStr};
        // float blurStart = 0.3;

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
    }

    let uniforms = {
      size: { value: pointSize},
      color: { type: "c", value: new THREE.Color(color) },
    }

    // material
    var material = new THREE.ShaderMaterial( {
      uniforms:       uniforms,
      vertexShader:   shader.vertex,
      fragmentShader: shader.fragment,
      transparent:    alpha < 0.99,
      blending: THREE[blending],// THREE.NoBlending ,//AdditiveBlending,
      //depthTest: false, // default: true
    })

    return material
  }


}

export default MeshCollection
