package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

/* export interface Message {
	id: string
	senderId: string
	senderName: string
	senderAvatar: string
	content: string
	timestamp: Date
	type: "text" | "emoji"
	chatId: string
	chatType: "private" | "group"
  } */

type message struct {
	ID           string    `json:"id"`
	SenderID     string    `json:"senderId"`
	SenderName   string    `json:"senderName"`
	SenderAvatar string    `json:"senderAvatar"`
	Content      string    `json:"content"`
	Timestamp    time.Time `json:"timestamp"`
	MessageType  string    `json:"type"` // "text" | "emoji"
	ChatID       string    `json:"chatId"`
	ChatType     string    `json:"chatType"` // "private" | "group"
}

func WebSocketsHandler(w http.ResponseWriter, r *http.Request) {
	// Check user validity?
	var upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Add user to online list
	// Defer remove user from online list

	for {
		_, rawMessage, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var decodedMessage message
		err = json.Unmarshal(rawMessage, &decodedMessage)

		fmt.Println(string(decodedMessage.Content))
		if err != nil {
			fmt.Println("Error unmarshalling message:", err)
			continue
		}
	}
}
