import axios, { AxiosInstance } from 'axios';
import io from 'socket.io-client';

import { CurbLocation } from './';

export type Options = {
	clientId: string;
	clientSecret: string;
	username: string;
	password: string;
	logger: typeof console.log;
};

export type TokenResponse = {
	access_token: string;
	expires_in: number;
	token_type: 'Bearer';
};

export type Location = {
	address: string;
	city: string;
	country: string;
	dt_created: string;
	dt_modified: string;
	geocode: string;
	id: string;
	label: string;
	organization: string;
	postcode: string;
	state: string;
	timezone: string;
};

export type Circuit = {
	id: string;
	label: string;
	grid: boolean;
	main: boolean;
	battery: boolean;
	production: boolean;
	circuit_type: 'consumption' | 'line_side_production' | 'main';
	w: number;
};

export type LocationsResponse = Location[];

export class Curb {
	private opts: Options;
	private curbApiUrl = 'https://app.energycurb.com/api/v3';
	private curbSocketUrl = 'https://app.energycurb.com/api';
	private curbTokenUrl = 'https://energycurb.auth0.com/oauth/token';

	private api: AxiosInstance;
	private socket?: SocketIOClient.Socket;

	private token?: string;
	private tokenExp?: number;
	private locations: { [id: string]: CurbLocation } = {};

	constructor(opts?: Partial<Options>) {
		if (!opts?.username || !opts.password)
			throw new Error('username and password are required');

		this.opts = Object.assign(
			{
				username: null,
				password: null,
				clientId: 'R7LHLp5rRr6ktb9hhXfMaILsjwmIinKa',
				clientSecret:
					'pcxoDsqCN7o_ny5KmEKJ2ci0gL5qqOSfxnzF6JIvwsfRsUVXFdD-DUc40kkhHAZR',
				logger: console.log,
			},
			opts
		);

		this.api = axios.create({
			baseURL: this.curbApiUrl,
		});
	}

	async init() {
		await this.getToken();
		return await this.getLocations();
	}

	private async getToken() {
		this.opts.logger('Getting access token');

		const requestData = {
			client_id: this.opts.clientId,
			client_secret: this.opts.clientSecret,
			grant_type: 'password',
			audience: 'app.energycurb.com/api',
			username: this.opts.username,
			password: this.opts.password,
		};

		const resp = await this.api.post<TokenResponse>(
			this.curbTokenUrl,
			requestData
		);

		this.token = resp.data.access_token;
		this.tokenExp = Date.now() + resp.data.expires_in * 1000;

		this.api.defaults.headers.common.Authorization = `Bearer ${this.token}`;

		// Setup token refresh 1 minute before expiration
		setTimeout(this.refreshToken, (resp.data.expires_in - 60) * 1000);
	}

	private async refreshToken() {
		await this.getToken();
		if (this.socket) this.watch();
	}

	async getLocations() {
		if (!this.token) {
			throw Error('No access token');
		}

		this.opts.logger('Getting locations');

		const resp = await this.api.get<LocationsResponse>(
			`${this.curbApiUrl}/locations`
		);

		resp.data.forEach((location) => {
			if (!this.locations[location.id])
				this.locations[location.id] = new CurbLocation(location);
		});

		return this.locations;
	}

	watch() {
		if (!this.token) {
			throw Error('No access token');
		}

		if (this.socket) {
			this.opts.logger('Closing old socket');
			this.socket.close();
		}

		this.opts.logger('Connecting to socket');

		this.socket = io(`${this.curbSocketUrl}/circuit-data`, {
			transports: ['websocket'],
		});

		this.socket.on('connect', () => {
			this.opts.logger('Connected to socket: sending auth');
			this.socket?.emit('authenticate', { token: this.token });
		});

		this.socket.on('authorized', () => {
			this.opts.logger('Socket authorized: subscribing to live data');

			Object.keys(this.locations).forEach((key) => {
				this.socket?.emit('subscribe', key);
			});
		});

		this.socket.on(
			'data',
			(data: { locationId: string; circuits: Circuit[] }) => {
				// Does the location exist?
				if (!this.locations[data.locationId]) {
					this.opts.logger(`Unknown location: ${data.locationId}`);
					return;
				}

				this.locations[data.locationId].updateCircuits(data.circuits);
			}
		);

		this.socket.on('connect_error', (e: Error) => console.error(e));
		this.socket.on('error', (e: Error) => console.error(e));
	}
}
