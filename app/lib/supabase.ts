import { createClient } from '@supabase/supabase-js';

// 🔁 Substitua com os dados reais do seu projeto Supabase:
const supabaseUrl = 'https://dwlcaplumgtgvbducrev.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3bGNhcGx1bWd0Z3ZiZHVjcmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MzY5NDMsImV4cCI6MjA2MjQxMjk0M30.8oGZIvEIruVdOjuMT-oPtgOGLh_QgfR3XV07V3AOe40';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
