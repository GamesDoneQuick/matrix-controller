const PAINT_STYLE = {
    stroke: 'white',
    strokeWidth: 12
};
const ENDPOINT_STYLE = ['Blank', { radius: 0 }];
const socket = io();
// It is very important that we always refer to this instance, and never to the jsPlumb global.
const instance = jsPlumb.getInstance({
    // Drag options.
    DragOptions: { cursor: 'pointer', zIndex: 2000 },
    PaintStyle: PAINT_STYLE,
    Container: 'canvas'
});
// Before new connection is created.
instance.bind('beforeDrop', ci => {
    // Get all source el. connection(s) except the new connection which is being established.
    const existingConnections = instance.getConnections({ target: ci.targetId });
    if (Array.isArray(existingConnections)) {
        existingConnections.forEach(connection => {
            instance.deleteConnection(connection);
        });
    }
    else {
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
    socket.emit("SET_OUTPUT" /* SET_OUTPUT */, outputIndex, inputIndex);
});
// Configure outputs as targets.
document.querySelectorAll('#outputs .window').forEach((outputEl, index) => {
    instance.makeTarget(outputEl, {
        endpoint: ENDPOINT_STYLE,
        maxConnections: 2
    });
    outputEl.setAttribute('data-index', String(index));
});
// Configure inputs as sources.
document.querySelectorAll('#inputs .window').forEach((inputEl, index) => {
    instance.makeSource(inputEl, {
        endpoint: ENDPOINT_STYLE,
        maxConnections: -1,
        anchor: 'Top'
    });
    inputEl.setAttribute('data-index', String(index));
});
// Set up socket.
socket.on("OUTPUT_STATUSES" /* OUTPUT_STATUSES */, (outputs) => {
    document.querySelectorAll('#outputs .window').forEach(element => {
        instance.deleteConnectionsForElement(element);
    });
    console.log('OUTPUT_STATUSES:', outputs);
    outputs.forEach((input, outputIndex) => {
        console.log(`output ${outputIndex} gets input ${input}`);
        const sourceElem = document.querySelector(`#inputs .window:nth-child(${input + 1})`);
        const destElem = document.querySelector(`#outputs .window:nth-child(${outputIndex + 1})`);
        if (!sourceElem || !destElem) {
            return;
        }
        const sourceBgColor = window.getComputedStyle(sourceElem).backgroundColor;
        const destBgColor = window.getComputedStyle(destElem).backgroundColor;
        instance.connect({
            source: sourceElem,
            target: destElem,
            paintStyle: {
                gradient: {
                    stops: [
                        [0, sourceBgColor],
                        [1, destBgColor]
                    ]
                },
                stroke: destBgColor,
                strokeWidth: 10,
                outlineWidth: 2,
                outlineStroke: 'white'
            }
        });
    });
});
//# sourceMappingURL=app.js.map