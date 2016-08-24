'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Curb = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _ = require('./');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

global.URLSearchParams = require('url-search-params');

var Curb = exports.Curb = function () {
	function Curb(clientId, clientSecret) {
		_classCallCheck(this, Curb);

		this._clientId = clientId;
		this._clientSecret = clientSecret;

		this._curbApiUrl = 'https://app.energycurb.com';
		this._tokenUrl = '/oauth2/token';
		this._devicesUrl = null;
		this._profilesUrl = null;

		this.profiles = [];

		this.api = _axios2.default.create({
			baseURL: this._curbApiUrl
		});
	}

	_createClass(Curb, [{
		key: 'init',
		value: function init(username, password) {
			var _this = this;

			var data = new URLSearchParams();
			data.append('grant_type', 'password');
			data.append('username', username);
			data.append('password', password);

			console.log("Getting access tokens");
			return this.api.post(this._tokenUrl, data, {
				auth: {
					username: this._clientId,
					password: this._clientSecret
				}
			}).then(function (resp) {
				var token = new Buffer(resp.data.access_token).toString('base64');
				_this.api.defaults.headers.common['Authorization'] = 'Bearer ' + token;

				return _this._endpoints();
			}).then(function () {
				return _this._profiles();
			});
		}
	}, {
		key: '_endpoints',
		value: function _endpoints() {
			var _this2 = this;

			console.log("Getting API endpoints");
			return this.api.get('/api').then(function (resp) {
				_this2._devicesUrl = resp.data._links.devices.href;
				_this2._profilesUrl = resp.data._links.profiles.href;
			});
		}
	}, {
		key: '_profiles',
		value: function _profiles() {
			var _this3 = this;

			console.log("Getting user information");
			return this.api.get(this._profilesUrl).then(function (resp) {
				console.log("Processing user information");
				var profiles = resp.data._embedded.profiles;
				profiles.forEach(function (val) {
					_this3.profiles.push(new _.CurbProfile(val));
				});

				return _this3.profiles;
			});
		}
	}]);

	return Curb;
}();
//# sourceMappingURL=curb.js.map