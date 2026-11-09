# IIITA Connect — Object-Oriented Design Notes

This document maps the implemented code to the OOM syllabus. Every claim below is exercised by an automated test
(`cd backend && npm test`, 23 tests, no database required). PNG renders of all diagrams are in `docs/diagrams/`.

## Concept → code map

| OOM concept | Where it is implemented | Verified by test |
|---|---|---|
| Classes, objects, attributes, constructors | `Account`, `CampusEvent`, `RegistrationField`, `RegistrationForm` | Classes/constructors |
| Encapsulation | `#private` fields + getters in every entity; `RegistrationWindow` is frozen | Encapsulation |
| Abstraction | Abstract `Account` and `RegistrationField` (`new.target` guard); repository contracts | Classes/constructors, Field hierarchy |
| Inheritance | `Student`/`Organizer`/`Admin` extend `Account`; `TextField`/`EmailField`/`NumberField`/`SelectField` extend `RegistrationField`; `ValidationError`/`NotFoundError`/... extend `DomainError`; Mongo repos extend contracts | Inheritance |
| Polymorphism | `getWorkspaceSummary()`, `canCreateEvents()`, `canManagePlatform()`, `canRegisterForEvents()`, `validateValue()` | Polymorphism, Field hierarchy |
| Association | `Organizer 1—0..* CampusEvent` (`organizerId`); `Student 1—0..* Registration`; `Registration *—1 CampusEvent` | Access rules |
| **Aggregation** | `EventCatalog` groups `CampusEvent`s without owning them (`domain/aggregates/EventCatalog.js`); used by `platformStats()` | Event phase and EventCatalog |
| **Composition** | `CampusEvent` creates and owns a `RegistrationForm` (which owns its `RegistrationField`s) and a `RegistrationWindow` | Composition |
| Exception handling | `DomainError` hierarchy → one error middleware; repositories translate Mongo errors | Exception hierarchy, service tests |
| Modularity | routes → controllers → services → domain; repositories behind contracts; `container.js` wires everything | Service tests with in-memory fakes |

## Design principles (SOLID)

| Principle | How the code follows it |
|---|---|
| **S**ingle Responsibility | Controllers translate HTTP; services coordinate use-cases; entities hold business rules (`CampusEvent` validates and owns lifecycle; `RegistrationForm` validates answers); repositories persist. |
| **O**pen/Closed | New role: `AccountFactory.register(role, Class)`. New field type: `RegistrationFieldFactory.register(type, Class)`. New reaction to an event: `bus.subscribe(...)`. No existing code changes. |
| **L**iskov Substitution | Services use `Account` capabilities, so any subclass works; in tests, in-memory repositories replace Mongo ones with identical behaviour. |
| **I**nterface Segregation | Four small repository contracts (`User`, `OrganizerRequest`, `Event`, `Registration`) instead of one large data-access interface. JavaScript has no `interface` keyword, so contracts are abstract classes. |
| **D**ependency Inversion | `PlatformService` and `AuthService` receive repositories, hasher, token signer and event bus through their constructors and import no Mongoose model. |

## Design patterns

| Pattern | Location |
|---|---|
| Factory | `AccountFactory`, `RegistrationFieldFactory` |
| Repository | `repositories/contracts.js` + `repositories/mongo/*` |
| Observer | `DomainEventBus` + `services/eventHandlers.js` (cancelling an event clears registrations) |
| Dependency Injection / Composition root | `container.js` |
| Aggregate root + Value object (DDD) | `CampusEvent`, `RegistrationWindow` |
| Template method | `Account` capability hooks; `RegistrationField.validateValue` |
| Chain of Responsibility | Express middleware: `authenticate` → `allowRoles` → handler → `errorHandler` |
| Layered architecture | Routes → Controllers → Services → Domain / Repositories |

## UML diagrams

### Use-case diagram
![Use case](diagrams/usecase.png)

### Class diagram 1 — account hierarchy and factory
```mermaid
classDiagram
  direction LR
  class AccountFactory {
    +create(data)$
    +register(role, cls)$
  }
  class Account {
    <<abstract>>
    -id
    -name
    -email
    -role
    -status
    +ensureActive()
    +getWorkspaceSummary()*
    +canCreateEvents()
    +canManagePlatform()
    +canRegisterForEvents()
    +canManage(ownerId)
  }
  class Student {
    +canRegisterForEvents()
  }
  class Organizer {
    -clubName
    +canCreateEvents()
  }
  class Admin {
    +canManagePlatform()
  }
  AccountFactory ..> Account : creates
  Account <|-- Student
  Account <|-- Organizer
  Account <|-- Admin
```

