package com.dknex.ai.dto;

import jakarta.validation.constraints.NotBlank;

public class ExecuteRequest {
    @NotBlank
    private String input;

    public ExecuteRequest() {}

    public String getInput() {
        return input;
    }

    public void setInput(String input) {
        this.input = input;
    }
}
