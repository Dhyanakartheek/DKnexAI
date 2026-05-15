package com.dknex.ai.controller;

import com.dknex.ai.entity.ExecutionLog;
import com.dknex.ai.service.AgentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/logs")
public class LogController {
    @Autowired
    private AgentService agentService;

    @GetMapping
    public List<ExecutionLog> getAllLogs() {
        return agentService.getAllLogs();
    }

    @GetMapping("/{agentId}")
    public List<ExecutionLog> getLogsByAgent(@PathVariable Long agentId) {
        return agentService.getLogsByAgent(agentId);
    }
}
