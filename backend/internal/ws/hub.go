package ws

import (
	"encoding/json"
	"github.com/emmettlsc/Snowball-Showdown/internal/game"
	"github.com/google/uuid"
)

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

				//clean up the disconnected client
				delete(h.clients, client)
				h.gameState.RemovePlayer(client.ID)
				close(client.send)
			}

		case message := <-h.broadcast:
			//broadcast a message to all clients
			for client := range h.clients {
				var jsonMap map[string]interface{}
				json.Unmarshal([]byte(message), &jsonMap)

				if client.ID != jsonMap["id"] { //only send to other clients
					select {
					case client.send <- message: //this just sends the msg
					default: //on fail remove client
						close(client.send)
						delete(h.clients, client)
					}
				}

			}
		}
	}
}
