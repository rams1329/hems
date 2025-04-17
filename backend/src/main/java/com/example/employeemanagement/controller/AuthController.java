package com.example.employeemanagement.controller;

import com.example.employeemanagement.model.User;
import com.example.employeemanagement.repository.UserRepository;
import com.example.employeemanagement.security.JwtTokenUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Parameter;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;

/** This class represents the REST API controller for user authentication. */
@RestController
@Tag(name = "Authentication APIs", description = "API Operations related to user authentication")
public class AuthController {

  /** The authentication manager. */
  @Autowired
  private AuthenticationManager authenticationManager;

  /** The user details service. */
  @Autowired
  private UserDetailsService userDetailsService;

  /** The user repository. */
  @Autowired
  private UserRepository userRepository;

  /** The password encoder. */
  @Autowired
  private PasswordEncoder passwordEncoder;

  /** The JWT token util. */
  @Autowired
  private JwtTokenUtil jwtTokenUtil;

  /**
   * Register user API.
   *
   * @param user The user to be registered
   * @return Success message
   */
  @Operation(summary = "Register user", description = "Register a new user")
  @ApiResponses(
      value = {
          @ApiResponse(responseCode = "200", description = "User registered successfully"),
          @ApiResponse(responseCode = "409", description = "Username already exists"),
          @ApiResponse(responseCode = "500", description = "Unable to register user")
      })
  @PostMapping("/register")
  public ResponseEntity<?> registerUser(@RequestBody User user) {
    try {
      user.setPassword(passwordEncoder.encode(user.getPassword()));
      userRepository.save(user);
      return ResponseEntity.ok("User registered successfully!");
    } catch (DataIntegrityViolationException e) {
      return ResponseEntity.status(HttpStatus.CONFLICT).body("Error: Username already exists");
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: Unable to register user");
    }
  }

  /**
   * Generate MFA secret and QR code URL for Google Authenticator setup.
   */
  @PostMapping("/mfa/setup")
  public ResponseEntity<?> setupMfa(@RequestBody Map<String, String> request) {
    String username = request.get("username");
    Optional<User> userOpt = userRepository.findByUsername(username);
    if (userOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
    }
    User user = userOpt.get();
    if (user.isMfaEnabled() && user.getMfaSecret() != null) {
      return ResponseEntity.badRequest().body("MFA already enabled");
    }
    GoogleAuthenticator gAuth = new GoogleAuthenticator();
    GoogleAuthenticatorKey key = gAuth.createCredentials();
    String secret = key.getKey();
    user.setMfaSecret(secret);
    userRepository.save(user);
    String qrUrl = GoogleAuthenticatorQRGenerator.getOtpAuthURL("EmployeeMgmtApp", username, key);
    Map<String, String> response = new HashMap<>();
    response.put("secret", secret);
    response.put("qrUrl", qrUrl);
    return ResponseEntity.ok(response);
  }

  /**
   * Get MFA status for a user.
   */
  @GetMapping("/mfa/status/{username}")
  public ResponseEntity<?> getMfaStatus(@PathVariable String username) {
    Optional<User> userOpt = userRepository.findByUsername(username);
    if (userOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
    }
    User user = userOpt.get();
    Map<String, Object> resp = new HashMap<>();
    resp.put("mfaEnabled", user.isMfaEnabled());
    return ResponseEntity.ok(resp);
  }

  /**
   * Disable MFA for a user.
   */
  @PostMapping("/mfa/disable")
  public ResponseEntity<?> disableMfa(@RequestBody Map<String, String> request) {
    String username = request.get("username");
    Optional<User> userOpt = userRepository.findByUsername(username);
    if (userOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
    }
    User user = userOpt.get();
    user.setMfaEnabled(false);
    user.setMfaSecret(null);
    userRepository.save(user);
    return ResponseEntity.ok("MFA disabled");
  }

  /**
   * Enable MFA for a user after verifying the TOTP code. If code is '000000', disable MFA.
   */
  @PostMapping("/mfa/enable")
  public ResponseEntity<?> enableMfa(@RequestBody Map<String, String> request) {
    String username = request.get("username");
    String codeStr = request.get("code");
    Optional<User> userOpt = userRepository.findByUsername(username);
    if (userOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
    }
    User user = userOpt.get();
    if ("000000".equals(codeStr)) {
      user.setMfaEnabled(false);
      user.setMfaSecret(null);
      userRepository.save(user);
      return ResponseEntity.ok("MFA disabled");
    }
    if (user.getMfaSecret() == null) {
      return ResponseEntity.badRequest().body("MFA secret not set");
    }
    int code = Integer.parseInt(codeStr);
    GoogleAuthenticator gAuth = new GoogleAuthenticator();
    boolean isCodeValid = gAuth.authorize(user.getMfaSecret(), code);
    if (isCodeValid) {
      user.setMfaEnabled(true);
      userRepository.save(user);
      return ResponseEntity.ok("MFA enabled successfully");
    } else {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid MFA code");
    }
  }

