/**
 * Category Image Mappings
 * Maps category names/slugs to their respective logo images
 */

export const categoryImageMap: { [key: string]: string } = {
  // Mehndi Artist
  'mehndi-artist': 'https://images.unsplash.com/photo-1566485763423-22f63bcf326d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwzfHxoZW5uYSUyMGxvZ28lMjBlbGVnYW50fGVufDB8fHx8MTc3NjUwOTQ3OHww&ixlib=rb-4.1.0&q=85',
  'mehndi artist': 'https://images.unsplash.com/photo-1566485763423-22f63bcf326d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwzfHxoZW5uYSUyMGxvZ28lMjBlbGVnYW50fGVufDB8fHx8MTc3NjUwOTQ3OHww&ixlib=rb-4.1.0&q=85',
  
  // Makeup Artist
  'makeup-artist': 'https://images.unsplash.com/photo-1571779719707-0f24f62ab4fc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHw0fHxjb3NtZXRpY3N8ZW58MHx8fHB1cnBsZXwxNzc2NTA5NTA4fDA&ixlib=rb-4.1.0&q=85',
  'makeup artist': 'https://images.unsplash.com/photo-1571779719707-0f24f62ab4fc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHw0fHxjb3NtZXRpY3N8ZW58MHx8fHB1cnBsZXwxNzc2NTA5NTA4fDA&ixlib=rb-4.1.0&q=85',
  
  // Fashion Designer
  'fashion-designer': 'https://images.unsplash.com/photo-1557777586-f6682739fcf3?w=400&q=85',
  'fashion designer': 'https://images.unsplash.com/photo-1557777586-f6682739fcf3?w=400&q=85',
  
  // Home Bakers
  'home-bakers': 'https://images.unsplash.com/photo-1623334044303-241021148842?w=400&q=85',
  'home bakers': 'https://images.unsplash.com/photo-1623334044303-241021148842?w=400&q=85',
  
  // Handmade Gifts
  'handmade-gifts': 'https://images.unsplash.com/photo-1739912061342-280525e3c20f?w=400&q=85',
  'handmade gifts': 'https://images.unsplash.com/photo-1739912061342-280525e3c20f?w=400&q=85',
  
  // Event Manager
  'event-manager': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&q=85',
  'event manager': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&q=85',
  
  // Private Tutor
  'private-tutor': 'https://images.unsplash.com/photo-1629359652978-a5d383151c4c?w=400&q=85',
  'private tutor': 'https://images.unsplash.com/photo-1629359652978-a5d383151c4c?w=400&q=85',
};

/**
 * Get category image URL by slug or name
 */
export const getCategoryImage = (slugOrName: string): string | null => {
  const normalizedKey = slugOrName.toLowerCase();
  return categoryImageMap[normalizedKey] || null;
};

/**
 * Check if a category has a custom image
 */
export const hasCategoryImage = (slugOrName: string): boolean => {
  const normalizedKey = slugOrName.toLowerCase();
  return normalizedKey in categoryImageMap;
};
