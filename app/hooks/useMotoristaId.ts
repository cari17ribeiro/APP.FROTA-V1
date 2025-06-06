'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // ajuste o caminho se necessário

export function useMotoristaId() {
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMotoristaId = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('motoristas_cadastrados')
        .select('id')
        .eq('email', user.email)
        .single();

      if (data?.id) {
        setMotoristaId(data.id);
      }

      setLoading(false);
    };

    fetchMotoristaId();
  }, []);

  return { motoristaId, loading };
}
