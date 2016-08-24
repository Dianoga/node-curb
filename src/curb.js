import axios from 'axios';
import { CurbProfile } from './';

global.URLSearchParams = require('url-search-params');

export class Curb {
	constructor(clientId, clientSecret) {
		this._clientId = clientId;
		this._clientSecret = clientSecret;

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

		console.log("Getting access tokens");
		return this.api.post(this._tokenUrl, data, {
			auth: {
				username: this._clientId,
				password: this._clientSecret
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
		console.log("Getting API endpoints");
		return this.api.get('/api')
			.then((resp) => {
				this._devicesUrl = resp.data._links.devices.href;
				this._profilesUrl = resp.data._links.profiles.href;
			});
	}

	_profiles() {
		console.log("Getting user information");
		return this.api.get(this._profilesUrl)
			.then(resp => {
				console.log("Processing user information");
				const profiles = resp.data._embedded.profiles;
				profiles.forEach(val => {
					this.profiles.push(new CurbProfile(val));
				});

				return this.profiles;
			});
	}
}
