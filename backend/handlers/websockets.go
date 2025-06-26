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
	SenderID    string    `json:"senderId"`
	RequesterID int       `json:"requesterId"`
	ReceiverID  int       `json:"receiverId"`
	Content     string    `json:"content"`
	Timestamp   time.Time `json:"timestamp"`
	MessageType string    `json:"messageType"` // "text" | "emoji"
	ChatType    string    `json:"chatType"`    // "private" | "group"
}

type outMessage struct {
	ID          int    `json:"id"`          // good
	ChatID      string `json:"chatId"`      // good
	SenderID    int    `json:"senderId"`    // good
	RequesterID int    `json:"requesterId"` // good
	// GroupID missing
	OtherUserName string    `json:"otherUserName"` // good
	OtherUserID   int       `json:"otherUserID"`   // good
	Content       string    `json:"content"`       // good
	Timestamp     time.Time `json:"timestamp"`     // good
	MessageType   string    `json:"messageType"`   // "text" | "emoji" // good
	ChatType      string    `json:"chatType"`      // "private" | "group" // good
}

var (
	clientsMutex sync.RWMutex
	clients      = make(map[*websocket.Conn]int)                 // Connection -> UserID
	userConns    = make(map[int]*websocket.Conn)                 // UserID -> Latest Connection (only one per user)
	groupsMutex  sync.RWMutex
	allGroups    = make(map[string]map[*websocket.Conn]bool) // Each GroupID has a map of all connections. If a key is true, that means that that connection/client is part of the group
)

func WebSocketsHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	conn, err := upgrader.Upgrade(w, r, nil)
	var groupIdString string

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
	listOfAllGroups, err := db.GetAllGroups(userID)
	fmt.Println("listOfAllGroups:", listOfAllGroups)
	if err != nil {
		log.Println("err getting all groups:", err)
	}

	// Add connection to all groups the user is a member of (handled once at connection setup)
	groupsMutex.Lock()
	for _, group := range listOfAllGroups {
		// grId := strconv.Itoa(group.GroupID)
		groupID_G, ok := group["group_id"].(int)
		if !ok {
			// handle error or invalid type
			log.Println("group_id is not an int")
			groupsMutex.Unlock()
			return
		}
		listOfAllGroupMemberIDs, err := db.GetGroupMembers(groupID_G)
		if err != nil {
			log.Println("getting group members failed:", err)
		}
		for _, grMember := range listOfAllGroupMemberIDs {
			fmt.Println("membership id:", grMember.MembershipID)
			if grMember.MemberID == userID {
				//Add to group connection
				grId := strconv.Itoa(grMember.GroupID)
				fmt.Println("Adding a user to the group:", grId)
				if allGroups[grId] == nil {
					allGroups[grId] = make(map[*websocket.Conn]bool)
				}
				allGroups[grId][conn] = true
			}
		}
	}
	groupsMutex.Unlock()
	
	clientsMutex.Lock()
	// Close any existing connection for this user
	if existingConn, exists := userConns[userID]; exists {
		log.Printf("WebSocketsHandler: Closing existing connection %p for userID=%d", existingConn, userID)
		existingConn.Close()
		delete(clients, existingConn)
		// Remove from all groups
		groupsMutex.Lock()
		for _, room := range allGroups {
			delete(room, existingConn)
		}
		groupsMutex.Unlock()
	}
	
	clients[conn] = userID
	userConns[userID] = conn
	log.Printf("WebSocketsHandler: Added connection %p for userID=%d\n", conn, userID)
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

		fmt.Println("incomingMsg:", incomingMsg)
		var receiverName string
		var receiverID, groupID int
		if incomingMsg.ChatType == "private" { // Redundant if .ChatType is consistent
			otherUserUUID := strings.TrimPrefix(incomingMsg.ChatID, "private_")
			receiver, err := db.FetchUserByUUID(otherUserUUID)
			if err != nil {
				log.Println("Error fetching user by UUID:", err)
				log.Println("Got incorrect UUID:", otherUserUUID)
				continue
			}
			receiverID = receiver.UserID
			receiverName = receiver.FirstName
		} else {
			groupIdString = strings.TrimPrefix(incomingMsg.ChatID, "group_")
			groupID, err = strconv.Atoi(groupIdString)
			fmt.Println("groupID:", groupID)
			if err != nil {
				log.Println("Error converting to int:", err)
				continue
			}
			// Group membership is already handled at connection setup; no need to add again here.
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
		fmt.Println("groupId:", chatMsg.GroupID)
		chatID, err := db.AddMessageToDB(&chatMsg)
		log.Print("AddMessageToDB returned chatID:", chatID)
		if err != nil {
			log.Println("Error inserting message into DB:", err)
			continue
		}

		var recipientConnections []*websocket.Conn

		if incomingMsg.ChatType == "private" {
			// Send to sender and receiver (one connection each)
			log.Printf("[WS] Private message: senderID=%d, receiverID=%d", senderID, receiverID)
			clientsMutex.RLock()
			log.Printf("[WS] User connections: %v", userConns)
			
			// Add sender's connection
			if senderConn, exists := userConns[senderID]; exists {
				log.Printf("[WS] Adding sender connection: %p for userID=%d", senderConn, senderID)
				recipientConnections = append(recipientConnections, senderConn)
			}
			
			// Add receiver's connection
			if receiverConn, exists := userConns[receiverID]; exists {
				log.Printf("[WS] Adding receiver connection: %p for userID=%d", receiverConn, receiverID)
				recipientConnections = append(recipientConnections, receiverConn)
			}
			
			log.Printf("[WS] Final recipientConnections: %v", recipientConnections)
			clientsMutex.RUnlock()
		} else {
			// Broadcast to all connections in the group
			groupsMutex.RLock()
			for groupMemberConn := range allGroups[groupIdString] {
				recipientConnections = append(recipientConnections, groupMemberConn)
			}
			groupsMutex.RUnlock()
		}

		// fetch the sending user's information
		senderUser, err := db.FetchUserByID(senderID)
		if err != nil {
			log.Println("WS: failed to fetch sender info:", err)
			continue
		}

		fmt.Println("About to send msg to recipients:")
		fmt.Println(recipientConnections)
		fmt.Println("or in other words:")
		for _, conn := range recipientConnections {
			fmt.Println(&conn)
		}
		
		clientsMutex.RLock()
		for _, recipientConn := range recipientConnections {
			// Determine the appropriate chatID and otherUserName for this recipient
			outChatID := incomingMsg.ChatID
			otherUserName := receiverName
			otherUserID := receiverID
			
			// If this is a private message and the recipient is not the sender,
			// adjust the chatID and otherUserName to be from the recipient's perspective
			if incomingMsg.ChatType == "private" {
				recipientUserID, exists := clients[recipientConn]
				if exists && recipientUserID != senderID {
					// This message is being sent to the receiver, so from their perspective
					// the "other user" is the sender
					outChatID = fmt.Sprintf("private_%s", senderUser.UserUUID)
					otherUserName = senderUser.FirstName
					otherUserID = senderID
				} else {
					// This message is being sent back to the sender, so from their perspective
					// the "other user" is still the receiver
					otherUserName = receiverName
					otherUserID = receiverID
				}
			}

			msg := outMessage{
				ID:            chatID,
				ChatID:        outChatID,
				RequesterID:   0, // Set appropriately if needed
				SenderID:      senderID,
				OtherUserName: otherUserName,
				OtherUserID:   otherUserID,
				Content:       incomingMsg.Content,
				Timestamp:     incomingMsg.Timestamp,
				MessageType:   incomingMsg.MessageType,
				ChatType:      incomingMsg.ChatType,
			}
			payload, err := json.Marshal(msg)
			if err != nil {
				log.Println("WS: marshal error:", err)
				continue
			}

			log.Printf("Sending message to connection %p: %s", recipientConn, string(payload))

			if err := recipientConn.WriteMessage(websocket.TextMessage, payload); err != nil {
				log.Println("WS: write error, dropping conn:", err)
				// Handle connection cleanup without breaking the read lock
				go func(conn *websocket.Conn) {
					clientsMutex.Lock()
					userID := clients[conn]
					delete(clients, conn)
					delete(userConns, userID)
					clientsMutex.Unlock()
					
					groupsMutex.Lock()
					// Use the correct group ID for cleanup
					var groupRoomKey string
					if incomingMsg.ChatType == "group" {
						groupRoomKey = groupIdString
					}
					if room := allGroups[groupRoomKey]; room != nil {
						delete(room, conn)
						// Clean up empty group rooms
						if len(room) == 0 {
							delete(allGroups, groupRoomKey)
						}
					}
					groupsMutex.Unlock()
					
					conn.Close()
				}(recipientConn)
			} else {
				log.Printf("Successfully sent message to connection %p", recipientConn)
			}
		}
		clientsMutex.RUnlock()
	}
}

func cleanUp(conn *websocket.Conn) {
	clientsMutex.Lock()
	userID := clients[conn]
	delete(clients, conn)
	delete(userConns, userID)
	log.Printf("cleanUp: deleted client connection: %p for userID=%d", conn, userID)
	clientsMutex.Unlock()

	groupsMutex.Lock()
	for groupID, room := range allGroups {
		if _, exists := room[conn]; exists {
			delete(room, conn)
			log.Printf("cleanUp: removed connection %p from group %s, remaining members: %d", conn, groupID, len(room))
			// Clean up empty group rooms
			if len(room) == 0 {
				delete(allGroups, groupID)
				log.Printf("cleanUp: removed empty group %s", groupID)
			}
		}
	}
	groupsMutex.Unlock()
	conn.Close()
}
