/**
 * Helper for accessing Supabase tables that exist in the database
 * but are not yet reflected in the auto-generated types.ts.
 * 
 * Usage: untypedTable('my_custom_table').select('*')
 */
import { supabase } from './client';

export function untypedTable(tableName: string) {
  return (supabase as any).from(tableName);
}
