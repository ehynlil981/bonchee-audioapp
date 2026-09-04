import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ygwnwjrvshharkbnadog.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnd253anJ2c2hoYXJrYm5hZG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMjkxMDcsImV4cCI6MjEwMzcwNTEwN30._kXbhLw728H8S4Ull-rlzbHsRbdvt5NXJU1nznwtZjY'

export const supabase = createClient(supabaseUrl, supabaseKey)
