import axios from 'axios';
import io from 'socket.io-client';

import { CurbLocation } from './';

export class Curb {
	constructor(opts) {
		this.opts = Object.assign({
			clientId: null,
			clientSecret: null,
			logger: () => {}
		}, opts);

		this._curbApiUrl = 'https://app.energycurb.com/api';
		this._curbTokenUrl = 'https://energycurb.auth0.com/oauth/token';

		this.locations = {};

		this.token = null;

		this.api = axios.create({
			baseURL: this._curbApiUrl
		});

		this._handleToken = this._handleToken.bind(this);
		this._refreshToken = this._refreshToken.bind(this);
		this.getLocations = this.getLocations.bind(this);
		this.watch = this.watch.bind(this);
	}

	init(username, password) {
		return this._getToken(username, password)
			.then(this.getLocations);
	}

	_getToken(username, password) {
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

	_refreshToken() {
		this.opts.logger('Refreshing access token');
		return this.api.post(this._curbTokenUrl, {
			grant_type: 'refresh_token',
			client_id: this.opts.clientId,
			client_secret: this.opts.clientSecret,
			refresh_token: this.token.refresh_token
		}).then(this._handleToken);
	}

	_handleToken(resp) {
		// Curb doesn't seem to give us a new refresh token
		if (!resp.data.refresh_token && this.token.refresh_token) {
			resp.data.refresh_token = this.token.refresh_token;
		}

		this.token = resp.data;
		this.api.defaults.headers.common.Authorization = `Bearer ${this.token.access_token}`;

		// Setup token refresh 1 minute before expiration
		setTimeout(this._refreshToken, (this.token.expires_in - 60) * 1000);
	}

	getLocations() {
		if (!this.token) {
			throw Error('No access token');
		}

		this.opts.logger('Getting locations');
		return this.api.get(`${this._curbApiUrl}/locations`)
			.then(resp => {
				resp.data.forEach(location => {
					this.locations[location.id] = new CurbLocation(location);
				});

				return this.locations;
			}).catch(e => {
				console.error(e);
			});
	}

	watch() {
		if (!this.token) {
			throw Error('No access token');
		}

		this.opts.logger('Connecting to socket');

		const socket = io(`${this._curbApiUrl}/circuit-data`, { reconnect: true, transports: ['websocket'] });

		socket.on('connect', () => {
			this.opts.logger('Connected to socket: sending auth');
			socket.emit('authenticate', { token: this.token.access_token });
		});

		socket.on('authorized', () => {
			this.opts.logger('Socket authorized: subscribing to live data');

			Object.keys(this.locations).forEach(key => {
				socket.emit('subscribe', key);
			});
		});

		socket.on('data', data => {
			// Does the location exist?
			if (!this.locations[data.locationId]) {
				this.opts.logger(`Unknown location: ${data.locationId}`);
				return;
			}

			this.locations[data.locationId].updateCircuits(data.circuits);
		});

		socket.on('connect_error', e => console.error(e));
		socket.on('error', e => console.error(e));
	}
}
