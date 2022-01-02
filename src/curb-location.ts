import { Curb } from './curb';

type LocationListener = (location: CurbLocation) => any;

export class CurbLocation {
	public id: string;
	public label: string;
	public circuits: { [id: string]: Curb.Circuit } = {};

	private listeners: LocationListener[] = [];

	constructor(data: Curb.Location) {
		this.id = data.id;
		this.label = data.label;
	}

	addListener(func: LocationListener) {
		this.listeners.push(func);
	}

	notifyListeners() {
		this.listeners.forEach((func) => {
			func(this);
		});
	}

	updateCircuits(data: Curb.Circuit[]) {
		Object.values(data).forEach((circuit) => {
			this.circuits[circuit.id] = circuit;
		});

		this.notifyListeners();
	}
}
