MINDPALACE

Assignment submitted in partial fulfilment of the requirements for the subject of

Software Engineering Principles
CSI1007

by

KASINATH C A (24MID0124)
NICKY SHEBY (24MID0156)
SREE SAI MADHURIMA (24MIC0078)
BALINI (24MIC0026)

ASSIGNMENT - 1

SCHOOL OF COMPUTER SCIENCE AND ENGINEERING

18TH DECEMBER 2025

 
Scope of the Project
The project focuses on developing a centralized repository for saving, organizing, and managing web content with high fidelity.
In-Scope (Deliverables):
• Smart Ingestion: Capability to save URLs and automatically extract metadata (Title, Description, Thumbnail, Domain Name).
• Hierarchical Organization: Implementation of a nested collection system (Folders within Folders) and a flexible tagging system.
• Content Preservation: A "Permanent Copy" feature that stores a simplified HTML/Text version of the webpage to guard against broken links (404 errors).
• Advanced Filtering: Search capabilities (combining tags, dates, and domains) and sorting mechanisms.
• Annotation System: Ability to highlight text within the saved article view and attach sticky notes.
• System Health: Automated background jobs to scan for and flag broken links or duplicate entries.
Out-of-Scope (Exclusions):
• Native Mobile Apps: Development is restricted to a Responsive Web Site.

Project Objectives

1. Functional Objective: To design a database schema capable of handling recursive relationships to support infinite nesting of collections and many-to-many relationships for tagging.
2. Reliability Objective: To implement a robust "Link Health Monitor" that periodically validates stored URLs and alerts users to 404/500 errors.
3. Process Objective: To utilize the Incremental Process Model to manage the complexity of building a parsing engine and a frontend interface in parallel.
4. Archival Objective: To ensure data portability by implementing standard Bookmark File import/export functionality.

Selected Process Model
For the development of the "Mind Castle" system, the Incremental Process Model has been adopted. This approach organizes the software development lifecycle into a series of manageable iterations. Rather than attempting a monolithic release of the entire system, the project is decomposed into distinct “increments.”
The first increment is designed to deliver a core, operational product. Subsequent increments progressively expand the system's capabilities by adding new modules or refining existing functionality until the complete system specification is met. The development roadmap is structured as follows:
• Increment 1 (Core Architecture): Deployment of the fundamental URL ingestion, storage, and retrieval mechanisms.
• Increment 2 (Organizational Logic): Implementation of hierarchical structuring (nested collections), semantic tagging, and search indexing.
• Increment 3 (Advanced Features): Integration of maintenance utilities, including the broken link monitor, archival “permanent copy” generation, and public sharing interfaces.

Justification for Model Selection
The decision to utilize the Incremental Process Model is driven by the specific architectural and academic constraints of the project:

1. Modular Independence & Early Delivery The “Mind Castle” architecture is composed of distinct functional units that can be developed in isolation. The incremental approach facilitates the early deployment of a functional “Basic Version” (Increment 1). This allows for immediate internal evaluation and debugging of core features while complex components, such as the "Parsing Engine," are developed in parallel for later integration.
2. Risk Mitigation Strategy Technical risks are compartmentalized within specific increments. High-complexity features, such as the “Broken Link Monitor”, are scheduled for the final increment. This strategy ensures that potential delays or stability issues in advanced modules do not compromise the integrity of the core bookmarking functionality, which will have already been verified and finalized in Increment 1.
3. Alignment with Academic Schedule The model creates a natural synchronization with the semester-long academic timeline. The requirement to submit periodic documentation, ranging from Requirements Analysis to Testing, mirrors the iterative nature of the incremental builds, ensuring that documentation evolves concurrently with the software product.

PROCESS MODEL DESCRITION REASON FOR REJECTION
Waterfall Model A linear approach where you cannot go back to a previous phase once finished. Too Rigid. If we discover a new requirement (e.g., “we need a dark mode”) during the coding phase, the Waterfall model makes it very difficult and costly to go back and change the Design.
Prototyping Model Focuses on building a quick “mock-up” to show the user, then throwing it away to build the real app. Inefficient for Grading. In an academic setting, we need to document and keep the code we write. We cannot afford the time to write “throwaway” code just for a demo; we need to build the real system from day one.
Iterative Model Develops the system through repeated cycles where the entire application is improved in each loop. You start with a rough version of all features and refine them over time. Milestone Mismatch. The Iterative model implies constantly revisiting and changing completed work to improve it. However, our course syllabus requires strict sequential submissions (e.g., SRS in Jan, Design in Feb). The Incremental Model is better suited because it allows us to "finish and freeze" a specific module (like the Core Bookmarking) to meet a deadline, rather than keeping the whole system in a state of flux.
RAD (Rapid Application Development) Focuses on extremely fast development (60-90 days) using pre-built components and large teams. Resource Heavy. RAD requires sufficient human resources to work on multiple components in parallel. As a small student team, we do not have the manpower to execute true RAD.
Spiral Model A risk-driven model that repeats phases in a spiral, focusing heavily on risk analysis (cost/safety). Overkill. The Spiral model is designed for high-stakes, expensive projects (e.g., NASA software). “Mind Castle” does not have high financial or safety risks that justify the complex risk analysis phases of the Spiral model.
Agile (Scrum) Focuses on constant changes and daily “sprints” with a customer always present. Lack of Client. Agile requires an active “Product Owner” to give daily feedback. Since this is a course project without a real external client, the strict ceremonies of Scrum (Daily Standups, Sprint Retrospectives) are less effective than the clear milestones of the Incremental model.

Functional Modules and Submodules
To ensure efficiency and maintainability, the "Mind Castle" system is architecturally decomposed into four primary functional modules. Each module is responsible for a distinct aspect of the application's operation, from user access to data hygiene.
Module 1: User Access and Personalization Module
This module serves as the secure gateway to the application, managing user identities and individual configurations.
• Submodule 1.1: Authentication Service Responsible for verifying user identity through secure registration and login procedures. It ensures that personal data remains private and accessible only to the authorized account holder.
• Submodule 1.2: Profile and Preference Management Allows users to customize their system experience. This includes managing account credentials, adjusting visual themes (e.g., Dark Mode), and configuring default display settings for their collections.

Module 2: Content Acquisition and Parsing Module
This core module handles the entry of external data into the system, automating the process of capturing and formatting web resources.
• Submodule 2.1: Automated Metadata Extractor Upon saving a link, this component automatically scans the target website to extract essential information, including the page title, description, and preview images, eliminating the need for manual data entry.
• Submodule 2.2: Visual Asset Handler Manages the retrieval and optimization of visual identifiers, such as website icons (favicons) and thumbnail images, to provide a rich, visual browsing experience.
• Submodule 2.3: Data Migration Utility Facilitates data portability by allowing users to import existing bookmarks from standard web browsers (via HTML files) and export their "Mind Castle" library for backup purposes.

Module 3: Information Organization and Storage Module
This module defines the structural logic of the application, enabling users to categorize and manage their stored content effectively.
• Submodule 3.1: Hierarchical Collection Manager enables the creation of a nested folder structure. It supports infinite depth, allowing users to create "folders within folders" to organize content into precise sub-categories.
• Submodule 3.2: Semantic Tagging System Provides a flexible, non-hierarchical method of organization. Users can assign multiple keywords (tags) to a single bookmark, facilitating cross-reference and easy filtering.
• Submodule 3.3: Batch Operations Manager Enhances user efficiency by allowing bulk actions. Users can select multiple items simultaneously to move, delete, or modify them in a single operation.

Module 4: System Maintenance and Retrieval Module
This module operates primarily in the background to ensure data integrity and provides tools for locating specific information.
• Submodule 4.1: Link Health Monitor An automated background service that periodically validates stored URLs. It identifies "dead" links (websites that no longer exist) and flags them for the user's attention.
• Submodule 4.2: Redundancy Detector Scans the database to identify duplicate entries. If a user attempts to save a URL that already exists in another collection, the system alerts them to prevent clutter.
• Submodule 4.3: Advanced Search Engine A robust retrieval tool that allows users to find content using complex criteria. It supports filtering by date, domain, tag, or content type, ensuring users can locate specific resources instantly.

Work Breakdown Structure (WBS)
Phase 1: Planning and Requirements
1.0 Requirement Analysis Phase
• 1.1 Getting Started
o 1.1.1 Defining the Core Problem
o 1.1.2 Checking Feasibility
o 1.1.3 Finalizing the Scope (What to include/exclude)
• 1.2 Gathering Needs
o 1.2.1 Listing User Features (User Stories)
o 1.2.2 Defining System Rules (Speed & Security needs)
o 1.2.3 Checking Syllabus Requirements
• 1.3 WBS Creation
o 1.3.1 Drafting the Component List (Product WBS)
o 1.3.2 Drafting the Timeline Steps (Process WBS)
• 1.4 SRS Documentation
o 1.4.1 Writing Functional Requirements
o 1.4.2 Writing Interface Requirements (UI/UX rules)
o 1.4.3 Final Review of Requirements
Phase 2: System Design
2.0 System Design Phase
• 2.1 Designing the Data
o 2.1.1 Drawing ER Diagrams (Database relationships)
o 2.1.2 Drawing Data Flow Diagrams (How data moves)
o 2.1.3 Organizing Database Tables (Normalization)
• 2.2 Visual Modelling (UML)
o 2.2.1 Drawing Use Case Diagrams (User actions)
o 2.2.2 Drawing Class Diagrams (Code structure)
o 2.2.3 Drawing Sequence Diagrams (Logic flow)
o 2.2.4 Drawing State Diagrams (Status changes)
• 2.3 Designing the Look (UI)
o 2.3.1 Creating Sketches for Dashboard & Settings
o 2.3.2 Designing the Layout Structure
o 2.3.3 Selecting Colors and Icons
Phase 3: Implementation (Incremental)
3.0 Implementation Phase
• 3.1 Setup and Foundation
o 3.1.1 Setting up Coding Environment
o 3.1.2 Connecting Backend to Database
• 3.2 Increment 1: Core Bookmarking
o 3.2.1 Building the "Add URL" API
o 3.2.2 Creating the Link List View (Frontend)
o 3.2.3 Integrating Basic Parser Logic
• 3.3 Increment 2: Organization Features
o 3.3.1 Coding the Nested Folder System
o 3.3.2 Building the Tagging System
o 3.3.3 Integrating Search Functionality
• 3.4 Increment 3: Advanced Features
o 3.4.1 Implementing Broken Link Checker
o 3.4.2 Finalizing Browser Extension Support
Phase 4: Testing and Quality Assurance
4.0 Testing Phase
• 4.1 Preparing to Test
o 4.1.1 Writing Test Scenarios
o 4.1.2 Setting up Test Data
• 4.2 Conducting Tests
o 4.2.1 Unit Testing (Checking individual code blocks)
o 4.2.2 Integration Testing (Checking how modules connect)
o 4.2.3 System Testing (Checking the full app)
• 4.3 Specialized Testing
o 4.3.1 Speed and Load Testing
o 4.3.2 Security and Safety Checks
Phase 5: Project Management & Closure
5.0 Closure Phase
• 5.1 Estimations
o 5.1.1 Calculating Cost (COCOMO)
o 5.1.2 Calculating Effort (Halstead Metrics)
• 5.2 Scheduling
o 5.2.1 Analysing Critical Path (CPM)
o 5.2.2 Creating PERT Charts
• 5.3 Final Documents
o 5.3.1 Writing the User Manual
o 5.3.2 Compiling Final Project Report

