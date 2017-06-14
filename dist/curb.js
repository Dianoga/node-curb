'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Curb = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _socket = require('socket.io-client');

var _socket2 = _interopRequireDefault(_socket);

var _ = require('./');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Curb = exports.Curb = function () {
	function Curb(opts) {
		_classCallCheck(this, Curb);

		this.opts = Object.assign({
			clientId: null,
			clientSecret: null,
			logger: function logger() {}
		}, opts);

		this._curbApiUrl = 'https://app.energycurb.com/api';
		this._curbTokenUrl = 'https://energycurb.auth0.com/oauth/token';

		this.locations = {};

		this.token = null;

		this.api = _axios2.default.create({
			baseURL: this._curbApiUrl
		});

		this._handleToken = this._handleToken.bind(this);
		this._refreshToken = this._refreshToken.bind(this);
		this.getLocations = this.getLocations.bind(this);
		this.watch = this.watch.bind(this);
	}

	_createClass(Curb, [{
		key: 'init',
		value: function init(username, password) {
			return this._getToken(username, password).then(this.getLocations);
		}
	}, {
		key: '_getToken',
		value: function _getToken(username, password) {
			this.opts.logger('Getting access token');
			return this.api.post(this._curbTokenUrl, {
				client_id: this.opts.clientId,
				client_secret: this.opts.clientSecret,
				grant_type: 'password',
				audience: 'app.energycurb.com/api',
				scope: 'offline_access',
				username: username,
				password: password
			}).then(this._handleToken);
		}
	}, {
		key: '_refreshToken',
		value: function _refreshToken() {
			this.opts.logger('Refreshing access token');
			return this.api.post(this._curbTokenUrl, {
				grant_type: 'refresh_token',
				client_id: this.opts.clientId,
				client_secret: this.opts.clientSecret,
				refresh_token: this.token.refresh_token
			}).then(this._handleToken);
		}
	}, {
		key: '_handleToken',
		value: function _handleToken(resp) {
			// Curb doesn't seem to give us a new refresh token
			if (!resp.data.refresh_token && this.token.refresh_token) {
				resp.data.refresh_token = this.token.refresh_token;
			}

			this.token = resp.data;
			this.api.defaults.headers.common.Authorization = 'Bearer ' + this.token.access_token;

			// Setup token refresh 1 minute before expiration
			setTimeout(this._refreshToken, (this.token.expires_in - 60) * 1000);
		}
	}, {
		key: 'getLocations',
		value: function getLocations() {
			var _this = this;

			if (!this.token) {
				throw Error('No access token');
			}

			this.opts.logger('Getting locations');
			return this.api.get(this._curbApiUrl + '/locations').then(function (resp) {
				resp.data.forEach(function (location) {
					_this.locations[location.id] = new _.CurbLocation(location);
				});

				return _this.locations;
			}).catch(function (e) {
				console.error(e);
			});
		}
	}, {
		key: 'watch',
		value: function watch() {
			var _this2 = this;

			if (!this.token) {
				throw Error('No access token');
			}

			this.opts.logger('Connecting to socket');

			var socket = (0, _socket2.default)(this._curbApiUrl + '/circuit-data', { reconnect: true, transports: ['websocket'] });

			socket.on('connect', function () {
				_this2.opts.logger('Connected to socket: sending auth');
				socket.emit('authenticate', { token: _this2.token.access_token });
			});

			socket.on('authorized', function () {
				_this2.opts.logger('Socket authorized: subscribing to live data');

				Object.keys(_this2.locations).forEach(function (key) {
					socket.emit('subscribe', key);
				});
			});

			socket.on('data', function (data) {
				// Does the location exist?
				if (!_this2.locations[data.locationId]) {
					_this2.opts.logger('Unknown location: ' + data.locationId);
					return;
				}

				_this2.locations[data.locationId].updateCircuits(data.circuits);
			});

			socket.on('connect_error', function (e) {
				return console.error(e);
			});
			socket.on('error', function (e) {
				return console.error(e);
			});
		}
	}]);

	return Curb;
}();
//# sourceMappingURL=curb.js.map