
export class Player {
    #playerID; //I think this is the syntax for a private member
    #lastFiredTime; // The absolute time at which the player last fired a snowball

    constructor(playerID, moveSpeed, fireRate, fireVelocity) {
        this.#playerID = playerID;

        this.moveSpeed = moveSpeed;
        this.fireRate = fireRate; // How frequently the player can throw snowballs (in Hz)
        this.fireVelocity = fireVelocity; // The velocity of an individual snowball that the player throws. A vec3 consisting of *scalars* for x, y, and z (since the initial throwing direction is based on which way the player is facing, which the Player class has no idea of)

        this.#lastFiredTime = -1; // -1 indicates no snowballs fired yet
    }

    getPlayerID() {
        return this.#playerID;
    }

    indicateFired() {
        this.#lastFiredTime = Date.now(); // Date.now() returns time since epoch, in milliseconds
    }

    canFire() {
        let currentTime = Date.now();
        let timeSinceLastFire = (currentTime - this.#lastFiredTime) / 1000.0;
        console.log ("Last fired at " + this.#lastFiredTime + ", current time is " + currentTime);

        if(this.#lastFiredTime === -1 || timeSinceLastFire >= (1 / this.fireRate)) {
            console.log("Allowed to fire");
            this.#lastFiredTime = currentTime;
            return true;
        }

        console.log("Not allowed to fire yet");
        return false;
    }

}