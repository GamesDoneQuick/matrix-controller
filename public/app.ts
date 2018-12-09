import {jsPlumb} from 'jsplumb';
import {SOCKET_MESSAGES} from '../types/socket';

const ENDPOINT_RADIUS = 20;
const PAINT_STYLE = {
	gradient: {
		stops: [
			[0, '#0d78bc'],
			[1, '#558822']
		]
	},
	stroke: '#558822',
	strokeWidth: 10
};
const ENDPOINT_STYLE = ['Dot', {radius: ENDPOINT_RADIUS}];
const endpointMap = new Map();
const socket = io();

// It is very important that we always refer to this instance, and never to the jsPlumb global.
const instance = jsPlumb.getInstance({
	// Drag options.
	DragOptions: {cursor: 'pointer', zIndex: 2000},
	PaintStyle: PAINT_STYLE,
	Container: 'canvas'
});

// Before new connection is created.
instance.bind('beforeDrop', ci => {
	// Get all source el. connection(s) except the new connection which is being established.
	const existingConnections = (instance as any).getConnections({target: ci.targetId});
	if (Array.isArray(existingConnections)) {
		existingConnections.forEach(connection => {
			instance.deleteConnection(connection);
		});
	} else {
		throw new Error('expected array');
	}

	// True for establishing new connection.
	return true;
});

// Bind to a connection event, just for the purposes of pointing out that it can be done.
instance.bind('connection', (connection, originalEvent) => {
	// Only react to user-initiated connections.
	// Programmatic connections have no originalEvent, so we can filter them out.
	if (!originalEvent) {
		return;
	}

	const inputIndex = parseInt(connection.source.getAttribute('data-index') || '', 10);
	const outputIndex = parseInt(connection.target.getAttribute('data-index') || '', 10);
	console.log('connection from %s to %s', inputIndex, outputIndex);
	socket.emit(SOCKET_MESSAGES.SET_OUTPUT, outputIndex, inputIndex);
});

// Configure outputs as targets.
document.querySelectorAll('#outputs .window').forEach((outputEl, index) => {
	const endpoint = (instance as any).addEndpoint(outputEl, {
		isSource: false,
		isTarget: true,
		endpoint: ENDPOINT_STYLE,
		maxConnections: 2
	});
	outputEl.setAttribute('data-index', String(index));
	endpointMap.set(outputEl, endpoint);
});

// Configure inputs as sources.
document.querySelectorAll('#inputs .window').forEach((inputEl, index) => {
	const endpoint = (instance as any).addEndpoint(inputEl, {
		isSource: true,
		isTarget: false,
		endpoint: ENDPOINT_STYLE,
		maxConnections: -1,
		anchor: 'Top'
	});
	inputEl.setAttribute('data-index', String(index));
	endpointMap.set(inputEl, endpoint);
});

// Set up socket.
socket.on(SOCKET_MESSAGES.OUTPUT_STATUSES, (outputs: number[]) => {
	document.querySelectorAll('#outputs .window').forEach(element => {
		(instance as any).deleteConnectionsForElement(element);
	});

	console.log('OUTPUT_STATUSES:', outputs);
	outputs.forEach((input, outputIndex) => {
		console.log(`output ${outputIndex} gets input ${input}`);
		instance.connect({
			source: endpointMap.get(document.querySelector(`#inputs .window:nth-child(${input + 1})`)),
			target: endpointMap.get(document.querySelector(`#outputs .window:nth-child(${outputIndex + 1})`))
		});
	});
});
