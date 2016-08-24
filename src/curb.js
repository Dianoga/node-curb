import axios from 'axios';
import { CurbProfile } from './';

global.URLSearchParams = require('url-search-params');

export class Curb {
	constructor(opts) {
		this.opts = Object.assign({
			clientId: null,
			clientSecret: null,
			logger: message => {}
		}, opts);

		this._curbApiUrl = 'https://app.energycurb.com';
		this._tokenUrl = '/oauth2/token';
		this._devicesUrl = null;
		this._profilesUrl = null;

		this.profiles = [];

		this.api = axios.create({
			baseURL: this._curbApiUrl
		});
	}

	init(username, password) {
		const data = new URLSearchParams();
		data.append('grant_type', 'password');
		data.append('username', username);
		data.append('password', password);

		this.opts.logger("Getting access tokens");
		return this.api.post(this._tokenUrl, data, {
			auth: {
				username: this.opts.clientId,
				password: this.opts.clientSecret
			}
		}).then(resp => {
			const token = new Buffer(resp.data.access_token).toString('base64');
			this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

			return this._endpoints();
		}).then(() => {
			return this._profiles();
		});
	}

	_endpoints() {
		this.opts.logger("Getting API endpoints");
		return this.api.get('/api')
			.then((resp) => {
				this._devicesUrl = resp.data._links.devices.href;
				this._profilesUrl = resp.data._links.profiles.href;
			});
	}

	_profiles() {
		this.opts.logger("Getting user information");
		return this.api.get(this._profilesUrl)
			.then(resp => {
				this.opts.logger("Processing user information");
				const profiles = resp.data._embedded.profiles;
				profiles.forEach(val => {
					this.profiles.push(new CurbProfile(val));
				});

				return this.profiles;
			});
	}
}
