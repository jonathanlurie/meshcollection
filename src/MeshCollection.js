import * as THREE from 'three'
import EventManager from '@jonathanlurie/eventmanager'
import MeshParser from './MeshParser'

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
    super()
    this._threeContext = threeContext

    this._container = new THREE.Object3D()
    this._container.name = 'meshContainer'
    this._threeContext.getScene().add(this._container)
    this._collection = {}

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
    let makeVisible = 'makeVisible' in options ? options.makeVisible : true
    let color = 'color' in options ? options.color : '#FFFFFF'
    let material = 'material' in options ? options.material : this._generateFresnelMateral(color)
    let format = 'format' in options ? options.format : 'obj'
    let focusOn = 'focusOn' in options ? options.focusOn : false

    MeshParser.parseFromUrl(url, format,
      // cbDone,
      function(info){
        if(info.error){
          return that.emit('onMeshLoadError', [info.error, id])
        }

        let geometry = info.geometry
        let mesh = new THREE.Mesh(geometry, material)

        // let geometry = new THREE.SphereBufferGeometry( 10, 32, 32 );
        // let material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
        // let mesh = new THREE.Mesh( geometry, material );

        mesh.name = id
        mesh.visible = makeVisible
        that._collection[id] = mesh
        that._container.add(mesh)
        // that._threeContext.getScene().add(mesh)

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
   *
   * TEST
   */
  addPointCloud(){
    // https://github.com/mrdoob/three.js/blob/master/examples/webgl_points_sprites.html

    let axesHelper = new THREE.AxesHelper(100)
    // axesHelper.position.set(geometry.boundingSphere.center.x, geometry.boundingSphere.center.y, geometry.boundingSphere.center.z)
    this._threeContext.getScene().add(axesHelper)

    let geometry = new THREE.BufferGeometry();
    let vertices = [];
    // let textureLoader = new THREE.TextureLoader();

    for ( let i = 0; i < 100; i ++ ) {
      let x = Math.random() * 20 - 10;
      let y = Math.random() * 20 - 10;
      let z = Math.random() * 20 - 10;
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

      void main() {
        vec2 uv = vec2( gl_PointCoord.x -0.5, 1.0 - gl_PointCoord.y-0.5 );
        float dFromCenter = sqrt(uv.x*uv.x + uv.y*uv.y);
        float alpha = 1.0;
        float blurStart = 0.3;

        if(dFromCenter > 0.5){
          discard;
        }else if(dFromCenter > blurStart) {
          alpha = 1.0 - (dFromCenter - blurStart) / (0.5-blurStart);
          vec4 tex = vec4(1.0, 0.0, 0.0, alpha);
          gl_FragColor = tex;
        } else {
          vec4 tex = vec4(1.0, 0.0, 0.0, 1.0);
          gl_FragColor = tex;
        }
      }`
    }

    let uniforms = {
      size: { value: 10.},
    }

    // material
    var material = new THREE.ShaderMaterial( {
      uniforms:       uniforms,
      vertexShader:   shader.vertex,
      fragmentShader: shader.fragment,
      transparent:    true,
      blending: THREE.AdditiveBlending,
    });

    let particles = new THREE.Points( geometry, material )

    this._collection['someparticle'] = particles
    this._container.add(particles)
  }




}

export default MeshCollection
