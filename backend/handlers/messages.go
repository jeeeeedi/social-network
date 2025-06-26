package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"social_network/dbTools"
	"social_network/utils"
)

type messageResponse struct {
	ID              int       `json:"id"`
	ChatID          string    `json:"chatId"`
	RequesterID     int       `json:"requesterId"`
	SenderID        int       `json:"senderId"`
	OtherUserUUID   string    `json:"otherUserUuid"`
	OtherUserName   string    `json:"otherUserName"`
	OtherUserAvatar string    `json:"otherUserAvatar"`
	ReceiverID      int       `json:"receiverId,omitempty"`
	GroupID         int       `json:"groupId,omitempty"`
	Content         string    `json:"content"`
	Timestamp       time.Time `json:"timestamp"`
	MessageType     string    `json:"messageType"`
	ChatType        string    `json:"chatType"`
}

func MessageHandler(db *dbTools.DB, w http.ResponseWriter, r *http.Request) {
	userID, err := utils.GetUserIDFromSession(db.GetDB(), r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	chatSpecifications := parts[len(parts)-1]

	specificationParts := strings.SplitN(chatSpecifications, "_", 2)
	if len(specificationParts) != 2 {
		fmt.Println("error 00")
		http.Error(w, "invalid chat specification:", http.StatusBadRequest)
		return
	}
	chatType, otherUUID := specificationParts[0], specificationParts[1]
	var otherUser *dbTools.User
	var otherID int
	if chatType == "private" {
		otherUser, err = db.FetchUserByUUID(otherUUID)
		if err != nil {
			fmt.Println("error 01")
			http.Error(w, "invalid ID/UUID:", http.StatusBadRequest)
			return
		}
		otherID = otherUser.UserID
	} else {
		otherID, err = strconv.Atoi(otherUUID)
		if err != nil {
			log.Println("atoi err:", err)
		}
	}

	var rawMsgs []dbTools.ChatMessage
	switch chatType {
	case "private":
		rawMsgs, err = db.GetMessagesBetweenUsers(userID, otherID)
	case "group":
		rawMsgs, err = db.GetMessagesForGroup(otherID)
	default:
		http.Error(w, "unknown chat type", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "could not load messages", http.StatusInternalServerError)
		return
	}

	resp := make([]messageResponse, len(rawMsgs))
	for i, msg := range rawMsgs {
		var msgOtherUser *dbTools.UserAPI
		if chatType == "private" {
			msgOtherUser, err = db.FetchUserByID(msg.ReceiverID)
			if err != nil {
				log.Println("Error fetching user when fetching messages:", err)
			}
			resp[i].OtherUserUUID = msgOtherUser.UserUUID
			resp[i].OtherUserName = msgOtherUser.FirstName
			resp[i].OtherUserAvatar = msgOtherUser.Avatar
		}
		// else if group, maybe fetch user by msg to add the other data like useruuid, firstname and avatar
		resp[i] = messageResponse{
			ID:              msg.ChatID,
			RequesterID:     userID,
			SenderID:        msg.SenderID,
			Content:         msg.Content,
			Timestamp:       msg.CreatedAt,
			MessageType:     "text", // Placeholder, change later
		}
		if chatType == "private" {
			resp[i].ReceiverID = msg.ReceiverID
			resp[i].ChatType = "private"
		} else {
			resp[i].GroupID = msg.GroupID
			resp[i].ChatType = "group"
		}
	}

	fmt.Println("resp to messages:", resp)
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		fmt.Println("JSON encode error:", err)
	}
}
