package com.dknex.ai.repository;

import com.dknex.ai.entity.ExecutionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExecutionLogRepository extends JpaRepository<ExecutionLog, Long> {
    List<ExecutionLog> findByAgent_Id(Long agentId);
    List<ExecutionLog> findByUser_Id(Long userId);
    List<ExecutionLog> findAllByOrderByTimestampDesc();
}