=========================================================

1 Introduction

1.1 Purpose

This Software Requirements Specification (SRS) document provides a comprehensive and detailed description of the requirements for the Mind Palace system—a centralized web-based repository for saving, organizing, and managing web content with high fidelity.
This SRS serves multiple purposes:
• It establishes a complete understanding of what is expected from the Mind Palace system
• It provides the foundation for system design, implementation, and testing phases
• It serves as a contract between the development team and stakeholders
• It acts as a reference document throughout the software development lifecycle
Intended Audience:
• Software engineers who will design and construct the Mind Palace system
• Testing teams who will validate system functionality
• Project managers overseeing development progress
• Academic reviewers and faculty evaluating the project
• Future maintenance teams who may extend or modify the system

1.2 Scope
Product Name: Mind Palace
Product Description: Mind Palace is a web-based bookmark management and content preservation system designed to address the limitations of traditional browser bookmarks. The system provides smart organization, content archival, and proactive link maintenance capabilities.
Key Capabilities:
• Smart URL ingestion with automatic metadata extraction
• Hierarchical organization using nested collections (folders within folders)
• Flexible tagging system for cross-referencing content
• Permanent copy generation to protect against link rot (404 errors)
• Automated link health monitoring and duplicate detection
• Advanced search and filtering capabilities
• Annotation system for highlights and notes
• Import/export functionality for data portability
Benefits:
• Prevents loss of valuable web content due to broken links
• Enables sophisticated organization beyond flat bookmark lists
• Provides quick retrieval through powerful search capabilities
• Maintains accessibility to important content over time
Scope Boundaries:
In-Scope:
• Responsive web application accessible via desktop and mobile browsers
• User authentication and profile management
• URL saving with automated metadata extraction
• Nested collection (folder) system with unlimited depth
• Multi-tag assignment per bookmark
• Permanent copy archival in simplified HTML/text format
• Background link health monitoring
• Duplicate detection and notification
• Advanced search with multiple filter criteria
• Text highlighting and note-taking features
• Browser bookmark import/export (HTML format)
Out-of-Scope:
• Native mobile applications (iOS/Android apps)
• Browser extensions or plugins
• Real-time collaboration features (multiple users editing simultaneously)
• Social sharing or community features
• Integration with third-party services (Pocket, Instapaper, etc.)
• Offline mobile access
• Full webpage rendering (only simplified version)

1.3 Definitions, Acronyms, and Abbreviations

Term Definition
SRS Software Requirements Specification
URL Uniform Resource Locator - the address of a web page
API Application Programming Interface
HTML HyperText Markup Language
CSS Cascading Style Sheets
HTTPS HyperText Transfer Protocol Secure
UI User Interface
UX User Experience
JSON JavaScript Object Notation
CRUD Create, Read, Update, Delete operations
ER Entity Relationship
UML Unified Modeling Language
Bookmark A saved reference to a web URL with associated metadata
Collection A folder or container for organizing bookmarks hierarchically
Tag A keyword label attached to bookmarks for categorization
Metadata Descriptive information about a webpage (title, description, thumbnail)
Permanent Copy An archived snapshot of webpage content stored locally
Link Rot The phenomenon where URLs become invalid over time (404 errors)
LinkHealth Monitor Automated system that checks if saved URLs are still accessible
Favicon A small icon representing a website, displayed in browser tabs
Nested Collections Folders contained within other folders, supporting hierarchical organization
Batch Operations Actions performed on multiple items simultaneously

1.4 References

• Mind Palace project proposal document (Assignment 1)
• IEEE standard 830-1998 for software requirements specifications
• W3C Web Content Accessibility Guidelines (WCAG) 2.1

1.5 Overview
This SRS document is organized into six main sections:
Section 1 (Introduction): Provides an overview of the document, its purpose, scope, and key terminology.
Section 2 (Overall Description): Describes the product from a high-level perspective, including its context, main functions, user characteristics, and constraints.
Section 3 (Specific Requirements): Details the functional and non-functional requirements at a level sufficient for design and testing.
Section 4 (System Models): Presents visual models including context diagrams, data flow diagrams, and state transition diagrams.
Section 5 (Change Management Process): Outlines procedures for managing changes to this document.
Section 6 (Supporting Information): Contains use cases, use case diagrams, and detailed scenario descriptions.
2 Overall Descriptions

2.1 Product Perspective

Mind Palace is an independent, self-contained web application that operates as a standalone system. While it can import data from browser bookmark files, it does not depend on external systems for its core functionality.

2.1.1 System Interfaces

Browser Compatibility:
• The system shall interface with modern web browsers (Chrome, Firefox, Safari, Edge)
• The system shall support browser bookmark file formats for import/export
Web Server Environment:
• The system shall run on a standard web server architecture
• The system shall communicate via HTTPS protocol

2.1.2 User Interfaces

The Mind Palace user interface consists of:
• Authentication screens (Login/Registration)
• Main dashboard with collection tree navigation
• Bookmark list views with grid/list display options
• Add/Edit bookmark forms with auto-populated metadata
• Search and filter interface
• Settings and preference panels
• Annotation viewer for saved content
The interface shall follow responsive design principles, adapting to desktop, tablet, and mobile screen sizes.

2.1.3 Hardware Interfaces

Server Side:
• Standard web server hardware capable of running [specify: Node.js/Python/PHP]
• Database server for persistent storage
• Adequate storage for bookmark metadata and permanent copies
Client Side:
• Any device with a modern web browser and internet connectivity
• Minimum screen resolution: 320px width (mobile), 1024px width recommended (desktop)

2.1.4 Software Interfaces

Database Management System:
• Type: [PostgreSQL/MySQL/MongoDB]
• Purpose: Stores all user data, bookmarks, collections, tags, and permanent copies
• Communication: SQL queries (or NoSQL equivalent) via backend API
Web Browser:
• Versions: Latest two major versions of Chrome, Firefox, Safari, Edge
• Purpose: Renders user interface and handles client-side interactions
Backend Framework:
• Framework: [Express.js/Django/Laravel]
• Purpose: Handles business logic, API endpoints, and data processing
Metadata Extraction Service:
• Library/Service: [Open Graph Parser/Web Scraping Tool]
• Purpose: Extracts title, description, images from target URLs

2.1.5 Communication Interfaces

HTTP/HTTPS Protocol:
• All client-server communication via HTTPS for security
• RESTful API architecture for data exchange
• JSON format for API request/response payloads
Background Job Processing:
• Scheduled tasks for link health monitoring (every 24-48 hours)
• Queue system for processing bulk operations

2.2 Product Functions

This section provides a high-level summary of the major functions Mind Palace performs. Detailed requirements are specified in Section 3.2.

2.2.1 Module 1: User Access and Personalization

Authentication Service:
• User registration with email and password
• Secure login with session management
• Password reset functionality
Profile and Preference Management:
• User profile editing (name, email, password)
• Display preference customization (theme, default view)
• Account deletion with data export option

2.2.2 Module 2: Content Acquisition and Parsing

Automated Metadata Extractor:
• URL submission and validation
• Automatic extraction of page title, description, and thumbnail
• Domain name and favicon capture
Visual Asset Handler:
• Favicon retrieval and storage
• Thumbnail image optimization
• Placeholder generation for missing assets
Data Migration Utility:
• Import bookmarks from browser HTML files
• Export bookmarks in standard formats (HTML, JSON)
• Bulk import with duplicate detection

2.2.3 Module 3: Information Organization and Storage

Hierarchical Collection Manager:
• Creation of nested collections (folders within folders)
• Drag-and-drop reorganization
• Collection renaming and deletion
• Support for unlimited nesting depth
Semantic Tagging System:
• Tag creation and assignment
• Multiple tags per bookmark
• Tag-based filtering and search
• Tag management (rename, merge, delete)
Batch Operations Manager:
• Multi-select bookmark capability
• Bulk move to different collection
• Bulk tag assignment/removal
• Bulk deletion with confirmation

2.2.4 Module 4: System Maintenance and Retrieval

Link Health Monitor:
• Periodic automated checking of stored URLs (every 24-48 hours)
• Detection of broken links (404, 500, timeout errors)
• User notification of dead links
• Status badge display on bookmarks
Redundancy Detector:
• Duplicate URL detection during save operation
• Alert with existing bookmark location
• Option to add to additional collections
Advanced Search Engine:
• Full-text search across titles and descriptions
• Multi-criteria filtering (tags, date range, domain, status)
• Sort options (date added, alphabetical, domain)
• Saved search queries

2.3 User Characteristics

Target User Profiles:
Profile 1: Student/Researcher
• Age: 18-30
• Technical Expertise: Moderate
• Usage: Collecting research materials, academic articles, reference links
• Needs: Strong organization, search capabilities, annotation features
Profile 2: Professional/Knowledge Worker
• Age: 25-55
• Technical Expertise: Moderate to High
• Usage: Saving industry articles, tools, documentation, project resources
• Needs: Efficient categorization, quick retrieval, reliability
Profile 3: General Web User
• Age: Any
• Technical Expertise: Low to Moderate
• Usage: Saving recipes, articles, shopping links, entertainment content
• Needs: Simple interface, visual organization, mobile accessibility
General User Characteristics:
• Expected to have basic web browsing skills
• Familiar with folder/file organization concepts
• May or may not have experience with bookmark management tools
• Expects intuitive, self-explanatory interfaces
• Values data security and privacy

2.4 Constraints

Technical Constraints:
• Must be developed as a web application (no native apps)
• Must follow the Incremental Process Model as per academic requirements
• Database must support recursive relationships for nested collections
• Must use open-source technologies (budget constraint)
Development Constraints:
• Development team size: 4 members
• Development timeline: One academic semester
• Must meet milestone submission deadlines for academic evaluation
• Limited to technologies covered in coursework
Regulatory Constraints:
• Must comply with data privacy principles
• User passwords must be encrypted
• Must provide data export capability (data portability)

2.5 Assumptions and Dependencies

Assumptions:
• Users have reliable internet connectivity
• Users have access to modern web browsers
• Target websites allow metadata scraping
• Users are willing to create accounts for personalized storage
Dependencies:
• Availability of web hosting infrastructure
• Stability of chosen database system
• Continued support for selected development frameworks
• Accessibility of target URLs for metadata extraction
• Browser bookmark export functionality remains standardized

3 Specific Requirements

3.1 External Interface Requirements

3.1.1 User Interfaces

Table 1: Authentication Interface Screens

Screen Name Description Key Elements
Login Screen Allows existing users to access their account Email field, Password field, "Remember Me" checkbox, Login button, "Forgot Password?" link, "Sign Up" link
Registration Screen Allows new users to create an account Name field, Email field, Password field, Confirm Password field, Terms acceptance checkbox, Register button
Password Reset Screen Enables users to reset forgotten passwords Email field, Submit button, Instructions text

