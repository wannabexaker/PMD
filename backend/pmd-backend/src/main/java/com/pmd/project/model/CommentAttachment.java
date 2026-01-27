package com.pmd.project.model;

public class CommentAttachment {

    private String id;

    private String url;

    private String contentType;

    private String fileName;

    private long size;

    public CommentAttachment() {
    }

    public CommentAttachment(String id, String url, String contentType, String fileName, long size) {
        this.id = id;
        this.url = url;
        this.contentType = contentType;
        this.fileName = fileName;
        this.size = size;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public long getSize() {
        return size;
    }

    public void setSize(long size) {
        this.size = size;
    }
}
