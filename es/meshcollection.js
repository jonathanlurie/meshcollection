import * as THREE from 'three';
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

var global$1 = (typeof global !== "undefined" ? global :
            typeof self !== "undefined" ? self :
            typeof window !== "undefined" ? window : {});

// shim for using process in browser
// based off https://github.com/defunctzombie/node-process/blob/master/browser.js

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
var cachedSetTimeout = defaultSetTimout;
var cachedClearTimeout = defaultClearTimeout;
if (typeof global$1.setTimeout === 'function') {
    cachedSetTimeout = setTimeout;
}
if (typeof global$1.clearTimeout === 'function') {
    cachedClearTimeout = clearTimeout;
}

function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}
function nextTick$1(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
}
// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
var title = 'browser';
var platform = 'browser';
var browser = true;
var env = {};
var argv = [];
var version = ''; // empty string to avoid regexp issues
var versions = {};
var release = {};
var config = {};

function noop() {}

var on = noop;
var addListener = noop;
var once = noop;
var off = noop;
var removeListener = noop;
var removeAllListeners = noop;
var emit = noop;

function binding(name) {
    throw new Error('process.binding is not supported');
}

function cwd () { return '/' }
function chdir (dir) {
    throw new Error('process.chdir is not supported');
}function umask() { return 0; }

// from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
var performance = global$1.performance || {};
var performanceNow =
  performance.now        ||
  performance.mozNow     ||
  performance.msNow      ||
  performance.oNow       ||
  performance.webkitNow  ||
  function(){ return (new Date()).getTime() };

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
function hrtime(previousTimestamp){
  var clocktime = performanceNow.call(performance)*1e-3;
  var seconds = Math.floor(clocktime);
  var nanoseconds = Math.floor((clocktime%1)*1e9);
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0];
    nanoseconds = nanoseconds - previousTimestamp[1];
    if (nanoseconds<0) {
      seconds--;
      nanoseconds += 1e9;
    }
  }
  return [seconds,nanoseconds]
}

var startTime = new Date();
function uptime() {
  var currentTime = new Date();
  var dif = currentTime - startTime;
  return dif / 1000;
}

