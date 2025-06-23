package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"social_network/dbTools"
	"social_network/utils"
)

type messageResponse struct {
	ChatID     int       `json:"chatId"`
	SenderID   int       `json:"senderId"`
	ReceiverID int       `json:"receiverId,omitempty"`
	GroupID    int       `json:"groupId,omitempty"`
	Content    string    `json:"content"`
	Timestamp  time.Time `json:"timestamp"`
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
		http.Error(w, "invalid chat spec", http.StatusBadRequest)
		return
	}
	chatType, otherIDStr := specificationParts[0], specificationParts[1]
	otherID, err := strconv.Atoi(otherIDStr)
	if err != nil {
		http.Error(w, "invalid ID", http.StatusBadRequest)
		return
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
		fmt.Println("DB error:", err)
		http.Error(w, "could not load messages", http.StatusInternalServerError)
		return
	}

	resp := make([]messageResponse, len(rawMsgs))
	for i, m := range rawMsgs {
		resp[i] = messageResponse{
			ChatID:    m.ChatID,
			SenderID:  m.SenderID,
			Content:   m.Content,
			Timestamp: m.CreatedAt,
		}
		if chatType == "private" {
			resp[i].ReceiverID = m.ReceiverID
		} else {
			resp[i].GroupID = m.GroupID
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		fmt.Println("JSON encode error:", err)
	}
}
