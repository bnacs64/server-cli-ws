

### **Project Prompt: Dual-Interface Network Controller Management Suite in Node.js**

You are tasked with generating a comprehensive Node.js application for managing network-enabled hardware controllers. All communication with the controllers must strictly adhere to the specifications outlined in the attached `Short_Packet_Format_V3.txt` document.

The application must be architected to support two distinct operational modes:
1.  An interactive **Command-Line Interface (CLI)** for local administration.
2.  A **Web Service** exposing both a RESTful API and a WebSocket endpoint for remote management.

**Primary Technical Specification:**
*   **Protocol:** All communication with controllers is performed over UDP on port `60000` using a fixed-length 64-byte packet format, as detailed in the SDK document[1].
*   **Data Encoding:** Several operations, particularly setting and getting the time, require data to be converted to and from Binary-Coded Decimal (BCD) format. The application must include reliable utility functions for this conversion[1].

---

### **Application Architecture**

To ensure modularity and reusability, the application must be built using a layered architecture that separates core business logic from the user interfaces.

**1. Core Logic Layer (`/src/core`)**
This is the central engine of the application. It will be a pure Node.js module with no direct dependency on any CLI or web frameworks. It handles all direct UDP communication and data processing.

*   **Responsibilities:**
    *   Implement UDP socket communication using Node's built-in `dgram` module.
    *   Create and parse the 64-byte packets for each function specified in the SDK.
    *   Manage BCD encoding/decoding for date/time values.
    *   Handle persistence of discovered controller configurations to a JSON file (e.g., `/config/controllers.json`).
*   **Exposed API:** This module must expose a clear, promise-based API for the other layers to consume. Example functions:
    *   `discoverControllers(timeout)`
    *   `getControllerTime(controllerInfo)`
    *   `setControllerTime(controllerInfo, newTime)`
    *   `setControllerNetworkConfig(controllerInfo, networkConfig)`
    *   `getReceivingServer(controllerInfo)`
    *   `setReceivingServer(controllerInfo, serverConfig)`

**2. CLI Layer (`/src/cli`)**
This layer provides a user-friendly command-line interface by acting as a wrapper around the Core Logic Layer.

*   **Technology:** Use `commander.js` for command parsing and `inquirer.js` for interactive prompts.
*   **Commands to Implement:**
    *   `discover`: Initiates controller discovery using **Function ID `0x94`**, displays the results, and persists them to the JSON configuration file[1].
    *   `list`: Reads and displays all saved controllers from the configuration file.
    *   `get  --controller `: (e.g., `get time --controller 12345`). Fetches a specific setting from a selected controller. Must support `time`, `network`, and `server`.
    *   `set  --controller `: (e.g., `set network --controller 12345`). Configures a setting on a controller. Must support `time`, `network`, and `server`, prompting the user for required inputs.

**3. Web Service Layer (`/src/server`)**
This layer exposes the Core Logic Layer's functionality over the network.

*   **Technology:** Use `Express.js` for the REST API and the `ws` library for the WebSocket server.
*   **RESTful API Endpoints:**
    *   `GET /api/controllers`: Retrieve the list of all persisted controllers.
    *   `POST /api/discover`: Trigger a network discovery and return the results.
    *   `GET /api/controllers/:id/time`: Get the time from a specific controller (using **Function ID `0x32`**)[1].
    *   `POST /api/controllers/:id/time`: Set the time on a specific controller (using **Function ID `0x30`**)[1].
    *   `POST /api/controllers/:id/network`: Set the network configuration for a controller (using **Function ID `0x96`**)[1].
    *   `GET /api/controllers/:id/server`: Get the receiving server configuration (using **Function ID `0x92`**)[1].
    *   `POST /api/controllers/:id/server`: Set the receiving server configuration (using **Function ID `0x90`**)[1].