Table 2: Main Application Interface Screens

Screen Name Description Key Elements
Dashboard Central hub showing collections and recent bookmarks Collection tree navigation (left sidebar), Bookmark grid/list view (main area), Search bar (top), Add Bookmark button, User menu (top-right)
Add/Edit Bookmark Form for creating or modifying bookmarks URL input field (with auto-fetch button), Title field (auto-populated), Description field (auto-populated), Thumbnail preview, Collection selector (dropdown/tree), Tag input (with autocomplete), Save button, Cancel button
Collection Management Interface for organizing folder structure Collection tree view, New Collection button, Rename/Delete options (right-click menu), Drag-and-drop zones
Search/Filter View Advanced search and filtering interface Search input box, Filter panel (tags, date range, domain, status), Sort dropdown, Results count, Clear filters button
Bookmark Detail View Displays full bookmark information with permanent copy Bookmark metadata display, Permanent copy content (if available), Annotation tools (highlight, note), Edit/Delete buttons, Link health status indicator
Settings Screen User preferences and account management Profile section (name, email, password change), Preferences section (theme, default view, notification settings), Data Management section (import/export buttons), Account deletion option
Tag Management Interface for managing all tags List of all tags with usage count, Rename tag option, Merge tags option, Delete tag option (with warning), Color coding option
Import/Export Handles data migration Import section (file upload, format selection), Export section (format selection, download button), Progress indicator for bulk operations

UI Design Constraints:
• Responsive design: Must adapt to screen widths from 320px (mobile) to 1920px+ (desktop)
• Accessibility: Minimum WCAG 2.1 Level AA compliance
• Theme support: Light and dark mode options
• Consistency: Unified color scheme, typography, and component styling across all screens
• Loading states: Clear indicators for asynchronous operations
• Error messages: Contextual, helpful error messages near relevant fields

3.1.2 Hardware Interfaces

Server Hardware:
• The system shall operate on standard web server hardware
• No specialized hardware required
• Storage capacity dependent on number of users and bookmark volume
Client Hardware:
• The system shall be accessible from any device with:
o Modern web browser capability
o Internet connectivity (minimum 1 Mbps recommended)
o Screen display (minimum 320px width)
o Input method (keyboard/mouse or touchscreen)

3.1.3 Software Interfaces

Interface 1: Database Management System
• Component Name: [PostgreSQL/MySQL]
• Version: [Specify version]
• Purpose: Persistent storage of all application data
• Data Exchange: SQL queries via ORM (Object-Relational Mapping)
• Key Operations: CRUD operations on users, bookmarks, collections, tags, annotations
Interface 2: Web Browser
• Component Name: Modern Web Browsers
• Supported Versions:
o Chrome 90+
o Firefox 88+
o Safari 14+
o Edge 90+
• Purpose: Render user interface and execute client-side JavaScript
• Data Exchange: HTML, CSS, JavaScript via HTTPS
Interface 3: Backend Framework
• Component Name: [Express.js/Django/Laravel]
• Version: [Specify version]
• Purpose: Application logic, routing, API endpoints
• Communication: RESTful API with JSON payloads
Interface 4: Metadata Extraction Library
• Component Name: [Open Graph Parser/Cheerio/BeautifulSoup]
• Version: [Specify version]
• Purpose: Parse target webpages to extract metadata
• Input: URL string
• Output: JSON object with title, description, images, favicon

3.1.4 Communication Interfaces

HTTP/HTTPS Protocol:
• All communication between client and server shall use HTTPS
• Port: 443 (standard HTTPS)
• Certificate: Valid SSL/TLS certificate required for production
RESTful API:
• Endpoint structure: /api/v1/[resource]
• Methods: GET, POST, PUT, DELETE
• Data format: JSON
• Authentication: JWT (JSON Web Token) or session-based
Example API Endpoints:
• POST /api/v1/bookmarks - Create new bookmark
• GET /api/v1/bookmarks - Retrieve user's bookmarks
• PUT /api/v1/bookmarks/{id} - Update bookmark
• DELETE /api/v1/bookmarks/{id} - Delete bookmark
• GET /api/v1/collections - Retrieve collection tree
• POST /api/v1/tags - Create new tag
WebSocket (Optional for Real-time Features):
• If implementing real-time link health notifications
• Protocol: WSS (WebSocket Secure)

3.2 Functional Requirements

Functional requirements define what the system must do. Requirements are organized by module and submodule, with each requirement assigned a unique identifier.

3.2.1 User Access and Personalization Module

3.2.1.1 Authentication Service

FR-1.1.1: User Registration
• Description: The system shall allow new users to create accounts.
• Input: Name, email address, password
• Process: Validate email format, check for existing account, hash password, store user record
• Output: Success confirmation and automatic login, or error message
• Priority: High
• Acceptance Criteria:
o Email must be valid format and unique
o Password must meet minimum security requirements (8+ characters, mix of letters/numbers)
o User receives welcome email upon successful registration

FR-1.1.2: User Login
• Description: The system shall authenticate registered users.
• Input: Email address and password
• Process: Validate credentials against database, create session
• Output: Access to user's dashboard or error message
• Priority: High
• Acceptance Criteria:
o Invalid credentials result in clear error message
o Successful login redirects to dashboard
o Session persists for [specify duration] or until logout

FR-1.1.3: Password Reset
• Description: The system shall allow users to reset forgotten passwords.
• Input: Email address
• Process: Generate secure reset token, send reset email, validate token, allow password update
• Output: Password reset confirmation
• Priority: Medium
• Acceptance Criteria:
o Reset link expires after 1 hour
o User receives email with reset instructions
o Old password becomes invalid after reset

FR-1.1.4: User Logout
• Description: The system shall allow users to securely end their session.
• Input: User clicks logout button
• Process: Destroy session, clear authentication tokens
• Output: Redirect to login page
• Priority: High

3.2.1.2 Profile and Preference Management

FR-1.2.1: Profile Editing
• Description: The system shall allow users to update profile information.
• Input: Updated name, email, password
• Process: Validate changes, update database
• Output: Confirmation message
• Priority: Medium

FR-1.2.2: Theme Selection
• Description: The system shall provide light and dark theme options.
• Input: User selects theme from settings
• Process: Store preference, apply CSS theme
• Output: Interface updates to selected theme
• Priority: Low

FR-1.2.3: Default View Configuration
• Description: The system shall allow users to set default bookmark view (grid/list).
• Input: View preference selection
• Process: Store preference in user profile
• Output: Dashboard loads with preferred view
• Priority: Low

3.2.2 Content Acquisition and Parsing Module

3.2.2.1 Automated Metadata Extractor

