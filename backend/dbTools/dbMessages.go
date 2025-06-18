package dbTools

// AddMessageToDB inserts a new message and returns its new chat_id.
func (d *DB) AddMessageToDB(msg *ChatMessage) (int, error) {
	const insertSQL = `
		INSERT INTO chat_messages
		  (sender_id, receiver_id, group_id, content, status, updated_at, updater_id)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	res, err := d.Exec(
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

func (d *DB) GetAllMessagesFromDB() ([]ChatMessage, error) {
	const selectSQL = `
		SELECT
		  chat_id, sender_id, receiver_id, group_id,
		  content, status, created_at, updated_at, updater_id
		FROM chat_messages
		ORDER BY created_at ASC
	`

	rows, err := d.Query(selectSQL)
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
