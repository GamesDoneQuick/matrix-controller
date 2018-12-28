// Ours
import * as app from './app';

app.start().catch(error => {
	console.error(error);
	setTimeout(() => {
		process.exit(1);
	}, 100);
});
