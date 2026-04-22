# Implementation Plan: Streaming Backend System

## Overview

This implementation plan creates a comprehensive Node.js/TypeScript backend system for a streaming platform with dual authentication (Discord + Kick), real-time leaderboards, points management, raffle systems, and admin controls. The system uses PostgreSQL for data persistence, Redis for caching and real-time features, and integrates with Discord and Kick APIs.

## Tasks

- [x] 1. Project Setup and Infrastructure
  - [x] 1.1 Initialize Node.js project with TypeScript configuration
    - Create package.json with all required dependencies
    - Set up TypeScript configuration with strict mode
    - Configure ESLint and Prettier for code quality
    - Set up Jest testing framework with TypeScript support
    - _Requirements: 9.1, 9.6_

  - [x] 1.2 Set up Express.js server with middleware
    - Create Express application with TypeScript
    - Configure CORS, helmet, and security middleware
    - Set up request logging and error handling middleware
    - Configure rate limiting middleware
    - _Requirements: 10.2, 10.4_

  - [x] 1.3 Configure database connections and ORM
    - Set up Prisma ORM with PostgreSQL connection
    - Create database schema based on design specifications
    - Configure connection pooling and retry logic
    - Set up Redis connection with clustering support
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]\* 1.4 Set up Docker containerization
    - Create Dockerfile for the application
    - Create docker-compose.yml with PostgreSQL and Redis
    - Configure environment variable management
    - Set up development and production configurations
    - _Requirements: 9.5_

- [x] 2. Database Schema Implementation
  - [x] 2.1 Create core user and authentication tables
    - Implement users table with all required fields
    - Create user_sessions table for JWT token management
    - Add proper indexes for performance optimization
    - Set up foreign key constraints and data validation
    - _Requirements: 9.1, 9.2, 1.5_

  - [x] 2.2 Implement points and transaction tables
    - Create point_transactions table with audit trail
    - Set up user_statistics table for performance metrics
    - Add constraints to prevent negative point balances
    - Create indexes for transaction history queries
    - _Requirements: 9.1, 9.3, 2.6_

  - [x] 2.3 Create leaderboard and ranking tables
    - Implement leaderboard_entries table with period support
    - Add support for multiple ranking types and manual overrides
    - Create indexes for efficient ranking queries
    - Set up data retention policies for historical data
    - _Requirements: 3.1, 3.2, 2.9, 2.13_

  - [x] 2.4 Implement raffle and store tables
    - Create raffles, raffle_tickets, and raffle_winners tables
    - Set up store_items and store_purchases tables
    - Add inventory tracking and transaction integrity
    - Create bonus hunt tracking tables
    - _Requirements: 5.1, 5.2, 6.1, 4.1_

  - [x] 2.5 Set up notification and audit tables
    - Create notifications table with multi-channel support
    - Implement audit_logs table for admin action tracking
    - Add system_config table for dynamic configuration
    - Set up viewing_sessions table for points earning
    - _Requirements: 13.1, 2.6, 8.4, 12.1_

  - [x]\* 2.6 Run database migration and seed data
    - Execute Prisma migrations to create all tables
    - Create seed data for testing and development
    - Verify all constraints and relationships work correctly
    - Set up database backup and recovery procedures
    - _Requirements: 9.5, 9.6_

- [x] 3. Authentication System Implementation
  - [x] 3.1 Implement Discord OAuth integration
    - Set up Passport.js with Discord OAuth strategy
    - Create Discord authentication routes and handlers
    - Implement user profile creation from Discord data
    - Add error handling for OAuth failures
    - _Requirements: 1.1, 1.2, 7.1_

  - [ ]\* 3.2 Write property test for Discord OAuth flow
    - **Property 1: User Profile Credential Merging**
    - **Validates: Requirements 1.3**

  - [x] 3.3 Implement Kick verification system
    - Create Kick API integration for user verification
    - Build verification flow after Discord authentication
    - Merge Kick credentials with existing user profiles
    - Handle verification failures and retry logic
    - _Requirements: 1.3, 7.2_

  - [ ]\* 3.4 Write property test for authentication error handling
    - **Property 2: Authentication Error Handling**
    - **Validates: Requirements 1.4**

  - [x] 3.5 Create JWT session management
    - Implement JWT token generation and validation
    - Set up refresh token mechanism
    - Create session storage and cleanup
    - Add configurable token expiration
    - _Requirements: 1.5, 10.6_

  - [ ]\* 3.6 Write property tests for session management
    - **Property 3: Session Token Validity**
    - **Property 4: Session Invalidation Completeness**
    - **Validates: Requirements 1.5, 1.6**

  - [x] 3.7 Implement logout and session cleanup
    - Create logout endpoint with session invalidation
    - Implement cleanup of all user sessions
    - Add security logging for authentication events
    - Handle concurrent session management
    - _Requirements: 1.6, 10.5_

