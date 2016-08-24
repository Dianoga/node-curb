import _ from 'lodash';
import mqtt from 'mqtt';

export class CurbProfile {
	constructor(data) {
		this.billing = data._embedded.billing;
		delete this.billing._links;

		this.id = data.id;
		this.display_name = data.display_name;

		this.realtime = {
			href: data.real_time[0]._links.ws.href,
			topic: data.real_time[0].topic,
			prefix: data.real_time[0].prefix
		}

		this.registers = _.keyBy(data._embedded.registers.registers, val => {
			return val.id;
		});

		_.forEach(data.register_groups, (group, name) => {
			_.forEach(group, register => {
				const me = this.registers[register.id];
				if (!_.isArray(me.groups)) {
					me.groups = [];
				}

				me.groups.push(name);
			});
		});

	}

	watch(cb) {
		const client = mqtt.connect(this.realtime.href);

		client.on('connect', () => {
			client.subscribe(this.realtime.topic);
		});

		client.on('message', (topic, message) => {
			const data = JSON.parse(message);

			if (data.measurements) {
				data.measurements = this.mapMeasurements(data.measurements);
			}

			cb(data);
		});

		client.on('error', err => {
			console.error(err);
		});

		client.on('reconnect', () => {
			console.warn(`Reconnected to stream for ${this.display_name}`);
		});

		client.on('close', () => {
			console.warn(`Disconnected from stream for ${this.display_name}`);
		});
	}

	mapMeasurements(data) {
		return _.map(data, (val, key) => {
			const id = `${this.realtime.prefix}:${key}`;
			const register = this.registers[id];

			return {
				id: id,
				value: val * register.multiplier * (register.flip_domain ? -1 : 1)
			};
		});
	}
}
