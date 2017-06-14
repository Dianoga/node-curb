export class CurbLocation {
	constructor(data) {
		this.id = data.id;
		this.name = data.name;

		this._listeners = [];

		this.circuits = {};
	}

	addListener(func) {
		this._listeners.push(func);
	}

	notifyListeners() {
		this._listeners.forEach(func => {
			func(this);
		});
	}

	updateCircuits(data) {
		Object.values(data).forEach(circuit => {
			this.circuits[circuit.id] = circuit;
		});

		this.notifyListeners();
	}
}
