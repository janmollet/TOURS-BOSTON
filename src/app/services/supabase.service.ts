import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // This function pulls your CSV data from the 'restaurants' table
  async getRestaurants() {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select('*');

    if (error) {
      console.error('Supabase error:', error.message);
      return [];
    }
    return data;
  }
}