# 0001. Single system role per user

- Status: Accepted
- Date: 2026-11-12 (commit `faaa9d9`)

## Context
Business roles and a user-role join entity added complexity without a requirement for multi-role users.

## Decision
Roles are fixed (`ADMIN`, `TEACHER`, `STUDENT`), seeded by `DataSeeder`; each user has exactly one role (`User.role`, a `@ManyToOne`, so it can become a collection later). `PUT /users/{id}/role` replaces it, revokes sessions and syncs the Teacher/Student profile via `RoleProfileService`.

## Consequences
Simpler authorization and profile syncing. Supporting multiple roles later means changing `User.role` to a collection and revisiting `RoleProfileService`. The last active admin can never lose the role.
