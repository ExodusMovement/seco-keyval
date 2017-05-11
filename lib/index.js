'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _secoRw = require('seco-rw');

var _secoRw2 = _interopRequireDefault(_secoRw);

var _bufferNoise = require('buffer-noise');

var _bufferNoise2 = _interopRequireDefault(_bufferNoise);

var _zlib = require('zlib');

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const { expand: expand32k, shrink: shrink32k } = (0, _bufferNoise2.default)(Math.pow(2, 15));

class SecoKeyval {
  constructor(file, header) {
    this.hasOpened = false;
    this.file = file;
    this.header = header;
    this._data = {};
  }

  open(passphrase, initalData = {}) {
    var _this = this;

    return _asyncToGenerator(function* () {
      _this._seco = (0, _secoRw2.default)(_this.file, passphrase, _this.header);
      if (yield _fsExtra2.default.pathExists(_this.file)) {
        let data = yield _this._seco.read();
        data = (0, _zlib.gunzipSync)(shrink32k(data));
        _this._data = JSON.parse(data.toString('utf8'));
      } else {
        yield _this._seco.write(expand32k((0, _zlib.gzipSync)(Buffer.from(JSON.stringify(initalData)))));
        _this._data = {};
      }

      _this.hasOpened = true;
    })();
  }

  set(key, val) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      if (!_this2.hasOpened) throw new Error('Must open first.');
      _this2._data[key] = val;

      const data = expand32k((0, _zlib.gzipSync)(Buffer.from(JSON.stringify(_this2._data))));
      yield _this2._seco.write(data);
    })();
  }

  get(key) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      if (!_this3.hasOpened) throw new Error('Must open first.');
      return _this3._data[key];
    })();
  }

  inspect() {
    return `<SecoKeyval: ${this.file}>`;
  }
}
exports.default = SecoKeyval;