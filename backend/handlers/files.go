package handlers

import (
    "io"
    "net/http"
    "os"
    "path/filepath"
    "strconv"
    "social_network/dbTools"
)

func UploadFileHandler(w http.ResponseWriter, r *http.Request) {
    // Parse multipart form
    err := r.ParseMultipartForm(10 << 20) // 10MB max
    if err != nil {
        http.Error(w, "Could not parse multipart form", http.StatusBadRequest)
        return
    }

    file, handler, err := r.FormFile("file")
    if err != nil {
        http.Error(w, "Could not get uploaded file", http.StatusBadRequest)
        return
    }
    defer file.Close()

    // Save file to disk
    uploadDir := "public/uploads"
    os.MkdirAll(uploadDir, os.ModePerm)
    filePath := filepath.Join(uploadDir, handler.Filename)
    dst, err := os.Create(filePath)
    if err != nil {
        http.Error(w, "Could not save file", http.StatusInternalServerError)
        return
    }
    defer dst.Close()
    io.Copy(dst, file)

    // Save file metadata to DB
    db := &dbTools.DB{}
    db, err = db.OpenDB()
    if err != nil {
        http.Error(w, "DB error", http.StatusInternalServerError)
        return
    }
    defer db.CloseDB()

    uploaderID, _ := strconv.Atoi(r.FormValue("uploader_id"))
    parentType := r.FormValue("parent_type")
    parentID, _ := strconv.Atoi(r.FormValue("parent_id"))

    fileRecord := &dbTools.File{
        UploaderID: uploaderID,
        FilenameOrig:   handler.Filename,
        ParentType: parentType,
        ParentID:   parentID,
    }
    _, err = db.InsertFile(fileRecord)
    if err != nil {
        http.Error(w, "DB insert error", http.StatusInternalServerError)
        return
    }

    // Return file URL
    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte(`{"url":"/uploads/` + handler.Filename + `"}`))
}