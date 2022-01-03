import { Curb } from './curb';

const username = process.env['CURB_USERNAME'];
const password = process.env['CURB_PASSWORD'];

console.log('Hello there!');

if (!username || !password) {
	throw new Error('Missing username or password');
}

let curb: Curb;

const run = async () => {
	curb = new Curb({ username, password });
	const locations = await curb.init();
	Object.values(locations).forEach((loc) => {
		loc.addListener((loc) => {
			let main = 0;
			const things: string[] = [];
			Object.values(loc.circuits).forEach((c) => {
				if (c.circuit_type === 'main') main += c.w;
				else things.push(`${c.label}: ${c.w}`);
			});

			console.log(`Main: ${main}, ${things.join(', ')}`);
		});
	});

	curb.watch();
};

run();

process.on('SIGINT', () => {
	console.log('Shutdown requested');
	if (curb) curb.stopWatch();
});