- [x] 4. Checkpoint - Authentication System Complete
  - Ensure all tests pass, verify Discord and Kick integration works, ask the user if questions arise.

- [x] 5. User Management Service Implementation
  - [x] 5.1 Create user profile management
    - Implement user profile CRUD operations
    - Build user statistics calculation engine
    - Create user preferences management
    - Add user search and filtering capabilities
    - _Requirements: 2.24, 2.25, 11.1_

  - [x] 5.2 Implement points management system
    - Create points addition and deduction functions
    - Build transaction history tracking
    - Implement atomic point operations
    - Add balance validation and constraints
    - _Requirements: 2.4, 2.5, 9.3_

  - [ ]\* 5.3 Write property tests for points operations
    - **Property 5: Admin Points Addition Accuracy**
    - **Property 6: Admin Points Subtraction Constraints**
    - **Validates: Requirements 2.4, 2.5, 2.6**

  - [x] 5.4 Create user statistics engine
    - Implement viewing time tracking
    - Build achievement system
    - Create performance metrics calculation
    - Add streak tracking and maintenance
    - _Requirements: 8.4, 11.1, 11.5_

  - [ ]\* 5.5 Write unit tests for user management
    - Test user profile validation and updates
    - Test statistics calculation accuracy
    - Test edge cases and error conditions
    - _Requirements: 2.24, 2.25_

- [x] 6. Leaderboard System Implementation
  - [x] 6.1 Create real-time ranking engine
    - Implement Redis-based leaderboard storage
    - Build ranking calculation algorithms
    - Create multi-period leaderboard support
    - Add real-time rank updates
    - _Requirements: 3.1, 3.3_

  - [ ]\* 6.2 Write property test for real-time updates
    - **Property 7: Real-time Metric Updates**
    - **Validates: Requirements 3.1, 3.3**

  - [x] 6.3 Implement leaderboard management
    - Create leaderboard reset functionality
    - Build manual ranking override system
    - Implement pagination for large datasets
    - Add historical ranking data storage
    - _Requirements: 3.2, 3.4, 3.5, 2.12, 2.13_

  - [x] 6.4 Create leaderboard API endpoints
    - Build REST endpoints for ranking data
    - Implement WebSocket updates for real-time changes
    - Add user rank lookup functionality
    - Create admin endpoints for management
    - _Requirements: 3.6, 2.9, 2.10_

  - [ ]\* 6.5 Write integration tests for leaderboard system
    - Test concurrent ranking updates
    - Test period transitions and resets
    - Test manual override functionality
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Raffle and Giveaway System Implementation
  - [x] 7.1 Create raffle management system
    - Implement raffle creation and configuration
    - Build ticket sales processing
    - Create inventory tracking and validation
    - Add raffle status management
    - _Requirements: 5.1, 5.2_

  - [ ]\* 7.2 Write property test for ticket inventory protection
    - **Property 10: Raffle Ticket Inventory Protection**
    - **Validates: Requirements 5.3**

  - [x] 7.3 Implement winner selection engine
    - Create cryptographically secure random selection
    - Build winner notification system
    - Implement prize distribution tracking
    - Add winner history management
    - _Requirements: 5.4, 5.7, 2.18, 2.19_

  - [ ]\* 7.4 Write property test for winner selection fairness
    - **Property 11: Raffle Winner Selection Fairness**
    - **Validates: Requirements 5.4**

  - [x] 7.5 Create raffle API endpoints
    - Build endpoints for raffle browsing and purchasing
    - Implement user ticket history
    - Create admin endpoints for raffle management
    - Add real-time updates for ticket sales
    - _Requirements: 5.5, 5.6, 2.16, 2.17_

  - [ ]\* 7.6 Write integration tests for raffle system
    - Test concurrent ticket purchases
    - Test winner selection process
    - Test prize distribution workflow
    - _Requirements: 5.1, 5.2, 5.4_

