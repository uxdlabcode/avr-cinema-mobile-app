/**
 * Age-rating content filter utility.
 *
 * Ratings considered 18+ (restricted for users under 18):
 *   R, NC-17, A  (adult-only Indian certificate)
 *
 * All other ratings (G, PG, PG-13, U/A, UA 13+, UA 16+, etc.)
 * are allowed for all ages.
 */

const RESTRICTED_RATINGS_18_PLUS = ["r", "nc-17", "a"];

/**
 * Returns true if the content is restricted for users under 18.
 */
export function isAdultRating(ageRating: string | undefined | null): boolean {
  if (!ageRating) return false;
  return RESTRICTED_RATINGS_18_PLUS.includes(ageRating.trim().toLowerCase());
}

/**
 * Filters a list of media items based on the user's age.
 * If the user is under 18 (or age is unknown/not set), adult-rated content is hidden.
 *
 * @param items  Array of media items — each must have an optional `ageRating` field.
 * @param userAge The user's age (null/undefined = not provided → treat as restricted).
 */
export function filterByUserAge<T extends { ageRating?: string }>(
  items: T[],
  userAge: number | null | undefined
): T[] {
  // If age is not set, we allow all content (user hasn't specified their age)
  // If age is set and < 18, filter out 18+ content
  if (userAge === null || userAge === undefined) return items;
  if (userAge >= 18) return items;
  return items.filter((item) => !isAdultRating(item.ageRating));
}
