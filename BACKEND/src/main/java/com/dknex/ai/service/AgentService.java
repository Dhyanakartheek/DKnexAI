package com.dknex.ai.service;

import com.dknex.ai.dto.ExecuteResponse;
import com.dknex.ai.entity.Agent;
import com.dknex.ai.entity.ExecutionLog;
import com.dknex.ai.entity.User;
import com.dknex.ai.repository.AgentRepository;
import com.dknex.ai.repository.ExecutionLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AgentService {
    private static final Logger logger = LoggerFactory.getLogger(AgentService.class);

    @Autowired
    private AgentRepository agentRepository;

    @Autowired
    private ExecutionLogRepository executionLogRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${python.service.url:http://localhost:8000/run-agent}")
    private String PYTHON_SERVICE_URL;

    @Value("${python.coding.service.url:http://localhost:8001/code-assist}")
    private String PYTHON_CODING_SERVICE_URL;

    @Value("${python.rag.service.url:http://localhost:8002/ask}")
    private String PYTHON_RAG_SERVICE_URL;

    public List<Agent> getAllAgents() {
        return agentRepository.findAll();
    }

    public Optional<Agent> getAgentById(Long id) {
        return agentRepository.findById(id);
    }

    public Agent createAgent(Agent agent) {
        return agentRepository.save(agent);
    }

    public Agent updateAgent(Long id, Agent agentDetails) {
        Agent agent = agentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agent not found with id: " + id));

        agent.setName(agentDetails.getName());
        agent.setDescription(agentDetails.getDescription());
        agent.setType(agentDetails.getType());
        agent.setStatus(agentDetails.isStatus());

        return agentRepository.save(agent);
    }

    public void deleteAgent(Long id) {
        agentRepository.deleteById(id);
    }

    public Agent toggleStatus(Long id) {
        Agent agent = agentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agent not found with id: " + id));
        agent.setStatus(!agent.isStatus());
        return agentRepository.save(agent);
    }

    public Agent setStatus(Long id, boolean status) {
        Agent agent = agentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agent not found with id: " + id));
        agent.setStatus(status);
        return agentRepository.save(agent);
    }

    public ExecuteResponse executeAgent(Long id, String input, Long userId) {
        Agent agent = agentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agent not found with id: " + id));

        if (!agent.isStatus()) {
            throw new RuntimeException("Agent is inactive and cannot be executed.");
        }

        logger.info("Executing agent {} (Type: {}) with input: {}", agent.getName(), agent.getType(), input);

        Map<String, Object> requestBody = new HashMap<>();
        String targetUrl;

        if ("coding".equalsIgnoreCase(agent.getType())) {
            // CodeRequest schema for Agent_coding
            requestBody.put("input", input);
            requestBody.put("intent", "generate"); // default intent
            requestBody.put("session_id", "user-" + userId + "-agent-" + id);
            targetUrl = PYTHON_CODING_SERVICE_URL;
        } else if ("rag".equalsIgnoreCase(agent.getType())) {
            // AskRequest schema for Agent_rag
            requestBody.put("question", input);
            targetUrl = PYTHON_RAG_SERVICE_URL;
        } else {
            // AgentRequest schema for Agent_chat
            requestBody.put("input", input);
            requestBody.put("agent_type", agent.getType().toLowerCase());
            requestBody.put("session_id", "user-" + userId + "-agent-" + id);
            targetUrl = PYTHON_SERVICE_URL;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> httpEntity = new HttpEntity<>(requestBody, headers);

        String output;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(targetUrl, httpEntity, Map.class);
            if ("rag".equalsIgnoreCase(agent.getType())) {
                output = response != null && response.get("answer") != null
                        ? response.get("answer").toString()
                        : "No answer from neural core.";
            } else {
                output = response != null && response.get("output") != null
                        ? response.get("output").toString()
                        : "No response from neural core.";
            }
        } catch (Exception e) {
            logger.error("Error calling Python service: {}", e.getMessage());
            output = "Error: Neural service is currently unreachable. Please ensure the AI agent service is running on the appropriate port.";
        }

        // Update agent last used time
        agent.setLastUsedTime(LocalDateTime.now());
        agentRepository.save(agent);

        // Save execution log
        User user = new User(); // In a real app, fetch the actual user
        user.setId(userId);
        
        ExecutionLog log = new ExecutionLog(user, agent, input, output);
        executionLogRepository.save(log);

        return new ExecuteResponse(output, agent.getName(), LocalDateTime.now().toString());
    }

    public List<ExecutionLog> getLogsByAgent(Long agentId) {
        return executionLogRepository.findByAgent_Id(agentId);
    }

    public List<ExecutionLog> getAllLogs() {
        return executionLogRepository.findAllByOrderByTimestampDesc();
    }
}