- [-] 8. Points Store System Implementation
  - [x] 8.1 Create store inventory management
    - Implement store item CRUD operations
    - Build category and pricing management
    - Create stock tracking and validation
    - Add promotional discount system
    - _Requirements: 6.1, 6.4, 2.31_

  - [x] 8.2 Implement purchase processing system
    - Create atomic purchase transactions
    - Build reward delivery engine
    - Implement refund processing
    - Add purchase history tracking
    - _Requirements: 6.2, 6.5, 6.7, 2.32_

  - [ ]\* 8.3 Write property tests for store transactions
    - **Property 12: Store Purchase Transaction Integrity**
    - **Property 13: Insufficient Points Prevention**
    - **Validates: Requirements 6.2, 6.3**

  - [x] 8.4 Create store API endpoints
    - Build endpoints for item browsing and purchasing
    - Implement user purchase history
    - Create admin endpoints for inventory management
    - Add transaction reporting and analytics
    - _Requirements: 6.6, 2.31, 2.32_

  - [ ]\* 8.5 Write unit tests for store system
    - Test inventory validation and updates
    - Test reward delivery mechanisms
    - Test refund processing logic
    - _Requirements: 6.1, 6.2, 6.7_

- [ ] 9. Checkpoint - Core Systems Complete
  - Ensure all tests pass, verify points, leaderboard, raffle, and store systems work correctly, ask the user if questions arise.

- [x] 10. Kick Integration Service Implementation
  - [x] 10.1 Create Kick API client
    - Implement Kick API authentication and requests
    - Build rate limiting and retry mechanisms
    - Create API response validation and error handling
    - Add request caching for performance
    - _Requirements: 7.2, 7.5, 7.7_

  - [ ]\* 10.2 Write property test for API retry mechanism
    - **Property 14: API Retry Exponential Backoff**
    - **Validates: Requirements 7.5**

  - [x] 10.3 Implement viewing time tracking
    - Create viewing session management
    - Build user presence validation
    - Implement anti-abuse measures
    - Add viewing statistics calculation
    - _Requirements: 8.4, 8.7_

  - [ ]\* 10.4 Write property test for viewing time points
    - **Property 15: Viewing Time Points Calculation**
    - **Validates: Requirements 8.5**

  - [x] 10.5 Create live status monitoring
    - Implement stream status polling
    - Build real-time status updates
    - Create user notification triggers
    - Add status caching and fallback
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 10.6 Build points earning engine
    - Implement viewing time point awards
    - Create engagement bonus calculations
    - Add real-time earning feedback
    - Build earning validation and verification
    - _Requirements: 8.5, 8.6, 8.8_

  - [ ]\* 10.7 Write integration tests for Kick integration
    - Test API client with mock Kick API
    - Test viewing time tracking accuracy
    - Test live status monitoring reliability
    - _Requirements: 7.2, 8.1, 8.4_

- [ ] 11. Bonus Hunt Tracking System Implementation
  - [x] 11.1 Create bonus hunt session management
    - Implement session creation and tracking
    - Build bonus buy recording system
    - Create balance and outcome calculations
    - Add session status management
    - _Requirements: 4.1, 4.2_

  - [ ]\* 11.2 Write property test for bonus hunt calculations
    - **Property 8: Bonus Hunt Calculation Accuracy**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 11.3 Implement prediction system
    - Create user prediction management
    - Build outcome validation and scoring
    - Implement points wagering and rewards
    - Add prediction history tracking
    - _Requirements: 4.5, 4.7_

  - [ ]\* 11.4 Write property test for prediction points
    - **Property 9: Bonus Hunt Points Award Correctness**
    - **Validates: Requirements 4.7**

  - [x] 11.5 Create bonus hunt API endpoints
    - Build endpoints for session management
    - Implement prediction submission and tracking
    - Create statistics and analytics endpoints
    - Add real-time session updates
    - _Requirements: 4.3, 4.6_

  - [ ]\* 11.6 Write unit tests for bonus hunt system
    - Test session calculations and statistics
    - Test prediction logic and scoring
    - Test real-time update mechanisms
    - _Requirements: 4.1, 4.2, 4.5_

