import * as THREE from 'three'
import ObjParserWorker from 'worker#./workers/ObjParser.worker.js'

const MESH_FORMAT_LOOKUP = {
  obj: "parseObj"
}

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

        let worker = new ObjParserWorker()
        worker.addEventListener('message', function (e) {
          let messageData = e.data
          let status = messageData.status

          if(status === 'progress'){
            cbProgress(messageData)
          } else if(status === 'done'){
            let geometry = new THREE.BufferGeometry()
            geometry.setIndex( new THREE.BufferAttribute( messageData.indices, 1 ) )
            geometry.addAttribute( 'position', new THREE.BufferAttribute( messageData.positions, messageData.verticesPerPolygon ) )
            geometry.computeBoundingSphere()
            geometry.computeVertexNormals()
            cbDone({
              error: null,
              geometry: geometry
            })
          }

        })
        worker.postMessage(objString)

      })
      .catch( e => {
        cbDone({
          error: e,
          geometry: null
        })
      })


  }



  static parseFromUrl(url, format, cbDone, cbProgress){
    MeshParser[MESH_FORMAT_LOOKUP[format] + 'FromUrl'](url, cbDone, cbProgress)
  }

}


export default MeshParser
