import * as THREE from 'three'
import axios from 'axios/dist/axios.js'

// import RawPointsParserWorker from 'worker#./workers/RawPointsParser.worker.js'

const POINT_FORMAT_LOOKUP = {
  raw: "parseRaw"
}

class PointCloudParser {

  static parseRawFromUrl(url, cbDone, cbProgress){
    axios.get( url,
    {
      responseType: 'arraybuffer',
      onDownloadProgress: function (progressEvent) {
        cbProgress({
          step: "download",
          progress: progressEvent.loaded / progressEvent.total
        })
      }
    })
    .then(function(response) {
      let geometry = new THREE.BufferGeometry()
      geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( new Float32Array(response.data), 3 ) )

      cbDone({
        error: null,
        geometry: geometry
      })
    })
    .catch( e => {
      cbDone({
        error: e,
        geometry: null
      })
    })


  }



  static parseFromUrl(url, format, cbDone, cbProgress){
    PointCloudParser[POINT_FORMAT_LOOKUP[format] + 'FromUrl'](url, cbDone, cbProgress)
  }

}


export default PointCloudParser
