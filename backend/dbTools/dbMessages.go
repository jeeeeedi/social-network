package dbTools

import "fmt"

// AddMessageToDB inserts a new message and returns its new chat_id.
func (database *DB) AddMessageToDB(msg *ChatMessage) (int, error) {
	const insertSQL = `
		INSERT INTO chat_messages
		  (sender_id, receiver_id, group_id, content, status, updated_at, updater_id)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	res, err := database.Exec(
		insertSQL,
		msg.SenderID,
		msg.ReceiverID,
		msg.GroupID,
		msg.Content,
		msg.Status,
		msg.UpdatedAt,
		msg.UpdaterID,
	)
	if err != nil {
		return 0, err
	}

	lastID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	msg.ChatID = int(lastID)
	return msg.ChatID, nil
}

func (database *DB) GetAllMessagesFromDB() ([]ChatMessage, error) {
	const selectSQL = `
		SELECT
		  chat_id, sender_id, receiver_id, group_id,
		  content, status, created_at, updated_at, updater_id
		FROM chat_messages
		ORDER BY created_at ASC
	`

	rows, err := database.Query(selectSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ChatMessage
	for rows.Next() {
		var m ChatMessage
		var receiver int
		var group int
		var updater int

		if err := rows.Scan(
			&m.ChatID,
			&m.SenderID,
			&receiver,
			&group,
			&m.Content,
			&m.Status,
			&m.CreatedAt,
			&m.UpdatedAt,
			&updater,
		); err != nil {
			return nil, err
		}

		m.ReceiverID = receiver
		m.GroupID = group
		m.UpdaterID = updater

		out = append(out, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (database *DB) GetMessagesBetweenUsers(user1ID, user2ID, beforeID int) ([]ChatMessage, error) {
	var (
		qry  string
		args []any
	)

	baseCond := `(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`
	// always only active messages
	statusCond := `status = 'active'`

	if beforeID < 0 {
		// first page
		qry = fmt.Sprintf(`
            SELECT chat_id, sender_id, receiver_id, content, created_at
              FROM chat_messages
             WHERE (%s) AND %s
             ORDER BY chat_id DESC
        `, baseCond, statusCond)
		args = []any{user1ID, user2ID, user2ID, user1ID}
	} else {
		// next pages: only those older than beforeID
		qry = fmt.Sprintf(`
            SELECT chat_id, sender_id, receiver_id, content, created_at
              FROM chat_messages
             WHERE ((%s AND chat_id < ?) OR (%s AND chat_id < ?))
               AND %s
             ORDER BY chat_id DESC
        `, baseCond, baseCond, statusCond)
		args = []any{
			user1ID, user2ID, beforeID,
			user2ID, user1ID, beforeID,
		}
	}

	rows, err := database.Query(qry, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []ChatMessage
	for rows.Next() {
		var m ChatMessage
		// adjust Scan targets to match your Message struct
		if err := rows.Scan(
			&m.ChatID,
			&m.SenderID,
			&m.ReceiverID,
			&m.Content,
			&m.CreatedAt,
		); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}

	// reverse to oldest-first
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}

	return msgs, nil
}