FR-2.1.1: URL Submission
• Description: The system shall accept URL input for bookmark creation.
• Input: Valid URL string
• Process: Validate URL format, check for duplicates
• Output: Proceed to metadata extraction or show duplicate warning
• Priority: High
• Acceptance Criteria:
o URL must include protocol (http:// or https://)
o Invalid URLs show clear error message
o Duplicate URLs trigger warning with location of existing bookmark

FR-2.1.2: Automatic Title Extraction
• Description: The system shall automatically extract page title from target URL.
• Input: Valid URL
• Process: Fetch webpage, parse HTML, extract <title> tag or Open Graph title
• Output: Auto-populate title field in bookmark form
• Priority: High
• Acceptance Criteria:
o Extraction completes within 5 seconds
o User can manually override auto-extracted title
o Fallback to URL if title unavailable

FR-2.1.3: Automatic Description Extraction
• Description: The system shall extract page description/summary.
• Input: Valid URL
• Process: Parse meta description or Open Graph description tag
• Output: Auto-populate description field
• Priority: Medium
• Acceptance Criteria:
o Description limited to 500 characters
o User can edit or clear description

FR-2.1.4: Thumbnail Extraction
• Description: The system shall extract representative image for bookmark.
• Input: Valid URL
• Process: Parse Open Graph image, Twitter Card image, or first significant image
• Output: Display thumbnail preview, store image URL
• Priority: Medium
• Acceptance Criteria:
o Image displayed as preview in bookmark form
o Fallback to placeholder if no image found
o User can select different image if multiple available

FR-2.1.5: Domain Name and Favicon Extraction
• Description: The system shall identify source domain and fetch favicon.
• Input: Valid URL
• Process: Parse domain from URL, fetch favicon from standard location
• Output: Store domain name, display favicon icon
• Priority: Low

3.2.2.2 Visual Asset Handler

FR-2.2.1: Favicon Storage
• Description: The system shall retrieve and store website favicons.
• Input: Domain URL
• Process: Fetch favicon from /favicon.ico or link tag, store locally
• Output: Favicon available for display
• Priority: Low

FR-2.2.2: Thumbnail Optimization
• Description: The system shall optimize and store thumbnail images.
• Input: Source image URL
• Process: Download image, resize to standard dimensions, compress
• Output: Optimized thumbnail stored locally
• Priority: Low

3.2.2.3 Data Migration Utility

FR-2.3.1: Browser Bookmark Import
• Description: The system shall import bookmarks from browser HTML files.
• Input: HTML bookmark file upload
• Process: Parse HTML structure, extract URLs and titles, create bookmarks, preserve folder structure as collections
• Output: Bookmarks added to user account, import summary report
• Priority: Medium
• Acceptance Criteria:
o Supports Chrome, Firefox, Safari, Edge bookmark export formats
o Shows progress indicator for large imports
o Detects and reports duplicates
o Preserves folder hierarchy

FR-2.3.2: Bookmark Export
• Description: The system shall export user's bookmarks to standard formats.
• Input: User initiates export, selects format (HTML/JSON)
• Process: Generate bookmark file in requested format
• Output: Downloadable file
• Priority: Medium
• Acceptance Criteria:
o HTML export compatible with browsers
o JSON export includes all metadata
o Export preserves collection hierarchy

3.2.3 Information Organization and Storage Module

3.2.3.1 Hierarchical Collection Manager

FR-3.1.1: Collection Creation
• Description: The system shall allow creation of named collections (folders).
• Input: Collection name, optional parent collection
• Process: Validate name, create collection record with parent reference
• Output: New collection appears in hierarchy
• Priority: High
• Acceptance Criteria:
o Collection names must be unique within parent
o Support for unlimited nesting depth
o Default "Uncategorized" collection for ungrouped bookmarks
FR-3.1.2: Nested Collection Support
• Description: The system shall support collections within collections (infinite depth).
• Input: Parent collection selection during creation
• Process: Store parent-child relationship in database
• Output: Tree structure display in interface
• Priority: High
• Acceptance Criteria:
o Tree navigation shows expand/collapse controls
o Breadcrumb trail shows current location
o Moving collection moves all child collections and bookmarks
FR-3.1.3: Collection Management
• Description: The system shall allow renaming and deleting collections.
• Input: Collection action (rename/delete)
• Process: Update collection record or delete with cascade options
• Output: Updated collection list
• Priority: High
• Acceptance Criteria:
o Rename updates all references
o Delete requires confirmation
o Delete options: move bookmarks to parent, or delete bookmarks too
FR-3.1.4: Drag-and-Drop Organization
• Description: The system shall support drag-and-drop for reorganizing collections and bookmarks.
• Input: User drags bookmark/collection to new location
• Process: Update parent references
• Output: Visual update of hierarchy
• Priority: Medium

3.2.3.2 Semantic Tagging System

FR-3.2.1: Tag Creation and Assignment
• Description: The system shall allow creation and assignment of tags to bookmarks.
• Input: Tag name(s), target bookmark(s)
• Process: Create tag if new, create bookmark-tag association
• Output: Tag(s) displayed on bookmark
• Priority: High
• Acceptance Criteria:
o Multiple tags per bookmark
o Autocomplete suggests existing tags during input
o Tags are case-insensitive
FR-3.2.2: Tag Management Interface
• Description: The system shall provide interface for managing all tags.
• Input: User accesses tag management
• Process: Display all tags with usage counts
• Output: List of tags with management options
• Priority: Medium
• Acceptance Criteria:
o Show bookmark count per tag
o Rename tag updates all bookmarks
o Delete tag removes from all bookmarks with confirmation
o Merge tags combines into single tag
FR-3.2.3: Tag-Based Filtering
• Description: The system shall filter bookmarks by selected tags.
• Input: Tag selection(s)
• Process: Query bookmarks with matching tags (AND/OR logic)
• Output: Filtered bookmark list
• Priority: High

3.2.3.3 Batch Operations Manager

FR-3.3.1: Multi-Select Bookmarks
• Description: The system shall allow selection of multiple bookmarks simultaneously.
• Input: Checkbox selection or Ctrl/Cmd+Click
• Process: Track selected bookmark IDs
• Output: Visual indication of selected items, batch action menu appears
• Priority: Medium
FR-3.3.2: Batch Move
• Description: The system shall move multiple bookmarks to different collection at once.
• Input: Selected bookmarks, target collection
• Process: Update collection reference for all selected items
• Output: Bookmarks appear in new collection
• Priority: Medium
FR-3.3.3: Batch Tag Operations
• Description: The system shall add or remove tags from multiple bookmarks at once.
• Input: Selected bookmarks, tag(s) to add/remove
• Process: Create or delete bookmark-tag associations
• Output: Updated tag display on affected bookmarks
• Priority: Medium
FR-3.3.4: Batch Delete
• Description: The system shall delete multiple bookmarks simultaneously.
• Input: Selected bookmarks, delete confirmation
• Process: Delete bookmark records
• Output: Bookmarks removed from view
• Priority: High
• Acceptance Criteria:
o Requires explicit confirmation
o Shows count of items to be deleted
o Cannot be undone warning

3.2.4 System Maintenance and Retrieval Module

3.2.4.1 Link Health Monitor

FR-4.1.1: Automated Link Checking
• Description: The system shall periodically check stored URLs for accessibility.
• Input: Scheduled trigger (every 24-48 hours)
• Process: Iterate through bookmarks, send HTTP HEAD requests, record status codes
• Output: Updated link status in database
• Priority: Medium
• Acceptance Criteria:
o Checks run in background without user intervention
o Does not impact system performance during peak usage
o Retry failed checks once before marking as broken
FR-4.1.2: Broken Link Detection
• Description: The system shall identify and flag broken links (404, 500, timeout).
• Input: HTTP response codes from link check
• Process: Mark bookmark status based on response
• Output: Visual indicator on broken bookmarks
• Priority: Medium
• Acceptance Criteria:
o 404 status marked as "Not Found"
o 500 status marked as "Server Error"
o Timeout marked as "Unreachable"
o Bookmark remains accessible with warning
FR-4.1.3: User Notification
• Description: The system shall notify users of newly detected broken links.
• Input: Broken links detected in health check
• Process: Generate notification or email summary
• Output: User alert with list of affected bookmarks
• Priority: Low
• Acceptance Criteria:
o Notification appears in dashboard
o Option to disable notifications in settings
o Weekly summary email (optional)
FR-4.1.4: Manual Link Check
• Description: The system shall allow users to manually check specific bookmark links.
• Input: User selects bookmark and clicks "Check Link" button
• Process: Immediate HTTP request to URL
• Output: Real-time status update
• Priority: Low

3.2.4.2 Redundancy Detector

FR-4.2.1: Duplicate Detection on Save
• Description: The system shall detect duplicate URLs when saving new bookmarks.
• Input: URL being saved
• Process: Query database for existing bookmark with same URL
• Output: Warning dialog if duplicate found
• Priority: Medium
• Acceptance Criteria:
o Shows location (collection) of existing bookmark
o Allows user to proceed anyway (bookmark can exist in multiple collections)
o Offers option to navigate to existing bookmark
FR-4.2.2: Scan for Existing Duplicates
• Description: The system shall provide a tool to scan entire library for duplicate URLs
• Processing: Query database for URLs appearing multiple times
• Output: Report listing all duplicates grouped by URL
• Actions: Allow user to merge, delete, or keep duplicates
• Priority: Medium
FR-4.2.3: Similar URL Detection
• Description: The system shall detect similar URLs that may be duplicates (same domain/path with different parameters)
• Processing: Fuzzy matching on URLs, flag potential duplicates
• Output: List of possibly duplicate bookmarks for user review
• Priority: Low

3.2.4.3 Advanced Search Engine

FR-4.3.1: Keyword Search
• Description: The system shall allow users to search bookmarks by keywords in title, description, or URL
• Input: Search query string
• Processing: Full-text search across relevant fields
• Output: Ranked results list with matching terms highlighted
• Performance: Return results within 1 second for up to 10,000 bookmarks
• Priority: High
FR-4.3.2: Filter by Tags
• Description: The system shall allow users to filter bookmarks by one or multiple tags
• Input: Tag selection (AND/OR logic)
• Processing: Query database for bookmarks with selected tag(s)
• Output: Filtered list of matching bookmarks
• Priority: High
FR-4.3.3: Filter by Date Range
• Description: The system shall allow users to filter bookmarks by date added
• Input: Start date and end date (or relative ranges like "last week")
• Processing: Filter by created_at timestamp
• Output: Bookmarks added within specified range
• Priority: Medium
FR-4.3.4: Filter by Domain
• Description: The system shall allow users to filter bookmarks by website domain
• Input: Domain name or selection from domain list
• Processing: Filter by stored domain field
• Output: All bookmarks from selected domain(s)
• Priority: Medium
FR-4.3.5: Combined Filters
• Description: The system shall allow users to combine multiple filter criteria
• Processing: Apply all selected filters with AND logic
• Output: Bookmarks matching all criteria
• Save: Option to save frequently used filter combinations
• Priority: Medium
FR-4.3.6: Sort Results
• Description: The system shall allow users to sort bookmarks by various criteria
• Options: Date added (newest/oldest), alphabetical (A-Z/Z-A), domain name
• Processing: SQL ORDER BY query
• Output: Re-ordered bookmark list
• Priority: Medium
FR-4.3.7: Search Within Permanent Copies
• Description: The system shall allow users to search text content of saved permanent copies
• Input: Search keywords
• Processing: Full-text search on stored HTML/text content
• Output: Bookmarks containing keywords in saved content
• Priority: Low
FR-4.3.8: Annotation Features
FR-4.3.8.1: Highlight Text
• Description: The system shall allow users to highlight important text within saved permanent copies
• Input: User selects text, chooses highlight action
• Processing: Store text position/range and highlight color
• Output: Highlighted text displayed when viewing bookmark
• Colors: Provide 3-5 highlight color options
• Priority: Low
FR-4.3.8.2: Add Notes
• Description: The system shall allow users to attach sticky notes/comments to bookmarks
• Input: Note text (max 1000 characters)
• Processing: Store note associated with bookmark ID
• Output: Note icon displayed on bookmark, note visible on detail view
• Priority: Low

3.3 Non-functional Requirements

3.3.1 Performance Requirements

NFR-PERF-1: Page Load Time

- The system shall load any application page within 2 seconds under a normal load of up to 100 concurrent users.
- Measurement: Time from HTTP request initiation to full DOM content loaded event.

NFR-PERF-2: Search Response Time

- The system shall return search results within 1 second for a user library containing up to 10,000 bookmarks.
- Measurement: Time from query submission to full results list rendered on screen.

NFR-PERF-3: Metadata Extraction Timeout

- The metadata extraction service shall complete extraction within 10 seconds of URL submission.
- If extraction exceeds 10 seconds, the system shall timeout gracefully, save the bookmark with the raw URL as the title, and allow the user to enter metadata manually.

NFR-PERF-4: Concurrent User Capacity

- The system shall support a minimum of 100 simultaneous active users without any degradation in response time beyond the limits specified in NFR-PERF-1 and NFR-PERF-2.

NFR-PERF-5: API Response Time

- All RESTful API endpoints shall respond within 500 milliseconds for standard CRUD operations on a database of up to 100,000 total bookmark records (across all users).

NFR-PERF-6: Link Health Monitor Throughput

- The automated link health monitoring job shall process a minimum of 1,000 URLs per hour without consuming more than 20% of available server CPU during the scheduled run.

NFR-PERF-7: Import Processing

- Bulk bookmark imports of up to 1,000 bookmarks from an HTML file shall complete within 60 seconds, with a real-time progress indicator updated at minimum every 5 seconds.

  3.3.2 Safety Requirements

NFR-SAFE-1: Automated Data Backup

- All user data stored in the database shall be automatically backed up at minimum once every 24 hours.
- Backup files shall be stored in a separate location from the primary database server.
- A minimum of 7 days of rolling daily backups shall be retained at all times.

NFR-SAFE-2: Disaster Recovery

- The system shall be recoverable to its last successful backup state within 4 hours following a catastrophic failure.
- A documented recovery procedure shall exist and be tested at least once during the project lifecycle.

NFR-SAFE-3: Input Validation

- All data submitted by users through any interface (forms, API calls, file uploads) shall be validated for type, format, length, and allowed character sets before being processed or stored.
- Invalid input shall be rejected with a descriptive error message; it shall never be silently discarded or allowed to corrupt the database.

NFR-SAFE-4: Transaction Atomicity

- Any database operation that involves multiple dependent steps (e.g., saving a bookmark and creating its tag associations simultaneously) shall be wrapped in a database transaction.
- If any step within the transaction fails, the entire transaction shall be rolled back to prevent partial or inconsistent data states.

NFR-SAFE-5: Graceful External Failure Handling

- Failures in external dependencies such as the metadata extraction library or URL health checking service shall not cause application crashes, data loss, or an unresponsive interface.
- The system shall catch all external exceptions, log them, and present the user with a clear, non-technical error message.

NFR-SAFE-6: File Upload Safety

- Uploaded files (e.g., HTML bookmark import files) shall be validated for file type and scanned for malicious content before processing.
- Maximum upload file size shall be restricted to 10 MB.

  3.3.3 Security Requirements

NFR-SEC-1: Password Hashing

- All user passwords shall be hashed using the bcrypt algorithm with a minimum work factor (cost) of 12 before storage.
- Plaintext passwords shall never be stored in the database, logged, or transmitted over any channel.

NFR-SEC-2: Encrypted Communication

- All communication between the client browser and the web server shall be conducted exclusively over HTTPS using TLS version 1.2 or higher.
- Any HTTP requests shall be automatically redirected to HTTPS.

NFR-SEC-3: SQL Injection Prevention

- All database interactions shall use parameterized queries or a vetted Object-Relational Mapping (ORM) library.
- Direct string concatenation of user input into SQL query strings is strictly prohibited.

NFR-SEC-4: Cross-Site Scripting (XSS) Prevention

- All user-supplied content rendered in HTML pages (bookmark titles, descriptions, notes) shall be HTML-escaped before output.
- The Content Security Policy (CSP) HTTP header shall be configured to restrict execution of inline scripts.

NFR-SEC-5: Cross-Site Request Forgery (CSRF) Protection

- All state-changing operations submitted via HTML forms shall be protected by CSRF tokens.
- All state-changing API endpoints shall validate that requests originate from the authenticated session.

NFR-SEC-6: Session Management

- Authenticated user sessions shall automatically expire after 30 minutes of inactivity.
- Upon logout, the server-side session shall be fully invalidated and the session cookie cleared from the browser.
- Session tokens shall be cryptographically random and shall not contain any predictable user identifiers.

NFR-SEC-7: Brute-Force Protection

- The login endpoint shall enforce rate limiting: after 5 consecutive failed login attempts from the same IP address or user account, further attempts shall be blocked for a minimum of 15 minutes.

NFR-SEC-8: Authorization Enforcement

- Every API endpoint that accesses or modifies user data shall verify that the authenticated user is the owner of the requested resource.
- Attempting to access another user's bookmarks, collections, or annotations shall return an HTTP 403 Forbidden response.

NFR-SEC-9: Sensitive Data Exposure

- The system shall never expose internal error stack traces, database structure details, or system paths to end users in production mode.
- All sensitive configuration values (API keys, database credentials) shall be stored in environment variables, not in source code.

  3.3.4 Software Quality Attributes

  3.3.4.1 Reliability

NFR-REL-1: Module Fault Isolation

- A failure in any single functional module (e.g., the Link Health Monitor) shall not cause a crash or loss of functionality in any other module.
- All module-level exceptions shall be caught and handled locally.

NFR-REL-2: External Service Fault Tolerance

- If an external website is unreachable during metadata extraction or link health checking, the system shall log the failure and continue processing remaining items without interruption.
- A single unresponsive external URL shall not block or delay the processing of other bookmarks.

NFR-REL-3: Database Integrity Constraints

- All tables in the database shall enforce referential integrity through defined foreign key constraints.
- Cascading delete rules shall be explicitly defined for all parent-child relationships (e.g., deleting a user deletes their bookmarks, collections, and annotations).

NFR-REL-4: Error Logging

- All system-level exceptions, unhandled errors, and background job failures shall be written to a persistent log file with a timestamp, error type, module name, and stack trace.
- Logs shall be retained for a minimum of 30 days.

  3.3.4.2 Availability

NFR-AVAIL-1: System Uptime Target

- The system shall maintain a minimum uptime of 99% during all academic evaluation and submission periods as defined in the project schedule.
- Unplanned downtime shall not exceed a cumulative total of 7.2 hours per month.

NFR-AVAIL-2: Planned Maintenance Notification

- Any scheduled maintenance that requires the application to be taken offline shall be announced to active users at least 24 hours in advance via a notification displayed on the dashboard.
- Planned maintenance shall be scheduled during low-usage periods (between 02:00 and 05:00 local server time).

NFR-AVAIL-3: Degraded Mode Operation

- If the metadata extraction service is unavailable, users shall still be able to save bookmarks by manually entering the title and description. The system shall display a clear notification that automatic metadata fetching is temporarily unavailable.
- If the link health monitoring service fails to run, it shall not affect the user's ability to add, view, edit, or delete bookmarks.

NFR-AVAIL-4: Recovery Time Objective (RTO)

- Following an unplanned outage, the system shall be restored to full operational status within a maximum of 4 hours.

NFR-AVAIL-5: Recovery Point Objective (RPO)

- In the event of a catastrophic data loss, no more than 24 hours of user data shall be unrecoverable, consistent with the daily backup schedule defined in NFR-SAFE-1.

  3.3.4.3 Maintainability

NFR-MAINT-1: Coding Standards

- All source code shall adhere to a documented and consistently applied style guide appropriate for the chosen programming language (e.g., PEP 8 for Python, Airbnb style guide for JavaScript).
- Code reviews shall be conducted by at least one other team member before merging any feature branch.

NFR-MAINT-2: Modular Architecture

- The codebase shall be organized into directories and modules that directly correspond to the four functional modules defined in Section 2.2.
- No module shall directly access the internal data structures of another module; all inter-module communication shall occur through defined interfaces or service layers.

NFR-MAINT-3: Inline Code Documentation

- All public functions, class definitions, and API endpoint handlers shall include documentation comments describing their purpose, input parameters, return values, and any exceptions they may raise.

NFR-MAINT-4: API Documentation

- All RESTful API endpoints shall be documented in a centralized specification (e.g., OpenAPI/Swagger), listing the endpoint URL, HTTP method, request body schema, response schema, and possible error codes.

NFR-MAINT-5: Version Control Practices

- All source code shall be managed in a Git repository.
- Commit messages shall follow a consistent format describing the change made (e.g., "feat: add duplicate URL detection on save").
- Feature development shall occur on separate branches, merged into the main branch via pull requests.

NFR-MAINT-6: Test Coverage

- All critical-priority functional requirements (marked Priority: High) shall have corresponding unit tests.
- Minimum aggregate unit test coverage for the backend business logic layer shall be 70%.

  3.3.4.4 Portability

NFR-PORT-1: Server Operating System Compatibility

- The backend application shall run without modification on Windows Server, macOS, and Linux (Ubuntu 20.04 LTS or later) server environments.
- All file path handling in the application code shall use OS-agnostic path construction methods.

NFR-PORT-2: Client Browser Compatibility

- The frontend user interface shall render correctly and all interactive functionality shall operate as specified on the latest two major stable releases of: Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge.

NFR-PORT-3: Database Abstraction

- The application's data access layer shall communicate with the database exclusively through an ORM (Object-Relational Mapper), such that the underlying database engine (e.g., PostgreSQL, MySQL) can be changed by modifying configuration settings and running migration scripts, without altering application business logic code.

NFR-PORT-4: Deployment Independence

- The application shall have no hard-coded dependencies on a specific hosting provider or cloud platform.
- All environment-specific configuration (database host, port, credentials) shall be externalized to configuration files or environment variables.

NFR-PORT-5: Data Portability

- All user data shall be exportable in standard, open formats (HTML and JSON) as specified in FR-2.3.2, ensuring users are not locked into the Mind Palace platform.

  3.3.4.5 Usability

NFR-USAB-1: Learnability

- A new user with no prior experience with Mind Palace shall be able to successfully create an account and save their first bookmark within 2 minutes of first accessing the application, without consulting any help documentation.

NFR-USAB-2: Interaction Efficiency

- All primary, frequently-performed tasks—including saving a new bookmark, searching for a bookmark, and moving a bookmark to a different collection—shall be completable within a maximum of 3 user interactions (clicks, keystrokes, or form submissions) from the main dashboard.

NFR-USAB-3: Accessibility Compliance

- The user interface shall meet WCAG 2.1 Level AA standards. This includes:
  - A minimum color contrast ratio of 4.5:1 for all body text.
  - All interactive elements shall be operable via keyboard navigation using the Tab, Enter, and Escape keys.
  - All non-text content (images, icons) shall have descriptive alternative text (alt attributes) for screen reader compatibility.
  - Form fields shall have associated <label> elements.

NFR-USAB-4: Responsive Design

- The user interface shall be fully functional and free of horizontal scroll on screen widths ranging from 320px (small mobile) to 1920px (large desktop).
- The layout shall adapt its structure (e.g., collapsing the sidebar to a hamburger menu on small screens) to provide an optimal experience at each screen size.

NFR-USAB-5: Inline Error Feedback

- All form validation errors shall be displayed immediately upon attempted submission, adjacent to the specific field that caused the error.
- Error messages shall be written in plain language, clearly stating what the problem is and how the user can resolve it (e.g., "Password must be at least 8 characters and contain at least one number").

NFR-USAB-6: Loading State Indication

- Any operation that takes longer than 300 milliseconds to complete (e.g., metadata extraction, bulk import) shall display a visible loading indicator (spinner or progress bar) so the user knows the system is processing their request.

  3.3.5 Logical Database Requirements

This section defines the logical data model for Mind Palace. All entities, their attributes, data types, constraints, and inter-entity relationships are specified below.

**Entity 1: Users**

| Attribute     | Data Type    | Constraints                         | Description                                |
| ------------- | ------------ | ----------------------------------- | ------------------------------------------ |
| user_id       | INTEGER      | PRIMARY KEY, AUTO_INCREMENT         | Unique identifier for each user            |
| name          | VARCHAR(100) | NOT NULL                            | User's display name                        |
| email         | VARCHAR(255) | NOT NULL, UNIQUE                    | User's email address (used for login)      |
| password_hash | VARCHAR(255) | NOT NULL                            | bcrypt hash of the user's password         |
| theme         | VARCHAR(10)  | DEFAULT 'light'                     | User's preferred UI theme ('light'/'dark') |
| default_view  | VARCHAR(10)  | DEFAULT 'grid'                      | Preferred bookmark view ('grid'/'list')    |
| created_at    | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Date and time the account was created      |
| last_login_at | TIMESTAMP    | NULLABLE                            | Timestamp of most recent login             |

**Entity 2: Collections**

| Attribute     | Data Type    | Constraints                                        | Description                           |
| ------------- | ------------ | -------------------------------------------------- | ------------------------------------- |
| collection_id | INTEGER      | PRIMARY KEY, AUTO_INCREMENT                        | Unique identifier for each collection |
| user_id       | INTEGER      | NOT NULL, FOREIGN KEY → Users(user_id)             | Owner of this collection              |
| parent_id     | INTEGER      | NULLABLE, FOREIGN KEY → Collections(collection_id) | Parent collection; NULL if root-level |
| name          | VARCHAR(150) | NOT NULL                                           | Name of the collection                |
| created_at    | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP                | Date and time of creation             |

Note: The self-referential foreign key on parent_id enables infinite recursive nesting. A UNIQUE constraint on (user_id, parent_id, name) ensures collection names are unique within the same parent.

**Entity 3: Bookmarks**

| Attribute       | Data Type    | Constraints                                        | Description                                           |
| --------------- | ------------ | -------------------------------------------------- | ----------------------------------------------------- |
| bookmark_id     | INTEGER      | PRIMARY KEY, AUTO_INCREMENT                        | Unique identifier for each bookmark                   |
| user_id         | INTEGER      | NOT NULL, FOREIGN KEY → Users(user_id)             | Owner of this bookmark                                |
| collection_id   | INTEGER      | NOT NULL, FOREIGN KEY → Collections(collection_id) | Collection this bookmark belongs to                   |
| url             | TEXT         | NOT NULL                                           | Full URL of the saved webpage                         |
| title           | VARCHAR(500) | NOT NULL                                           | Title of the page (auto-extracted or manual)          |
| description     | TEXT         | NULLABLE                                           | Page summary (auto-extracted or manual)               |
| thumbnail_url   | TEXT         | NULLABLE                                           | URL of the stored thumbnail image                     |
| favicon_url     | TEXT         | NULLABLE                                           | URL of the stored favicon image                       |
| domain          | VARCHAR(255) | NOT NULL                                           | Extracted domain name of the URL                      |
| link_status     | VARCHAR(20)  | DEFAULT 'unchecked'                                | Health status: 'ok', 'broken', 'warning', 'unchecked' |
| last_checked_at | TIMESTAMP    | NULLABLE                                           | Timestamp of the most recent health check             |
| created_at      | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP                | Date and time the bookmark was saved                  |

**Entity 4: Tags**

| Attribute  | Data Type    | Constraints                            | Description                       |
| ---------- | ------------ | -------------------------------------- | --------------------------------- |
| tag_id     | INTEGER      | PRIMARY KEY, AUTO_INCREMENT            | Unique identifier for each tag    |
| user_id    | INTEGER      | NOT NULL, FOREIGN KEY → Users(user_id) | Owner of this tag                 |
| name       | VARCHAR(100) | NOT NULL                               | Tag label text                    |
| color      | VARCHAR(7)   | NULLABLE                               | Hex color code (e.g., '#FF5733')  |
| created_at | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP    | Date and time the tag was created |

Note: A UNIQUE constraint on (user_id, LOWER(name)) enforces case-insensitive uniqueness per user.

**Entity 5: Bookmark_Tags (Junction Table)**

| Attribute   | Data Type | Constraints                                    | Description               |
| ----------- | --------- | ---------------------------------------------- | ------------------------- |
| bookmark_id | INTEGER   | NOT NULL, FOREIGN KEY → Bookmarks(bookmark_id) | Reference to the bookmark |
| tag_id      | INTEGER   | NOT NULL, FOREIGN KEY → Tags(tag_id)           | Reference to the tag      |

Note: PRIMARY KEY is a composite key on (bookmark_id, tag_id), implementing the many-to-many relationship between Bookmarks and Tags.

**Entity 6: Permanent_Copies**

| Attribute       | Data Type | Constraints                                            | Description                                |
| --------------- | --------- | ------------------------------------------------------ | ------------------------------------------ |
| copy_id         | INTEGER   | PRIMARY KEY, AUTO_INCREMENT                            | Unique identifier for each permanent copy  |
| bookmark_id     | INTEGER   | NOT NULL, UNIQUE, FOREIGN KEY → Bookmarks(bookmark_id) | One-to-one link with bookmark              |
| html_content    | LONGTEXT  | NULLABLE                                               | Stored simplified HTML of the page content |
| text_content    | LONGTEXT  | NULLABLE                                               | Stored plain text version of the page      |
| file_size_bytes | INTEGER   | NULLABLE                                               | Size of the stored content in bytes        |
| archived_at     | TIMESTAMP | NOT NULL, DEFAULT CURRENT_TIMESTAMP                    | Timestamp when the archive was created     |

**Entity 7: Annotations**

| Attribute     | Data Type   | Constraints                                    | Description                                             |
| ------------- | ----------- | ---------------------------------------------- | ------------------------------------------------------- |
| annotation_id | INTEGER     | PRIMARY KEY, AUTO_INCREMENT                    | Unique identifier for each annotation                   |
| bookmark_id   | INTEGER     | NOT NULL, FOREIGN KEY → Bookmarks(bookmark_id) | Bookmark this annotation belongs to                     |
| user_id       | INTEGER     | NOT NULL, FOREIGN KEY → Users(user_id)         | Owner of this annotation                                |
| type          | VARCHAR(10) | NOT NULL                                       | Annotation type: 'highlight' or 'note'                  |
| content       | TEXT        | NULLABLE                                       | Text content for notes; highlighted text for highlights |
| position_data | JSON        | NULLABLE                                       | JSON object storing text range/offset for highlights    |
| color         | VARCHAR(7)  | NULLABLE                                       | Hex color code for highlights                           |
| created_at    | TIMESTAMP   | NOT NULL, DEFAULT CURRENT_TIMESTAMP            | Timestamp when the annotation was created               |

**Entity Relationship Summary**

| Relationship                         | Cardinality | Description                                                      |
| ------------------------------------ | ----------- | ---------------------------------------------------------------- |
| Users → Collections                  | 1 : N       | One user owns many collections                                   |
| Users → Bookmarks                    | 1 : N       | One user owns many bookmarks                                     |
| Users → Tags                         | 1 : N       | One user owns many tags                                          |
| Collections → Collections (self)     | 1 : N       | One collection can be the parent of many sub-collections         |
| Collections → Bookmarks              | 1 : N       | One collection contains many bookmarks                           |
| Bookmarks ↔ Tags (via Bookmark_Tags) | N : M       | A bookmark can have many tags; a tag can apply to many bookmarks |
| Bookmarks → Permanent_Copies         | 1 : 1       | One bookmark has at most one permanent copy                      |
| Bookmarks → Annotations              | 1 : N       | One bookmark can have many annotations                           |

3.3.6 Design Constraints

DC-1: Open-Source Technology Mandate

- The entire application stack—including the web framework, database system, and all third-party libraries—shall use only open-source, freely licensed software to comply with the project's zero-budget constraint.

DC-2: Web Application Only

- The system shall be implemented exclusively as a server-rendered or single-page web application accessible through a standard browser URL.
- Native mobile applications (iOS/Android), desktop applications, and browser extensions are excluded from the scope of this project.

DC-3: Responsive Design Requirement

- The user interface shall be designed with a mobile-first approach and shall not use fixed pixel widths that prevent adapting to different screen sizes.
- The use of a CSS framework (e.g., Bootstrap, Tailwind CSS) or custom CSS media queries is required to meet NFR-USAB-4.

DC-4: Incremental Development Model

- The implementation shall strictly follow the three-increment roadmap defined in Section 1 (Selected Process Model).
- Features assigned to Increment 2 or Increment 3 shall not be implemented before Increment 1 is complete and verified.

DC-5: RESTful Backend Architecture

- The backend shall expose its functionality exclusively through a RESTful API using JSON as the data exchange format, as specified in Section 3.1.4.
- Tight coupling between the frontend rendering logic and the backend database queries is prohibited; a clear separation of concerns between the frontend and backend layers is mandatory.

DC-6: Team and Timeline Constraints

- The development team consists of exactly 4 members.
- All deliverables must be completed within a single academic semester and submitted according to the milestone schedule.
- The scope of the project shall not be expanded beyond what is defined in this SRS without formal approval through the Change Management Process defined in Section 5.

  3.3.7 Standards Compliance

SC-1: W3C HTML5 Standard

- All HTML markup produced by the application shall be valid and conform to the W3C HTML5 specification.
- Pages shall pass validation using the W3C Markup Validation Service (validator.w3.org) with no errors.

SC-2: W3C CSS3 Standard

- All stylesheets shall use valid CSS3 constructs as defined by the W3C CSS specification.
- Vendor-prefixed properties shall only be used where a standard cross-browser equivalent does not yet exist.

SC-3: WCAG 2.1 Level AA

- The user interface shall conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA as published by the W3C, as further specified in NFR-USAB-3.

SC-4: OWASP Top 10

- The application shall be developed with active mitigation strategies for all ten categories in the OWASP Top 10 (latest published edition), including but not limited to Injection, Broken Authentication, XSS, and Insecure Deserialization.
- Security requirements NFR-SEC-1 through NFR-SEC-9 correspond directly to OWASP Top 10 mitigations.

SC-5: RESTful API Design (Richardson Maturity Model Level 2)

- All API endpoints shall conform to REST principles at a minimum of Level 2 of the Richardson Maturity Model: proper use of HTTP verbs (GET, POST, PUT, DELETE), resource-based URLs, and meaningful HTTP status codes in responses.

SC-6: Netscape Bookmark File Format

- The bookmark import and export feature (FR-2.3.1, FR-2.3.2) shall fully support the Netscape Bookmark File Format (also known as the "bookmark.html" format), which is the universally adopted standard for browser bookmark interoperability across Chrome, Firefox, Safari, and Edge.

SC-7: IEEE 830-1998 (SRS Structure)

- This Software Requirements Specification document has been structured in accordance with the IEEE Standard 830-1998 for Recommended Practice for Software Requirements Specifications.

SC-8: JSON Data Interchange

- All data exchanged between the frontend client and the backend API shall use the JSON format as defined by RFC 8259.

4 System Models

4.1 Context Diagram (Level 0 DFD)

The Context Diagram presents Mind Palace as a single, high-level process and depicts its interactions with all external entities. It establishes the system boundary and shows the data flows that cross that boundary.

**External Entities:**

1. **Registered User** — The primary human actor who interacts with the system to save, organize, and retrieve bookmarks.
2. **Anonymous Visitor** — An unauthenticated user who can access the registration and login screens only.
3. **External Websites** — Third-party web servers whose content Mind Palace fetches for metadata extraction and link health verification.
4. **Email Server (SMTP)** — An external mail delivery service used for sending password reset and broken link notification emails.

**Data Flows:**

| Flow Direction              | Entity ↔ System                 | Data Exchanged                                                                                            |
| --------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Inbound (User → System)     | Registered User → Mind Palace   | Login credentials, URL submissions, collection/tag edits, search queries, import files, annotation inputs |
| Outbound (System → User)    | Mind Palace → Registered User   | Dashboard content, bookmark lists, search results, metadata previews, export files, error/status messages |
| Inbound (Visitor → System)  | Anonymous Visitor → Mind Palace | Registration details, login credentials                                                                   |
| Outbound (System → Visitor) | Mind Palace → Anonymous Visitor | Registration confirmation, login success/failure messages                                                 |
| Outbound (System → Web)     | Mind Palace → External Websites | HTTP HEAD/GET requests for metadata extraction and link health checks                                     |
| Inbound (Web → System)      | External Websites → Mind Palace | HTML page content, Open Graph metadata, HTTP status codes                                                 |
| Outbound (System → Email)   | Mind Palace → Email Server      | Password reset tokens, broken link notification emails                                                    |

```
+----------------------+         Registration/Login Data         +------------------------+
|   Anonymous Visitor  | -------------------------------------> |                        |
+----------------------+         Login Success/Failure           |                        |
                                                                 |                        |
+----------------------+   URL, queries, edits, annotations      |                        |
|   Registered User    | -------------------------------------> |     MIND PALACE        |
+----------------------+ <------------------------------------- |     (Web Application)  |
                          Dashboard, results, exports, alerts    |                        |
                                                                 |                        |
+----------------------+   HTTP requests for metadata/health     |                        |
|  External Websites   | <------------------------------------- |                        |
+----------------------+ -------------------------------------> |                        |
                          HTML content, metadata, status codes   |                        |
                                                                 |                        |
+----------------------+   Password reset & notification emails  |                        |
|    Email Server       | <------------------------------------- +------------------------+
+----------------------+
```

4.2 Data Flow Diagrams

**Level 1 DFD — Internal Processes**

The Level 1 DFD decomposes the single Mind Palace process from the context diagram into its five primary internal processes. Each process communicates with shared data stores and with external entities.

**Data Stores:**

- D1: Users Store
- D2: Bookmarks Store
- D3: Collections Store
- D4: Tags Store
- D5: Permanent Copies Store
- D6: Annotations Store

**Level 1 Processes and their Data Flows:**

| Process | Name                        | Inputs                                                                     | Outputs                                                                       | Data Stores Accessed                              |
| ------- | --------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| P1      | User Authentication         | Registration/login data from Registered User or Anonymous Visitor          | Session token, dashboard redirect, error message, password reset email        | D1 (read/write)                                   |
| P2      | Bookmark Management         | URL + metadata from Registered User; HTML content from External Websites   | Bookmark record, metadata preview, permanent copy trigger, duplicate warning  | D2 (read/write), D3 (read), D5 (write)            |
| P3      | Collection & Tag Management | Collection/tag create/edit/delete commands from Registered User            | Updated collection tree, updated tag list                                     | D3 (read/write), D4 (read/write), D2 (read/write) |
| P4      | Search & Retrieval          | Search query and filter parameters from Registered User                    | Filtered/sorted bookmark list, highlighted results                            | D2 (read), D3 (read), D4 (read), D6 (read)        |
| P5      | System Maintenance          | Scheduled trigger (internal); manual re-check command from Registered User | Updated link status codes in D2, broken link notifications to Registered User | D2 (read/write)                                   |

**Level 2 DFD — Process 2: Bookmark Management (Detailed Decomposition)**

This decomposition shows the internal sub-processes of the Bookmark Management module.

| Sub-process | Name                               | Inputs                                                                               | Outputs                                                                                         | Data Stores                            |
| ----------- | ---------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------- |
| P2.1        | Accept and Validate URL            | Raw URL string from Registered User                                                  | Validated URL or validation error message                                                       | D2 (read — duplicate check)            |
| P2.2        | Extract Metadata                   | Validated URL from P2.1                                                              | Page title, description, thumbnail URL, favicon URL, domain name (or extraction failure notice) | External Websites                      |
| P2.3        | Populate and Confirm Bookmark Form | Extracted metadata from P2.2; user edits from Registered User                        | Confirmed bookmark data record                                                                  | —                                      |
| P2.4        | Store Bookmark Record              | Confirmed bookmark data from P2.3; selected collection and tags from Registered User | Bookmark record persisted, Tag association records created                                      | D2 (write), D3 (read), D4 (read/write) |
| P2.5        | Generate Permanent Copy            | Saved bookmark record from P2.4                                                      | Archived HTML/text content; file size check result                                              | External Websites (fetch), D5 (write)  |

**Data Flow for Process 2 — Narrative:**
When a Registered User submits a URL (P2.1), the system validates the URL format and checks the Bookmarks Store (D2) for an existing entry with the same URL. If a duplicate is found, a warning is returned to the user. If validation succeeds, the URL is passed to P2.2, which sends an HTTP GET request to the External Website to parse Open Graph tags and extract metadata. The extracted metadata flows into P2.3, pre-populating a form presented to the user for review and editing. Upon user confirmation, P2.4 writes the complete bookmark record to D2, creates tag associations in D4, and links the record to the selected collection in D3. P2.5 is then triggered asynchronously to fetch the full webpage HTML from the External Website, strip non-essential elements, and store the simplified content in the Permanent Copies Store (D5).

4.3 Entity-Relationship Diagram

The following describes the complete Entity-Relationship model for the Mind Palace database. The full attribute specifications for each entity are provided in Section 3.3.5.

**Entities and Primary Keys:**

| Entity           | Primary Key                       |
| ---------------- | --------------------------------- |
| Users            | user_id                           |
| Collections      | collection_id                     |
| Bookmarks        | bookmark_id                       |
| Tags             | tag_id                            |
| Bookmark_Tags    | (bookmark_id, tag_id) — composite |
| Permanent_Copies | copy_id                           |
| Annotations      | annotation_id                     |

**Relationships:**

**1. Users — Collections (One-to-Many)**

- One User OWNS zero or more Collections.
- Each Collection is owned by exactly one User.
- Foreign Key: Collections.user_id → Users.user_id (CASCADE DELETE)

**2. Collections — Collections (Self-Referential One-to-Many)**

- One Collection IS THE PARENT OF zero or more Collections (sub-collections).
- Each Collection has at most one parent Collection (NULL for root-level collections).
- Foreign Key: Collections.parent_id → Collections.collection_id (SET NULL on DELETE)
- Constraint: A collection cannot be set as a descendant of itself (circular reference prevention enforced at application level).

**3. Users — Bookmarks (One-to-Many)**

- One User OWNS zero or more Bookmarks.
- Each Bookmark is owned by exactly one User.
- Foreign Key: Bookmarks.user_id → Users.user_id (CASCADE DELETE)

**4. Collections — Bookmarks (One-to-Many)**

- One Collection CONTAINS zero or more Bookmarks.
- Each Bookmark BELONGS TO exactly one Collection.
- Foreign Key: Bookmarks.collection_id → Collections.collection_id (RESTRICT DELETE — a collection with bookmarks cannot be deleted without handling its bookmarks first)

**5. Users — Tags (One-to-Many)**

- One User OWNS zero or more Tags.
- Each Tag is owned by exactly one User.
- Foreign Key: Tags.user_id → Users.user_id (CASCADE DELETE)

**6. Bookmarks — Tags via Bookmark_Tags (Many-to-Many)**

- One Bookmark CAN BE LABELLED WITH zero or more Tags.
- One Tag CAN BE APPLIED TO zero or more Bookmarks.
- Junction Table: Bookmark_Tags with composite primary key (bookmark_id, tag_id).
- Foreign Key: Bookmark_Tags.bookmark_id → Bookmarks.bookmark_id (CASCADE DELETE)
- Foreign Key: Bookmark_Tags.tag_id → Tags.tag_id (CASCADE DELETE)

**7. Bookmarks — Permanent_Copies (One-to-One)**

- One Bookmark MAY HAVE at most one Permanent Copy.
- One Permanent Copy BELONGS TO exactly one Bookmark.
- Foreign Key: Permanent_Copies.bookmark_id → Bookmarks.bookmark_id (CASCADE DELETE)
- The UNIQUE constraint on Permanent_Copies.bookmark_id enforces the one-to-one cardinality.

**8. Bookmarks — Annotations (One-to-Many)**

- One Bookmark CAN HAVE zero or more Annotations (highlights or notes).
- Each Annotation IS ATTACHED TO exactly one Bookmark.
- Foreign Key: Annotations.bookmark_id → Bookmarks.bookmark_id (CASCADE DELETE)
- Foreign Key: Annotations.user_id → Users.user_id (CASCADE DELETE)

**ER Diagram (Textual Notation):**

```
USERS
  |--- (1:N) ---> COLLECTIONS (parent_id self-ref: 1:N)
  |                   |
  |                   +--- (1:N) ---> BOOKMARKS
  |--- (1:N) --------------------->
  |                                    |
  |                                    +--- (N:M via BOOKMARK_TAGS) ---> TAGS <--- (1:N) --- USERS
  |                                    |
  |                                    +--- (1:1) ---> PERMANENT_COPIES
  |                                    |
  |                                    +--- (1:N) ---> ANNOTATIONS
  |
  +--- (1:N) ---> TAGS
```

5. Change Management Process

The Change Management Process establishes formal procedures for handling modifications to the Mind Palace requirements throughout the project lifecycle. Any proposed changes to functionality, scope, or technical specifications must be documented and submitted to the project team for evaluation. The team assesses the impact on timeline, resources, and existing dependencies before deciding on approval. Minor changes like typo corrections require only team lead approval, while moderate changes need team consensus, and major scope changes require faculty advisor approval. All approved changes are tracked in the document version history with updated version numbers, ensuring transparency and accountability. This structured approach prevents scope creep while allowing necessary adaptations as the project evolves through its incremental development phases.

6. Supporting Information

6.1 Use Case Diagrams

Use Case Diagrams provide a visual overview of Mind Palace's functionality from the user's perspective. These diagrams show actors (Registered Users, Anonymous Visitors, and the System itself) and their interactions with various features. The diagrams illustrate key use cases such as authentication, bookmark management, collection organization, tagging, searching, importing/exporting data, and system maintenance tasks. Relationships between use cases are shown through include and extend relationships, demonstrating dependencies like how "Add Bookmark" includes "Extract Metadata" as a necessary subprocess. These diagrams help stakeholders quickly understand what the system does and who can perform which actions.

6.2 Use Case Descriptions

6.2.1 Use Case 1: User Registration and Authentication

Describes how new users create accounts in Mind Palace by providing email and password credentials. The system validates input strength, encrypts passwords using bcrypt, and creates a user record in the database along with a default "Unsorted" collection. Existing users authenticate by entering credentials, which the system verifies against stored hashed passwords before granting access. Password reset functionality allows users to recover access via email verification. Session management maintains user login state with automatic timeout after 30 minutes of inactivity for security. This use case ensures secure, private access to personal bookmark libraries.
Use Case Description Table
Element Description
Use Case ID UC-1
Use Case Name User Registration and Authentication
Summary New users create accounts with email/password. Existing users login to access their bookmark library.
Actors Primary: Anonymous Visitor, Registered User
Preconditions Valid email address, internet connection
Success End Condition Account created, user logged in, session established, default "Unsorted" collection created
Failed End Condition Invalid email, weak password, duplicate account, incorrect credentials
Primary Flow 1. User enters email and password 2. System validates and encrypts password (bcrypt) 3. System creates user record and default collection 4. System establishes 30-minute session 5. User redirected to dashboard
Alternative Flows Password reset via email link, session timeout after inactivity
Special Requirements HTTPS required, bcrypt encryption, secure session tokens

6.2.2 Use Case 2: Add New Bookmark

Details the core functionality of saving web URLs to Mind Palace. Users input a URL either through the web interface or browser extension. The system validates the URL format, checks for duplicates in the user's library, then automatically fetches the webpage to extract metadata including title, description, thumbnail image, and favicon. This extracted information pre-populates the bookmark form, which users can review and edit. Users select a target collection, optionally add tags, and save. The system stores the bookmark in the database and displays it in the selected collection. If metadata extraction fails due to network issues or website restrictions, users can manually enter title and description.
Use Case Description Table
Element Description
Use Case ID UC-2
Use Case Name Add New Bookmark
Summary Users save URLs with automatic metadata extraction (title, description, thumbnail, favicon).
Actors Primary: Registered User; Secondary: External Website
Preconditions User logged in, valid URL
Success End Condition Bookmark saved with metadata, appears in collection, permanent copy initiated
Failed End Condition Invalid URL, extraction timeout, network error
Primary Flow 1. User enters URL 2. System validates and checks duplicates 3. System fetches webpage and extracts metadata 4. User reviews/edits metadata 5. User selects collection and adds tags 6. System saves bookmark and triggers permanent copy generation
Alternative Flows Duplicate warning shown, manual metadata entry if extraction fails
Special Requirements 10-second timeout, support Open Graph/Twitter Cards

6.2.3 Use Case 3: Create and Manage Collections

Explains how users organize bookmarks using hierarchical folder structures. Users create new collections by providing a name and optionally selecting a parent collection to create nested folders. The system supports unlimited nesting depth through recursive parent-child relationships in the database. Users can rename collections, move them to different parent locations via drag-and-drop, and delete collections with options to handle contained bookmarks (move to parent, move to "Unsorted", or delete). The system validates operations to prevent circular references where a collection becomes its own ancestor. This flexible organization system allows users to structure their content library precisely according to their mental model.
Use Case Description Table
Element Description
Use Case ID UC-3
Use Case Name Create and Manage Collections
Summary Users organize bookmarks using hierarchical folders with unlimited nesting depth.
Actors Primary: Registered User
Preconditions User logged in
Success End Condition Collection created/renamed/moved/deleted, hierarchy updated
Failed End Condition Duplicate name, circular reference attempted
Primary Flow 1. User creates collection with name and optional parent 2. System validates uniqueness and creates record 3. Rename: Edit inline and update database 4. Move: Drag to new parent (validates no circular reference) 5. Delete: Choose bookmark handling (move/delete), process deletion
Alternative Flows Circular reference blocked, nested sub-collection creation
Special Requirements Prevent circular references, unlimited depth, cascade delete

6.2.4 Use Case 4: Tag Management

Describes the flexible keyword-based categorization system that complements hierarchical collections. Users create custom tags with unique names and optionally assign colors for visual distinction. Multiple tags can be assigned to a single bookmark, enabling cross-referencing where one bookmark appears in searches for multiple topics. Tag autocomplete suggests existing tags as users type, promoting consistency and preventing duplicates. Users can rename tags globally (affecting all bookmarks using that tag), merge similar tags, or delete tags with confirmation showing affected bookmark count. The many-to-many relationship between bookmarks and tags provides non-hierarchical organization for complex categorization needs.
Use Case Description Table
Element Description
Use Case ID UC-4
Use Case Name Tag Management
Summary Users create custom tags with optional colors for flexible keyword-based categorization.
Actors Primary: Registered User
Preconditions User logged in
Success End Condition Tag created/renamed/deleted, all bookmarks updated
Failed End Condition Duplicate tag name, invalid format
Primary Flow 1. User types tag name 2. System creates tag if new or uses existing 3. System creates bookmark-tag relationship 4. Rename: Update globally affects all bookmarks 5. Delete: Remove all associations with confirmation 6. Autocomplete suggests existing tags
Alternative Flows Merge similar tags, assign colors to tags
Special Requirements Case-insensitive uniqueness, many-to-many relationships

6.2.5 Use Case 5: Search and Filter Bookmarks

Details the powerful retrieval capabilities for locating specific bookmarks in large libraries. Users can perform keyword searches that query bookmark titles, descriptions, and URLs with real-time results as they type. Advanced filtering allows combining multiple criteria including tags (with AND/OR logic), date ranges (absolute or relative like "last week"), and website domains. Results can be sorted by date added, alphabetical order, or domain name. Users can save frequently-used filter combinations for quick access. The system returns results within 1 second for libraries containing up to 10,000 bookmarks, with matching terms highlighted in results. Full-text search within permanent copies allows finding bookmarks based on webpage content.
Use Case Description Table
Element Description
Use Case ID UC-5
Use Case Name Search and Filter Bookmarks
Summary Users locate bookmarks using keyword search and advanced filters (tags, dates, domains).
Actors Primary: Registered User
Preconditions User logged in with bookmarks
Success End Condition Relevant results displayed with highlighted terms within 1 second
Failed End Condition No results found
Primary Flow 1. User types search keywords 2. System performs real-time search on title/description/URL 3. User applies filters (tags, date range, domains) 4. System combines filters with AND logic 5. User sorts results (date/alphabetical/domain) 6. User clicks result to view bookmark
Alternative Flows Save frequently-used searches, full-text search in permanent copies
Special Requirements Results within 1 second for 10,000 bookmarks, highlight matching terms

6.2.6 Use Case 6: Import Bookmarks

Explains how users migrate existing browser bookmarks into Mind Palace for centralized management. Users export bookmarks from their web browser in HTML format (Netscape Bookmark File standard), then upload the file to Mind Palace. The system parses the HTML structure, extracting URLs, titles, and folder hierarchy. A preview shows the structure before final import, allowing users to review and select which folders to import. The system creates equivalent collections matching the original folder structure and generates bookmark records for all URLs. Duplicate detection alerts users to URLs already in their library with options to skip, import anyway, or merge metadata. This one-time migration process enables seamless transition from traditional browser bookmarks.
Use Case Description Table
Element Description
Use Case ID UC-6
Use Case Name Import Bookmarks
Summary Users migrate browser bookmarks by uploading HTML files with folder hierarchy preservation.
Actors Primary: Registered User
Preconditions User has exported HTML bookmark file
Success End Condition All bookmarks imported, folder structure preserved, summary displayed
Failed End Condition Invalid file format, parsing error
Primary Flow 1. User uploads HTML bookmark file 2. System validates and parses file structure 3. System displays preview with folder mapping 4. User confirms import 5. System creates collections and bookmark records 6. System displays summary (X bookmarks, Y folders)
Alternative Flows Duplicate handling (skip/import/merge), JSON format support
Special Requirements Handle 10,000+ bookmarks, support Netscape Bookmark Format

6.2.7 Use Case 7: Export Bookmarks

Describes data portability features allowing users to backup or migrate their Mind Palace library. Users can export their entire bookmark collection or selected collections to standard formats including HTML (Netscape Bookmark File format compatible with browsers) or JSON (preserving all metadata, tags, and annotations). The system generates the export file maintaining folder hierarchy and relationship data. HTML exports can be imported directly into web browsers, while JSON exports provide complete backup including Mind Palace-specific features. This ensures users retain ownership of their data and can switch systems if needed, preventing vendor lock-in.
Use Case Description Table
Element Description
Use Case ID UC-7
Use Case Name Export Bookmarks
Summary Users backup/migrate library by exporting to HTML or JSON formats.
Actors Primary: Registered User
Preconditions User logged in with bookmarks
Success End Condition Export file generated and downloaded with complete data
Failed End Condition Database error, file generation failure
Primary Flow 1. User selects export format (HTML/JSON) 2. User chooses scope (all/selected collections) 3. System generates file maintaining hierarchy 4. HTML: Browser-compatible format 5. JSON: Full backup with metadata/tags/annotations 6. System initiates download
Alternative Flows Selective export of specific collections
Special Requirements HTML browser-compatible, JSON preserves all features

6.2.8 Use Case 8: Add Annotations

Details how users enhance saved bookmarks with personal notes and highlights. When viewing a bookmark's permanent copy, users can select text passages and apply color-coded highlights to emphasize important sections. Users can attach sticky notes containing personal comments, insights, or reminders to bookmarks, with notes displayed as icons on the bookmark card and expanded in detail view. Annotation data includes text content, position information for highlights, color coding, and timestamps. This feature transforms Mind Palace from passive storage into an active research and knowledge management tool, allowing users to build upon saved content with their own thoughts.
Use Case Description Table
Element Description
Use Case ID UC-8
Use Case Name Add Annotations
Summary Users enhance bookmarks with color-coded highlights and sticky notes.
Actors Primary: Registered User
Preconditions User logged in, bookmark with permanent copy exists
Success End Condition Annotation saved with text/position/color/timestamp
Failed End Condition Database save error
Primary Flow 1. User views bookmark's permanent copy 2. User selects text and applies highlight color 3. System stores text, position, color 4. User adds sticky note with comments 5. System saves annotation with timestamp 6. Annotations displayed as icons on bookmark card
Alternative Flows Edit/delete existing annotations
Special Requirements Store position data as JSON, support multiple highlights per bookmark

6.2.9 Use Case 9: Link Health Monitoring

Explains the automated system that maintains bookmark library integrity by detecting broken links. A scheduled background job runs every 24-48 hours, sending HTTP HEAD requests to all stored URLs to check accessibility. The system records response status codes and categorizes bookmarks as OK (200-299 codes), WARNING (timeouts or redirects), or BROKEN (404, 410, 500+ errors). Last checked timestamps track validation recency. Users receive notifications summarizing newly broken links with options for daily or weekly digests. Manual re-check functionality allows immediate validation of specific bookmarks. For broken links, the system may suggest alternatives from Internet Archive's Wayback Machine, helping users recover lost content.
Use Case Description Table
Element Description
Use Case ID UC-9
Use Case Name Link Health Monitoring
Summary Automated system detects broken links by periodically checking URL accessibility.
Actors Primary: System (Automated); Secondary: External Websites
Preconditions Bookmarks exist in database
Success End Condition All URLs checked, status updated (OK/WARNING/BROKEN), users notified
Failed End Condition System job failure
Primary Flow 1. Scheduled job runs every 24-48 hours 2. System sends HTTP HEAD requests to URLs 3. System records status codes 4. Categorizes: OK (200-299), WARNING (timeout/redirect), BROKEN (404/410/5xx) 5. System updates last_checked timestamp 6. System notifies users of broken links 7. Suggests Internet Archive alternatives
Alternative Flows Manual re-check for specific bookmarks
Special Requirements Process 1000+ URLs/hour, respect timeouts, non-blocking

6.2.10 Use Case 10: Permanent Copy Generation

Describes how Mind Palace protects against link rot by storing local snapshots of webpage content. When a bookmark is saved, the system optionally creates a permanent copy by fetching the complete webpage, extracting the main content, and storing a simplified HTML/text version. This process removes advertisements, navigation elements, and scripts, focusing on readable content. The permanent copy is stored in the database or file system, linked one-to-one with the bookmark record. Users can view this archived version even if the original URL becomes unavailable. File size limits (typically 5MB per copy) prevent excessive storage usage. This archival feature ensures long-term access to important content independent of external website availability.
Use Case Description Table
Element Description
Use Case ID UC-10
Use Case Name Permanent Copy Generation
Summary System stores local snapshots of webpages to protect against link rot.
Actors Primary: System (Automated); Secondary: External Website
Preconditions Bookmark saved, webpage accessible
Success End Condition Simplified HTML/text copy stored, linked 1:1 with bookmark
Failed End Condition Webpage unreachable, content too large (>5MB)
Primary Flow 1. Triggered after bookmark saved (UC-2) 2. System fetches complete webpage HTML 3. System extracts main content 4. System removes ads, scripts, navigation 5. System stores simplified HTML and plain text 6. System creates permanent_copy record linked to bookmark 7. File size checked (<5MB limit)
Alternative Flows Skip if webpage blocks access, compress if near limit
Special Requirements 5MB file size limit, 1:1 relationship with bookmarks, respect robots.txt
