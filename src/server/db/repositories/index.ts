/**
 * Repository index
 * Central export for all repository functions
 */

// Email identity
export * from "./email.repository";

// User
export * from "./user.repository";

// Location (legacy)
export * from "./location.repository";

// User-Location membership
export * from "./userLocation.repository";

// UserGroup
export * from "./userGroup.repository";

// Roles and permissions
export * from "./permission.repository";

// Access control (CANONICAL)
export * from "./access.repository";
