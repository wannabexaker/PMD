package com.pmd.user.repository;

import com.pmd.user.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    List<User> findByTeam(String team);
    List<User> findByTeamId(String teamId);
    @Query("{ 'isAdmin' : false }")
    List<User> findByIsAdminFalse();
}
