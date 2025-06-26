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
	clients      = make(map[*websocket.Conn]int) // Connection -> UserID
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

	for _, group := range listOfAllGroups {
		// grId := strconv.Itoa(group.GroupID)
		groupID_G, ok := group["group_id"].(int)
		if !ok {
			// handle error or invalid type
			log.Println("group_id is not an int")
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

		fmt.Println("incomingMsg:", incomingMsg)
		var recieverName string
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
			recieverName = reciever.FirstName
		} else {
			groupIdString = strings.TrimPrefix(incomingMsg.ChatID, "group_")
			groupID, err = strconv.Atoi(groupIdString)
			fmt.Println("groupID:", groupID)
			if err != nil {
				log.Println("Error converting to int:", err)
				continue
			}

			// ensure this conn is in the group
			// CHANGE THIS, NEED TO ENSURE USER IS SEEN AS PART OF GROUP EVEN IF THEY HAVEN'T SENT A MESSAGE

			// // Redundant
			// groupsMutex.Lock()
			// if allGroups[groupIdString] == nil {
			// 	allGroups[groupIdString] = make(map[*websocket.Conn]bool)
			// }
			// allGroups[groupIdString][conn] = true
			// groupsMutex.Unlock()
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
		if err != nil {
			log.Println("Error inserting message into DB:", err)
			continue
		}

		var recipientConnections []*websocket.Conn

		if incomingMsg.ChatType == "private" {
			// Send to self and intended recipient
			clientsMutex.RLock()
			// For some reason there are 3 connections, self, recipient, and another recipient(???), so we do this instead:
			for clientConn := range clients {
				if clientConn == conn {
					recipientConnections = append(recipientConnections, clientConn)
					break
				}
			}
			for clientConn, clientID := range clients {
				if clientID == receiverID {
					recipientConnections = append(recipientConnections, clientConn)
					break // Break after first recipient is found.
				}
			}
			clientsMutex.RUnlock()
		} else {
			// Broadcast to all connections in the group
			groupsMutex.RLock()
			for groupMemberConn := range allGroups[groupIdString] {
				recipientConnections = append(recipientConnections, groupMemberConn)
			}
			groupsMutex.RUnlock()
		}

		// fetch the sending user's UUID
		senderUser, err := db.FetchUserByID(senderID)
		if err != nil {
			log.Println("WS: failed to fetch sender UUID:", err)
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
			outChatID := incomingMsg.ChatID
			if incomingMsg.ChatType == "private" && recipientConn != conn {
				outChatID = fmt.Sprintf("private_%s", senderUser.UserUUID)
			}

			msg := outMessage{
				ID:            chatID,
				ChatID:        outChatID,
				RequesterID:   incomingMsg.RequesterID,
				SenderID:      senderID,
				OtherUserName: recieverName,
				OtherUserID:   receiverID,
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

			if err := recipientConn.WriteMessage(websocket.TextMessage, payload); err != nil {
				clientsMutex.RUnlock()
				clientsMutex.Lock()
				log.Println("WS: write error, dropping conn:", err)
				recipientConn.Close()
				delete(clients, recipientConn)
				if room := allGroups[incomingMsg.ChatID]; room != nil {
					delete(room, recipientConn)
				}
				clientsMutex.Unlock()
				clientsMutex.RLock()
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
