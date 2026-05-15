package com.dknex.ai.controller;

import com.dknex.ai.dto.AgentRequest;
import com.dknex.ai.dto.ExecuteRequest;
import com.dknex.ai.dto.ExecuteResponse;
import com.dknex.ai.entity.Agent;
import com.dknex.ai.service.AgentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.dknex.ai.security.services.UserDetailsImpl;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/agents")
public class AgentController {
    @Autowired
    private AgentService agentService;

    @GetMapping
    public List<Agent> getAllAgents() {
        return agentService.getAllAgents();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Agent> getAgentById(@PathVariable Long id) {
        return agentService.getAgentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Agent createAgent(@Valid @RequestBody AgentRequest agentRequest) {
        Agent agent = new Agent();
        agent.setName(agentRequest.getName());
        agent.setDescription(agentRequest.getDescription());
        agent.setType(agentRequest.getType());
        agent.setStatus(agentRequest.isStatus());
        agent.setAgentEmail(agentRequest.getAgentEmail());
        return agentService.createAgent(agent);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Agent> updateAgent(@PathVariable Long id, @Valid @RequestBody AgentRequest agentRequest) {
        Agent agentDetails = new Agent();
        agentDetails.setName(agentRequest.getName());
        agentDetails.setDescription(agentRequest.getDescription());
        agentDetails.setType(agentRequest.getType());
        agentDetails.setStatus(agentRequest.isStatus());
        agentDetails.setAgentEmail(agentRequest.getAgentEmail());
        return ResponseEntity.ok(agentService.updateAgent(id, agentDetails));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAgent(@PathVariable Long id) {
        agentService.deleteAgent(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Agent> toggleAgentStatus(@PathVariable Long id) {
        return ResponseEntity.ok(agentService.toggleStatus(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Agent> updateAgentStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> statusUpdate) {
        boolean status = statusUpdate.getOrDefault("status", true);
        return ResponseEntity.ok(agentService.setStatus(id, status));
    }

    @PostMapping("/{id}/execute")
    public ResponseEntity<ExecuteResponse> executeAgent(
            @PathVariable Long id, 
            @RequestBody ExecuteRequest executeRequest) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(agentService.executeAgent(id, executeRequest.getInput(), userDetails.getId()));
    }
}
