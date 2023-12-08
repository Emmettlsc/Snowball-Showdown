export class GameStateBuffer {
    constructor() {
        this.buffer = [];
        this.bufferDuration = 4000; //store 4 secs of events
    }

    addEvent(event, timestamp) {
        this.buffer.push({ event, timestamp });

        // Remove old events
        const cutoffTimestamp = Date.now() - this.bufferDuration;
        this.buffer = this.buffer.filter(item => item.timestamp > cutoffTimestamp);
    }

    getEventsForLastSeconds(seconds) { //must be under 4
        const cutoffTimestamp = Date.now() - seconds * 1000;
        return this.buffer.filter(item => item.timestamp > cutoffTimestamp);
    }
}