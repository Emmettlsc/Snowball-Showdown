package game

import (
	"sync"
)

type Player struct {
	ID      string  //player id
	X, Y, Z float64 //player coords
	Status  bool    //alive (true) or dead (false)
}

type Snowball struct {
	PlayerID   string  //player who threw snowball
	X, Y, Z    float64 //snowball pos (rn its only starting pos)
	Vx, Vy, Vz float64 //snowball vel
}

type GameState struct {
	sync.RWMutex // Read Write mutex for concurrent access to the game state

	Players   map[string]*Player //active players
	Snowballs []*Snowball        //active snowballs
}

func NewGameState() *GameState {
	return &GameState{
		Players:   make(map[string]*Player),
		Snowballs: make([]*Snowball, 0),
	}
}

func (gs *GameState) AddPlayer(player *Player) {
	gs.Lock()
	defer gs.Unlock()

	gs.Players[player.ID] = player
}

func (gs *GameState) RemovePlayer(playerID string) {
	gs.Lock()
	defer gs.Unlock()

	delete(gs.Players, playerID)
}

func (gs *GameState) UpdatePlayerPosition(playerID string, x, y, z float64) {
	gs.Lock()
	defer gs.Unlock()

	if player, ok := gs.Players[playerID]; ok {
		player.X = x
		player.Y = y
		player.Z = z
	}
}

func (gs *GameState) AddSnowball(snowball *Snowball) {
	gs.Lock()
	defer gs.Unlock()

	gs.Snowballs = append(gs.Snowballs, snowball)
}

type PlayerPositionMessage struct {
	PlayerID string  `json:"playerId"`
	X, Y, Z  float64 `json:"x, y, z"`
}

type SnowballThrowMessage struct {
	PlayerID   string  `json:"playerId"`
	X, Y, Z    float64 `json:"x, y, z"`
	Vx, Vy, Vz float64 `json:"vx, vy, vz"`
}

// Implement additional methods as needed, like updating snowball positions,
// handling collisions, and so forth.
