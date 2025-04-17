package com.example.employeemanagement.controller;

import com.example.employeemanagement.exception.ResourceNotFoundException;
import com.example.employeemanagement.model.Employee;
import com.example.employeemanagement.service.EmployeeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.stream.Collectors;
import org.springframework.security.core.context.SecurityContextHolder;
import com.example.employeemanagement.service.DepartmentService;
import com.example.employeemanagement.model.Department;

/** This class represents the REST API controller for employees. */
@RestController
@RequestMapping("/api/employees")
@CrossOrigin(origins = "http://localhost:3000")
@Tag(name = "Employees APIs", description = "API Operations related to managing employees")
public class EmployeeController {

  /** The employee service. */
  @Autowired private EmployeeService employeeService;

  /** The department service. */
  @Autowired private DepartmentService departmentService;

  private static final Logger logger = LoggerFactory.getLogger(EmployeeController.class);

  /**
   * Get all employees API.
   *
   * @return List of all employees
   */
  @Operation(summary = "Get all employees", description = "Retrieve a list of all employees")
  @GetMapping
  public List<Employee> getAllEmployees() {
    return employeeService.getAllEmployees();
  }

  /**
   * Get employee by ID API.
   *
   * @param id ID of the employee to be retrieved
   * @return Employee with the specified ID
   */
  @Operation(
      summary = "Get employee by ID",
      description = "Retrieve a specific employee by their ID")
  @ApiResponses(
      value = {
        @ApiResponse(responseCode = "200", description = "Employee found"),
        @ApiResponse(responseCode = "404", description = "Employee not found")
      })
  @GetMapping("/{id}")
  public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
    Employee employee =
        employeeService
            .getEmployeeById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));
    return ResponseEntity.ok(employee);
  }

  /**
   * Create a new employee API.
   *
   * @param employee New employee details
   * @return New employee record
   */
  @Operation(summary = "Create a new employee", description = "Create a new employee record")
  @PostMapping
  public ResponseEntity<?> createEmployee(@RequestBody Employee employee) {
    String username = SecurityContextHolder.getContext().getAuthentication() != null ? SecurityContextHolder.getContext().getAuthentication().getName() : "anonymous";
    if (employee.getDepartment() == null || employee.getDepartment().getId() == null) {
      logger.error("User {} tried to create employee without department", username);
      return ResponseEntity.badRequest().body("Department is required");
    }
    Department department = departmentService.getDepartmentById(employee.getDepartment().getId())
      .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + employee.getDepartment().getId()));
    employee.setDepartment(department);
    logger.info("User {} is creating employee: {} {} (email: {})", username, employee.getFirstName(), employee.getLastName(), employee.getEmail());
    try {
      Employee saved = employeeService.saveEmployee(employee);
      logger.info("User {} created employee with id: {}", username, saved.getId());
      return ResponseEntity.ok(saved);
    } catch (Exception e) {
      logger.error("User {} error creating employee: {}", username, e.getMessage(), e);
      return ResponseEntity.status(500).body("Error creating employee: " + e.getMessage());
    }
  }

  /**
   * Update an existing employee API.
   *
   * @param id ID of the employee to be updated
   * @param employeeDetails Updated employee details
   * @return Updated employee record
   */
  @Operation(
      summary = "Update an existing employee",
      description = "Update an existing employee's details")
  @ApiResponses(
      value = {
        @ApiResponse(responseCode = "200", description = "Employee updated"),
        @ApiResponse(responseCode = "404", description = "Employee not found")
      })
  @PutMapping("/{id}")
  public ResponseEntity<?> updateEmployee(
      @PathVariable Long id, @RequestBody Employee employeeDetails) {
    String username = SecurityContextHolder.getContext().getAuthentication() != null ? SecurityContextHolder.getContext().getAuthentication().getName() : "anonymous";
    logger.info("User {} is updating employee with id: {}", username, id);
    try {
      Employee employee =
          employeeService
              .getEmployeeById(id)
              .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

      if (employeeDetails.getDepartment() == null || employeeDetails.getDepartment().getId() == null) {
        logger.error("User {} tried to update employee without department", username);
        return ResponseEntity.badRequest().body("Department is required");
      }
      Department department = departmentService.getDepartmentById(employeeDetails.getDepartment().getId())
        .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + employeeDetails.getDepartment().getId()));
      employee.setDepartment(department);

      employee.setFirstName(employeeDetails.getFirstName());
      employee.setLastName(employeeDetails.getLastName());
      employee.setEmail(employeeDetails.getEmail());
      employee.setAge(employeeDetails.getAge());

      Employee updatedEmployee = employeeService.saveEmployee(employee);
      logger.info("User {} updated employee with id: {}", username, updatedEmployee.getId());
      return ResponseEntity.ok(updatedEmployee);
    } catch (ResourceNotFoundException e) {
      logger.error("User {} error updating employee with id {}: {}", username, id, e.getMessage(), e);
      return ResponseEntity.status(404).body(e.getMessage());
    } catch (Exception e) {
      logger.error("User {} error updating employee with id {}: {}", username, id, e.getMessage(), e);
      return ResponseEntity.status(500).body("Error updating employee: " + e.getMessage());
    }
  }

  /**
   * Delete an employee API.
   *
   * @param id ID of the employee to be deleted
   * @return No content
   */
  @Operation(summary = "Delete an employee", description = "Delete an employee record by ID")
  @ApiResponses(
      value = {
        @ApiResponse(responseCode = "204", description = "Employee deleted"),
        @ApiResponse(responseCode = "404", description = "Employee not found")
      })
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
    String username = SecurityContextHolder.getContext().getAuthentication() != null ? SecurityContextHolder.getContext().getAuthentication().getName() : "anonymous";
    logger.info("User {} is deleting employee with id: {}", username, id);
    try {
      Employee employee =
          employeeService
              .getEmployeeById(id)
              .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

      employeeService.deleteEmployee(id);
      logger.info("User {} deleted employee with id: {}", username, id);
      return ResponseEntity.noContent().build();
    } catch (Exception e) {
      logger.error("User {} error deleting employee with id {}: {}", username, id, e.getMessage(), e);
      throw e;
    }
  }

  @GetMapping("/logs")
  public ResponseEntity<String> getLogs(@RequestParam(defaultValue = "200") int lines) {
    try {
      // Adjust the log file path as needed
      String logFilePath = "logs/application.log";
      File logFile = new File(logFilePath);
      if (!logFile.exists()) {
        return ResponseEntity.ok("Log file not found.");
      }
      List<String> allLines = Files.readAllLines(Paths.get(logFilePath));
      int from = Math.max(0, allLines.size() - lines);
      String result = allLines.subList(from, allLines.size()).stream().collect(Collectors.joining("\n"));
      return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(result);
    } catch (Exception e) {
      logger.error("Error reading logs: {}", e.getMessage(), e);
      return ResponseEntity.status(500).body("Error reading logs: " + e.getMessage());
    }
  }
}