var process = {
  nextTick: nextTick$1,
  title: title,
  browser: browser,
  env: env,
  argv: argv,
  version: version,
  versions: versions,
  on: on,
  addListener: addListener,
  once: once,
  off: off,
  removeListener: removeListener,
  removeAllListeners: removeAllListeners,
  emit: emit,
  binding: binding,
  cwd: cwd,
  chdir: chdir,
  umask: umask,
  hrtime: hrtime,
  platform: platform,
  release: release,
  config: config,
  uptime: uptime
};

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var axios = createCommonjsModule(function (module, exports) {
/* axios v0.19.0 | (c) 2019 by Matt Zabriskie */
(function webpackUniversalModuleDefinition(root, factory) {
	module.exports = factory();
})(commonjsGlobal, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	var bind = __webpack_require__(3);
	var Axios = __webpack_require__(5);
	var mergeConfig = __webpack_require__(22);
	var defaults = __webpack_require__(11);
	
	/**
	 * Create an instance of Axios
	 *
	 * @param {Object} defaultConfig The default config for the instance
	 * @return {Axios} A new instance of Axios
	 */
	function createInstance(defaultConfig) {
	  var context = new Axios(defaultConfig);
	  var instance = bind(Axios.prototype.request, context);
	
	  // Copy axios.prototype to instance
	  utils.extend(instance, Axios.prototype, context);
	
	  // Copy context to instance
	  utils.extend(instance, context);
	
	  return instance;
	}
	
	// Create the default instance to be exported
	var axios = createInstance(defaults);
	
	// Expose Axios class to allow class inheritance
	axios.Axios = Axios;
	
	// Factory for creating new instances
	axios.create = function create(instanceConfig) {
	  return createInstance(mergeConfig(axios.defaults, instanceConfig));
	};
	
	// Expose Cancel & CancelToken
	axios.Cancel = __webpack_require__(23);
	axios.CancelToken = __webpack_require__(24);
	axios.isCancel = __webpack_require__(10);
	
	// Expose all/spread
	axios.all = function all(promises) {
	  return Promise.all(promises);
	};
	axios.spread = __webpack_require__(25);
	
	module.exports = axios;
	
	// Allow use of default import syntax in TypeScript
	module.exports.default = axios;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {
	
	var bind = __webpack_require__(3);
	var isBuffer = __webpack_require__(4);
	
	/*global toString:true*/
	
	// utils is a library of generic helper functions non-specific to axios
	
	var toString = Object.prototype.toString;
	
	/**
	 * Determine if a value is an Array
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is an Array, otherwise false
	 */
	function isArray(val) {
	  return toString.call(val) === '[object Array]';
	}
	
	/**
	 * Determine if a value is an ArrayBuffer
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
	 */
	function isArrayBuffer(val) {
	  return toString.call(val) === '[object ArrayBuffer]';
	}
	
	/**
	 * Determine if a value is a FormData
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is an FormData, otherwise false
	 */
	function isFormData(val) {
	  return (typeof FormData !== 'undefined') && (val instanceof FormData);
	}
	
	/**
	 * Determine if a value is a view on an ArrayBuffer
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
	 */
	function isArrayBufferView(val) {
	  var result;
	  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
	    result = ArrayBuffer.isView(val);
	  } else {
	    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
	  }
	  return result;
	}
	
	/**
	 * Determine if a value is a String
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is a String, otherwise false
	 */
	function isString(val) {
	  return typeof val === 'string';
	}
	
	/**
	 * Determine if a value is a Number
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is a Number, otherwise false
	 */
	function isNumber(val) {
	  return typeof val === 'number';
	}
	
	/**
	 * Determine if a value is undefined
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if the value is undefined, otherwise false
	 */
	function isUndefined(val) {
	  return typeof val === 'undefined';
	}
	
	/**
	 * Determine if a value is an Object
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is an Object, otherwise false
	 */
	function isObject(val) {
	  return val !== null && typeof val === 'object';
	}
	
	/**
	 * Determine if a value is a Date
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is a Date, otherwise false
	 */
	function isDate(val) {
	  return toString.call(val) === '[object Date]';
	}
	
	/**
	 * Determine if a value is a File
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is a File, otherwise false
	 */
	function isFile(val) {
	  return toString.call(val) === '[object File]';
	}
	
	/**
	 * Determine if a value is a Blob
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is a Blob, otherwise false
	 */
	function isBlob(val) {
	  return toString.call(val) === '[object Blob]';
	}
	
	/**
	 * Determine if a value is a Function
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is a Function, otherwise false
	 */
	function isFunction(val) {
	  return toString.call(val) === '[object Function]';
	}
	
	/**
	 * Determine if a value is a Stream
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is a Stream, otherwise false
	 */
	function isStream(val) {
	  return isObject(val) && isFunction(val.pipe);
	}
	
	/**
	 * Determine if a value is a URLSearchParams object
	 *
	 * @param {Object} val The value to test
	 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
	 */
	function isURLSearchParams(val) {
	  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
	}
	
	/**
	 * Trim excess whitespace off the beginning and end of a string
	 *
	 * @param {String} str The String to trim
	 * @returns {String} The String freed of excess whitespace
	 */
	function trim(str) {
	  return str.replace(/^\s*/, '').replace(/\s*$/, '');
	}
	
	/**
	 * Determine if we're running in a standard browser environment
	 *
	 * This allows axios to run in a web worker, and react-native.
	 * Both environments support XMLHttpRequest, but not fully standard globals.
	 *
	 * web workers:
	 *  typeof window -> undefined
	 *  typeof document -> undefined
	 *
	 * react-native:
	 *  navigator.product -> 'ReactNative'
	 * nativescript
	 *  navigator.product -> 'NativeScript' or 'NS'
	 */
	function isStandardBrowserEnv() {
	  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
	                                           navigator.product === 'NativeScript' ||
	                                           navigator.product === 'NS')) {
	    return false;
	  }
	  return (
	    typeof window !== 'undefined' &&
	    typeof document !== 'undefined'
	  );
	}
	
	/**
	 * Iterate over an Array or an Object invoking a function for each item.
	 *
	 * If `obj` is an Array callback will be called passing
	 * the value, index, and complete array for each item.
	 *
	 * If 'obj' is an Object callback will be called passing
	 * the value, key, and complete object for each property.
	 *
	 * @param {Object|Array} obj The object to iterate
	 * @param {Function} fn The callback to invoke for each item
	 */
	function forEach(obj, fn) {
	  // Don't bother if no value provided
	  if (obj === null || typeof obj === 'undefined') {
	    return;
	  }
	
	  // Force an array if not already something iterable
	  if (typeof obj !== 'object') {
	    /*eslint no-param-reassign:0*/
	    obj = [obj];
	  }
	
	  if (isArray(obj)) {
	    // Iterate over array values
	    for (var i = 0, l = obj.length; i < l; i++) {
	      fn.call(null, obj[i], i, obj);
	    }
	  } else {
	    // Iterate over object keys
	    for (var key in obj) {
	      if (Object.prototype.hasOwnProperty.call(obj, key)) {
	        fn.call(null, obj[key], key, obj);
	      }
	    }
	  }
	}
	
	/**
	 * Accepts varargs expecting each argument to be an object, then
	 * immutably merges the properties of each object and returns result.
	 *
	 * When multiple objects contain the same key the later object in
	 * the arguments list will take precedence.
	 *
	 * Example:
	 *
	 * ```js
	 * var result = merge({foo: 123}, {foo: 456});
	 * console.log(result.foo); // outputs 456
	 * ```
	 *
	 * @param {Object} obj1 Object to merge
	 * @returns {Object} Result of all merge properties
	 */
	function merge(/* obj1, obj2, obj3, ... */) {
	  var result = {};
	  function assignValue(val, key) {
	    if (typeof result[key] === 'object' && typeof val === 'object') {
	      result[key] = merge(result[key], val);
	    } else {
	      result[key] = val;
	    }
	  }
	
	  for (var i = 0, l = arguments.length; i < l; i++) {
	    forEach(arguments[i], assignValue);
	  }
	  return result;
	}
	
	/**
	 * Function equal to merge with the difference being that no reference
	 * to original objects is kept.
	 *
	 * @see merge
	 * @param {Object} obj1 Object to merge
	 * @returns {Object} Result of all merge properties
	 */
	function deepMerge(/* obj1, obj2, obj3, ... */) {
	  var result = {};
	  function assignValue(val, key) {
	    if (typeof result[key] === 'object' && typeof val === 'object') {
	      result[key] = deepMerge(result[key], val);
	    } else if (typeof val === 'object') {
	      result[key] = deepMerge({}, val);
	    } else {
	      result[key] = val;
	    }
	  }
	
	  for (var i = 0, l = arguments.length; i < l; i++) {
	    forEach(arguments[i], assignValue);
	  }
	  return result;
	}
	
	/**
	 * Extends object a by mutably adding to it the properties of object b.
	 *
	 * @param {Object} a The object to be extended
	 * @param {Object} b The object to copy properties from
	 * @param {Object} thisArg The object to bind function to
	 * @return {Object} The resulting value of object a
	 */
	function extend(a, b, thisArg) {
	  forEach(b, function assignValue(val, key) {
	    if (thisArg && typeof val === 'function') {
	      a[key] = bind(val, thisArg);
	    } else {
	      a[key] = val;
	    }
	  });
	  return a;
	}
	
	module.exports = {
	  isArray: isArray,
	  isArrayBuffer: isArrayBuffer,
	  isBuffer: isBuffer,
	  isFormData: isFormData,
	  isArrayBufferView: isArrayBufferView,
	  isString: isString,
	  isNumber: isNumber,
	  isObject: isObject,
	  isUndefined: isUndefined,
	  isDate: isDate,
	  isFile: isFile,
	  isBlob: isBlob,
	  isFunction: isFunction,
	  isStream: isStream,
	  isURLSearchParams: isURLSearchParams,
	  isStandardBrowserEnv: isStandardBrowserEnv,
	  forEach: forEach,
	  merge: merge,
	  deepMerge: deepMerge,
	  extend: extend,
	  trim: trim
	};


/***/ }),
/* 3 */
/***/ (function(module, exports) {
	
	module.exports = function bind(fn, thisArg) {
	  return function wrap() {
	    var args = new Array(arguments.length);
	    for (var i = 0; i < args.length; i++) {
	      args[i] = arguments[i];
	    }
	    return fn.apply(thisArg, args);
	  };
	};


/***/ }),
/* 4 */
/***/ (function(module, exports) {

	/*!
	 * Determine if an object is a Buffer
	 *
	 * @author   Feross Aboukhadijeh <https://feross.org>
	 * @license  MIT
	 */
	
	module.exports = function isBuffer (obj) {
	  return obj != null && obj.constructor != null &&
	    typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
	};


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	var buildURL = __webpack_require__(6);
	var InterceptorManager = __webpack_require__(7);
	var dispatchRequest = __webpack_require__(8);
	var mergeConfig = __webpack_require__(22);
	
	/**
	 * Create a new instance of Axios
	 *
	 * @param {Object} instanceConfig The default config for the instance
	 */
	function Axios(instanceConfig) {
	  this.defaults = instanceConfig;
	  this.interceptors = {
	    request: new InterceptorManager(),
	    response: new InterceptorManager()
	  };
	}
	
	/**
	 * Dispatch a request
	 *
	 * @param {Object} config The config specific for this request (merged with this.defaults)
	 */
	Axios.prototype.request = function request(config) {
	  /*eslint no-param-reassign:0*/
	  // Allow for axios('example/url'[, config]) a la fetch API
	  if (typeof config === 'string') {
	    config = arguments[1] || {};
	    config.url = arguments[0];
	  } else {
	    config = config || {};
	  }
	
	  config = mergeConfig(this.defaults, config);
	  config.method = config.method ? config.method.toLowerCase() : 'get';
	
	  // Hook up interceptors middleware
	  var chain = [dispatchRequest, undefined];
	  var promise = Promise.resolve(config);
	
	  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
	    chain.unshift(interceptor.fulfilled, interceptor.rejected);
	  });
	
	  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
	    chain.push(interceptor.fulfilled, interceptor.rejected);
	  });
	
	  while (chain.length) {
	    promise = promise.then(chain.shift(), chain.shift());
	  }
	
	  return promise;
	};
	
	Axios.prototype.getUri = function getUri(config) {
	  config = mergeConfig(this.defaults, config);
	  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
	};
	
	// Provide aliases for supported request methods
	utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
	  /*eslint func-names:0*/
	  Axios.prototype[method] = function(url, config) {
	    return this.request(utils.merge(config || {}, {
	      method: method,
	      url: url
	    }));
	  };
	});
	
	utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
	  /*eslint func-names:0*/
	  Axios.prototype[method] = function(url, data, config) {
	    return this.request(utils.merge(config || {}, {
	      method: method,
	      url: url,
	      data: data
	    }));
	  };
	});
	
	module.exports = Axios;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	
	function encode(val) {
	  return encodeURIComponent(val).
	    replace(/%40/gi, '@').
	    replace(/%3A/gi, ':').
	    replace(/%24/g, '$').
	    replace(/%2C/gi, ',').
	    replace(/%20/g, '+').
	    replace(/%5B/gi, '[').
	    replace(/%5D/gi, ']');
	}
	
	/**
	 * Build a URL by appending params to the end
	 *
	 * @param {string} url The base of the url (e.g., http://www.google.com)
	 * @param {object} [params] The params to be appended
	 * @returns {string} The formatted url
	 */
	module.exports = function buildURL(url, params, paramsSerializer) {
	  /*eslint no-param-reassign:0*/
	  if (!params) {
	    return url;
	  }
	
	  var serializedParams;
	  if (paramsSerializer) {
	    serializedParams = paramsSerializer(params);
	  } else if (utils.isURLSearchParams(params)) {
	    serializedParams = params.toString();
	  } else {
	    var parts = [];
	
	    utils.forEach(params, function serialize(val, key) {
	      if (val === null || typeof val === 'undefined') {
	        return;
	      }
	
	      if (utils.isArray(val)) {
	        key = key + '[]';
	      } else {
	        val = [val];
	      }
	
	      utils.forEach(val, function parseValue(v) {
	        if (utils.isDate(v)) {
	          v = v.toISOString();
	        } else if (utils.isObject(v)) {
	          v = JSON.stringify(v);
	        }
	        parts.push(encode(key) + '=' + encode(v));
	      });
	    });
	
	    serializedParams = parts.join('&');
	  }
	
	  if (serializedParams) {
	    var hashmarkIndex = url.indexOf('#');
	    if (hashmarkIndex !== -1) {
	      url = url.slice(0, hashmarkIndex);
	    }
	
	    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
	  }
	
	  return url;
	};


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	
	function InterceptorManager() {
	  this.handlers = [];
	}
	
	/**
	 * Add a new interceptor to the stack
	 *
	 * @param {Function} fulfilled The function to handle `then` for a `Promise`
	 * @param {Function} rejected The function to handle `reject` for a `Promise`
	 *
	 * @return {Number} An ID used to remove interceptor later
	 */
	InterceptorManager.prototype.use = function use(fulfilled, rejected) {
	  this.handlers.push({
	    fulfilled: fulfilled,
	    rejected: rejected
	  });
	  return this.handlers.length - 1;
	};
	
	/**
	 * Remove an interceptor from the stack
	 *
	 * @param {Number} id The ID that was returned by `use`
	 */
	InterceptorManager.prototype.eject = function eject(id) {
	  if (this.handlers[id]) {
	    this.handlers[id] = null;
	  }
	};
	
	/**
	 * Iterate over all the registered interceptors
	 *
	 * This method is particularly useful for skipping over any
	 * interceptors that may have become `null` calling `eject`.
	 *
	 * @param {Function} fn The function to call for each interceptor
	 */
	InterceptorManager.prototype.forEach = function forEach(fn) {
	  utils.forEach(this.handlers, function forEachHandler(h) {
	    if (h !== null) {
	      fn(h);
	    }
	  });
	};
	
	module.exports = InterceptorManager;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	var transformData = __webpack_require__(9);
	var isCancel = __webpack_require__(10);
	var defaults = __webpack_require__(11);
	var isAbsoluteURL = __webpack_require__(20);
	var combineURLs = __webpack_require__(21);
	
	/**
	 * Throws a `Cancel` if cancellation has been requested.
	 */
	function throwIfCancellationRequested(config) {
	  if (config.cancelToken) {
	    config.cancelToken.throwIfRequested();
	  }
	}
	
	/**
	 * Dispatch a request to the server using the configured adapter.
	 *
	 * @param {object} config The config that is to be used for the request
	 * @returns {Promise} The Promise to be fulfilled
	 */
	module.exports = function dispatchRequest(config) {
	  throwIfCancellationRequested(config);
	
	  // Support baseURL config
	  if (config.baseURL && !isAbsoluteURL(config.url)) {
	    config.url = combineURLs(config.baseURL, config.url);
	  }
	
	  // Ensure headers exist
	  config.headers = config.headers || {};
	
	  // Transform request data
	  config.data = transformData(
	    config.data,
	    config.headers,
	    config.transformRequest
	  );
	
	  // Flatten headers
	  config.headers = utils.merge(
	    config.headers.common || {},
	    config.headers[config.method] || {},
	    config.headers || {}
	  );
	
	  utils.forEach(
	    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
	    function cleanHeaderConfig(method) {
	      delete config.headers[method];
	    }
	  );
	
	  var adapter = config.adapter || defaults.adapter;
	
	  return adapter(config).then(function onAdapterResolution(response) {
	    throwIfCancellationRequested(config);
	
	    // Transform response data
	    response.data = transformData(
	      response.data,
	      response.headers,
	      config.transformResponse
	    );
	
	    return response;
	  }, function onAdapterRejection(reason) {
	    if (!isCancel(reason)) {
	      throwIfCancellationRequested(config);
	
	      // Transform response data
	      if (reason && reason.response) {
	        reason.response.data = transformData(
	          reason.response.data,
	          reason.response.headers,
	          config.transformResponse
	        );
	      }
	    }
	
	    return Promise.reject(reason);
	  });
	};


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	
	/**
	 * Transform the data for a request or a response
	 *
	 * @param {Object|String} data The data to be transformed
	 * @param {Array} headers The headers for the request or response
	 * @param {Array|Function} fns A single function or Array of functions
	 * @returns {*} The resulting transformed data
	 */
	module.exports = function transformData(data, headers, fns) {
	  /*eslint no-param-reassign:0*/
	  utils.forEach(fns, function transform(fn) {
	    data = fn(data, headers);
	  });
	
	  return data;
	};


