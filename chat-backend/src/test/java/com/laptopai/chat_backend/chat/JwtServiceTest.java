package com.laptopai.chat_backend.chat;


import com.laptopai.chat_backend.chat.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class JwtServiceTest {

    @Autowired
    JwtService jwtService;

    @Test
    void shouldGenerateAndValidateToken() {
        String token = jwtService.generateToken("test@email.com", "testuser");
        assertNotNull(token);
        assertTrue(jwtService.isValid(token));
        assertEquals("test@email.com", jwtService.extractEmail(token));
    }

    @Test
    void shouldRejectInvalidToken() {
        assertFalse(jwtService.isValid("this.is.fake"));
    }

    @Test
    void shouldRejectTamperedToken() {
        String token = jwtService.generateToken("user@email.com", "user");
        assertFalse(jwtService.isValid(token + "tampered"));
    }
}