*   **WebSocket Functionality:**
    *   Establish a WebSocket server to provide real-time updates.
    *   **Live Discovery:** When a client sends a `discover` message, the server should run the discovery process and broadcast the results to all connected clients.
    *   **Command Passthrough:** Allow clients to send command messages (e.g., `{ "command": "getTime", "controllerId": "12345" }`) which the server executes and returns the result to the requesting client.

---

### **Suggested Project Structure**

```
/
├── config/
│   └── controllers.json        # Persisted list of discovered controllers
├── src/
│   ├── core/                   # CORE LOGIC (Protocol, Packets, BCD)
│   │   ├── controller-api.js
│   │   ├── packet-handler.js
│   │   └── config-manager.js
│   │
│   ├── cli/                    # CLI INTERFACE (Commander.js)
│   │   ├── index.js
│   │   └── commands/
│   │
│   └── server/                 # WEB SERVICE INTERFACE (Express, WebSockets)
│       ├── index.js
│       ├── api-routes.js
│       └── websocket-handler.js
│
├── app.js                      # Main entry point to launch CLI or Server mode
└── package.json

Ref : C:\Users\rdpadmin\Documents\server\main_sdk.txt


____________

Develop a robust Node.js application, leveraging TypeScript and pnpm, to manage network-enabled hardware controllers, strictly adhering to the protocol specifications detailed in the attached `main_sdk.txt` document. Employ pnpm workspace patterns to maximize code reusability, particularly for low-level protocol implementations, following official pnpm documentation for workspace setup and dependency management.

The application must support two distinct operational modes: an interactive **Command-Line Interface (CLI)** for local administration and a **Web Service** exposing both a RESTful API and a WebSocket endpoint for remote management.

**Core Technical Requirements:**

*   **Protocol Compliance:** All controller communication must occur over UDP on port `60000`, utilizing a fixed-length 64-byte packet format as defined in the SDK document[1].
*   **BCD Conversion:** Implement reliable utility functions for converting data to and from Binary-Coded Decimal (BCD) format, as required for specific operations like setting and retrieving the controller's time[1].

---

### **Application Architecture (Layered Approach)**

Construct the application using a layered architecture to separate core business logic from user interface concerns, promoting modularity and reusability.

**1. Core Logic Layer (`/packages/core`)**

This layer forms the application's central engine. It should be a pure Node.js module written in TypeScript, independent of any CLI or web frameworks. It will handle all direct UDP communication and data processing. Design this package for maximum reusability across the CLI and Server components.

*   **Responsibilities:**
    *   Implement UDP socket communication using Node's built-in `dgram` module.
    *   Create and parse 64-byte packets for each function specified in the SDK.
    *   Manage BCD encoding/decoding for date/time values.
    *   Handle persistence of discovered controller configurations to a JSON file (e.g., `/config/controllers.json`). Implement robust error handling and logging.
*   **Exposed API:** Expose a clear, promise-based API for consumption by other layers. Include comprehensive unit tests. Example functions:
    *   `discoverControllers(timeout: number): Promise<ControllerInfo[]>` (Implement retry logic and error handling for UDP communication failures)
    *   `getControllerTime(controllerInfo: ControllerInfo): Promise<Date>` (Handle potential time synchronization issues)
    *   `setControllerTime(controllerInfo: ControllerInfo, newTime: Date): Promise<void>` (Validate the newTime parameter)
    *   `setControllerNetworkConfig(controllerInfo: ControllerInfo, networkConfig: NetworkConfig): Promise<void>` (Validate the networkConfig parameter)
    *   `getReceivingServer(controllerInfo: ControllerInfo): Promise<ServerConfig>`
    *   `setReceivingServer(controllerInfo: ControllerInfo, serverConfig: ServerConfig): Promise<void>` (Validate the serverConfig parameter)

**2. CLI Layer (`/packages/cli`)**

This layer provides a user-friendly command-line interface, acting as a wrapper around the Core Logic Layer. It should be a TypeScript project.

*   **Technology:** Utilize `commander.js` for command parsing and `inquirer.js` for interactive prompts. Implement input validation and error handling.
*   **Commands to Implement:**
    *   `discover`: Initiates controller discovery using **Function ID `0x94`**, displays the results, and persists them to the JSON configuration file[1]. Provide options for specifying the discovery timeout and network interface.
    *   `list`: Reads and displays all saved controllers from the configuration file. Implement sorting and filtering options.
    *   `get  --controller `: (e.g., `get time --controller 12345`). Fetches a specific setting from a selected controller. Must support `time`, `network`, and `server`. Implement error handling for invalid controller IDs and network communication failures.
    *   `set  --controller `: (e.g., `set network --controller 12345`). Configures a setting on a controller. Must support `time`, `network`, and `server`, prompting the user for required inputs. Implement input validation and confirmation prompts before applying changes.

**3. Web Service Layer (`/packages/server`)**

This layer exposes the Core Logic Layer's functionality over the network. It should be a TypeScript project.

*   **Technology:** Use `Express.js` for the REST API and the `ws` library for the WebSocket server. Implement robust authentication and authorization mechanisms.
*   **RESTful API Endpoints:**
    *   `GET /api/controllers`: Retrieve the list of all persisted controllers. Implement pagination and filtering options.
    *   `POST /api/discover`: Trigger a network discovery and return the results. Implement rate limiting and background processing to prevent resource exhaustion.
    *   `GET /api/controllers/:id/time`: Get the time from a specific controller (using **Function ID `0x32`**)[1]. Implement caching to reduce network load.
    *   `POST /api/controllers/:id/time`: Set the time on a specific controller (using **Function ID `0x30`**)[1]. Implement request validation and error handling.
    *   `POST /api/controllers/:id/network`: Set the network configuration for a controller (using **Function ID `0x96`**)[1]. Implement request validation and error handling.
    *   `GET /api/controllers/:id/server`: Get the receiving server configuration (using **Function ID `0x92`**)[1]. Implement caching to reduce network load.
    *   `POST /api/controllers/:id/server`: Set the receiving server configuration (using **Function ID `0x90`**)[1]. Implement request validation and error handling.
*   **WebSocket Functionality:**
    *   Establish a WebSocket server to provide real-time updates. Implement connection management and error handling.
    *   **Live Discovery:** When a client sends a `discover` message, the server should run the discovery process and broadcast the results to all connected clients. Implement throttling to prevent excessive network traffic.
    *   **Command Passthrough:** Allow clients to send command messages (e.g., `{ "command": "getTime", "controllerId": "12345" }`) which the server executes and returns the result to the requesting client. Implement command validation and authorization.

---

### **Suggested Project Structure**

```
/
├── config/
│   └── controllers.json        # Persisted list of discovered controllers
├── packages/
│   ├── core/                   # CORE LOGIC (Protocol, Packets, BCD)
│   │   ├── src/
│   │   │   ├── controller-api.ts
│   │   │   ├── packet-handler.ts
│   │   │   ├── config-manager.ts
│   │   │   └── utils.ts          # BCD conversion and other utilities
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── test/               # Unit tests for core logic
│   │
│   ├── cli/                    # CLI INTERFACE (Commander.js)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── commands/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │
│   └── server/                 # WEB SERVICE INTERFACE (Express, WebSockets)
│       ├── src/
│       │   ├── index.ts
│       │   ├── api-routes.ts
│       │   ├── websocket-handler.ts
│       │   ├── middleware/       # Authentication and authorization middleware
│       │   └── models/           # Data models for API requests and responses
│       ├── package.json
│       ├── tsconfig.json
│
├── app.ts                      # Main entry point to launch CLI or Server mode
├── package.json                # pnpm workspace definition
├── pnpm-workspace.yaml         # pnpm workspace configuration
└── tsconfig.json               # Root tsconfig for shared settings

Ref : C:\Users\rdpadmin\Documents\server\main_sdk.txt
```
"C:\Users\rdpadmin\Documents\server"