/***/ }),
/* 10 */
/***/ (function(module, exports) {
	
	module.exports = function isCancel(value) {
	  return !!(value && value.__CANCEL__);
	};


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	var normalizeHeaderName = __webpack_require__(12);
	
	var DEFAULT_CONTENT_TYPE = {
	  'Content-Type': 'application/x-www-form-urlencoded'
	};
	
	function setContentTypeIfUnset(headers, value) {
	  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
	    headers['Content-Type'] = value;
	  }
	}
	
	function getDefaultAdapter() {
	  var adapter;
	  // Only Node.JS has a process variable that is of [[Class]] process
	  if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
	    // For node use HTTP adapter
	    adapter = __webpack_require__(13);
	  } else if (typeof XMLHttpRequest !== 'undefined') {
	    // For browsers use XHR adapter
	    adapter = __webpack_require__(13);
	  }
	  return adapter;
	}
	
	var defaults = {
	  adapter: getDefaultAdapter(),
	
	  transformRequest: [function transformRequest(data, headers) {
	    normalizeHeaderName(headers, 'Accept');
	    normalizeHeaderName(headers, 'Content-Type');
	    if (utils.isFormData(data) ||
	      utils.isArrayBuffer(data) ||
	      utils.isBuffer(data) ||
	      utils.isStream(data) ||
	      utils.isFile(data) ||
	      utils.isBlob(data)
	    ) {
	      return data;
	    }
	    if (utils.isArrayBufferView(data)) {
	      return data.buffer;
	    }
	    if (utils.isURLSearchParams(data)) {
	      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
	      return data.toString();
	    }
	    if (utils.isObject(data)) {
	      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
	      return JSON.stringify(data);
	    }
	    return data;
	  }],
	
	  transformResponse: [function transformResponse(data) {
	    /*eslint no-param-reassign:0*/
	    if (typeof data === 'string') {
	      try {
	        data = JSON.parse(data);
	      } catch (e) { /* Ignore */ }
	    }
	    return data;
	  }],
	
	  /**
	   * A timeout in milliseconds to abort a request. If set to 0 (default) a
	   * timeout is not created.
	   */
	  timeout: 0,
	
	  xsrfCookieName: 'XSRF-TOKEN',
	  xsrfHeaderName: 'X-XSRF-TOKEN',
	
	  maxContentLength: -1,
	
	  validateStatus: function validateStatus(status) {
	    return status >= 200 && status < 300;
	  }
	};
	
	defaults.headers = {
	  common: {
	    'Accept': 'application/json, text/plain, */*'
	  }
	};
	
	utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
	  defaults.headers[method] = {};
	});
	
	utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
	  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
	});
	
	module.exports = defaults;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	
	module.exports = function normalizeHeaderName(headers, normalizedName) {
	  utils.forEach(headers, function processHeader(value, name) {
	    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
	      headers[normalizedName] = value;
	      delete headers[name];
	    }
	  });
	};


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	var settle = __webpack_require__(14);
	var buildURL = __webpack_require__(6);
	var parseHeaders = __webpack_require__(17);
	var isURLSameOrigin = __webpack_require__(18);
	var createError = __webpack_require__(15);
	
	module.exports = function xhrAdapter(config) {
	  return new Promise(function dispatchXhrRequest(resolve, reject) {
	    var requestData = config.data;
	    var requestHeaders = config.headers;
	
	    if (utils.isFormData(requestData)) {
	      delete requestHeaders['Content-Type']; // Let the browser set it
	    }
	
	    var request = new XMLHttpRequest();
	
	    // HTTP basic authentication
	    if (config.auth) {
	      var username = config.auth.username || '';
	      var password = config.auth.password || '';
	      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
	    }
	
	    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);
	
	    // Set the request timeout in MS
	    request.timeout = config.timeout;
	
	    // Listen for ready state
	    request.onreadystatechange = function handleLoad() {
	      if (!request || request.readyState !== 4) {
	        return;
	      }
	
	      // The request errored out and we didn't get a response, this will be
	      // handled by onerror instead
	      // With one exception: request that using file: protocol, most browsers
	      // will return status as 0 even though it's a successful request
	      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
	        return;
	      }
	
	      // Prepare the response
	      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
	      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
	      var response = {
	        data: responseData,
	        status: request.status,
	        statusText: request.statusText,
	        headers: responseHeaders,
	        config: config,
	        request: request
	      };
	
	      settle(resolve, reject, response);
	
	      // Clean up request
	      request = null;
	    };
	
	    // Handle browser request cancellation (as opposed to a manual cancellation)
	    request.onabort = function handleAbort() {
	      if (!request) {
	        return;
	      }
	
	      reject(createError('Request aborted', config, 'ECONNABORTED', request));
	
	      // Clean up request
	      request = null;
	    };
	
	    // Handle low level network errors
	    request.onerror = function handleError() {
	      // Real errors are hidden from us by the browser
	      // onerror should only fire if it's a network error
	      reject(createError('Network Error', config, null, request));
	
	      // Clean up request
	      request = null;
	    };
	
	    // Handle timeout
	    request.ontimeout = function handleTimeout() {
	      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
	        request));
	
	      // Clean up request
	      request = null;
	    };
	
	    // Add xsrf header
	    // This is only done if running in a standard browser environment.
	    // Specifically not if we're in a web worker, or react-native.
	    if (utils.isStandardBrowserEnv()) {
	      var cookies = __webpack_require__(19);
	
	      // Add xsrf header
	      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
	        cookies.read(config.xsrfCookieName) :
	        undefined;
	
	      if (xsrfValue) {
	        requestHeaders[config.xsrfHeaderName] = xsrfValue;
	      }
	    }
	
	    // Add headers to the request
	    if ('setRequestHeader' in request) {
	      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
	        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
	          // Remove Content-Type if data is undefined
	          delete requestHeaders[key];
	        } else {
	          // Otherwise add header to the request
	          request.setRequestHeader(key, val);
	        }
	      });
	    }
	
	    // Add withCredentials to request if needed
	    if (config.withCredentials) {
	      request.withCredentials = true;
	    }
	
	    // Add responseType to request if needed
	    if (config.responseType) {
	      try {
	        request.responseType = config.responseType;
	      } catch (e) {
	        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
	        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
	        if (config.responseType !== 'json') {
	          throw e;
	        }
	      }
	    }
	
	    // Handle progress if needed
	    if (typeof config.onDownloadProgress === 'function') {
	      request.addEventListener('progress', config.onDownloadProgress);
	    }
	
	    // Not all browsers support upload events
	    if (typeof config.onUploadProgress === 'function' && request.upload) {
	      request.upload.addEventListener('progress', config.onUploadProgress);
	    }
	
	    if (config.cancelToken) {
	      // Handle cancellation
	      config.cancelToken.promise.then(function onCanceled(cancel) {
	        if (!request) {
	          return;
	        }
	
	        request.abort();
	        reject(cancel);
	        // Clean up request
	        request = null;
	      });
	    }
	
	    if (requestData === undefined) {
	      requestData = null;
	    }
	
	    // Send the request
	    request.send(requestData);
	  });
	};


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {
	
	var createError = __webpack_require__(15);
	
	/**
	 * Resolve or reject a Promise based on response status.
	 *
	 * @param {Function} resolve A function that resolves the promise.
	 * @param {Function} reject A function that rejects the promise.
	 * @param {object} response The response.
	 */
	module.exports = function settle(resolve, reject, response) {
	  var validateStatus = response.config.validateStatus;
	  if (!validateStatus || validateStatus(response.status)) {
	    resolve(response);
	  } else {
	    reject(createError(
	      'Request failed with status code ' + response.status,
	      response.config,
	      null,
	      response.request,
	      response
	    ));
	  }
	};


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {
	
	var enhanceError = __webpack_require__(16);
	
	/**
	 * Create an Error with the specified message, config, error code, request and response.
	 *
	 * @param {string} message The error message.
	 * @param {Object} config The config.
	 * @param {string} [code] The error code (for example, 'ECONNABORTED').
	 * @param {Object} [request] The request.
	 * @param {Object} [response] The response.
	 * @returns {Error} The created error.
	 */
	module.exports = function createError(message, config, code, request, response) {
	  var error = new Error(message);
	  return enhanceError(error, config, code, request, response);
	};


/***/ }),
/* 16 */
/***/ (function(module, exports) {
	
	/**
	 * Update an Error with the specified config, error code, and response.
	 *
	 * @param {Error} error The error to update.
	 * @param {Object} config The config.
	 * @param {string} [code] The error code (for example, 'ECONNABORTED').
	 * @param {Object} [request] The request.
	 * @param {Object} [response] The response.
	 * @returns {Error} The error.
	 */
	module.exports = function enhanceError(error, config, code, request, response) {
	  error.config = config;
	  if (code) {
	    error.code = code;
	  }
	
	  error.request = request;
	  error.response = response;
	  error.isAxiosError = true;
	
	  error.toJSON = function() {
	    return {
	      // Standard
	      message: this.message,
	      name: this.name,
	      // Microsoft
	      description: this.description,
	      number: this.number,
	      // Mozilla
	      fileName: this.fileName,
	      lineNumber: this.lineNumber,
	      columnNumber: this.columnNumber,
	      stack: this.stack,
	      // Axios
	      config: this.config,
	      code: this.code
	    };
	  };
	  return error;
	};


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	
	// Headers whose duplicates are ignored by node
	// c.f. https://nodejs.org/api/http.html#http_message_headers
	var ignoreDuplicateOf = [
	  'age', 'authorization', 'content-length', 'content-type', 'etag',
	  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
	  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
	  'referer', 'retry-after', 'user-agent'
	];
	
	/**
	 * Parse headers into an object
	 *
	 * ```
	 * Date: Wed, 27 Aug 2014 08:58:49 GMT
	 * Content-Type: application/json
	 * Connection: keep-alive
	 * Transfer-Encoding: chunked
	 * ```
	 *
	 * @param {String} headers Headers needing to be parsed
	 * @returns {Object} Headers parsed into an object
	 */
	module.exports = function parseHeaders(headers) {
	  var parsed = {};
	  var key;
	  var val;
	  var i;
	
	  if (!headers) { return parsed; }
	
	  utils.forEach(headers.split('\n'), function parser(line) {
	    i = line.indexOf(':');
	    key = utils.trim(line.substr(0, i)).toLowerCase();
	    val = utils.trim(line.substr(i + 1));
	
	    if (key) {
	      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
	        return;
	      }
	      if (key === 'set-cookie') {
	        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
	      } else {
	        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
	      }
	    }
	  });
	
	  return parsed;
	};


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	
	module.exports = (
	  utils.isStandardBrowserEnv() ?
	
	  // Standard browser envs have full support of the APIs needed to test
	  // whether the request URL is of the same origin as current location.
	    (function standardBrowserEnv() {
	      var msie = /(msie|trident)/i.test(navigator.userAgent);
	      var urlParsingNode = document.createElement('a');
	      var originURL;
	
	      /**
	    * Parse a URL to discover it's components
	    *
	    * @param {String} url The URL to be parsed
	    * @returns {Object}
	    */
	      function resolveURL(url) {
	        var href = url;
	
	        if (msie) {
	        // IE needs attribute set twice to normalize properties
	          urlParsingNode.setAttribute('href', href);
	          href = urlParsingNode.href;
	        }
	
	        urlParsingNode.setAttribute('href', href);
	
	        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
	        return {
	          href: urlParsingNode.href,
	          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
	          host: urlParsingNode.host,
	          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
	          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
	          hostname: urlParsingNode.hostname,
	          port: urlParsingNode.port,
	          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
	            urlParsingNode.pathname :
	            '/' + urlParsingNode.pathname
	        };
	      }
	
	      originURL = resolveURL(window.location.href);
	
	      /**
	    * Determine if a URL shares the same origin as the current location
	    *
	    * @param {String} requestURL The URL to test
	    * @returns {boolean} True if URL shares the same origin, otherwise false
	    */
	      return function isURLSameOrigin(requestURL) {
	        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
	        return (parsed.protocol === originURL.protocol &&
	            parsed.host === originURL.host);
	      };
	    })() :
	
	  // Non standard browser envs (web workers, react-native) lack needed support.
	    (function nonStandardBrowserEnv() {
	      return function isURLSameOrigin() {
	        return true;
	      };
	    })()
	);


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	
	module.exports = (
	  utils.isStandardBrowserEnv() ?
	
	  // Standard browser envs support document.cookie
	    (function standardBrowserEnv() {
	      return {
	        write: function write(name, value, expires, path, domain, secure) {
	          var cookie = [];
	          cookie.push(name + '=' + encodeURIComponent(value));
	
	          if (utils.isNumber(expires)) {
	            cookie.push('expires=' + new Date(expires).toGMTString());
	          }
	
	          if (utils.isString(path)) {
	            cookie.push('path=' + path);
	          }
	
	          if (utils.isString(domain)) {
	            cookie.push('domain=' + domain);
	          }
	
	          if (secure === true) {
	            cookie.push('secure');
	          }
	
	          document.cookie = cookie.join('; ');
	        },
	
	        read: function read(name) {
	          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
	          return (match ? decodeURIComponent(match[3]) : null);
	        },
	
	        remove: function remove(name) {
	          this.write(name, '', Date.now() - 86400000);
	        }
	      };
	    })() :
	
	  // Non standard browser env (web workers, react-native) lack needed support.
	    (function nonStandardBrowserEnv() {
	      return {
	        write: function write() {},
	        read: function read() { return null; },
	        remove: function remove() {}
	      };
	    })()
	);


/***/ }),
/* 20 */
/***/ (function(module, exports) {
	
	/**
	 * Determines whether the specified URL is absolute
	 *
	 * @param {string} url The URL to test
	 * @returns {boolean} True if the specified URL is absolute, otherwise false
	 */
	module.exports = function isAbsoluteURL(url) {
	  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
	  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
	  // by any combination of letters, digits, plus, period, or hyphen.
	  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
	};


/***/ }),
/* 21 */
/***/ (function(module, exports) {
	
	/**
	 * Creates a new URL by combining the specified URLs
	 *
	 * @param {string} baseURL The base URL
	 * @param {string} relativeURL The relative URL
	 * @returns {string} The combined URL
	 */
	module.exports = function combineURLs(baseURL, relativeURL) {
	  return relativeURL
	    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
	    : baseURL;
	};


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {
	
	var utils = __webpack_require__(2);
	
	/**
	 * Config-specific merge-function which creates a new config-object
	 * by merging two configuration objects together.
	 *
	 * @param {Object} config1
	 * @param {Object} config2
	 * @returns {Object} New object resulting from merging config2 to config1
	 */
	module.exports = function mergeConfig(config1, config2) {
	  // eslint-disable-next-line no-param-reassign
	  config2 = config2 || {};
	  var config = {};
	
	  utils.forEach(['url', 'method', 'params', 'data'], function valueFromConfig2(prop) {
	    if (typeof config2[prop] !== 'undefined') {
	      config[prop] = config2[prop];
	    }
	  });
	
	  utils.forEach(['headers', 'auth', 'proxy'], function mergeDeepProperties(prop) {
	    if (utils.isObject(config2[prop])) {
	      config[prop] = utils.deepMerge(config1[prop], config2[prop]);
	    } else if (typeof config2[prop] !== 'undefined') {
	      config[prop] = config2[prop];
	    } else if (utils.isObject(config1[prop])) {
	      config[prop] = utils.deepMerge(config1[prop]);
	    } else if (typeof config1[prop] !== 'undefined') {
	      config[prop] = config1[prop];
	    }
	  });
	
	  utils.forEach([
	    'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
	    'timeout', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
	    'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'maxContentLength',
	    'validateStatus', 'maxRedirects', 'httpAgent', 'httpsAgent', 'cancelToken',
	    'socketPath'
	  ], function defaultToConfig2(prop) {
	    if (typeof config2[prop] !== 'undefined') {
	      config[prop] = config2[prop];
	    } else if (typeof config1[prop] !== 'undefined') {
	      config[prop] = config1[prop];
	    }
	  });
	
	  return config;
	};


/***/ }),
/* 23 */
/***/ (function(module, exports) {
	
	/**
	 * A `Cancel` is an object that is thrown when an operation is canceled.
	 *
	 * @class
	 * @param {string=} message The message.
	 */
	function Cancel(message) {
	  this.message = message;
	}
	
	Cancel.prototype.toString = function toString() {
	  return 'Cancel' + (this.message ? ': ' + this.message : '');
	};
	
	Cancel.prototype.__CANCEL__ = true;
	
	module.exports = Cancel;


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {
	
	var Cancel = __webpack_require__(23);
	
	/**
	 * A `CancelToken` is an object that can be used to request cancellation of an operation.
	 *
	 * @class
	 * @param {Function} executor The executor function.
	 */
	function CancelToken(executor) {
	  if (typeof executor !== 'function') {
	    throw new TypeError('executor must be a function.');
	  }
	
	  var resolvePromise;
	  this.promise = new Promise(function promiseExecutor(resolve) {
	    resolvePromise = resolve;
	  });
	
	  var token = this;
	  executor(function cancel(message) {
	    if (token.reason) {
	      // Cancellation has already been requested
	      return;
	    }
	
	    token.reason = new Cancel(message);
	    resolvePromise(token.reason);
	  });
	}
	
	/**
	 * Throws a `Cancel` if cancellation has been requested.
	 */
	CancelToken.prototype.throwIfRequested = function throwIfRequested() {
	  if (this.reason) {
	    throw this.reason;
	  }
	};
	
	/**
	 * Returns an object that contains a new `CancelToken` and a function that, when called,
	 * cancels the `CancelToken`.
	 */
	CancelToken.source = function source() {
	  var cancel;
	  var token = new CancelToken(function executor(c) {
	    cancel = c;
	  });
	  return {
	    token: token,
	    cancel: cancel
	  };
	};
	
	module.exports = CancelToken;


/***/ }),
/* 25 */
/***/ (function(module, exports) {
	
	/**
	 * Syntactic sugar for invoking a function and expanding an array for arguments.
	 *
	 * Common use case would be to use `Function.prototype.apply`.
	 *
	 *  ```js
	 *  function f(x, y, z) {}
	 *  var args = [1, 2, 3];
	 *  f.apply(null, args);
	 *  ```
	 *
	 * With `spread` this example can be re-written.
	 *
	 *  ```js
	 *  spread(function(x, y, z) {})([1, 2, 3]);
	 *  ```
	 *
	 * @param {Function} callback
	 * @returns {Function}
	 */
	module.exports = function spread(callback) {
	  return function wrap(arr) {
	    return callback.apply(null, arr);
	  };
	};


/***/ })
/******/ ])
});
//# sourceMappingURL=axios.map
});

