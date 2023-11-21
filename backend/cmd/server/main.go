package main

import (
	"log"
	"net/http"

	"github.com/emmettlsc/Snowball-Showdown/internal/ws"
)

func main() {
	hub := ws.NewHub()
	go hub.Run()

	// Setup the WebSocket handler
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		ws.ServeWs(hub, w, r)
	})

	// Serve static files
	http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("../client/assets"))))
	http.Handle("/examples/", http.StripPrefix("/examples/", http.FileServer(http.Dir("../client/examples"))))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Default to serving index.html
		if r.URL.Path == "/" {
			http.ServeFile(w, r, "../client/index.html")
			return
		}

		//serve other specific files like main-scene.js, tiny-graphics-widgets.js
		switch r.URL.Path {
		case "/main-scene.js", "/tiny-graphics-widgets.js", "/tiny-graphics.js", "/src/index.js":
			http.ServeFile(w, r, "../client/"+r.URL.Path)
		default:
			http.NotFound(w, r)
		}
	})

	serverAddr := ":8080"

	//start the HTTP server
	log.Printf("Server starting on %s", serverAddr)
	err := http.ListenAndServe(serverAddr, nil)
	if err != nil {
		log.Fatal("Error starting server: ", err)
	}
}
