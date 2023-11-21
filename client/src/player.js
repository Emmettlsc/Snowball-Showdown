
export class Player {
    #playerID; //I think this is the syntax for a private member
    #lastFiredTime; // The absolute time at which the player last fired a snowball
    #moveSpeed;
    #fireRate;
    #fireSpeed;

    constructor(playerID, moveSpeed, fireRate, fireSpeed) {
        this.#playerID = playerID;

        this.#moveSpeed = moveSpeed; // A vec3 with (fwd move speed, side move speed, back move speed)
        this.#fireRate = fireRate; // How frequently the player can throw snowballs (in Hz)
        this.#fireSpeed = fireSpeed; // A bit of a misnomer
        // fireSpeed: [0] is x velocity, [1] is y velocity (height), [2] is a *scalar* that Main_Demo multiplies with the z-val of the camera transform matrix in update_state()

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
        // console.log ("Last fired at " + this.#lastFiredTime + ", current time is " + currentTime);

        if(this.#lastFiredTime === -1 || timeSinceLastFire >= (1 / this.#fireRate)) {
            // console.log("Allowed to fire --- " + currentTime);
            this.#lastFiredTime = currentTime;
            return true;
        }

        // console.log("Not allowed to fire yet");
        return false;

    }

    getFireSpeed() {
        return this.#fireSpeed;
    }

    setFireSpeed(newFireSpeed) {
        this.#fireSpeed = newFireSpeed;
    }

    getMoveSpeed() {
        return this.#moveSpeed;
    }

    setMoveSpeed(newMoveSpeed) {
        this.#moveSpeed = newMoveSpeed;
    }

    getFireRate() {
        return this.#fireRate;
    }

}