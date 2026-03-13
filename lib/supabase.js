import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rtarazijcpsnejakgxbc.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0YXJhemlqY3BzbmVqYWtneGJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzE5NDcsImV4cCI6MjA4NDUwNzk0N30.xT3-qyFU9lM7BAZVutwhBKSLV2aYGaj4M-qj9Cob0dU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