const MESH_FORMAT_LOOKUP = {
  obj: "parseObj"
};

class MeshParser {

  static parseObjFromUrl(url, cbDone, cbProgress){
    // fetch(url)
    axios.get(url,{
      responseType: 'text',
      onDownloadProgress: function (progressEvent) {
        cbProgress({
          step: "download",
          progress: progressEvent.loaded / progressEvent.total
        });
      },

    })
    .then(function(response) {
      let objString = response.data;
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
    axios.get( url,
    {
      responseType: 'arraybuffer',
      onDownloadProgress: function (progressEvent) {
        cbProgress({
          step: "download",
          progress: progressEvent.loaded / progressEvent.total
        });
      }
    })
    .then(function(response) {
      let geometry = new BufferGeometry();
      geometry.addAttribute( 'position', new Float32BufferAttribute( new Float32Array(response.data), 3 ) );

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
 *
 * - 'onMeshLoadWarning': when mesh is asked to be loaded but it's already being processed or in the loaded.
 *    Note that this is based on the ID, not the URL
 *    @param {string} message - the explanation
 *    @param {string} id - ID of the mesh being loaded
 *
 */
class MeshCollection extends EventManager {

  constructor(threeContext=null){
    super();
    this._threeContext = threeContext;

    this._container = new Object3D();
    this._container.name = 'meshContainer';
    this._threeContext.getScene().add(this._container);
    this._collection = {};

    // keeps track of all the meshes that are in the process of being loaded/parsed.
    // This is to prevent reloading of multiple time the same mesh
    this._inProcess = {};

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

    if(id in this._inProcess){
      return this.emit('onMeshLoadWarning', ['The mesh is already being processed.', id])
    }

    if(id in this._collection){
      return this.emit('onMeshLoadWarning', ['The mesh is already loaded.', id])
    }

    let makeVisible = 'makeVisible' in options ? options.makeVisible : true;
    let color = 'color' in options ? options.color : '#FFFFFF';
    let material = 'material' in options ? options.material : this._generateFresnelMateral(color);
    let format = 'format' in options ? options.format : 'obj';
    let focusOn = 'focusOn' in options ? options.focusOn : false;

    // for the mesh not to be loaded more than once during the processing
    this._inProcess[id] = true;

    MeshParser.parseFromUrl(url, format,
      // cbDone,
      function(info){
        if(info.error){
          return that.emit('onMeshLoadError', [info.error, id])
        }

        let geometry = info.geometry;
        let mesh = new Mesh(geometry, material);

        mesh.name = id;
        mesh.visible = makeVisible;
        that._collection[id] = mesh;
        that._container.add(mesh);
        delete that._inProcess[id];

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
   * @param {string} options.blending - blending methods for points among: 'NoBlending', 'NormalBlending', 'AdditiveBlending', 'SubtractiveBlending', 'MultiplyBlending'  (default: 'NoBlending')
   * @param {Number} options.alpha - transparency in [0, 1], 0 is entirely transparent and 1 is entirely opaque (default: 0.7)
   */
  loadPointCloudFromUrl(url, options = {}){
    let that = this;
    let id = 'id' in options ? options.id : Math.random().toString().split('.')[1];

    if(id in this._inProcess){
      return this.emit('onMeshLoadWarning', ['The mesh is already being processed.', id])
    }

    if(id in this._collection){
      return this.emit('onMeshLoadWarning', ['The mesh is already loaded.', id])
    }

    let makeVisible = 'makeVisible' in options ? options.makeVisible : true;
    let color = 'color' in options ? options.color : '#FFFFFF';
    let format = 'format' in options ? options.format : 'raw';
    let focusOn = 'focusOn' in options ? options.focusOn : false;
    let size = 'size' in options ? options.size : 100;

    // for the mesh not to be loaded more than once during the processing
    this._inProcess[id] = true;

    PointCloudParser.parseFromUrl(url, format,
      // cbDone,
      function(info){
        if(info.error){
          return that.emit('onMeshLoadError', [info.error, id])
        }

        let material = that._generatePointCloudMaterial(color, size, options);
        let geometry = info.geometry;
        let particles = new Points( geometry, material );

        particles.name = id;
        particles.visible = makeVisible;
        that._collection[id] = particles;
        that._container.add(particles);
        delete that._inProcess[id];
        // that._threeContext.getScene().add(particles)

        geometry.computeBoundingSphere();

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
      // transparent:    true,
      // blending: THREE.AdditiveBlending,
      //depthTest: false,
    });

    let particles = new Points( geometry, material );

    this._collection['someparticle'] = particles;
    this._container.add(particles);
  }


  _generatePointCloudMaterial(color='#FFFFFF', pointSize=100, options={}){
    let blending = 'blending' in options ? options.blending : 'NoBlending';
    let alpha = 'alpha' in options ? options.alpha : 0.7;
    let alphaStr = alpha.toString();
    // for make sure we privide a float to the shader
    if(!~alphaStr.indexOf('.')){
      alphaStr += '.0';
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
      transparent:    alpha < 0.99,
      blending: THREE[blending],// THREE.NoBlending ,//AdditiveBlending,
      //depthTest: false, // default: true
    });

    return material
  }


}

export default MeshCollection;
//# sourceMappingURL=meshcollection.js.map
