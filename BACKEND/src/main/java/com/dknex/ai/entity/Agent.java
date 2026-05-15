package com.dknex.ai.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "agents")
public class Agent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotBlank
    private String type; // e.g., chat, automation, coding

    private boolean status = true; // active/inactive

    @Column(name = "agent_email")
    private String agentEmail;

    private java.time.LocalDateTime lastUsedTime;

    public Agent() {}

    public Agent(Long id, String name, String description, String type, boolean status, java.time.LocalDateTime lastUsedTime) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.type = type;
        this.status = status;
        this.lastUsedTime = lastUsedTime;
    }

    public java.time.LocalDateTime getLastUsedTime() {
        return lastUsedTime;
    }

    public void setLastUsedTime(java.time.LocalDateTime lastUsedTime) {
        this.lastUsedTime = lastUsedTime;
    }

    public String getAgentEmail() {
        return agentEmail;
    }

    public void setAgentEmail(String agentEmail) {
        this.agentEmail = agentEmail;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public boolean isStatus() {
        return status;
    }

    public void setStatus(boolean status) {
        this.status = status;
    }
}