### Class diagram 2 — event model (composition, aggregation, association)
```mermaid
classDiagram
  direction LR
  class EventCatalog {
    +countByPhase()
  }
  class CampusEvent {
    <<aggregate root>>
    -status
    -capacity
    +cancel()
    +getPhase()
    +isManagedBy(account)
  }
  class RegistrationWindow {
    <<value object>>
  }
  class RegistrationForm {
    +process(formData, isDraft)
  }
  class RegistrationField {
    <<abstract>>
    +validateValue(v)*
  }
  class TextField
  class EmailField
  class NumberField
  class SelectField
  class Organizer
  class Student
  class Registration {
    status
  }
  EventCatalog o-- CampusEvent : aggregation
  CampusEvent *-- RegistrationWindow : composition
  CampusEvent *-- RegistrationForm : composition
  RegistrationForm *-- RegistrationField : composition
  RegistrationField <|-- TextField
  RegistrationField <|-- EmailField
  RegistrationField <|-- NumberField
  RegistrationField <|-- SelectField
  Organizer --> CampusEvent : organizes
  Student --> Registration : makes
  Registration --> CampusEvent : for
```

### Sequence diagram — publish an event
```mermaid
sequenceDiagram
  actor Org as Organizer
  participant UI as React UI
  participant C as Controller
  participant S as PlatformService
  participant F as AccountFactory
  participant E as CampusEvent
  participant R as EventRepository
  participant B as DomainEventBus
  Org->>UI: Submit event form
  UI->>C: POST /organizer/events
  C->>S: createEvent(input, auth)
  S->>F: create(auth)
  F-->>S: Organizer
  S->>S: ensureActive(), canCreateEvents()
  S->>E: new CampusEvent(input)
  E->>E: validate, compose form + window
  alt invalid input
    E-->>S: throw ValidationError
    S-->>C: error
    C-->>UI: 400 JSON
  else valid
    E-->>S: entity
    S->>R: create(entity.toPersistence())
    R-->>S: saved event
    S->>B: publish(EVENT_PUBLISHED)
    S-->>C: result
    C-->>UI: 201 JSON
  end
```

### Activity diagram — register for an event
```mermaid
flowchart TD
  A([Submit registration]) --> B{Published and<br/>needs registration?}
  B -- No --> R[/Reject: DomainError 4xx/]
  B -- Yes --> C{Window open?}
  C -- No --> R
  C -- Yes --> D{Draft?}
  D -- Yes --> H[Skip type checks]
  D -- No --> F{Event full?}
  F -- Yes --> R
  F -- No --> G[Validate fields]
  H --> I{All required<br/>filled?}
  G --> I
  I -- Yes --> J[COMPLETE]
  I -- No --> K[INCOMPLETE]
  J --> L[Save, publish event]
  K --> L
  L --> N([Done])
```

### Layered architecture
```mermaid
flowchart LR
  R[Routes] --> C[Controllers] --> S[Services<br/>PlatformService, AuthService] --> D[Domain<br/>entities, value objects,<br/>aggregates, events]
  S --> P[[Repository contracts]]
  M[Mongo repositories] -. implements .-> P
  M --> DB[(MongoDB)]
  K{{container.js<br/>composition root}} -. wires .-> S
  K -. wires .-> M
```

## Behaviour fixed while adding these features

- Registration window (opens / deadline) is now enforced on the server; previously only the UI respected it.
- A student who already holds a COMPLETE seat can re-submit when the event is full.
- Permission checks use `account.canManage(...)` / `canManagePlatform()` instead of `role === '...'` strings.
- Business errors are `DomainError` subclasses everywhere (the services previously threw ad-hoc errors).
- Removed the unused duplicate `authService.requestOrganizer`.
- `GET /api/auth/me` and login now include `workspaceSummary`, produced polymorphically by the role object.
- `GET /api/auth/admin/stats` now includes `eventPhases` (`CURRENT` / `UPCOMING` / `PAST` counts) from `EventCatalog`.

## Known limits

- JavaScript has no static interfaces or `final`; abstraction is enforced at runtime (`new.target`, "not implemented" errors).
- Aggregation and composition are modelling relationships between in-memory domain objects; MongoDB still stores them as embedded data or ObjectId references.
- The React frontend was not changed.
