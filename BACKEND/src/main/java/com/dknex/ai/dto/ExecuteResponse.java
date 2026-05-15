package com.dknex.ai.dto;

public class ExecuteResponse {
    private String output;
    private String agentName;
    private String timestamp;

    public ExecuteResponse() {}

    public ExecuteResponse(String output, String agentName, String timestamp) {
        this.output = output;
        this.agentName = agentName;
        this.timestamp = timestamp;
    }

    public String getOutput() {
        return output;
    }

    public void setOutput(String output) {
        this.output = output;
    }

    public String getAgentName() {
        return agentName;
    }

    public void setAgentName(String agentName) {
        this.agentName = agentName;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
}
