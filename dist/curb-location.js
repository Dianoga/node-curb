"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CurbLocation = exports.CurbLocation = function () {
	function CurbLocation(data) {
		_classCallCheck(this, CurbLocation);

		this.id = data.id;
		this.name = data.name;

		this._listeners = [];

		this.circuits = {};
	}

	_createClass(CurbLocation, [{
		key: "addListener",
		value: function addListener(func) {
			this._listeners.push(func);
		}
	}, {
		key: "notifyListeners",
		value: function notifyListeners() {
			var _this = this;

			this._listeners.forEach(function (func) {
				func(_this);
			});
		}
	}, {
		key: "updateCircuits",
		value: function updateCircuits(data) {
			var _this2 = this;

			Object.values(data).forEach(function (circuit) {
				_this2.circuits[circuit.id] = circuit;
			});

			this.notifyListeners();
		}
	}]);

	return CurbLocation;
}();
//# sourceMappingURL=curb-location.js.map