- [ ] 12. Admin Dashboard Implementation
  - [x] 12.1 Create admin authentication and authorization
    - Implement role-based access control
    - Build admin session management
    - Create permission validation middleware
    - Add admin action logging
    - _Requirements: 2.1, 10.1, 10.5_

  - [x] 12.2 Implement user management interface
    - Create user search and filtering
    - Build user profile editing capabilities
    - Implement account suspension and deletion
    - Add bulk user operations
    - _Requirements: 2.24, 2.25, 2.7_

  - [x] 12.3 Create points and transaction management
    - Implement manual points adjustment
    - Build transaction history viewing
    - Create bulk points operations
    - Add audit trail management
    - _Requirements: 2.4, 2.5, 2.6, 2.8_

  - [x] 12.4 Build leaderboard management interface
    - Create ranking modification tools
    - Implement leaderboard reset functionality
    - Build prize and reward management
    - Add leaderboard configuration options
    - _Requirements: 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15_

  - [x] 12.5 Implement winner selection and management
    - Create manual and automatic winner selection
    - Build winner history and tracking
    - Implement winner notification system
    - Add prize distribution management
    - _Requirements: 2.16, 2.17, 2.18, 2.19, 2.20, 2.21, 2.22, 2.23_

  - [x] 12.6 Create system configuration management
    - Implement dynamic configuration updates
    - Build feature toggle management
    - Create system settings interface
    - Add emergency control capabilities
    - _Requirements: 2.26, 2.27, 2.30, 12.1_

  - [ ]\* 12.7 Write integration tests for admin dashboard
    - Test admin authentication and authorization
    - Test user management operations
    - Test system configuration changes
    - _Requirements: 2.1, 2.24, 2.26_

- [ ] 13. Notification System Implementation
  - [ ] 13.1 Create notification queue and delivery
    - Implement notification queue management
    - Build multi-channel delivery system
    - Create delivery status tracking
    - Add retry mechanisms for failed deliveries
    - _Requirements: 13.1, 13.4, 13.5_

  - [ ] 13.2 Implement Discord notification integration
    - Create Discord bot for notifications
    - Build message formatting and embeds
    - Implement user preference handling
    - Add Discord API error handling
    - _Requirements: 13.2_

  - [ ] 13.3 Create in-app notification system
    - Implement real-time notification display
    - Build notification history management
    - Create read/unread status tracking
    - Add notification preferences
    - _Requirements: 13.2, 13.3_

  - [ ] 13.4 Build notification templates and personalization
    - Create notification template engine
    - Implement user data personalization
    - Build template management system
    - Add localization support
    - _Requirements: 13.6_

  - [ ]\* 13.5 Write unit tests for notification system
    - Test notification queue processing
    - Test multi-channel delivery
    - Test template rendering and personalization
    - _Requirements: 13.1, 13.2, 13.6_

- [ ] 14. API Endpoints and WebSocket Implementation
  - [ ] 14.1 Create REST API endpoints
    - Implement all user-facing API endpoints
    - Build comprehensive API documentation
    - Add request validation and sanitization
    - Create consistent error response format
    - _Requirements: 10.3, 3.6_

  - [ ] 14.2 Implement WebSocket server for real-time updates
    - Create Socket.io server configuration
    - Build real-time event broadcasting
    - Implement user authentication for WebSocket
    - Add connection management and cleanup
    - _Requirements: 3.3, 8.8_

  - [ ] 14.3 Create API rate limiting and security
    - Implement endpoint-specific rate limiting
    - Build request validation and sanitization
    - Add security headers and CORS configuration
    - Create API key management for admin endpoints
    - _Requirements: 10.4, 10.3_

  - [ ]\* 14.4 Write property test for rate limiting
    - **Property 17: Rate Limiting Enforcement**
    - **Validates: Requirements 10.4**

  - [ ]\* 14.5 Write integration tests for API endpoints
    - Test all REST endpoints with various inputs
    - Test WebSocket connection and messaging
    - Test rate limiting and security measures
    - _Requirements: 10.3, 10.4_

