// Ours
import {AbstractMatrix} from './abstract-matrix';
import config from '../config';

const OUTPUT_REGEX = /\d{2}/g;

export class ComponentMatrix extends AbstractMatrix {
	name = 'Component';

	// Serial connection
	serialPortPath = config.get('componentSerialPath');
	baudRate = 9600;

	// Serial protocol
	fullUpdateTriggers = [
		/^RECONFIG$/, // When the user changes something via the front panel.
		/^Out\d{2} In\d{2}/, // Reply to one of our "set output" commands.
		/^\(c\)Copyright \d{4}, Extron Electronics/ // When the unit powers up.
	];
	fullUpdateRequest = 'V0.';
	fullUpdateResponse = /^(?:\d{2} ){8}Vid (?:\d{2} ){8}Aud$/;

	constructor() {
		super();
		this.init();
	}

	processFullUpdate(data: string) {
		const matches = data.match(OUTPUT_REGEX);
		if (matches) {
			return matches.slice(0, 8).map(match => {
				return parseInt(match, 10) - 1;
			});
		}

		return this.state.outputs;
	}

	protected _buildSetOutputCommand(output: number, input: number) {
		return `${input + 1}*${output + 1}!`;
	}
}
