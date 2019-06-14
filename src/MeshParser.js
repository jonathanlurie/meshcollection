import * as THREE from 'three'
import ObjParserWorker from 'worker#./workers/ObjParser.worker.js'
import axios from 'axios/dist/axios.js'

const MESH_FORMAT_LOOKUP = {
  obj: "parseObj"
}

class MeshParser {

  static parseObjFromUrl(url, cbDone, cbProgress){
    // fetch(url)
    axios.get(url,{
      responseType: 'text',
      onDownloadProgress: function (progressEvent) {
        cbProgress({
          step: "download",
          progress: progressEvent.loaded / progressEvent.total
        })
      },

    })
    .then(function(response) {
      let objString = response.data
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