- [ ] 15. Database Transaction and Data Integrity
  - [ ] 15.1 Implement atomic transaction management
    - Create transaction wrapper utilities
    - Build rollback mechanisms for failures
    - Implement distributed transaction handling
    - Add transaction performance monitoring
    - _Requirements: 9.3_

  - [ ]\* 15.2 Write property test for transaction atomicity
    - **Property 16: Database Transaction Atomicity**
    - **Validates: Requirements 9.3**

  - [ ] 15.3 Create data validation and constraints
    - Implement comprehensive input validation
    - Build database constraint enforcement
    - Create data sanitization utilities
    - Add referential integrity checks
    - _Requirements: 9.2, 10.3_

  - [ ] 15.4 Implement backup and recovery procedures
    - Create automated database backup system
    - Build point-in-time recovery capabilities
    - Implement data migration utilities
    - Add disaster recovery procedures
    - _Requirements: 9.5_

  - [ ]\* 15.5 Write unit tests for data integrity
    - Test transaction rollback scenarios
    - Test constraint validation
    - Test backup and recovery procedures
    - _Requirements: 9.2, 9.3, 9.5_

- [ ] 16. Configuration Management System
  - [ ] 16.1 Create configuration parser
    - Implement configuration file parsing
    - Build schema validation system
    - Create environment variable substitution
    - Add default value handling
    - _Requirements: 12.1, 12.5_

  - [ ]\* 16.2 Write property tests for configuration system
    - **Property 18: Configuration Parsing Accuracy**
    - **Property 19: Configuration Round-trip Preservation**
    - **Validates: Requirements 12.1, 12.4**

  - [ ] 16.3 Implement configuration pretty printer
    - Create configuration formatting utilities
    - Build consistent output formatting
    - Implement round-trip preservation
    - Add configuration validation reporting
    - _Requirements: 12.3, 12.4_

  - [ ]\* 16.4 Write unit tests for configuration management
    - Test parsing with various input formats
    - Test validation error reporting
    - Test pretty printing consistency
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 17. Analytics and Reporting System
  - [ ] 17.1 Create analytics data collection
    - Implement user engagement tracking
    - Build financial metrics calculation
    - Create system performance monitoring
    - Add custom analytics event tracking
    - _Requirements: 11.1, 11.2_

  - [ ] 17.2 Build reporting and dashboard system
    - Create real-time analytics dashboards
    - Implement custom date range filtering
    - Build export functionality for reports
    - Add automated report generation
    - _Requirements: 11.3, 11.4, 11.6_

  - [ ] 17.3 Implement user analytics and insights
    - Create user lifetime value calculations
    - Build retention and churn analysis
    - Implement behavioral pattern recognition
    - Add predictive analytics capabilities
    - _Requirements: 11.5_

  - [ ]\* 17.4 Write unit tests for analytics system
    - Test metrics calculation accuracy
    - Test report generation and export
    - Test data privacy compliance
    - _Requirements: 11.1, 11.2, 11.7_

- [ ] 18. Security Implementation and Hardening
  - [ ] 18.1 Implement comprehensive security measures
    - Create input validation and sanitization
    - Build SQL injection prevention
    - Implement XSS protection
    - Add CSRF protection mechanisms
    - _Requirements: 10.3_

  - [ ] 18.2 Create encryption and data protection
    - Implement data encryption at rest
    - Build secure data transmission
    - Create sensitive data masking
    - Add key management system
    - _Requirements: 10.2, 9.7_

  - [ ] 18.3 Build security monitoring and logging
    - Implement security event logging
    - Create intrusion detection system
    - Build automated threat response
    - Add security audit capabilities
    - _Requirements: 10.5, 10.7_

  - [ ]\* 18.4 Write security tests
    - Test authentication and authorization
    - Test input validation and sanitization
    - Test encryption and data protection
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 19. Checkpoint - Security and Analytics Complete
  - Ensure all tests pass, verify security measures and analytics work correctly, ask the user if questions arise.

