package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social_network/dbTools"
	"strconv"
	"strings"
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

/* type message struct {
	ID           string    `json:"id"`
	SenderID     string    `json:"senderId"`
	SenderName   string    `json:"senderName"`
	SenderAvatar string    `json:"senderAvatar"`
	Content      string    `json:"content"`
	Timestamp    time.Time `json:"timestamp"`
	MessageType  string    `json:"type"` // "text" | "emoji"
	ChatID       string    `json:"chatId"`
	ChatType     string    `json:"chatType"` // "private" | "group"
} */

type WSMessage struct {
	ChatID     string    `json:"chatId"`
	SenderID   string    `json:"senderId"`
	RecieverID string    `json:"receiverId"`
	Content    string    `json:"content"`
	Timestamp  time.Time `json:"timestamp"`
	Type       string    `json:"type"`     // "text" | "emoji"
	ChatType   string    `json:"chatType"` // "private" | "group"
}

func WebSocketsHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
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
		var decodedMessage WSMessage
		err = json.Unmarshal(rawMessage, &decodedMessage)

		if err != nil {
			fmt.Println("Error unmarshalling message:", err)
			continue
		}

		// determine receiverID vs. groupID
		var recieverID, groupID int
		if decodedMessage.ChatType == "private" {
			// decodedMessage.ChatID might be "private_42" split to get the int 42
			id, _ := strconv.Atoi(strings.TrimPrefix(decodedMessage.ChatID, "private_"))
			recieverID = id
		} else {
			id, _ := strconv.Atoi(strings.TrimPrefix(decodedMessage.ChatID, "group_"))
			groupID = id
		}

		senderID, err := strconv.Atoi(decodedMessage.SenderID)
		if err != nil {
			fmt.Println("Error converting sender ID to int:", err)
		}

		/* 		chatID, err := strconv.Atoi(strings.TrimPrefix(strings.TrimPrefix(decodedMessage.ChatID, "group_"), "private_"))
		   		if err != nil {
		   			fmt.Println("Error converting chat ID to int:", err)
		   		} */

		// fill your DB model
		msg := dbTools.ChatMessage{
			/* ChatID:     chatID, */
			SenderID:   senderID,
			ReceiverID: recieverID,
			GroupID:    groupID,
			Content:    decodedMessage.Content,
			Status:     "active",
			UpdatedAt:  &decodedMessage.Timestamp,
		}
		chatID, err := db.AddMessageToDB(&msg)
		if err != nil {
			fmt.Println("Error adding message to DB:", err)
		}
		fmt.Println("Chat ID:", chatID)
		// For testing:
		allMessages, err := db.GetAllMessagesFromDB()
		if err != nil {
			return
		}
		for i, msg := range allMessages {
			fmt.Println("message", i, "is:")
			fmt.Println("	", msg.Content)
		}
	}
}
