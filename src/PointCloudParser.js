import * as THREE from 'three'
// import RawPointsParserWorker from 'worker#./workers/RawPointsParser.worker.js'

const POINT_FORMAT_LOOKUP = {
  raw: "parseRaw"
}

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
        console.time('points')
        let geometry = new THREE.BufferGeometry()
        geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( new Float32Array(pointBuffer), 3 ) )
        console.timeEnd('points')

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