- [ ] 20. Property-Based Testing Implementation
  - [ ] 20.1 Set up property testing framework
    - Install and configure fast-check library
    - Create custom generators for domain objects
    - Set up property test execution environment
    - Configure test reporting and coverage
    - _Requirements: All correctness properties_

  - [ ] 20.2 Implement remaining property tests
    - Create any missing property tests from previous tasks
    - Verify all 19 correctness properties are covered
    - Add property test documentation and examples
    - Configure continuous integration for property tests
    - _Requirements: All correctness properties_

  - [ ]\* 20.3 Run comprehensive property test suite
    - Execute all property tests with high iteration counts
    - Verify property test coverage and effectiveness
    - Document any property test failures or edge cases
    - Create property test maintenance procedures
    - _Requirements: All correctness properties_

- [ ] 21. Performance Optimization and Monitoring
  - [ ] 21.1 Implement performance monitoring
    - Create application performance monitoring
    - Build database query optimization
    - Implement caching strategies
    - Add memory usage monitoring
    - _Requirements: 9.4_

  - [ ] 21.2 Optimize real-time features
    - Optimize WebSocket performance
    - Improve Redis operations efficiency
    - Optimize leaderboard update performance
    - Add connection pooling optimization
    - _Requirements: 3.3, 8.8_

  - [ ]\* 21.3 Run performance tests
    - Test system under high concurrent load
    - Measure response times and throughput
    - Test memory usage and resource consumption
    - Verify scalability requirements
    - _Requirements: 9.4_

- [ ] 22. Deployment and DevOps Configuration
  - [ ] 22.1 Create production deployment configuration
    - Set up production Docker configuration
    - Create Kubernetes deployment manifests
    - Configure environment-specific settings
    - Set up health checks and monitoring
    - _Requirements: 9.5_

  - [ ] 22.2 Implement CI/CD pipeline
    - Create automated testing pipeline
    - Set up deployment automation
    - Configure staging and production environments
    - Add rollback and recovery procedures
    - _Requirements: 9.6_

  - [ ]\* 22.3 Set up monitoring and alerting
    - Configure application monitoring
    - Set up error tracking and alerting
    - Create performance dashboards
    - Add log aggregation and analysis
    - _Requirements: 10.5_

- [ ] 23. Integration and System Testing
  - [ ] 23.1 Run end-to-end integration tests
    - Test complete user workflows
    - Verify external API integrations
    - Test real-time features under load
    - Validate data consistency across services
    - _Requirements: All requirements_

  - [ ] 23.2 Perform security and penetration testing
    - Run automated security scans
    - Test authentication and authorization
    - Verify input validation and sanitization
    - Test rate limiting and abuse prevention
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]\* 23.3 Execute load and stress testing
    - Test system under maximum expected load
    - Verify graceful degradation under stress
    - Test recovery from failure scenarios
    - Validate performance requirements
    - _Requirements: 9.4_

- [ ] 24. Final System Integration and Deployment
  - [ ] 24.1 Complete system integration
    - Wire all components together
    - Verify all API endpoints work correctly
    - Test real-time features and WebSocket connections
    - Validate admin dashboard functionality
    - _Requirements: All requirements_

  - [ ] 24.2 Prepare production deployment
    - Create production configuration files
    - Set up database migrations for production
    - Configure monitoring and logging
    - Prepare deployment documentation
    - _Requirements: 9.5, 9.6_

  - [ ] 24.3 Final validation and testing
    - Run complete test suite including property tests
    - Verify all requirements are implemented
    - Test system with production-like data
    - Validate performance and security requirements
    - _Requirements: All requirements_

- [ ] 25. Final Checkpoint - System Complete
  - Ensure all tests pass, all requirements are implemented, system is ready for production deployment, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property tests validate the 19 correctness properties defined in the design document
- Checkpoints ensure incremental validation and provide opportunities for feedback
- The implementation uses TypeScript/Node.js with Express.js, PostgreSQL, and Redis
- All external API integrations include proper error handling and retry mechanisms
- Security is implemented throughout with role-based access control and data protection
- Real-time features use WebSocket connections with Redis for scalability
- Comprehensive testing includes property-based tests, unit tests, and integration tests
