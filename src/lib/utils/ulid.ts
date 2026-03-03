import { ulid } from "ulid";

/** Generate a ULID string for use as a primary key */
export function generateId(): string {
  return ulid();
}
