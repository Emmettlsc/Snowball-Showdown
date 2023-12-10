package ws

import (
	"encoding/json"
	"fmt"
	"github.com/emmettlsc/Snowball-Showdown/internal/game"
	"github.com/google/uuid"
	"sort"
	"strings"
)

type Leaderboard struct {
	Scores map[string]int
	Names  map[string]string
}

func (lb *Leaderboard) GetSortedScores() []PlayerScore {
	// Convert the map to a slice with player names
	var scores []PlayerScore
	for id, score := range lb.Scores {
		name, exists := lb.Names[id]
		if !exists {
			name = "unnamed" // Use "unnamed" if no name exists
		}
		scores = append(scores, PlayerScore{ID: id, Name: name, Score: score})
	}

	// Sort the slice in descending order of scores
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].Score > scores[j].Score
	})

	return scores
}

type PlayerScore struct {
	ID    string
	Name  string
	Score int
}

func NewLeaderboard() *Leaderboard {
	return &Leaderboard{
		Scores: make(map[string]int),
		Names:  make(map[string]string),
	}
}

func (lb *Leaderboard) UpdateName(playerID, playerName string) {
	lb.Names[playerID] = playerName
}

// Method to update a player's score
func (lb *Leaderboard) UpdateScore(playerID string, points int) {
	lb.Scores[playerID] += points
}

type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	gameState *game.GameState

	leaderboard *Leaderboard
}

func containsMultipleIDs(jsonStr string) bool {
	count := strings.Count(jsonStr, `"id"`)
	return count > 1
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) Run() {
	h.gameState = game.NewGameState()
	h.leaderboard = NewLeaderboard()
	for {
		select {
		case client := <-h.register:
			clientID := uuid.New().String()
			client.ID = clientID

			//store the client w id
			h.clients[client] = true
			newPlayer := game.Player{
				ID:     clientID,
				X:      0,
				Y:      0,
				Z:      0,
				Status: true,
			}
			h.gameState.AddPlayer(&newPlayer)

			//send the ID to client
			idMessage, _ := json.Marshal(struct {
				Type string `json:"type"`
				ID   string `json:"id"`
			}{
				Type: "assignID",
				ID:   clientID,
			})
			//fmt.Println(string(idMessage[:]))
			client.send <- idMessage

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				//notify other clients about the disconnection
				disconnectMessage, _ := json.Marshal(struct {
					Type     string `json:"type"`
					PlayerID string `json:"playerId"`
				}{
					Type:     "playerDisconnected",
					PlayerID: client.ID,
				})
				//fmt.Println(string(disconnectMessage[:]))

				//broadcast the disconnect message to other clients
				for otherClient := range h.clients {
					if otherClient != client {
						otherClient.send <- disconnectMessage
					}
				}

				fmt.Println("REMOVING PLAYER")
				//clean up the disconnected client
				delete(h.clients, client)
				h.gameState.RemovePlayer(client.ID)
				close(client.send)
			}

		case message := <-h.broadcast:
			var jsonMap map[string]interface{}
			json.Unmarshal(message, &jsonMap)

			switch jsonMap["type"] {
			case "player-name":
				playerID := jsonMap["id"].(string)
				playerName := jsonMap["name"].(string)
				h.leaderboard.UpdateName(playerID, playerName)
			case "player-kill":
				fmt.Println("player-kill")
				// Extract the killer's ID and update the leaderboard
				killerID := jsonMap["id"].(string)  
				h.leaderboard.UpdateScore(killerID, 1) 

				// Get the updated leaderboard and marshal it into JSON
				updatedLeaderboard := h.leaderboard.GetSortedScores()
				leaderboardMsg, _ := json.Marshal(struct {
					Type        string        `json:"type"`
					Leaderboard []PlayerScore `json:"leaderboard"`
				}{
					Type:        "leaderboard-update",
					Leaderboard: updatedLeaderboard,
				})

				// Broadcast the updated leaderboard to all clients
				for client := range h.clients {
					client.send <- leaderboardMsg
				}

				fallthrough

			default:
				// Broadcast other types of messages to all clients except the sender
				for client := range h.clients {
					if client.ID != jsonMap["id"] {
						select {
						case client.send <- message:
						default:
							close(client.send)
							delete(h.clients, client)
						}
					}
				}
			}
		}
	}
}