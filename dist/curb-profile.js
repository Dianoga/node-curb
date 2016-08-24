'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.CurbProfile = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _mqtt = require('mqtt');

var _mqtt2 = _interopRequireDefault(_mqtt);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CurbProfile = exports.CurbProfile = function () {
	function CurbProfile(data) {
		var _this = this;

		_classCallCheck(this, CurbProfile);

		this.billing = data._embedded.billing;
		delete this.billing._links;

		this.id = data.id;
		this.display_name = data.display_name;

		this.realtime = {
			href: data.real_time[0]._links.ws.href,
			topic: data.real_time[0].topic,
			prefix: data.real_time[0].prefix
		};

		this.registers = _lodash2.default.keyBy(data._embedded.registers.registers, function (val) {
			return val.id;
		});

		_lodash2.default.forEach(data.register_groups, function (group, name) {
			_lodash2.default.forEach(group, function (register) {
				var me = _this.registers[register.id];
				if (!_lodash2.default.isArray(me.groups)) {
					me.groups = [];
				}

				me.groups.push(name);
			});
		});
	}

	_createClass(CurbProfile, [{
		key: 'watch',
		value: function watch(cb) {
			var _this2 = this;

			var client = _mqtt2.default.connect(this.realtime.href);

			client.on('connect', function () {
				client.subscribe(_this2.realtime.topic);
			});

			client.on('message', function (topic, message) {
				var data = JSON.parse(message);

				if (data.measurements) {
					data.measurements = _this2.mapMeasurements(data.measurements);
				}

				cb(data);
			});

			client.on('error', function (err) {
				console.error(err);
			});

			client.on('reconnect', function () {
				console.warn('Reconnected to stream for ' + _this2.display_name);
			});

			client.on('close', function () {
				console.warn('Disconnected from stream for ' + _this2.display_name);
			});
		}
	}, {
		key: 'mapMeasurements',
		value: function mapMeasurements(data) {
			var _this3 = this;

			return _lodash2.default.map(data, function (val, key) {
				var id = _this3.realtime.prefix + ':' + key;
				var register = _this3.registers[id];

				return {
					id: id,
					value: val * register.multiplier * (register.flip_domain ? -1 : 1)
				};
			});
		}
	}]);

	return CurbProfile;
}();
//# sourceMappingURL=curb-profile.js.map