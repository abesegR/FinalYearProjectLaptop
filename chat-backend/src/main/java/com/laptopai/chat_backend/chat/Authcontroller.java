package com.laptopai.chat_backend.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"})
public class Authcontroller {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper mapper = new ObjectMapper();

    public Authcontroller(UserRepository userRepository, JwtService jwtService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ObjectNode register(@RequestBody RegisterRequest req) {
        ObjectNode res = mapper.createObjectNode();

        if (req.getUsername() == null || req.getUsername().isBlank() ||
            req.getEmail() == null || req.getEmail().isBlank() ||
            req.getPassword() == null || req.getPassword().isBlank()) {
            res.put("success", false);
            res.put("message", "All fields are required.");
            return res;
        }

        if (userRepository.existsByEmail(req.getEmail().trim())) {
            res.put("success", false);
            res.put("message", "Email already registered.");
            return res;
        }

        if (userRepository.existsByUsername(req.getUsername().trim())) {
            res.put("success", false);
            res.put("message", "Username already taken.");
            return res;
        }

        User user = new User();
        user.setUsername(req.getUsername().trim());
        user.setEmail(req.getEmail().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail(), user.getUsername());
        res.put("success", true);
        res.put("token", token);
        res.put("username", user.getUsername());
        res.put("email", user.getEmail());
        return res;
    }

    @PostMapping("/login")
    public ObjectNode login(@RequestBody LoginRequest req) {
        ObjectNode res = mapper.createObjectNode();

        if (req.getEmail() == null || req.getEmail().isBlank() ||
            req.getPassword() == null || req.getPassword().isBlank()) {
            res.put("success", false);
            res.put("message", "Email and password are required.");
            return res;
        }

        User user = userRepository.findByEmail(req.getEmail().trim().toLowerCase()).orElse(null);

        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            res.put("success", false);
            res.put("message", "Invalid email or password.");
            return res;
        }

        String token = jwtService.generateToken(user.getEmail(), user.getUsername());
        res.put("success", true);
        res.put("token", token);
        res.put("username", user.getUsername());
        res.put("email", user.getEmail());
        return res;
    }

    public record RegisterRequest(String username, String email, String password) {
        public String getUsername() { return username; }
        public String getEmail() { return email; }
        public String getPassword() { return password; }
    }

    public record LoginRequest(String email, String password) {
        public String getEmail() { return email; }
        public String getPassword() { return password; }
    }
}