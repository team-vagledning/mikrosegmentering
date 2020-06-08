(function () {
  'use strict';

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];

    return arr2;
  }

  function _createForOfIteratorHelper(o, allowArrayLike) {
    var it;

    if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;

        var F = function () {};

        return {
          s: F,
          n: function () {
            if (i >= o.length) return {
              done: true
            };
            return {
              done: false,
              value: o[i++]
            };
          },
          e: function (e) {
            throw e;
          },
          f: F
        };
      }

      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var normalCompletion = true,
        didErr = false,
        err;
    return {
      s: function () {
        it = o[Symbol.iterator]();
      },
      n: function () {
        var step = it.next();
        normalCompletion = step.done;
        return step;
      },
      e: function (e) {
        didErr = true;
        err = e;
      },
      f: function () {
        try {
          if (!normalCompletion && it.return != null) it.return();
        } finally {
          if (didErr) throw err;
        }
      }
    };
  }

  var data = require('../data/mikrosegmentering.json');

  var classify = function classify(point, centroids) {
    var min = Infinity,
        index = 0;

    var distance = function distance(v1, v2) {
      var total = 0;

      for (var i = 0; i < v1.length; i++) {
        total += Math.pow(v2[i] - v1[i], 2);
      }

      return Math.sqrt(total);
    };

    for (var i = 0; i < centroids.length; i++) {
      var dist = distance(point, centroids[i]);

      if (dist < min) {
        min = dist;
        index = i;
      }
    }

    return index;
  };

  var excelHeaderToNumber = function excelHeaderToNumber(val) {
    var base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        i,
        j,
        result = 0;

    for (i = 0, j = val.length - 1; i < val.length; i += 1, j -= 1) {
      result += Math.pow(base.length, j) * (base.indexOf(val[i]) + 1);
    }

    return result;
  };

  var getFieldValue = function getFieldValue(record, excelField) {
    var value = record['FIELD' + excelHeaderToNumber(excelField)];

    if (isNaN(value)) {
      return parseFloat(value.replace(',', '.'));
    }

    return value;
  };

  module.exports.getMikrosegment = function (inputs) {
    // Get selected yrkes
    var yrkesdata = data.filter(function (yrke) {
      return getFieldValue(yrke, 'A') == inputs.ssyk;
    }); // Fetch means and deviations, 
    // there're the same for all clusters of the same yrke

    var means = {
      medelalder: getFieldValue(yrkesdata[0], 'DH'),
      utbildningsniva: getFieldValue(yrkesdata[0], 'DI'),
      bosatt: getFieldValue(yrkesdata[0], 'DJ')
    };
    var deviations = {
      medelalder: getFieldValue(yrkesdata[0], 'DK'),
      utbildningsniva: getFieldValue(yrkesdata[0], 'DL'),
      bosatt: getFieldValue(yrkesdata[0], 'DM')
    }; // Make centroids

    var centroids = [];

    var _iterator = _createForOfIteratorHelper(yrkesdata),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var r = _step.value;
        centroids.push([(getFieldValue(r, 'C') - means.medelalder) / deviations.medelalder, (getFieldValue(r, 'D') - means.utbildningsniva) / deviations.utbildningsniva, (getFieldValue(r, 'E') - means.bosatt) / deviations.bosatt]);
      } // Make input centroid and classify

    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    var key = classify([(inputs.alder - means.medelalder) / deviations.medelalder, (inputs.utbildningsniva - means.utbildningsniva) / deviations.utbildningsniva, (inputs.bosatt - means.bosatt) / deviations.bosatt], centroids);
    var m = yrkesdata[key];
    return {
      ssyk: getFieldValue(m, 'A'),
      mikrosegment: getFieldValue(m, 'B'),
      medelalder: getFieldValue(m, 'C'),
      medelutbildningsniva: getFieldValue(m, 'D'),
      medelandel_bosatt_sverige: getFieldValue(m, 'E'),
      andel_studerande_senaste_aret: getFieldValue(m, 'AU'),
      medelinkomst: getFieldValue(m, 'AW'),
      forvantad_automatiserng: getFieldValue(m, 'DG'),
      mobilitetsindex: getFieldValue(m, 'DH'),
      andel_flodat_till_arbetsloshet: getFieldValue(m, 'DO')
    };
  };

}());
