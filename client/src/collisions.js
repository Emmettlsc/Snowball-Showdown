import * as CONST from './constants.js'
import { mapComponents } from "./map.js";

export const checkMapComponentCollisions = (posArray, velocityArray = null, isSnowball = false) => {
  let activeGround = CONST.MIN_Y
  let activeCeiling = 10000
  let collision = false

  for (const wall of mapComponents) {
    // Extracting wall properties
    const PLAYER_WIDTH = 3
    const { translate, rotation, roationAngle, scale } = wall;

    if (rotation[2] === 1) {
        const minX = (translate[0] - scale[1])
        const maxX = (translate[0] + scale[1])
        const minZ = (translate[2] - scale[2]) - PLAYER_WIDTH / 2
        const maxZ = (translate[2] + scale[2]) + PLAYER_WIDTH / 2
        const maxY = (translate[1] + scale[0])
        if (posArray[0] > minX && posArray[0] < maxX) {
            if (posArray[2] > minZ && posArray[2] < maxZ && posArray[1] < maxY){
                if (isSnowball) {
                    velocityArray[2] = -1 * CONST.WALL_BOUNCE_FACTOR * velocityArray[2]
                    posArray[2] = velocityArray[2] > 0 ? maxZ : minZ

                    collision = true;
                }
                else 
                    posArray[2] = posArray[2] > translate[2] ? maxZ : minZ
            }
        }
    }
    else if (rotation[1] === 1) {
        const minX = (translate[0] - scale[2]) - PLAYER_WIDTH / 2
        const maxX = (translate[0] + scale[2]) + PLAYER_WIDTH / 2
        const minZ = (translate[2] - scale[0]) 
        const maxZ = (translate[2] + scale[0]) 
        const maxY = (translate[1] + scale[1])
        if (posArray[2] > minZ && posArray[2] < maxZ) {
            if (posArray[0] > minX && posArray[0] < maxX && posArray[1] < maxY) {
                if (isSnowball) {
                    velocityArray[0] = -1 * CONST.WALL_BOUNCE_FACTOR * velocityArray[0]
                    posArray[0] = velocityArray[0] > 0 ? maxX : minX

                    collision = true;
                }
                else 
                    posArray[0] = posArray[0] > translate[0] ? maxX : minX
            }
        }
    }
    else if (rotation[0] === 1) { //floors, ramps later
        const minX = (translate[0] - scale[0])
        const maxX = (translate[0] + scale[0])
        const minZ = (translate[2] - scale[1])
        const maxZ = (translate[2] + scale[1])
        const yVal = (translate[1]) + 2 //add some sin / cos with user pos for ramps
        
        if (posArray[2] > minZ && posArray[2] < maxZ && posArray[0] > minX && posArray[0] < maxX) {
            if (posArray[1] > yVal-1 && yVal > activeGround)
              activeGround = yVal
            else if (posArray[1] <= yVal-1 && posArray[1] > yVal - 2.01) {
                if (isSnowball) {
                    velocityArray[1] = -1 * CONST.FLOOR_BOUNCE_FACTOR * velocityArray[1]
                    continue
                }
                const xUpd = posArray[0] > translate[0] ? maxX : minX
                const zUpd = posArray[2] > translate[2] ? maxZ : minZ
                if (Math.abs(posArray[0] - xUpd) < Math.abs(posArray[2] - zUpd))
                    posArray[0] = xUpd
                else 
                    posArray[2] = zUpd
            }
            else if (yVal < activeCeiling){ //underneath platform, add ceiling
                activeCeiling = yVal - 2
            }
        }

    }
  }

  if (activeGround === CONST.MIN_Y && (posArray[0] > CONST.MAX_MAP_X || posArray[0] < CONST.MIN_MAP_X || posArray[2] > CONST.MAX_MAP_Z || posArray[2] < CONST.MIN_MAP_Z))
    activeGround = -1000;
  
  return { activeCeiling, activeGround, collision }
}