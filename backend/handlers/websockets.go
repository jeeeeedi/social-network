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

type inMessage struct {
	ChatID      string    `json:"chatId"`
	RequesterID int       `json:"requesterId"`
	SenderID    string    `json:"senderId"`
	ReceiverID  int       `json:"receiverId"`
	Content     string    `json:"content"`
	Timestamp   time.Time `json:"timestamp"`
	MessageType string    `json:"messageType"` // "text" | "emoji"
	ChatType    string    `json:"chatType"`    // "private" | "group"
}

type outMessage struct {
	ID          int       `json:"id"`
	ChatID      string    `json:"chatId"`
	RequesterID int       `json:"requesterId"`
	SenderID    string    `json:"senderId"`
	ReceiverID  int       `json:"receiverId"`
	Content     string    `json:"content"`
	Timestamp   time.Time `json:"timestamp"`
	MessageType string    `json:"messageType"` // "text" | "emoji"
	ChatType    string    `json:"chatType"`    // "private" | "group"
}

var (
	clientsMutex sync.RWMutex
	clients      = make(map[*websocket.Conn]int) // Connection -> UserID
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

	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		log.Printf("Could not get user ID from session cookie: %v\n", err)
		return
	}
	clientsMutex.Lock()
	clients[conn] = userID
	clientsMutex.Unlock()

	// Check what groups the client is part of, and enable real time messages.

	for {
		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var incomingMsg inMessage
		if err := json.Unmarshal(rawMsg, &incomingMsg); err != nil {
			log.Println("Error unmarshalling:", err)
			continue
		}

		var receiverID, groupID int
		if incomingMsg.ChatType == "private" { // Reduntant if .ChatType is consistent
			otherUserUUID := strings.TrimPrefix(incomingMsg.ChatID, "private_")
			reciever, err := db.FetchUserByUUID(otherUserUUID)
			if err != nil {
				log.Println("Error fetching user by UUID:", err)
				log.Println("Got incorrect UUID:", otherUserUUID)
				continue
			}
			receiverID = reciever.UserID
		} else {
			id, err := strconv.Atoi(strings.TrimPrefix(incomingMsg.ChatID, "group_"))
			fmt.Println(id)
			if err != nil {
				log.Println("Error converting to int:", err)
				continue
			}
			groupID = /* incomingMsg.ChatID */ 1 // PLACEHOLDER, CHANGE LATER

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
		chatID, err := db.AddMessageToDB(&chatMsg)
		if err != nil {
			log.Println("Error inserting message into DB:", err)
			continue
		}

		var recipientConnections []*websocket.Conn
		var recipientIDs []int

		if incomingMsg.ChatType == "private" {
			// Send to self and intended recipient
			clientsMutex.RLock()
			for clientConn, clientID := range clients {
				if clientID == receiverID || clientConn == conn {
					recipientConnections = append(recipientConnections, clientConn)
					// Placeholder, name = id
					recipientIDs = append(recipientIDs, clientID)
				}
			}
			clientsMutex.RUnlock()
		} else {
			// Broadcast to all connections in the group
			groupsMutex.RLock()
			for groupMemberConn := range allGroups[incomingMsg.ChatID] {
				recipientConnections = append(recipientConnections, groupMemberConn)
				// Placeholder, name = id
				recipientIDs = append(recipientIDs, clients[groupMemberConn])
			}
			groupsMutex.RUnlock()
		}

		/* outgoing, err := formatToWebsocketStandard(incomingMsg, recipientIDs) */
		rawOutMsg := outMessage{
			ID:          chatID,
			ChatID:      incomingMsg.ChatID,
			RequesterID: incomingMsg.RequesterID,
			SenderID:    incomingMsg.SenderID,
			ReceiverID:  incomingMsg.ReceiverID,
			Content:     incomingMsg.Content,
			Timestamp:   incomingMsg.Timestamp,
			MessageType: incomingMsg.MessageType,
			ChatType:    incomingMsg.ChatType,
		}

		outgoingMsg, err := json.Marshal(rawOutMsg)

		if err != nil {
			log.Println("Error formatting message to standard:", err)
			continue
		}

		clientsMutex.RLock()
		for _, recipientConn := range recipientConnections {
			if err := recipientConn.WriteMessage(websocket.TextMessage, outgoingMsg); err != nil {
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

/* func formatToWebsocketStandard(msg WSMessage, recipients []int) ([]byte, error) {
	if msg.MessageType != "text" && msg.MessageType != "emoji" {
		return nil, fmt.Errorf("invalid type %q", msg.MessageType)
	}
	std := StandardizedMessage{
		WSMessage:  msg,
		Recipients: recipients,
	}
	if std.Timestamp.IsZero() {
		std.Timestamp = time.Now().UTC()
	}
	return json.Marshal(std)
} */
