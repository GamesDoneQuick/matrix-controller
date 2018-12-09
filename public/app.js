(function () {
	'use strict';

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

	jsPlumb.ready(() => {
		const instance = jsPlumb.getInstance({
			// Drag options.
			DragOptions: {cursor: 'pointer', zIndex: 2000},
			PaintStyle: PAINT_STYLE,
			Container: 'canvas'
		});

		// Bind to a connection event, just for the purposes of pointing out that it can be done.
		instance.bind('connection', (...args) => {
			console.log('connection', ...args);
		});

		// Configure outputs as targets.
		document.querySelectorAll('#outputs .window').forEach(outputEl => {
			const endpoint = instance.addEndpoint(outputEl, {
				isSource: false,
				isTarget: true,
				endpoint: ENDPOINT_STYLE,
				maxConnections: 1
			});
			endpointMap.set(outputEl, endpoint);
		});

		// Configure inputs as sources.
		document.querySelectorAll('#inputs .window').forEach(inputEl => {
			const endpoint = instance.addEndpoint(inputEl, {
				isSource: true,
				isTarget: false,
				endpoint: ENDPOINT_STYLE,
				maxConnections: -1,
				anchor: 'Top'
			});
			endpointMap.set(inputEl, endpoint);
		});

		// Set up socket.
		const socket = io();
		socket.on('OUTPUT_STATUSES', outputs => {
			document.querySelectorAll('#outputs .window').forEach(element => {
				jsPlumb.deleteConnectionsForElement(element);
			});

			console.log('OUTPUT_STATUSES:', outputs);
			outputs.forEach((input, outputIndex) => {
				console.log(`output ${outputIndex} gets input ${input}`);
				jsPlumb.connect({
					source: endpointMap.get(document.querySelector(`#inputs .window:nth-child(${input + 1})`)),
					target: endpointMap.get(document.querySelector(`#outputs .window:nth-child(${outputIndex + 1})`))
				});
			});
		});
	});
})();
