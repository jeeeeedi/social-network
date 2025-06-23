package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"social_network/dbTools"
	"social_network/utils"
	"strconv"
	"strings"
	"sync"
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
	ChatID     string    `json:"chatId"` // Should come up with new name ?
	SenderID   string    `json:"senderId"`
	ReceiverID string    `json:"receiverId"`
	Content    string    `json:"content"`
	Timestamp  time.Time `json:"timestamp"`
	Type       string    `json:"type"`     // "text" | "emoji"
	ChatType   string    `json:"chatType"` // "private" | "group"
}

type StandardizedMessage struct {
	WSMessage
	Recipients []string `json:"recipients"`
}

var (
	clientsMutex sync.RWMutex
	clients      = make(map[*websocket.Conn]string) // Connection -> UserID
	groupsMutex  sync.RWMutex
	allGroups    = make(map[string]map[*websocket.Conn]bool) // Each GroupID has a map of all connections. If a key is true, that means that that connection/client is part of the group
)

func WebSocketsHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket", http.StatusBadRequest)
		return
	}
	defer cleanUp(conn)

	// On new connection, register it. You’ll need to assign the right userID here—
	// for simplicity I’m reading a "user" query param.
	// CHECK LATER, probably should fetch UserID by session
	userID := r.URL.Query().Get("user")
	clientsMutex.Lock()
	clients[conn] = userID
	clientsMutex.Unlock()

	// Check what groups the client is part of, and enable real time messages.

	for {
		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var incomingMsg WSMessage
		if err := json.Unmarshal(rawMsg, &incomingMsg); err != nil {
			log.Println("Error unmarshalling:", err)
			continue
		}

		var receiverID, groupID int
		if incomingMsg.ChatType == "private" { // Reduntant if .ChatType is consistent
			id, _ := strconv.Atoi(strings.TrimPrefix(incomingMsg.ChatID, "private_"))
			receiverID = id
		} else {
			id, _ := strconv.Atoi(strings.TrimPrefix(incomingMsg.ChatID, "group_"))
			groupID = id

			// ensure this conn is in the group
			// CHANGE THIS, NEED TO ENSURE USER IS SEEN AS PART OF GROUP EVEN IF THEY HAVEN'T SENT A MESSAGE
			groupsMutex.Lock()
			if allGroups[incomingMsg.ChatID] == nil {
				allGroups[incomingMsg.ChatID] = make(map[*websocket.Conn]bool)
			}
			allGroups[incomingMsg.ChatID][conn] = true
			groupsMutex.Unlock()
		}

		senderID, err := utils.GetUserIDFromSession(db.GetDB(), r)
		if err != nil {
			log.Println("Error getting SenderID:", err)
			continue
		}
		chatMsg := dbTools.ChatMessage{
			SenderID:   senderID,
			ReceiverID: receiverID,
			GroupID:    groupID,
			Content:    incomingMsg.Content,
			Status:     "active",
			UpdatedAt:  &incomingMsg.Timestamp,
		}
		if _, err := db.AddMessageToDB(&chatMsg); err != nil {
			log.Println("Error inserting message into DB:", err)
			continue
		}

		var recipientConnections []*websocket.Conn
		var recipientNames []string

		if incomingMsg.ChatType == "private" {
			// Send to self and intended recipient
			clientsMutex.RLock()
			for clientConn, clientID := range clients {
				if clientID == strconv.Itoa(receiverID) || clientConn == conn {
					recipientConnections = append(recipientConnections, clientConn)
					// Placeholder, name = id
					recipientNames = append(recipientNames, clientID)
				}
			}
			clientsMutex.RUnlock()
		} else {
			// Broadcast to all connections in the group
			groupsMutex.RLock()
			for groupMemberConn := range allGroups[incomingMsg.ChatID] {
				recipientConnections = append(recipientConnections, groupMemberConn)
				// Placeholder, name = id
				recipientNames = append(recipientNames, clients[groupMemberConn])
			}
			groupsMutex.RUnlock()
		}

		outgoing, err := formatToWebsocketStandard(incomingMsg, recipientNames)
		if err != nil {
			log.Println("Error formatting message to standard:", err)
			continue
		}

		clientsMutex.RLock()
		for _, recipientConn := range recipientConnections {
			if err := recipientConn.WriteMessage(websocket.TextMessage, outgoing); err != nil {
				clientsMutex.Lock()
				log.Println("Error writing message to connection:", err, "\nDeleting them...")
				recipientConn.Close()
				delete(clients, recipientConn)
				if group := allGroups[incomingMsg.ChatID]; group != nil {
					delete(group, recipientConn)
				}
				clientsMutex.Unlock()
			}
		}
		clientsMutex.RUnlock()
	}
}

func cleanUp(conn *websocket.Conn) {
	clientsMutex.Lock()
	delete(clients, conn)
	clientsMutex.Unlock()

	groupsMutex.Lock()
	for _, room := range allGroups {
		delete(room, conn)
	}
	groupsMutex.Unlock()
	conn.Close()
}

func formatToWebsocketStandard(msg WSMessage, recipients []string) ([]byte, error) {
	if msg.Type != "text" && msg.Type != "emoji" {
		return nil, fmt.Errorf("invalid type %q", msg.Type)
	}
	std := StandardizedMessage{
		WSMessage:  msg,
		Recipients: recipients,
	}
	if std.Timestamp.IsZero() {
		std.Timestamp = time.Now().UTC()
	}
	return json.Marshal(std)
}
