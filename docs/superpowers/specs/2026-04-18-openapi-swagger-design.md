# Design Spec: OpenAPI Generation & Swagger UI Integration

## 1. Overview
Add the ability to generate OpenAPI 3.0 specifications from captured request/response traffic. This includes an interactive UI for mapping dynamic paths (parameterization) and an integrated Swagger UI for testing endpoints.

## 2. Architecture

### 2.1 Frontend (Vue 3)
- **Tabbed Interface:** A new top-level navigation to switch between "Requests" and "Swagger Spec".
- **Mapping Interface:** 
  - Groups unique literal paths from the request store.
  - Allows users to click path segments to convert them into parameters (e.g., `/users/123` -> `/users/{id}`).
  - Sends the finalized mapping to the backend for spec generation.
- **Swagger UI Component:** 
  - Integrates `swagger-ui-dist` to render the generated OpenAPI spec.
  - Adds an "Update from Traffic" button to refresh specific endpoints with the latest captured data.

### 2.2 Backend (Express)
- **SpecService:**
  - **Grouping Logic:** Groups raw requests based on the user-provided path mappings.
  - **Schema Inference:** Analyzes request/response bodies (JSON/Buffer) to infer JSON Schemas.
  - **OpenAPI Generator:** Constructs a valid OpenAPI 3.0 document from grouped data.
- **SpecStore:**
  - Persists the generated spec to `specs-db.json` using `lowdb`.
- **API Endpoints:**
  - `POST /api/spec/generate`: Receives path mappings and builds the initial spec.
  - `GET /api/spec`: Returns the current OpenAPI JSON.
  - `PATCH /api/spec/update-endpoint`: Refines a specific endpoint's schema using recent traffic.

## 3. Data Flow
1. **Capture:** Proxy captures traffic -> `RequestStore`.
2. **Map:** User selects paths in "Swagger Spec" tab -> Parameterizes dynamic segments.
3. **Generate:** `SpecService` groups matching requests -> Infers schemas -> Saves to `SpecStore`.
4. **Test:** Swagger UI loads spec -> User sends "Try it out" requests -> Requests captured by proxy.
5. **Refine:** User clicks "Update from Traffic" in Swagger UI -> `SpecService` updates the endpoint's schema.

## 4. Components & Libraries
- **Backend:** `har-to-openapi` (or custom inference logic), `lowdb`.
- **Frontend:** `swagger-ui-dist`.

## 5. Testing Strategy
- **Unit Tests:** Test the `SpecService` grouping and schema inference logic with mock requests.
- **Integration Tests:** Verify the `POST /api/spec/generate` and `GET /api/spec` endpoints.
- **UI Tests:** Use Playwright to verify the mapping interface and Swagger UI rendering.