  /**
   * Updated authentication to require TOTP if MFA is enabled.
   */
  @PostMapping("/authenticate")
  public ResponseEntity<?> createAuthenticationToken(@RequestBody Map<String, String> request) {
    String username = request.get("username");
    String password = request.get("password");
    String codeStr = request.get("code"); // optional
    Optional<User> userOpt = userRepository.findByUsername(username);
    if (userOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
    }
    User user = userOpt.get();
    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(username, password)
      );
      if (user.isMfaEnabled()) {
        if (codeStr == null) {
          Map<String, Object> resp = new HashMap<>();
          resp.put("mfaRequired", true);
          resp.put("mfaEnabled", true);
          return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(resp);
        }
        int code = Integer.parseInt(codeStr);
        GoogleAuthenticator gAuth = new GoogleAuthenticator();
        boolean isCodeValid = gAuth.authorize(user.getMfaSecret(), code);
        if (!isCodeValid) {
          return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid MFA code");
        }
      }
      final UserDetails userDetails = userDetailsService.loadUserByUsername(username);
      final String jwt = jwtTokenUtil.generateToken(userDetails.getUsername());
      Map<String, String> response = new HashMap<>();
      response.put("token", jwt);
      response.put("mfaEnabled", String.valueOf(user.isMfaEnabled()));
      return ResponseEntity.ok(response);
    } catch (BadCredentialsException e) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: Unable to authenticate");
    }
  }

  /**
   * Verify if a username exists.
   *
   * @param username The username to verify
   * @return Response message indicating whether the username exists
   */
  @Operation(summary = "Verify username", description = "Verify if a username exists in the system")
  @ApiResponses(
      value = {
          @ApiResponse(responseCode = "200", description = "Username exists"),
          @ApiResponse(responseCode = "404", description = "Username not found")
      })
  @GetMapping("/verify-username/{username}")
  public ResponseEntity<?> verifyUsername(@PathVariable String username) {
    Optional<User> user = userRepository.findByUsername(username);
    if (user.isPresent()) {
      return ResponseEntity.ok("Username exists");
    } else {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Error: Username not found");
    }
  }

  /**
   * Reset password for a given username.
   *
   * @param request Map containing the username and new password
   * @return Response message indicating success or failure of the operation
   */
  @Operation(summary = "Reset password", description = "Reset the password for the given username")
  @ApiResponses(
      value = {
          @ApiResponse(responseCode = "200", description = "Password reset successfully"),
          @ApiResponse(responseCode = "404", description = "Username not found"),
          @ApiResponse(responseCode = "500", description = "Unable to reset password")
      })
  @PostMapping("/reset-password")
  public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
    String username = request.get("username");
    String newPassword = request.get("newPassword");
    String codeStr = request.get("code");

    Optional<User> user = userRepository.findByUsername(username);

    if (user.isPresent()) {
      User existingUser = user.get();
      if (existingUser.isMfaEnabled()) {
        if (codeStr == null) {
          return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("MFA code required");
        }
        if (existingUser.getMfaSecret() == null) {
          return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("MFA secret not set");
        }
        int code;
        try {
          code = Integer.parseInt(codeStr);
        } catch (NumberFormatException e) {
          return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid MFA code format");
        }
        GoogleAuthenticator gAuth = new GoogleAuthenticator();
        boolean isCodeValid = gAuth.authorize(existingUser.getMfaSecret(), code);
        if (!isCodeValid) {
          return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid MFA code");
        }
      }
      existingUser.setPassword(passwordEncoder.encode(newPassword));
      userRepository.save(existingUser);
      return ResponseEntity.ok("Password reset successfully");
    } else {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Error: Username not found");
    }
  }

  /**
   * Update the user's profile image.
   */
  @PostMapping("/profile-image")
  public ResponseEntity<?> updateProfileImage(@RequestBody Map<String, String> request) {
    String username = request.get("username");
    String profileImage = request.get("profileImage");
    Optional<User> userOpt = userRepository.findByUsername(username);
    if (userOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
    }
    User user = userOpt.get();
    user.setProfileImage(profileImage);
    userRepository.save(user);
    return ResponseEntity.ok("Profile image updated successfully");
  }

  /**
   * Get the user's profile image.
   */
  @GetMapping("/profile-image/{username}")
  public ResponseEntity<?> getProfileImage(@PathVariable String username) {
    Optional<User> userOpt = userRepository.findByUsername(username);
    if (userOpt.isEmpty()) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
    }
    User user = userOpt.get();
    Map<String, String> resp = new HashMap<>();
    resp.put("profileImage", user.getProfileImage());
    return ResponseEntity.ok(resp);
  }
}
